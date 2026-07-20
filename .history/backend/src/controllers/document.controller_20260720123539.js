const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'documents');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const DOC_TYPES = ['Aadhaar', 'PAN', 'Passport', 'DrivingLicense', 'Resume', 'Certificate', 'Photo', 'Signature', 'Other'];
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(STORAGE_DIR, req.user.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) return cb(new ApiError(400, 'Only PDF, JPG, PNG, or WEBP files are allowed.'));
    cb(null, true);
  }
}).single('file');

/** POST /api/documents — employee uploads their own document (multipart/form-data: file, docType). */
const uploadDocument = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Max 5MB.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const docType = req.body.docType;
    if (!DOC_TYPES.includes(docType)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: `docType must be one of: ${DOC_TYPES.join(', ')}` });
    }

    const publicPath = `/files/documents/${req.user.id}/${req.file.filename}`;
    await query(
      `INSERT INTO employee_documents (employee_id, doc_type, file_name, file_path) VALUES ($1,$2,$3,$4)`,
      [req.user.id, docType, req.file.originalname, publicPath]
    );

    await logAudit(req.user.id, 'UPLOAD_DOCUMENT', 'Documents', docType);
    res.status(201).json({ success: true, message: 'Document uploaded.', data: { filePath: publicPath } });
  });
});

/** GET /api/documents/me — my own uploaded documents. */
const myDocuments = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, doc_type, file_name, file_path, verified_status, uploaded_at
     FROM employee_documents WHERE employee_id = $1 ORDER BY uploaded_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

/** GET /api/documents?employeeId= — HR/Admin views any employee's documents. */
const listDocuments = asyncHandler(async (req, res) => {
  const { employeeId } = req.query;
  if (!employeeId) throw new ApiError(400, 'employeeId is required.');

  const result = await query(
    `SELECT id, doc_type, file_name, file_path, verified_status, uploaded_at
     FROM employee_documents WHERE employee_id = $1 ORDER BY uploaded_at DESC`,
    [employeeId]
  );
  res.json({ success: true, data: result.rows });
});

/** PATCH /api/documents/:id/verify — HR/Admin marks a document Verified or Rejected. */
const verifyDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Verified' | 'Rejected'
  if (!['Verified', 'Rejected'].includes(status)) throw new ApiError(400, 'Invalid status.');

  const result = await query(
    `UPDATE employee_documents SET verified_status = $1, verified_by = $2 WHERE id = $3 RETURNING id`,
    [status, req.user.id, id]
  );
  if (!result.rows.length) throw new ApiError(404, 'Document not found.');

  await logAudit(req.user.id, 'VERIFY_DOCUMENT', 'Documents', `${id} -> ${status}`);
  res.json({ success: true, message: `Document marked ${status}.` });
});

/** DELETE /api/documents/:id — employee deletes their own unverified upload (e.g. wrong file). */
const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const canManageAll = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

  const docResult = await query(`SELECT employee_id, file_path, verified_status FROM employee_documents WHERE id = $1`, [id]);
  if (!docResult.rows.length) throw new ApiError(404, 'Document not found.');
  const doc = docResult.rows[0];

  if (!canManageAll) {
    if (doc.employee_id !== req.user.id) throw new ApiError(403, 'Forbidden.');
    if (doc.verified_status === 'Verified') throw new ApiError(400, 'Cannot delete a verified document. Contact HR.');
  }

  await query(`DELETE FROM employee_documents WHERE id = $1`, [id]);
  const diskPath = path.join(__dirname, '..', '..', 'storage', doc.file_path.replace('/files/', ''));
  if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);

  await logAudit(req.user.id, 'DELETE_DOCUMENT', 'Documents', String(id));
  res.json({ success: true, message: 'Document deleted.' });
});

module.exports = { uploadDocument, myDocuments, listDocuments, verifyDocument, deleteDocument, DOC_TYPES };