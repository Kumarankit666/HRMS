const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const { SYSTEM } = require('../config/constants');
const { logAudit, sendMail, maskEmail } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/** POST /api/auth/login — single-step: employee_code + password -> JWT. No OTP here. */
const login = asyncHandler(async (req, res) => {
  const { employeeCode, password } = req.body;
  if (!employeeCode || !password) throw new ApiError(400, 'Employee ID and password are required.');

  const empResult = await query(
    `SELECT e.id, e.employee_code, e.full_name, e.status,
            l.password_hash, l.role, l.failed_attempts, l.locked_until, l.must_reset_password,
            EXISTS (SELECT 1 FROM employees m WHERE m.reporting_manager_id = e.id) AS is_manager,
            o.status AS onboarding_status
     FROM employees e
     JOIN employee_login l ON l.employee_id = e.id
     LEFT JOIN onboarding o ON o.employee_id = e.id
     WHERE e.employee_code = $1`,
    [employeeCode.trim()]
  );

  if (!empResult.rows.length) {
    await logAudit(null, 'LOGIN_FAILED', 'Auth', `Unknown employee code: ${employeeCode}`);
    throw new ApiError(401, 'Invalid Employee ID or password.');
  }
  const emp = empResult.rows[0];

  if (emp.locked_until && new Date(emp.locked_until) > new Date()) {
    throw new ApiError(423, 'Account temporarily locked due to failed attempts. Try again later.', 'LOCKED');
  }

  const passwordOk = await bcrypt.compare(password, emp.password_hash);
  if (!passwordOk) {
    const attempts = (emp.failed_attempts || 0) + 1;
    const lockUntil = attempts >= SYSTEM.MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + SYSTEM.LOCKOUT_MINUTES * 60000)
      : null;
    await query(
      `UPDATE employee_login SET failed_attempts = $1, locked_until = $2 WHERE employee_id = $3`,
      [attempts, lockUntil, emp.id]
    );
    await logAudit(emp.id, 'LOGIN_FAILED', 'Auth', `Bad password, attempt ${attempts}`);
    throw new ApiError(401, 'Invalid Employee ID or password.');
  }

  if (emp.status !== 'Active') throw new ApiError(403, 'This account is not active. Contact HR.');

  await query(
    `UPDATE employee_login SET failed_attempts = 0, locked_until = NULL, last_login = now() WHERE employee_id = $1`,
    [emp.id]
  );

  const payload = {
    id: emp.id,
    employeeCode: emp.employee_code,
    fullName: emp.full_name,
    role: emp.role,
    isManager: emp.is_manager
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

  await logAudit(emp.id, 'LOGIN_SUCCESS', 'Auth', 'JWT issued');

  res.json({
    success: true,
    message: 'Login successful.',
    data: {
      token,
      employeeCode: emp.employee_code,
      fullName: emp.full_name,
      role: emp.role,
      isManager: emp.is_manager,
      mustResetPassword: emp.must_reset_password,
      onboardingRequired: emp.onboarding_status ? emp.onboarding_status !== 'Approved' : false,
      onboardingStatus: emp.onboarding_status
    }
  });
});

/** GET /api/auth/me — returns the current authenticated user (for page refresh / app resume). */
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

/** POST /api/auth/forgot-password — always returns a generic success message (no user enumeration). */
const forgotPassword = asyncHandler(async (req, res) => {
  const { employeeCode } = req.body;
  if (!employeeCode) throw new ApiError(400, 'Employee ID is required.');

  const result = await query(
    `SELECT e.id, e.full_name, e.personal_email, e.work_email FROM employees e WHERE e.employee_code = $1`,
    [employeeCode.trim()]
  );

  if (result.rows.length) {
    const emp = result.rows[0];
    const email = emp.work_email || emp.personal_email;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, SYSTEM.BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + SYSTEM.OTP_EXPIRY_MINUTES * 60000);

    await query(
      `INSERT INTO password_reset_otps (employee_id, otp_hash, purpose, expires_at) VALUES ($1, $2, 'RESET_PASSWORD', $3)`,
      [emp.id, otpHash, expiresAt]
    );

    await sendMail({
      to: email,
      subject: `Password Reset OTP — ${SYSTEM.APP_NAME}`,
      text: `Hi ${emp.full_name},\n\nYour password reset OTP is: ${otp}\nIt expires in ${SYSTEM.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, contact HR immediately.\n\n— ${SYSTEM.APP_NAME}`
    });

    await logAudit(emp.id, 'PASSWORD_RESET_REQUESTED', 'Auth', `OTP sent to ${maskEmail(email)}`);
  }

  // Same response whether or not the account exists — prevents account enumeration.
  res.json({ success: true, message: 'If that Employee ID exists, a reset OTP has been sent to its registered email.' });
});

/** POST /api/auth/reset-password — verifies OTP, sets new bcrypt-hashed password. */
const resetPassword = asyncHandler(async (req, res) => {
  const { employeeCode, otp, newPassword } = req.body;
  if (!employeeCode || !otp || !newPassword) throw new ApiError(400, 'All fields are required.');
  if (newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters.');

  const empResult = await query(`SELECT id FROM employees WHERE employee_code = $1`, [employeeCode.trim()]);
  if (!empResult.rows.length) throw new ApiError(400, 'Invalid request.');
  const employeeId = empResult.rows[0].id;

  const otpResult = await query(
    `SELECT id, otp_hash FROM password_reset_otps
     WHERE employee_id = $1 AND purpose = 'RESET_PASSWORD' AND used = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [employeeId]
  );
  if (!otpResult.rows.length) throw new ApiError(400, 'OTP expired or not found. Please request a new one.');

  const match = await bcrypt.compare(otp, otpResult.rows[0].otp_hash);
  if (!match) throw new ApiError(400, 'Incorrect OTP.');

  await query(`UPDATE password_reset_otps SET used = true WHERE id = $1`, [otpResult.rows[0].id]);

  const newHash = await bcrypt.hash(newPassword, SYSTEM.BCRYPT_ROUNDS);
  await query(
    `UPDATE employee_login SET password_hash = $1, must_reset_password = false, failed_attempts = 0, locked_until = NULL WHERE employee_id = $2`,
    [newHash, employeeId]
  );

  await logAudit(employeeId, 'PASSWORD_RESET_COMPLETE', 'Auth', 'Password changed via OTP');
  res.json({ success: true, message: 'Password updated. Please login with your new password.' });
});

module.exports = { login, me, forgotPassword, resetPassword };
