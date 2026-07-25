import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function AppLayout() {
  const { user, logout, isAdminOrHr } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '');

  return (
    <div className="app-shell">
      <aside className={'sidebar' + (sidebarOpen ? ' open' : '')}>
        <div className="sidebar-brand">🏢 MSMG</div>
        <nav className="sidebar-nav">
          <NavLink to="/app" end className={linkClass}>📊 Overview</NavLink>
          <NavLink to="/app/attendance" className={linkClass}>📅 Attendance</NavLink>
          <NavLink to="/app/payroll" className={linkClass}>💰 Payroll</NavLink>
          <NavLink to="/app/documents" className={linkClass}>📁 Documents</NavLink>

          {!isAdminOrHr && (
            <>
              <NavLink to="/app/training" className={linkClass}>🎓 Training</NavLink>
              <NavLink to="/app/consent" className={linkClass}>✍️ Consent & Policies</NavLink>
              <NavLink to="/app/leave" className={linkClass}>🛫 Leave</NavLink>
              {user?.isManager && <NavLink to="/app/team-leave" className={linkClass}>👥 Team Approvals</NavLink>}
              {user?.isManager && <NavLink to="/app/attendance-approvals" className={linkClass}>📋 Attendance Corrections</NavLink>}
            </>
          )}

          {isAdminOrHr && (
            <>
              <div className="sidebar-section-label">HR</div>
              <NavLink to="/app/employees" className={linkClass}>👤 Employees</NavLink>
              <NavLink to="/app/onboarding-review" className={linkClass}>📝 Onboarding</NavLink>
              <NavLink to="/app/leave-approvals" className={linkClass}>✅ Leave Approvals</NavLink>
              <NavLink to="/app/attendance-approvals" className={linkClass}>📋 Attendance Corrections</NavLink>
              <NavLink to="/app/offer-letters" className={linkClass}>📄 Offer Letters</NavLink>
              <NavLink to="/app/training-admin" className={linkClass}>🎓 Training</NavLink>
              <NavLink to="/app/policies-admin" className={linkClass}>📜 Policy Documents</NavLink>
              <NavLink to="/app/faculty-admin" className={linkClass}>🎓 Faculty (Website)</NavLink>
              <NavLink to="/app/toppers-admin" className={linkClass}>🏆 Toppers (Website)</NavLink>
              <NavLink to="/app/jobs-admin" className={linkClass}>💼 Careers (Website)</NavLink>
              <NavLink to="/app/contact-admin" className={linkClass}>✉️ Website Queries</NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline btn-block" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
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