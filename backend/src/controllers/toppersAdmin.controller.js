const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'toppers');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPG, PNG, or WEBP images are allowed.'));
    }
    cb(null, true);
  }
}).single('photo');

/** GET /api/toppers-admin — full list (including inactive) for management. */
const listAll = asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM topper_students ORDER BY display_order, exam_year DESC`);
  res.json({ success: true, data: result.rows });
});

/** POST /api/toppers-admin — add a topper student. multipart/form-data. */
const addTopper = asyncHandler(async (req, res, next) => {
  upload(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });

      const { studentName, examName, examYear, rankAchieved, marksObtained, currentStatus, displayOrder } = req.body;
      if (!studentName || !examName || !examYear || !rankAchieved) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Student name, exam name, year, and rank are required.' });
      }

      const photoPath = req.file ? `/files/toppers/${req.file.filename}` : null;
      const order = displayOrder === '' || displayOrder === undefined ? 1 : displayOrder;

      const result = await query(
        `INSERT INTO topper_students (student_name, exam_name, exam_year, rank_achieved, marks_obtained, current_status, photo_path, display_order, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [studentName, examName, examYear, rankAchieved, marksObtained || null, currentStatus || null, photoPath, order, req.user.id]
      );
      await logAudit(req.user.id, 'ADD_TOPPER', 'Toppers', `${studentName} — ${examName} ${examYear}`);
      res.status(201).json({ success: true, message: 'Topper student added.', data: { id: result.rows[0].id } });
    } catch (innerErr) {
      next(innerErr);
    }
  });
});

/** PATCH /api/toppers-admin/:id — update fields, optionally replace photo. */
const updateTopper = asyncHandler(async (req, res, next) => {
  upload(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
      const { id } = req.params;
      const { studentName, examName, examYear, rankAchieved, marksObtained, currentStatus, displayOrder, active } = req.body;

      const sets = [];
      const values = [];
      let i = 1;
      if (studentName !== undefined) { sets.push(`student_name = $${i++}`); values.push(studentName); }
      if (examName !== undefined) { sets.push(`exam_name = $${i++}`); values.push(examName); }
      if (examYear !== undefined) { sets.push(`exam_year = $${i++}`); values.push(examYear === '' ? null : examYear); }
      if (rankAchieved !== undefined) { sets.push(`rank_achieved = $${i++}`); values.push(rankAchieved); }
      if (marksObtained !== undefined) { sets.push(`marks_obtained = $${i++}`); values.push(marksObtained || null); }
      if (currentStatus !== undefined) { sets.push(`current_status = $${i++}`); values.push(currentStatus || null); }
      if (displayOrder !== undefined) { sets.push(`display_order = $${i++}`); values.push(displayOrder === '' ? 1 : displayOrder); }
      if (active !== undefined) { sets.push(`active = $${i++}`); values.push(active === 'true' || active === true); }
      if (req.file) { sets.push(`photo_path = $${i++}`); values.push(`/files/toppers/${req.file.filename}`); }

      if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
      values.push(id);

      await query(`UPDATE topper_students SET ${sets.join(', ')} WHERE id = $${i}`, values);
      await logAudit(req.user.id, 'UPDATE_TOPPER', 'Toppers', String(id));
      res.json({ success: true, message: 'Topper student updated.' });
    } catch (innerErr) {
      next(innerErr);
    }
  });
});

/** DELETE /api/toppers-admin/:id */
const deleteTopper = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query(`DELETE FROM topper_students WHERE id = $1`, [id]);
  await logAudit(req.user.id, 'DELETE_TOPPER', 'Toppers', String(id));
  res.json({ success: true, message: 'Topper student deleted.' });
});

module.exports = { listAll, addTopper, updateTopper, deleteTopper };