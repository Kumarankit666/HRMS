import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';

export default function PoliciesAdmin() {
  const [policies, setPolicies] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [statusFor, setStatusFor] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/policies-admin');
      setPolicies(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function toggleActive(p) {
    try {
      const res = await api.patch(`/policies-admin/${p.id}/status`, { active: !p.active });
      toast.success(res.data.message);
      load();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Policy Documents</h1><p>Uploaded here are auto-assigned to every employee when their offer letter is generated.</p></div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Upload Policy</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="hrms-table">
            <thead><tr><th>Name</th><th>Status</th><th>Uploaded</th><th></th></tr></thead>
            <tbody>
              {policies.length === 0 ? (
                <tr><td colSpan={4} className="text-muted">No policy documents yet.</td></tr>
              ) : policies.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><span className={`badge ${p.active ? 'badge-active' : 'badge-inactive'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-muted">{p.created_at?.slice(0, 10)}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => setStatusFor(p)}>Signing Status</button>
                      <button className={`btn btn-sm ${p.active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(p)}>
                        {p.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
      {statusFor && <StatusModal policy={statusFor} onClose={() => setStatusFor(null)} />}
    </div>
  );
}

function UploadModal({ onClose, onDone }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { toast.error('Choose a PDF file.'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      const res = await api.post('/policies-admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      onDone();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal title="Upload Policy Document" onClose={onClose} footer={
      <><button className="btn btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <span className="spinner" /> : 'Upload'}</button></>
    }>
      <form onSubmit={handleSubmit}>
        <div className="field"><label>Document Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Code of Conduct" required /></div>
        <div className="field"><label>PDF File (max 10MB)</label><input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} required /></div>
      </form>
    </Modal>
  );
}

function StatusModal({ policy, onClose }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(`/policies-admin/${policy.id}/status`).then((res) => setRows(res.data.data)).catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  return (
    <Modal title={`Signing Status — ${policy.name}`} onClose={onClose}>
      {rows.length === 0 ? <p className="text-muted mb-0">Not assigned to anyone yet.</p> : (
        <table className="hrms-table">
          <thead><tr><th>Employee</th><th>Status</th><th>Signed As</th><th>Date</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.full_name} <span className="text-muted">({r.employee_code})</span></td>
                <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                <td>{r.signature_name || '—'}</td>
                <td className="text-muted">{r.signed_at ? r.signed_at.slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}