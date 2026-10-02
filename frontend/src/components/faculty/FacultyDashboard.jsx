import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Build assigned classes list (fall back to primary class if assignedClasses not set)
  const assignedClasses = user?.assignedClasses?.length
    ? user.assignedClasses
    : [{ branch: user?.branch, className: user?.className, section: user?.section }];

  const [activeClass, setActiveClass] = useState(assignedClasses[0] || {});

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get(ENDPOINTS.FACULTY.DASHBOARD_STATS, {
        params: {
          branch: activeClass.branch,
          className: activeClass.className,
          section: activeClass.section,
        },
      })
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeClass]);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FA';

  const subjectColors = ['#2563EB', '#059669', '#7C3AED', '#DC2626', '#EA580C', '#0891B2'];

  const getPctColor = (pct) => {
    if (pct >= 75) return '#059669';
    if (pct >= 65) return '#F59E0B';
    return '#EF4444';
  };
  const getPctBg = (pct) => {
    if (pct >= 75) return '#D1FAE5';
    if (pct >= 65) return '#FEF3C7';
    return '#FEE2E2';
  };

  // Real-time backend weekly trends
  const weeklyData = stats?.weeklyTrends || [];

  // Real-time backend cohort distribution
  const health = stats?.healthDistribution || {
    highAttendance: 0,
    safeZone: 0,
    defaulters: stats?.defaulters || 0,
    total: stats?.totalStudents || 1,
  };

  const total = health.total || 1;
  const highPct = Math.round((health.highAttendance / total) * 100);
  const safePct = Math.round((health.safeZone / total) * 100);
  const defPct = Math.round((health.defaulters / total) * 100);

  // Calculate real average percentage
  const avgPct = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((sum, d) => sum + d.percentage, 0) / weeklyData.length)
    : 0;

  return (
    <div style={{ backgroundColor: '#F4F7FC', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>

      {/* 1. Top Welcome Card */}
      <div style={{
        background: '#fff', borderRadius: '24px', padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 4px 16px -2px rgba(15,23,42,0.05)',
        border: '1px solid rgba(226,232,240,0.8)', marginBottom: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#2563EB',
              color: '#fff', fontWeight: 700, fontSize: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
            }}>{initials}</div>
            <span style={{
              position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px',
              borderRadius: '50%', background: '#10B981', border: '2px solid #fff'
            }} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Welcome back,</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {user?.name?.split(' ')[0] || 'Faculty'}
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              {activeClass.branch} • {activeClass.className}{activeClass.section ? ` - ${activeClass.section}` : ''}
            </p>
          </div>
        </div>

        {/* Class Selector — shown when faculty teaches multiple classes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {assignedClasses.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '6px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>school</span>
              <select
                value={`${activeClass.branch}||${activeClass.className}||${activeClass.section}`}
                onChange={(e) => {
                  const [branch, className, section] = e.target.value.split('||');
                  setActiveClass({ branch, className, section });
                }}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
              >
                {assignedClasses.map((ac, i) => (
                  <option key={i} value={`${ac.branch}||${ac.className}||${ac.section}`}>
                    {ac.branch?.split(' ')[0]} • {ac.className} ({ac.section})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{
            padding: '6px 14px', borderRadius: '12px', border: '1px solid #E2E8F0',
            fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
            Faculty • {activeClass.branch}
          </div>
        </div>
      </div>

      {/* Section label updated to show active class */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: '24px', padding: '20px',
              height: '110px', border: '1px solid rgba(226,232,240,0.8)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* 2. Key Metrics Deck */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Faculty Overview</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>Real-time Sync</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Total Students */}
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Students</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#3B82F6' }}>groups</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>{stats.totalStudents ?? 0}</div>
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Active cohort size</span>
              </div>
            </div>

            {/* Classes Taken */}
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Classes Taken</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10B981' }}>event_available</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669', lineHeight: 1 }}>{stats.totalClasses ?? 0}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>Recorded in database</span>
                </div>
              </div>
            </div>

            {/* Defaulters */}
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Defaulters Count</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#F43F5E' }}>warning</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>{stats.defaulters ?? 0}</div>
                <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>Below 75% threshold</span>
              </div>
            </div>
          </div>

          {/* 3. Real-Time Analytics & Visual Graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            {/* Graph Card: Attendance Velocity */}
            <div style={{
              background: '#fff', borderRadius: '24px', padding: '22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    Attendance Analytics
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                    Real-time session percentage trend
                  </p>
                </div>
                {weeklyData.length > 0 && (
                  <span style={{ padding: '3px 10px', borderRadius: '8px', background: '#EFF6FF', color: '#1E50DE', fontSize: '11px', fontWeight: 700 }}>
                    Avg: {avgPct}%
                  </span>
                )}
              </div>

              {weeklyData.length === 0 ? (
                <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#CBD5E1', marginBottom: '6px' }}>bar_chart</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>No attendance sessions recorded yet</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Mark attendance to populate live chart</span>
                </div>
              ) : (
                <>
                  {/* Real-time Bar Graph SVG */}
                  <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', padding: '10px 0 0', borderBottom: '1px dashed #E2E8F0', position: 'relative' }}>
                    
                    {/* 75% Target Line */}
                    <div style={{
                      position: 'absolute', bottom: '75%', left: 0, right: 0,
                      borderTop: '1.5px dashed #F59E0B', zIndex: 1, pointerEvents: 'none'
                    }}>
                      <span style={{ position: 'absolute', right: 0, top: '-16px', fontSize: '9px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '1px 5px', borderRadius: '4px' }}>
                        75% Quota
                      </span>
                    </div>

                    {weeklyData.map((d, i) => {
                      const isHovered = hoveredDay === i;
                      const barColor = d.percentage >= 75 ? '#2563EB' : '#EF4444';
                      return (
                        <div
                          key={d.date || i}
                          onMouseEnter={() => setHoveredDay(i)}
                          onMouseLeave={() => setHoveredDay(null)}
                          style={{
                            flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                            justifyContent: 'flex-end', alignItems: 'center', cursor: 'pointer', position: 'relative'
                          }}
                        >
                          {/* Tooltip on Hover */}
                          {isHovered && (
                            <div style={{
                              position: 'absolute', top: `${Math.max(5, 100 - d.percentage - 25)}%`,
                              background: '#0F172A', color: '#fff', padding: '4px 8px', borderRadius: '6px',
                              fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                            }}>
                              {d.percentage}% ({d.present} / {d.total})
                            </div>
                          )}

                          {/* Bar Fill */}
                          <div style={{
                            width: '100%', maxWidth: '38px', height: `${Math.max(d.percentage, 4)}%`,
                            borderRadius: '10px 10px 4px 4px',
                            background: isHovered ? 'linear-gradient(180deg, #1D4ED8, #3B82F6)' : barColor,
                            transition: 'all 0.25s ease',
                            opacity: hoveredDay !== null && !isHovered ? 0.45 : 1
                          }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Day Labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px 0', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    {weeklyData.map((d, idx) => {
                      const displayDay = d.date
                        ? new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
                        : d.day;
                      return (
                        <span key={d.date || idx} style={{ flex: 1, textAlign: 'center' }}>{displayDay}</span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Distribution Card: Real Cohort Health Status */}
            <div style={{
              background: '#fff', borderRadius: '24px', padding: '22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    Student Attendance Health
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                    Real cohort breakdown
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#2563EB' }}>donut_large</span>
              </div>

              {/* Segmented Progress Breakdown Bar */}
              <div style={{ margin: '14px 0' }}>
                <div style={{ display: 'flex', height: '14px', borderRadius: '100px', overflow: 'hidden', gap: '3px', background: '#F1F5F9' }}>
                  <div style={{ width: `${highPct}%`, background: '#059669', borderRadius: '100px 0 0 100px', minWidth: highPct > 0 ? '6px' : '0' }} title={`High Attendance: ${health.highAttendance}`} />
                  <div style={{ width: `${safePct}%`, background: '#2563EB', minWidth: safePct > 0 ? '6px' : '0' }} title={`Safe Zone: ${health.safeZone}`} />
                  <div style={{ width: `${defPct}%`, background: '#EF4444', borderRadius: '0 100px 100px 0', minWidth: defPct > 0 ? '6px' : '0' }} title={`Defaulters: ${health.defaulters}`} />
                </div>
              </div>

              {/* Legends & Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }} />
                    <span style={{ color: '#334155', fontWeight: 600 }}>High Attendance (&gt;85%)</span>
                  </div>
                  <strong style={{ color: '#0F172A' }}>{health.highAttendance} students</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563EB' }} />
                    <span style={{ color: '#334155', fontWeight: 600 }}>Safe Zone (75% – 84%)</span>
                  </div>
                  <strong style={{ color: '#0F172A' }}>{health.safeZone} students</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                    <span style={{ color: '#334155', fontWeight: 600 }}>Defaulters (&lt;75%)</span>
                  </div>
                  <strong style={{ color: '#EF4444' }}>{health.defaulters} students</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Quick Actions */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Quick Actions</span>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Instant Controls</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* QR Attendance */}
            <button
              type="button"
              onClick={() => navigate('/faculty/qr-generator')}
              style={{
                background: 'linear-gradient(135deg, #2563EB, #3B82F6)', borderRadius: '24px',
                padding: '20px', color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#fff' }}>qr_code_scanner</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>QR Attendance</span>
                    <span style={{ padding: '1px 6px', borderRadius: '4px', background: '#10B981', fontSize: '9px', fontWeight: 700 }}>READY</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(219,234,254,0.9)', marginTop: '2px' }}>Generate live code</p>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', opacity: 0.7 }}>chevron_right</span>
            </button>

            {/* Manual Attendance */}
            <button
              type="button"
              onClick={() => navigate('/faculty/mark-attendance')}
              style={{
                background: '#fff', borderRadius: '24px', padding: '20px',
                border: '1px solid rgba(226,232,240,0.8)', cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#2563EB' }}>edit_square</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Manual Attendance</span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Roll call register</span>
            </button>

            {/* View Defaulters */}
            <button
              type="button"
              onClick={() => navigate('/faculty/defaulters')}
              style={{
                background: '#fff', borderRadius: '24px', padding: '20px',
                border: '1px solid rgba(226,232,240,0.8)', cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#EF4444' }}>assignment_late</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>View Defaulters</span>
              <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>{stats.defaulters ?? 0} flagged students</span>
            </button>
          </div>

          {/* 5. Course-wise Attendance Meters */}
          {stats.subjectStats && stats.subjectStats.length > 0 && (
            <>
              <div style={{ marginBottom: '12px', padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>Course-wise Attendance</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Target criteria: Minimum 75% per course</p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>{stats.subjectStats.length} Courses</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.subjectStats.map((subject, idx) => {
                  const pct = subject.percentage ?? 0;
                  return (
                    <div key={subject.subject} style={{
                      background: '#fff', borderRadius: '24px', padding: '20px',
                      boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: subjectColors[idx % subjectColors.length], display: 'inline-block' }} />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{subject.subject}</span>
                        </div>
                        <span style={{
                          padding: '4px 10px', borderRadius: '10px',
                          background: getPctBg(pct), color: getPctColor(pct),
                          fontSize: '12px', fontWeight: 700
                        }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748B' }}>
                          Lectures: <strong style={{ color: '#334155' }}>{subject.present} conducted</strong> out of {subject.total} planned
                        </p>
                        <div style={{ width: '100%', height: '8px', borderRadius: '100px', background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: '100px', background: getPctColor(pct), transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                      {pct < 75 && (
                        <div style={{
                          marginTop: '12px', borderRadius: '12px', background: '#FFFBEB',
                          padding: '8px 14px', border: '1px solid #FDE68A',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400E', fontWeight: 500 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#F59E0B' }}>warning</span>
                            <span>Batch aggregate below threshold (75%)</span>
                          </div>
                          <button type="button" onClick={() => navigate('/faculty/defaulters')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#92400E', textDecoration: 'underline', fontSize: '12px' }}>
                            View Defaulters
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', textAlign: 'center', color: '#64748B' }}>
          Could not load dashboard stats. Please refresh.
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
