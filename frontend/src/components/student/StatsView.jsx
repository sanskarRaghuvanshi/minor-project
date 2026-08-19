import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { calculatePercentage } from '../../utils/eligibility';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import usePolling from '../../hooks/usePolling';

const ProgressCircle = ({ percentage, size = 120 }) => {
  const color = percentage >= 75 ? 'var(--success)' : percentage >= 60 ? 'var(--warning)' : 'var(--danger)';
  const conic = `conic-gradient(${color} ${percentage}%, var(--border) ${percentage}%)`;

  return (
    <div
      className="progress-circle"
      style={{ width: size, height: size, background: conic }}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percentage}% attendance`}
    >
      <div className="progress-circle__value">{percentage}%</div>
    </div>
  );
};

const StatsView = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(() => {
    axiosInstance.get(ENDPOINTS.STUDENT.STATS)
      .then(({ data }) => setStats(data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  usePolling(fetchStats, 30000);

  if (loading) return <Skeleton variant="card" height="400px" />;
  if (error) return <div className="alert alert--error" role="alert">{error}</div>;
  if (!stats) return <EmptyState icon="📊" title="No stats available" />;

  const { overall, subjectWise } = stats;

  return (
    <div className="stats-view">
      <div className="dashboard-home__header">
        <h1>Attendance Stats</h1>
      </div>

      <div className="summary-cards">
        <div className="summary-card card">
          <h3>Total Classes</h3>
          <p className="summary-card__value summary-card__value--primary">{overall.total}</p>
        </div>
        <div className="summary-card card">
          <h3>Present</h3>
          <p className="summary-card__value summary-card__value--green">{overall.present}</p>
        </div>
        <div className="summary-card card">
          <h3>Absent</h3>
          <p className="summary-card__value summary-card__value--red">{overall.absent}</p>
        </div>
        <div className="summary-card card">
          <h3>Overall %</h3>
          <p className={`summary-card__value summary-card__value--${overall.percentage >= 75 ? 'green' : overall.percentage >= 60 ? 'yellow' : 'red'}`}>
            {overall.percentage}%
          </p>
        </div>
      </div>

      <h2 style={{ marginBottom: '16px' }}>Subject-wise Breakdown</h2>

      {subjectWise.length === 0 ? (
        <EmptyState icon="📚" title="No subject data" message="Attendance records will appear here once marked" />
      ) : (
        <div className="subject-cards">
          {subjectWise.map((s) => (
            <div key={s.subject} className="subject-card card">
              <h3 className="subject-card__name">{s.subject}</h3>
              <ProgressCircle percentage={s.percentage} />
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-around', fontSize: '0.875rem' }}>
                <span>P: {s.present}</span>
                <span>A: {s.absent}</span>
                <span>T: {s.total}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatsView;
