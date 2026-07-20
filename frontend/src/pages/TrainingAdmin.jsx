import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';

export default function TrainingAdmin() {
  const [tab, setTab] = useState('overview'); // overview | content | assign
  const [departments, setDepartments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [showAddDept, setShowAddDept] = useState(false);

  useEffect(() => { loadDepartments(); loadOverview(); }, []);

  async function loadDepartments() {
    try {
      const res = await api.get('/training-admin/departments');
      setDepartments(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function loadOverview() {
    try {
      const res = await api.get('/training-admin/overview');
      setOverview(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="content-header">
        <div><h1>Training — Admin</h1><p>Manage content, assign training, track progress.</p></div>
        <button className="btn btn-primary" onClick={() => setShowAddDept(true)}>+ Add Department</button>
      </div>

      <div className="d-flex gap-2" style={{ marginBottom: 20 }}>
        {['overview', 'content', 'assign'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'content' ? 'Manage Content' : 'Assign Training'}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && <OverviewTab data={overview} onRefresh={loadOverview} />}
      {tab === 'content' && <ContentTab departments={departments} />}
      {tab === 'assign' && <AssignTab departments={departments} onDone={loadOverview} />}

      {showAddDept && (
        <AddDepartmentModal onClose={() => setShowAddDept(false)} onDone={() => { setShowAddDept(false); loadDepartments(); }} />
      )}
    </div>
  );
}

/* ============================= OVERVIEW TAB ============================= */
function OverviewTab({ data, onRefresh }) {
  const [detailFor, setDetailFor] = useState(null);

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card"><div className="label">Total Assignments</div><div className="value">{data.totalAssignments}</div></div>
        <div className="stat-card"><div className="label">Certified</div><div className="value">{data.totalCertified}</div></div>
        <div className="stat-card"><div className="label">Departments</div><div className="value">{data.departments.length}</div></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="hrms-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Progress</th><th>Certified</th><th></th></tr></thead>
            <tbody>
              {data.assignments.length === 0 ? (
                <tr><td colSpan={5} className="text-muted">No assignments yet.</td></tr>
              ) : data.assignments.map((a) => (
                <tr key={a.employeeId + a.departmentId}>
                  <td>{a.name} <span className="text-muted">({a.employeeCode})</span></td>
                  <td>{a.department}</td>
                  <td>{a.completedVideos}/{a.totalVideos} ({a.progressPercent}%)</td>
                  <td>{a.certified ? '✅' : '—'}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => setDetailFor(a)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailFor && (
        <EmployeeDetailModal assignment={detailFor} onClose={() => setDetailFor(null)} onChanged={onRefresh} />
      )}
    </div>
  );
}

function EmployeeDetailModal({ assignment, onClose, onChanged }) {
  const [videos, setVideos] = useState([]);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get(`/training-admin/employee/${assignment.employeeId}/${assignment.departmentId}`);
      setVideos(res.data.data.videos);
      setAttempts(res.data.data.attempts);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function toggleRetake(v) {
    try {
      if (v.status === 'retake_required') {
        const res = await api.post('/training-admin/retake/cancel', { employeeId: assignment.employeeId, videoId: v.videoId });
        toast.success(res.data.message);
      } else {
        if (!window.confirm('Make this video mandatory to rewatch and retest?')) return;
        const res = await api.post('/training-admin/retake', { employeeId: assignment.employeeId, videoId: v.videoId });
        toast.success(res.data.message);
      }
      load(); onChanged();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <Modal title={`${assignment.name} — ${assignment.department}`} onClose={onClose}>
      <h4 style={{ marginBottom: 10 }}>Videos</h4>
      {videos.map((v) => (
        <div key={v.videoId} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <span>{v.title} — <span className="text-muted">{v.status} ({v.bestPercentage}%)</span></span>
          <button className="btn btn-outline btn-sm" onClick={() => toggleRetake(v)}>
            {v.status === 'retake_required' ? 'Cancel Retake' : 'Force Retake'}
          </button>
        </div>
      ))}
      <h4 style={{ margin: '18px 0 10px' }}>Test History</h4>
      {attempts.length === 0 ? <p className="text-muted">No attempts yet.</p> : attempts.map((a, i) => (
        <div key={i} className="flex-between" style={{ padding: '6px 0', fontSize: '0.85rem' }}>
          <span>{a.title}</span>
          <span className={a.passed ? 'text-muted' : 'text-muted'}>{a.percentage}% {a.passed ? '✅' : '❌'}</span>
        </div>
      ))}
    </Modal>
  );
}

/* ============================= CONTENT TAB (videos + questions) ============================= */
function ContentTab({ departments }) {
  const [deptId, setDeptId] = useState(departments[0]?.id || '');
  const [videos, setVideos] = useState([]);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [questionsFor, setQuestionsFor] = useState(null);

  useEffect(() => { setDeptId(departments[0]?.id || ''); }, [departments]);
  useEffect(() => { if (deptId) loadVideos(); }, [deptId]);

  async function loadVideos() {
    try {
      const res = await api.get('/training-admin/videos', { params: { departmentId: deptId } });
      setVideos(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  async function removeVideo(id) {
    if (!window.confirm('Delete this video and its questions?')) return;
    try {
      const res = await api.delete(`/training-admin/videos/${id}`);
      toast.success(res.data.message);
      loadVideos();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  if (!departments.length) return <p className="text-muted">Add a department first.</p>;

  return (
    <div>
      <div className="d-flex gap-2" style={{ marginBottom: 16, alignItems: 'center' }}>
        <select value={deptId} onChange={(e) => setDeptId(e.target.value)} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)' }}>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddVideo(true)}>+ Add Video</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="hrms-table">
            <thead><tr><th>#</th><th>Title</th><th>YouTube ID</th><th>Questions</th><th></th></tr></thead>
            <tbody>
              {videos.length === 0 ? (
                <tr><td colSpan={5} className="text-muted">No videos yet.</td></tr>
              ) : videos.map((v) => (
                <tr key={v.id}>
                  <td>{v.order_num}</td>
                  <td>{v.title}</td>
                  <td>{v.youtube_id}</td>
                  <td>{v.question_added}/{v.question_count}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => setQuestionsFor(v)}>Questions</button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeVideo(v.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddVideo && (
        <AddVideoModal departmentId={deptId} onClose={() => setShowAddVideo(false)} onDone={() => { setShowAddVideo(false); loadVideos(); }} />
      )}
      {questionsFor && (
        <QuestionsModal video={questionsFor} onClose={() => setQuestionsFor(null)} onChanged={loadVideos} />
      )}
    </div>
  );
}

function AddVideoModal({ departmentId, onClose, onDone }) {
  const [form, setForm] = useState({ orderNum: 1, title: '', youtubeId: '', transcript: '', questionCount: 5 });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/training-admin/videos', { ...form, departmentId });
      toast.success(res.data.message);
      onDone();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal title="Add Video" onClose={onClose} footer={
      <><button className="btn btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <span className="spinner" /> : 'Add'}</button></>
    }>
      <form onSubmit={handleSubmit}>
        <div className="field"><label>Order</label><input type="number" value={form.orderNum} onChange={(e) => set('orderNum', e.target.value)} /></div>
        <div className="field"><label>Title</label><input value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div className="field"><label>YouTube Video ID</label><input value={form.youtubeId} onChange={(e) => set('youtubeId', e.target.value)} placeholder="e.g. dQw4w9WgXcQ" required /></div>
        <div className="field"><label>Transcript (optional, for reference)</label><textarea rows={3} value={form.transcript} onChange={(e) => set('transcript', e.target.value)} /></div>
        <div className="field"><label>Question Count (target)</label><input type="number" value={form.questionCount} onChange={(e) => set('questionCount', e.target.value)} /></div>
      </form>
    </Modal>
  );
}

function QuestionsModal({ video, onClose, onChanged }) {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const res = await api.get('/training-admin/questions', { params: { videoId: video.id } });
      setQuestions(res.data.data);
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function addQuestion(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/training-admin/questions', { ...form, videoId: video.id });
      toast.success(res.data.message);
      setForm({ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' });
      load(); onChanged();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  async function removeQuestion(id) {
    try {
      await api.delete(`/training-admin/questions/${id}`);
      load(); onChanged();
    } catch (err) { toast.error(apiErrorMessage(err)); }
  }

  return (
    <Modal title={`Questions — ${video.title}`} onClose={onClose}>
      {questions.map((q) => (
        <div key={q.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem' }}>{q.question} <b>({q.correct_answer})</b></span>
          <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(q.id)}>Delete</button>
        </div>
      ))}

      <h4 style={{ margin: '16px 0 10px' }}>Add Question</h4>
      <form onSubmit={addQuestion}>
        <div className="field"><label>Question</label><input value={form.question} onChange={(e) => set('question', e.target.value)} required /></div>
        <div className="grid-2">
          <div className="field"><label>Option A</label><input value={form.optionA} onChange={(e) => set('optionA', e.target.value)} required /></div>
          <div className="field"><label>Option B</label><input value={form.optionB} onChange={(e) => set('optionB', e.target.value)} required /></div>
          <div className="field"><label>Option C</label><input value={form.optionC} onChange={(e) => set('optionC', e.target.value)} required /></div>
          <div className="field"><label>Option D</label><input value={form.optionD} onChange={(e) => set('optionD', e.target.value)} required /></div>
        </div>
        <div className="field">
          <label>Correct Answer</label>
          <select value={form.correctAnswer} onChange={(e) => set('correctAnswer', e.target.value)}>
            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
          </select>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Add Question'}</button>
      </form>
    </Modal>
  );
}

/* ============================= ASSIGN TAB ============================= */
function AssignTab({ departments, onDone }) {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/employees').then((res) => {
      setEmployees(res.data.data);
      if (res.data.data.length) setEmployeeId(res.data.data[0].id);
    });
  }, []);
  useEffect(() => { setDepartmentId(departments[0]?.id || ''); }, [departments]);

  async function handleAssign(e) {
    e.preventDefault();
    if (!employeeId || !departmentId) return;
    setSaving(true);
    try {
      const res = await api.post('/training-admin/assign', { employeeId, departmentId });
      toast.success(res.data.message);
      onDone();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  if (!departments.length) return <p className="text-muted">Add a department first.</p>;

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3>Assign Training</h3>
      <form onSubmit={handleAssign}>
        <div className="field">
          <label>Employee</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
          </select>
        </div>
        <div className="field">
          <label>Training Department</label>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Assign'}</button>
      </form>
    </div>
  );
}

/* ============================= ADD DEPARTMENT MODAL ============================= */
function AddDepartmentModal({ onClose, onDone }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/training-admin/departments', { name, description });
      toast.success(res.data.message);
      onDone();
    } catch (err) { toast.error(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal title="Add Training Department" onClose={onClose} footer={
      <><button className="btn btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <span className="spinner" /> : 'Add'}</button></>
    }>
      <form onSubmit={handleSubmit}>
        <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label>Description</label><textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </form>
    </Modal>
  );
}