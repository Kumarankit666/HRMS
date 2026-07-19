import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(employeeCode.trim(), password);
      toast.success(`Welcome, ${data.fullName}`);
      if (data.onboardingRequired) navigate('/onboarding');
      else navigate('/app');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-mark">🏢 MSMG Education Solution</div>
        <h1>People management, simplified.</h1>
        <p>One workspace for onboarding, leave, payroll, documents, and performance — built for every role.</p>
        <ul className="auth-points">
          <li>🔒 Role-based access &amp; audit trails</li>
          <li>✅ Simple, secure login</li>
          <li>📈 Live dashboards &amp; reports</li>
        </ul>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in with your Employee ID</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="employeeCode">Employee ID</label>
              <input id="employeeCode" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="EMP000001" required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-wrap">
                <input
                  id="password" type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Password" required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex-between" style={{ marginBottom: 18 }}>
              <span />
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer-note">🔒 Passwords are hashed and never stored in plain text.</p>
        </div>
      </div>
    </div>
  );
}