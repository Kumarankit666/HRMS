import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../../api/client';

const OPENINGS = [
  { title: 'Subject Faculty — Mathematics', type: 'Full-Time', location: 'Head Office' },
  { title: 'Career Counselor', type: 'Full-Time', location: 'Head Office' },
  { title: 'Content Developer', type: 'Full-Time / Remote', location: 'Remote' },
  { title: 'Front Desk Executive', type: 'Full-Time', location: 'Head Office' }
];

export default function Careers() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', position: OPENINGS[0].title, resumeLink: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
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
        <div className="pub-job-list">
          {OPENINGS.map((o) => (
            <div className="pub-job-row" key={o.title}>
              <div>
                <h4>{o.title}</h4>
                <span className="text-muted">{o.type} · {o.location}</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => { set('position', o.title); document.getElementById('applyForm').scrollIntoView({ behavior: 'smooth' }); }}>
                Apply
              </button>
            </div>
          ))}
        </div>
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
                <select value={form.position} onChange={(e) => set('position', e.target.value)}>
                  {OPENINGS.map((o) => <option key={o.title} value={o.title}>{o.title}</option>)}
                </select>
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