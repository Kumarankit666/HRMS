const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, getClient } = require('../config/db');
const { SYSTEM, ROLES } = require('../config/constants');
const { generateNextEmployeeCode, logAudit, sendMail } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

function randomTempPassword() {
  return crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) + '@1';
}

/** POST /api/employees — HR/Admin adds a new employee. Creates login + leave balance + onboarding row. */
const addEmployee = asyncHandler(async (req, res) => {
  const {
    fullName, personalEmail, departmentId, designationId, joiningDate,
    reportingManagerId, employmentType, workLocation, role
  } = req.body;

  if (!fullName || !personalEmail) throw new ApiError(400, 'Full name and personal email are required.');

  let assignedRole = role || ROLES.EMPLOYEE;
  if (![ROLES.EMPLOYEE, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN].includes(assignedRole)) assignedRole = ROLES.EMPLOYEE;
  if (assignedRole !== ROLES.EMPLOYEE && req.user.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only a Super Admin can assign HR Admin or Super Admin roles.');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const employeeCode = await generateNextEmployeeCode();
    const empInsert = await client.query(
      `INSERT INTO employees (employee_code, full_name, personal_email, work_email, department_id, designation_id,
                               joining_date, reporting_manager_id, employment_type, work_location, status)
       VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,'Active') RETURNING id, employee_code`,
      [employeeCode, fullName, personalEmail, departmentId || null, designationId || null,
        joiningDate || new Date(), reportingManagerId || null, employmentType || 'Full-Time', workLocation || null]
    );
    const employee = empInsert.rows[0];

    const tempPassword = randomTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SYSTEM.BCRYPT_ROUNDS);
    await client.query(
      `INSERT INTO employee_login (employee_id, password_hash, role, must_reset_password) VALUES ($1,$2,$3,true)`,
      [employee.id, passwordHash, assignedRole]
    );

    await client.query(
      `INSERT INTO leave_balance (employee_id, year) VALUES ($1, $2)`,
      [employee.id, new Date().getFullYear()]
    );

    await client.query(
      `INSERT INTO onboarding (employee_id, status) VALUES ($1, 'Pending')`,
      [employee.id]
    );

    await client.query('COMMIT');

    // Fire-and-forget: don't make the HR user wait for the email to actually leave the server.
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    sendMail({
      to: personalEmail,
      subject: `Welcome to ${SYSTEM.APP_NAME}`,
      text: `Hi ${fullName},\n\nYour account has been created.\n\nEmployee ID: ${employee.employee_code}\nTemporary Password: ${tempPassword}\n\n` +
        `Complete your onboarding here:\n${loginUrl}\n\n` +
        `Log in with the credentials above — you'll be taken straight to your onboarding form.\nPlease change your password on first use.\n\n— ${SYSTEM.APP_NAME}`
    });

    // Safety net: always visible in the server console, even if email delivery fails/isn't configured.
    console.log(`\n[CREDENTIALS] Employee ${employee.employee_code} — Temporary Password: ${tempPassword}\n`);

    await logAudit(req.user.id, 'ADD_EMPLOYEE', 'Employee', `Created ${employee.employee_code} (${assignedRole})`);

    res.status(201).json({ success: true, message: `Employee added. Credentials emailed to ${personalEmail}.`, data: { employeeCode: employee.employee_code } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/** PATCH /api/employees/:id — update profile fields (not password, not salary). */
const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowed = ['full_name', 'department_id', 'designation_id', 'reporting_manager_id',
    'employment_type', 'work_location', 'personal_email', 'work_email'];
  const fieldMap = {
    fullName: 'full_name', departmentId: 'department_id', designationId: 'designation_id',
    reportingManagerId: 'reporting_manager_id', employmentType: 'employment_type',
    workLocation: 'work_location', personalEmail: 'personal_email', workEmail: 'work_email'
  };

  const sets = [];
  const values = [];
  let i = 1;
  Object.keys(fieldMap).forEach((clientKey) => {
    if (req.body[clientKey] !== undefined) {
      sets.push(`${fieldMap[clientKey]} = $${i++}`);
      values.push(req.body[clientKey]);
    }
  });
  if (!sets.length) throw new ApiError(400, 'No valid fields to update.');
  values.push(id);

  const result = await query(
    `UPDATE employees SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`,
    values
  );
  if (!result.rows.length) throw new ApiError(404, 'Employee not found.');

  await logAudit(req.user.id, 'UPDATE_EMPLOYEE', 'Employee', `${id} -> ${JSON.stringify(req.body)}`);
  res.json({ success: true, message: 'Employee updated.' });
});

/** PATCH /api/employees/:id/manager — dedicated endpoint for reassigning a manager. */
const assignManager = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { managerId } = req.body;

  if (managerId === id) throw new ApiError(400, 'An employee cannot be their own manager.');
  if (managerId) {
    const mgr = await query(`SELECT id FROM employees WHERE id = $1`, [managerId]);
    if (!mgr.rows.length) throw new ApiError(400, 'Manager not found.');
  }

  const result = await query(
    `UPDATE employees SET reporting_manager_id = $1 WHERE id = $2 RETURNING id`,
    [managerId || null, id]
  );
  if (!result.rows.length) throw new ApiError(404, 'Employee not found.');

  await logAudit(req.user.id, 'ASSIGN_MANAGER', 'Employee', `${id} -> manager ${managerId || 'none'}`);
  res.json({ success: true, message: 'Manager assigned.' });
});

/** PATCH /api/employees/:id/status — deactivate or reactivate. */
const setStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Active' | 'Inactive'
  if (!['Active', 'Inactive'].includes(status)) throw new ApiError(400, 'Invalid status.');
  if (status === 'Inactive' && id === req.user.id) throw new ApiError(400, 'You cannot deactivate your own account.');

  const result = await query(`UPDATE employees SET status = $1 WHERE id = $2 RETURNING id`, [status, id]);
  if (!result.rows.length) throw new ApiError(404, 'Employee not found.');

  await logAudit(req.user.id, status === 'Active' ? 'REACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE', 'Employee', id);
  res.json({ success: true, message: `Employee ${status === 'Active' ? 'reactivated' : 'deactivated'}.` });
});

/** POST /api/employees/:id/reset-password — HR/Admin resets an employee's password; new temp password emailed. */
const resetEmployeePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const empResult = await query(`SELECT full_name, personal_email, work_email FROM employees WHERE id = $1`, [id]);
  if (!empResult.rows.length) throw new ApiError(404, 'Employee not found.');
  const emp = empResult.rows[0];

  const tempPassword = randomTempPassword();
  const hash = await bcrypt.hash(tempPassword, SYSTEM.BCRYPT_ROUNDS);
  await query(
    `UPDATE employee_login SET password_hash = $1, must_reset_password = true, failed_attempts = 0, locked_until = NULL WHERE employee_id = $2`,
    [hash, id]
  );

  sendMail({
    to: emp.personal_email || emp.work_email,
    subject: `Your password has been reset — ${SYSTEM.APP_NAME}`,
    text: `Hi ${emp.full_name},\n\nYour password was reset by HR.\n\nTemporary Password: ${tempPassword}\n\nLog in here:\n${process.env.FRONTEND_URL || 'http://localhost:5173'}/login\n\nPlease change your password immediately after logging in.\n\n— ${SYSTEM.APP_NAME}`
  });

  console.log(`\n[CREDENTIALS] Employee ${id} — New Temporary Password: ${tempPassword}\n`);

  await logAudit(req.user.id, 'RESET_PASSWORD', 'Employee', `Password reset for ${id}`);
  res.json({ success: true, message: 'New password emailed to the employee.' });
});

/** GET /api/employees — role-scoped list (HR/Admin: everyone, Manager: direct reports, Employee: self). */
const listEmployees = asyncHandler(async (req, res) => {
  const { search, departmentId, status } = req.query;
  const canViewAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

  let sql = `
    SELECT e.id, e.employee_code, e.full_name, e.personal_email, e.work_email, e.status,
           d.name AS department, dg.name AS designation, e.reporting_manager_id, e.joining_date
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN designations dg ON dg.id = e.designation_id
    WHERE 1=1`;
  const params = [];
  let i = 1;

  if (!canViewAll) {
    if (req.user.isManager) {
      sql += ` AND (e.reporting_manager_id = $${i} OR e.id = $${i})`;
      params.push(req.user.id); i++;
    } else {
      sql += ` AND e.id = $${i}`;
      params.push(req.user.id); i++;
    }
  }
  if (search) { sql += ` AND (e.full_name ILIKE $${i} OR e.employee_code ILIKE $${i})`; params.push(`%${search}%`); i++; }
  if (departmentId) { sql += ` AND e.department_id = $${i}`; params.push(departmentId); i++; }
  if (status) { sql += ` AND e.status = $${i}`; params.push(status); i++; }
  sql += ` ORDER BY e.created_at DESC`;

  const result = await query(sql, params);
  res.json({ success: true, data: result.rows });
});

/** GET /api/employees/:id — full profile, permission-checked (self, own manager, or HR/Admin). */
const getEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const canViewAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

  const result = await query(
    `SELECT e.*, d.name AS department, dg.name AS designation, l.role, l.must_reset_password
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations dg ON dg.id = e.designation_id
     LEFT JOIN employee_login l ON l.employee_id = e.id
     WHERE e.id = $1`,
    [id]
  );
  if (!result.rows.length) throw new ApiError(404, 'Employee not found.');
  const emp = result.rows[0];

  const isSelf = emp.id === req.user.id;
  const isTheirManager = req.user.isManager && emp.reporting_manager_id === req.user.id;
  if (!canViewAll && !isSelf && !isTheirManager) throw new ApiError(403, 'Forbidden.');

  res.json({ success: true, data: emp });
});

module.exports = { addEmployee, updateEmployee, assignManager, setStatus, resetEmployeePassword, listEmployees, getEmployee };