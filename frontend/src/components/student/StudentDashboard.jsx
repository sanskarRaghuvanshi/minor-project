import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';
import usePolling from '../../hooks/usePolling';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    axiosInstance.get(ENDPOINTS.STUDENT.STATS)
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  usePolling(fetchStats, 30000);

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
              <h3>Total Classes</h3>
              <p className="stat-card__value stat-card__value--primary">{stats.overall.total}</p>
            </div>
            <div className="stat-card card">
              <h3>Present</h3>
              <p className="stat-card__value stat-card__value--green">{stats.overall.present}</p>
            </div>
            <div className="stat-card card">
              <h3>Absent</h3>
              <p className="stat-card__value stat-card__value--red">{stats.overall.absent}</p>
            </div>
            <div className="stat-card card">
              <h3>Overall %</h3>
              <p className={`stat-card__value stat-card__value--${stats.overall.percentage >= 75 ? 'green' : stats.overall.percentage >= 60 ? 'yellow' : 'red'}`}>
                {stats.overall.percentage}%
              </p>
            </div>
          </div>

          {stats.subjectWise.length > 0 && (
            <div className="subject-mini-list" style={{ marginTop: '24px' }}>
              <h2 style={{ marginBottom: '12px' }}>Subject-wise Attendance</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Present</th>
                      <th>Total</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.subjectWise.map((s) => (
                      <tr key={s.subject}>
                        <td>{s.subject}</td>
                        <td>{s.present}</td>
                        <td>{s.total}</td>
                        <td>
                          <span className={`badge ${s.percentage >= 75 ? 'badge--success' : s.percentage >= 60 ? 'badge--warning' : 'badge--danger'}`}>
                            {s.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="welcome-card card">
          <p>No attendance records yet. Check back after your faculty marks attendance.</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
