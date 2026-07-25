const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** GET /api/jobs — public list of active job postings. */
const listPublicJobs = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, title, job_type, location, description FROM job_postings
     WHERE active = true ORDER BY display_order, created_at DESC`
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { listPublicJobs };