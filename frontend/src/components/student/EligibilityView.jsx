import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { calculatePercentage } from '../../utils/eligibility';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import usePolling from '../../hooks/usePolling';

const EligibilityView = () => {
  const [data, setData] = useState([]);
  const [overall, setOverall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEligibility = useCallback(() => {
    axiosInstance.get(ENDPOINTS.STUDENT.ELIGIBILITY)
      .then(({ data: res }) => {
        setData(res.data || []);
        setOverall(res.overall || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load eligibility'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEligibility(); }, [fetchEligibility]);
  usePolling(fetchEligibility, 30000);

  const subjectsBelowThreshold = data.filter((s) => !s.isEligible);

  if (loading) return <Skeleton variant="card" height="400px" />;
  if (error) return <div className="alert alert--error" role="alert">{error}</div>;
  if (data.length === 0) return <EmptyState icon="🎯" title="No data" message="Attendance records needed to calculate eligibility" />;

  return (
    <div className="eligibility-view">
      <div className="dashboard-home__header">
        <h1>Eligibility</h1>
        <p className="text-secondary">Check your attendance eligibility per subject</p>
      </div>

      {subjectsBelowThreshold.length > 0 && (
        <div className="eligibility-banner eligibility-banner--warning" role="alert">
          ⚠️ You are below the 75% threshold in {subjectsBelowThreshold.length} subject(s). Regular attendance is recommended.
        </div>
      )}

      {subjectsBelowThreshold.length === 0 && data.length > 0 && (
        <div className="eligibility-banner eligibility-banner--success" role="alert">
          ✅ You are eligible in all subjects. Keep up the good attendance!
        </div>
      )}

      {overall && (
        <div className="card eligibility-item" style={{ marginBottom: '24px', borderLeft: '4px solid var(--primary)' }}>
          <div className="eligibility-item__header">
            <h3>Overall Attendance</h3>
            <span className={`badge ${overall.isEligible ? 'badge--success' : 'badge--danger'}`}>
              {overall.isEligible ? 'Eligible' : 'Not Eligible'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.875rem' }}>
            <div>
              <span className="text-secondary">Current: </span>
              <strong style={{ color: overall.percentage >= 75 ? 'var(--success)' : overall.percentage >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                {overall.percentage}%
              </strong>
            </div>
            <div><span className="text-secondary">Classes: </span><strong>{overall.present}/{overall.total}</strong></div>
            <div>
              <span className="text-secondary">Needed for 75%: </span>
              <strong>{overall.neededFor75 > 0 ? `${overall.neededFor75} more` : 'Already met'}</strong>
            </div>
          </div>
          {!overall.isEligible && overall.neededFor75 > 0 && (
            <p className="eligibility-item__needed" style={{ marginTop: '8px' }}>
              You need <strong>{overall.neededFor75}</strong> more consecutive present classes overall to reach 75% attendance.
            </p>
          )}
        </div>
      )}

      <div className="eligibility-list">
        {data.map((s) => (
          <div key={s.subject} className="card eligibility-item">
            <div className="eligibility-item__header">
              <h3>{s.subject}</h3>
              <span className={`badge ${s.isEligible ? 'badge--success' : 'badge--danger'}`}>
                {s.isEligible ? 'Eligible' : 'Not Eligible'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.875rem' }}>
              <div>
                <span className="text-secondary">Current: </span>
                <strong style={{ color: s.currentPercentage >= 75 ? 'var(--success)' : s.currentPercentage >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                  {s.currentPercentage}%
                </strong>
              </div>
              <div><span className="text-secondary">Classes: </span><strong>{s.presentClasses}/{s.totalClasses}</strong></div>
              <div>
                <span className="text-secondary">Needed for 75%: </span>
                <strong>{s.neededFor75 > 0 ? `${s.neededFor75} more` : 'Already met'}</strong>
              </div>
            </div>
            {!s.isEligible && s.neededFor75 > 0 && (
              <p className="eligibility-item__needed" style={{ marginTop: '8px' }}>
                You need <strong>{s.neededFor75}</strong> more consecutive present classes to reach 75% in {s.subject}.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EligibilityView;
