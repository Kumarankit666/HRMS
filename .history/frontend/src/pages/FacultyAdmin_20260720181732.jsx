import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function FacultyAdmin() {
  const [list, setList] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/faculty-admin');
      setList(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function toggleActive(f) {
    try {
      const formData = new FormData();
      formData.append('active', String(!f.active));
      const res = await api.patch(`/faculty-admin/${f.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      load();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this faculty member?')) return;
    try {
      const res = await api.delete(`/faculty-admin/${id}`);
      toast.success(res.data.message);
      load();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Faculty (Website)</h1><p>Manage the faculty list shown on the public website, with photos.</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Faculty</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="hrms-table">
            <thead><tr><th></th><th>Name</th><th>Role</th><th>Subject</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="text-muted">No faculty members yet.</td></tr>
              ) : list.map((f) => (
                <tr key={f.id}>
                  <td>
                    {f.photo_path ? (
                      <img src={baseUrl + f.photo_path} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : <span className="avatar" style={{ width: 36, height: 36 }}>{f.full_name?.[0]}</span>}
                  </td>
                  <td>{f.full_name}</td>
                  <td>{f.role || '—'}</td>
                  <td>{f.subject || '—'}</td>
                  <td><span className={`badge ${f.active ? 'badge-active' : 'badge-inactive'}`}>{f.active ? 'Active' : 'Hidden'}</span></td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing(f)}>Edit</button>
                      <button className="btn btn-sm btn-outline" onClick={() => toggleActive(f)}>{f.active ? 'Hide' : 'Show'}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(f.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <FacultyModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {editing && <FacultyModal existing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function FacultyModal({ existing, onClose, onDone }) {
  const [fullName, setFullName] = useState(existing?.full_name || '');
  const [role, setRole] = useState(existing?.role || '');
  const [subject, setSubject] = useState(existing?.subject || '');
  const [displayOrder, setDisplayOrder] = useState(existing?.display_order || 1);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('role', role);
      formData.append('subject', subject);
      formData.append('displayOrder', displayOrder);
      if (photo) formData.append('photo', photo);

      const res = existing
        ? await api.patch(`/faculty-admin/${existing.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/faculty-admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      onDone();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal title={existing ? 'Edit Faculty Member' : 'Add Faculty Member'} onClose={onClose} footer={
      <><button className="btn btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <span className="spinner" /> : 'Save'}</button></>
    }>
      <form onSubmit={handleSubmit}>
        <div className="field"><label>Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
        <div className="field"><label>Role / Title</label><input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Faculty" /></div>
        <div className="field"><label>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" /></div>
        <div className="field"><label>Display Order</label><input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} /></div>
        <div className="field"><label>Photo (JPG/PNG, max 5MB)</label><input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setPhoto(e.target.files[0])} /></div>
      </form>
    </Modal>
  );
}