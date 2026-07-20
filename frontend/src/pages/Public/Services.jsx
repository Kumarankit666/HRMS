const SERVICES = [
  { icon: '🧭', title: 'Admission Guidance', desc: 'Step-by-step support through the admission process, from choosing a program to enrollment.' },
  { icon: '👨‍🏫', title: 'Mentorship Programs', desc: 'Ongoing mentorship from experienced professionals to guide academic and career decisions.' },
  { icon: '💼', title: 'Placement Assistance', desc: 'Resume building, interview preparation, and connections with hiring partners.' },
  { icon: '🏢', title: 'Corporate Training', desc: 'Customized training programs for organizations looking to upskill their teams.' },
  { icon: '📅', title: 'Workshops & Seminars', desc: 'Regular sessions on emerging skills, industry trends, and personal development.' },
  { icon: '☎️', title: 'Student Support', desc: 'Dedicated support desk for academic and administrative queries.' },
  { icon: '🚌', title: 'Student Transport', desc: 'Safe, reliable transport service for students commuting to and from campus.' }
];

export default function Services() {
  return (
    <div>
      <section className="pub-page-header">
        <span className="pub-eyebrow">Services</span>
        <h1>How we support you</h1>
        <p>Beyond the classroom — guidance and support at every step.</p>
      </section>

      <section className="pub-section">
        <div className="pub-grid-3">
          {SERVICES.map((s) => (
            <div className="pub-card" key={s.title}>
              <div className="pub-card-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}