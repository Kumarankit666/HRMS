const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const VALID_STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'WeekOff', 'Holiday', 'Leave'];

function monthRange(monthStr) {
  // monthStr = 'YYYY-MM'; returns [firstDay, lastDay] as ISO date strings
  const [y, m] = monthStr.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

/** GET /api/attendance/me?month=YYYY-MM — my own attendance for a given month (defaults to current). */
const myAttendance = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const [from, to] = monthRange(month);

  const result = await query(
    `SELECT date, status, in_time, out_time, remarks FROM attendance
     WHERE employee_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date`,
    [req.user.id, from, to]
  );

  const present = result.rows.filter((r) => r.status === 'Present').length;
  const totalMarked = result.rows.length;
  const percentage = totalMarked ? Math.round((present / totalMarked) * 1000) / 10 : 0;

  res.json({ success: true, data: { month, records: result.rows, present, totalMarked, percentage } });
});

/**
 * GET /api/attendance?employeeId=&month= — HR/Admin: any employee. Manager: only direct reports.
 * Employee without permission gets 403 (use /me instead).
 */
const listAttendance = asyncHandler(async (req, res) => {
  const { employeeId, month } = req.query;
  if (!employeeId) throw new ApiError(400, 'employeeId is required.');

  const canViewAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  if (!canViewAll) {
    if (!req.user.isManager) throw new ApiError(403, 'Forbidden.');
    const managerCheck = await query(`SELECT 1 FROM employees WHERE id = $1 AND reporting_manager_id = $2`, [employeeId, req.user.id]);
    if (!managerCheck.rows.length) throw new ApiError(403, 'Forbidden.');
  }

  const m = month || new Date().toISOString().slice(0, 7);
  const [from, to] = monthRange(m);

  const result = await query(
    `SELECT date, status, in_time, out_time, remarks FROM attendance
     WHERE employee_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date`,
    [employeeId, from, to]
  );
  res.json({ success: true, data: { month: m, records: result.rows } });
});

/** POST /api/attendance — HR/Admin upserts one day's record for one employee. */
const markAttendance = asyncHandler(async (req, res) => {
  const { employeeId, date, status, inTime, outTime, remarks } = req.body;
  if (!employeeId || !date || !status) throw new ApiError(400, 'employeeId, date, and status are required.');
  if (!VALID_STATUSES.includes(status)) throw new ApiError(400, `Status must be one of: ${VALID_STATUSES.join(', ')}`);

  await query(
    `INSERT INTO attendance (employee_id, date, status, in_time, out_time, remarks, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (employee_id, date) DO UPDATE
       SET status = $3, in_time = $4, out_time = $5, remarks = $6, updated_by = $7, updated_at = now()`,
    [employeeId, date, status, inTime || null, outTime || null, remarks || null, req.user.id]
  );

  await logAudit(req.user.id, 'MARK_ATTENDANCE', 'Attendance', `${employeeId} ${date} -> ${status}`);
  res.json({ success: true, message: 'Attendance updated.' });
});

/** POST /api/attendance/bulk — HR/Admin marks the same status for multiple employees on one date (e.g. company holiday). */
const markBulk = asyncHandler(async (req, res) => {
  const { employeeIds, date, status, remarks } = req.body;
  if (!Array.isArray(employeeIds) || !employeeIds.length || !date || !status) {
    throw new ApiError(400, 'employeeIds (array), date, and status are required.');
  }
  if (!VALID_STATUSES.includes(status)) throw new ApiError(400, `Status must be one of: ${VALID_STATUSES.join(', ')}`);

  for (const employeeId of employeeIds) {
    await query(
      `INSERT INTO attendance (employee_id, date, status, remarks, updated_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (employee_id, date) DO UPDATE SET status = $3, remarks = $4, updated_by = $5, updated_at = now()`,
      [employeeId, date, status, remarks || null, req.user.id]
    );
  }

  await logAudit(req.user.id, 'MARK_ATTENDANCE_BULK', 'Attendance', `${employeeIds.length} employees, ${date} -> ${status}`);
  res.json({ success: true, message: `Marked ${employeeIds.length} employee(s) as ${status} for ${date}.` });
});

module.exports = { myAttendance, listAttendance, markAttendance, markBulk };