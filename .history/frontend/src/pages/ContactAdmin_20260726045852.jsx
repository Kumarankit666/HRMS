import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function ContactAdmin() {
  const [queries, setQueries] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/contact/admin/list');
      setQueries(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function setStatus(id, status) {
    try {
      const res = await api.patch(`/contact/admin/${id}/status`, { status });
      toast.success(res.data.message);
      load();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Website Queries</h1><p>Admission, product, and service queries from the public website.</p></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="hrms-table">
            <thead><tr><th>Name</th><th>Email</th><th>Category</th><th>Message</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {queries.length === 0 ? (
                <tr><td colSpan={6} className="text-muted">No queries yet.</td></tr>
              ) : queries.map((q) => (
                <tr key={q.id}>
                  <td>{q.full_name}<br /><span className="text-muted" style={{ fontSize: '0.78rem' }}>{q.phone}</span></td>
                  <td>{q.email}</td>
                  <td>{q.category}</td>
                  <td style={{ maxWidth: 280 }}>{q.message}</td>
                  <td><span className={`badge ${q.status === 'New' ? 'badge-pending' : q.status === 'Closed' ? 'badge-inactive' : 'badge-active'}`}>{q.status}</span></td>
                  <td>
                    <select value={q.status} onChange={(e) => setStatus(q.id, e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <option value="New">New</option>
                      <option value="Responded">Responded</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}