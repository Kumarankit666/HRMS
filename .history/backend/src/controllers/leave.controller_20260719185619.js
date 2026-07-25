const { query, getClient } = require('../config/db');
const { logAudit, sendMail } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const LEAVE_TYPE_TO_BALANCE_COLUMN = {
  Casual: 'casual_leave',
  Sick: 'sick_leave',
  Earned: 'earned_leave',
  Maternity: 'maternity_leave',
  Paternity: 'paternity_leave',
  LossOfPay: 'loss_of_pay'
};

function countDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diff = Math.round((to - from) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}

/** POST /api/leave — employee applies for leave. */
const apply = asyncHandler(async (req, res) => {
  const { leaveType, fromDate, toDate, reason } = req.body;
  if (!leaveType || !fromDate || !toDate) throw new ApiError(400, 'Leave type, from date, and to date are required.');
  if (!LEAVE_TYPE_TO_BALANCE_COLUMN[leaveType]) throw new ApiError(400, 'Invalid leave type.');

  const days = countDays(fromDate, toDate);
  if (days <= 0) throw new ApiError(400, 'To date must be on or after from date.');

  if (leaveType !== 'LossOfPay') {
    const balCol = LEAVE_TYPE_TO_BALANCE_COLUMN[leaveType];
    const balResult = await query(
      `SELECT ${balCol} AS balance FROM leave_balance WHERE employee_id = $1 AND year = $2`,
      [req.user.id, new Date().getFullYear()]
    );
    const available = balResult.rows.length ? Number(balResult.rows[0].balance) : 0;
    if (days > available) throw new ApiError(400, `Insufficient ${leaveType} leave balance. Available: ${available}, requested: ${days}.`);
  }

  const result = await query(
    `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, days, reason)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [req.user.id, leaveType, fromDate, toDate, days, reason || null]
  );

  await logAudit(req.user.id, 'LEAVE_APPLIED', 'Leave', `${leaveType} ${fromDate} to ${toDate} (${days}d)`);
  res.status(201).json({ success: true, message: 'Leave request submitted.', data: { id: result.rows[0].id } });
});

/** GET /api/leave/me — my leave history. */
const listMine = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, leave_type, from_date, to_date, days, reason, status, applied_at, actioned_at
     FROM leave_requests WHERE employee_id = $1 ORDER BY applied_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

/** GET /api/leave/balance — my current-year leave balance. */
const myBalance = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT * FROM leave_balance WHERE employee_id = $1 AND year = $2`,
    [req.user.id, new Date().getFullYear()]
  );
  res.json({ success: true, data: result.rows[0] || null });
});

/**
 * GET /api/leave/pending — pending requests this user can act on:
 *  - HR/Admin: everyone's pending requests
 *  - Manager: their direct reports' pending requests
 */
const listPending = asyncHandler(async (req, res) => {
  const canViewAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

  let sql = `
    SELECT lr.id, lr.employee_id, e.employee_code, e.full_name, lr.leave_type,
           lr.from_date, lr.to_date, lr.days, lr.reason, lr.applied_at
    FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    WHERE lr.status = 'Pending'`;
  const params = [];

  if (!canViewAll) {
    if (!req.user.isManager) throw new ApiError(403, 'Forbidden.');
    sql += ` AND e.reporting_manager_id = $1`;
    params.push(req.user.id);
  }
  sql += ` ORDER BY lr.applied_at ASC`;

  const result = await query(sql, params);
  res.json({ success: true, data: result.rows });
});

/** POST /api/leave/:id/decision — approve or reject. Deducts balance on approval. */
const decide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body; // 'Approved' | 'Rejected'
  if (!['Approved', 'Rejected'].includes(decision)) throw new ApiError(400, 'Invalid decision.');

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const leaveResult = await client.query(
      `SELECT lr.*, e.reporting_manager_id, e.full_name, e.personal_email, e.work_email
       FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id
       WHERE lr.id = $1 FOR UPDATE`,
      [id]
    );
    if (!leaveResult.rows.length) throw new ApiError(404, 'Leave request not found.');
    const leave = leaveResult.rows[0];
    if (leave.status !== 'Pending') throw new ApiError(400, 'This request has already been actioned.');

    const canViewAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const isTheirManager = req.user.isManager && leave.reporting_manager_id === req.user.id;
    if (!canViewAll && !isTheirManager) throw new ApiError(403, 'Forbidden.');

    await client.query(
      `UPDATE leave_requests SET status = $1, actioned_by = $2, actioned_at = now() WHERE id = $3`,
      [decision, req.user.id, id]
    );

    if (decision === 'Approved' && leave.leave_type !== 'LossOfPay') {
      const balCol = LEAVE_TYPE_TO_BALANCE_COLUMN[leave.leave_type];
      await client.query(
        `UPDATE leave_balance SET ${balCol} = ${balCol} - $1, updated_at = now() WHERE employee_id = $2 AND year = $3`,
        [leave.days, leave.employee_id, new Date(leave.from_date).getFullYear()]
      );
    }
    if (decision === 'Approved') {
      const from = new Date(leave.from_date);
      const to = new Date(leave.to_date);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        await client.query(
          `INSERT INTO attendance (employee_id, date, status, updated_by)
           VALUES ($1,$2,'Leave',$3)
           ON CONFLICT (employee_id, date) DO UPDATE SET status = 'Leave', updated_by = $3, updated_at = now()`,
          [leave.employee_id, dateStr, req.user.id]
        );
      }
    }

    await client.query('COMMIT');

    const email = leave.personal_email || leave.work_email;
    if (email) {
      await sendMail({
        to: email,
        subject: `Leave ${decision} — ${SYSTEM.APP_NAME}`,
        text: `Hi ${leave.full_name},\n\nYour ${leave.leave_type} leave request (${leave.from_date} to ${leave.to_date}) has been ${decision}.\n\n— ${SYSTEM.APP_NAME}`
      });
    }

    await logAudit(req.user.id, 'LEAVE_DECISION', 'Leave', `${id} -> ${decision}`);
    res.json({ success: true, message: `Leave ${decision.toLowerCase()}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { apply, listMine, myBalance, listPending, decide };
