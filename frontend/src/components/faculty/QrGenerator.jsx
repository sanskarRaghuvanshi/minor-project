import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { LECTURE_SLOTS } from '../../utils/timetableSlots';

const POPULAR_ROOMS = [
  'Room B05',
  'Room 101',
  'Room 102',
  'Room 103',
  'Room 201',
  'Room 202',
  'Room 301',
  'Computer Lab 1',
  'Computer Lab 2',
  'Electronics Lab',
  'Seminar Hall A',
];

const QrGenerator = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(LECTURE_SLOTS[0]?.id || 'slot-1');
  const [room, setRoom] = useState('Room B05');
  const [customRoom, setCustomRoom] = useState('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);

  // Geo-fencing state
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [location, setLocation] = useState(null);
  const [locStatus, setLocStatus] = useState('idle'); // 'idle' | 'detecting' | 'ready' | 'denied' | 'unsupported'

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const subjects = user?.subjects || [];

  const acquireLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus('unsupported');
      return;
    }
    setLocStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
        });
        setLocStatus('ready');
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setLocStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  const fetchActiveSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);
    try {
      const { data } = await axiosInstance.get(ENDPOINTS.FACULTY.QR_ACTIVE);
      setActiveSessions(data.data || []);
    } catch (err) {
      console.error('Failed to fetch active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  useEffect(() => {
    if (subjects.length > 0 && !subject) {
      setSubject(subjects[0]);
    }
  }, [subjects, subject]);

  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  const handleGenerate = async () => {
    if (!subject) {
      addToast?.('Please select a subject', 'warning');
      return;
    }

    const effectiveRoom = isCustomRoom ? customRoom.trim() || 'Room B05' : room;
    const slotObj = LECTURE_SLOTS.find((s) => s.id === selectedSlot) || LECTURE_SLOTS[0];

    setLoading(true);
    try {
      const payload = {
        subject,
        date,
        slotNumber: slotObj?.slotNumber || 1,
        timeSlot: slotObj?.timeRange || '09:45 - 10:35',
        room: effectiveRoom,
        radius: 50, // 50m classroom radius
      };

      if (geoEnabled && location?.lat != null && location?.lng != null) {
        payload.lat = location.lat;
        payload.lng = location.lng;
      }

      const { data } = await axiosInstance.post(ENDPOINTS.FACULTY.QR_GENERATE, payload);

      setSessionData(data.data);
      setGenerated(true);
      addToast?.(
        data.data?.session?.geoFencingEnabled
          ? `QR generated for ${effectiveRoom} with 50m Geo-Fence!`
          : 'QR session generated successfully!',
        'success',
      );
      fetchActiveSessions();
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Failed to generate QR code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (sessionData?.sessionToken) {
      navigator.clipboard.writeText(sessionData.sessionToken);
      addToast?.('Session token copied to clipboard', 'success');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: '100px',
                background: '#EFF6FF',
                color: '#1E50DE',
                border: '1px solid #DBEAFE',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Live QR Scanner Module
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
              {user?.branch} • {user?.className}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            QR Attendance
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Generate live dynamic QR codes with automatic 50m classroom geo-fencing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/faculty/mark-attendance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '12px',
            background: '#fff',
            color: '#475569',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>
            edit_square
          </span>
          Switch to Manual Register
        </button>
      </div>

      {/* Generate Session Configuration Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          border: '1px solid rgba(226,232,240,0.8)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
            Configure New QR Session
          </h3>

          {/* Geo-fencing Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '10px',
              background:
                locStatus === 'ready' && geoEnabled
                  ? '#ECFDF5'
                  : locStatus === 'detecting'
                  ? '#FEF3C7'
                  : '#F1F5F9',
              border: `1px solid ${
                locStatus === 'ready' && geoEnabled
                  ? '#BBF7D0'
                  : locStatus === 'detecting'
                  ? '#FDE68A'
                  : '#E2E8F0'
              }`,
              fontSize: '11px',
              fontWeight: 700,
              color:
                locStatus === 'ready' && geoEnabled
                  ? '#059669'
                  : locStatus === 'detecting'
                  ? '#D97706'
                  : '#64748B',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', color: locStatus === 'ready' && geoEnabled ? '#059669' : '#64748B' }}
            >
              {locStatus === 'ready' && geoEnabled ? 'pin_drop' : 'location_searching'}
            </span>
            <span>
              {locStatus === 'ready' && geoEnabled
                ? `GPS Active (50m Radius • ±${location?.accuracy || 0}m)`
                : locStatus === 'detecting'
                ? 'Acquiring GPS...'
                : locStatus === 'denied'
                ? 'Location Denied (Geo-fence disabled)'
                : 'Geo-fencing Off'}
            </span>
            {locStatus !== 'detecting' && (
              <button
                type="button"
                onClick={acquireLocation}
                title="Refresh GPS location"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2563EB',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  refresh
                </span>
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            alignItems: 'flex-end',
          }}
        >
          {/* Subject Dropdown */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '10px 14px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>
              menu_book
            </span>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="gen-qr-sub"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748B',
                  letterSpacing: '0.04em',
                }}
              >
                Course / Subject
              </label>
              <select
                id="gen-qr-sub"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {subjects.length === 0 && <option value="">No subjects assigned</option>}
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Slot Picker */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '10px 14px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>
              schedule
            </span>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="gen-qr-slot"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748B',
                  letterSpacing: '0.04em',
                }}
              >
                Time Slot / Period
              </label>
              <select
                id="gen-qr-slot"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {LECTURE_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    Period {slot.slotNumber} ({slot.timeRange})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Classroom / Room Selector */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '10px 14px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>
              meeting_room
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="gen-qr-room"
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748B',
                    letterSpacing: '0.04em',
                  }}
                >
                  Classroom / Room
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomRoom(!isCustomRoom)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isCustomRoom ? 'Select standard' : 'Custom'}
                </button>
              </div>
              {isCustomRoom ? (
                <input
                  id="gen-qr-room"
                  type="text"
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  placeholder="e.g. Lab 304, Hall B"
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    width: '100%',
                  }}
                />
              ) : (
                <select
                  id="gen-qr-room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  {POPULAR_ROOMS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '10px 14px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>
              calendar_today
            </span>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="gen-qr-date"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748B',
                  letterSpacing: '0.04em',
                }}
              >
                Date
              </label>
              <input
                id="gen-qr-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  width: '100%',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !subject}
            style={{
              padding: '14px 24px',
              borderRadius: '14px',
              border: 'none',
              cursor: loading || !subject ? 'not-allowed' : 'pointer',
              background: loading || !subject ? '#94A3B8' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(37,99,235,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              qr_code
            </span>
            {loading ? 'Generating...' : 'Generate Live QR'}
          </button>
        </div>
      </div>

      {/* Generated Live Session Preview Card */}
      {generated && sessionData && (
        <div
          style={{
            background: '#fff',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            border: '1px solid #DBEAFE',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  sensors
                </span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Live QR Session Ready
                </h3>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#059669',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10B981',
                      display: 'inline-block',
                    }}
                  />
                  Broadcasting for student scans
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/faculty/qr-session/${sessionData.sessionToken}`)}
              style={{
                padding: '8px 18px',
                borderRadius: '12px',
                background: '#2563EB',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              }}
            >
              <span>Open Fullscreen Monitor</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                open_in_new
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center' }}>
            {/* QR Code Graphic Box */}
            <div
              style={{
                background: '#F8FAFC',
                padding: '20px',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  background: '#fff',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
                }}
              >
                <QRCodeSVG
                  value={JSON.stringify({
                    sessionToken: sessionData.sessionToken,
                    subject: sessionData.session?.subject || subject,
                    date: sessionData.session?.date || date,
                    room: sessionData.session?.room || room,
                  })}
                  size={190}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginTop: '10px' }}>
                Project on classroom screen
              </span>
            </div>

            {/* Session Info Table */}
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '14px',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748B',
                    marginBottom: '6px',
                  }}
                >
                  Session Token
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={sessionData.sessionToken}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: '#fff',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={copyToken}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      background: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #DBEAFE',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  <span
                    style={{
                      color: '#94A3B8',
                      display: 'block',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Course
                  </span>
                  <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                    {sessionData.session?.subject || subject}
                  </strong>
                </div>
                <div
                  style={{
                    background: '#fff',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  <span
                    style={{
                      color: '#94A3B8',
                      display: 'block',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Room / Hall
                  </span>
                  <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                    {sessionData.session?.room || room}
                  </strong>
                </div>
                <div
                  style={{
                    background: '#fff',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  <span
                    style={{
                      color: '#94A3B8',
                      display: 'block',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Geo-Fence
                  </span>
                  <strong
                    style={{
                      color: sessionData.session?.geoFencingEnabled ? '#059669' : '#64748B',
                      fontSize: '13px',
                    }}
                  >
                    {sessionData.session?.geoFencingEnabled ? '50m Active ✓' : 'Disabled'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active & Recent Sessions Roster */}
      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          border: '1px solid rgba(226,232,240,0.8)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              Active & Recent Sessions
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              Monitor live sessions or view historical attendance records
            </p>
          </div>
          <button
            type="button"
            onClick={fetchActiveSessions}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#2563EB',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              refresh
            </span>
            Refresh
          </button>
        </div>

        {loadingSessions ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '28px', animation: 'spin 1s infinite', display: 'block', marginBottom: '8px' }}
            >
              sync
            </span>
            Loading sessions...
          </div>
        ) : activeSessions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>
              📷
            </span>
            <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No active QR sessions</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Configure above to launch a new live session</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeSessions.map((s) => (
              <div
                key={s.sessionToken}
                style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  border: '1px solid #F1F5F9',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: s.isActive ? '#FAFCFF' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: s.isActive ? '#ECFDF5' : '#F1F5F9',
                      color: s.isActive ? '#059669' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {s.isActive ? 'qr_code_2' : 'history'}
                    </span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#0F172A', fontSize: '13px' }}>{s.subject}</strong>
                      <span
                        style={{
                          padding: '1px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 800,
                          background: s.isActive ? '#D1FAE5' : '#F1F5F9',
                          color: s.isActive ? '#059669' : '#64748B',
                        }}
                      >
                        {s.isActive ? 'LIVE' : 'ENDED'}
                      </span>
                      {s.geoFencingEnabled && (
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: '#EFF6FF',
                            color: '#1E50DE',
                            border: '1px solid #DBEAFE',
                          }}
                        >
                          📍 50m Geo-Fence
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {formatDate(s.date)} • {s.room || 'Room B05'} • {s.className}
                      {s.section ? ` - ${s.section}` : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                    {s.scannedStudents?.length || 0} scans
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/faculty/qr-session/${s.sessionToken}`)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      background: '#fff',
                      color: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>View Monitor</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QrGenerator;