import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { id: 'fatherName', label: "Father's Name", required: true },
  { id: 'motherName', label: "Mother's Name", required: true },
  { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
  { id: 'dob', label: 'Date of Birth', type: 'date', required: true },
  { id: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], required: true },
  { id: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married'], required: true },
  { id: 'emergencyContact', label: 'Emergency Contact Number', required: true },
  { id: 'currentAddress', label: 'Current Address', type: 'textarea', required: true },
  { id: 'permanentAddress', label: 'Permanent Address', type: 'textarea', required: true },
  { id: 'aadhaar', label: 'Aadhaar Number' },
  { id: 'pan', label: 'PAN Number' },
  { id: 'bankAccountNumber', label: 'Bank Account Number', required: true },
  { id: 'ifsc', label: 'IFSC Code', required: true },
  { id: 'bankName', label: 'Bank Name' },
  { id: 'education', label: 'Highest Education' },
  { id: 'experience', label: 'Total Prior Experience', placeholder: 'e.g. 3 years' },
  { id: 'skills', label: 'Key Skills', placeholder: 'Comma separated' }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setUser, logout } = useAuth();
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({});
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try {
      const res = await api.get('/onboarding/me');
      const d = res.data.data;
      if (!d.required) { navigate('/app'); return; }
      setStatus(d.status);
      if (d.data) { setForm(d.data); setAccept(!!d.data.acceptPolicy); }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function updateField(id, value) {
    setForm((f) => ({ ...f, [id]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!accept) { toast.error('You must accept the company policy.'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/onboarding/submit', { ...form, acceptPolicy: accept });
      toast.success(res.data.message);
      setStatus('Submitted');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() { logout(); navigate('/login'); }

  if (loading) return <CenteredCard><span className="spinner spinner-dark" /></CenteredCard>;

  if (status === 'Submitted') {
    return (
      <CenteredCard>
        <div style={{ fontSize: '2.4rem' }}>⏳</div>
        <h2>Submitted — Awaiting HR Review</h2>
        <p className="text-muted">Your onboarding details are with HR. You'll get full access once approved.</p>
        <button className="btn btn-outline mt-3" onClick={handleLogout}>Logout</button>
      </CenteredCard>
    );
  }

  if (status === 'Rejected') {
    return (
      <CenteredCard>
        <div style={{ fontSize: '2.4rem' }}>❌</div>
        <h2>Submission Not Approved</h2>
        <p className="text-muted">Please contact HR for next steps.</p>
        <button className="btn btn-outline mt-3" onClick={handleLogout}>Logout</button>
      </CenteredCard>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div className="auth-brand-mark">🏢 HRMS Enterprise</div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout}>🚪 Logout</button>
      </div>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Complete Your Onboarding</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Please fill in your details below. HR will review and approve before your offer letter is generated.
      </p>

      {status === 'ChangesRequested' && (
        <div className="card" style={{ background: '#fef3c7', border: '1px solid #fde68a', marginBottom: 20 }}>
          <strong>HR requested changes.</strong> Please review and re-submit.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Your Details</h3>
          <div className="grid-2">
            {FIELDS.map((f) => (
              <div className="field" key={f.id} style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
                <label htmlFor={f.id}>{f.label}{f.required && ' *'}</label>
                {f.type === 'select' ? (
                  <select id={f.id} value={form[f.id] || ''} onChange={(e) => updateField(f.id, e.target.value)} required={f.required}>
                    <option value="">Select</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea id={f.id} rows={2} value={form[f.id] || ''} onChange={(e) => updateField(f.id, e.target.value)} required={f.required} />
                ) : (
                  <input
                    id={f.id} type={f.type || 'text'} value={form[f.id] || ''}
                    placeholder={f.placeholder} onChange={(e) => updateField(f.id, e.target.value)} required={f.required}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <label className="checkbox-row mt-3" style={{ marginBottom: 20 }}>
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>I confirm the above details are accurate and I accept the company policy.</span>
        </label>

        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          {submitting ? <span className="spinner" /> : 'Submit for HR Review'}
        </button>
      </form>
    </div>
  );
}

function CenteredCard({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: 440, textAlign: 'center', padding: '44px 36px' }}>{children}</div>
    </div>
  );
}
