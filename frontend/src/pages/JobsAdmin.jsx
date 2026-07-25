import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';

export default function JobsAdmin() {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadJobs(); loadApplications(); }, []);

  async function loadJobs() {
    try {
      const res = await api.get('/jobs-admin');
      setJobs(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function loadApplications() {
    try {
      const res = await api.get('/jobs-admin/applications');
      setApplications(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function toggleActive(job) {
    try {
      const res = await api.patch(`/jobs-admin/${job.id}`, { active: !job.active });
      toast.success(res.data.message);
      loadJobs();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this job posting?')) return;
    try {
      const res = await api.delete(`/jobs-admin/${id}`);
      toast.success(res.data.message);
      loadJobs();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Careers — Job Postings</h1><p>Manage open positions and view applications.</p></div>
        {tab === 'jobs' && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Job</button>}
      </div>

      <div className="d-flex gap-2" style={{ marginBottom: 20 }}>
        <button className={`btn btn-sm ${tab === 'jobs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('jobs')}>Job Postings</button>
        <button className={`btn btn-sm ${tab === 'applications' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('applications')}>Applications ({applications.length})</button>
      </div>

      {tab === 'jobs' && (
        <div className="card">
          <div className="table-wrap">
            <table className="hrms-table">
              <thead><tr><th>Title</th><th>Type</th><th>Location</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr><td colSpan={5} className="text-muted">No job postings yet.</td></tr>
                ) : jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.title}</td>
                    <td>{j.job_type}</td>
                    <td>{j.location || '—'}</td>
                    <td><span className={`badge ${j.active ? 'badge-active' : 'badge-inactive'}`}>{j.active ? 'Active' : 'Hidden'}</span></td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing(j)}>Edit</button>
                        <button className="btn btn-sm btn-outline" onClick={() => toggleActive(j)}>{j.active ? 'Hide' : 'Show'}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(j.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div className="card">
          <div className="table-wrap">
            <table className="hrms-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Position</th><th>Resume</th><th>Date</th></tr></thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr><td colSpan={6} className="text-muted">No applications yet.</td></tr>
                ) : applications.map((a) => (
                  <tr key={a.id}>
                    <td>{a.full_name}</td>
                    <td>{a.email}</td>
                    <td>{a.phone || '—'}</td>
                    <td>{a.position}</td>
                    <td>{a.resume_link ? <a href={a.resume_link} target="_blank" rel="noreferrer">Link</a> : '—'}</td>
                    <td className="text-muted">{a.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <JobModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); loadJobs(); }} />}
      {editing && <JobModal existing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); loadJobs(); }} />}
    </div>
  );
}

function JobModal({ existing, onClose, onDone }) {
  const [title, setTitle] = useState(existing?.title || '');
  const [jobType, setJobType] = useState(existing?.job_type || 'Full-Time');
  const [location, setLocation] = useState(existing?.location || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [displayOrder, setDisplayOrder] = useState(existing?.display_order || 1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { title, jobType, location, description, displayOrder };
      const res = existing
        ? await api.patch(`/jobs-admin/${existing.id}`, payload)
        : await api.post('/jobs-admin', payload);
      toast.success(res.data.message);
      onDone();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal title={existing ? 'Edit Job Posting' : 'Add Job Posting'} onClose={onClose} footer={
      <><button className="btn btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <span className="spinner" /> : 'Save'}</button></>
    }>
      <form onSubmit={handleSubmit}>
        <div className="field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="grid-2">
          <div className="field">
            <label>Type</label>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option>Full-Time</option><option>Part-Time</option><option>Contract</option><option>Remote</option>
            </select>
          </div>
          <div className="field"><label>Location</label><input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        </div>
        <div className="field"><label>Description</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="field"><label>Display Order</label><input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} /></div>
      </form>
    </Modal>
  );
}