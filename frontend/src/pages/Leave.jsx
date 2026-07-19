import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'LossOfPay'];

export default function Leave() {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ leaveType: 'Casual', fromDate: '', toDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [balRes, histRes] = await Promise.all([api.get('/leave/balance'), api.get('/leave/me')]);
      setBalance(balRes.data.data);
      setHistory(histRes.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/leave', form);
      toast.success(res.data.message);
      setForm({ leaveType: 'Casual', fromDate: '', toDate: '', reason: '' });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="content-header"><div><h1>Leave</h1><p>Apply for leave and track your requests.</p></div></div>

      {balance && (
        <div className="stat-grid">
          <StatBox label="Casual" value={balance.casual_leave} />
          <StatBox label="Sick" value={balance.sick_leave} />
          <StatBox label="Earned" value={balance.earned_leave} />
          <StatBox label="Maternity" value={balance.maternity_leave} />
          <StatBox label="Paternity" value={balance.paternity_leave} />
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>Apply for Leave</h3>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Leave Type</label>
              <select value={form.leaveType} onChange={(e) => set('leaveType', e.target.value)}>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="field"><label>From</label><input type="date" value={form.fromDate} onChange={(e) => set('fromDate', e.target.value)} required /></div>
              <div className="field"><label>To</label><input type="date" value={form.toDate} onChange={(e) => set('toDate', e.target.value)} required /></div>
            </div>
            <div className="field"><label>Reason</label><textarea rows={3} value={form.reason} onChange={(e) => set('reason', e.target.value)} /></div>
            <button className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" /> : 'Submit Request'}</button>
          </form>
        </div>

        <div className="card">
          <h3>My Requests</h3>
          {history.length === 0 ? <p className="text-muted mb-0">No leave requests yet.</p> : (
            <div className="table-wrap">
              <table className="hrms-table">
                <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{h.leave_type}</td>
                      <td>{h.from_date?.slice(0, 10)} → {h.to_date?.slice(0, 10)}</td>
                      <td>{h.days}</td>
                      <td><span className={`badge badge-${h.status.toLowerCase()}`}>{h.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value ?? 0}</div>
    </div>
  );
}
