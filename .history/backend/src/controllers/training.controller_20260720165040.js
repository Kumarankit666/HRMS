const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/db');
const { logAudit, sendMail } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const PASS_PERCENT = 75;
const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'certificates');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

/** GET /api/training/my-departments — training tracks this employee is enrolled in. */
const myDepartments = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT d.id, d.name, d.description
     FROM training_assignments a
     JOIN training_departments d ON d.id = a.department_id
     WHERE a.employee_id = $1 ORDER BY d.name`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

/** Internal: builds each video's lock/complete/retake status for one employee + department. */
async function buildVideoStates(employeeId, departmentId) {
  const videosRes = await query(
    `SELECT id, title, youtube_id, order_num FROM training_videos WHERE department_id = $1 ORDER BY order_num`,
    [departmentId]
  );
  const videos = videosRes.rows;
  if (!videos.length) return [];

  const attemptsRes = await query(
    `SELECT video_id, percentage, created_at FROM training_attempts WHERE employee_id = $1 AND video_id = ANY($2::int[])`,
    [employeeId, videos.map((v) => v.id)]
  );
  const retakesRes = await query(
    `SELECT video_id, assigned_on FROM training_retakes WHERE employee_id = $1 AND status = 'Pending' AND video_id = ANY($2::int[])`,
    [employeeId, videos.map((v) => v.id)]
  );

  let chainOk = true;
  return videos.map((v) => {
    const vAttempts = attemptsRes.rows.filter((a) => a.video_id === v.id);
    const best = vAttempts.length ? Math.max(...vAttempts.map((a) => a.percentage)) : 0;
    const retake = retakesRes.rows.find((r) => r.video_id === v.id);

    let cleared = best >= PASS_PERCENT;
    let mandatory = false;
    if (retake) {
      const since = new Date(retake.assigned_on).getTime();
      const passedAfter = vAttempts.some((a) => a.percentage >= PASS_PERCENT && new Date(a.created_at).getTime() > since);
      cleared = passedAfter;
      mandatory = !passedAfter;
    }

    let status;
    if (!chainOk) status = 'locked';
    else if (mandatory) status = 'retake_required';
    else if (cleared) status = 'completed';
    else status = 'unlocked';
    chainOk = chainOk && cleared;

    return { videoId: v.id, title: v.title, youtubeId: v.youtube_id, order: v.order_num, status, bestPercentage: best, attempts: vAttempts.length };
  });
}

/** GET /api/training/videos?departmentId= — videos with lock status for the logged-in employee. */
const listVideos = asyncHandler(async (req, res) => {
  const { departmentId } = req.query;
  if (!departmentId) throw new ApiError(400, 'departmentId is required.');
  const videos = await buildVideoStates(req.user.id, departmentId);
  res.json({ success: true, data: videos });
});

/** GET /api/training/questions/:videoId — shuffled MCQs, correct answer withheld. */
const getQuestions = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const result = await query(
    `SELECT id, question, option_a, option_b, option_c, option_d FROM training_questions WHERE video_id = $1`,
    [videoId]
  );
  const shuffled = result.rows.sort(() => Math.random() - 0.5);
  res.json({ success: true, data: shuffled });
});

/** POST /api/training/submit — grades the quiz, records the attempt, checks for certificate eligibility. */
const submitTest = asyncHandler(async (req, res) => {
  const { videoId, answers } = req.body; // answers: { questionId: 'A'|'B'|'C'|'D' }
  if (!videoId || !answers) throw new ApiError(400, 'videoId and answers are required.');

  const questionsRes = await query(`SELECT id, correct_answer, video_id FROM training_questions WHERE video_id = $1`, [videoId]);
  const questions = questionsRes.rows;
  if (!questions.length) throw new ApiError(400, 'No questions found for this video.');

  let score = 0;
  questions.forEach((q) => { if (answers[q.id] === q.correct_answer) score++; });
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  const passed = percentage >= PASS_PERCENT;

  await query(
    `INSERT INTO training_attempts (employee_id, video_id, score, total, percentage, passed) VALUES ($1,$2,$3,$4,$5,$6)`,
    [req.user.id, videoId, score, total, percentage, passed]
  );

  if (passed) {
    await query(
      `UPDATE training_retakes SET status = 'Done' WHERE employee_id = $1 AND video_id = $2 AND status = 'Pending'`,
      [req.user.id, videoId]
    );
  }

  await logAudit(req.user.id, 'TRAINING_TEST_SUBMITTED', 'Training', `Video ${videoId} -> ${percentage}%`);

  // Check whether this completes the whole department (certificate eligibility).
  const videoRes = await query(`SELECT department_id FROM training_videos WHERE id = $1`, [videoId]);
  let certificateIssued = false;
  if (passed && videoRes.rows.length) {
    const departmentId = videoRes.rows[0].department_id;
    const states = await buildVideoStates(req.user.id, departmentId);
    const allDone = states.length > 0 && states.every((v) => v.status === 'completed');
    if (allDone) {
      certificateIssued = await issueCertificateIfNeeded(req.user.id, departmentId);
    }
  }

  res.json({ success: true, data: { score, total, percentage, passed, certificateIssued } });
});

/** Internal: creates the certificate DB row (PDF generated lazily on first fetch) if it doesn't exist yet. */
async function issueCertificateIfNeeded(employeeId, departmentId) {
  const existing = await query(`SELECT id FROM training_certificates WHERE employee_id = $1 AND department_id = $2`, [employeeId, departmentId]);
  if (existing.rows.length) return true;
  await query(`INSERT INTO training_certificates (employee_id, department_id) VALUES ($1,$2)`, [employeeId, departmentId]);
  return true;
}

function buildCertificatePdf(filePath, { fullName, deptName, certId, issueDate }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).lineWidth(3).stroke('#16233F');
    doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).lineWidth(1).stroke('#C6A249');

    doc.fontSize(11).fillColor('#16233F').font('Helvetica-Bold')
      .text(SYSTEM.APP_NAME.toUpperCase(), 0, 70, { align: 'center', characterSpacing: 3 });

    doc.fontSize(30).font('Helvetica-Bold').fillColor('#16233F')
      .text('CERTIFICATE', 0, 110, { align: 'center', characterSpacing: 4 });
    doc.fontSize(15).font('Helvetica-Oblique').fillColor('#C6A249')
      .text('of Completion', 0, 150, { align: 'center' });

    doc.fontSize(10).font('Helvetica').fillColor('#8A8578')
      .text('This is proudly presented to', 0, 185, { align: 'center' });

    doc.fontSize(34).font('Helvetica-BoldOblique').fillColor('#16233F')
      .text(fullName, 0, 205, { align: 'center' });

    doc.fontSize(10).font('Helvetica').fillColor('#5C5A52')
      .text('for successfully completing all training modules and assessments of', 0, 260, { align: 'center' });
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#16233F')
      .text(deptName, 0, 278, { align: 'center' });

    doc.fontSize(9).fillColor('#8A8578').font('Helvetica')
      .text(`Certificate ID: ${certId}    Issued: ${issueDate}`, 0, doc.page.height - 60, { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/** GET /api/training/certificate/:departmentId — returns cert info, generating the PDF on first request. */
const getCertificate = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const certRes = await query(
    `SELECT c.*, d.name AS dept_name, e.full_name FROM training_certificates c
     JOIN training_departments d ON d.id = c.department_id
     JOIN employees e ON e.id = c.employee_id
     WHERE c.employee_id = $1 AND c.department_id = $2`,
    [req.user.id, departmentId]
  );
  if (!certRes.rows.length) return res.json({ success: true, data: null });
  const cert = certRes.rows[0];

  let filePath = cert.cert_file_path;
  if (!filePath) {
    const fileName = `Certificate_${req.user.id}_${departmentId}.pdf`;
    const fullPath = path.join(STORAGE_DIR, fileName);
    const issueDateStr = new Date(cert.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    await buildCertificatePdf(fullPath, { fullName: cert.full_name, deptName: cert.dept_name, certId: 'CERT' + cert.id, issueDate: issueDateStr });
    filePath = `/files/certificates/${fileName}`;
    await query(`UPDATE training_certificates SET cert_file_path = $1 WHERE id = $2`, [filePath, cert.id]);

    if (!cert.email_sent) {
      const empEmailRes = await query(`SELECT personal_email, work_email FROM employees WHERE id = $1`, [req.user.id]);
      const toEmail = empEmailRes.rows[0]?.personal_email || empEmailRes.rows[0]?.work_email;
      if (toEmail) {
        await sendMail({
          to: toEmail,
          subject: `🎉 Training Completed — ${cert.dept_name}`,
          text: `Congratulations ${cert.full_name}!\n\nYou have completed all videos and tests for ${cert.dept_name}. Your certificate is ready.\n\n— ${SYSTEM.APP_NAME}`
        });
        await query(`UPDATE training_certificates SET email_sent = true WHERE id = $1`, [cert.id]);
      }
    }
  }

  res.json({
    success: true,
    data: {
      certId: 'CERT' + cert.id,
      employeeName: cert.full_name,
      deptName: cert.dept_name,
      issueDate: cert.issue_date,
      fileUrl: filePath
    }
  });
});

module.exports = { myDepartments, listVideos, getQuestions, submitTest, getCertificate };