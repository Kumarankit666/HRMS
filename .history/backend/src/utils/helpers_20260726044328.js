const nodemailer = require('nodemailer');
const { query } = require('../config/db');
const { SYSTEM } = require('../config/constants');

/** Generates the next sequential Employee Code (EMP000001, EMP000002, ...). */
async function generateNextEmployeeCode() {
  const result = await query(
    `SELECT employee_code FROM employees ORDER BY employee_code DESC LIMIT 1`
  );
  let nextNum = 1;
  if (result.rows.length) {
    const match = result.rows[0].employee_code.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return SYSTEM.EMPLOYEE_CODE_PREFIX + String(nextNum).padStart(SYSTEM.EMPLOYEE_CODE_PAD_LENGTH, '0');
}

/** Writes a row to audit_log. Never throws — a logging failure must not break the caller. */
async function logAudit(employeeId, action, module, details) {
  try {
    await query(
      `INSERT INTO audit_log (employee_id, action, module, details) VALUES ($1, $2, $3, $4)`,
      [employeeId || null, action, module, details || null]
    );
  } catch (e) {
    console.error('Audit log failed (non-fatal):', e.message);
  }
}

/** Single reusable transporter for outgoing email (welcome mail, OTP, offer letters). */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_USER) {
    console.warn('SMTP not configured — skipping email send. Would have sent:', { to, subject });
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
  } catch (err) {
    // Email delivery must never fail the underlying action (employee add, leave decision, etc.)
    console.error('Email send failed (non-fatal):', err.message);
  }
}

/** Masks an email for display, e.g. jo****@company.com */
function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  return name.slice(0, 2) + '****@' + domain;
}

/**
 * Creates a notification. Pass recipientRole = 'HR' to notify every HR_ADMIN and SUPER_ADMIN,
 * or a specific recipientId (employee UUID) to notify just one person. Never throws.
 */
async function createNotification({ recipientRole, recipientId, title, message, link }) {
  try {
    await query(
      `INSERT INTO notifications (recipient_role, recipient_id, title, message, link) VALUES ($1,$2,$3,$4,$5)`,
      [recipientRole || null, recipientId || null, title, message || null, link || null]
    );
  } catch (e) {
    console.error('Notification creation failed (non-fatal):', e.message);
  }
}

module.exports = { generateNextEmployeeCode, logAudit, sendMail, maskEmail, createNotification };