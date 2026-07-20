const PRODUCTS = [
  { icon: '📖', title: 'Course Subscriptions', desc: 'Full access to structured course content across subjects and levels, updated regularly.' },
  { icon: '📝', title: 'Test Series', desc: 'Practice tests and mock exams designed to mirror real assessment patterns.' },
  { icon: '📦', title: 'Study Material', desc: 'Comprehensive printed and digital study material curated by subject experts.' },
  { icon: '🖥️', title: 'LMS Platform', desc: 'A learning management system for tracking progress, assignments, and performance.' },
  { icon: '🎥', title: 'Recorded Sessions', desc: 'On-demand video lectures available anytime for revision and self-paced learning.' },
  { icon: '📊', title: 'Performance Analytics', desc: 'Detailed reports on strengths, weak areas, and improvement over time.' }
];

export default function Products() {
  return (
    <div>
      <section className="pub-page-header">
        <span className="pub-eyebrow">Products</span>
        <h1>What we offer</h1>
        <p>A complete suite of learning products designed for real results.</p>
      </section>

      <section className="pub-section">
        <div className="pub-grid-3">
          {PRODUCTS.map((p) => (
            <div className="pub-card" key={p.title}>
              <div className="pub-card-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}