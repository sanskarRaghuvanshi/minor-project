import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from '../components/student/QrScanner';

const ScanAttendancePage = () => {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);

  const handleScanSuccess = (data) => {
    setScanResult(data);
    setTimeout(() => {
      navigate('/student/dashboard');
    }, 2000);
  };

  const handleClose = () => {
    navigate('/student/dashboard');
  };

  return (
    <div className="scan-attendance-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Scan QR Code</h1>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleClose}
            style={{ padding: '8px 16px' }}
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '500px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
            <h2 style={{ marginBottom: '8px' }}>Scan Attendance QR</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Point your camera at the QR code displayed by your teacher
            </p>

            {scanResult ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h3>Attendance Marked!</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                  {scanResult.session?.subject} • {new Date(scanResult.session?.date).toLocaleDateString()}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '16px' }}>
                  Redirecting to dashboard...
                </p>
              </div>
            ) : (
              <QrScanner
                onScanSuccess={handleScanSuccess}
                onClose={handleClose}
              />
            )}
          </div>

          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--surface-secondary)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong>Instructions:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', textAlign: 'left' }}>
              <li>Allow camera permission when prompted</li>
              <li>Hold your phone steady facing the QR code</li>
              <li>Make sure the QR code is well-lit and fully visible</li>
              <li>You can only scan once per session</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScanAttendancePage;