const { query } = require('../config/db');
const { logAudit, sendMail } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const VALID_STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'WeekOff', 'Holiday', 'Leave'];
const MAX_REQUESTS_PER_MONTH = 3;

/** POST /api/attendance-requests — employee requests a correction for one date. Max 3 per calendar month. */
const createRequest = asyncHandler(async (req, res) => {
  const { requestDate, requestedStatus, reason } = req.body;
  if (!requestDate || !requestedStatus) throw new ApiError(400, 'Date and requested status are required.');
  if (!VALID_STATUSES.includes(requestedStatus)) throw new ApiError(400, `Status must be one of: ${VALID_STATUSES.join(', ')}`);

  const countRes = await query(
    `SELECT COUNT(*) FROM attendance_requests
     WHERE employee_id = $1 AND date_trunc('month', created_at) = date_trunc('month', now())`,
    [req.user.id]
  );
  const used = Number(countRes.rows[0].count);
  if (used >= MAX_REQUESTS_PER_MONTH) {
    throw new ApiError(400, `You have used all ${MAX_REQUESTS_PER_MONTH} attendance correction requests for this month.`);
  }

  // If the employee has no manager, auto-forward straight to HR.
  const empRes = await query(`SELECT reporting_manager_id, full_name FROM employees WHERE id = $1`, [req.user.id]);
  const hasManager = !!empRes.rows[0]?.reporting_manager_id;

  const result = await query(
    `INSERT INTO attendance_requests (employee_id, request_date, requested_status, reason, manager_status, manager_remark)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [req.user.id, requestDate, requestedStatus, reason || null,
      hasManager ? 'Pending' : 'Approved',
      hasManager ? null : 'No manager assigned — auto-forwarded to HR.']
  );

  await logAudit(req.user.id, 'ATTENDANCE_CORRECTION_REQUESTED', 'Attendance', `${requestDate} -> ${requestedStatus}`);
  res.status(201).json({ success: true, message: 'Correction request submitted.', data: { id: result.rows[0].id, remaining: MAX_REQUESTS_PER_MONTH - used - 1 } });
});

/** GET /api/attendance-requests/me — my own requests + how many I have left this month. */
const myRequests = asyncHandler(async (req, res) => {
  const listRes = await query(
    `SELECT id, request_date, requested_status, reason, manager_status, manager_remark, hr_status, hr_remark, created_at
     FROM attendance_requests WHERE employee_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  const countRes = await query(
    `SELECT COUNT(*) FROM attendance_requests
     WHERE employee_id = $1 AND date_trunc('month', created_at) = date_trunc('month', now())`,
    [req.user.id]
  );
  const used = Number(countRes.rows[0].count);
  res.json({ success: true, data: { requests: listRes.rows, used, remaining: Math.max(MAX_REQUESTS_PER_MONTH - used, 0) } });
});

/** GET /api/attendance-requests/manager-pending — requests from this manager's direct reports awaiting a decision. */
const managerPending = asyncHandler(async (req, res) => {
  if (!req.user.isManager) return res.json({ success: true, data: [] });
  const result = await query(
    `SELECT ar.id, ar.request_date, ar.requested_status, ar.reason, ar.created_at,
            e.employee_code, e.full_name
     FROM attendance_requests ar JOIN employees e ON e.id = ar.employee_id
     WHERE e.reporting_manager_id = $1 AND ar.manager_status = 'Pending'
     ORDER BY ar.created_at ASC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

/** POST /api/attendance-requests/:id/manager-decision — { decision: 'Approved'|'Rejected', remark } */
const managerDecision = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, remark } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) throw new ApiError(400, 'Invalid decision.');

  const reqRes = await query(
    `SELECT ar.*, e.reporting_manager_id, e.full_name, e.personal_email, e.work_email
     FROM attendance_requests ar JOIN employees e ON e.id = ar.employee_id WHERE ar.id = $1`,
    [id]
  );
  if (!reqRes.rows.length) throw new ApiError(404, 'Request not found.');
  const record = reqRes.rows[0];
  if (String(record.reporting_manager_id) !== String(req.user.id)) throw new ApiError(403, 'Forbidden.');
  if (record.manager_status !== 'Pending') throw new ApiError(400, 'This request has already been actioned.');

  await query(
    `UPDATE attendance_requests SET manager_status = $1, manager_actioned_by = $2, manager_actioned_at = now(), manager_remark = $3 WHERE id = $4`,
    [decision, req.user.id, remark || null, id]
  );

  const email = record.personal_email || record.work_email;
  if (email) {
    await sendMail({
      to: email,
      subject: `Attendance Correction ${decision === 'Approved' ? 'Approved by Manager' : 'Rejected'} — ${SYSTEM.APP_NAME}`,
      text: `Hi ${record.full_name},\n\nYour attendance correction request for ${record.request_date} (${record.requested_status}) was ${decision.toLowerCase()} by your manager.${decision === 'Approved' ? ' It now awaits HR approval.' : ''}\n\n— ${SYSTEM.APP_NAME}`
    });
  }

  await logAudit(req.user.id, 'ATTENDANCE_CORRECTION_MANAGER_DECISION', 'Attendance', `${id} -> ${decision}`);
  res.json({ success: true, message: `Request ${decision.toLowerCase()}.` });
});

/** GET /api/attendance-requests/hr-pending — manager-approved requests awaiting final HR approval. */
const hrPending = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ar.id, ar.request_date, ar.requested_status, ar.reason, ar.manager_remark, ar.created_at,
            e.employee_code, e.full_name
     FROM attendance_requests ar JOIN employees e ON e.id = ar.employee_id
     WHERE ar.manager_status = 'Approved' AND ar.hr_status = 'Pending'
     ORDER BY ar.created_at ASC`
  );
  res.json({ success: true, data: result.rows });
});

/** POST /api/attendance-requests/:id/hr-decision — { decision: 'Approved'|'Rejected', remark }. On Approved, applies the change to attendance. */
const hrDecision = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, remark } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) throw new ApiError(400, 'Invalid decision.');

  const reqRes = await query(
    `SELECT ar.*, e.full_name, e.personal_email, e.work_email
     FROM attendance_requests ar JOIN employees e ON e.id = ar.employee_id WHERE ar.id = $1`,
    [id]
  );
  if (!reqRes.rows.length) throw new ApiError(404, 'Request not found.');
  const record = reqRes.rows[0];
  if (record.manager_status !== 'Approved') throw new ApiError(400, 'This request has not been approved by the manager yet.');
  if (record.hr_status !== 'Pending') throw new ApiError(400, 'This request has already been actioned by HR.');

  await query(
    `UPDATE attendance_requests SET hr_status = $1, hr_actioned_by = $2, hr_actioned_at = now(), hr_remark = $3 WHERE id = $4`,
    [decision, req.user.id, remark || null, id]
  );

  if (decision === 'Approved') {
    await query(
      `INSERT INTO attendance (employee_id, date, status, updated_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (employee_id, date) DO UPDATE SET status = $3, updated_by = $4, updated_at = now()`,
      [record.employee_id, record.request_date, record.requested_status, req.user.id]
    );
  }

  const email = record.personal_email || record.work_email;
  if (email) {
    await sendMail({
      to: email,
      subject: `Attendance Correction ${decision} by HR — ${SYSTEM.APP_NAME}`,
      text: `Hi ${record.full_name},\n\nYour attendance correction request for ${record.request_date} (${record.requested_status}) was ${decision.toLowerCase()} by HR.${decision === 'Approved' ? ' Your attendance record has been updated.' : ''}\n\n— ${SYSTEM.APP_NAME}`
    });
  }

  await logAudit(req.user.id, 'ATTENDANCE_CORRECTION_HR_DECISION', 'Attendance', `${id} -> ${decision}`);
  res.json({ success: true, message: `Request ${decision.toLowerCase()}${decision === 'Approved' ? ' and attendance updated' : ''}.` });
});

module.exports = { createRequest, myRequests, managerPending, managerDecision, hrPending, hrDecision };