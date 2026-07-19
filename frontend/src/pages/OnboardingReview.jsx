import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function OnboardingReview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/onboarding/pending');
      setItems(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function act(employeeId, decision, needsNote) {
    let note = '';
    if (needsNote) {
      note = window.prompt(decision === 'Rejected' ? 'Reason for rejection:' : 'What needs to change?') || '';
      if (note === null) return;
    }
    try {
      const res = await api.post(`/onboarding/${employeeId}/review`, { decision, note });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Onboarding Review</h1><p>Approve before an offer letter can be generated.</p></div>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : items.length === 0 ? (
        <div className="card empty-state"><div className="icon">📭</div><p className="mb-0">No submissions waiting for review.</p></div>
      ) : (
        items.map((r) => {
          const d = r.submitted_data || {};
          return (
            <div className="card" key={r.employee_id} style={{ marginBottom: 16 }}>
              <div className="flex-between" style={{ marginBottom: 10 }}>
                <div>
                  <strong>{r.full_name}</strong> <span className="text-muted">({r.employee_code})</span>
                  <div className="text-muted" style={{ fontSize: '0.82rem' }}>{r.department || '—'} · {r.designation || '—'}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', marginBottom: 14, lineHeight: 1.7 }}>
                <div><strong>DOB:</strong> {d.dob || '—'} &nbsp; <strong>Gender:</strong> {d.gender || '—'} &nbsp; <strong>Blood Group:</strong> {d.bloodGroup || '—'}</div>
                <div><strong>Emergency Contact:</strong> {d.emergencyContact || '—'}</div>
                <div><strong>Current Address:</strong> {d.currentAddress || '—'}</div>
                <div><strong>Bank:</strong> {d.bankName || '—'} · {d.bankAccountNumber || '—'} · {d.ifsc || '—'}</div>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-success btn-sm" onClick={() => act(r.employee_id, 'Approved')}>Approve</button>
                <button className="btn btn-outline btn-sm" onClick={() => act(r.employee_id, 'ChangesRequested', true)}>Request Changes</button>
                <button className="btn btn-danger btn-sm" onClick={() => act(r.employee_id, 'Rejected', true)}>Reject</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
