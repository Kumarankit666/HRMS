const FACULTY = [
  { name: 'Dr. G S Roy', role: 'Chairman & Founder', subject: 'Leadership & Strategy', initials: 'GR' },
  { name: 'Prateek Kumar', role: 'Director', subject: 'Academic Operations', initials: 'PK' },
  { name: 'Ankit Kumar', role: 'Senior Faculty', subject: 'Mathematics', initials: 'FM' },
  { name: 'Faculty Member', role: 'Senior Faculty', subject: 'Science', initials: 'FM' },
  { name: 'Faculty Member', role: 'Faculty', subject: 'English & Communication', initials: 'FM' },
  { name: 'Faculty Member', role: 'Faculty', subject: 'Career Counseling', initials: 'FM' }
];

export default function Faculty() {
  return (
    <div>
      <section className="pub-page-header">
        <span className="pub-eyebrow">Faculty</span>
        <h1>Meet our educators</h1>
        <p>Experienced faculty dedicated to helping every student succeed.</p>
      </section>

      <section className="pub-section">
        <div className="pub-grid-3">
          {FACULTY.map((f, i) => (
            <div className="pub-card pub-faculty-card" key={i}>
              <div className="pub-avatar-lg">{f.initials}</div>
              <h3>{f.name}</h3>
              <p className="pub-faculty-role">{f.role}</p>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>{f.subject}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}