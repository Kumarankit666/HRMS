import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../../api/client';

export default function Careers() {
  const [openings, setOpenings] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [lockedPosition, setLockedPosition] = useState(null); // set when "Apply" clicked from a specific job
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', position: '', resumeLink: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get('/jobs')
      .then((res) => setOpenings(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingJobs(false));
  }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function applyFor(title) {
    setLockedPosition(title);
    set('position', title);
    document.getElementById('applyForm').scrollIntoView({ behavior: 'smooth' });
  }

  function unlockPosition() {
    setLockedPosition(null);
    set('position', '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.position) { toast.error('Please select a position to apply for.'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/careers/apply', form);
      toast.success(res.data.message);
      setDone(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="pub-page-header">
        <span className="pub-eyebrow">Careers</span>
        <h1>Join our team</h1>
        <p>We're always looking for passionate educators and professionals.</p>
      </section>

      <section className="pub-section">
        <h2 style={{ marginBottom: 16 }}>Open Positions</h2>
        {loadingJobs ? (
          <p className="text-muted">Loading...</p>
        ) : openings.length === 0 ? (
          <p className="text-muted">No open positions right now — check back soon.</p>
        ) : (
          <div className="pub-job-list">
            {openings.map((o) => (
              <div className="pub-job-row" key={o.id}>
                <div>
                  <h4>{o.title}</h4>
                  <span className="text-muted">{o.job_type} · {o.location || 'N/A'}</span>
                  {o.description && <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 6, marginBottom: 0 }}>{o.description}</p>}
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => applyFor(o.title)}>Apply</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pub-section" id="applyForm">
        <div className="pub-card" style={{ maxWidth: 560, margin: '0 auto' }}>
          <h3>Apply Now</h3>
          {done ? (
            <p className="text-muted mb-0">Thanks for applying! We'll be in touch soon.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field"><label>Full Name</label><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
              <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>

              <div className="field">
                <label>Position</label>
                {lockedPosition ? (
                  <div className="d-flex gap-2" style={{ alignItems: 'center' }}>
                    <input value={lockedPosition} disabled style={{ background: 'var(--bg)' }} />
                    <button type="button" className="btn btn-outline btn-sm" onClick={unlockPosition}>Change</button>
                  </div>
                ) : (
                  <select value={form.position} onChange={(e) => set('position', e.target.value)} required>
                    <option value="">Select a position</option>
                    {openings.map((o) => <option key={o.id} value={o.title}>{o.title}</option>)}
                  </select>
                )}
              </div>

              <div className="field"><label>Resume Link (Google Drive, LinkedIn, etc.)</label><input value={form.resumeLink} onChange={(e) => set('resumeLink', e.target.value)} /></div>
              <div className="field"><label>Message</label><textarea rows={3} value={form.message} onChange={(e) => set('message', e.target.value)} /></div>
              <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? <span className="spinner" /> : 'Submit Application'}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}