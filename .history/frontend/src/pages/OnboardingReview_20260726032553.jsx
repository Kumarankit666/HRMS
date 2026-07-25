import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';

export default function OnboardingReview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

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
      note = window.prompt(decision === 'Rejected' ? 'Reason for rejection (required):' : 'What needs to change (required):') || '';
      if (!note.trim()) { toast.error('A remark is required for this action.'); return; }
    }
    try {
      const res = await api.post(`/onboarding/${employeeId}/review`, { decision, note });
      toast.success(res.data.message);
      setViewing(null);
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
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline btn-sm" onClick={() => setViewing(r)}>View Full Details</button>
                <button className="btn btn-success btn-sm" onClick={() => act(r.employee_id, 'Approved')}>Approve</button>
                <button className="btn btn-outline btn-sm" onClick={() => act(r.employee_id, 'ChangesRequested', true)}>Request Changes</button>
                <button className="btn btn-danger btn-sm" onClick={() => act(r.employee_id, 'Rejected', true)}>Reject</button>
              </div>
            </div>
          );
        })
      )}

      {viewing && (
        <DetailModal record={viewing} onClose={() => setViewing(null)} onDone={() => { setViewing(null); load(); }} />
      )}
    </div>
  );
}

const FIELD_LABELS = {
  fatherName: "Father's Name", motherName: "Mother's Name", gender: 'Gender', dob: 'Date of Birth',
  bloodGroup: 'Blood Group', maritalStatus: 'Marital Status', emergencyContact: 'Emergency Contact',
  currentAddress: 'Current Address', permanentAddress: 'Permanent Address', aadhaar: 'Aadhaar Number',
  pan: 'PAN Number', bankAccountNumber: 'Bank Account Number', ifsc: 'IFSC Code', bankName: 'Bank Name',
  education: 'Highest Education', experience: 'Prior Experience', skills: 'Key Skills'
};

function DetailModal({ record, onClose, onDone }) {
  const d = record.submitted_data || {};
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function decide(decision) {
    if ((decision === 'Rejected' || decision === 'ChangesRequested') && !note.trim()) {
      toast.error('Please add a remark explaining why.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/onboarding/${record.employee_id}/review`, { decision, note });
      toast.success(res.data.message);
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Full Onboarding Details — ${record.full_name}`} onClose={onClose}>
      <div style={{ fontSize: '0.88rem', lineHeight: 1.8 }}>
        {Object.keys(FIELD_LABELS).map((key) => (
          <div key={key} className="flex-between" style={{ borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
            <strong>{FIELD_LABELS[key]}</strong>
            <span style={{ textAlign: 'right', maxWidth: '60%' }}>{d[key] || '—'}</span>
          </div>
        ))}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Remark (required for Reject / Request Changes)</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type a remark..." />
      </div>

      <div className="d-flex gap-2" style={{ marginTop: 12 }}>
        <button className="btn btn-success btn-sm" disabled={busy} onClick={() => decide('Approved')}>Approve</button>
        <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => decide('ChangesRequested')}>Request Changes</button>
        <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => decide('Rejected')}>Reject</button>
      </div>
    </Modal>
  );
}