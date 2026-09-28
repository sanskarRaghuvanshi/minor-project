import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import FeedbackModal from './FeedbackModal';
import { LECTURE_SLOTS } from '../../utils/timetableSlots';

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const AvatarColors = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];

const MarkAttendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(LECTURE_SLOTS[0]?.id || 'slot-1');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');

  const prevState = useRef(attendance);
  const subjects = user?.subjects || [];

  const currentSlotObj = LECTURE_SLOTS.find((s) => s.id === selectedSlot) || LECTURE_SLOTS[0];

  const fetchStudents = useCallback(async () => {
    if (!subject) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get(ENDPOINTS.FACULTY.STUDENTS, {
        params: { branch: user?.branch, className: user?.className, limit: 100 },
      });
      const fetched = data.data || [];
      setStudents(fetched);

      // Check if attendance already exists for this date/subject/slot
      const existing = await axiosInstance
        .get(ENDPOINTS.FACULTY.ATTENDANCE_BY_DATE_SUBJECT(date, subject), {
          params: { slotNumber: currentSlotObj.slotNumber },
        })
        .catch(() => null);

      const initial = {};
      if (existing?.data?.data?.length) {
        existing.data.data.forEach((r) => {
          initial[r.student?._id] = r.status;
        });
      } else {
        fetched.forEach((s) => {
          initial[s._id] = '';
        });
      }
      setAttendance(initial);
      prevState.current = { ...initial };
      setHasChanges(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [subject, date, currentSlotObj.slotNumber, user?.branch, user?.className]);

  useEffect(() => {
    if (subjects.length > 0 && !subject) {
      setSubject(subjects[0]);
    }
  }, [subjects, subject]);

  useEffect(() => {
    if (subject) fetchStudents();
  }, [subject, fetchStudents]);

  const setStatus = (studentId, status) => {
    setAttendance((prev) => {
      const next = { ...prev, [studentId]: prev[studentId] === status ? '' : status };
      const changed = Object.keys(next).some((k) => next[k] !== prevState.current[k]);
      setHasChanges(changed);
      return next;
    });
  };

  const markAll = (status) => {
    const next = {};
    students.forEach((s) => {
      next[s._id] = status;
    });
    setAttendance(next);
    setHasChanges(true);
  };

  const clearAll = () => {
    const next = {};
    students.forEach((s) => {
      next[s._id] = '';
    });
    setAttendance(next);
    setHasChanges(true);
  };

  const totalCount = students.length;
  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length;
  const excusedCount = Object.values(attendance).filter((s) => s === 'excused').length;
  const markedCount = Object.values(attendance).filter((s) => s === 'present' || s === 'absent' || s === 'excused').length;

  const handleSubmit = async () => {
    if (!subject) {
      addToast?.('Please select a subject', 'warning');
      return;
    }
    if (markedCount === 0) {
      addToast?.('Mark at least one student before saving', 'warning');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const records = Object.entries(attendance)
        .filter(([, status]) => status)
        .map(([studentId, status]) => ({ studentId, status }));

      await axiosInstance.post(
        ENDPOINTS.FACULTY.ATTENDANCE,
        {
          date,
          subject,
          slotNumber: currentSlotObj.slotNumber,
          timeSlot: currentSlotObj.timeRange,
          room: currentSlotObj.room || 'B05',
          records,
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      );

      addToast?.(`Period ${currentSlotObj.slotNumber} (${currentSlotObj.timeRange}) attendance saved successfully!`, 'success');
      setHasChanges(false);
      setShowFeedback(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit attendance';
      setError(msg);
      addToast?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const nameMatch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;

    const st = attendance[s._id];
    if (filterTab === 'present') return st === 'present';
    if (filterTab === 'absent') return st === 'absent';
    if (filterTab === 'unmarked') return !st;
    return true;
  });

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '80px' }}>
      
      {/* Top Header & Realtime Count Snapshot */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '2px 10px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', border: '1px solid #DBEAFE', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E50DE' }} />
              Faculty Portal
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94A3B8' }}>groups</span>
              {user?.branch} • {user?.className}{user?.section ? ` - ${user.section}` : ''}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Mark Attendance
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
            Record class roll call or launch a dynamic QR attendance session.
          </p>
        </div>

        {/* Realtime Stats Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '6px 8px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '12px', background: '#F1F5F9' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
              TOTAL: <strong style={{ color: '#0F172A', fontSize: '13px' }}>{totalCount}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '12px', background: '#ECFDF5' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
              PRESENT: <strong style={{ fontSize: '13px' }}>{presentCount}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '12px', background: '#FEF2F2' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444' }}>
              ABSENT: <strong style={{ fontSize: '13px' }}>{absentCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Session Configuration Card */}
      <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          
          {/* Date Picker */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>calendar_today</span>
            <div style={{ flex: 1 }}>
              <label htmlFor="mark-att-date" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>Session Date</label>
              <input
                id="mark-att-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#0F172A', width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Time Slot Picker */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>schedule</span>
            <div style={{ flex: 1 }}>
              <label htmlFor="mark-att-slot" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>Time Slot / Period</label>
              <select
                id="mark-att-slot"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#0F172A', width: '100%', cursor: 'pointer' }}
              >
                {LECTURE_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    Period {slot.slotNumber} ({slot.timeRange})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Selector */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: '22px' }}>menu_book</span>
            <div style={{ flex: 1 }}>
              <label htmlFor="mark-att-sub" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>Course / Subject</label>
              <select
                id="mark-att-sub"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#0F172A', width: '100%', cursor: 'pointer' }}
              >
                {subjects.length === 0 && <option value="">No subjects assigned</option>}
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* QR Generator Trigger Card */}
          <div
            onClick={() => navigate('/faculty/qr-generator')}
            style={{
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: '14px',
              padding: '10px 16px', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'transform 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>qr_code_scanner</span>
              <div>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700 }}>Switch to QR Session</span>
                <span style={{ fontSize: '11px', color: '#DBEAFE' }}>Students scan via mobile</span>
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.8 }}>chevron_right</span>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => markAll('present')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: '#ECFDF5', color: '#059669', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>done_all</span>
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll('absent')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: '#FEF2F2', color: '#EF4444', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              Mark All Absent
            </button>
            <button
              type="button"
              onClick={clearAll}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '10px', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
              Clear All
            </button>
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            {markedCount} of {totalCount} students marked
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px', color: '#DC2626', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Student List Container */}
      <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.8)', overflow: 'hidden' }}>
        
        {/* Search and Filter Subheader */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '340px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94A3B8' }}>search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student by name..."
              style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[
              { key: 'all', label: `All (${totalCount})` },
              { key: 'present', label: `Present (${presentCount})` },
              { key: 'absent', label: `Absent (${absentCount})` },
              { key: 'unmarked', label: `Unmarked (${totalCount - markedCount})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterTab(key)}
                style={{
                  padding: '6px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600,
                  background: filterTab === key ? '#2563EB' : '#F1F5F9',
                  color: filterTab === key ? '#fff' : '#64748B',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', animation: 'spin 1s infinite' }}>sync</span>
            Loading student list...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>👥</span>
            <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>No students found</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Try clearing the search or changing filter</p>
          </div>
        ) : (
          <div>
            {filteredStudents.map((s, idx) => {
              const currentStatus = attendance[s._id];
              const avatarColor = AvatarColors[idx % AvatarColors.length];

              return (
                <div
                  key={s._id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: idx < filteredStudents.length - 1 ? '1px solid #F1F5F9' : 'none',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    background: currentStatus === 'present' ? '#FAFCFF' : currentStatus === 'absent' ? '#FFFBFB' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                >
                  {/* Left: Index + Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', width: '22px' }}>
                      {idx + 1}
                    </span>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: '#EFF6FF', color: avatarColor,
                      fontWeight: 700, fontSize: '13px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {getInitials(s.name)}
                    </div>
                    <div>
                      <span style={{ display: 'block', fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                        {s.email}
                      </span>
                    </div>
                  </div>

                  {/* Right: Modern P / A / E Toggle Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    
                    {/* PRESENT Button */}
                    <button
                      type="button"
                      onClick={() => setStatus(s._id, 'present')}
                      style={{
                        padding: '7px 14px', borderRadius: '10px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
                        border: currentStatus === 'present' ? '1px solid #059669' : '1px solid #E2E8F0',
                        background: currentStatus === 'present' ? '#059669' : '#fff',
                        color: currentStatus === 'present' ? '#fff' : '#64748B',
                        boxShadow: currentStatus === 'present' ? '0 2px 6px rgba(5,150,105,0.25)' : 'none',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                      Present
                    </button>

                    {/* ABSENT Button */}
                    <button
                      type="button"
                      onClick={() => setStatus(s._id, 'absent')}
                      style={{
                        padding: '7px 14px', borderRadius: '10px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
                        border: currentStatus === 'absent' ? '1px solid #DC2626' : '1px solid #E2E8F0',
                        background: currentStatus === 'absent' ? '#DC2626' : '#fff',
                        color: currentStatus === 'absent' ? '#fff' : '#64748B',
                        boxShadow: currentStatus === 'absent' ? '0 2px 6px rgba(220,38,38,0.25)' : 'none',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                      Absent
                    </button>

                    {/* EXCUSED Button */}
                    <button
                      type="button"
                      onClick={() => setStatus(s._id, 'excused')}
                      style={{
                        padding: '7px 12px', borderRadius: '10px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
                        border: currentStatus === 'excused' ? '1px solid #D97706' : '1px solid #E2E8F0',
                        background: currentStatus === 'excused' ? '#D97706' : '#fff',
                        color: currentStatus === 'excused' ? '#fff' : '#64748B',
                        boxShadow: currentStatus === 'excused' ? '0 2px 6px rgba(217,119,6,0.25)' : 'none',
                      }}
                    >
                      Excused
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Sticky Action Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid #E2E8F0', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              {markedCount} of {totalCount} Marked
            </span>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
              • {presentCount} Present
            </span>
            <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700 }}>
              • {absentCount} Absent
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !hasChanges}
              style={{
                padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: hasChanges ? 'pointer' : 'not-allowed',
                background: hasChanges ? '#2563EB' : '#94A3B8', color: '#fff',
                fontSize: '13px', fontWeight: 700, boxShadow: hasChanges ? '0 2px 10px rgba(37,99,235,0.35)' : 'none',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
              {submitting ? 'Saving Register...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>

      {/* Post-attendance Feedback Modal */}
      {showFeedback && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
          date={date}
          subject={subject}
          studentsPresent={presentCount}
          onSkip={(reason) => addToast?.(`Feedback skipped: ${reason}`, 'info')}
        />
      )}
    </div>
  );
};

export default MarkAttendance;
