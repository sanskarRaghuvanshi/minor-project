import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import Skeleton from '../common/Skeleton';

const QrGenerator = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const subjects = user?.subjects || [];

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
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  const handleGenerate = async () => {
    if (!subject) {
      addToast('Please select a subject', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(ENDPOINTS.FACULTY.QR_GENERATE, {
        subject,
        date,
      });

      setSessionData(data.data);
      setGenerated(true);
      addToast('QR code generated successfully', 'success');
      fetchActiveSessions();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to generate QR code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (sessionData?.sessionToken) {
      navigator.clipboard.writeText(sessionData.sessionToken);
      addToast('Session token copied to clipboard', 'success');
    }
  };

  const handleViewSession = (token) => {
    navigate(`/faculty/qr-session/${token}`);
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
    <div className="qr-generator">
      <div className="dashboard-home__header">
        <h1>QR Attendance</h1>
        <p className="text-secondary">Generate QR codes for student attendance scanning</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Generate New QR Session</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label htmlFor="qr-subject">Subject</label>
            <select
              id="qr-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label htmlFor="qr-date">Date</label>
            <input
              id="qr-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              disabled={loading}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleGenerate}
            disabled={loading || !subject}
            style={{ height: 'fit-content' }}
          >
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>
        </div>
      </div>

      {generated && sessionData && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Generated QR Code</h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', display: 'inline-block' }}>
                <QRCodeSVG
                  value={JSON.stringify({
                    sessionToken: sessionData.sessionToken,
                    subject: sessionData.session.subject,
                    date: sessionData.session.date,
                  })}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Scan with student app
              </p>
            </div>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div className="form-group">
                <label>Session Token</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={sessionData.sessionToken}
                    readOnly
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={copyToken}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
                <div><strong>Subject:</strong> {sessionData.session.subject}</div>
                <div><strong>Date:</strong> {formatDate(sessionData.session.date)}</div>
                <div><strong>Branch:</strong> {sessionData.session.branch}</div>
                <div><strong>Class:</strong> {sessionData.session.className}</div>
                {sessionData.session.section && (
                  <div><strong>Section:</strong> {sessionData.session.section}</div>
                )}
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => handleViewSession(sessionData.sessionToken)}
                style={{ marginTop: '16px', width: '100%' }}
              >
                View Live Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Active Sessions</h3>
        {loadingSessions ? (
          <Skeleton variant="card" height="200px" />
        ) : activeSessions.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No active QR sessions</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              Generate a QR code to start a new session
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Scans</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => (
                  <tr key={session.sessionToken}>
                    <td>{session.subject}</td>
                    <td>{formatDate(session.date)}</td>
                    <td>{session.className}{session.section ? ` - ${session.section}` : ''}</td>
                    <td>{session.scannedStudents?.length || 0}</td>
                    <td>
                      <span className={`badge ${session.isActive ? 'badge--success' : 'badge--secondary'}`}>
                        {session.isActive ? 'Active' : 'Ended'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--sm btn--secondary"
                          onClick={() => handleViewSession(session.sessionToken)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QrGenerator;