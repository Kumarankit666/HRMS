const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const listDepartments = asyncHandler(async (req, res) => {
  const result = await query(`SELECT id, name FROM departments WHERE status = 'Active' ORDER BY name`);
  res.json({ success: true, data: result.rows });
});

const listDesignations = asyncHandler(async (req, res) => {
  const { departmentId } = req.query;
  const sql = departmentId
    ? `SELECT id, name, department_id FROM designations WHERE status = 'Active' AND department_id = $1 ORDER BY name`
    : `SELECT id, name, department_id FROM designations WHERE status = 'Active' ORDER BY name`;
  const result = await query(sql, departmentId ? [departmentId] : []);
  res.json({ success: true, data: result.rows });
});

/** Lightweight employee list for "assign manager" dropdowns — id, code, name only. */
const listManagerOptions = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, employee_code, full_name FROM employees WHERE status = 'Active' ORDER BY full_name`
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { listDepartments, listDesignations, listManagerOptions };
