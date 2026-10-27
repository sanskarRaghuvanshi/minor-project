import { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { isNativePlatform, startStudentBleBeacon, stopStudentBleBeacon, ensureBluetoothEnabled } from '../../utils/bleProximity';

const DeskCheckin = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bleBroadcasting, setBleBroadcasting] = useState(false);
  const [isNative] = useState(() => isNativePlatform());

  const prevIsHoveredRef = useRef(false);
  const pollTimerRef = useRef(null);

  // Poll status from server (acts as live presence heartbeat)
  const checkWalkByStatus = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await axiosInstance.get(ENDPOINTS.STUDENT.WALKBY_STATUS);
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setStatusData(data);

        // Check if just changed from unhovered -> hovered
        if (data.isHovered && !prevIsHoveredRef.current) {
          prevIsHoveredRef.current = true;
          // Purely tactile vibration feedback - ZERO AUDIO
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
          addToast('Attendance marked! Teacher detected your desk.', 'success');
        } else if (data.isHovered) {
          prevIsHoveredRef.current = true;
        } else {
          prevIsHoveredRef.current = false;
        }
      }
    } catch (err) {
      if (!quiet) {
        console.error('Failed to query desk check-in status:', err);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    checkWalkByStatus();
    // Poll every 2.5 seconds (sends heartbeat to radar)
    pollTimerRef.current = setInterval(() => {
      checkWalkByStatus(true);
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [checkWalkByStatus]);

  const [beaconError, setBeaconError] = useState(null);
  const studentBeaconId = user?.rollNumber || user?.email?.split('@')[0] || user?.id || user?._id || 'STUDENT';

  // Turn on Bluetooth BLE Peripheral Advertising on desk
  const activateDeskBeacon = useCallback(async () => {
    if (!isNative || !studentBeaconId) return false;
    setBeaconError(null);
    try {
      await ensureBluetoothEnabled();
      const started = await startStudentBleBeacon(studentBeaconId);
      setBleBroadcasting(!!started);
      if (started) {
        addToast(`BLE Desk Beacon active! ID: ${studentBeaconId}`, 'success');
      }
      return started;
    } catch (err) {
      console.warn('activateDeskBeacon error:', err);
      const msg = err?.message || err?.toString() || 'Bluetooth activation failed';
      setBeaconError(msg);
      addToast(msg.includes('permission') || msg.includes('Nearby') ? 'Please grant Nearby Devices / Bluetooth permission' : msg, 'error');
      setBleBroadcasting(false);
      return false;
    }
  }, [isNative, studentBeaconId, addToast]);

  useEffect(() => {
    let mounted = true;
    if (isNative && studentBeaconId) {
      activateDeskBeacon().then((started) => {
        if (mounted) setBleBroadcasting(!!started);
      });
    }

    return () => {
      mounted = false;
      stopStudentBleBeacon();
      setBleBroadcasting(false);
    };
  }, [isNative, studentBeaconId, activateDeskBeacon]);

  const hasActive = statusData?.hasActiveSession;
  const isHovered = statusData?.isHovered;

  return (
    <div style={{
      maxWidth: '680px', margin: '0 auto', padding: '24px 16px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: '20px',
          background: isHovered ? '#ECFDF5' : hasActive ? '#EFF6FF' : '#F1F5F9',
          color: isHovered ? '#059669' : hasActive ? '#2563EB' : '#64748B',
          fontSize: '12px', fontWeight: 700, marginBottom: '12px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {isHovered ? 'verified' : hasActive ? 'sensors' : 'desk'}
          </span>
          {isHovered ? 'ATTENDANCE VERIFIED' : hasActive ? 'TEACHER RADAR ACTIVE' : 'DESK CHECK-IN STANDBY'}
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
          Desk Proximity Check-in
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748B' }}>
          Place your phone face-up on your desk. Attendance is verified automatically when the teacher hovers past.
        </p>

        {bleBroadcasting ? (
          <div style={{
            marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '12px', background: '#F0FDF4',
            border: '1px solid #BBF7D0', color: '#16A34A', fontSize: '12px', fontWeight: 700
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bluetooth_searching</span>
            BLE Desk Beacon Active • ID: {studentBeaconId}
          </div>
        ) : isNative ? (
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={activateDeskBeacon}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px', background: '#2563EB',
                border: 'none', color: '#FFFFFF', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bluetooth</span>
              Grant Bluetooth Permission & Start Desk Beacon
            </button>
            {beaconError && (
              <p style={{ fontSize: '12px', color: '#EF4444', margin: '6px 0 0', fontWeight: 600 }}>
                {beaconError}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
          <div style={{
            display: 'inline-block', width: '36px', height: '36px',
            border: '3px solid #E2E8F0', borderTopColor: '#2563EB',
            borderRadius: '50%', animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '14px', fontSize: '14px', fontWeight: 600 }}>Connecting to classroom beacon...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : isHovered ? (
        /* Verified Present Card */
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          borderRadius: '24px', padding: '36px 24px', color: '#fff',
          textAlign: 'center', boxShadow: '0 12px 32px rgba(5,150,105,0.3)',
          position: 'relative', overflow: 'hidden',
          animation: 'cardPop 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <style>{`@keyframes cardPop { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>

          {/* Animated checkmark circle */}
          <div style={{
            width: '84px', height: '84px', borderRadius: '50%',
            background: '#FFFFFF', color: '#059669',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', fontWeight: 800 }}>
              check
            </span>
          </div>

          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px'
          }}>
            Proximity Verified (&lt; 0.5m)
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>
            You&apos;re Marked Present!
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: '0 0 24px' }}>
            Teacher verified your desk presence. No scanning needed.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.12)', borderRadius: '16px',
            padding: '18px', textAlign: 'left', display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px',
            border: '1px solid rgba(255,255,255,0.18)'
          }}>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', fontWeight: 600 }}>Subject</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{statusData.subject || 'Class'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', fontWeight: 600 }}>Teacher</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{statusData.faculty || 'Instructor'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', fontWeight: 600 }}>Room</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{statusData.room || 'Classroom'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', fontWeight: 600 }}>Slot</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{statusData.timeSlot || 'Current'}</div>
            </div>
          </div>
        </div>
      ) : hasActive ? (
        /* Teacher Radar Active - Student Waiting */
        <div style={{
          background: '#FFFFFF', borderRadius: '24px', padding: '36px 24px',
          border: '1.5px solid #38BDF8', textAlign: 'center',
          boxShadow: '0 10px 30px rgba(56,189,248,0.15)', position: 'relative'
        }}>
          {/* Concentric Pulsing Radar Visual */}
          <div style={{
            position: 'relative', width: '150px', height: '150px',
            margin: '0 auto 24px', display: 'center', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
              background: 'rgba(56,189,248,0.15)', animation: 'ripplePulse 2.4s infinite'
            }} />
            <div style={{
              position: 'absolute', width: '70%', height: '70%', borderRadius: '50%',
              background: 'rgba(56,189,248,0.25)', animation: 'ripplePulse 2.4s infinite 0.6s'
            }} />
            <div style={{
              position: 'relative', width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(2,132,199,0.35)', margin: '43px auto'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                sensors
              </span>
            </div>
            <style>{`
              @keyframes ripplePulse {
                0% { transform: scale(0.6); opacity: 1; }
                100% { transform: scale(1.4); opacity: 0; }
              }
            `}</style>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            Teacher Is Walking the Room
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '400px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            <strong>{statusData.faculty}</strong> has started the Walk-by Radar for <strong>{statusData.subject}</strong> ({statusData.room}).
            Keep this screen open and your phone on your desk.
          </p>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '12px', background: '#F0F9FF',
            color: '#0284C7', fontSize: '13px', fontWeight: 600, border: '1px solid #BAE6FD'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>desk</span>
            Desk beacon active • Waiting for teacher to hover over your desk (&lt; 0.5m)
          </div>
        </div>
      ) : (
        /* Standby - No Active Session */
        <div style={{
          background: '#FFFFFF', borderRadius: '24px', padding: '36px 24px',
          border: '1px solid #E2E8F0', textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: '#F1F5F9', color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
              hourglass_empty
            </span>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
            No Walk-by Session Active Yet
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Your teacher has not activated the desk radar for <strong>{user?.className} {user?.section ? `(Sec ${user.section})` : ''}</strong> yet.
            This screen updates automatically once class begins.
          </p>

          <button
            type="button"
            onClick={() => checkWalkByStatus()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '10px',
              background: '#F8FAFC', border: '1px solid #CBD5E1',
              fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh Now
          </button>
        </div>
      )}

      {/* Instructions footer card */}
      <div style={{
        marginTop: '24px', padding: '16px 20px', borderRadius: '14px',
        background: '#F8FAFC', border: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', gap: '14px'
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: '#EEF2FF', color: '#4F46E5',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lightbulb</span>
        </div>
        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
          <strong>How Walk-by Proximity Works:</strong> You don&apos;t need to scan any QR code. When you open this screen, your desk beacon turns on. As the teacher hovers within 0.5m of your desk, your attendance is verified.
        </div>
      </div>
    </div>
  );
};

export default DeskCheckin;
