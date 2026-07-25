    const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

/** GET /api/notifications — role-broadcast (HR/SUPER_ADMIN) + personal notifications for this user. */
const listMine = asyncHandler(async (req, res) => {
  const roleMatch = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role) ? ['HR', req.user.role] : [];
  const result = await query(
    `SELECT * FROM notifications
     WHERE recipient_id = $1 OR recipient_role = ANY($2::text[])
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id, roleMatch]
  );
  const unreadRes = await query(
    `SELECT COUNT(*) FROM notifications
     WHERE (recipient_id = $1 OR recipient_role = ANY($2::text[])) AND is_read = false`,
    [req.user.id, roleMatch]
  );
  res.json({ success: true, data: { notifications: result.rows, unread: Number(unreadRes.rows[0].count) } });
});

/** POST /api/notifications/mark-read — marks all of this user's visible notifications as read. */
const markAllRead = asyncHandler(async (req, res) => {
  const roleMatch = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role) ? ['HR', req.user.role] : [];
  await query(
    `UPDATE notifications SET is_read = true
     WHERE (recipient_id = $1 OR recipient_role = ANY($2::text[])) AND is_read = false`,
    [req.user.id, roleMatch]
  );
  res.json({ success: true, message: 'Marked as read.' });
});

module.exports = { listMine, markAllRead };