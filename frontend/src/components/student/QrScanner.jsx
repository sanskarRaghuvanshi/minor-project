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
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const isMountedRef = useRef(true);
  const html5QrcodeRef = useRef(null);

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
    console.debug('QR scan error:', errorMessage);
  }, []);

  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      console.log('Available cameras:', videoDevices.map(d => ({ id: d.deviceId, label: d.label })));
      if (isMountedRef.current) {
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          const backCamera = videoDevices.find((d) => /back|environment|rear/i.test(d.label));
          const preferred = backCamera || videoDevices[0];
          setSelectedCameraId(preferred.deviceId);
        }
      }
    } catch (err) {
      console.error('Failed to enumerate cameras:', err);
    }
  }, [selectedCameraId]);

  const requestCameraPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API not supported in this browser');
      setPermissionState('denied');
      return false;
    }

    const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecureContext) {
      setError('Camera requires HTTPS. Please access via the Vercel deployment URL.');
      setPermissionState('denied');
      return false;
    }

    setPermissionState('prompt');
    setError('Requesting camera permission...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      stream.getTracks().forEach((track) => track.stop());

      if (isMountedRef.current) {
        setPermissionState('granted');
        setError('');
        await enumerateCameras();
      }
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      if (!isMountedRef.current) return false;

      let message = 'Failed to access camera';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera access denied. Click the 🔒 icon in the address bar → Allow camera → Refresh.';
        setPermissionState('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera found on this device.';
        setPermissionState('denied');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is in use by another app. Close other apps and try again.';
        setPermissionState('denied');
      } else if (err.name === 'OverconstrainedError') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());
          if (isMountedRef.current) {
            setPermissionState('granted');
            setError('');
            await enumerateCameras();
          }
          return true;
        } catch {
          message = 'Camera access failed. Try a different browser.';
          setPermissionState('denied');
        }
      } else {
        message = err.message || 'Camera access failed';
        setPermissionState('denied');
      }

      setError(message);
      addToast(message, 'error');
      return false;
    }
  }, [enumerateCameras, addToast]);

  const startScanner = useCallback(async () => {
    if (html5QrcodeRef.current) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qrcode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 280 },
        rememberLastUsedCamera: true,
      };

      const cameraConfigs = [];
      if (selectedCameraId) {
        cameraConfigs.push(selectedCameraId);
      }
      cameraConfigs.push({ facingMode: 'environment' });
      cameraConfigs.push({ facingMode: 'user' });
      cameraConfigs.push({});

      let started = false;
      let lastError;

      for (const cameraConfig of cameraConfigs) {
        try {
          console.log('Trying camera config:', cameraConfig);
          await html5Qrcode.start(cameraConfig, config, handleScanSuccess, handleScanError);
          console.log('Scanner started with config:', cameraConfig);
          started = true;
          break;
        } catch (err) {
          lastError = err;
          console.warn('Camera config failed:', cameraConfig, err);
        }
      }

      if (!started) {
        throw lastError || new Error('No working camera config found');
      }

      if (isMountedRef.current) {
        setScanning(true);
        setError('');
      }
    } catch (err) {
      console.error('Failed to start scanner:', err);
      if (isMountedRef.current) {
        const msg = err.name === 'OverconstrainedError'
          ? 'No suitable camera found. Try switching cameras.'
          : 'Failed to start scanner. Please try again.';
        setError(msg);
        addToast(msg, 'error');
      }
    }
  }, [requestCameraPermission, selectedCameraId, handleScanSuccess, handleScanError, addToast]);

  const switchCamera = useCallback(async (deviceId) => {
    if (!deviceId || deviceId === selectedCameraId) return;
    setSelectedCameraId(deviceId);
    await stopScanner();
    setTimeout(startScanner, 300);
  }, [selectedCameraId, stopScanner, startScanner]);

  const handleRetry = useCallback(async () => {
    setLastScanned(null);
    setError('');
    await stopScanner();
    setTimeout(startScanner, 500);
  }, [stopScanner, startScanner]);

  useEffect(() => {
    isMountedRef.current = true;
    enumerateCameras();
    startScanner();
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, []);

  const qrReaderElement = (
    <div
      id="qr-reader"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        aspectRatio: '4/3',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#000',
        margin: '0 auto 16px',
        opacity: scanning ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
    />
  );

  if (permissionState === 'denied') {
    return (
      <>
        {qrReaderElement}
        <div className="qr-scanner" style={{ textAlign: 'center', padding: '32px 16px', maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h3 style={{ marginBottom: '12px' }}>Camera Access Required</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
            {error || 'Camera permission is required to scan QR codes.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleRetry}
              style={{ minWidth: '140px' }}
            >
              🔄 Try Again
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                stopScanner();
                if (onClose) onClose();
              }}
              style={{ minWidth: '140px' }}
            >
              Close
            </button>
          </div>
          <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            <strong>How to enable:</strong> Click the <span style={{ fontFamily: 'monospace' }}>🔒</span> or <span style={{ fontFamily: 'monospace' }}>📷</span> icon
            in the browser address bar → Set Camera to "Allow" → Refresh this page.
          </p>
        </div>
      </>
    );
  }

  if (!scanning) {
    return (
      <>
        {qrReaderElement}
        <div className="qr-scanner" style={{ textAlign: 'center', padding: '32px 16px', maxWidth: '400px', margin: '0 auto' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: '40px', height: '40px', borderWidth: '4px' }} />
          <p style={{ color: 'var(--text-secondary)',
 }}>
            {permissionState === 'prompt' ? 'Requesting camera permission...' : 'Starting camera...'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {qrReaderElement}
      <div className="qr-scanner" style={{ maxWidth: '440px', margin: '0 auto' }}>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '20px',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '280px',
                height: '280px',
                border: '3px solid var(--primary, #2563eb)',
                borderRadius: '12px',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                animation: 'scan-pulse 2s ease-in-out infinite',
              }}
            />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
              Camera active — point at QR code
            </p>
          </div>
        </div>
        <style jsx global>{`\''@keyframes scan-pulse {
            0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px var(--primary, #2563eb); }
            50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.5), 0 0 40px var(--primary, #2563eb); }
          }'`}</style>

        {availableCameras.length > 1 && (
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)'
 }}>Camera:</label>
            <select
              value={selectedCameraId || ''}
              onChange={(e) => switchCamera(e.target.value || undefined)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.85rem',
                minWidth: '180px',
                cursor: 'pointer',
              }}
            >
              {availableCameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `\''Camera ${availableCameras.indexOf(cam) + 1}'`}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div
            className="alert alert--error"
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'var(--error-bg, #fef2f2)',
              border: '1px solid var(--error-border, #fecaca)',
              borderRadius: '8px',
              color: 'var(--error-text, #dc2626)',
              fontSize: '0.9rem',
            }}
          >
            <p style={{ margin: 0 }}>{error}</p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleRetry}
              style={{ marginTop: '10px', fontSize: '0.85rem' }}
            >
              Retry
            </button>
          </div>
        )}

        {lastScanned && !error && (
          <div
            className="alert alert--success"
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'var(--success-bg, #f0fdf4)',
              border: '1px solid var(--success-border, #bbf7d0)',
              borderRadius: '8px',
              color: 'var(--success-text, #16a34a)',
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>✓ Attendance marked successfully!</p>
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Redirecting...</p>
          </div>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              stopScanner();
              if (onClose) onClose();
            }}
            style={{ minWidth: '140px' }}
          >
            Close Scanner
          </button>
        </div>

        <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Point camera at the QR code displayed by your teacher
        </p>
      </div>
    </>
  );
};

export default QrScanner;
