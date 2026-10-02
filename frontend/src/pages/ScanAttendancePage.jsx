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
    }, 2200);
  };

  const handleClose = () => {
    navigate('/student/dashboard');
  };

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '12px 16px 36px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Top Header Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '14px 18px',
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              qr_code_scanner
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Live Attendance</span>
              <span
                style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '6px',
                }}
              >
                ACTIVE
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Point camera at teacher's QR token</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          style={{
            padding: '6px 12px',
            borderRadius: '10px',
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            color: '#475569',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            arrow_back
          </span>
          Back
        </button>
      </div>

      {/* Main Scanner Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '20px 16px',
          boxShadow: '0 2px 12px -2px rgba(15,23,42,0.06)',
          border: '1px solid rgba(226,232,240,0.8)',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        {scanResult ? (
          <div style={{ padding: '24px 12px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
                check_circle
              </span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
              Attendance Recorded!
            </h2>
            <p style={{ margin: '0 0 14px', fontSize: '0.875rem', color: '#64748B' }}>
              {scanResult.session?.subject} •{' '}
              {new Date(scanResult.session?.date || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                background: '#EFF6FF',
                color: '#1E40AF',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Returning to student dashboard...
            </span>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '14px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                Capture Session QR
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                Align the teacher's QR code within the viewfinder frame
              </p>
            </div>

            <QrScanner onScanSuccess={handleScanSuccess} onClose={handleClose} />
          </>
        )}
      </div>

      {/* Instructions Card */}
      <div
        style={{
          background: '#EFF6FF',
          borderRadius: '16px',
          border: '1px solid #BFDBFE',
          padding: '14px 16px',
          fontSize: '0.8rem',
          color: '#1E3A8A',
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563EB' }}>
            info
          </span>
          Scanning Guide
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px' }}>
          <li>Grant browser camera permissions when prompted.</li>
          <li>Hold your device steady facing the projected classroom QR code.</li>
          <li>Each QR token is single-use and tied to your enrolled section.</li>
        </ul>
      </div>
    </div>
  );
};

export default ScanAttendancePage;