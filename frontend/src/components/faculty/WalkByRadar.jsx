import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { LECTURE_SLOTS, getCurrentSlot } from '../../utils/timetableSlots';
import {
  isNativePlatform,
  startBleRadarScan,
  stopBleRadarScan,
  ensureBluetoothEnabled,
  listenForStudentSignal,
} from '../../utils/bleProximity';

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
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;

  // Track already marked students to prevent duplicate toast bursts and redundant network calls
  const markedStudentIdsRef = useRef(new Set());
  useEffect(() => {
    if (activeSession?.roster) {
      activeSession.roster.forEach((s) => {
        if (s.isHovered && s._id) {
          markedStudentIdsRef.current.add(s._id.toString());
        }
      });
    } else if (!activeSession) {
      markedStudentIdsRef.current.clear();
    }
  }, [activeSession]);

  const [loadingActive, setLoadingActive] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [hoveringId, setHoveringId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoWalkMode, setAutoWalkMode] = useState(false);
  const [isNative] = useState(() => isNativePlatform());
  const [bleScannerActive, setBleScannerActive] = useState(false);
  const [hoverScannerActive, setHoverScannerActive] = useState(true);
  const [recentBlePings, setRecentBlePings] = useState([]);
  const [hoverRangeThreshold, setHoverRangeThreshold] = useState(() => {
    try {
      const saved = localStorage.getItem('attendIq_hoverRangeThreshold');
      return saved ? Math.min(1.5, Math.max(0.5, parseFloat(saved))) : 1.5;
    } catch (e) {
      return 1.5;
    }
  });
  const hoverRangeThresholdRef = useRef(hoverRangeThreshold);
  useEffect(() => {
    hoverRangeThresholdRef.current = hoverRangeThreshold;
    try {
      localStorage.setItem('attendIq_hoverRangeThreshold', String(hoverRangeThreshold));
    } catch (e) {}
  }, [hoverRangeThreshold]);

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
    if (e && e.preventDefault) e.preventDefault();
    const finalRoom = isCustomRoom ? customRoom.trim() : room;
    if (!finalRoom) {
      addToast('Please select or specify a classroom', 'error');
      return;
    }
    const finalSubject = subject || subjects[0] || user?.subjects?.[0];
    if (!finalSubject) {
      addToast('Please select a subject', 'error');
      return;
    }

    const slotObj = LECTURE_SLOTS.find((s) => s.id === selectedSlot) || LECTURE_SLOTS[0];

    try {
      setStarting(true);
      const res = await axiosInstance.post(ENDPOINTS.FACULTY.WALKBY_START, {
        subject: finalSubject,
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
        addToast('Walk-by Radar session started! Auto-listening for student beacons.', 'success');
      }
    } catch (err) {
      console.error('Start walkby error:', err);
      addToast(err.response?.data?.message || 'Failed to start session', 'error');
    } finally {
      setStarting(false);
    }
  };

  // Quick 1-Click Auto-Start
  const handleQuickAutoStart = async () => {
    const finalRoom = isCustomRoom ? (customRoom.trim() || 'Room B05') : (room || 'Room B05');
    const finalSubject = subject || subjects[0] || user?.subjects?.[0] || 'General';
    const slotObj = LECTURE_SLOTS.find((s) => s.id === selectedSlot) || getCurrentSlot() || LECTURE_SLOTS[0];

    try {
      setStarting(true);
      const res = await axiosInstance.post(ENDPOINTS.FACULTY.WALKBY_START, {
        subject: finalSubject,
        date: date || new Date().toISOString().split('T')[0],
        slotNumber: slotObj.slotNumber,
        timeSlot: slotObj.timeRange,
        room: finalRoom,
        branch: activeClass.branch || user?.branch,
        className: activeClass.className || user?.className,
        section: activeClass.section !== undefined ? activeClass.section : user?.section,
      });

      if (res.data?.success) {
        setActiveSession(res.data.data);
        addToast('Walk-by Radar session auto-started! Ready to detect desks.', 'success');
      }
    } catch (err) {
      console.error('Quick start walkby error:', err);
      addToast(err.response?.data?.message || 'Failed to start session', 'error');
    } finally {
      setStarting(false);
    }
  };

  // Core Hover Mark Handler
  const handleHoverMark = useCallback(async (studentId, studentName, measuredDist) => {
    const currentSession = activeSessionRef.current;
    if (!currentSession?.sessionToken) return;

    const threshold = hoverRangeThresholdRef.current || 1.5;
    if (!measuredDist || Number(measuredDist) <= 0 || Number(measuredDist) > threshold) {
      addToast(`Cannot mark: Distance (${measuredDist}m) exceeds selected range (<= ${threshold}m).`, 'error');
      return;
    }

    const sId = studentId.toString();

    // Optimistically mark student as hovered in local state immediately (instant visual feedback)
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        roster: (prev.roster || []).map((s) =>
          s._id?.toString() === sId
            ? { ...s, isHovered: true, proximityMeters: Number(measuredDist), hoveredAt: new Date().toISOString() }
            : s
        ),
      };
    });

    try {
      setHoveringId(studentId);
      const proximityMeters = Number(measuredDist);

      const res = await axiosInstance.post(ENDPOINTS.FACULTY.WALKBY_HOVER_MARK, {
        sessionToken: currentSession.sessionToken,
        studentId,
        proximityMeters: Number(proximityMeters),
      });

      if (res.data?.success) {
        // Purely tactile vibration feedback - ZERO AUDIO
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([60, 40, 60]);
        }
        addToast(`${studentName} auto-marked present (${proximityMeters}m proximity)`, 'success');
        fetchActiveSession(true);
      }
    } catch (err) {
      console.error('Hover mark error:', err);
      const errMsg = err.response?.data?.message || 'Failed to hover mark';
      // If error was NOT already hovered/marked, allow retry
      if (!errMsg.toLowerCase().includes('already')) {
        markedStudentIdsRef.current.delete(sId);
      }
      addToast(errMsg, 'error');
    } finally {
      setHoveringId(null);
    }
  }, [addToast, fetchActiveSession]);

  // Click on student card "Hover Desk" button
  const triggerHoverForStudent = async (student) => {
    if (!student.isOnline) {
      addToast('Cannot mark: Student phone is not detected at desk. Student must be logged in on Desk Check-in.', 'error');
      return;
    }

    setHoveringId(student._id);
    try {
      if (isNative) {
        // STRICT: Must receive genuine Bluetooth signal from student's phone
        await ensureBluetoothEnabled();
        const targetId = student.studentIdentifier || student.rollNumber || student.email?.split('@')[0] || student._id;
        addToast(`Scanning for ${student.name}'s Bluetooth signal...`, 'info');
        const threshold = hoverRangeThresholdRef.current || 1.5;
        const sig = await listenForStudentSignal(targetId, 3500, threshold);

        if (!sig.success || !sig.distance || Number(sig.distance) > threshold) {
          addToast(
            sig.message || `No Bluetooth signal detected for ${student.name}. Device must be physically within selected range (< ${threshold}m)!`,
            'error'
          );
          return; // STOP! DO NOT MARK!
        }

        await handleHoverMark(student._id, student.name, sig.distance);
      } else {
        addToast('Bluetooth hardware scanner is only available in the native Android app.', 'error');
      }
    } catch (err) {
      console.error('Hover trigger error:', err);
      addToast('Bluetooth proximity check failed', 'error');
    } finally {
      setHoveringId(null);
    }
  };

  // Continuous Native Hardware BLE Scanner
  const startScanner = useCallback(async () => {
    if (!isNative) return;
    const ok = await ensureBluetoothEnabled();
    if (!ok) {
      addToast('Please enable Bluetooth to use Walk-by Desk Radar', 'error');
      return;
    }
    const started = await startBleRadarScan({
      getThreshold: () => hoverRangeThresholdRef.current,
      onDeviceDetected: (dev) => {
        setRecentBlePings((prev) => {
          const existing = prev.find((d) => d.deviceId === dev.deviceId || (d.studentRoll && d.studentRoll === dev.studentRoll));
          if (existing && Date.now() - (existing.timestamp || 0) < 1500 && Math.abs(existing.distance - dev.distance) < 0.2) {
            return prev;
          }
          const filtered = prev.filter((d) => d.deviceId !== dev.deviceId && (!d.studentRoll || d.studentRoll !== dev.studentRoll));
          return [dev, ...filtered].slice(0, 6);
        });
      },
      onDeviceHovered: (dev) => {
        if (dev.distance > hoverRangeThresholdRef.current) return;
        const currentSession = activeSessionRef.current;
        if (!currentSession || !currentSession.isActive) return;
        const roster = currentSession.roster || [];
        const matched = roster.find((s) => {
          const sId = s._id?.toString();
          if (s.isHovered || (sId && markedStudentIdsRef.current.has(sId))) return false;
          const sIds = [
            s.rollNumber,
            s.studentIdentifier,
            s.email?.split('@')[0],
            sId,
            sId?.slice(-6),
          ].filter(Boolean).map((v) => v.toLowerCase().trim());

          const devRoll = (dev.studentRoll || '').toLowerCase().trim();
          const devName = (dev.name || '').replace('atiq_', '').toLowerCase().trim();

          // Issue 4: Strict equality match only - never loose includes()
          return sIds.some((id) => id === devRoll || id === devName);
        });

        // Issue 2: Only mark verified matched student (wrong-device fallback completely removed)
        if (matched) {
          const sId = matched._id.toString();
          // Lock student immediately so subsequent packets cannot trigger duplicate requests/toasts
          markedStudentIdsRef.current.add(sId);
          handleHoverMark(matched._id, matched.name, dev.distance);
        }
      },
      onError: (err) => {
        console.warn('Native BLE Radar scan warning:', err);
      },
    });
    setBleScannerActive(!!started);
  }, [isNative, handleHoverMark, addToast]);

  useEffect(() => {
    if (activeSession && activeSession.isActive && hoverScannerActive && isNative) {
      startScanner();
    } else {
      stopBleRadarScan();
      setBleScannerActive(false);
    }
    return () => {
      stopBleRadarScan();
      setBleScannerActive(false);
    };
  }, [activeSession?.isActive, hoverScannerActive, isNative, startScanner]);

  // Auto-walk is purely hardware Bluetooth event-driven. Synthetic timer simulation removed.

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
  const onlineCount = activeSession?.onlineCount || activeSession?.roster?.filter((s) => s.isOnline).length || 0;
  const attendanceRate = totalStudents > 0 ? Math.round((hoveredCount / totalStudents) * 100) : 0;

  return (
    <div style={{
      maxWidth: '1200px', margin: '0 auto',
      padding: '24px 16px',
      paddingTop: '68px', // Ensure ample clearance for fixed mobile hamburger menu
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Walk-by Desk Radar
              </h1>
              <span style={{
                padding: '3px 10px', borderRadius: '20px',
                background: '#ECFDF5', color: '#059669',
                fontSize: '11px', fontWeight: 700, border: '1px solid #A7F3D0'
              }}>
                DESK PROXIMITY &lt; 1.5m
              </span>
              <span style={{
                padding: '3px 10px', borderRadius: '20px',
                background: isNative ? '#EFF6FF' : '#F1F5F9',
                color: isNative ? '#2563EB' : '#475569',
                fontSize: '11px', fontWeight: 700, border: isNative ? '1px solid #BFDBFE' : 'none'
              }}>
                {isNative ? '📡 NATIVE BLE BLUETOOTH' : '🌐 WEB HYBRID RADAR'}
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
              Walk past student desks with your phone. Only physical student devices actively open on Desk Check-in can be detected.
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
        <div>
          {/* Quick 1-Click Auto-Start Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
            borderRadius: '16px', padding: '20px 24px', color: '#fff',
            marginBottom: '24px', display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            boxShadow: '0 8px 24px -4px rgba(37,99,235,0.35)'
          }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>bolt</span>
                Auto-Start Walk-by Radar Session
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                1-Click instant start for {activeClass.className || user?.className || 'Class'} ({subject || subjects[0] || 'Default Subject'}) in {room}.
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickAutoStart}
              disabled={starting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '13px 26px', borderRadius: '12px',
                background: '#FFFFFF', color: '#1D4ED8',
                fontSize: '15px', fontWeight: 800, border: 'none',
                cursor: starting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                {starting ? 'hourglass_top' : 'play_arrow'}
              </span>
              {starting ? 'Auto-Starting Session...' : '⚡ Auto-Start Radar Now'}
            </button>
          </div>

          {/* Setup / Start Form */}
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
                  <li>Tell students to open <strong>Desk Check-in</strong> on their phones and place them face-up on their desks.</li>
                  <li>Click <strong>Start Walk-by Radar</strong> below.</li>
                  <li>As you walk row by row, your phone automatically listens for their Bluetooth signals (&lt; 0.5m) and marks them present.</li>
                  <li>Unlogged/offline students cannot be marked. When finished walking, click <strong>Lock & End Session</strong>.</li>
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
                  Active Walk-by Proximity Session {bleScannerActive ? '• 📡 BLE RADAR LISTENING' : ''}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {isNative && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!bleScannerActive) {
                      setHoverScannerActive(true);
                      await ensureBluetoothEnabled();
                      startScanner();
                    } else {
                      setHoverScannerActive(!hoverScannerActive);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', borderRadius: '10px',
                    background: bleScannerActive ? '#059669' : '#2563EB',
                    color: '#fff', fontSize: '13px', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {bleScannerActive ? 'bluetooth_searching' : 'bluetooth'}
                  </span>
                  {bleScannerActive ? `📡 BLE Listening (<${hoverRangeThreshold}m)` : 'Turn On Bluetooth & Listen'}
                </button>
              )}

              {!isNative && (
                <button
                  type="button"
                  onClick={() => setAutoWalkMode(!autoWalkMode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', borderRadius: '10px',
                    background: autoWalkMode ? '#D97706' : 'rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {autoWalkMode ? 'pause_circle' : 'directions_walk'}
                  </span>
                  {autoWalkMode ? 'Simulating Walk-by...' : 'Simulate Walk-by (Web Only)'}
                </button>
              )}
            </div>
          </div>

          
          {/* Teacher Bluetooth Range Selector Card (0.5m - 1.5m) */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: '#EFF6FF', color: '#2563EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>tune</span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    Bluetooth Radar Sensitivity
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Adjust desk hover proximity (0.5m to 1.5m)
                  </div>
                </div>
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 12px', borderRadius: '100px',
                background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
                fontSize: '12px', fontWeight: 800
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sensors</span>
                Selected Range: &le; {hoverRangeThreshold}m
              </div>
            </div>

            {/* Slider & Quick-Select Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', minWidth: '35px' }}>0.5m</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={hoverRangeThreshold}
                  onChange={(e) => setHoverRangeThreshold(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#2563EB',
                    cursor: 'pointer',
                    height: '6px'
                  }}
                />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', minWidth: '35px', textAlign: 'right' }}>1.5m</span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[0.5, 0.8, 1.0, 1.2, 1.5].map((val) => {
                  const isSelected = hoverRangeThreshold === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setHoverRangeThreshold(val)}
                      style={{
                        flex: '1 1 auto',
                        minWidth: '60px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: isSelected ? 800 : 600,
                        border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        background: isSelected ? '#EFF6FF' : '#F8FAFC',
                        color: isSelected ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {val === 0.5 ? '0.5m (Close)' : val === 1.0 ? '1.0m (Desk)' : val === 1.5 ? '1.5m (Max)' : val + 'm'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Auto Walk-by Mode Action Card */}
          <div style={{
            background: bleScannerActive ? '#F0FDF4' : '#EFF6FF',
            border: bleScannerActive ? '2px solid #22C55E' : '2px solid #3B82F6',
            borderRadius: '16px', padding: '16px 20px', marginBottom: '24px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center',
            justifyContent: 'space-between', gap: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: bleScannerActive ? '#16A34A' : '#2563EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: bleScannerActive ? '0 4px 12px rgba(22,163,74,0.3)' : '0 4px 12px rgba(37,99,235,0.3)'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  {bleScannerActive ? 'radar' : 'bluetooth_searching'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Auto Walk-by Radar: {bleScannerActive ? `ACTIVE (< ${hoverRangeThreshold}m)` : 'STANDBY'}
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    background: bleScannerActive ? '#DCFCE7' : '#DBEAFE',
                    color: bleScannerActive ? '#15803D' : '#1E40AF'
                  }}>
                    {bleScannerActive ? 'WALK PAST DESKS TO AUTO-MARK' : 'TAP TO RESUME'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Walk past desks holding your phone. Any student within selected desk range (&lt; {hoverRangeThreshold}m) is automatically detected and marked present! No tapping required.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isNative ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!bleScannerActive) {
                      setHoverScannerActive(true);
                      await ensureBluetoothEnabled();
                      startScanner();
                    } else {
                      setHoverScannerActive(!hoverScannerActive);
                    }
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '10px',
                    background: bleScannerActive ? '#16A34A' : '#2563EB',
                    color: '#fff', fontSize: '13px', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {bleScannerActive ? 'check_circle' : 'play_arrow'}
                  </span>
                  {bleScannerActive ? `⚡ Auto-Detecting (<${hoverRangeThreshold}m)` : '⚡ Turn On Auto-Walk Radar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAutoWalkMode(!autoWalkMode)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', borderRadius: '10px',
                    background: autoWalkMode ? '#D97706' : '#2563EB',
                    color: '#fff', fontSize: '13px', fontWeight: 700,
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {autoWalkMode ? 'pause_circle' : 'directions_walk'}
                  </span>
                  {autoWalkMode ? 'Simulating Walk-by...' : '⚡ Simulate Auto-Walk (Web)'}
                </button>
              )}
            </div>
          </div>

          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Enrolled</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{totalStudents}</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Students in roster</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #BFDBFE', boxShadow: '0 2px 6px rgba(37,99,235,0.08)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>Online at Desks</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{onlineCount}</div>
              <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>Live beacon connected</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #BBF7D0', boxShadow: '0 2px 6px rgba(16,185,129,0.08)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>Hovered / Present</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{hoveredCount}</div>
              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>&lt; 1.5m desk verified</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Attendance Rate</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{attendanceRate}%</div>
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
                <span style={{ fontSize: '11px', color: bleScannerActive ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: bleScannerActive ? '#10B981' : '#64748B',
                    boxShadow: bleScannerActive ? '0 0 8px #10B981' : 'none'
                  }} />
                  {bleScannerActive ? `BLE Active (<${hoverRangeThreshold}m)` : `Range: ${hoverRangeThreshold}m`}
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

                {/* Dynamic Blips for online & hovered students */}
                {(activeSession.roster || []).slice(0, 12).map((s, idx) => {
                  const angle = (idx * (360 / Math.min(12, activeSession.roster.length))) * (Math.PI / 180);
                  const radius = 60 + (idx % 3) * 35;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  const color = s.isHovered ? '#10B981' : s.isOnline ? '#38BDF8' : 'rgba(255,255,255,0.15)';

                  return (
                    <div
                      key={s._id}
                      title={`${s.name} - ${s.isHovered ? 'Marked Present' : s.isOnline ? 'Online at Desk' : 'Offline'}`}
                      style={{
                        position: 'absolute',
                        transform: `translate(${x}px, ${y}px)`,
                        width: s.isHovered ? '12px' : s.isOnline ? '10px' : '6px',
                        height: s.isHovered ? '12px' : s.isOnline ? '10px' : '6px',
                        borderRadius: '50%',
                        background: color,
                        boxShadow: s.isHovered ? '0 0 10px #10B981' : s.isOnline ? '0 0 8px #38BDF8' : 'none',
                        transition: 'all 0.4s ease'
                      }}
                    />
                  );
                })}
              </div>

              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '12px' }}>
                Center blip: Teacher Scanner • Green: Verified (&lt; 1.5m) • Blue: Online Desk
              </div>

              {/* Recent BLE hardware signals if any */}
              {recentBlePings.length > 0 && (
                <div style={{ marginTop: '12px', textAlign: 'left', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600 }}>Nearby BLE Signals:</div>
                  {recentBlePings.map((p, i) => (
                    <div key={i} style={{ fontSize: '10px', color: '#CBD5E1', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span>{p.studentRoll ? `Roll: ${p.studentRoll}` : p.name}</span>
                      <span>{p.rssi} dBm ({p.distance}m)</span>
                    </div>
                  ))}
                </div>
              )}
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
                      const isOnline = student.isOnline;
                      const isCurrentlyHovering = hoveringId === student._id;

                      return (
                        <div
                          key={student._id}
                          style={{
                            padding: '14px', borderRadius: '12px',
                            border: isHovered
                              ? '1.5px solid #10B981'
                              : isOnline
                                ? '1.5px solid #38BDF8'
                                : '1px solid #E2E8F0',
                            background: isHovered
                              ? '#F0FDF4'
                              : isOnline
                                ? '#F0F9FF'
                                : '#FFFFFF',
                            boxShadow: isHovered ? '0 4px 12px rgba(16,185,129,0.08)' : 'none',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            gap: '12px', transition: 'all 0.2s', opacity: !isHovered && !isOnline ? 0.65 : 1
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
                            ) : isOnline ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px',
                                background: '#E0F2FE', color: '#0369A1',
                                fontSize: '11px', fontWeight: 700, border: '1px solid #BAE6FD'
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sensors</span>
                                AT DESK (READY)
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px',
                                background: '#F1F5F9', color: '#94A3B8',
                                fontSize: '11px', fontWeight: 600
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>phone_disabled</span>
                                NOT LOGGED IN
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                            <div style={{ fontSize: '11px', color: isHovered ? '#059669' : isOnline ? '#0284C7' : '#94A3B8' }}>
                              {isHovered ? (
                                <>
                                  Dist: {student.proximityMeters || '0.28'}m • {student.markedAt ? new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}
                                </>
                              ) : isOnline ? (
                                'Ready for phone hover'
                              ) : (
                                'Device not at desk'
                              )}
                            </div>

                            {!isHovered && (
                              <button
                                type="button"
                                disabled={isCurrentlyHovering || !isOnline}
                                onClick={() => isOnline && triggerHoverForStudent(student)}
                                title={!isOnline ? 'Student is not logged in / phone not at desk' : 'Hover over student desk to mark'}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  padding: '7px 14px', borderRadius: '8px',
                                  background: !isOnline ? '#E2E8F0' : isCurrentlyHovering ? '#F59E0B' : '#2563EB',
                                  color: !isOnline ? '#94A3B8' : '#fff',
                                  fontSize: '12px', fontWeight: 700, border: 'none',
                                  cursor: !isOnline || isCurrentlyHovering ? 'not-allowed' : 'pointer',
                                  boxShadow: !isOnline ? 'none' : '0 2px 6px rgba(37,99,235,0.2)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                  {isCurrentlyHovering ? 'hourglass_top' : !isOnline ? 'lock' : 'sensors'}
                                </span>
                                {isCurrentlyHovering ? 'Listening BLE...' : !isOnline ? 'Desk Offline' : 'Hover Desk'}
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