const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/db');
const { logAudit, sendMail } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'payslips');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

function computeNet(s) {
  const earnings = Number(s.basic || 0) + Number(s.hra || 0) + Number(s.special_allowance || 0)
    + Number(s.bonus || 0) + Number(s.incentive || 0) + Number(s.other_allowances || 0);
  const deductions = Number(s.pf || 0) + Number(s.esic || 0) + Number(s.professional_tax || 0);
  return { earnings, deductions, net: earnings - deductions };
}

/** PUT /api/payroll/salary-structure/:employeeId — HR/Admin sets (or updates) the salary structure. Employees can only view. */
const setSalaryStructure = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { ctc, basic, hra, specialAllowance, pf, esic, professionalTax, bonus, incentive, otherAllowances } = req.body;
  if (!ctc) throw new ApiError(400, 'CTC is required.');

  await query(
    `INSERT INTO salary_structure (employee_id, ctc, basic, hra, special_allowance, pf, esic, professional_tax, bonus, incentive, other_allowances, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (employee_id) DO UPDATE SET
       ctc=$2, basic=$3, hra=$4, special_allowance=$5, pf=$6, esic=$7, professional_tax=$8,
       bonus=$9, incentive=$10, other_allowances=$11, updated_by=$12, updated_at=now()`,
    [employeeId, ctc, basic || 0, hra || 0, specialAllowance || 0, pf || 0, esic || 0,
      professionalTax || 0, bonus || 0, incentive || 0, otherAllowances || 0, req.user.id]
  );

  await logAudit(req.user.id, 'SET_SALARY_STRUCTURE', 'Payroll', employeeId);
  res.json({ success: true, message: 'Salary structure saved.' });
});

/** GET /api/payroll/salary-structure/:employeeId — self, or HR/Admin for anyone. */
const getSalaryStructure = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const canViewAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  if (!canViewAll && employeeId !== req.user.id) throw new ApiError(403, 'Forbidden.');

  const result = await query(`SELECT * FROM salary_structure WHERE employee_id = $1`, [employeeId]);
  res.json({ success: true, data: result.rows[0] || null });
});

function buildPayslipPdf(filePath, { fullName, employeeCode, month, year, earnings, deductions, net, structure }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).font('Helvetica-Bold').text(SYSTEM.APP_NAME, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Payslip', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(10).text(`Employee: ${fullName} (${employeeCode})`);
    doc.text(`Period: ${month}/${year}`);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').text('Earnings', { continued: false });
    doc.font('Helvetica');
    [['Basic', structure.basic], ['HRA', structure.hra], ['Special Allowance', structure.special_allowance],
      ['Bonus', structure.bonus], ['Incentive', structure.incentive], ['Other Allowances', structure.other_allowances]]
      .forEach(([label, val]) => doc.text(`${label}: ${Number(val || 0).toFixed(2)}`));
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Deductions');
    doc.font('Helvetica');
    [['PF', structure.pf], ['ESIC', structure.esic], ['Professional Tax', structure.professional_tax]]
      .forEach(([label, val]) => doc.text(`${label}: ${Number(val || 0).toFixed(2)}`));
    doc.moveDown(1);

    doc.font('Helvetica-Bold').text(`Gross Earnings: ${earnings.toFixed(2)}`);
    doc.text(`Total Deductions: ${deductions.toFixed(2)}`);
    doc.fontSize(13).text(`Net Salary: ${net.toFixed(2)}`, { underline: true });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/** POST /api/payroll/generate/:employeeId — HR/Admin generates the payslip for a given month/year. */
const generatePayslip = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.body;
  if (!month || !year) throw new ApiError(400, 'month and year are required.');

  const structResult = await query(`SELECT * FROM salary_structure WHERE employee_id = $1`, [employeeId]);
  if (!structResult.rows.length) throw new ApiError(400, 'No salary structure set for this employee yet.');
  const structure = structResult.rows[0];
  const { earnings, deductions, net } = computeNet(structure);

  const empResult = await query(`SELECT full_name, employee_code, personal_email, work_email FROM employees WHERE id = $1`, [employeeId]);
  if (!empResult.rows.length) throw new ApiError(404, 'Employee not found.');
  const emp = empResult.rows[0];

  const fileName = `Payslip_${emp.employee_code}_${month}_${year}.pdf`;
  const filePath = path.join(STORAGE_DIR, fileName);
  await buildPayslipPdf(filePath, { fullName: emp.full_name, employeeCode: emp.employee_code, month, year, earnings, deductions, net, structure });

  const publicPath = `/files/payslips/${fileName}`;
  await query(
    `INSERT INTO payroll (employee_id, month, year, gross_salary, deductions, tds, net_salary, file_path, generated_by)
     VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8)
     ON CONFLICT (employee_id, month, year) DO UPDATE
       SET gross_salary=$4, deductions=$5, net_salary=$6, file_path=$7, generated_by=$8, generated_at=now()`,
    [employeeId, month, year, earnings, deductions, net, publicPath, req.user.id]
  );

  const toEmail = emp.personal_email || emp.work_email;
  if (toEmail) {
    await sendMail({
      to: toEmail,
      subject: `Payslip for ${month}/${year} — ${SYSTEM.APP_NAME}`,
      text: `Hi ${emp.full_name},\n\nYour payslip for ${month}/${year} is ready. Net Salary: ${net.toFixed(2)}\n\n— ${SYSTEM.APP_NAME}`
    });
  }

  await logAudit(req.user.id, 'GENERATE_PAYSLIP', 'Payroll', `${employeeId} ${month}/${year}`);
  res.json({ success: true, message: 'Payslip generated and emailed.', data: { fileUrl: publicPath, net } });
});

/** GET /api/payroll/me — my own payslip history. */
const myPayslips = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT month, year, gross_salary, deductions, net_salary, file_path, generated_at
     FROM payroll WHERE employee_id = $1 ORDER BY year DESC, month DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

/** GET /api/payroll?employeeId= — HR/Admin: all payslips, optionally filtered by employee. */
const listPayslips = asyncHandler(async (req, res) => {
  const { employeeId } = req.query;
  const sql = employeeId
    ? `SELECT p.*, e.employee_code, e.full_name FROM payroll p JOIN employees e ON e.id = p.employee_id WHERE p.employee_id = $1 ORDER BY p.year DESC, p.month DESC`
    : `SELECT p.*, e.employee_code, e.full_name FROM payroll p JOIN employees e ON e.id = p.employee_id ORDER BY p.generated_at DESC`;
  const result = await query(sql, employeeId ? [employeeId] : []);
  res.json({ success: true, data: result.rows });
});

module.exports = { setSalaryStructure, getSalaryStructure, generatePayslip, myPayslips, listPayslips };