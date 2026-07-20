const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/db');
const { logAudit, sendMail } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'offer-letters');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

function buildPdf(filePath, { fullName, designation, department, location, salary, joiningDate }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text(SYSTEM.APP_NAME, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text('Offer of Employment', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica').text(`Date: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown(1);
    doc.text(`Dear ${fullName},`);
    doc.moveDown(1);
    doc.text(
      `We are pleased to offer you the position of ${designation} in the ${department} department at ${location}. ` +
      `Your annual CTC will be ${salary}, and your date of joining will be ${joiningDate}.`,
      { align: 'justify' }
    );
    doc.moveDown(1);
    doc.text('Please sign and return a copy of this letter to confirm your acceptance of this offer.');
    doc.moveDown(1);
    doc.text('We look forward to welcoming you to the team.');
    doc.moveDown(2);
    doc.text('Sincerely,');
    doc.text(`HR Team, ${SYSTEM.APP_NAME}`);

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/** POST /api/offer-letters/:employeeId — generate + email. Blocked unless onboarding is Approved. */
const generate = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { salary, location, department, designation, joiningDate } = req.body;
  if (!salary) throw new ApiError(400, 'Salary (CTC) is required.');

  const onboarding = await query(`SELECT status FROM onboarding WHERE employee_id = $1`, [employeeId]);
  if (!onboarding.rows.length || onboarding.rows[0].status !== 'Approved') {
    throw new ApiError(400, 'Onboarding must be approved before an offer letter can be generated.', 'ONBOARDING_NOT_APPROVED');
  }

  const empResult = await query(
    `SELECT e.full_name, e.personal_email, e.work_email, e.work_location, e.joining_date,
            d.name AS department, dg.name AS designation
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations dg ON dg.id = e.designation_id
     WHERE e.id = $1`,
    [employeeId]
  );
  if (!empResult.rows.length) throw new ApiError(404, 'Employee not found.');
  const emp = empResult.rows[0];

  const finalDetails = {
    fullName: emp.full_name,
    designation: designation || emp.designation || 'N/A',
    department: department || emp.department || 'N/A',
    location: location || emp.work_location || 'N/A',
    salary,
    joiningDate: joiningDate || (emp.joining_date ? emp.joining_date.toISOString().slice(0, 10) : 'N/A')
  };

  const fileName = `OfferLetter_${employeeId}_${Date.now()}.pdf`;
  const filePath = path.join(STORAGE_DIR, fileName);
  await buildPdf(filePath, finalDetails);

  const publicPath = `/files/offer-letters/${fileName}`;
  await query(
    `INSERT INTO offer_letters (employee_id, salary, location, department, designation, joining_date, file_path, generated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [employeeId, salary, finalDetails.location, finalDetails.department, finalDetails.designation, finalDetails.joiningDate, publicPath, req.user.id]
  );

  const toEmail = emp.personal_email || emp.work_email;
  if (toEmail) {
    await sendMail({
      to: toEmail,
      subject: `Your Offer Letter — ${SYSTEM.APP_NAME}`,
      text: `Hi ${emp.full_name},\n\nCongratulations! Your offer letter is attached/ready.\n\n— ${SYSTEM.APP_NAME}`
    });
  }

  await logAudit(req.user.id, 'GENERATE_OFFER_LETTER', 'OfferLetter', employeeId);

  // Auto-assign training: if a training department name matches this employee's HR department, enroll them.
  try {
    const empDeptRes = await query(
      `SELECT d.name FROM employees e LEFT JOIN departments d ON d.id = e.department_id WHERE e.id = $1`,
      [employeeId]
    );
    const deptName = empDeptRes.rows[0]?.name;
    if (deptName) {
      const trainingDeptRes = await query(`SELECT id FROM training_departments WHERE name = $1`, [deptName]);
      if (trainingDeptRes.rows.length) {
        await query(
          `INSERT INTO training_assignments (employee_id, department_id, assigned_by) VALUES ($1,$2,NULL)
           ON CONFLICT (employee_id, department_id) DO NOTHING`,
          [employeeId, trainingDeptRes.rows[0].id]
        );
        await logAudit(req.user.id, 'AUTO_ASSIGN_TRAINING', 'Training', `${employeeId} -> department "${deptName}"`);
      }
    }
  } catch (e) {
    console.error('Auto-assign training failed (non-fatal):', e.message);
  }

  res.json({ success: true, message: 'Offer letter generated and emailed.', data: { fileUrl: publicPath } });
});

/** GET /api/offer-letters — list generated letters. */
const list = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ol.*, e.employee_code, e.full_name FROM offer_letters ol
     JOIN employees e ON e.id = ol.employee_id ORDER BY ol.generated_at DESC`
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { generate, list };