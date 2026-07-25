const { query } = require('../config/db');
const { logAudit, sendMail, createNotification } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/** POST /api/contact — public, no auth. Any visitor can submit a query (admission, product, general, etc.). */
const submitQuery = asyncHandler(async (req, res) => {
  const { fullName, email, phone, category, message } = req.body;
  if (!fullName || !email || !message) throw new ApiError(400, 'Name, email, and message are required.');

  await query(
    `INSERT INTO contact_queries (full_name, email, phone, category, message) VALUES ($1,$2,$3,$4,$5)`,
    [fullName, email, phone || null, category || 'General', message]
  );

  const hrEmail = process.env.HR_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (hrEmail) {
    await sendMail({
      to: hrEmail,
      subject: `New Website Query — ${category || 'General'}`,
      text: `New query received:\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nCategory: ${category || 'General'}\n\nMessage:\n${message}\n\n— ${SYSTEM.APP_NAME}`
    });
  }

  await logAudit(null, 'CONTACT_QUERY', 'Contact', `${fullName} <${email}> — ${category || 'General'}`);
  await createNotification({
    recipientRole: 'HR', title: 'New Website Query',
    message: `${fullName} sent a ${category || 'General'} query.`, link: '/app/contact-admin'
  });
  res.status(201).json({ success: true, message: 'Your query has been submitted. We will get back to you soon.' });
});

/** GET /api/contact-admin — HR/Admin: all submitted queries. */
const listQueries = asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM contact_queries ORDER BY created_at DESC`);
  res.json({ success: true, data: result.rows });
});

/** PATCH /api/contact-admin/:id/status — mark New/Responded/Closed. */
const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['New', 'Responded', 'Closed'].includes(status)) throw new ApiError(400, 'Invalid status.');
  await query(`UPDATE contact_queries SET status = $1 WHERE id = $2`, [status, id]);
  res.json({ success: true, message: 'Status updated.' });
});

module.exports = { submitQuery, listQueries, updateStatus };