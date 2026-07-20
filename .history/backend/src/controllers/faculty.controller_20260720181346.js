const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** GET /api/faculty — public list of active faculty members, for the website. */
const listPublicFaculty = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name, role, subject, photo_path FROM faculty_members
     WHERE active = true ORDER BY display_order, full_name`
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { listPublicFaculty };