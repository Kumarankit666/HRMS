import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function ToppersAdmin() {
  const [list, setList] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/toppers-admin');
      setList(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function toggleActive(t) {
    try {
      const formData = new FormData();
      formData.append('active', String(!t.active));
      const res = await api.patch(`/toppers-admin/${t.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      load();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this topper student?')) return;
    try {
      const res = await api.delete(`/toppers-admin/${id}`);
      toast.success(res.data.message);
      load();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Topper Students (Website)</h1><p>Showcase student achievers on the public website.</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Topper</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="hrms-table">
            <thead><tr><th></th><th>Student</th><th>Exam</th><th>Year</th><th>Rank</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={7} className="text-muted">No topper students yet.</td></tr>
              ) : list.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.photo_path ? (
                      <img src={baseUrl + t.photo_path} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : <span className="avatar" style={{ width: 36, height: 36 }}>{t.student_name?.[0]}</span>}
                  </td>
                  <td>{t.student_name}</td>
                  <td>{t.exam_name}</td>
                  <td>{t.exam_year}</td>
                  <td>{t.rank_achieved}</td>
                  <td><span className={`badge ${t.active ? 'badge-active' : 'badge-inactive'}`}>{t.active ? 'Active' : 'Hidden'}</span></td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => setEditing(t)}>Edit</button>
                      <button className="btn btn-sm btn-outline" onClick={() => toggleActive(t)}>{t.active ? 'Hide' : 'Show'}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <TopperModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {editing && <TopperModal existing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function TopperModal({ existing, onClose, onDone }) {
  const [studentName, setStudentName] = useState(existing?.student_name || '');
  const [examName, setExamName] = useState(existing?.exam_name || '');
  const [examYear, setExamYear] = useState(existing?.exam_year || new Date().getFullYear());
  const [rankAchieved, setRankAchieved] = useState(existing?.rank_achieved || '');
  const [currentStatus, setCurrentStatus] = useState(existing?.current_status || '');
  const [displayOrder, setDisplayOrder] = useState(existing?.display_order || 1);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('studentName', studentName);
      formData.append('examName', examName);
      formData.append('examYear', examYear);
      formData.append('rankAchieved', rankAchieved);
      formData.append('currentStatus', currentStatus);
      formData.append('displayOrder', displayOrder);
      if (photo) formData.append('photo', photo);

      const res = existing
        ? await api.patch(`/toppers-admin/${existing.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/toppers-admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      onDone();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal title={existing ? 'Edit Topper Student' : 'Add Topper Student'} onClose={onClose} footer={
      <><button className="btn btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <span className="spinner" /> : 'Save'}</button></>
    }>
      <form onSubmit={handleSubmit}>
        <div className="field"><label>Student Name</label><input value={studentName} onChange={(e) => setStudentName(e.target.value)} required /></div>
        <div className="grid-2">
          <div className="field"><label>Exam Name</label><input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. JEE Mains" required /></div>
          <div className="field"><label>Year</label><input type="number" value={examYear} onChange={(e) => setExamYear(e.target.value)} required /></div>
          <div className="field"><label>Rank Achieved</label><input value={rankAchieved} onChange={(e) => setRankAchieved(e.target.value)} placeholder="e.g. AIR 42" required /></div>
          <div className="field"><label>Display Order</label><input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} /></div>
        </div>
        <div className="field"><label>Current Status</label><input value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value)} placeholder="e.g. Studying at IIT Bombay" /></div>
        <div className="field"><label>Photo (optional, JPG/PNG, max 5MB)</label><input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setPhoto(e.target.files[0])} /></div>
      </form>
    </Modal>
  );
}