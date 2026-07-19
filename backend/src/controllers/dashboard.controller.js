const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const getStats = asyncHandler(async (req, res) => {
  const canViewAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

  if (canViewAll) {
    const [totalRes, activeRes, inactiveRes, presentRes, pendingLeaveRes, deptRes, newJoinersRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM employees`),
      query(`SELECT COUNT(*) FROM employees WHERE status = 'Active'`),
      query(`SELECT COUNT(*) FROM employees WHERE status = 'Inactive'`),
      query(`SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND status = 'Present'`),
      query(`SELECT COUNT(*) FROM leave_requests WHERE status = 'Pending'`),
      query(`SELECT d.name, COUNT(e.id) AS count FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Active' GROUP BY d.name ORDER BY d.name`),
      query(`SELECT COUNT(*) FROM employees WHERE status = 'Active' AND joining_date >= CURRENT_DATE - INTERVAL '30 days'`)
    ]);

    const recentPending = await query(
      `SELECT lr.id, e.employee_code, lr.leave_type, lr.from_date, lr.to_date
       FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id
       WHERE lr.status = 'Pending' ORDER BY lr.applied_at DESC LIMIT 5`
    );

    return res.json({
      success: true,
      data: {
        view: 'ADMIN_HR',
        cards: {
          totalEmployees: Number(totalRes.rows[0].count),
          activeEmployees: Number(activeRes.rows[0].count),
          inactiveEmployees: Number(inactiveRes.rows[0].count),
          presentToday: Number(presentRes.rows[0].count),
          pendingLeave: Number(pendingLeaveRes.rows[0].count),
          departmentCount: deptRes.rows.length,
          newJoiners30d: Number(newJoinersRes.rows[0].count)
        },
        departmentBreakdown: deptRes.rows,
        recentPendingLeave: recentPending.rows
      }
    });
  }

  // Employee / Manager view
  const [balanceRes, pendingMineRes, presentRes] = await Promise.all([
    query(`SELECT casual_leave, sick_leave, earned_leave FROM leave_balance WHERE employee_id = $1 AND year = $2`, [req.user.id, new Date().getFullYear()]),
    query(`SELECT COUNT(*) FROM leave_requests WHERE employee_id = $1 AND status = 'Pending'`, [req.user.id]),
    query(`SELECT COUNT(*) FROM attendance WHERE employee_id = $1 AND status = 'Present' AND date >= date_trunc('month', CURRENT_DATE)`, [req.user.id])
  ]);

  const bal = balanceRes.rows[0] || { casual_leave: 0, sick_leave: 0, earned_leave: 0 };
  const data = {
    view: 'EMPLOYEE',
    isManager: req.user.isManager,
    cards: {
      leaveBalance: Number(bal.casual_leave) + Number(bal.sick_leave) + Number(bal.earned_leave),
      pendingLeaveRequests: Number(pendingMineRes.rows[0].count),
      presentThisMonth: Number(presentRes.rows[0].count)
    }
  };

  if (req.user.isManager) {
    const teamRes = await query(`SELECT COUNT(*) FROM employees WHERE reporting_manager_id = $1`, [req.user.id]);
    const teamPendingRes = await query(
      `SELECT COUNT(*) FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id
       WHERE e.reporting_manager_id = $1 AND lr.status = 'Pending'`,
      [req.user.id]
    );
    data.team = { size: Number(teamRes.rows[0].count), pendingApprovals: Number(teamPendingRes.rows[0].count) };
  }

  res.json({ success: true, data });
});

module.exports = { getStats };
