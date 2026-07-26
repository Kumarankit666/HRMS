const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'leadership');
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

const listAll = asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM leadership_members ORDER BY display_order, full_name`);
  res.json({ success: true, data: result.rows });
});

const addLeader = asyncHandler(async (req, res, next) => {
  upload(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
      const { fullName, designation, message, displayOrder } = req.body;
      if (!fullName || !designation) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Full name and designation are required.' });
      }
      const photoPath = req.file ? `/files/leadership/${req.file.filename}` : null;
      const order = displayOrder === '' || displayOrder === undefined ? 1 : displayOrder;

      const result = await query(
        `INSERT INTO leadership_members (full_name, designation, photo_path, message, display_order, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [fullName, designation, photoPath, message || null, order, req.user.id]
      );
      await logAudit(req.user.id, 'ADD_LEADERSHIP', 'Leadership', `${fullName} — ${designation}`);
      res.status(201).json({ success: true, message: 'Leadership member added.', data: { id: result.rows[0].id } });
    } catch (innerErr) {
      next(innerErr);
    }
  });
});

const updateLeader = asyncHandler(async (req, res, next) => {
  upload(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
      const { id } = req.params;
      const { fullName, designation, message, displayOrder, active } = req.body;

      const sets = [];
      const values = [];
      let i = 1;
      if (fullName !== undefined) { sets.push(`full_name = $${i++}`); values.push(fullName); }
      if (designation !== undefined) { sets.push(`designation = $${i++}`); values.push(designation); }
      if (message !== undefined) { sets.push(`message = $${i++}`); values.push(message || null); }
      if (displayOrder !== undefined) { sets.push(`display_order = $${i++}`); values.push(displayOrder === '' ? 1 : displayOrder); }
      if (active !== undefined) { sets.push(`active = $${i++}`); values.push(active === 'true' || active === true); }
      if (req.file) { sets.push(`photo_path = $${i++}`); values.push(`/files/leadership/${req.file.filename}`); }

      if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
      values.push(id);

      await query(`UPDATE leadership_members SET ${sets.join(', ')} WHERE id = $${i}`, values);
      await logAudit(req.user.id, 'UPDATE_LEADERSHIP', 'Leadership', String(id));
      res.json({ success: true, message: 'Leadership member updated.' });
    } catch (innerErr) {
      next(innerErr);
    }
  });
});

const deleteLeader = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query(`DELETE FROM leadership_members WHERE id = $1`, [id]);
  await logAudit(req.user.id, 'DELETE_LEADERSHIP', 'Leadership', String(id));
  res.json({ success: true, message: 'Leadership member deleted.' });
});

module.exports = { listAll, addLeader, updateLeader, deleteLeader };