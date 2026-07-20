import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DOC_TYPES = ['Aadhaar', 'PAN', 'Passport', 'DrivingLicense', 'Resume', 'Certificate', 'Photo', 'Signature', 'Other'];

export default function Documents() {
  const { isAdminOrHr } = useAuth();
  const [docs, setDocs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [docType, setDocType] = useState('Resume');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee]);

  async function loadMine() {
    try {
      const res = await api.get('/documents/me');
      setDocs(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function loadFor(employeeId) {
    try {
      const res = await api.get('/documents', { params: { employeeId } });
      setDocs(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) { toast.error('Choose a file first.'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      const res = await api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      setFile(null);
      loadMine();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function verify(id, status) {
    try {
      const res = await api.patch(`/documents/${id}/verify`, { status });
      toast.success(res.data.message);
      loadFor(selectedEmployee);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this document?')) return;
    try {
      const res = await api.delete(`/documents/${id}`);
      toast.success(res.data.message);
      isAdminOrHr ? loadFor(selectedEmployee) : loadMine();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Documents</h1><p>{isAdminOrHr ? 'View and verify employee documents.' : 'Upload your identity and other documents.'}</p></div>
      </div>

      {isAdminOrHr && (
        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
          style={{ marginBottom: 20, maxWidth: 300, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)' }}>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
        </select>
      )}

      <div className={!isAdminOrHr ? 'grid-2' : ''}>
        {!isAdminOrHr && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Upload Document</h3>
            <form onSubmit={handleUpload}>
              <div className="field">
                <label>Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>File (PDF, JPG, PNG — max 5MB)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files[0])} required />
              </div>
              <button className="btn btn-primary" disabled={uploading}>{uploading ? <span className="spinner" /> : 'Upload'}</button>
            </form>
          </div>
        )}

        <div className="card">
          <h3>{isAdminOrHr ? 'Employee Documents' : 'My Documents'}</h3>
          {docs.length === 0 ? <p className="text-muted mb-0">No documents uploaded yet.</p> : (
            <div className="table-wrap">
              <table className="hrms-table">
                <thead><tr><th>Type</th><th>File</th><th>Status</th><th>Uploaded</th><th></th></tr></thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td>{d.doc_type}</td>
                      <td><a href={baseUrl + d.file_path} target="_blank" rel="noreferrer">{d.file_name}</a></td>
                      <td><span className={`badge badge-${d.verified_status.toLowerCase()}`}>{d.verified_status}</span></td>
                      <td className="text-muted">{d.uploaded_at?.slice(0, 10)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          {isAdminOrHr && d.verified_status === 'Pending' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => verify(d.id, 'Verified')}>Verify</button>
                              <button className="btn btn-danger btn-sm" onClick={() => verify(d.id, 'Rejected')}>Reject</button>
                            </>
                          )}
                          {(isAdminOrHr || d.verified_status !== 'Verified') && (
                            <button className="btn btn-outline btn-sm" onClick={() => remove(d.id)}>Delete</button>
                          )}
                        </div>
                      </td>
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