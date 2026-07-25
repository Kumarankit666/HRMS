import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'HalfDay', 'WeekOff', 'Holiday', 'Leave'];
const STATUS_COLORS = {
  Present: '#dcfce7', Absent: '#fee2e2', Late: '#fef3c7', HalfDay: '#fef3c7',
  WeekOff: '#e5e7eb', Holiday: '#e0e7ff', Leave: '#fef3c7'
};
const ALL_OPTION = '__ALL__';

function thisMonth() { return new Date().toISOString().slice(0, 7); }

export default function Attendance() {
  const { isAdminOrHr } = useAuth();
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [markForm, setMarkForm] = useState({ date: '', status: 'Present', remarks: '' });
  const [saving, setSaving] = useState(false);

  // Employee-side correction requests
  const [reqForm, setReqForm] = useState({ requestDate: '', requestedStatus: 'Present', inTime: '', outTime: '', reason: '' });
  const [myRequests, setMyRequests] = useState([]);
  const [remaining, setRemaining] = useState(3);
  const [submittingReq, setSubmittingReq] = useState(false);

  useEffect(() => {
    if (isAdminOrHr) {
      api.get('/employees').then((res) => {
        setEmployees(res.data.data);
        setSelectedEmployee(ALL_OPTION);
      });
    } else {
      loadMine();
      loadMyRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrHr]);

  useEffect(() => {
    if (isAdminOrHr && selectedEmployee === ALL_OPTION) loadSummary();
    else if (isAdminOrHr && selectedEmployee) loadFor(selectedEmployee);
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

  async function loadSummary() {
    try {
      const res = await api.get('/attendance/summary', { params: { month } });
      setSummary(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function loadMyRequests() {
    try {
      const res = await api.get('/attendance-requests/me');
      setMyRequests(res.data.data.requests);
      setRemaining(res.data.data.remaining);
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
    if (!selectedEmployee || selectedEmployee === ALL_OPTION) { toast.error('Select a specific employee to mark attendance for.'); return; }
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

  async function handleRequestSubmit(e) {
    e.preventDefault();
    if (!reqForm.requestDate) { toast.error('Pick a date.'); return; }
    setSubmittingReq(true);
    try {
      const res = await api.post('/attendance-requests', reqForm);
      toast.success(res.data.message);
      setReqForm({ requestDate: '', requestedStatus: 'Present', inTime: '', outTime: '', reason: '' });
      loadMyRequests();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmittingReq(false);
    }
  }

  const records = data?.records || [];

  function requestStatusBadge(r) {
    if (r.manager_status === 'Rejected') return <span className="badge badge-rejected">Rejected by Manager</span>;
    if (r.manager_status === 'Pending') return <span className="badge badge-pending">Awaiting Manager</span>;
    if (r.hr_status === 'Pending') return <span className="badge badge-pending">Awaiting HR</span>;
    if (r.hr_status === 'Approved') return <span className="badge badge-active">Approved &amp; Updated</span>;
    if (r.hr_status === 'Rejected') return <span className="badge badge-rejected">Rejected by HR</span>;
    return <span className="badge badge-pending">Pending</span>;
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Attendance</h1><p>{isAdminOrHr ? 'HR marks records manually — no check-in/out button by design.' : 'Read-only — request a correction if something looks wrong.'}</p></div>
      </div>

      <div className="d-flex gap-2" style={{ marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {isAdminOrHr && (
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ maxWidth: 260, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)' }}>
            <option value={ALL_OPTION}>All Employees</option>
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

      {isAdminOrHr && selectedEmployee === ALL_OPTION ? (
        <div className="card">
          <h3>All Employees — {month}</h3>
          {!summary || summary.employees.length === 0 ? <p className="text-muted mb-0">No data.</p> : (
            <div className="table-wrap">
              <table className="hrms-table">
                <thead><tr><th>Employee</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total Marked</th></tr></thead>
                <tbody>
                  {summary.employees.map((e) => (
                    <tr key={e.employee_id}>
                      <td>{e.full_name} <span className="text-muted">({e.employee_code})</span></td>
                      <td>{e.present}</td>
                      <td>{e.absent}</td>
                      <td>{e.leave}</td>
                      <td>{e.total_marked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className={isAdminOrHr ? 'grid-2' : ''}>
          <div className="card" style={{ marginBottom: isAdminOrHr ? 0 : 20 }}>
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
      )}

      {!isAdminOrHr && (
        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <h3>Request Attendance Correction</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: -8 }}>
              You have <strong>{remaining}</strong> of 3 correction requests left this month. Goes to your Manager, then HR for final approval.
            </p>
            <form onSubmit={handleRequestSubmit}>
              <div className="field"><label>Date</label><input type="date" value={reqForm.requestDate} onChange={(e) => setReqForm((f) => ({ ...f, requestDate: e.target.value }))} required /></div>
              <div className="field">
                <label>Correct Status Should Be</label>
                <select value={reqForm.requestedStatus} onChange={(e) => setReqForm((f) => ({ ...f, requestedStatus: e.target.value }))}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="field"><label>In Time (optional)</label><input type="time" value={reqForm.inTime} onChange={(e) => setReqForm((f) => ({ ...f, inTime: e.target.value }))} /></div>
                <div className="field"><label>Out Time (optional)</label><input type="time" value={reqForm.outTime} onChange={(e) => setReqForm((f) => ({ ...f, outTime: e.target.value }))} /></div>
              </div>
              <div className="field"><label>Reason</label><textarea rows={2} value={reqForm.reason} onChange={(e) => setReqForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Why does this need correcting?" /></div>
              <button className="btn btn-primary" disabled={submittingReq || remaining <= 0}>
                {submittingReq ? <span className="spinner" /> : remaining <= 0 ? 'No requests left this month' : 'Submit Request'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>My Correction Requests</h3>
            {myRequests.length === 0 ? <p className="text-muted mb-0">No requests submitted yet.</p> : (
              <div className="table-wrap">
                <table className="hrms-table">
                  <thead><tr><th>Date</th><th>Requested</th><th>In/Out</th><th>Status</th></tr></thead>
                  <tbody>
                    {myRequests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.request_date?.slice(0, 10)}</td>
                        <td>{r.requested_status}</td>
                        <td className="text-muted">{r.in_time || '—'} / {r.out_time || '—'}</td>
                        <td>{requestStatusBadge(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}