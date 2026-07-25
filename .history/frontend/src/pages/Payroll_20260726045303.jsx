import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const now = new Date();

export default function Payroll() {
  const { user, isAdminOrHr } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [structure, setStructure] = useState(null);
  const [form, setForm] = useState({
    ctc: '', basic: '', hra: '', specialAllowance: '', pf: '', esic: '',
    professionalTax: '', bonus: '', incentive: '', otherAllowances: ''
  });
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1);
  const [payYear, setPayYear] = useState(now.getFullYear());
  const [incentive, setIncentive] = useState('');
  const [arrear, setArrear] = useState('');
  const [travellingAllowance, setTravellingAllowance] = useState('');
  const [loanAdvance, setLoanAdvance] = useState('');
  const [lopDays, setLopDays] = useState('');
  const [tds, setTds] = useState('');
  const [payslips, setPayslips] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

  useEffect(() => {
    if (isAdminOrHr) {
      api.get('/employees').then((res) => {
        setEmployees(res.data.data);
        setSelectedEmployee('__ALL__');
      });
    } else {
      loadStructure(user.id);
      loadMyPayslips();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrHr]);

  useEffect(() => {
    if (isAdminOrHr && selectedEmployee === '__ALL__') {
      setStructure(null);
      loadAllPayslips();
    } else if (isAdminOrHr && selectedEmployee) {
      loadStructure(selectedEmployee);
      loadPayslipsFor(selectedEmployee);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee]);

  async function loadAllPayslips() {
    try {
      const res = await api.get('/payroll');
      setPayslips(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function loadStructure(employeeId) {
    try {
      const res = await api.get(`/payroll/salary-structure/${employeeId}`);
      setStructure(res.data.data);
      if (res.data.data) {
        setForm({
          ctc: res.data.data.ctc, basic: res.data.data.basic, hra: res.data.data.hra,
          specialAllowance: res.data.data.special_allowance, pf: res.data.data.pf, esic: res.data.data.esic,
          professionalTax: res.data.data.professional_tax, bonus: res.data.data.bonus,
          incentive: res.data.data.incentive, otherAllowances: res.data.data.other_allowances
        });
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function loadMyPayslips() {
    try {
      const res = await api.get('/payroll/me');
      setPayslips(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function loadPayslipsFor(employeeId) {
    try {
      const res = await api.get('/payroll', { params: { employeeId } });
      setPayslips(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function saveStructure(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/payroll/salary-structure/${selectedEmployee}`, form);
      toast.success(res.data.message);
      loadStructure(selectedEmployee);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await api.post(`/payroll/generate/${selectedEmployee}`, {
        month: Number(payMonth), year: Number(payYear),
        incentive, arrear, travellingAllowance, loanAdvance, lopDays, tds
      });
      toast.success(res.data.message);
      loadPayslipsFor(selectedEmployee);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function downloadSample() {
    try {
      const res = await api.get('/payroll/bulk-sample', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'payslip_bulk_template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleBulkUpload(e) {
    e.preventDefault();
    if (!bulkFile) { toast.error('Choose a CSV or Excel file first.'); return; }
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const res = await api.post('/payroll/bulk-generate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      setBulkResult(res.data.data);
      setBulkFile(null);
      if (selectedEmployee) loadPayslipsFor(selectedEmployee);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBulkUploading(false);
    }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Payroll</h1><p>{isAdminOrHr ? 'Set salary structure and generate monthly payslips.' : 'View your salary structure and payslips.'}</p></div>
      </div>

      {isAdminOrHr && (
        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
          style={{ marginBottom: 20, maxWidth: 300, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)' }}>
          <option value="__ALL__">All Employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
        </select>
      )}

      {isAdminOrHr && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Bulk Payslip Generation</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: -8 }}>
            Generate payslips for many employees at once — download the sample, fill it in Excel, and upload it back.
          </p>
          <div className="d-flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={downloadSample}>⬇️ Download Sample Template</button>
            <form onSubmit={handleBulkUpload} className="d-flex gap-2" style={{ alignItems: 'center' }}>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setBulkFile(e.target.files[0])} />
              <button className="btn btn-primary btn-sm" disabled={bulkUploading}>
                {bulkUploading ? <span className="spinner" /> : 'Upload & Generate'}
              </button>
            </form>
          </div>
          {bulkResult && (
            <div className="mt-3" style={{ fontSize: '0.85rem' }}>
              <p className="mb-0">✅ Succeeded: {bulkResult.succeeded.length}{bulkResult.failed.length ? ` · ❌ Failed: ${bulkResult.failed.length}` : ''}</p>
              {bulkResult.failed.length > 0 && (
                <ul style={{ marginTop: 6, color: '#b91c1c' }}>
                  {bulkResult.failed.map((f, i) => <li key={i}>Row {f.row}{f.employeeCode ? ` (${f.employeeCode})` : ''}: {f.reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className={isAdminOrHr ? 'grid-2' : ''}>
        {(!isAdminOrHr || selectedEmployee !== '__ALL__') && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Salary Structure</h3>
          {isAdminOrHr ? (
            <form onSubmit={saveStructure}>
              <div className="grid-2">
                <div className="field"><label>CTC (Annual)</label><input value={form.ctc} onChange={(e) => set('ctc', e.target.value)} required /></div>
                <div className="field"><label>Basic (Monthly)</label><input value={form.basic} onChange={(e) => set('basic', e.target.value)} /></div>
                <div className="field"><label>HRA</label><input value={form.hra} onChange={(e) => set('hra', e.target.value)} /></div>
                <div className="field"><label>Special Allowance</label><input value={form.specialAllowance} onChange={(e) => set('specialAllowance', e.target.value)} /></div>
                <div className="field"><label>PF</label><input value={form.pf} onChange={(e) => set('pf', e.target.value)} /></div>
                <div className="field"><label>ESIC</label><input value={form.esic} onChange={(e) => set('esic', e.target.value)} /></div>
                <div className="field"><label>Professional Tax</label><input value={form.professionalTax} onChange={(e) => set('professionalTax', e.target.value)} /></div>
                <div className="field"><label>Bonus</label><input value={form.bonus} onChange={(e) => set('bonus', e.target.value)} /></div>
                <div className="field"><label>Incentive</label><input value={form.incentive} onChange={(e) => set('incentive', e.target.value)} /></div>
                <div className="field"><label>Other Allowances</label><input value={form.otherAllowances} onChange={(e) => set('otherAllowances', e.target.value)} /></div>
              </div>
              <button className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Save Structure'}</button>
            </form>
          ) : structure ? (
            <table className="hrms-table">
              <tbody>
                <tr><td>CTC</td><td>{structure.ctc}</td></tr>
                <tr><td>Basic</td><td>{structure.basic}</td></tr>
                <tr><td>HRA</td><td>{structure.hra}</td></tr>
                <tr><td>Special Allowance</td><td>{structure.special_allowance}</td></tr>
                <tr><td>PF</td><td>{structure.pf}</td></tr>
                <tr><td>ESIC</td><td>{structure.esic}</td></tr>
                <tr><td>Professional Tax</td><td>{structure.professional_tax}</td></tr>
                <tr><td>Bonus</td><td>{structure.bonus}</td></tr>
                <tr><td>Incentive</td><td>{structure.incentive}</td></tr>
                <tr><td>Other Allowances</td><td>{structure.other_allowances}</td></tr>
              </tbody>
            </table>
          ) : <p className="text-muted mb-0">Salary structure not set yet. Contact HR.</p>}
        </div>
        )}

        <div>
          {isAdminOrHr && selectedEmployee !== '__ALL__' && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3>Generate Payslip</h3>
              <div className="grid-2">
                <div className="field"><label>Month</label><input type="number" min="1" max="12" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} /></div>
                <div className="field"><label>Year</label><input type="number" value={payYear} onChange={(e) => setPayYear(e.target.value)} /></div>
                <div className="field"><label>Incentive (blank = use structure default)</label><input value={incentive} onChange={(e) => setIncentive(e.target.value)} /></div>
                <div className="field"><label>Arrear</label><input value={arrear} onChange={(e) => setArrear(e.target.value)} /></div>
                <div className="field"><label>Travelling Allowance</label><input value={travellingAllowance} onChange={(e) => setTravellingAllowance(e.target.value)} /></div>
                <div className="field"><label>Loan &amp; Advance (deduction)</label><input value={loanAdvance} onChange={(e) => setLoanAdvance(e.target.value)} /></div>
                <div className="field"><label>LOP Days (Loss of Pay)</label><input value={lopDays} onChange={(e) => setLopDays(e.target.value)} /></div>
                <div className="field"><label>TDS (deduction)</label><input value={tds} onChange={(e) => setTds(e.target.value)} /></div>
              </div>
              <button className="btn btn-primary" onClick={generate} disabled={generating || !structure}>
                {generating ? <span className="spinner" /> : 'Generate Payslip'}
              </button>
              {!structure && <p className="field-hint">Set salary structure first.</p>}
            </div>
          )}

          <div className="card">
            <h3>Payslip History</h3>
            {payslips.length === 0 ? <p className="text-muted mb-0">No payslips generated yet.</p> : (
              <div className="table-wrap">
                <table className="hrms-table">
                  <thead><tr><th>Period</th><th>Net Salary</th><th></th></tr></thead>
                  <tbody>
                    {payslips.map((p) => (
                      <tr key={`${p.month}-${p.year}`}>
                        <td>{p.month}/{p.year}</td>
                        <td>{p.net_salary}</td>
                        <td><a className="btn btn-outline btn-sm" href={baseUrl + p.file_path} target="_blank" rel="noreferrer">View PDF</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}