const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'policies');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new ApiError(400, 'Only PDF files are allowed.'));
    cb(null, true);
  }
}).single('file');

/** POST /api/policies-admin — HR uploads a new policy PDF (multipart: file, name). */
const uploadPolicy = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    if (!req.body.name) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Policy name is required.' });
    }

    const publicPath = `/files/policies/${req.file.filename}`;
    const result = await query(
      `INSERT INTO policy_documents (name, file_path, uploaded_by) VALUES ($1,$2,$3) RETURNING id`,
      [req.body.name, publicPath, req.user.id]
    );
    await logAudit(req.user.id, 'UPLOAD_POLICY', 'Policy', req.body.name);
    res.status(201).json({ success: true, message: 'Policy document uploaded.', data: { id: result.rows[0].id } });
  });
});

/** GET /api/policies-admin — list all policy documents. */
const listPolicies = asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM policy_documents ORDER BY created_at DESC`);
  res.json({ success: true, data: result.rows });
});

/** PATCH /api/policies-admin/:id/status — activate/deactivate (soft toggle, doesn't affect existing signatures). */
const setPolicyActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  await query(`UPDATE policy_documents SET active = $1 WHERE id = $2`, [!!active, id]);
  res.json({ success: true, message: `Policy ${active ? 'activated' : 'deactivated'}.` });
});

/** GET /api/policies-admin/:id/status — who has signed this policy, who hasn't. */
const policyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query(
    `SELECT e.employee_code, e.full_name, pa.status, pa.signature_name, pa.signed_at
     FROM policy_acknowledgements pa JOIN employees e ON e.id = pa.employee_id
     WHERE pa.policy_document_id = $1 ORDER BY pa.status, e.full_name`,
    [id]
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { uploadPolicy, listPolicies, setPolicyActive, policyStatus };