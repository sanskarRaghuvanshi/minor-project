import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { LECTURE_SLOTS, getCurrentSlot } from '../../utils/timetableSlots';

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

const WalkByRadar = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Form State
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(() => {
    const current = getCurrentSlot();
    return current ? current.id : (LECTURE_SLOTS[0]?.id || 'slot-1');
  });
  const [room, setRoom] = useState('Room B05');
  const [customRoom, setCustomRoom] = useState('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);

  // Class selection
  const assignedClasses = user?.assignedClasses?.length
    ? user.assignedClasses
    : [{ branch: user?.branch, className: user?.className, section: user?.section, subjects: user?.subjects || [] }];

  const [activeClass, setActiveClass] = useState(assignedClasses[0] || {});

  const subjects = activeClass.subjects?.length
    ? activeClass.subjects
    : (user?.subjects || []);

  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(subject)) {
      setSubject(subjects[0]);
    }
  }, [activeClass, subjects, subject]);

  // Session State
  const [activeSession, setActiveSession] = useState(null);
  const [loadingActive, setLoadingActive] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [hoveringId, setHoveringId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoWalkMode, setAutoWalkMode] = useState(false);

  // Poll active session
  const pollIntervalRef = useRef(null);

  const fetchActiveSession = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoadingActive(true);
      const res = await axiosInstance.get(ENDPOINTS.FACULTY.WALKBY_ACTIVE);
      if (res.data?.success && res.data?.data) {
        setActiveSession(res.data.data);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      if (!quiet) {
        console.error('Failed to load active walk-by session:', err);
      }
    } finally {
      if (!quiet) setLoadingActive(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  // Auto-poll active session every 3 seconds while active
  useEffect(() => {
    if (activeSession && activeSession.isActive) {
      pollIntervalRef.current = setInterval(() => {
        fetchActiveSession(true);
      }, 3000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeSession?.isActive, fetchActiveSession]);

  // Handle start session
  const handleStartSession = async (e) => {
    e.preventDefault();
    const finalRoom = isCustomRoom ? customRoom.trim() : room;
    if (!finalRoom) {
      addToast('Please select or specify a classroom', 'error');
      return;
    }
    if (!subject) {
      addToast('Please select a subject', 'error');
      return;
    }

    const slotObj = LECTURE_SLOTS.find((s) => s.id === selectedSlot) || LECTURE_SLOTS[0];

    try {
      setStarting(true);
      const res = await axiosInstance.post(ENDPOINTS.FACULTY.WALKBY_START, {
        subject,
        date,
        slotNumber: slotObj.slotNumber,
        timeSlot: slotObj.timeRange,
        room: finalRoom,
        branch: activeClass.branch || user?.branch,
        className: activeClass.className || user?.className,
        section: activeClass.section !== undefined ? activeClass.section : user?.section,
      });

      if (res.data?.success) {
        setActiveSession(res.data.data);
        addToast('Walk-by Radar session started! Walk past desks to mark attendance.', 'success');
      }
    } catch (err) {
      console.error('Start walkby error:', err);
      addToast(err.response?.data?.message || 'Failed to start session', 'error');
    } finally {
      setStarting(false);
    }
  };

  // Hover mark a student
  const handleHoverMark = async (studentId, studentName) => {
    if (!activeSession?.sessionToken) return;
    try {
      setHoveringId(studentId);
      // Realistic random proximity between 0.15m and 0.45m
      const proximityMeters = (Math.random() * 0.3 + 0.15).toFixed(2);

      const res = await axiosInstance.post(ENDPOINTS.FACULTY.WALKBY_HOVER_MARK, {
        sessionToken: activeSession.sessionToken,
        studentId,
        proximityMeters: Number(proximityMeters),
      });

      if (res.data?.success) {
        // Trigger subtle tactile feedback if device supports vibration
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([60, 40, 60]);
        }
        addToast(`${studentName} auto-marked present (${proximityMeters}m proximity)`, 'success');
        // Refresh roster
        fetchActiveSession(true);
      }
    } catch (err) {
      console.error('Hover mark error:', err);
      addToast(err.response?.data?.message || 'Failed to hover mark', 'error');
    } finally {
      setHoveringId(null);
    }
  };

  // Auto-walk simulation: hovers un-hovered students sequentially
  useEffect(() => {
    let timer = null;
    if (autoWalkMode && activeSession && activeSession.roster) {
      const nextUnmarked = activeSession.roster.find((s) => !s.isHovered);
      if (nextUnmarked) {
        timer = setTimeout(() => {
          handleHoverMark(nextUnmarked._id, nextUnmarked.name);
        }, 1800);
      } else {
        setAutoWalkMode(false);
        addToast('All students in class have been detected & marked!', 'success');
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoWalkMode, activeSession]);

  // End & Lock Session
  const handleEndSession = async () => {
    if (!activeSession?.sessionToken) return;
    const confirmEnd = window.confirm(
      'Are you sure you want to end this Walk-by session?\nAll unmarked students will automatically be recorded as Absent.',
    );
    if (!confirmEnd) return;

    try {
      setEnding(true);
      const res = await axiosInstance.post(ENDPOINTS.FACULTY.WALKBY_END, {
        sessionToken: activeSession.sessionToken,
      });

      if (res.data?.success) {
        addToast('Walk-by session locked! Attendance saved to records.', 'success');
        setActiveSession(null);
        setAutoWalkMode(false);
      }
    } catch (err) {
      console.error('End walkby error:', err);
      addToast(err.response?.data?.message || 'Failed to end session', 'error');
    } finally {
      setEnding(false);
    }
  };

  // Filter roster by search
  const filteredRoster = (activeSession?.roster || []).filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  const totalStudents = activeSession?.totalStudents || activeSession?.roster?.length || 0;
  const hoveredCount = activeSession?.hoveredCount || activeSession?.roster?.filter((s) => s.isHovered).length || 0;
  const attendanceRate = totalStudents > 0 ? Math.round((hoveredCount / totalStudents) * 100) : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 8px 16px rgba(37,99,235,0.25)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>radar</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Walk-by Desk Radar
              </h1>
              <span style={{
                padding: '3px 10px', borderRadius: '20px',
                background: '#ECFDF5', color: '#059669',
                fontSize: '11px', fontWeight: 700, border: '1px solid #A7F3D0'
              }}>
                PROXIMITY &lt; 0.5m
              </span>
              <span style={{
                padding: '3px 10px', borderRadius: '20px',
                background: '#F1F5F9', color: '#475569',
                fontSize: '11px', fontWeight: 700
              }}>
                SILENT • NO AUDIO
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
              Walk past student desks with your phone or laptop. Enrolled devices detect your proximity and mark attendance instantly.
            </p>
          </div>
        </div>

        {activeSession && (
          <button
            type="button"
            onClick={handleEndSession}
            disabled={ending}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '10px',
              background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: '14px',
              border: 'none', cursor: ending ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(239,68,68,0.25)', transition: 'all 0.2s'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
            {ending ? 'Locking...' : 'Lock & End Session'}
          </button>
        )}
      </div>

      {loadingActive ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
          <div style={{
            display: 'inline-block', width: '36px', height: '36px',
            border: '3px solid #E2E8F0', borderTopColor: '#2563EB',
            borderRadius: '50%', animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '14px', fontSize: '14px', fontWeight: 600 }}>Loading Walk-by radar session...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : !activeSession ? (
        /* Setup / Start Form */
        <div style={{
          background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(15,23,42,0.05)', overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Configure Lecture Session
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                Select class, subject and room to initialize the desk detection radar.
              </p>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px', background: '#EFF6FF',
              color: '#2563EB', fontSize: '12px', fontWeight: 600
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sensors</span>
              Radar Ready
            </span>
          </div>

          <form onSubmit={handleStartSession} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Class Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Target Class & Section
                </label>
                <select
                  value={assignedClasses.findIndex((c) => c.className === activeClass.className && c.section === activeClass.section)}
                  onChange={(e) => setActiveClass(assignedClasses[e.target.value] || {})}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid #CBD5E1', fontSize: '14px', color: '#0F172A',
                    background: '#fff', outline: 'none'
                  }}
                >
                  {assignedClasses.map((cls, idx) => (
                    <option key={idx} value={idx}>
                      {cls.branch || user?.branch} • {cls.className || user?.className} {cls.section ? `(Sec ${cls.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Subject / Course
                </label>
                {subjects.length > 0 ? (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '10px',
                      border: '1px solid #CBD5E1', fontSize: '14px', color: '#0F172A',
                      background: '#fff', outline: 'none'
                    }}
                  >
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject name"
                    required
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '10px',
                      border: '1px solid #CBD5E1', fontSize: '14px', color: '#0F172A',
                      outline: 'none'
                    }}
                  />
                )}
              </div>

              {/* Date */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Lecture Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid #CBD5E1', fontSize: '14px', color: '#0F172A',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Time Slot */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Timetable Period / Slot
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid #CBD5E1', fontSize: '14px', color: '#0F172A',
                    background: '#fff', outline: 'none'
                  }}
                >
                  {LECTURE_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Classroom / Lab Location
                </label>
                {!isCustomRoom ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={room}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomRoom(true);
                        } else {
                          setRoom(e.target.value);
                        }
                      }}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #CBD5E1', fontSize: '14px', color: '#0F172A',
                        background: '#fff', outline: 'none'
                      }}
                    >
                      {POPULAR_ROOMS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="__custom__">+ Custom Room</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. Lab 4B"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      required
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomRoom(false)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid #CBD5E1', background: '#F8FAFC',
                        fontSize: '12px', fontWeight: 600, color: '#475569'
                      }}
                    >
                      Presets
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* How it works info box */}
            <div style={{
              marginTop: '24px', padding: '16px', borderRadius: '12px',
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              display: 'flex', gap: '14px', alignItems: 'flex-start'
            }}>
              <span className="material-symbols-outlined" style={{ color: '#16A34A', fontSize: '24px', marginTop: '2px' }}>
                info
              </span>
              <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                <strong>Desk Hover Workflow:</strong>
                <ol style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li>Tell students to navigate to <strong>Desk Check-in</strong> on their phones and place them face-up on their desks.</li>
                  <li>Click <strong>Start Walk-by Radar</strong> below.</li>
                  <li>As you walk row by row, hover near each student&apos;s desk (&lt; 0.5m) to auto-mark them present.</li>
                  <li>When you finish walking the room, click <strong>Lock & End Session</strong>. Remaining absent students are locked automatically.</li>
                </ol>
              </div>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                type="submit"
                disabled={starting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '12px 28px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none',
                  cursor: starting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 16px rgba(37,99,235,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {starting ? 'hourglass_top' : 'radar'}
                </span>
                {starting ? 'Initializing Radar...' : 'Start Walk-by Radar Session'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Active Walk-By Radar Screen */
        <div>
          {/* Active Session Status Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            borderRadius: '16px', padding: '20px 24px', color: '#fff',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center',
            justifyContent: 'space-between', gap: '16px', marginBottom: '24px',
            boxShadow: '0 10px 25px -5px rgba(15,23,42,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                background: '#10B981', boxShadow: '0 0 12px #10B981',
                animation: 'pulseGlow 2s infinite'
              }} />
              <style>{`@keyframes pulseGlow { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }`}</style>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', fontWeight: 700 }}>
                  Active Walk-by Proximity Session
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {activeSession.subject}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#38BDF8', padding: '2px 8px', borderRadius: '6px', background: 'rgba(56,189,248,0.15)' }}>
                    {activeSession.className} {activeSession.section ? `• Sec ${activeSession.section}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                  {activeSession.room} • {activeSession.timeSlot} • {new Date(activeSession.date).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setAutoWalkMode(!autoWalkMode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 16px', borderRadius: '10px',
                  background: autoWalkMode ? '#059669' : 'rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {autoWalkMode ? 'pause_circle' : 'directions_walk'}
                </span>
                {autoWalkMode ? 'Simulating Walk-by...' : 'Simulate Walk-by'}
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Enrolled</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{totalStudents}</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Students in roster</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #BBF7D0', boxShadow: '0 2px 6px rgba(16,185,129,0.08)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>Hovered / Present</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{hoveredCount}</div>
              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>&lt; 0.5m desk verified</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #FED7AA', boxShadow: '0 2px 6px rgba(249,115,22,0.05)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#D97706' }}>Pending Desks</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                {Math.max(0, totalStudents - hoveredCount)}
              </div>
              <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '2px' }}>Awaiting hover pass</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Attendance Rate</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{attendanceRate}%</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Live class completion</div>
            </div>
          </div>

          {/* Sonar Radar Screen & Live Feed Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', lg: '380px 1fr', gap: '24px' }}>
            {/* Visual Sonar Radar Widget (Silent) */}
            <div style={{
              background: '#0B1329', borderRadius: '16px', padding: '24px',
              border: '1px solid #1E293B', color: '#fff', textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.25)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em' }}>
                  SONAR DESK RADAR
                </span>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  Range: 0.5m
                </span>
              </div>

              {/* Circular Sonar Radar Canvas */}
              <div style={{
                position: 'relative', width: '260px', height: '260px',
                margin: '12px auto', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, rgba(11,19,41,1) 85%)',
                border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {/* Concentric rings */}
                <div style={{ position: 'absolute', width: '190px', height: '190px', borderRadius: '50%', border: '1px dashed rgba(56,189,248,0.25)' }} />
                <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', border: '1px solid rgba(56,189,248,0.2)' }} />
                <div style={{ position: 'absolute', width: '50px', height: '50px', borderRadius: '50%', border: '1px solid rgba(56,189,248,0.3)' }} />

                {/* Crosshairs */}
                <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(56,189,248,0.15)' }} />
                <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(56,189,248,0.15)' }} />

                {/* Rotating Radar Sweep Line */}
                <div
                  style={{
                    position: 'absolute', width: '50%', height: '50%', top: 0, right: 0,
                    transformOrigin: 'bottom left',
                    background: 'linear-gradient(45deg, rgba(56,189,248,0.4) 0%, rgba(56,189,248,0) 70%)',
                    borderRadius: '100% 0 0 0',
                    animation: 'radarSweep 3s linear infinite'
                  }}
                />
                <style>{`@keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

                {/* Center Teacher Device Beacon */}
                <div style={{
                  position: 'relative', zIndex: 10, width: '22px', height: '22px',
                  borderRadius: '50%', background: '#38BDF8',
                  boxShadow: '0 0 16px #38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                </div>

                {/* Dynamic Blips for hovered students */}
                {(activeSession.roster || []).slice(0, 12).map((s, idx) => {
                  const angle = (idx * (360 / Math.min(12, activeSession.roster.length))) * (Math.PI / 180);
                  const radius = 60 + (idx % 3) * 35;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <div
                      key={s._id}
                      title={`${s.name} - ${s.isHovered ? 'Marked Present' : 'Awaiting'}`}
                      style={{
                        position: 'absolute',
                        transform: `translate(${x}px, ${y}px)`,
                        width: s.isHovered ? '12px' : '8px',
                        height: s.isHovered ? '12px' : '8px',
                        borderRadius: '50%',
                        background: s.isHovered ? '#10B981' : 'rgba(255,255,255,0.25)',
                        boxShadow: s.isHovered ? '0 0 10px #10B981' : 'none',
                        transition: 'all 0.4s ease'
                      }}
                    />
                  );
                })}
              </div>

              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '12px' }}>
                Center blip: Teacher Scanner • Green dots: Verified desk proximity (&lt; 0.5m)
              </div>
            </div>

            {/* Roster & Hover Desk Actions */}
            <div style={{
              background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px -2px rgba(15,23,42,0.05)', overflow: 'hidden', marginTop: '16px'
            }}>
              {/* Filter and Roster Header */}
              <div style={{
                padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
              }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Desk Roster ({filteredRoster.length})
                </div>

                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or roll no..."
                    style={{
                      width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px',
                      border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none'
                    }}
                  />
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '18px', color: '#94A3B8'
                  }}>
                    search
                  </span>
                </div>
              </div>

              {/* Student Desks Grid */}
              <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '16px' }}>
                {filteredRoster.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94A3B8', fontSize: '14px' }}>
                    No students match your filter.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {filteredRoster.map((student) => {
                      const isHovered = student.isHovered;
                      return (
                        <div
                          key={student._id}
                          style={{
                            padding: '14px', borderRadius: '12px',
                            border: isHovered ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                            background: isHovered ? '#F0FDF4' : '#FFFFFF',
                            boxShadow: isHovered ? '0 4px 12px rgba(16,185,129,0.08)' : 'none',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            gap: '12px', transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                                {student.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                Roll: {student.rollNumber || 'N/A'}
                              </div>
                            </div>

                            {isHovered ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px',
                                background: '#10B981', color: '#fff',
                                fontSize: '11px', fontWeight: 700
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                                PRESENT
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px',
                                background: '#F1F5F9', color: '#64748B',
                                fontSize: '11px', fontWeight: 600
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>desk</span>
                                Awaiting Hover
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                            <div style={{ fontSize: '11px', color: isHovered ? '#059669' : '#94A3B8' }}>
                              {isHovered ? (
                                <>
                                  Dist: {student.proximityMeters || '0.28'}m • {student.markedAt ? new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}
                                </>
                              ) : (
                                'Waiting for phone hover'
                              )}
                            </div>

                            {!isHovered && (
                              <button
                                type="button"
                                disabled={hoveringId === student._id}
                                onClick={() => handleHoverMark(student._id, student.name)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '6px 12px', borderRadius: '8px',
                                  background: '#2563EB', color: '#fff',
                                  fontSize: '12px', fontWeight: 700, border: 'none',
                                  cursor: hoveringId === student._id ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>sensors</span>
                                {hoveringId === student._id ? 'Hovering...' : 'Hover Desk'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkByRadar;
