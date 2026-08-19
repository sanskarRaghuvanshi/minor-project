import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get(ENDPOINTS.ADMIN.DASHBOARD_STATS)
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton variant="card" height="300px" />;

  return (
    <div className="dashboard-home">
      <div className="dashboard-home__header">
        <h1>Admin Dashboard</h1>
      </div>
      <div className="stats-grid">
        <div className="stat-card card"><h3>Total Users</h3><p className="stat-card__value">{stats.totalUsers}</p></div>
        <div className="stat-card card"><h3>Students</h3><p className="stat-card__value">{stats.studentsCount}</p></div>
        <div className="stat-card card"><h3>Faculty</h3><p className="stat-card__value">{stats.facultyCount}</p></div>
        <div className="stat-card card"><h3>Branches</h3><p className="stat-card__value">{stats.totalBranches}</p></div>
        <div className="stat-card card"><h3>Attendance Records</h3><p className="stat-card__value">{stats.totalAttendance}</p></div>
        <div className="stat-card card"><h3>Feedbacks</h3><p className="stat-card__value">{stats.totalFeedbacks}</p></div>
        <div className="stat-card card"><h3>Pending Leaves</h3><p className="stat-card__value" style={stats.pendingLeaves > 0 ? { color: 'var(--danger)' } : {}}>{stats.pendingLeaves}</p></div>
      </div>
    </div>
  );
};

export default AdminDashboard;
