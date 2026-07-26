import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function AppLayout() {
  const { user, logout, isAdminOrHr } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the mobile sidebar automatically whenever the route changes.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function closeSidebar() { setSidebarOpen(false); }

  const linkClass = ({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '');

  return (
    <div className="app-shell">
      <aside className={'sidebar' + (sidebarOpen ? ' open' : '')}>
        <div className="sidebar-brand">🏢 MSMG</div>
        <nav className="sidebar-nav">
          <NavLink to="/app" end className={linkClass} onClick={closeSidebar}>📊 Overview</NavLink>
          <NavLink to="/app/attendance" className={linkClass} onClick={closeSidebar}>📅 Attendance</NavLink>
          <NavLink to="/app/payroll" className={linkClass} onClick={closeSidebar}>💰 Payroll</NavLink>
          <NavLink to="/app/documents" className={linkClass} onClick={closeSidebar}>📁 Documents</NavLink>

          {!isAdminOrHr && (
            <>
              <NavLink to="/app/training" className={linkClass} onClick={closeSidebar}>🎓 Training</NavLink>
              <NavLink to="/app/consent" className={linkClass} onClick={closeSidebar}>✍️ Consent & Policies</NavLink>
              <NavLink to="/app/bank-details" className={linkClass} onClick={closeSidebar}>🏦 Bank Details</NavLink>
              <NavLink to="/app/leave" className={linkClass} onClick={closeSidebar}>🛫 Leave</NavLink>
              {user?.isManager && <NavLink to="/app/team-leave" className={linkClass} onClick={closeSidebar}>👥 Team Approvals</NavLink>}
              {user?.isManager && <NavLink to="/app/attendance-approvals" className={linkClass} onClick={closeSidebar}>📋 Attendance Corrections</NavLink>}
            </>
          )}

          {isAdminOrHr && (
            <>
              <div className="sidebar-section-label">HR</div>
              <NavLink to="/app/employees" className={linkClass} onClick={closeSidebar}>👤 Employees</NavLink>
              <NavLink to="/app/onboarding-review" className={linkClass} onClick={closeSidebar}>📝 Onboarding</NavLink>
              <NavLink to="/app/leave-approvals" className={linkClass} onClick={closeSidebar}>✅ Leave Approvals</NavLink>
              <NavLink to="/app/attendance-approvals" className={linkClass} onClick={closeSidebar}>📋 Attendance Corrections</NavLink>
              <NavLink to="/app/offer-letters" className={linkClass} onClick={closeSidebar}>📄 Offer Letters</NavLink>
              <NavLink to="/app/bank-requests-admin" className={linkClass} onClick={closeSidebar}>🏦 Bank Requests</NavLink>
              <NavLink to="/app/training-admin" className={linkClass} onClick={closeSidebar}>🎓 Training</NavLink>
              <NavLink to="/app/policies-admin" className={linkClass} onClick={closeSidebar}>📜 Policy Documents</NavLink>
              <div className="sidebar-section-label">Website</div>
              <NavLink to="/app/leadership-admin" className={linkClass} onClick={closeSidebar}>🧑‍💼 Leadership</NavLink>
              <NavLink to="/app/faculty-admin" className={linkClass} onClick={closeSidebar}>🎓 Faculty</NavLink>
              <NavLink to="/app/toppers-admin" className={linkClass} onClick={closeSidebar}>🏆 Toppers</NavLink>
              <NavLink to="/app/jobs-admin" className={linkClass} onClick={closeSidebar}>💼 Careers</NavLink>
              <NavLink to="/app/contact-admin" className={linkClass} onClick={closeSidebar}>✉️ Website Queries</NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline btn-block" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      <div className="main-area">
        <div className="topbar">
          <button className={'hamburger' + (sidebarOpen ? ' open' : '')} onClick={() => setSidebarOpen((v) => !v)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
          <div className="topbar-right" style={{ marginLeft: 'auto' }}>
            {isAdminOrHr && <NotificationBell />}
            <span className="avatar">{initials(user?.fullName)}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.fullName}</div>
              <div className="text-muted" style={{ fontSize: '0.76rem' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}