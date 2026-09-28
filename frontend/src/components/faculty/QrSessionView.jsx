import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const QrSessionView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const fetchSession = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axiosInstance.get(ENDPOINTS.FACULTY.QR_SESSION(token));
      setSession(data.data);
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Failed to load session', 'error');
      navigate('/faculty/dashboard');
    } finally {
      setLoading(false);
    }
  }, [token, addToast, navigate]);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEndSession = async () => {
    if (!window.confirm('End this QR session? Students will no longer be able to scan.')) return;
    try {
      await axiosInstance.post(ENDPOINTS.FACULTY.QR_END(token));
      addToast?.('Session ended and locked successfully', 'success');
      navigate('/faculty/dashboard');
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Failed to end session', 'error');
    }
  };

  const copyToken = () => {
    if (session?.sessionToken) {
      navigator.clipboard.writeText(session.sessionToken);
      addToast?.('Token copied to clipboard', 'success');
    }
  };

  const scannedList = session?.scannedStudents || [];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: session?.isActive ? '#D1FAE5' : '#F1F5F9', color: session?.isActive ? '#059669' : '#64748B', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: session?.isActive ? '#10B981' : '#94A3B8', animation: session?.isActive ? 'pulse 1s infinite' : 'none' }} />
              {session?.isActive ? 'Active Broadcast' : 'Session Ended'}
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              {session?.subject} • {session?.className}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Live QR Session Monitor
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/faculty/dashboard')}
            style={{
              padding: '8px 16px', borderRadius: '12px', background: '#fff', color: '#475569',
              border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: '12px', fontWeight: 600
            }}
          >
            Back to Dashboard
          </button>
          {session?.isActive && (
            <button
              type="button"
              onClick={handleEndSession}
              style={{
                padding: '8px 16px', borderRadius: '12px', background: '#EF4444', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(239,68,68,0.25)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
              Done & Lock Attendance
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s infinite', display: 'block', marginBottom: '10px' }}>sync</span>
          Connecting to session...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Projected QR Display */}
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '28px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>qr_code_scanner</span>
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Scan to Mark Attendance
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#64748B' }}>
              {session?.className} • {session?.subject}
            </p>

            <div style={{
              padding: '16px', background: '#F8FAFC', borderRadius: '20px',
              border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
              marginBottom: '16px'
            }}>
              <QRCodeSVG
                value={JSON.stringify({
                  sessionToken: session?.sessionToken,
                  subject: session?.subject,
                  date: session?.date,
                })}
                size={230}
                level="M"
                includeMargin={true}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '280px', padding: '0 8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Refreshing ({countdown}s)
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#1E50DE', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }}>
                #{session?.sessionToken?.slice(-6).toUpperCase()}
              </span>
            </div>

            <button
              type="button"
              onClick={copyToken}
              style={{
                marginTop: '16px', padding: '6px 14px', borderRadius: '10px',
                background: '#F1F5F9', border: 'none', color: '#475569', fontSize: '11px',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
              Copy Session Token
            </button>
          </div>

          {/* Right Column: Live Scanned Students Feed */}
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '24px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Live Attendance Feed
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                  Students checked in real-time
                </p>
              </div>
              <div style={{ padding: '4px 12px', borderRadius: '100px', background: '#ECFDF5', color: '#059669', fontSize: '12px', fontWeight: 800 }}>
                {scannedList.length} Checked In
              </div>
            </div>

            {scannedList.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8', margin: 'auto' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#CBD5E1', display: 'block', marginBottom: '8px' }}>hourglass_top</span>
                <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>Waiting for student scans...</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Students should open student app and scan the QR code</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px' }}>
                {scannedList.map((item, idx) => {
                  const student = item.student || {};
                  return (
                    <div
                      key={student._id || idx}
                      style={{
                        padding: '10px 14px', borderRadius: '14px', background: '#FAFCFF',
                        border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '10px',
                          background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '13px', color: '#0F172A' }}>
                            {student.name || 'Student'}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                            {student.email || ''}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', background: '#D1FAE5',
                        color: '#059669', fontSize: '11px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span>
                        Present
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QrSessionView;