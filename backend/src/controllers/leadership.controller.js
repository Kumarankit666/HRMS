const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** GET /api/leadership — public list of active leadership members (Chairman, Director, etc.). */
const listPublicLeadership = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name, designation, photo_path, message FROM leadership_members
     WHERE active = true ORDER BY display_order, full_name`
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { listPublicLeadership };