import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
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
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastScanRef = useRef(0);
  const SCAN_INTERVAL_MS = 1000 / 15;

  const stopScanner = useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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

  const scanLoop = useCallback((timestamp) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    if (timestamp - lastScanRef.current < SCAN_INTERVAL_MS) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    lastScanRef.current = timestamp;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const containerEl = video.parentElement;
    const containerRect = containerEl.getBoundingClientRect();
    const scale = Math.max(containerRect.width / vw, containerRect.height / vh);
    const renderedW = vw * scale;
    const renderedH = vh * scale;
    const offsetX = (renderedW - containerRect.width) / 2;
    const offsetY = (renderedH - containerRect.height) / 2;

    const boxSize = 280;
    const cropCSSx = (containerRect.width - boxSize) / 2;
    const cropCSSy = (containerRect.height - boxSize) / 2;

    const sx = (cropCSSx + offsetX) / scale;
    const sy = (cropCSSy + offsetY) / scale;
    const sSize = boxSize / scale;

    canvas.width = sSize;
    canvas.height = sSize;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(video, sx, sy, sSize, sSize, 0, 0, sSize, sSize);
      const imageData = ctx.getImageData(0, 0, sSize, sSize);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (code) {
        handleScanSuccess(code.data);
      }
    } catch (err) {
      console.debug('Frame decode skipped:', err);
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [handleScanSuccess]);

  const startScanner = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    if (!videoRef.current) {
      console.error('Video ref not available');
      return;
    }

    try {
      const cameraConfigs = [];

      if (selectedCameraId) {
        cameraConfigs.push({ deviceId: { exact: selectedCameraId } });
      }
      cameraConfigs.push({ facingMode: 'environment' });
      cameraConfigs.push({ facingMode: 'user' });
      cameraConfigs.push({});

      let stream;
      let lastError;
      
      for (const cameraConfig of cameraConfigs) {
        try {
          console.log('Trying getUserMedia with config:', cameraConfig);
          stream = await navigator.mediaDevices.getUserMedia({ video: cameraConfig });
          console.log('getUserMedia success with:', cameraConfig);
          break;
        } catch (err) {
          lastError = err;
          console.warn('getUserMedia failed:', cameraConfig, err);
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to get camera stream');
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      await videoRef.current.play();
      console.log('Video playing, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);

      if (isMountedRef.current) {
        setScanning(true);
        setError('');
        rafRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      console.error('Failed to start scanner:', err);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
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
        display: scanning ? 'block' : 'none',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'rotateY(0deg)',
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
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
