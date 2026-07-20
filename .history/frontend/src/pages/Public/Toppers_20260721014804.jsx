import { useEffect, useState } from 'react';
import api from '../../api/client';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function Toppers() {
  const [toppers, setToppers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/toppers')
      .then((res) => setToppers(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="pub-page-header">
        <span className="pub-eyebrow">Our Achievers</span>
        <h1>Meet Our Topper Students</h1>
        <p>Proud of every student who reached the top through hard work and the right guidance.</p>
      </section>

      <section className="pub-section">
        {loading ? (
          <p className="text-muted" style={{ textAlign: 'center' }}>Loading...</p>
        ) : toppers.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center' }}>Topper list coming soon.</p>
        ) : (
          <div className="pub-grid-3">
            {toppers.map((t) => (
              <div className="pub-card pub-topper-card" key={t.id}>
                {t.photo_path ? (
                  <img src={baseUrl + t.photo_path} alt={t.student_name} className="pub-avatar-photo" />
                ) : (
                  <div className="pub-avatar-lg">{initials(t.student_name)}</div>
                )}
                <h3>{t.student_name}</h3>
                <div className="pub-topper-rank">🏆 {t.rank_achieved}</div>
                <p className="text-muted" style={{ fontSize: '0.87rem', margin: '4px 0' }}>{t.exam_name} · {t.exam_year}</p>
                {t.marks_obtained && (
                  <p className="pub-topper-marks">📊 {t.marks_obtained} marks</p>
                )}
                {t.current_status && (
                  <p className="pub-topper-status">📍 {t.current_status}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}