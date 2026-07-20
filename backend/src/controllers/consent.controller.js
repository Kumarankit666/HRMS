const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { SYSTEM } = require('../config/constants');
const { logAudit, sendMail } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const OTP_EXPIRY_MINUTES = 10;

/** GET /api/consent/pending — every policy document this employee still needs to sign. */
const myPending = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT pa.id AS ack_id, pd.id AS policy_id, pd.name, pd.file_path, pa.status
     FROM policy_acknowledgements pa
     JOIN policy_documents pd ON pd.id = pa.policy_document_id
     WHERE pa.employee_id = $1
     ORDER BY pa.status, pd.name`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

/** POST /api/consent/:policyId/request-otp — sends a signing OTP to the employee's email. */
const requestOtp = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const { signatureName } = req.body;
  if (!signatureName || signatureName.trim().length < 2) throw new ApiError(400, 'Please type your full name as your signature.');

  const ackRes = await query(
    `SELECT id, status FROM policy_acknowledgements WHERE employee_id = $1 AND policy_document_id = $2`,
    [req.user.id, policyId]
  );
  if (!ackRes.rows.length) throw new ApiError(404, 'This document is not assigned to you.');
  if (ackRes.rows[0].status === 'Signed') throw new ApiError(400, 'You have already signed this document.');

  const empRes = await query(`SELECT full_name, personal_email, work_email FROM employees WHERE id = $1`, [req.user.id]);
  const emp = empRes.rows[0];
  const email = emp.personal_email || emp.work_email;
  if (!email) throw new ApiError(400, 'No email on file to send the OTP.');

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

  await query(
    `INSERT INTO consent_otps (employee_id, policy_document_id, otp_hash, signature_name, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [req.user.id, policyId, otpHash, signatureName.trim(), expiresAt]
  );

  await sendMail({
    to: email,
    subject: `Signing OTP — ${SYSTEM.APP_NAME}`,
    text: `Hi ${emp.full_name},\n\nYour OTP to sign the document is: ${otp}\nIt expires in ${OTP_EXPIRY_MINUTES} minutes.\n\nSigning as: ${signatureName.trim()}\n\nIf this wasn't you, contact HR immediately.\n\n— ${SYSTEM.APP_NAME}`
  });

  res.json({ success: true, message: 'OTP sent to your registered email.' });
});

/** POST /api/consent/:policyId/verify — confirms the OTP and records the signature. */
const verifyAndSign = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const { otp } = req.body;
  if (!otp) throw new ApiError(400, 'OTP is required.');

  const otpRes = await query(
    `SELECT id, otp_hash, signature_name FROM consent_otps
     WHERE employee_id = $1 AND policy_document_id = $2 AND used = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [req.user.id, policyId]
  );
  if (!otpRes.rows.length) throw new ApiError(400, 'OTP expired or not found. Please request a new one.');

  const match = await bcrypt.compare(otp, otpRes.rows[0].otp_hash);
  if (!match) throw new ApiError(400, 'Incorrect OTP.');

  await query(`UPDATE consent_otps SET used = true WHERE id = $1`, [otpRes.rows[0].id]);

  await query(
    `UPDATE policy_acknowledgements
     SET status = 'Signed', signature_name = $1, otp_verified_at = now(), signed_at = now()
     WHERE employee_id = $2 AND policy_document_id = $3`,
    [otpRes.rows[0].signature_name, req.user.id, policyId]
  );

  await logAudit(req.user.id, 'POLICY_SIGNED', 'Consent', `Policy ${policyId} signed as "${otpRes.rows[0].signature_name}"`);

  // If every assigned policy is now signed, mark the employee's offer letter(s) as accepted and notify HR.
  const pendingRes = await query(
    `SELECT COUNT(*) FROM policy_acknowledgements WHERE employee_id = $1 AND status != 'Signed'`,
    [req.user.id]
  );
  let offerAccepted = false;
  if (Number(pendingRes.rows[0].count) === 0) {
    const updated = await query(
      `UPDATE offer_letters SET accepted = true, accepted_at = now() WHERE employee_id = $1 AND accepted = false RETURNING id`,
      [req.user.id]
    );
    if (updated.rows.length) {
      offerAccepted = true;
      const empRes2 = await query(`SELECT full_name FROM employees WHERE id = $1`, [req.user.id]);
      const hrEmail = process.env.HR_NOTIFY_EMAIL || process.env.SMTP_USER;
      if (hrEmail) {
        await sendMail({
          to: hrEmail,
          subject: `Offer Accepted — ${empRes2.rows[0]?.full_name}`,
          text: `${empRes2.rows[0]?.full_name} has signed all policy documents and accepted their offer letter.\n\n— ${SYSTEM.APP_NAME}`
        });
      }
      await logAudit(req.user.id, 'OFFER_ACCEPTED', 'Consent', 'All policies signed');
    }
  }

  res.json({ success: true, message: 'Document signed successfully.', data: { offerAccepted } });
});

module.exports = { myPending, requestOtp, verifyAndSign };