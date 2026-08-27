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
  const [loading, setLoading] = useState(true);
  const [showQrUpload, setShowQrUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchStats = useCallback(() => {
    axiosInstance.get(ENDPOINTS.STUDENT.STATS)
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  usePolling(fetchStats, 30000);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please upload an image file', 'error');
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

        addToast('Attendance marked successfully!', 'success');
        setShowQrUpload(false);
        fetchStats();
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
      addToast(errorMessage, 'error');
    } finally {
      if (html5Qrcode) {
        try { html5Qrcode.clear(); } catch (_) { /* ignore cleanup errors */ }
      }
      setUploading(false);
    }
  };

  return (
    <div className="dashboard-home">
      {/* Hidden element for Html5Qrcode.scanFile() — must exist in DOM at all times */}
      <div id="qr-upload-reader" style={{ display: 'none' }} />

      <div className="dashboard-home__header">
        <h1>Welcome, {user?.name}</h1>
        <p className="text-secondary">{user?.branch} - {user?.className}{user?.section ? ` - ${user.section}` : ''}</p>
      </div>

      {loading ? (
        <Skeleton variant="card" height="200px" />
      ) : stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card card">
              <h3>Total Classes</h3>
              <p className="stat-card__value stat-card__value--primary">{stats.overall.total}</p>
            </div>
            <div className="stat-card card">
              <h3>Present</h3>
              <p className="stat-card__value stat-card__value--green">{stats.overall.present}</p>
            </div>
            <div className="stat-card card">
              <h3>Absent</h3>
              <p className="stat-card__value stat-card__value--red">{stats.overall.absent}</p>
            </div>
            <div className="stat-card card">
              <h3>Overall %</h3>
              <p className={`stat-card__value stat-card__value--${stats.overall.percentage >= 75 ? 'green' : stats.overall.percentage >= 60 ? 'yellow' : 'red'}`}>
                {stats.overall.percentage}%
              </p>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate('/student/scan')}
                style={{ flex: 1, minWidth: '200px', padding: '16px', fontSize: '1rem' }}
              >
                📷 Scan QR Code (Camera)
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setShowQrUpload(true)}
                style={{ flex: 1, minWidth: '200px', padding: '16px', fontSize: '1rem' }}
              >
                📁 Upload QR Screenshot
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate('/student/my-attendance')}
                style={{ flex: 1, minWidth: '200px', padding: '16px', fontSize: '1rem' }}
              >
                📋 My Attendance
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate('/student/eligibility')}
                style={{ flex: 1, minWidth: '200px', padding: '16px', fontSize: '1rem' }}
              >
                ✅ Check Eligibility
              </button>
            </div>
          </div>

          {stats.subjectWise.length > 0 && (
            <div className="subject-mini-list" style={{ marginTop: '24px' }}>
              <h2 style={{ marginBottom: '12px' }}>Subject-wise Attendance</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Present</th>
                      <th>Total</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.subjectWise.map((s) => (
                      <tr key={s.subject}>
                        <td>{s.subject}</td>
                        <td>{s.present}</td>
                        <td>{s.total}</td>
                        <td>
                          <span className={`badge ${s.percentage >= 75 ? 'badge--success' : s.percentage >= 60 ? 'badge--warning' : 'badge--danger'}`}>
                            {s.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Modal
            isOpen={showQrUpload}
            onClose={() => setShowQrUpload(false)}
            title="Upload QR Code Screenshot"
            size="md"
          >
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="btn btn--secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  📁 Choose Screenshot
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="spinner" />
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Reading QR code from image...</p>
                </div>
              )}

              {!uploading && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Take a screenshot of the QR code displayed by your teacher, then upload it here.
                  Supports PNG, JPG, and other image formats.
                </p>
              )}
            </div>
          </Modal>
        </>
      ) : (
        <div className="welcome-card card">
          <p>No attendance records yet. Check back after your faculty marks attendance.</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;

