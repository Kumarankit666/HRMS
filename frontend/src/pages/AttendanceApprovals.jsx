import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AttendanceApprovals() {
  const { user, isAdminOrHr } = useAuth();
  const [managerItems, setManagerItems] = useState([]);
  const [hrItems, setHrItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      if (user?.isManager) {
        const res = await api.get('/attendance-requests/manager-pending');
        setManagerItems(res.data.data);
      }
      if (isAdminOrHr) {
        const res = await api.get('/attendance-requests/hr-pending');
        setHrItems(res.data.data);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function managerDecide(id, decision) {
    let remark = '';
    if (decision === 'Rejected') {
      remark = window.prompt('Reason for rejection:') || '';
      if (!remark.trim()) { toast.error('A remark is required to reject.'); return; }
    }
    try {
      const res = await api.post(`/attendance-requests/${id}/manager-decision`, { decision, remark });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function hrDecide(id, decision) {
    let remark = '';
    if (decision === 'Rejected') {
      remark = window.prompt('Reason for rejection:') || '';
      if (!remark.trim()) { toast.error('A remark is required to reject.'); return; }
    }
    try {
      const res = await api.post(`/attendance-requests/${id}/hr-decision`, { decision, remark });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Attendance Corrections</h1><p>Employee-submitted requests awaiting approval.</p></div>
      </div>

      {loading ? <p className="text-muted">Loading...</p> : (
        <>
          {user?.isManager && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3>My Team — Awaiting My Approval</h3>
              {managerItems.length === 0 ? <p className="text-muted mb-0">Nothing pending.</p> : (
                <div className="table-wrap">
                  <table className="hrms-table">
                    <thead><tr><th>Employee</th><th>Date</th><th>Requested Status</th><th>In/Out</th><th>Reason</th><th></th></tr></thead>
                    <tbody>
                      {managerItems.map((r) => (
                        <tr key={r.id}>
                          <td>{r.full_name} <span className="text-muted">({r.employee_code})</span></td>
                          <td>{r.request_date?.slice(0, 10)}</td>
                          <td>{r.requested_status}</td>
                          <td className="text-muted">{r.in_time || '—'} / {r.out_time || '—'}</td>
                          <td className="text-muted">{r.reason || '—'}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-success btn-sm" onClick={() => managerDecide(r.id, 'Approved')}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => managerDecide(r.id, 'Rejected')}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isAdminOrHr && (
            <div className="card">
              <h3>Manager-Approved — Awaiting HR Final Approval</h3>
              {hrItems.length === 0 ? <p className="text-muted mb-0">Nothing pending.</p> : (
                <div className="table-wrap">
                  <table className="hrms-table">
                    <thead><tr><th>Employee</th><th>Date</th><th>Requested Status</th><th>In/Out</th><th>Manager Remark</th><th></th></tr></thead>
                    <tbody>
                      {hrItems.map((r) => (
                        <tr key={r.id}>
                          <td>{r.full_name} <span className="text-muted">({r.employee_code})</span></td>
                          <td>{r.request_date?.slice(0, 10)}</td>
                          <td>{r.requested_status}</td>
                          <td className="text-muted">{r.in_time || '—'} / {r.out_time || '—'}</td>
                          <td className="text-muted">{r.manager_remark || '—'}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-success btn-sm" onClick={() => hrDecide(r.id, 'Approved')}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => hrDecide(r.id, 'Rejected')}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}