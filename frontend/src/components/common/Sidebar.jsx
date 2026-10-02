import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const facultyLinks = [
  { to: '/faculty/dashboard', label: 'Dashboard', icon: 'grid_view' },
  { to: '/faculty/mark-attendance', label: 'Mark Attendance', icon: 'check_box' },
  { to: '/faculty/defaulters', label: 'Defaulters', icon: 'warning' },
  { to: '/faculty/settings', label: 'Settings', icon: 'settings' },
];

const coordinatorLinks = [
  { to: '/coordinator/dashboard', label: 'Dashboard', icon: 'grid_view' },
  { to: '/coordinator/mark-attendance', label: 'Mark Attendance', icon: 'check_box' },
  { to: '/coordinator/defaulters', label: 'Defaulters', icon: 'warning' },
  { to: '/coordinator/teachers', label: 'Teachers', icon: 'supervisor_account' },
  { to: '/coordinator/students', label: 'Students', icon: 'school' },
  { to: '/coordinator/feedback', label: 'Class Feedback', icon: 'forum' },
  { to: '/coordinator/leave-requests', label: 'Leave Requests', icon: 'event_busy' },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid_view' },
  { to: '/admin/users', label: 'Users', icon: 'group' },
  { to: '/admin/defaulters', label: 'Defaulters', icon: 'warning' },
];

const studentLinks = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'grid_view' },
  { to: '/student/my-attendance', label: 'My Attendance', icon: 'calendar_month' },
  { to: '/student/stats', label: 'Stats', icon: 'analytics' },
  { to: '/student/eligibility', label: 'Eligibility', icon: 'verified' },
  { to: '/student/scan', label: 'Scan Attendance', icon: 'qr_code_scanner' },
  { to: '/student/apply-leave', label: 'Apply Leave', icon: 'flight_takeoff' },
  { to: '/student/my-leaves', label: 'My Leaves', icon: 'description' },
  { to: '/student/settings', label: 'Settings', icon: 'settings' },
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === 'faculty'
    ? facultyLinks
    : user?.role === 'coordinator'
      ? coordinatorLinks
      : user?.role === 'admin'
        ? adminLinks
        : studentLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const roleSubtitle = user?.role === 'faculty'
    ? 'Smart Faculty Portal'
    : user?.role === 'student'
      ? 'Smart Student Portal'
      : user?.role === 'coordinator'
        ? 'Smart Coordinator Portal'
        : 'Smart Admin Portal';

  return (
    <>
      {/* Mobile Toggle Button (hidden on desktop via CSS) */}
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={isOpen}
        type="button"
      >
        <span className="material-symbols-outlined" style={{ color: '#1E293B', fontSize: '22px' }}>
          {isOpen ? 'close' : 'menu'}
        </span>
      </button>

      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
        aria-label="Main navigation"
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px',
          background: '#FFFFFF', color: '#0F172A', zIndex: 500,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #E2E8F0', fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)'
        }}
      >
        {/* Brand / Logo Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo Badge */}
          <div style={{
            position: 'relative', width: '42px', height: '42px', borderRadius: '50%',
            background: '#1E50DE', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0, boxShadow: '0 2px 8px rgba(30,80,222,0.3)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>school</span>
            <span style={{
              position: 'absolute', bottom: '-2px', right: '-2px', width: '15px', height: '15px',
              borderRadius: '50%', background: '#10B981', border: '2px solid #FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '10px', color: '#fff', fontWeight: 800 }}>check</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em' }}>AttendIQ</span>
              <span style={{ padding: '2px 6px', borderRadius: '6px', background: '#D1FAE5', color: '#059669', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>LIVE</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8', marginTop: '1px' }}>{roleSubtitle}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '16px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 16px', borderRadius: '16px', textDecoration: 'none',
                fontSize: '13px', fontWeight: isActive ? 700 : 600,
                transition: 'all 0.15s ease',
                background: isActive ? '#EBF3FF' : 'transparent',
                color: isActive ? '#1E50DE' : '#64748B',
                boxShadow: isActive ? '0 1px 3px rgba(30,80,222,0.12)' : 'none'
              })}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Footer Profile Card */}
        <div style={{ padding: '16px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', background: '#2563EB',
                color: '#fff', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'User'}
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', textTransform: 'capitalize' }}>
                  {user?.role || ''}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const target = user?.role === 'student' ? '/student/settings' : '/faculty/settings';
                navigate(target);
                setIsOpen(false);
              }}
              type="button"
              title="Settings Terminal"
              style={{
                width: '32px', height: '32px', borderRadius: '10px', background: '#FFFFFF',
                border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            type="button"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: '#FFF1F2', color: '#E11D48', fontSize: '12px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'background 0.15s'
            }}
          >
            <span>Exit Portal</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          role="presentation"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)', zIndex: 450
          }}
        />
      )}
    </>
  );
};

export default Sidebar;
