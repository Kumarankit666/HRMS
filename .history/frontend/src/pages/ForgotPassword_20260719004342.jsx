import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [employeeCode, setEmployeeCode] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { employeeCode: employeeCode.trim() });
      toast.success(res.data.message);
      setStep('reset');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { employeeCode: employeeCode.trim(), otp, newPassword });
      toast.success(res.data.message);
      navigate('/login');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-mark">🏢 HRMS Enterprise</div>
        <h1>Reset your password securely.</h1>
        <p>We'll email a one-time code to your registered address to confirm it's really you.</p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          {step === 'request' ? (
            <>
              <h2>Reset password</h2>
              <p className="subtitle">Enter your Employee ID to receive a reset code.</p>
              <form onSubmit={handleRequest}>
                <div className="field">
                  <label htmlFor="ec">Employee ID</label>
                  <input id="ec" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="EMP000001" required autoFocus />
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Send Reset Code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Set new password</h2>
              <p className="subtitle">Enter the code we emailed you and your new password.</p>
              <form onSubmit={handleReset}>
                <div className="field">
                  <label htmlFor="otp">6-digit code</label>
                  <input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required autoFocus />
                </div>
                <div className="field">
                  <label htmlFor="np">New password (min 8 chars)</label>
                  <input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Update Password'}
                </button>
              </form>
            </>
          )}

          <p className="auth-footer-note">
            <Link to="/login" className="auth-link">← Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
