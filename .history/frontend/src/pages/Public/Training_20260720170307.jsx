import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

const PASS_PERCENT = 75;

export default function Training() {
  const [view, setView] = useState('depts'); // depts | videos | player | result | cert
  const [departments, setDepartments] = useState([]);
  const [dept, setDept] = useState(null);
  const [videos, setVideos] = useState([]);
  const [video, setVideo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

  useEffect(() => { loadDepartments(); }, []);

  async function loadDepartments() {
    setLoading(true);
    try {
      const res = await api.get('/training/my-departments');
      setDepartments(res.data.data);
      if (res.data.data.length === 1) openDept(res.data.data[0]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function openDept(d) {
    setDept(d);
    setView('videos');
    loadVideos(d.id);
  }

  async function loadVideos(deptId) {
    try {
      const res = await api.get('/training/videos', { params: { departmentId: deptId } });
      setVideos(res.data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  function openVideo(v) {
    setVideo(v);
    setView('player');
  }

  async function loadQuiz() {
    try {
      const res = await api.get(`/training/questions/${video.videoId}`);
      setQuestions(res.data.data);
      setAnswers({});
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function submitQuiz() {
    if (Object.keys(answers).length < questions.length) { toast.error(`Please answer all ${questions.length} questions.`); return; }
    try {
      const res = await api.post('/training/submit', { videoId: video.videoId, answers });
      setResult(res.data.data);
      setView('result');
      loadVideos(dept.id);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function loadCert() {
    try {
      const res = await api.get(`/training/certificate/${dept.id}`);
      if (!res.data.data) { toast.error('Complete all videos to unlock your certificate.'); return; }
      setCert(res.data.data);
      setView('cert');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  const badgeMap = {
    completed: 'badge-active', locked: 'badge-inactive', retake_required: 'badge-pending', unlocked: 'badge-submitted'
  };
  const labelMap = {
    completed: '✓ Passed', locked: '🔒 Locked', retake_required: '⚠ Retake Required', unlocked: 'Ready'
  };

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <div className="content-header"><div><h1>Training</h1><p>Complete videos and tests to earn your certificate.</p></div></div>

      {view === 'depts' && (
        departments.length === 0 ? (
          <div className="card empty-state"><div className="icon">📭</div><p className="mb-0">No training assigned yet.</p></div>
        ) : (
          <div className="grid-3">
            {departments.map((d) => (
              <div className="card" key={d.id} style={{ cursor: 'pointer' }} onClick={() => openDept(d)}>
                <h3>{d.name}</h3>
                <p className="text-muted mb-0">{d.description}</p>
              </div>
            ))}
          </div>
        )
      )}

      {view === 'videos' && (
        <div>
          {departments.length > 1 && <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={() => setView('depts')}>← Back to departments</button>}
          <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>{dept.name}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {videos.map((v) => (
              <div className="card flex-between" key={v.videoId}>
                <div>
                  <strong>{v.order}. {v.title}</strong>
                  <div><span className={`badge ${badgeMap[v.status]}`}>{labelMap[v.status]}</span>
                    {v.attempts > 0 && <span className="text-muted" style={{ marginLeft: 8, fontSize: '0.82rem' }}>Best: {v.bestPercentage}%</span>}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" disabled={v.status === 'locked'} onClick={() => openVideo(v)}>
                  {v.status === 'completed' ? 'Rewatch' : v.status === 'locked' ? 'Locked' : 'Start'}
                </button>
              </div>
            ))}
          </div>
          {videos.length > 0 && videos.every((v) => v.status === 'completed') && (
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={loadCert}>🏆 View My Certificate</button>
          )}
        </div>
      )}

      {view === 'player' && video && (
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={() => { setView('videos'); setQuestions([]); }}>← Back to videos</button>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>{video.title}</h3>
            <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                allowFullScreen title={video.title}
              />
            </div>
            {questions.length === 0 && <button className="btn btn-primary" onClick={loadQuiz}>📝 Take the Test</button>}
          </div>

          {questions.length > 0 && (
            <div className="card">
              <h3>Test — need {PASS_PERCENT}% to pass</h3>
              {questions.map((q, i) => (
                <div key={q.id} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontWeight: 600, marginBottom: 10 }}>{i + 1}. {q.question}</p>
                  {['a', 'b', 'c', 'd'].map((letter) => (
                    <label key={letter} className="checkbox-row" style={{ marginBottom: 8, cursor: 'pointer' }}>
                      <input type="radio" name={`q_${q.id}`} checked={answers[q.id] === letter.toUpperCase()}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: letter.toUpperCase() }))} />
                      <span><b>{letter.toUpperCase()}.</b> {q[`option_${letter}`]}</span>
                    </label>
                  ))}
                </div>
              ))}
              <button className="btn btn-primary" onClick={submitQuiz}>Submit Test</button>
            </div>
          )}
        </div>
      )}

      {view === 'result' && result && (
        <div className="card" style={{ textAlign: 'center', padding: 40, maxWidth: 440, margin: '0 auto' }}>
          <div style={{ fontSize: '2.6rem' }}>{result.passed ? '🎉' : '😔'}</div>
          <h2>{result.score} / {result.total} ({result.percentage}%)</h2>
          <p className="text-muted">{result.passed ? 'Well done! The next video is unlocked.' : `You scored below ${PASS_PERCENT}%. Watch again and retake.`}</p>
          <div className="d-flex gap-2" style={{ justifyContent: 'center', marginTop: 16 }}>
            {result.certificateIssued ? (
              <button className="btn btn-primary" onClick={loadCert}>🏆 View Certificate</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setView('videos')}>Continue</button>
            )}
          </div>
        </div>
      )}

      {view === 'cert' && cert && (
        <div>
          <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={() => setView('videos')}>← Back to videos</button>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '2.4rem' }}>🏆</div>
            <h2>Certificate of Completion</h2>
            <p className="text-muted">This certifies that</p>
            <h3>{cert.employeeName}</h3>
            <p className="text-muted">has completed</p>
            <h3>{cert.deptName}</h3>
            <p className="text-muted" style={{ fontSize: '0.82rem' }}>Certificate ID: {cert.certId}</p>
            <a className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }} href={baseUrl + cert.fileUrl} target="_blank" rel="noreferrer">
              ⬇️ Download PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}