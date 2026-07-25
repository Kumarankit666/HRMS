import { useEffect, useState, useRef } from 'react';
import api from '../api/client';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function load() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications);
      setUnread(res.data.data.unread);
    } catch (e) { /* silent */ }
  }

  async function handleOpen() {
    setOpen((v) => !v);
    if (unread > 0) {
      try {
        await api.post('/notifications/mark-read');
        setUnread(0);
      } catch (e) { /* silent */ }
    }
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn-icon" onClick={handleOpen} title="Notifications" style={{ position: 'relative', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff',
            fontSize: '0.62rem', fontWeight: 700, borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center'
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '130%', width: 340, maxHeight: 420, overflowY: 'auto',
          background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 16px 40px rgba(15,13,30,0.18)', zIndex: 200
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>Notifications</div>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>No notifications yet.</div>
          ) : (
            notifications.map((n) => (
              <a
                key={n.id}
                href={n.link || '#'}
                style={{ display: 'block', padding: '12px 16px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'var(--ink)' }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.title}</div>
                {n.message && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{n.message}</div>}
                <div style={{ fontSize: '0.72rem', color: '#a3a1b8', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}