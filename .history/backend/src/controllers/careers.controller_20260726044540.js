const { query } = require('../config/db');
const { logAudit, sendMail, createNotification } = require('../utils/helpers');
const { SYSTEM } = require('../config/constants');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/** POST /api/careers/apply — public, no auth. Saves the application and emails HR. */
const applyForJob = asyncHandler(async (req, res) => {
  const { fullName, email, phone, position, message, resumeLink } = req.body;
  if (!fullName || !email || !position) {
    throw new ApiError(400, 'Name, email, and position are required.');
  }

  await query(
    `INSERT INTO job_applications (full_name, email, phone, position, resume_link, message) VALUES ($1,$2,$3,$4,$5,$6)`,
    [fullName, email, phone || null, position, resumeLink || null, message || null]
  );

  const hrEmail = process.env.HR_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (hrEmail) {
    await sendMail({
      to: hrEmail,
      subject: `New Job Application — ${position}`,
      text: `New application received:\n\n` +
        `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nPosition: ${position}\n` +
        `Resume Link: ${resumeLink || 'N/A'}\n\nMessage:\n${message || '(none)'}\n\n— ${SYSTEM.APP_NAME}`
    });
  }

  await logAudit(null, 'JOB_APPLICATION', 'Careers', `${fullName} <${email}> applied for ${position}`);
  await createNotification({
    recipientRole: 'HR', title: 'New Job Application',
    message: `${fullName} applied for ${position}.`, link: '/app/jobs-admin'
  });
  res.status(201).json({ success: true, message: 'Application submitted. We will get back to you soon.' });
});

module.exports = { applyForJob };