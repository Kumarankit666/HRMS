const { query } = require('../config/db');
const { logAudit, sendMail } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { buildVideoStates } = require('./training.controller');

/* ---------- Departments ---------- */
const listDepartments = asyncHandler(async (req, res) => {
  const result = await query(`SELECT id, name, description FROM training_departments ORDER BY name`);
  res.json({ success: true, data: result.rows });
});

const addDepartment = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, 'Department name is required.');
  const result = await query(
    `INSERT INTO training_departments (name, description) VALUES ($1,$2) RETURNING id`,
    [name, description || null]
  );
  await logAudit(req.user.id, 'ADD_TRAINING_DEPARTMENT', 'Training', name);
  res.status(201).json({ success: true, message: 'Department added.', data: { id: result.rows[0].id } });
});

/* ---------- Videos ---------- */
const listVideosAdmin = asyncHandler(async (req, res) => {
  const { departmentId } = req.query;
  if (!departmentId) throw new ApiError(400, 'departmentId is required.');
  const result = await query(
    `SELECT id, order_num, title, youtube_id, question_count,
            (SELECT COUNT(*) FROM training_questions q WHERE q.video_id = v.id) AS question_added
     FROM training_videos v WHERE department_id = $1 ORDER BY order_num`,
    [departmentId]
  );
  res.json({ success: true, data: result.rows });
});

const addVideo = asyncHandler(async (req, res) => {
  const { departmentId, orderNum, title, youtubeId, transcript, questionCount } = req.body;
  if (!departmentId || !title || !youtubeId) throw new ApiError(400, 'departmentId, title, and youtubeId are required.');

  const result = await query(
    `INSERT INTO training_videos (department_id, order_num, title, youtube_id, transcript, question_count)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [departmentId, orderNum || 1, title, youtubeId, transcript || null, questionCount || 5]
  );
  await logAudit(req.user.id, 'ADD_TRAINING_VIDEO', 'Training', title);
  res.status(201).json({ success: true, message: 'Video added.', data: { id: result.rows[0].id } });
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query(`DELETE FROM training_videos WHERE id = $1`, [id]);
  await logAudit(req.user.id, 'DELETE_TRAINING_VIDEO', 'Training', String(id));
  res.json({ success: true, message: 'Video deleted.' });
});

/* ---------- Questions (manual entry) ---------- */
const listQuestionsAdmin = asyncHandler(async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) throw new ApiError(400, 'videoId is required.');
  const result = await query(`SELECT * FROM training_questions WHERE video_id = $1`, [videoId]);
  res.json({ success: true, data: result.rows });
});

const addQuestion = asyncHandler(async (req, res) => {
  const { videoId, question, optionA, optionB, optionC, optionD, correctAnswer } = req.body;
  if (!videoId || !question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
    throw new ApiError(400, 'All question fields are required.');
  }
  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) throw new ApiError(400, 'correctAnswer must be A, B, C, or D.');

  const result = await query(
    `INSERT INTO training_questions (video_id, question, option_a, option_b, option_c, option_d, correct_answer)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [videoId, question, optionA, optionB, optionC, optionD, correctAnswer]
  );
  res.status(201).json({ success: true, message: 'Question added.', data: { id: result.rows[0].id } });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query(`DELETE FROM training_questions WHERE id = $1`, [id]);
  res.json({ success: true, message: 'Question deleted.' });
});

/* ---------- Assignments ---------- */
const assignTraining = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.body;
  if (!employeeId || !departmentId) throw new ApiError(400, 'employeeId and departmentId are required.');

  await query(
    `INSERT INTO training_assignments (employee_id, department_id, assigned_by) VALUES ($1,$2,$3)
     ON CONFLICT (employee_id, department_id) DO NOTHING`,
    [employeeId, departmentId, req.user.id]
  );

  const empRes = await query(`SELECT full_name, personal_email, work_email FROM employees WHERE id = $1`, [employeeId]);
  const deptRes = await query(`SELECT name FROM training_departments WHERE id = $1`, [departmentId]);
  if (empRes.rows.length && deptRes.rows.length) {
    const emp = empRes.rows[0];
    const email = emp.personal_email || emp.work_email;
    if (email) {
      await sendMail({
        to: email,
        subject: `New Training Assigned — ${deptRes.rows[0].name}`,
        text: `Hi ${emp.full_name},\n\nYou have been assigned the "${deptRes.rows[0].name}" training track. Log in to the HRMS to get started.\n\n— ${SYSTEM.APP_NAME}`
      });
    }
  }

  await logAudit(req.user.id, 'ASSIGN_TRAINING', 'Training', `${employeeId} -> dept ${departmentId}`);
  res.json({ success: true, message: 'Training assigned.' });
});

const unassignTraining = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.params;
  await query(`DELETE FROM training_assignments WHERE employee_id = $1 AND department_id = $2`, [employeeId, departmentId]);
  res.json({ success: true, message: 'Training unassigned.' });
});

/* ---------- Retake control ---------- */
const assignRetake = asyncHandler(async (req, res) => {
  const { employeeId, videoId } = req.body;
  const already = await query(
    `SELECT 1 FROM training_retakes WHERE employee_id = $1 AND video_id = $2 AND status = 'Pending'`,
    [employeeId, videoId]
  );
  if (already.rows.length) return res.json({ success: false, message: 'A retake is already pending for this video.' });

  await query(
    `INSERT INTO training_retakes (employee_id, video_id, assigned_by) VALUES ($1,$2,$3)`,
    [employeeId, videoId, req.user.id]
  );

  const empRes = await query(`SELECT full_name, personal_email, work_email FROM employees WHERE id = $1`, [employeeId]);
  const videoRes = await query(`SELECT title FROM training_videos WHERE id = $1`, [videoId]);
  if (empRes.rows.length && videoRes.rows.length) {
    const emp = empRes.rows[0];
    const email = emp.personal_email || emp.work_email;
    if (email) {
      await sendMail({
        to: email,
        subject: `Action required: retake "${videoRes.rows[0].title}"`,
        text: `Hi ${emp.full_name},\n\nYour admin has marked "${videoRes.rows[0].title}" as mandatory to rewatch and retest.\n\n— ${SYSTEM.APP_NAME}`
      });
    }
  }

  await logAudit(req.user.id, 'ASSIGN_RETAKE', 'Training', `${employeeId} -> video ${videoId}`);
  res.json({ success: true, message: 'Retake assigned and employee notified.' });
});

const cancelRetake = asyncHandler(async (req, res) => {
  const { employeeId, videoId } = req.body;
  const result = await query(
    `UPDATE training_retakes SET status = 'Cancelled' WHERE employee_id = $1 AND video_id = $2 AND status = 'Pending' RETURNING id`,
    [employeeId, videoId]
  );
  if (!result.rows.length) return res.json({ success: false, message: 'No pending retake found.' });
  res.json({ success: true, message: 'Retake cancelled.' });
});

/* ---------- Overview / Analytics ---------- */
const overview = asyncHandler(async (req, res) => {
  const assignmentsRes = await query(
    `SELECT a.employee_id, a.department_id, e.employee_code, e.full_name, e.personal_email AS email, d.name AS department
     FROM training_assignments a
     JOIN employees e ON e.id = a.employee_id
     JOIN training_departments d ON d.id = a.department_id`
  );

  const list = [];
  for (const row of assignmentsRes.rows) {
    const states = await buildVideoStates(row.employee_id, row.department_id);
    const completed = states.filter((v) => v.status === 'completed').length;
    const progress = states.length ? Math.round((completed / states.length) * 100) : 0;
    const certRes = await query(
      `SELECT id FROM training_certificates WHERE employee_id = $1 AND department_id = $2`,
      [row.employee_id, row.department_id]
    );
    list.push({
      employeeId: row.employee_id, employeeCode: row.employee_code, name: row.full_name, email: row.email,
      departmentId: row.department_id, department: row.department,
      totalVideos: states.length, completedVideos: completed, progressPercent: progress,
      certified: !!certRes.rows.length
    });
  }

  const deptRes = await query(`SELECT id, name FROM training_departments ORDER BY name`);

  res.json({
    success: true,
    data: {
      assignments: list,
      departments: deptRes.rows,
      totalAssignments: list.length,
      totalCertified: list.filter((e) => e.certified).length
    }
  });
});

const employeeDetail = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.params;
  const states = await buildVideoStates(employeeId, departmentId);

  const attemptsRes = await query(
    `SELECT ta.percentage, ta.passed, ta.created_at, tv.title
     FROM training_attempts ta JOIN training_videos tv ON tv.id = ta.video_id
     WHERE ta.employee_id = $1 AND tv.department_id = $2 ORDER BY ta.created_at`,
    [employeeId, departmentId]
  );

  res.json({ success: true, data: { videos: states, attempts: attemptsRes.rows } });
});

module.exports = {
  listDepartments, addDepartment,
  listVideosAdmin, addVideo, deleteVideo,
  listQuestionsAdmin, addQuestion, deleteQuestion,
  assignTraining, unassignTraining,
  assignRetake, cancelRetake,
  overview, employeeDetail
};