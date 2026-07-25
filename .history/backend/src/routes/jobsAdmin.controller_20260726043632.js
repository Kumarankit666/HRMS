const { query } = require('../config/db');
const { logAudit } = require('../utils/helpers');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/** GET /api/jobs-admin — full list (including inactive). */
const listAll = asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM job_postings ORDER BY display_order, created_at DESC`);
  res.json({ success: true, data: result.rows });
});

/** POST /api/jobs-admin — add a job posting. */
const addJob = asyncHandler(async (req, res) => {
  const { title, jobType, location, description, displayOrder } = req.body;
  if (!title) throw new ApiError(400, 'Job title is required.');

  const result = await query(
    `INSERT INTO job_postings (title, job_type, location, description, display_order, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [title, jobType || 'Full-Time', location || null, description || null, displayOrder || 1, req.user.id]
  );
  await logAudit(req.user.id, 'ADD_JOB_POSTING', 'Careers', title);
  res.status(201).json({ success: true, message: 'Job posting added.', data: { id: result.rows[0].id } });
});

/** PATCH /api/jobs-admin/:id — update or toggle active. */
const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, jobType, location, description, displayOrder, active } = req.body;

  const sets = [];
  const values = [];
  let i = 1;
  if (title !== undefined) { sets.push(`title = $${i++}`); values.push(title); }
  if (jobType !== undefined) { sets.push(`job_type = $${i++}`); values.push(jobType); }
  if (location !== undefined) { sets.push(`location = $${i++}`); values.push(location); }
  if (description !== undefined) { sets.push(`description = $${i++}`); values.push(description); }
  if (displayOrder !== undefined) { sets.push(`display_order = $${i++}`); values.push(displayOrder === '' ? 1 : displayOrder); }
  if (active !== undefined) { sets.push(`active = $${i++}`); values.push(active === true || active === 'true'); }

  if (!sets.length) throw new ApiError(400, 'No fields to update.');
  values.push(id);

  await query(`UPDATE job_postings SET ${sets.join(', ')} WHERE id = $${i}`, values);
  await logAudit(req.user.id, 'UPDATE_JOB_POSTING', 'Careers', String(id));
  res.json({ success: true, message: 'Job posting updated.' });
});

/** DELETE /api/jobs-admin/:id */
const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query(`DELETE FROM job_postings WHERE id = $1`, [id]);
  await logAudit(req.user.id, 'DELETE_JOB_POSTING', 'Careers', String(id));
  res.json({ success: true, message: 'Job posting deleted.' });
});

/** GET /api/jobs-admin/applications — job applications received via the public Careers form. */
const listApplications = asyncHandler(async (req, res) => {
  const result = await query(`SELECT * FROM job_applications ORDER BY created_at DESC`);
  res.json({ success: true, data: result.rows });
});

module.exports = { listAll, addJob, updateJob, deleteJob, listApplications };