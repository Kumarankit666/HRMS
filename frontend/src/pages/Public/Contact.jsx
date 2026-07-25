import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../../api/client';

const CATEGORIES = ['Admission', 'Product', 'Service', 'General', 'Other'];

export default function Contact() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', category: 'General', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/contact', form);
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
        <span className="pub-eyebrow">Contact Us</span>
        <h1>Have a question?</h1>
        <p>Admissions, products, services, or anything else — we're happy to help.</p>
      </section>

      <section className="pub-section">
        <div className="pub-card" style={{ maxWidth: 560, margin: '0 auto' }}>
          {done ? (
            <p className="text-muted mb-0" style={{ textAlign: 'center' }}>Thanks! We've received your query and will get back to you soon.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field"><label>Full Name</label><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
              <div className="field"><label>Phone (optional)</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              <div className="field">
                <label>What is this about?</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Message</label><textarea rows={4} value={form.message} onChange={(e) => set('message', e.target.value)} required /></div>
              <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? <span className="spinner" /> : 'Send Query'}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}