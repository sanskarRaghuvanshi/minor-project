import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../common/Skeleton';

const QrSessionView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  const fetchSession = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(ENDPOINTS.FACULTY.QR_SESSION(token));
      setSession(data.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load session', 'error');
      navigate('/faculty/qr-generator');
    } finally {
      setLoading(false);
    }
  }, [token, addToast, navigate]);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 10000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const handleEndSession = async () => {
    if (!window.confirm('End this QR session? Students will no longer be able to scan.')) return;
    try {
      await axiosInstance.post(ENDPOINTS.FACULTY.QR_END(token));
      addToast('Session ended', 'success');
      navigate('/faculty/qr-generator');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to end session', 'error');
    }
  };

  const handleModifyAttendance = async (studentId, newStatus) => {
    const key = `${studentId}-${newStatus}`;
    if (updating[key]) return;

    setUpdating((prev) => ({ ...prev, [key]: true }));
    try {
      await axiosInstance.post(ENDPOINTS.FACULTY.ATTENDANCE, {
        date: session.date.split('T')[0],
        subject: session.subject,
        records: [{ studentId, status: newStatus }],
      }, {
        headers: { 'Idempotency-Key': `attendance-modify-${session.sessionToken}-${studentId}` },
      });
      addToast(`Attendance updated to ${newStatus}`, 'success');
      fetchSession();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update attendance', 'error');
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  };

  const copyToken = () => {
    if (session?.sessionToken) {
      navigator.clipboard.writeText(session.sessionToken);
      addToast('Session token copied', 'success');
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

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="qr-session-view">
        <div className="dashboard-home__header">
          <h1>QR Session</h1>
        </div>
        <Skeleton variant="card" height="400px" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const scans = session.scannedStudents || [];
  const scanCount = scans.length;

  return (
    <div className="qr-session-view">
      <div className="dashboard-home__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Live Session: {session.subject}</h1>
          <p className="text-secondary">
            {formatDate(session.date)} • {session.className}{session.section ? ` - ${session.section}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={copyToken}
          >
            Copy Token
          </button>
          {session.isActive && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleEndSession}
            >
              End Session
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div className="card" style={{ flex: 1, minWidth: '280px', textAlign: 'center', padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>QR Code (Active)</h3>
          <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', display: 'inline-block' }}>
            <QRCodeSVG
              value={JSON.stringify({
                sessionToken: session.sessionToken,
                subject: session.subject,
                date: session.date,
              })}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>
          <p style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Session Token: {session.sessionToken}
          </p>
        </div>

        <div className="card" style={{ flex: 1, minWidth: '280px' }}>
          <h3 style={{ marginBottom: '16px' }}>Session Info</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div><strong>Subject:</strong> {session.subject}</div>
            <div><strong>Date:</strong> {formatDate(session.date)}</div>
            <div><strong>Branch:</strong> {session.branch}</div>
            <div><strong>Class:</strong> {session.className}</div>
            {session.section && <div><strong>Section:</strong> {session.section}</div>}
            <div><strong>Total Scans:</strong> {scanCount}</div>
            <div><strong>Status:</strong> {session.isActive ? '🟢 Active' : '🔴 Ended'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Scanned Students ({scanCount})</h3>
          {session.isActive && (
            <span className="badge badge--success">Live updating every 10s</span>
          )}
        </div>

        {scanCount === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>No scans yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              Students will appear here as they scan the QR code
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Scanned At</th>
                  <th>Current Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan, index) => (
                  <tr key={scan.student._id}>
                    <td>{index + 1}</td>
                    <td>{scan.student.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{scan.student.email}</td>
                    <td>{formatTime(scan.scannedAt)}</td>
                    <td>
                      <span className="badge badge--success">Present (QR)</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--sm btn--secondary"
                          onClick={() => handleModifyAttendance(scan.student._id, 'absent')}
                          disabled={updating[`${scan.student._id}-absent`]}
                        >
                          {updating[`${scan.student._id}-absent`] ? '...' : 'Mark Absent'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--warning"
                          onClick={() => handleModifyAttendance(scan.student._id, 'excused')}
                          disabled={updating[`${scan.student._id}-excused`]}
                        >
                          {updating[`${scan.student._id}-excused`] ? '...' : 'Mark Excused'}
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

export default QrSessionView;