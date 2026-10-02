import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import Skeleton from '../common/Skeleton';
import usePolling from '../../hooks/usePolling';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { Html5Qrcode } from 'html5-qrcode';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQrUpload, setShowQrUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, attendanceRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.STUDENT.STATS),
        axiosInstance.get(ENDPOINTS.STUDENT.MY_ATTENDANCE, { params: { limit: 50 } }),
      ]);
      setStats(statsRes.data.data);
      setRecentRecords(attendanceRes.data.data || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  usePolling(fetchDashboardData, 30000);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast?.('Please upload an image file', 'error');
      return;
    }

    setUploading(true);
    event.target.value = '';

    let html5Qrcode = null;
    try {
      html5Qrcode = new Html5Qrcode('qr-upload-reader');
      const result = await html5Qrcode.scanFile(file, true);

      if (result) {
        const qrData = JSON.parse(result);
        const sessionToken = qrData.sessionToken;

        if (!sessionToken) {
          throw new Error('Invalid QR code format');
        }

        await axiosInstance.post(ENDPOINTS.STUDENT.SCAN_ATTENDANCE, {
          sessionToken,
        });

        addToast?.('Attendance marked successfully via QR code!', 'success');
        setShowQrUpload(false);
        fetchDashboardData();
      } else {
        throw new Error('No QR code found in image');
      }
    } catch (err) {
      let errorMessage = 'Failed to read QR code from image';
      if (err.response?.data?.errorCode === 'ALREADY_SCANNED') {
        errorMessage = 'You have already scanned this QR code';
      } else if (err.response?.data?.errorCode === 'INVALID_QR') {
        errorMessage = 'Invalid or expired QR code';
      } else if (err.response?.data?.errorCode === 'FORBIDDEN') {
        errorMessage = 'You are not enrolled in this class';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      addToast?.(errorMessage, 'error');
    } finally {
      if (html5Qrcode) {
        try { html5Qrcode.clear(); } catch (_) { /* ignore */ }
      }
      setUploading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST';

  // Compute daily trends for the last 7 distinct session dates from recentRecords
  const dateMap = new Map();
  recentRecords.forEach((r) => {
    if (!r.date) return;
    const dateStr = new Date(r.date).toISOString().split('T')[0];
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { date: dateStr, total: 0, present: 0 });
    }
    const entry = dateMap.get(dateStr);
    entry.total += 1;
    if (r.status === 'present' || r.status === 'excused') {
      entry.present += 1;
    }
  });

  const weeklyData = Array.from(dateMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map((d) => {
      const dateObj = new Date(`${d.date}T00:00:00`);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const percentage = d.total === 0 ? 0 : Math.round((d.present / d.total) * 100);
      return {
        ...d,
        day: dayName,
        percentage,
      };
    });

  const overallPct = stats?.overall?.percentage ?? 0;
  const isDefaulter = overallPct < 75;
  const neededClasses = stats?.overall?.total
    ? Math.max(0, Math.ceil((0.75 * stats.overall.total - stats.overall.present) / 0.25))
    : 0;

  return (
    <div style={{ backgroundColor: '#F4F7FC', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      {/* Hidden element for Html5Qrcode.scanFile() */}
      <div id="qr-upload-reader" style={{ display: 'none' }} />

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
            }}>
              {initials}
            </div>
            <span style={{
              position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px',
              borderRadius: '50%', background: isDefaulter ? '#EF4444' : '#10B981', border: '2px solid #fff'
            }} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Student Portal,</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {user?.name || 'Student'}
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              {user?.branch} • {user?.className}{user?.section ? ` - ${user.section}` : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '6px 14px', borderRadius: '12px',
            border: isDefaulter ? '1px solid #FECDD3' : '1px solid #BBF7D0',
            fontSize: '12px', fontWeight: 700,
            color: isDefaulter ? '#E11D48' : '#15803D',
            background: isDefaulter ? '#FFF1F2' : '#F0FDF4',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isDefaulter ? '#E11D48' : '#15803D' }} />
            {isDefaulter ? 'Defaulter Warning (<75%)' : 'Eligible & Safe Zone (≥75%)'}
          </span>
        </div>
      </div>

      {/* Defaulter Alert Box */}
      {isDefaulter && (
        <div style={{
          background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '20px',
          padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: '#E11D48', fontSize: '22px' }}>warning</span>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '13px', color: '#9F1239' }}>
                Attendance Shortage Notice ({overallPct}%)
              </strong>
              <span style={{ fontSize: '12px', color: '#BE123C' }}>
                You are currently below the required 75% threshold. You must attend the next <strong>{neededClasses} consecutive class(es)</strong> to regain exam clearance.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/eligibility')}
            style={{
              padding: '8px 16px', borderRadius: '10px', background: '#E11D48', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700
            }}
          >
            Check Criteria
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '24px', padding: '20px', height: '110px', border: '1px solid rgba(226,232,240,0.8)' }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* 2. Key Metrics Deck */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Overall Attendance Summary</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>Real-time Sync</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Overall Percentage */}
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Overall Attendance</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: isDefaulter ? '#FFF1F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isDefaulter ? '#EF4444' : '#3B82F6' }}>percent</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: isDefaulter ? '#EF4444' : '#2563EB', lineHeight: 1 }}>{overallPct}%</div>
                <span style={{ fontSize: '11px', color: isDefaulter ? '#EF4444' : '#64748B', marginTop: '4px', display: 'block' }}>
                  Target: 75% required
                </span>
              </div>
            </div>

            {/* Total Classes */}
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Conducted</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748B' }}>school</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{stats.overall.total}</div>
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Total lecture periods</span>
              </div>
            </div>

            {/* Present Classes */}
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Attended (Present)</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10B981' }}>check_circle</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669', lineHeight: 1 }}>{stats.overall.present}</div>
                <span style={{ fontSize: '11px', color: '#059669', marginTop: '4px', display: 'block' }}>Valid attendance marks</span>
              </div>
            </div>

            {/* Absent Classes */}
            <div style={{ background: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Missed (Absent)</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#F43F5E' }}>cancel</span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>{stats.overall.absent}</div>
                <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>Missed lectures</span>
              </div>
            </div>
          </div>

          {/* 3. Real-Time Analytics & Quick Actions Dock */}
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
                    Attendance Velocity
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                    Daily percentage trends over recent sessions
                  </p>
                </div>
                {weeklyData.length > 0 && (
                  <span style={{ padding: '3px 10px', borderRadius: '8px', background: '#EFF6FF', color: '#1E50DE', fontSize: '11px', fontWeight: 700 }}>
                    Avg: {Math.round(weeklyData.reduce((s, d) => s + d.percentage, 0) / (weeklyData.length || 1))}%
                  </span>
                )}
              </div>

              {weeklyData.length === 0 ? (
                <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#CBD5E1', marginBottom: '6px' }}>bar_chart</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>No attendance sessions recorded yet</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Your attendance velocity chart will populate here</span>
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
                            width: '100%', maxWidth: '38px', height: `${Math.max(d.percentage, 6)}%`,
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
                    {weeklyData.map((d, idx) => (
                      <span key={d.date || idx} style={{ flex: 1, textAlign: 'center' }}>{d.day}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions Dock */}
            <div style={{
              background: '#fff', borderRadius: '24px', padding: '22px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Quick Actions
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#94A3B8' }}>
                  Immediate student attendance shortcuts
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Primary: Live Camera Scan */}
                  <button
                    type="button"
                    onClick={() => navigate('/student/scan')}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '14px',
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>qr_code_scanner</span>
                      <span>Scan Live QR (Camera)</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                  </button>

                  {/* Secondary: Upload Screenshot */}
                  <button
                    type="button"
                    onClick={() => setShowQrUpload(true)}
                    style={{
                      width: '100%', padding: '11px 16px', borderRadius: '14px',
                      background: '#F8FAFC', color: '#0F172A',
                      border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '20px' }}>upload_file</span>
                      <span>Upload QR Screenshot</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: '#94A3B8', fontSize: '18px' }}>chevron_right</span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/student/my-attendance')}
                      style={{
                        padding: '10px', borderRadius: '12px', background: '#F8FAFC',
                        border: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>calendar_month</span>
                      Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/student/eligibility')}
                      style={{
                        padding: '10px', borderRadius: '12px', background: '#F8FAFC',
                        border: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10B981' }}>verified</span>
                      Eligibility
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Subject-Wise Attendance Progress */}
          {stats.subjectWise.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: '24px', padding: '24px',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    Course Attendance Breakdown
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                    Individual performance across registered subjects
                  </p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                  {stats.subjectWise.length} Course{stats.subjectWise.length > 1 ? 's' : ''} Enrolled
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {stats.subjectWise.map((s) => {
                  const isSubjDefaulter = s.percentage < 75;
                  const barColor = s.percentage >= 75 ? '#2563EB' : s.percentage >= 65 ? '#F59E0B' : '#EF4444';
                  const badgeBg = s.percentage >= 75 ? '#EFF6FF' : s.percentage >= 65 ? '#FEF3C7' : '#FEE2E2';
                  const badgeColor = s.percentage >= 75 ? '#1E50DE' : s.percentage >= 65 ? '#D97706' : '#DC2626';

                  return (
                    <div
                      key={s.subject}
                      style={{
                        padding: '16px', borderRadius: '16px', background: '#F8FAFC',
                        border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <strong style={{ fontSize: '14px', color: '#0F172A', lineHeight: 1.3 }}>{s.subject}</strong>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: badgeBg, color: badgeColor, fontSize: '11px', fontWeight: 800 }}>
                          {s.percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div style={{ height: '8px', width: '100%', borderRadius: '100px', background: '#E2E8F0', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(s.percentage, 100)}%`, background: barColor, borderRadius: '100px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                        <span>Present: <strong style={{ color: '#059669' }}>{s.present}</strong> / {s.total}</span>
                        {isSubjDefaulter ? (
                          <span style={{ color: '#EF4444', fontWeight: 700 }}>Shortage</span>
                        ) : (
                          <span style={{ color: '#10B981', fontWeight: 700 }}>Eligible</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* QR Screenshot Upload Modal */}
          <Modal
            isOpen={showQrUpload}
            onClose={() => setShowQrUpload(false)}
            title="Upload QR Code Screenshot"
            size="md"
          >
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '12px', background: '#2563EB', color: '#fff',
                  fontSize: '13px', fontWeight: 700
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_library</span>
                  Choose Screenshot Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {uploading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#2563EB', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  <p style={{ color: '#64748B', margin: 0, fontSize: '13px' }}>Scanning QR code from uploaded image...</p>
                </div>
              )}

              {!uploading && (
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Take a screenshot or photo of the attendance QR code displayed by your faculty member, then upload it to mark roll call automatically.
                </p>
              )}
            </div>
          </Modal>
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '40px 20px', textAlign: 'center', border: '1px solid rgba(226,232,240,0.8)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '12px' }}>event_note</span>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0F172A', fontWeight: 700 }}>No Attendance Records Yet</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Your faculty has not marked any roll call sessions for your section yet.</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
