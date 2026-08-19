import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import FeedbackModal from './FeedbackModal';

const MarkAttendance = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRecords, setExistingRecords] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const prevState = useRef(attendance);

  const subjects = user?.subjects || [];

  const fetchStudents = useCallback(async () => {
    if (!subject) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get(ENDPOINTS.FACULTY.STUDENTS, {
        params: { branch: user.branch, className: user.className, limit: 100 },
      });
      const fetched = data.data || [];
      setStudents(fetched);

      // Check if attendance already exists for this date/subject
      const existing = await axiosInstance.get(
        ENDPOINTS.FACULTY.ATTENDANCE_BY_DATE_SUBJECT(date, subject),
      ).catch(() => null);

      const initial = {};
      if (existing?.data?.data?.length) {
        setExistingRecords(existing.data.data);
        existing.data.data.forEach((r) => {
          initial[r.student?._id] = r.status;
        });
      } else {
        setExistingRecords(null);
        fetched.forEach((s) => { initial[s._id] = ''; });
      }
      setAttendance(initial);
      prevState.current = { ...initial };
      setHasChanges(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [subject, date, user.branch, user.className]);

  useEffect(() => {
    if (subject) fetchStudents();
  }, [subject, fetchStudents]);

  const setStatus = (studentId, status) => {
    setAttendance((prev) => {
      const next = { ...prev, [studentId]: status };
      const changed = Object.keys(next).some((k) => next[k] !== prevState.current[k]);
      setHasChanges(changed);
      return next;
    });
  };

  const markAll = (status) => {
    const next = {};
    students.forEach((s) => { next[s._id] = status; });
    setAttendance(next);
    setHasChanges(true);
  };

  const selectedCount = Object.values(attendance).filter((s) => s === 'present' || s === 'absent' || s === 'excused').length;
  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;

  const handleSubmit = async () => {
    if (!subject) { addToast('Please select a subject', 'warning'); return; }
    if (selectedCount === 0) { addToast('Mark at least one student', 'warning'); return; }

    setSubmitting(true);
    setError('');
    try {
      const records = Object.entries(attendance)
        .filter(([, status]) => status)
        .map(([studentId, status]) => ({ studentId, status }));

      await axiosInstance.post(ENDPOINTS.FACULTY.ATTENDANCE, {
        date,
        subject,
        records,
      }, {
        headers: { 'Idempotency-Key': `attendance-${date}-${subject}` },
      });

      addToast('Attendance marked successfully', 'success');
      setHasChanges(false);
      setShowFeedback(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit attendance');
      addToast(err.response?.data?.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSkip = (reason) => {
    addToast(`Feedback skipped: ${reason}`, 'info');
  };

  return (
    <div className="mark-attendance">
      <div className="dashboard-home__header">
        <h1>Mark Attendance</h1>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label htmlFor="att-date">Date</label>
            <input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label htmlFor="att-subject">Subject</label>
            <select id="att-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {loading ? (
        <Skeleton variant="card" height="300px" />
      ) : !subject ? (
        <EmptyState icon="👆" title="Select a subject" message="Choose a subject and date to start marking attendance" />
      ) : students.length === 0 ? (
        <EmptyState icon="👥" title="No students found" message="No students are assigned to this class" />
      ) : (
        <>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedCount} marked ({presentCount} present)
              </span>
              <button type="button" className="btn btn--secondary" onClick={() => markAll('present')}>All Present</button>
              <button type="button" className="btn btn--secondary" onClick={() => markAll('absent')}>All Absent</button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSubmit}
                disabled={submitting || !hasChanges}
              >
                {submitting ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s._id}>
                    <td>{i + 1}</td>
                    <td>{s.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                    <td>
                      <div className="attendance-toggle">
                        {['present', 'absent', 'excused'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`btn btn--sm ${attendance[s._id] === status ? `btn--${status === 'present' ? 'success' : status === 'absent' ? 'danger' : 'warning'}` : 'btn--ghost'}`}
                            onClick={() => setStatus(s._id, attendance[s._id] === status ? '' : status)}
                            aria-pressed={attendance[s._id] === status}
                          >
                            {status === 'present' ? '✓ P' : status === 'absent' ? '✗ A' : '⟳ E'}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showFeedback && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
          date={date}
          subject={subject}
          studentsPresent={presentCount}
          onSkip={handleFeedbackSkip}
        />
      )}
    </div>
  );
};

export default MarkAttendance;
