import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';
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
  const isOverallEligible = overall?.isEligible;

  if (loading) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Skeleton variant="card" height="360px" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: '16px', background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', fontWeight: 600 }}>
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: '24px', padding: '48px 20px', textAlign: 'center', border: '1px solid rgba(226,232,240,0.8)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '12px' }}>verified</span>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0F172A', fontWeight: 700 }}>No Eligibility Data</h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Attendance records are needed to calculate exam clearance.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Academic Clearance
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Examination Criteria
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Exam Eligibility Status
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Check your mid-term and end-term exam admittance status based on the 75% attendance rule.
          </p>
        </div>

        <div style={{
          padding: '6px 14px', borderRadius: '12px',
          border: isOverallEligible ? '1px solid #BBF7D0' : '1px solid #FECDD3',
          fontSize: '12px', fontWeight: 700,
          color: isOverallEligible ? '#15803D' : '#E11D48',
          background: isOverallEligible ? '#F0FDF4' : '#FFF1F2',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOverallEligible ? '#15803D' : '#E11D48' }} />
          Exam Admittance: {isOverallEligible ? 'Granted' : 'Conditional / Barred'}
        </div>
      </div>

      {/* Alert Banner */}
      {subjectsBelowThreshold.length > 0 ? (
        <div style={{
          background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '20px',
          padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#E11D48', fontSize: '24px', flexShrink: 0 }}>warning</span>
          <div>
            <strong style={{ display: 'block', fontSize: '13px', color: '#9F1239' }}>
              Attendance Shortage in {subjectsBelowThreshold.length} Course{subjectsBelowThreshold.length > 1 ? 's' : ''}
            </strong>
            <span style={{ fontSize: '12px', color: '#BE123C' }}>
              You are currently below the required 75% threshold in {subjectsBelowThreshold.map((s) => s.subject).join(', ')}. Regular attendance in upcoming lectures is mandatory.
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '20px',
          padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#15803D', fontSize: '24px', flexShrink: 0 }}>check_circle</span>
          <div>
            <strong style={{ display: 'block', fontSize: '13px', color: '#14532D' }}>
              Full Examination Clearance
            </strong>
            <span style={{ fontSize: '12px', color: '#166534' }}>
              You have maintained &ge; 75% attendance across all enrolled subjects. You are eligible to sit for all scheduled examinations.
            </span>
          </div>
        </div>
      )}

      {/* Overall Summary Card */}
      {overall && (
        <div style={{
          background: '#fff', borderRadius: '24px', padding: '24px',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>dashboard</span>
              Cumulative Aggregate Performance
            </h3>
            <span style={{
              padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
              background: overall.isEligible ? '#DCFCE7' : '#FEE2E2',
              color: overall.isEligible ? '#15803D' : '#DC2626'
            }}>
              {overall.isEligible ? 'ELIGIBLE' : 'SHORTAGE'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Current Percentage</span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: overall.percentage >= 75 ? '#059669' : '#EF4444', marginTop: '6px' }}>
                {overall.percentage}%
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Attended / Conducted</span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                {overall.present} / {overall.total}
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Classes Needed for 75%</span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: overall.neededFor75 > 0 ? '#DC2626' : '#059669', marginTop: '6px' }}>
                {overall.neededFor75 > 0 ? `${overall.neededFor75} More` : 'Quota Met ✓'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject-Wise Eligibility Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {data.map((s) => {
          const isEligible = s.isEligible;
          const pct = s.currentPercentage ?? s.percentage ?? 0;
          const needed = s.neededFor75 ?? 0;

          return (
            <div
              key={s.subject}
              style={{
                background: '#fff', borderRadius: '24px', padding: '22px',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '15px', color: '#0F172A', lineHeight: 1.3 }}>{s.subject}</strong>
                  <span style={{
                    padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                    background: isEligible ? '#DCFCE7' : '#FEE2E2',
                    color: isEligible ? '#15803D' : '#DC2626',
                    whiteSpace: 'nowrap'
                  }}>
                    {isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
                  <span>Current Attendance:</span>
                  <strong style={{ color: pct >= 75 ? '#059669' : '#EF4444' }}>{pct}%</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                  <span>Classes Attended:</span>
                  <strong>{s.presentClasses ?? s.present} / {s.totalClasses ?? s.total}</strong>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ height: '8px', width: '100%', borderRadius: '100px', background: '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 75 ? '#2563EB' : '#EF4444', borderRadius: '100px' }} />
                </div>
              </div>

              {/* Needed Counter */}
              <div style={{
                padding: '10px 14px', borderRadius: '12px',
                background: needed > 0 ? '#FFF1F2' : '#F0FDF4',
                border: `1px solid ${needed > 0 ? '#FECDD3' : '#BBF7D0'}`,
                fontSize: '12px', color: needed > 0 ? '#9F1239' : '#14532D', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {needed > 0 ? 'schedule' : 'task_alt'}
                </span>
                {needed > 0
                  ? `Attend next ${needed} consecutive class(es) to reach 75%`
                  : 'Attendance requirement fulfilled for this course'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EligibilityView;
