import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function LeaveApprovals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/leave/pending');
      setItems(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function decide(id, decision) {
    try {
      const res = await api.post(`/leave/${id}/decision`, { decision });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="content-header"><div><h1>Leave Approvals</h1><p>Pending requests you can act on.</p></div></div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : items.length === 0 ? (
        <div className="card empty-state"><div className="icon">✅</div><p className="mb-0">No pending requests.</p></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="hrms-table">
              <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.full_name} <span className="text-muted">({r.employee_code})</span></td>
                    <td>{r.leave_type}</td>
                    <td>{r.from_date?.slice(0, 10)} → {r.to_date?.slice(0, 10)}</td>
                    <td>{r.days}</td>
                    <td className="text-muted">{r.reason || '—'}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => decide(r.id, 'Approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => decide(r.id, 'Rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
