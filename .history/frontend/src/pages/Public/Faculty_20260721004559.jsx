import { useEffect, useState } from 'react';
import api from '../../api/client';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function Faculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/faculty')
      .then((res) => setFaculty(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="pub-page-header">
        <span className="pub-eyebrow">Faculty</span>
        <h1>Meet our educators</h1>
        <p>Experienced faculty dedicated to helping every student succeed.</p>
      </section>

      <section className="pub-section">
        {loading ? (
          <p className="text-muted" style={{ textAlign: 'center' }}>Loading...</p>
        ) : faculty.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center' }}>Faculty list coming soon.</p>
        ) : (
          <div className="pub-grid-3">
            {faculty.map((f) => (
              <div className="pub-card pub-faculty-card" key={f.id}>
                {f.photo_path ? (
                  <img src={baseUrl + f.photo_path} alt={f.full_name} className="pub-avatar-photo" />
                ) : (
                  <div className="pub-avatar-lg">{initials(f.full_name)}</div>
                )}
                <h3>{f.full_name}</h3>
                <p className="pub-faculty-role">{f.role}</p>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>{f.subject}</p>

                {(f.qualification || f.experience_years) && (
                  <div className="pub-faculty-meta">
                    {f.qualification && (
                      <span className="pub-faculty-badge">🎓 {f.qualification}</span>
                    )}
                    {f.experience_years && (
                      <span className="pub-faculty-badge">💼 {f.experience_years}+ yrs exp.</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}