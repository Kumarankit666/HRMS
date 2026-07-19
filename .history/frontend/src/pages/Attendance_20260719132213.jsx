import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'HalfDay', 'WeekOff', 'Holiday', 'Leave'];
const STATUS_COLORS = {
  Present: '#dcfce7', Absent: '#fee2e2', Late: '#fef3c7', HalfDay: '#fef3c7',
  WeekOff: '#e5e7eb', Holiday: '#e0e7ff', Leave: '#fef3c7'
};

function thisMonth() { return new Date().toISOString().slice(0, 7); }

export default function Attendance() {
  const { isAdminOrHr } = useAuth();
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [markForm, setMarkForm] = useState({ date: '', status: 'Present', remarks: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdminOrHr) {
      api.get('/employees').then((res) => {
        setEmployees(res.data.data);
        if (res.data.data.length) setSelectedEmployee(res.data.data[0].id);
      });
    } else {
      loadMine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrHr]);

  useEffect(() => {
    if (isAdminOrHr && selectedEmployee) loadFor(selectedEmployee);
    else if (!isAdminOrHr) loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedEmployee]);

  async function loadMine() {
    try {
      const res = await api.get('/attendance/me', { params: { month } });
      setData(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function loadFor(employeeId) {
    try {
      const res = await api.get('/attendance', { params: { employeeId, month } });
      setData(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleMark(e) {
    e.preventDefault();
    if (!markForm.date) { toast.error('Pick a date.'); return; }
    setSaving(true);
    try {
      const res = await api.post('/attendance', { employeeId: selectedEmployee, ...markForm });
      toast.success(res.data.message);
      setMarkForm({ date: '', status: 'Present', remarks: '' });
      loadFor(selectedEmployee);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const records = data?.records || [];

  return (
    <div>
      <div className="content-header">
        <div><h1>Attendance</h1><p>{isAdminOrHr ? 'HR marks records manually — no check-in/out button by design.' : 'Read-only — HR updates this for you.'}</p></div>
      </div>

      <div className="d-flex gap-2" style={{ marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {isAdminOrHr && (
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ maxWidth: 260, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)' }}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
          </select>
        )}
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)' }} />
      </div>

      {!isAdminOrHr && data && (
        <div className="stat-grid">
          <div className="stat-card"><div className="label">Present</div><div className="value">{data.present}</div></div>
          <div className="stat-card"><div className="label">Days Marked</div><div className="value">{data.totalMarked}</div></div>
          <div className="stat-card"><div className="label">Attendance %</div><div className="value">{data.percentage}%</div></div>
        </div>
      )}

      <div className={isAdminOrHr ? 'grid-2' : ''}>
        <div className="card">
          <h3>Records — {month}</h3>
          {records.length === 0 ? <p className="text-muted mb-0">No attendance marked for this month yet.</p> : (
            <div className="table-wrap">
              <table className="hrms-table">
                <thead><tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th>Remarks</th></tr></thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.date}>
                      <td>{r.date?.slice(0, 10)}</td>
                      <td><span className="badge" style={{ background: STATUS_COLORS[r.status] || '#eee' }}>{r.status}</span></td>
                      <td>{r.in_time || '—'}</td>
                      <td>{r.out_time || '—'}</td>
                      <td className="text-muted">{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isAdminOrHr && (
          <div className="card">
            <h3>Mark Attendance</h3>
            <form onSubmit={handleMark}>
              <div className="field"><label>Date</label><input type="date" value={markForm.date} onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))} required /></div>
              <div className="field">
                <label>Status</label>
                <select value={markForm.status} onChange={(e) => setMarkForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field"><label>Remarks</label><input value={markForm.remarks} onChange={(e) => setMarkForm((f) => ({ ...f, remarks: e.target.value }))} /></div>
              <button className="btn btn-primary" disabled={saving || !selectedEmployee}>{saving ? <span className="spinner" /> : 'Save'}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}