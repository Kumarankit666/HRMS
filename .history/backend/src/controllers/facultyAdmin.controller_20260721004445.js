const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'faculty');
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

/** GET /api/faculty-admin — full list (including inactive) for management. */
const listAll = asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM faculty_members ORDER BY display_order, full_name`);
  res.json({ success: true, data: result.rows });
});

/** POST /api/faculty-admin — add a faculty member. multipart/form-data: photo (optional), fullName, role, subject, displayOrder. */
const addFaculty = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });

    const { fullName, role, subject, displayOrder, qualification, experienceYears } = req.body;
    if (!fullName) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    const photoPath = req.file ? `/files/faculty/${req.file.filename}` : null;
    const result = await query(
      `INSERT INTO faculty_members (full_name, role, subject, photo_path, display_order, qualification, experience_years, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [fullName, role || null, subject || null, photoPath, displayOrder || 1, qualification || null, experienceYears || null, req.user.id]
    );
    await logAudit(req.user.id, 'ADD_FACULTY', 'Faculty', fullName);
    res.status(201).json({ success: true, message: 'Faculty member added.', data: { id: result.rows[0].id } });
  });
});

/** PATCH /api/faculty-admin/:id — update fields, optionally replace photo. */
const updateFaculty = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    const { id } = req.params;
    const { fullName, role, subject, displayOrder, active, qualification, experienceYears } = req.body;

    const sets = [];
    const values = [];
    let i = 1;
    if (fullName !== undefined) { sets.push(`full_name = $${i++}`); values.push(fullName); }
    if (role !== undefined) { sets.push(`role = $${i++}`); values.push(role); }
    if (subject !== undefined) { sets.push(`subject = $${i++}`); values.push(subject); }
    if (displayOrder !== undefined) { sets.push(`display_order = $${i++}`); values.push(displayOrder); }
    if (qualification !== undefined) { sets.push(`qualification = $${i++}`); values.push(qualification); }
    if (experienceYears !== undefined) { sets.push(`experience_years = $${i++}`); values.push(experienceYears); }
    if (active !== undefined) { sets.push(`active = $${i++}`); values.push(active === 'true' || active === true); }
    if (req.file) { sets.push(`photo_path = $${i++}`); values.push(`/files/faculty/${req.file.filename}`); }

    if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
    values.push(id);

    await query(`UPDATE faculty_members SET ${sets.join(', ')} WHERE id = $${i}`, values);
    await logAudit(req.user.id, 'UPDATE_FACULTY', 'Faculty', String(id));
    res.json({ success: true, message: 'Faculty member updated.' });
  });
});

/** DELETE /api/faculty-admin/:id */
const deleteFaculty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query(`DELETE FROM faculty_members WHERE id = $1`, [id]);
  await logAudit(req.user.id, 'DELETE_FACULTY', 'Faculty', String(id));
  res.json({ success: true, message: 'Faculty member deleted.' });
});

module.exports = { listAll, addFaculty, updateFaculty, deleteFaculty };