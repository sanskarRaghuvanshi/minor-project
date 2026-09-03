import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const facultyLinks = [
  { to: '/faculty/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/faculty/mark-attendance', label: 'Mark Attendance', icon: '✅' },
  { to: '/faculty/defaulters', label: 'Defaulters', icon: '⚠️' },
  { to: '/faculty/feedback-history', label: 'Feedback', icon: '📝' },
];

const coordinatorLinks = [
  { to: '/coordinator/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/coordinator/mark-attendance', label: 'Mark Attendance', icon: '✅' },
  { to: '/coordinator/defaulters', label: 'Defaulters', icon: '⚠️' },
  { to: '/coordinator/feedback-history', label: 'My Feedback', icon: '📝' },
  { to: '/coordinator/leave-requests', label: 'Leave Requests', icon: '📋' },
  { to: '/coordinator/teachers', label: 'Teachers', icon: '👨‍🏫' },
  { to: '/coordinator/students', label: 'Students', icon: '🎓' },
  { to: '/coordinator/feedback', label: 'Class Feedback', icon: '💬' },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/defaulters', label: 'Defaulters', icon: '⚠️' },
];

const studentLinks = [
  { to: '/student/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/student/my-attendance', label: 'My Attendance', icon: '📋' },
  { to: '/student/stats', label: 'Stats', icon: '📈' },
  { to: '/student/eligibility', label: 'Eligibility', icon: '🎯' },
  { to: '/student/apply-leave', label: 'Apply Leave', icon: '✈️' },
  { to: '/student/my-leaves', label: 'My Leaves', icon: '📋' },
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

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={isOpen}
        type="button"
      >
        <span className="hamburger" aria-hidden="true">
          <span /><span /><span />
        </span>
      </button>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`} aria-label="Main navigation">
        <div className="sidebar__header">
          <h2 className="sidebar__title">AttendIQ</h2>
        </div>
        <nav className="sidebar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="sidebar__user-name">{user?.name}</span>
            <span className="sidebar__user-role">{user?.role}</span>
          </div>
          <button className="btn btn--ghost sidebar__logout" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </aside>
      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} role="presentation" />}
    </>
  );
};

export default Sidebar;
