import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function OfferLetters() {
  const [items, setItems] = useState([]);
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

  useEffect(() => {
    api.get('/offer-letters').then((res) => setItems(res.data.data)).catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  return (
    <div>
      <div className="content-header"><div><h1>Offer Letters</h1><p>All generated offer letters.</p></div></div>
      <div className="card">
        {items.length === 0 ? <p className="text-muted mb-0">No offer letters generated yet.</p> : (
          <div className="table-wrap">
            <table className="hrms-table">
              <thead><tr><th>Employee</th><th>Designation</th><th>Salary</th><th>Joining Date</th><th>Generated</th><th></th></tr></thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td>{o.full_name} <span className="text-muted">({o.employee_code})</span></td>
                    <td>{o.designation}</td>
                    <td>{o.salary}</td>
                    <td>{o.joining_date?.slice(0, 10)}</td>
                    <td className="text-muted">{o.generated_at?.slice(0, 10)}</td>
                    <td><a className="btn btn-outline btn-sm" href={baseUrl + o.file_path} target="_blank" rel="noreferrer">View PDF</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
