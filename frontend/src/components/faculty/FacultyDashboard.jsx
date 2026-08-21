import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get(ENDPOINTS.FACULTY.DASHBOARD_STATS)
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-home">
      <div className="dashboard-home__header">
        <h1>Welcome, {user?.name}</h1>
        <p className="text-secondary">{user?.branch} - {user?.className}{user?.section ? ` - ${user.section}` : ''}</p>
      </div>

      {loading ? (
        <Skeleton variant="card" height="200px" />
      ) : stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card card">
              <h3>Total Students</h3>
              <p className="stat-card__value stat-card__value--primary">{stats.totalStudents}</p>
            </div>
            <div className="stat-card card">
              <h3>Classes Taken</h3>
              <p className="stat-card__value stat-card__value--green">{stats.totalClasses}</p>
            </div>
            <div className="stat-card card">
              <h3>Defaulters</h3>
              <p className="stat-card__value stat-card__value--red">{stats.defaulters}</p>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate('/faculty/qr-generator')}
                style={{ flex: 1, minWidth: '200px', padding: '16px', fontSize: '1rem' }}
              >
                📷 QR Attendance
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate('/faculty/mark-attendance')}
                style={{ flex: 1, minWidth: '200px', padding: '16px', fontSize: '1rem' }}
              >
                ✏️ Manual Attendance
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate('/faculty/defaulters')}
                style={{ flex: 1, minWidth: '200px', padding: '16px', fontSize: '1rem' }}
              >
                ⚠️ View Defaulters
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="welcome-card card">
          <p>Could not load dashboard stats.</p>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
