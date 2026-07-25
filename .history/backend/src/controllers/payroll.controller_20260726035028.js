const fs = require('fs');
const path = require('path');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'payslips');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single('file');

/** PUT /api/payroll/salary-structure/:employeeId — HR/Admin sets (or updates) the fixed monthly salary structure. */
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

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Draws one full-width bordered row. cells = [{ text, width, align, bold }]. Returns the y after the row. */
function drawRow(doc, x, y, height, cells, opts = {}) {
  const totalWidth = cells.reduce((s, c) => s + c.width, 0);
  doc.rect(x, y, totalWidth, height).stroke('#000000');
  if (opts.shade) doc.rect(x, y, totalWidth, height).fill('#eeeeee').fillColor('#000000');

  let cx = x;
  cells.forEach((c, i) => {
    if (i > 0) doc.moveTo(cx, y).lineTo(cx, y + height).stroke('#000000');
    doc.font(c.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(c.size || 10).fillColor('#000000');
    doc.text(c.text, cx + 6, y + height / 2 - 5, { width: c.width - 12, align: c.align || 'left' });
    cx += c.width;
  });
  return y + height;
}

function buildPayslipPdf(filePath, data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const left = 36;
    const width = doc.page.width - left * 2;
    const col = [Math.round(width * 0.22), Math.round(width * 0.28), Math.round(width * 0.22), width - Math.round(width * 0.22) - Math.round(width * 0.28) - Math.round(width * 0.22)];

    // ---- Outer border ----
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#000000');

    // ---- Header ----
    doc.font('Helvetica-Bold').fontSize(18).text(data.companyName.toUpperCase(), left, 40, { width, align: 'center' });
    if (data.address) {
      doc.font('Helvetica').fontSize(9.5).text(data.address, left, 64, { width, align: 'center' });
    }

    let y = 100;
    const rowH = 20;

    // Month title
    y = drawRow(doc, left, y, rowH, [{ text: `Month of ${MONTH_NAMES[data.month]},${data.year}`, width, align: 'center', bold: true }]);

    // Info rows
    y = drawRow(doc, left, y, rowH, [
      { text: 'Emp. ID', width: col[0], bold: true },
      { text: data.employeeCode, width: col[1], align: 'center' },
      { text: 'Bank Name', width: col[2], bold: true },
      { text: data.bankName || '—', width: col[3], align: 'center' }
    ], { shade: true });
    y = drawRow(doc, left, y, rowH, [
      { text: 'Name', width: col[0], bold: true },
      { text: data.fullName, width: col[1], align: 'center' },
      { text: 'Account No.', width: col[2], bold: true },
      { text: data.accountNumber || '—', width: col[3], align: 'center' }
    ]);
    y = drawRow(doc, left, y, rowH, [
      { text: 'Designation', width: col[0], bold: true },
      { text: data.designation || '—', width: col[1], align: 'center' },
      { text: 'IFSC', width: col[2], bold: true },
      { text: data.ifsc || '—', width: col[3], align: 'center' }
    ], { shade: true });
    y = drawRow(doc, left, y, rowH, [
      { text: 'Location', width: col[0], bold: true },
      { text: data.location || '—', width: col[1], align: 'center' },
      { text: 'Aadhaar', width: col[2], bold: true },
      { text: data.aadhaar || '—', width: col[3], align: 'center' }
    ]);
    y = drawRow(doc, left, y, rowH, [
      { text: 'Date of Joining', width: col[0], bold: true },
      { text: data.joiningDate || '—', width: col[1], align: 'center' },
      { text: 'PAN', width: col[2], bold: true },
      { text: data.pan || '—', width: col[3], align: 'center' }
    ], { shade: true });
    y = drawRow(doc, left, y, rowH, [
      { text: 'Days in Month', width: col[0], bold: true },
      { text: String(data.daysInMonth), width: col[1], align: 'center' },
      { text: '', width: col[2] },
      { text: '', width: col[3] }
    ]);

    // Salary Breakup title
    y = drawRow(doc, left, y, rowH, [{ text: 'Salary Breakup', width, align: 'center', bold: true }]);
    y = drawRow(doc, left, y, rowH, [
      { text: 'Earning', width: col[0] + col[1], align: 'center', bold: true },
      { text: 'Deduction', width: col[2] + col[3], align: 'center', bold: true }
    ]);

    const earningRows = [
      ['Basic Salary', data.basic], ['HRA', data.hra], ['Special Allowance', data.specialAllowance],
      ['Incentive', data.incentive], ['Arrear', data.arrear], ['Travelling Allowance', data.travellingAllowance]
    ];
    const deductionRows = [
      ['ESIC', data.esic], ['PF', data.pf], ['TDS', data.tds], ['Loan & Advance', data.loanAdvance], ['LOP', data.lopAmount], ['', null]
    ];
    for (let i = 0; i < earningRows.length; i++) {
      const shade = i % 2 === 1;
      y = drawRow(doc, left, y, rowH, [
        { text: earningRows[i][0], width: col[0], bold: true },
        { text: earningRows[i][1] === null ? '' : Number(earningRows[i][1]).toLocaleString('en-IN'), width: col[1], align: 'center' },
        { text: deductionRows[i][0], width: col[2], bold: true },
        { text: deductionRows[i][1] === null ? '' : Number(deductionRows[i][1]).toLocaleString('en-IN'), width: col[3], align: 'center' }
      ], { shade });
    }

    y = drawRow(doc, left, y, rowH, [
      { text: 'Total', width: col[0], bold: true },
      { text: Number(data.totalEarning).toLocaleString('en-IN'), width: col[1], align: 'center', bold: true },
      { text: 'Total', width: col[2], bold: true },
      { text: Number(data.totalDeduction).toLocaleString('en-IN'), width: col[3], align: 'center', bold: true }
    ], { shade: true });

    y = drawRow(doc, left, y, rowH, [
      { text: 'Net payable', width: col[0] + col[1] + col[2], bold: true, align: 'left' },
      { text: Number(data.netPayable).toLocaleString('en-IN'), width: col[3], align: 'center', bold: true }
    ]);

    y = drawRow(doc, left, y, rowH, [{ text: 'This slip is system generated, signature not required.', width, size: 8.5 }]);

    doc.font('Helvetica').fontSize(9).text(
      `${data.registrationNo ? 'Reg. No. ' + data.registrationNo + ', ' : ''}${data.contactPhone ? 'Contact No. ' + data.contactPhone + ', ' : ''}${data.contactEmail ? 'Email : ' + data.contactEmail : ''}`,
      left, y + 16, { width, align: 'center' }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/** Core payslip generation, used by both the single-employee endpoint and the bulk upload. Throws Error(message) on failure. */
async function generatePayslipCore(employeeId, month, year, extras, generatedBy) {
  const { incentive, arrear, travellingAllowance, loanAdvance, lopDays, tds } = extras;

  const structResult = await query(`SELECT * FROM salary_structure WHERE employee_id = $1`, [employeeId]);
  if (!structResult.rows.length) throw new Error('No salary structure set for this employee yet.');
  const s = structResult.rows[0];

  const empResult = await query(
    `SELECT full_name, employee_code, personal_email, work_email, work_location, joining_date,
            bank_account_number, bank_ifsc, bank_name, department_id, designation_id
     FROM employees WHERE id = $1`,
    [employeeId]
  );
  if (!empResult.rows.length) throw new Error('Employee not found.');
  const emp = empResult.rows[0];

  const designationRes = emp.designation_id ? await query(`SELECT name FROM designations WHERE id = $1`, [emp.designation_id]) : { rows: [] };
  const designation = designationRes.rows[0]?.name || '';

  const onboardingRes = await query(`SELECT submitted_data FROM onboarding WHERE employee_id = $1`, [employeeId]);
  const submitted = onboardingRes.rows[0]?.submitted_data || {};

  const bankName = emp.bank_name || submitted.bankName || null;
  const accountNumber = emp.bank_account_number || submitted.bankAccountNumber || null;
  const ifsc = emp.bank_ifsc || submitted.ifsc || null;
  const aadhaar = submitted.aadhaar || null;
  const pan = submitted.pan || null;

  const daysInMonth = new Date(year, month, 0).getDate();
  const perDayRate = (Number(s.basic || 0) + Number(s.hra || 0) + Number(s.special_allowance || 0)) / daysInMonth;
  const lopDaysNum = Number(lopDays || 0);
  const lopAmount = Math.round(perDayRate * lopDaysNum * 100) / 100;

  const incentiveVal = incentive !== undefined && incentive !== '' && incentive !== null ? Number(incentive) : Number(s.incentive || 0);
  const arrearVal = Number(arrear || 0);
  const travellingVal = Number(travellingAllowance || 0);
  const loanAdvanceVal = Number(loanAdvance || 0);
  const tdsVal = Number(tds || 0);

  const totalEarning = Number(s.basic || 0) + Number(s.hra || 0) + Number(s.special_allowance || 0) + incentiveVal + arrearVal + travellingVal;
  const totalDeduction = Number(s.esic || 0) + Number(s.pf || 0) + tdsVal + loanAdvanceVal + lopAmount;
  const netPayable = totalEarning - totalDeduction;

  const companyRes = await query(`SELECT * FROM company_settings WHERE id = 1`);
  const company = companyRes.rows[0] || { company_name: 'MSMG Education Solution' };

  const fileName = `Payslip_${emp.employee_code}_${month}_${year}.pdf`;
  const filePath = path.join(STORAGE_DIR, fileName);

  await buildPayslipPdf(filePath, {
    companyName: company.company_name, address: company.address, registrationNo: company.registration_no,
    contactPhone: company.contact_phone, contactEmail: company.contact_email,
    employeeCode: emp.employee_code, fullName: emp.full_name, designation, location: emp.work_location,
    joiningDate: emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
    daysInMonth, month, year,
    bankName, accountNumber, ifsc, aadhaar, pan,
    basic: s.basic, hra: s.hra, specialAllowance: s.special_allowance,
    incentive: incentiveVal, arrear: arrearVal, travellingAllowance: travellingVal,
    esic: s.esic, pf: s.pf, tds: tdsVal, loanAdvance: loanAdvanceVal, lopAmount,
    totalEarning, totalDeduction, netPayable
  });

  const publicPath = `/files/payslips/${fileName}`;
  await query(
    `INSERT INTO payroll (employee_id, month, year, gross_salary, deductions, tds, net_salary, file_path, generated_by,
       incentive, arrear, travelling_allowance, loan_advance, lop_days, lop_amount, days_in_month)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (employee_id, month, year) DO UPDATE
       SET gross_salary=$4, deductions=$5, tds=$6, net_salary=$7, file_path=$8, generated_by=$9,
           incentive=$10, arrear=$11, travelling_allowance=$12, loan_advance=$13, lop_days=$14, lop_amount=$15,
           days_in_month=$16, generated_at=now()`,
    [employeeId, month, year, totalEarning, totalDeduction, tdsVal, netPayable, publicPath, generatedBy,
      incentiveVal, arrearVal, travellingVal, loanAdvanceVal, lopDaysNum, lopAmount, daysInMonth]
  );

  return { fileUrl: publicPath, net: netPayable, employeeCode: emp.employee_code };
}

/** POST /api/payroll/generate/:employeeId — HR/Admin generates the payslip for a given month/year. Never emails automatically. */
const generatePayslip = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { month, year, incentive, arrear, travellingAllowance, loanAdvance, lopDays, tds } = req.body;
  if (!month || !year) throw new ApiError(400, 'month and year are required.');

  let result;
  try {
    result = await generatePayslipCore(employeeId, month, year, { incentive, arrear, travellingAllowance, loanAdvance, lopDays, tds }, req.user.id);
  } catch (err) {
    throw new ApiError(400, err.message);
  }

  await logAudit(req.user.id, 'GENERATE_PAYSLIP', 'Payroll', `${employeeId} ${month}/${year}`);
  res.json({ success: true, message: 'Payslip generated.', data: { fileUrl: result.fileUrl, net: result.net } });
});

/** GET /api/payroll/bulk-sample — downloadable CSV template for bulk payslip generation. */
const bulkSample = asyncHandler(async (req, res) => {
  const header = 'EmployeeID,Month,Year,Incentive,Arrear,TravellingAllowance,LoanAdvance,LOPDays,TDS';
  const example = 'EMP000001,7,2026,2000,0,1500,0,0,500';
  const csv = header + '\n' + example + '\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payslip_bulk_template.csv"');
  res.send(csv);
});

/** POST /api/payroll/bulk-generate — HR/Admin uploads a CSV/XLSX file to generate many payslips at once. */
const bulkGenerate = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

      const XLSX = require('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) return res.status(400).json({ success: false, message: 'The file has no data rows.' });

      const results = { succeeded: [], failed: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const employeeCode = String(row.EmployeeID || row.employeeId || '').trim();
        const month = Number(row.Month || row.month);
        const year = Number(row.Year || row.year);

        if (!employeeCode || !month || !year) {
          results.failed.push({ row: i + 2, reason: 'Missing EmployeeID, Month, or Year.' });
          continue;
        }

        try {
          const empRes = await query(`SELECT id FROM employees WHERE employee_code = $1`, [employeeCode]);
          if (!empRes.rows.length) throw new Error(`Employee ${employeeCode} not found.`);
          const employeeId = empRes.rows[0].id;

          const extras = {
            incentive: row.Incentive || row.incentive,
            arrear: row.Arrear || row.arrear,
            travellingAllowance: row.TravellingAllowance || row.travellingAllowance,
            loanAdvance: row.LoanAdvance || row.loanAdvance,
            lopDays: row.LOPDays || row.lopDays,
            tds: row.TDS || row.tds
          };

          await generatePayslipCore(employeeId, month, year, extras, req.user.id);
          results.succeeded.push(employeeCode);
        } catch (rowErr) {
          results.failed.push({ row: i + 2, employeeCode, reason: rowErr.message });
        }
      }

      await logAudit(req.user.id, 'BULK_GENERATE_PAYSLIP', 'Payroll', `${results.succeeded.length} succeeded, ${results.failed.length} failed`);
      res.json({
        success: true,
        message: `${results.succeeded.length} payslip(s) generated${results.failed.length ? `, ${results.failed.length} failed` : ''}.`,
        data: results
      });
    } catch (innerErr) {
      console.error(innerErr);
      res.status(500).json({ success: false, message: 'Bulk generation failed.' });
    }
  });
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

module.exports = { setSalaryStructure, getSalaryStructure, generatePayslip, myPayslips, listPayslips, bulkSample, bulkGenerate };