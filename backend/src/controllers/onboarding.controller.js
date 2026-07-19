const { query } = require('../config/db');
const { logAudit, sendMail } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const REQUIRED_FIELDS = [
  'fatherName', 'motherName', 'gender', 'dob', 'bloodGroup', 'maritalStatus',
  'emergencyContact', 'currentAddress', 'permanentAddress',
  'bankAccountNumber', 'ifsc', 'acceptPolicy'
];

/** GET /api/onboarding/me — current employee's onboarding status + previously saved data. */
const getMyStatus = asyncHandler(async (req, res) => {
  const result = await query(`SELECT status, submitted_data, review_note FROM onboarding WHERE employee_id = $1`, [req.user.id]);
  if (!result.rows.length) return res.json({ success: true, data: { required: false } });

  const row = result.rows[0];
  res.json({
    success: true,
    data: {
      required: row.status !== 'Approved',
      status: row.status,
      data: row.submitted_data,
      reviewNote: row.review_note
    }
  });
});

/** POST /api/onboarding/submit — employee submits (or re-submits) their onboarding form. */
const submit = asyncHandler(async (req, res) => {
  const form = req.body;
  const missing = REQUIRED_FIELDS.filter((f) => form[f] === undefined || form[f] === null || String(form[f]).trim() === '');
  if (missing.length) throw new ApiError(400, `Please fill in all required fields: ${missing.join(', ')}`);
  if (form.acceptPolicy !== true) throw new ApiError(400, 'You must accept the company policy to continue.');

  const existing = await query(`SELECT status FROM onboarding WHERE employee_id = $1`, [req.user.id]);
  if (!existing.rows.length) throw new ApiError(400, 'No onboarding required for this account.');
  if (existing.rows[0].status === 'Approved') throw new ApiError(400, 'Onboarding is already approved.');
  if (existing.rows[0].status === 'Submitted') throw new ApiError(400, 'Your onboarding is already submitted and awaiting HR review.');

  await query(
    `UPDATE onboarding SET status = 'Submitted', submitted_data = $1, review_note = NULL WHERE employee_id = $2`,
    [JSON.stringify(form), req.user.id]
  );

  await logAudit(req.user.id, 'ONBOARDING_SUBMITTED', 'Onboarding', 'Submitted for HR review');
  res.json({ success: true, message: 'Submitted. HR will review your details shortly.' });
});

/** GET /api/onboarding/pending — HR/Admin: all submissions awaiting review. */
const listPending = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT o.employee_id, e.employee_code, e.full_name, d.name AS department, dg.name AS designation,
            o.submitted_data, o.updated_at
     FROM onboarding o
     JOIN employees e ON e.id = o.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations dg ON dg.id = e.designation_id
     WHERE o.status = 'Submitted'
     ORDER BY o.updated_at ASC`
  );
  res.json({ success: true, data: result.rows });
});

/** POST /api/onboarding/:employeeId/review — HR/Admin approves, rejects, or requests changes. */
const review = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { decision, note } = req.body; // 'Approved' | 'Rejected' | 'ChangesRequested'
  if (!['Approved', 'Rejected', 'ChangesRequested'].includes(decision)) throw new ApiError(400, 'Invalid decision.');

  const record = await query(`SELECT status FROM onboarding WHERE employee_id = $1`, [employeeId]);
  if (!record.rows.length) throw new ApiError(404, 'Onboarding record not found.');
  if (record.rows[0].status !== 'Submitted') throw new ApiError(400, 'This submission is not awaiting review.');

  await query(
    `UPDATE onboarding SET status = $1, review_note = $2, reviewed_by = $3 WHERE employee_id = $4`,
    [decision, note || null, req.user.id, employeeId]
  );

  const empResult = await query(`SELECT full_name, personal_email, work_email FROM employees WHERE id = $1`, [employeeId]);
  if (empResult.rows.length) {
    const emp = empResult.rows[0];
    const email = emp.personal_email || emp.work_email;
    let subject, text;
    if (decision === 'Approved') {
      subject = `Onboarding Approved — ${SYSTEM.APP_NAME}`;
      text = `Hi ${emp.full_name},\n\nYour onboarding details have been approved. You now have full access to the HRMS, and HR will proceed with your offer letter.\n\n— ${SYSTEM.APP_NAME}`;
    } else if (decision === 'ChangesRequested') {
      subject = `Onboarding — Changes Requested — ${SYSTEM.APP_NAME}`;
      text = `Hi ${emp.full_name},\n\nHR requested changes:\n"${note || ''}"\n\nPlease log in and update your details.\n\n— ${SYSTEM.APP_NAME}`;
    } else {
      subject = `Onboarding — Update — ${SYSTEM.APP_NAME}`;
      text = `Hi ${emp.full_name},\n\nYour onboarding submission was not approved.\nReason: ${note || 'Not specified'}\n\nPlease contact HR.\n\n— ${SYSTEM.APP_NAME}`;
    }
    await sendMail({ to: email, subject, text });
  }

  await logAudit(req.user.id, 'ONBOARDING_REVIEWED', 'Onboarding', `${employeeId} -> ${decision}`);
  res.json({ success: true, message: `Onboarding marked as ${decision}.` });
});

module.exports = { getMyStatus, submit, listPending, review };
