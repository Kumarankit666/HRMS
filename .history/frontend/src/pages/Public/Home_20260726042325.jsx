import { Link } from 'react-router-dom';

const OFFERINGS = [
  { icon: '📚', title: 'Structured Learning Programs', desc: 'Well-designed courses covering foundational to advanced levels, built by experienced educators.' },
  { icon: '🎯', title: 'Career Guidance', desc: 'One-on-one counseling to help students choose the right path based on their interests and strengths.' },
  { icon: '💻', title: 'Digital Learning Platform', desc: 'Access study material, test series, and recorded sessions anytime, on any device.' },
  { icon: '🤝', title: 'Placement Support', desc: 'Industry connections and interview preparation to help students transition into careers.' }
];

export default function Home() {
  return (
    <div>
      <section className="pub-hero">
        <div className="pub-hero-text">
          <span className="pub-eyebrow">MSMG Education Solution</span>
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

      <section className="pub-cta">
        <h2>Ready to get started?</h2>
        <p>Explore our programs and services, or reach out to learn how we can help.</p>
        <Link to="/services" className="btn btn-primary btn-lg">See Our Services</Link>
      </section>
    </div>
  );
}