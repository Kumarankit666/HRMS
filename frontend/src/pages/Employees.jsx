import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [managerModalFor, setManagerModalFor] = useState(null);
  const [offerModalFor, setOfferModalFor] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [empRes, deptRes, mgrRes] = await Promise.all([
        api.get('/employees'),
        api.get('/reference/departments'),
        api.get('/reference/managers')
      ]);
      setEmployees(empRes.data.data);
      setDepartments(deptRes.data.data);
      setManagers(mgrRes.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    try {
      const res = await api.get('/employees', { params: { search } });
      setEmployees(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function toggleStatus(emp) {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    if (nextStatus === 'Inactive' && !window.confirm(`Deactivate ${emp.full_name}?`)) return;
    try {
      const res = await api.patch(`/employees/${emp.id}/status`, { status: nextStatus });
      toast.success(res.data.message);
      loadAll();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function resetPassword(emp) {
    if (!window.confirm(`Reset password for ${emp.full_name}? A new temporary password will be emailed.`)) return;
    try {
      const res = await api.post(`/employees/${emp.id}/reset-password`);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Employees</h1><p>Add, edit, or deactivate — everything happens here.</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Employee</button>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: 16, display: 'flex', gap: 8, maxWidth: 360 }}>
        <input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-outline" type="submit">Search</button>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table className="hrms-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Manager</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-muted">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="text-muted">No employees found.</td></tr>
              ) : employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.employee_code}</td>
                  <td>{e.full_name}</td>
                  <td>{e.department || '—'}</td>
                  <td>{e.designation || '—'}</td>
                  <td>
                    {managers.find((m) => m.id === e.reporting_manager_id)?.full_name || '—'}
                    {['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
                      <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => setManagerModalFor(e)}>Set</button>
                    )}
                  </td>
                  <td><span className={`badge badge-${e.status.toLowerCase()}`}>{e.status}</span></td>
                  <td>
                    <div className="d-flex gap-2" style={{ flexWrap: 'wrap' }}>
                      <button className={`btn btn-sm ${e.status === 'Active' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(e)}>
                        {e.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => resetPassword(e)}>Reset PW</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setOfferModalFor(e)}>Offer Letter</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddEmployeeModal
          departments={departments} managers={managers} userRole={user.role}
          onClose={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); loadAll(); }}
        />
      )}
      {managerModalFor && (
        <ManagerModal
          employee={managerModalFor} managers={managers}
          onClose={() => setManagerModalFor(null)}
          onDone={() => { setManagerModalFor(null); loadAll(); }}
        />
      )}
      {offerModalFor && (
        <OfferLetterModal
          employee={offerModalFor}
          onClose={() => setOfferModalFor(null)}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ departments, managers, userRole, onClose, onDone }) {
  const [form, setForm] = useState({
    fullName: '', personalEmail: '', departmentId: '', designationId: '', joiningDate: '',
    reportingManagerId: '', employmentType: 'Full-Time', workLocation: '', role: 'EMPLOYEE'
  });
  const [designations, setDesignations] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.departmentId) { setDesignations([]); return; }
    api.get('/reference/designations', { params: { departmentId: form.departmentId } }).then((res) => setDesignations(res.data.data));
  }, [form.departmentId]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/employees', form);
      toast.success(res.data.message);
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Employee" onClose={onClose} footer={
      <>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? <span className="spinner" /> : 'Create Employee'}
        </button>
      </>
    }>
      <form onSubmit={handleSubmit} id="addEmpForm">
        <div className="grid-2">
          <div className="field"><label>Full Name</label><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required /></div>
          <div className="field"><label>Personal Email</label><input type="email" value={form.personalEmail} onChange={(e) => set('personalEmail', e.target.value)} required /></div>
          <div className="field">
            <label>Department</label>
            <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
              <option value="">Select</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Designation</label>
            <select value={form.designationId} onChange={(e) => set('designationId', e.target.value)} disabled={!designations.length}>
              <option value="">Select</option>
              {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Joining Date</label><input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} /></div>
          <div className="field">
            <label>Reporting Manager</label>
            <select value={form.reportingManagerId} onChange={(e) => set('reportingManagerId', e.target.value)}>
              <option value="">None</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.employee_code})</option>)}
            </select>
          </div>
          <div className="field">
            <label>Employment Type</label>
            <select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
              <option>Full-Time</option><option>Part-Time</option><option>Contract</option><option>Intern</option>
            </select>
          </div>
          <div className="field"><label>Work Location</label><input value={form.workLocation} onChange={(e) => set('workLocation', e.target.value)} /></div>
          {userRole === 'SUPER_ADMIN' && (
            <div className="field">
              <label>System Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="EMPLOYEE">Employee</option>
                <option value="HR_ADMIN">HR Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function ManagerModal({ employee, managers, onClose, onDone }) {
  const [managerId, setManagerId] = useState(employee.reporting_manager_id || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.patch(`/employees/${employee.id}/manager`, { managerId: managerId || null });
      toast.success(res.data.message);
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Assign Manager — ${employee.full_name}`} onClose={onClose} footer={
      <>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <span className="spinner" /> : 'Save'}</button>
      </>
    }>
      <div className="field">
        <label>Reporting Manager</label>
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
          <option value="">None</option>
          {managers.filter((m) => m.id !== employee.id).map((m) => (
            <option key={m.id} value={m.id}>{m.full_name} ({m.employee_code})</option>
          ))}
        </select>
      </div>
    </Modal>
  );
}

function OfferLetterModal({ employee, onClose }) {
  const [form, setForm] = useState({ salary: '', designation: employee.designation || '', department: employee.department || '', location: '', joiningDate: '' });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/offer-letters/${employee.id}`, form);
      toast.success(res.data.message);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Generate Offer Letter — ${employee.employee_code}`} onClose={onClose} footer={
      <>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? <span className="spinner" /> : 'Generate & Email'}
        </button>
      </>
    }>
      <p className="text-muted" style={{ fontSize: '0.85rem' }}>Requires onboarding to be <strong>Approved</strong> first.</p>
      <form onSubmit={handleSubmit}>
        <div className="field"><label>Annual CTC / Salary</label><input value={form.salary} onChange={(e) => set('salary', e.target.value)} required /></div>
        <div className="field"><label>Designation</label><input value={form.designation} onChange={(e) => set('designation', e.target.value)} /></div>
        <div className="field"><label>Department</label><input value={form.department} onChange={(e) => set('department', e.target.value)} /></div>
        <div className="field"><label>Work Location</label><input value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
        <div className="field"><label>Joining Date</label><input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} /></div>
      </form>
    </Modal>
  );
}
