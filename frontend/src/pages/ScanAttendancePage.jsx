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
    }, 2500);
  };

  const handleClose = () => {
    navigate('/student/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F7FC', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Top App Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1E50DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>qr_code_scanner</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Live Attendance Scanner</span>
                <span style={{ padding: '2px 6px', borderRadius: '6px', background: '#D1FAE5', color: '#059669', fontSize: '10px', fontWeight: 800 }}>CAMERA ACTIVE</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Point camera at teacher's dynamic QR token</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '8px 16px', borderRadius: '12px', background: '#F1F5F9', color: '#475569',
              border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Scanner Container */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '520px' }}>
          
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.06)', border: '1px solid rgba(226,232,240,0.8)', textAlign: 'center' }}>
            
            {scanResult ? (
              <div style={{ padding: '20px 0' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>check_circle</span>
                </div>
                <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>Attendance Recorded!</h2>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748B' }}>
                  {scanResult.session?.subject} • {new Date(scanResult.session?.date || Date.now()).toLocaleDateString()}
                </p>
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '100px', background: '#EFF6FF', color: '#1E50DE', fontSize: '11px', fontWeight: 700 }}>
                  Redirecting to dashboard in a moment...
                </span>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Capture Session QR
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                    Align the QR code within the viewfinder frame below
                  </p>
                </div>

                <QrScanner
                  onScanSuccess={handleScanSuccess}
                  onClose={handleClose}
                />
              </>
            )}
          </div>

          {/* Tips / Instructions */}
          <div style={{ marginTop: '16px', padding: '16px 20px', background: '#EFF6FF', borderRadius: '18px', border: '1px solid #DBEAFE', fontSize: '12px', color: '#334155' }}>
            <strong style={{ display: 'block', color: '#1E50DE', marginBottom: '6px', fontSize: '12px' }}>
              Scanning Instructions:
            </strong>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
              <li>Grant camera permissions when prompted by your browser</li>
              <li>Keep your device steady facing the projected QR code</li>
              <li>Ensure good lighting and avoid reflections on the screen</li>
              <li>Each QR session token is strictly single-use per student</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScanAttendancePage;