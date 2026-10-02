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
  const isProcessingRef = useRef(false);
  const selectedCameraIdRef = useRef(null);

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (err) {
        console.warn('Failed to stop scanner:', err);
      }
      html5QrcodeRef.current = null;
    }
    if (isMountedRef.current) {
      setScanning(false);
    }
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText) => {
      if (!isMountedRef.current || isProcessingRef.current) return;
      isProcessingRef.current = true;

      // Immediately pause scanning so no additional frames trigger the success callback
      if (html5QrcodeRef.current) {
        try {
          await html5QrcodeRef.current.pause(true);
        } catch (e) {
          console.debug('Failed to pause scanner:', e);
        }
      }

      // Haptic vibration feedback for mobile devices
      try {
        if (navigator.vibrate) {
          navigator.vibrate(80);
        }
      } catch (e) {}

      try {
        let sessionToken = decodedText;
        if (typeof decodedText === 'string' && (decodedText.startsWith('{') || decodedText.includes('sessionToken'))) {
          try {
            const parsed = JSON.parse(decodedText);
            sessionToken = parsed.sessionToken || decodedText;
          } catch (e) {}
        }

        if (!sessionToken || typeof sessionToken !== 'string') {
          throw new Error('Invalid QR code format');
        }

        setLastScanned(sessionToken);
        setError('');

        const { data } = await axiosInstance.post(ENDPOINTS.STUDENT.SCAN_ATTENDANCE, {
          sessionToken,
        });

        if (data.data?.alreadyScanned) {
          addToast('Attendance was already marked for this session', 'info');
        } else {
          addToast('Attendance marked successfully!', 'success');
        }

        if (onScanSuccess) {
          onScanSuccess(data.data);
        }
      } catch (err) {
        let errorMessage = 'Failed to mark attendance';
        if (err.response?.data?.errorCode === 'ALREADY_SCANNED') {
          errorMessage = 'You have already scanned this QR code';
        } else if (err.response?.data?.errorCode === 'INVALID_QR') {
          errorMessage = 'Invalid or non-existent QR code session';
        } else if (err.response?.data?.errorCode === 'QR_EXPIRED') {
          errorMessage = 'This QR session has expired or been closed by the teacher';
        } else if (err.response?.data?.errorCode === 'FORBIDDEN') {
          errorMessage = err.response.data.message || 'You are not enrolled in this class section';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        addToast(errorMessage, 'error');

        if (onScanError) {
          onScanError(errorMessage);
        }

        setTimeout(() => {
          if (isMountedRef.current) {
            isProcessingRef.current = false;
            if (html5QrcodeRef.current) {
              try {
                html5QrcodeRef.current.resume();
              } catch (e) {}
            }
          }
        }, 2000);
      }
    },
    [addToast, onScanSuccess, onScanError],
  );

  const handleScanError = useCallback((errorMessage) => {
    console.debug('QR scan frame error:', errorMessage);
  }, []);

  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      if (isMountedRef.current) {
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          const backCamera = videoDevices.find((d) => /back|environment|rear/i.test(d.label));
          const preferred = backCamera || videoDevices[0];
          selectedCameraIdRef.current = preferred.deviceId;
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

    const isSecureContext =
      window.isSecureContext ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1';

    if (!isSecureContext) {
      setError('Camera requires HTTPS or localhost connection.');
      setPermissionState('denied');
      return false;
    }

    setPermissionState('prompt');
    setError('Requesting camera permission...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
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
        message = 'Camera access denied. Click the 🔒 lock icon in the address bar → Allow camera → Refresh.';
        setPermissionState('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera found on this device.';
        setPermissionState('denied');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is in use by another app. Close other camera apps and retry.';
        setPermissionState('denied');
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
    if (html5QrcodeRef.current || !isMountedRef.current) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission || !isMountedRef.current || html5QrcodeRef.current) return;

    isProcessingRef.current = false;

    let html5Qrcode;
    try {
      html5Qrcode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qrcode;

      const viewportWidth = window.innerWidth;
      const qrboxSize = viewportWidth < 480 ? 200 : 240;

      const config = {
        fps: 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
      };

      const cameraConfigs = [];
      if (selectedCameraIdRef.current) {
        cameraConfigs.push(selectedCameraIdRef.current);
      }
      cameraConfigs.push({ facingMode: 'environment' });
      cameraConfigs.push({ facingMode: 'user' });
      cameraConfigs.push({});

      let started = false;
      let lastError;

      for (const cameraConfig of cameraConfigs) {
        try {
          await html5Qrcode.start(cameraConfig, config, handleScanSuccess, handleScanError);
          started = true;
          break;
        } catch (err) {
          lastError = err;
          console.warn('Camera start attempt failed:', cameraConfig, err);
        }
      }

      if (!started) {
        throw lastError || new Error('No working camera configuration found');
      }

      if (!isMountedRef.current) {
        await html5Qrcode.stop().catch(() => {});
        html5QrcodeRef.current = null;
        return;
      }

      setScanning(true);
      setError('');
    } catch (err) {
      console.error('Failed to start scanner:', err);
      html5QrcodeRef.current = null;
      if (isMountedRef.current) {
        const msg =
          err.name === 'OverconstrainedError'
            ? 'No suitable camera found. Try switching cameras.'
            : 'Failed to start camera. Please try again.';
        setError(msg);
        addToast(msg, 'error');
      }
    }
  }, [requestCameraPermission, handleScanSuccess, handleScanError, addToast]);

  const switchCamera = useCallback(
    async (deviceId) => {
      if (!deviceId || deviceId === selectedCameraId) return;
      selectedCameraIdRef.current = deviceId;
      setSelectedCameraId(deviceId);
      await stopScanner();
      setTimeout(startScanner, 300);
    },
    [selectedCameraId, stopScanner, startScanner],
  );

  const handleRetry = useCallback(async () => {
    isProcessingRef.current = false;
    setLastScanned(null);
    setError('');
    await stopScanner();
    setTimeout(startScanner, 400);
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

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        #qr-reader {
          width: 100% !important;
          max-width: 320px !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 20px !important;
          overflow: hidden !important;
          background: #0F172A !important;
          margin: 0 auto !important;
          position: relative !important;
          border: none !important;
        }
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 20px !important;
        }
        #qr-reader__scan_region {
          border-radius: 16px !important;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
        #qr-reader__header_message {
          display: none !important;
        }
      `}</style>

      {/* Viewfinder Frame Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '1 / 1',
          margin: '0 auto 16px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#0F172A',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
        }}
      >
        <div id="qr-reader" />

        {/* Decorative corner target overlay */}
        {scanning && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                border: '2px dashed rgba(255, 255, 255, 0.4)',
                borderRadius: '16px',
                position: 'relative',
              }}
            >
              {/* Corner accents */}
              <div style={{ position: 'absolute', top: -2, left: -2, width: '18px', height: '18px', borderTop: '3px solid #2563EB', borderLeft: '3px solid #2563EB', borderTopLeftRadius: '6px' }} />
              <div style={{ position: 'absolute', top: -2, right: -2, width: '18px', height: '18px', borderTop: '3px solid #2563EB', borderRight: '3px solid #2563EB', borderTopRightRadius: '6px' }} />
              <div style={{ position: 'absolute', bottom: -2, left: -2, width: '18px', height: '18px', borderBottom: '3px solid #2563EB', borderLeft: '3px solid #2563EB', borderBottomLeftRadius: '6px' }} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: '18px', height: '18px', borderBottom: '3px solid #2563EB', borderRight: '3px solid #2563EB', borderBottomRightRadius: '6px' }} />
            </div>
          </div>
        )}

        {!scanning && permissionState !== 'denied' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              padding: '16px',
            }}
          >
            <div
              className="spinner"
              style={{ width: '36px', height: '36px', borderWidth: '3px', marginBottom: '12px' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#CBD5E1' }}>
              {permissionState === 'prompt' ? 'Requesting camera...' : 'Starting feed...'}
            </span>
          </div>
        )}
      </div>

      {/* Permission Denied Notice */}
      {permissionState === 'denied' && (
        <div style={{ textAlign: 'center', padding: '12px 16px', maxWidth: '360px', margin: '0 auto 16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
              no_photography
            </span>
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
            Camera Permission Required
          </h3>
          <p style={{ color: '#64748B', marginBottom: '16px', fontSize: '0.825rem', lineHeight: 1.5 }}>
            {error || 'Camera access is required to scan attendance QR codes.'}
          </p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleRetry}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              refresh
            </span>
            Try Again
          </button>
        </div>
      )}

      {/* Camera Selection Switcher */}
      {availableCameras.length > 1 && scanning && (
        <div
          style={{
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: '#F8FAFC',
            padding: '6px 14px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            maxWidth: '280px',
            width: '100%',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748B' }}>
            cameraswitch
          </span>
          <select
            value={selectedCameraId || ''}
            onChange={(e) => switchCamera(e.target.value || undefined)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {availableCameras.map((cam, idx) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error alert */}
      {error && permissionState !== 'denied' && (
        <div
          style={{
            padding: '10px 14px',
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            color: '#991B1B',
            fontSize: '0.825rem',
            marginBottom: '14px',
            maxWidth: '320px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{error}</p>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleRetry}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* Success Banner */}
      {lastScanned && !error && (
        <div
          style={{
            padding: '12px 18px',
            background: '#DCFCE7',
            border: '1px solid #86EFAC',
            borderRadius: '14px',
            color: '#166534',
            fontSize: '0.875rem',
            textAlign: 'center',
            marginBottom: '14px',
            maxWidth: '320px',
            width: '100%',
          }}
        >
          <strong style={{ display: 'block', fontSize: '0.925rem' }}>✓ Scanned Successfully</strong>
          <span style={{ fontSize: '0.775rem', opacity: 0.85 }}>Recording attendance...</span>
        </div>
      )}

      {/* Close Button */}
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => {
          stopScanner();
          if (onClose) onClose();
        }}
        style={{
          width: '100%',
          maxWidth: '280px',
          padding: '10px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#475569',
        }}
      >
        Close Scanner
      </button>
    </div>
  );
};

export default QrScanner;
