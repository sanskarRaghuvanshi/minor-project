import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';
import usePolling from '../../hooks/usePolling';

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

  if (!stats) {
    return (
      <div style={{ background: '#fff', borderRadius: '24px', padding: '48px 20px', textAlign: 'center', border: '1px solid rgba(226,232,240,0.8)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '12px' }}>analytics</span>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0F172A', fontWeight: 700 }}>No Attendance Data Available</h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Check back after your faculty has marked attendance sessions.</p>
      </div>
    );
  }

  const { overall, subjectWise } = stats;
  const isDefaulter = overall.percentage < 75;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Analytics Dashboard
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Performance Metrics
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Attendance Statistics
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Detailed percentage analysis and subject-by-subject distribution.
          </p>
        </div>

        <div style={{
          padding: '6px 14px', borderRadius: '12px',
          border: isDefaulter ? '1px solid #FECDD3' : '1px solid #BBF7D0',
          fontSize: '12px', fontWeight: 700,
          color: isDefaulter ? '#E11D48' : '#15803D',
          background: isDefaulter ? '#FFF1F2' : '#F0FDF4',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isDefaulter ? '#E11D48' : '#15803D' }} />
          Overall Status: {isDefaulter ? 'Defaulter' : 'Clear & Eligible'}
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Overall Attendance</span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: isDefaulter ? '#EF4444' : '#2563EB', marginTop: '12px', lineHeight: 1 }}>
            {overall.percentage}%
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>75% required target</span>
        </div>

        <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Conducted</span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginTop: '12px', lineHeight: 1 }}>
            {overall.total}
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Total lecture sessions</span>
        </div>

        <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Present Classes</span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669', marginTop: '12px', lineHeight: 1 }}>
            {overall.present}
          </div>
          <span style={{ fontSize: '11px', color: '#059669', marginTop: '4px', display: 'block' }}>Recorded present</span>
        </div>

        <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Absent Classes</span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#EF4444', marginTop: '12px', lineHeight: 1 }}>
            {overall.absent}
          </div>
          <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>Missed lectures</span>
        </div>
      </div>

      {/* Subject-Wise Cards */}
      <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              Subject Performance Cards
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              Individual attendance breakdown by course
            </p>
          </div>
        </div>

        {subjectWise.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: '13px' }}>
            No subject data available.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {subjectWise.map((s) => {
              const isSubjClear = s.percentage >= 75;
              const barColor = isSubjClear ? '#2563EB' : s.percentage >= 65 ? '#F59E0B' : '#EF4444';
              const badgeBg = isSubjClear ? '#EFF6FF' : s.percentage >= 65 ? '#FEF3C7' : '#FEE2E2';
              const badgeColor = isSubjClear ? '#1E50DE' : s.percentage >= 65 ? '#D97706' : '#DC2626';

              return (
                <div
                  key={s.subject}
                  style={{
                    padding: '20px', borderRadius: '20px', background: '#F8FAFC',
                    border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px', color: '#0F172A', lineHeight: 1.3 }}>{s.subject}</strong>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>Total: {s.total} periods</span>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: badgeBg, color: badgeColor, fontSize: '12px', fontWeight: 800 }}>
                      {s.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div style={{ height: '8px', width: '100%', borderRadius: '100px', background: '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(s.percentage, 100)}%`, background: barColor, borderRadius: '100px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', paddingTop: '8px', borderTop: '1px solid #EEF2F6' }}>
                    <span>Present: <strong style={{ color: '#059669' }}>{s.present}</strong></span>
                    <span>Absent: <strong style={{ color: '#EF4444' }}>{s.absent}</strong></span>
                    <span style={{ fontWeight: 700, color: isSubjClear ? '#10B981' : '#EF4444' }}>
                      {isSubjClear ? 'Clear ✓' : 'Shortage ⚠️'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsView;
