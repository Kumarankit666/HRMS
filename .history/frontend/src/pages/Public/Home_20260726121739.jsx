import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../api/client';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

const OFFERINGS = [
  { icon: '📚', title: 'Structured Learning Programs', desc: 'Well-designed courses covering foundational to advanced levels, built by experienced educators.' },
  { icon: '🎯', title: 'Career Guidance', desc: 'One-on-one counseling to help students choose the right path based on their interests and strengths.' },
  { icon: '💻', title: 'Digital Learning Platform', desc: 'Access study material, test series, and recorded sessions anytime, on any device.' },
  { icon: '🤝', title: 'Placement Support', desc: 'Industry connections and interview preparation to help students transition into careers.' }
];

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function Home() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    api.get('/leadership').then((res) => setLeaders(res.data.data)).catch(() => {});
  }, []);

  return (
    <div>
      <section className="pub-hero">
        <div className="pub-hero-text">
          <span className="pub-eyebrow">MSMG Education Solution</span>
          <h1>Quality education, guided careers, real outcomes.</h1>
          <p>We help students and professionals learn, grow, and build careers through structured programs, expert faculty, and dedicated mentorship.</p>
          <div className="d-flex gap-2" style={{ marginTop: 20 }}>
            <Link to="/services" className="btn btn-primary btn-lg">Explore Services</Link>
            <Link to="/careers" className="btn btn-outline btn-lg">View Careers</Link>
          </div>
        </div>
        <div className="pub-hero-art">🎓</div>
      </section>

      <section className="pub-section">
        <div className="pub-section-header">
          <span className="pub-eyebrow">What We Provide</span>
          <h2>Everything you need to succeed</h2>
        </div>
        <div className="pub-grid-4">
          {OFFERINGS.map((o) => (
            <div className="pub-card" key={o.title}>
              <div className="pub-card-icon">{o.icon}</div>
              <h3>{o.title}</h3>
              <p>{o.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {leaders.length > 0 && (
        <section className="pub-section">
          <div className="pub-section-header">
            <span className="pub-eyebrow">Leadership</span>
            <h2>Guided by experience</h2>
          </div>
          <div className="pub-grid-3">
            {leaders.map((l) => (
              <div className="pub-card pub-faculty-card" key={l.id}>
                {l.photo_path ? (
                  <img src={baseUrl + l.photo_path} alt={l.full_name} className="pub-avatar-photo" />
                ) : (
                  <div className="pub-avatar-lg">{initials(l.full_name)}</div>
                )}
                <h3>{l.full_name}</h3>
                <p className="pub-faculty-role">{l.designation}</p>
                {l.message && <p className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>"{l.message}"</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pub-cta">
        <h2>Ready to get started?</h2>
        <p>Explore our programs and services, or reach out to learn how we can help.</p>
        <Link to="/services" className="btn btn-primary btn-lg">See Our Services</Link>
      </section>
    </div>
  );
}