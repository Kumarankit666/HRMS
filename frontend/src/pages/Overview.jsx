import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="icon">{icon}</div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function Overview() {
  const { user, isAdminOrHr } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  if (!data) return <div className="text-muted">Loading...</div>;

  if (data.view === 'ADMIN_HR') {
    const c = data.cards;
    return (
      <div>
        <div className="content-header">
          <div><h1>Welcome back, {user?.fullName}</h1><p>Here's what's happening across the organization.</p></div>
        </div>

        <div className="stat-grid">
          <StatCard icon="👥" label="Total Employees" value={c.totalEmployees} />
          <StatCard icon="✅" label="Active" value={c.activeEmployees} />
          <StatCard icon="🚫" label="Inactive" value={c.inactiveEmployees} />
          <StatCard icon="📅" label="Present Today" value={c.presentToday} />
          <StatCard icon="⏳" label="Pending Leave" value={c.pendingLeave} />
          <StatCard icon="🏢" label="Departments" value={c.departmentCount} />
          <StatCard icon="🆕" label="New Joiners (30d)" value={c.newJoiners30d} />
        </div>

        <div className="grid-2">
          <div className="card">
            <h3>Department Breakdown</h3>
            {data.departmentBreakdown.length === 0 ? <p className="text-muted mb-0">No data yet.</p> : (
              <table className="hrms-table">
                <tbody>
                  {data.departmentBreakdown.map((d) => (
                    <tr key={d.name}><td>{d.name}</td><td style={{ textAlign: 'right' }}>{d.count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card">
            <h3>Pending Leave Requests</h3>
            {data.recentPendingLeave.length === 0 ? <p className="text-muted mb-0">No pending leave requests.</p> : (
              data.recentPendingLeave.map((l) => (
                <div key={l.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.87rem' }}>
                  <span>{l.employee_code} — {l.leave_type}</span>
                  <span className="text-muted">{l.from_date?.slice(0, 10)} → {l.to_date?.slice(0, 10)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  const c = data.cards;
  return (
    <div>
      <div className="content-header">
        <div><h1>Hi {user?.fullName} 👋</h1><p>Here's your snapshot for this month.</p></div>
      </div>
      <div className="stat-grid">
        <StatCard icon="🌴" label="Leave Balance" value={c.leaveBalance} />
        <StatCard icon="⏳" label="Pending Requests" value={c.pendingLeaveRequests} />
        <StatCard icon="📅" label="Present This Month" value={c.presentThisMonth} />
      </div>
      {data.isManager && data.team && (
        <div className="card">
          <h3>My Team</h3>
          <p className="text-muted mb-0">{data.team.size} direct report(s), {data.team.pendingApprovals} pending approval(s).</p>
        </div>
      )}
    </div>
  );
}
