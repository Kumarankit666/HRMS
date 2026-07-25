import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }) => 'pub-link' + (isActive ? ' active' : '');

  return (
    <div className="pub-shell">
      <header className="pub-header">
        <Link to="/" className="pub-brand">🏢 MSMG Education Solution</Link>

        <nav className={'pub-nav' + (open ? ' open' : '')}>
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/products" className={linkClass}>Products</NavLink>
          <NavLink to="/faculty" className={linkClass}>Faculty</NavLink>
          <NavLink to="/toppers" className={linkClass}>Toppers</NavLink>
          <NavLink to="/services" className={linkClass}>Services</NavLink>
          <NavLink to="/contact" className={linkClass}>Contact Us</NavLink>
        </nav>

        <div className="pub-header-right">
          <Link to="/login" className="btn btn-primary pub-login-btn">Employee Login</Link>
          <button className="pub-hamburger" onClick={() => setOpen((v) => !v)}>☰</button>
        </div>
      </header>

      <main className="pub-main">
        <Outlet />
      </main>

      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <div>
            <div className="pub-brand" style={{ marginBottom: 10 }}>🏢 MSMG Education Solution</div>
            <p className="text-muted" style={{ maxWidth: 360, fontSize: '0.88rem' }}>
              Empowering learners with quality education, guidance, and career support.
            </p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <Link to="/products">Products</Link>
            <Link to="/faculty">Faculty</Link>
            <Link to="/toppers">Toppers</Link>
            <Link to="/services">Services</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/careers">Careers</Link>
          </div>
          <div>
            <h4>Staff</h4>
            <Link to="/login">Employee Login</Link>
          </div>
        </div>
        <div className="pub-footer-bottom pub-footer-bottom-row">
          <span>© {new Date().getFullYear()} MSMG Education Solution. All rights reserved.</span>
          <span className="dev-credit">
            Developed &amp; Managed by <a href="https://www.kumarankit.in/" target="_blank" rel="noreferrer">Ankit Kumar</a>
          </span>
        </div>
      </footer>
    </div>
  );
}