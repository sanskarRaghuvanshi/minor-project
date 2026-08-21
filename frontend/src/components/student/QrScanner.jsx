import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';

const QrScanner = ({ onScanSuccess, onScanError, onClose }) => {
  const { addToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const html5QrcodeRef = useRef(null);
  const isMountedRef = useRef(true);

  const handleScanSuccess = useCallback(async (decodedText) => {
    if (!isMountedRef.current) return;
    if (lastScanned === decodedText) return;

    try {
      const qrData = JSON.parse(decodedText);
      const sessionToken = qrData.sessionToken;

      if (!sessionToken) {
        throw new Error('Invalid QR code format');
      }

      setLastScanned(decodedText);
      setError('');

      const { data } = await axiosInstance.post(ENDPOINTS.STUDENT.SCAN_ATTENDANCE, {
        sessionToken,
      });

      addToast('Attendance marked successfully!', 'success');

      if (onScanSuccess) {
        onScanSuccess(data.data);
      }
    } catch (err) {
      let errorMessage = 'Invalid QR code';
      if (err.response?.data?.errorCode === 'ALREADY_SCANNED') {
        errorMessage = 'You have already scanned this QR code';
      } else if (err.response?.data?.errorCode === 'INVALID_QR') {
        errorMessage = 'Invalid or expired QR code';
      } else if (err.response?.data?.errorCode === 'FORBIDDEN') {
        errorMessage = 'You are not enrolled in this class';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
      addToast(errorMessage, 'error');

      if (onScanError) {
        onScanError(errorMessage);
      }
    }
  }, [lastScanned, addToast, onScanSuccess, onScanError]);

  const handleScanError = useCallback((errorMessage) => {
    // Ignore scan errors (happens frequently when no QR in frame)
    console.debug('QR scan error:', errorMessage);
  }, []);

  const startScanner = useCallback(async () => {
    if (html5QrcodeRef.current) return;

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        handleScanError,
      );

      if (isMountedRef.current) {
        setScanning(true);
        setError('');
      }
    } catch (err) {
      console.error('Failed to start scanner:', err);
      if (isMountedRef.current) {
        setError('Failed to start camera. Please allow camera access and try again.');
        addToast('Failed to start camera. Please allow camera access.', 'error');
      }
    }
  }, [handleScanSuccess, handleScanError, addToast]);

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
      html5QrcodeRef.current = null;
    }
    if (isMountedRef.current) {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    startScanner();
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleRetry = () => {
    setLastScanned(null);
    setError('');
    stopScanner();
    setTimeout(startScanner, 500);
  };

  if (!scanning) {
    return (
      <div className="qr-scanner" style={{ textAlign: 'center', padding: '24px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Starting camera...</p>
      </div>
    );
  }

  return (
    <div className="qr-scanner">
      <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }} />

      {error && (
        <div className="alert alert--error" style={{ marginTop: '16px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p>{error}</p>
          <button type="button" className="btn btn--secondary" onClick={handleRetry} style={{ marginTop: '8px' }}>
            Try Again
          </button>
        </div>
      )}

      {lastScanned && !error && (
        <div className="alert alert--success" style={{ marginTop: '16px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p>✓ Attendance marked successfully!</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>Redirecting...</p>
        </div>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            stopScanner();
            if (onClose) onClose();
          }}
        >
          Close Scanner
        </button>
      </div>

      <p style={{ marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Point camera at the QR code displayed by your teacher
      </p>
    </div>
  );
};

export default QrScanner;