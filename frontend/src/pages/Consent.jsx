import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function Consent() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState(null);
  const [step, setStep] = useState('view');
  const [signatureName, setSignatureName] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/consent/pending');
      setPending(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setLoading(false); }
  }

  function startSigning(doc) {
    setActiveDoc(doc);
    setStep('view');
    setSignatureName('');
    setOtp('');
  }

  async function sendOtp() {
    if (!signatureName.trim()) { toast.error('Please type your full name.'); return; }
    setBusy(true);
    try {
      const res = await api.post(`/consent/${activeDoc.policy_id}/request-otp`, { signatureName });
      toast.success(res.data.message);
      setStep('otp');
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setBusy(false); }
  }

  async function verifyOtp() {
    if (!otp.trim()) { toast.error('Enter the OTP.'); return; }
    setBusy(true);
    try {
      const res = await api.post(`/consent/${activeDoc.policy_id}/verify`, { otp });
      toast.success(res.data.message);
      if (res.data.data?.offerAccepted) toast.success('🎉 Your offer letter is now accepted!');
      setActiveDoc(null);
      load();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setBusy(false); }
  }

  const pendingCount = pending.filter((p) => p.status !== 'Signed').length;

  return (
    <div>
      <div className="content-header">
        <div><h1>Consent & Policies</h1><p>Read, sign, and OTP-verify each document to accept your offer.</p></div>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : pending.length === 0 ? (
        <div className="card empty-state"><div className="icon">📄</div><p className="mb-0">No documents assigned yet.</p></div>
      ) : (
        <>
          {pendingCount > 0 && (
            <div className="card" style={{ background: '#fef3c7', border: '1px solid #fde68a', marginBottom: 16 }}>
              <strong>{pendingCount} document(s) awaiting your signature.</strong>
            </div>
          )}
          <div className="card">
            <div className="table-wrap">
              <table className="hrms-table">
                <thead><tr><th>Document</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.policy_id}>
                      <td>{p.name}</td>
                      <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                      <td>
                        {p.status === 'Signed' ? (
                          <a className="btn btn-outline btn-sm" href={baseUrl + p.file_path} target="_blank" rel="noreferrer">View</a>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => startSigning(p)}>Read & Sign</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeDoc && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActiveDoc(null); }}>
          <div className="modal-box" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3>{activeDoc.name}</h3>
              <button className="modal-close" onClick={() => setActiveDoc(null)}>✕</button>
            </div>
            <div className="modal-body">
              {step === 'view' && (
                <>
                  <iframe src={baseUrl + activeDoc.file_path} title={activeDoc.name} style={{ width: '100%', height: 420, border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }} />
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Please read the full document above before signing.</p>
                  <button className="btn btn-primary btn-block" onClick={() => setStep('signature')}>I've Read It — Proceed to Sign</button>
                </>
              )}

              {step === 'signature' && (
                <>
                  <div className="field">
                    <label>Type your full legal name as your signature</label>
                    <input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Your Full Name" autoFocus />
                  </div>
                  <label className="checkbox-row" style={{ marginBottom: 16 }}>
                    <input type="checkbox" required /> <span>I confirm I have read and agree to this document.</span>
                  </label>
                  <button className="btn btn-primary btn-block" disabled={busy} onClick={sendOtp}>
                    {busy ? <span className="spinner" /> : 'Send OTP to Sign'}
                  </button>
                </>
              )}

              {step === 'otp' && (
                <>
                  <p className="text-muted">Enter the 6-digit OTP sent to your registered email to confirm your signature.</p>
                  <div className="field">
                    <label>OTP</label>
                    <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} autoFocus />
                  </div>
                  <button className="btn btn-primary btn-block" disabled={busy} onClick={verifyOtp}>
                    {busy ? <span className="spinner" /> : 'Verify & Sign'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}