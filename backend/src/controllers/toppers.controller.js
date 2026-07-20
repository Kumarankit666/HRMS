const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** GET /api/toppers — public list of active topper students, for the website. */
const listPublicToppers = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, student_name, exam_name, exam_year, rank_achieved, marks_obtained, current_status, photo_path
     FROM topper_students WHERE active = true ORDER BY display_order, exam_year DESC`
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { listPublicToppers };