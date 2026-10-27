import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axiosInstance from '../../api/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../common/Toast';

const QrScanner = ({ onScanSuccess, onScanError, onClose }) => {
  const { addToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');

  // GPS Geolocation state for classroom verification
  const [coords, setCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('prompt'); // 'prompt' | 'locating' | 'ready' | 'denied'
  const coordsRef = useRef(null);

  const isMountedRef = useRef(true);
  const html5QrcodeRef = useRef(null);
  const isProcessingRef = useRef(false);
  const selectedCameraIdRef = useRef(null);
  const fileInputRef = useRef(null);

  // Acquire student GPS coordinates
  const acquireGps = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus('denied');
        resolve(null);
        return;
      }
      setGpsStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMountedRef.current) return resolve(null);
          const currentCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
          };
          coordsRef.current = currentCoords;
          setCoords(currentCoords);
          setGpsStatus('ready');
          resolve(currentCoords);
        },
        (err) => {
          console.warn('Student GPS permission/fetch error:', err);
          if (isMountedRef.current) {
            setGpsStatus('denied');
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    });
  }, []);

  // Check geolocation permission state on mount and trigger prompt
  useEffect(() => {
    acquireGps();
  }, [acquireGps]);

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

        // If GPS is not acquired yet, try acquiring it now
        let activeCoords = coordsRef.current || coords;
        if (!activeCoords) {
          activeCoords = await acquireGps();
        }

        const payload = { sessionToken };
        if (activeCoords?.lat != null && activeCoords?.lng != null) {
          payload.lat = activeCoords.lat;
          payload.lng = activeCoords.lng;
        }

        const { data } = await axiosInstance.post(ENDPOINTS.STUDENT.SCAN_ATTENDANCE, payload);

        setScanResult(data.data);

        if (data.data?.alreadyScanned) {
          addToast('Attendance was already marked for this session', 'info');
        } else if (data.data?.distance != null) {
          addToast(
            `Attendance marked! (Verified inside classroom • ${data.data.distance}m away)`,
            'success',
          );
        } else {
          addToast('Attendance marked successfully!', 'success');
        }

        if (onScanSuccess) {
          onScanSuccess(data.data);
        }
      } catch (err) {
        let errorMessage = 'Failed to mark attendance';
        const errorCode = err.response?.data?.errorCode;

        if (errorCode === 'GEOFENCE_VIOLATION') {
          errorMessage =
            err.response?.data?.message ||
            'Geo-fence check failed: You are outside the classroom radius (50m).';
        } else if (errorCode === 'LOCATION_REQUIRED') {
          errorMessage =
            'Classroom GPS verification is required. Tap "Enable Location" to allow GPS in your browser.';
        } else if (errorCode === 'ALREADY_SCANNED') {
          errorMessage = 'You have already scanned this QR code';
        } else if (errorCode === 'INVALID_QR') {
          errorMessage = 'Invalid or non-existent QR code session';
        } else if (errorCode === 'QR_EXPIRED') {
          errorMessage = 'This QR session has expired or been closed by the teacher';
        } else if (errorCode === 'FORBIDDEN') {
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
        }, 2200);
      }
    },
    [addToast, onScanSuccess, onScanError, coords, acquireGps],
  );

  const handleScanError = useCallback((errorMessage) => {
    console.debug('QR scan frame error:', errorMessage);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');

      let fileScanner = null;
      try {
        fileScanner = new Html5Qrcode('qr-file-reader-dummy');
        const decodedText = await fileScanner.scanFile(file, false);
        if (decodedText) {
          await handleScanSuccess(decodedText);
        }
      } finally {
        if (fileScanner) {
          try {
            await fileScanner.clear();
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Failed to parse uploaded QR image:', err);
      const msg = 'No readable QR code found in the image. Please try a clearer picture.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
    setScanResult(null);
    setError('');
    acquireGps();
    await stopScanner();
    setTimeout(startScanner, 400);
  }, [stopScanner, startScanner, acquireGps]);

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

      {/* Hidden dummy container for file scanning */}
      <div id="qr-file-reader-dummy" style={{ display: 'none' }} />

      {/* Hidden File Input for QR Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* GPS Location Pill Indicator / Enable Button */}
      {gpsStatus !== 'ready' ? (
        <button
          type="button"
          onClick={acquireGps}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '100px',
            fontSize: '11px',
            fontWeight: 700,
            marginBottom: '12px',
            cursor: 'pointer',
            background: gpsStatus === 'locating' ? '#FEF3C7' : '#EFF6FF',
            color: gpsStatus === 'locating' ? '#D97706' : '#2563EB',
            border: `1px solid ${gpsStatus === 'locating' ? '#FDE68A' : '#BFDBFE'}`,
            boxShadow: '0 1px 3px rgba(37,99,235,0.1)',
            transition: 'all 0.15s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            {gpsStatus === 'locating' ? 'sync' : 'near_me'}
          </span>
          <span>
            {gpsStatus === 'locating'
              ? 'Requesting GPS Location...'
              : '📍 Tap to Allow Classroom Location (Required for Geo-Fence)'}
          </span>
        </button>
      ) : (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '11px',
            fontWeight: 700,
            marginBottom: '12px',
            background: '#ECFDF5',
            color: '#059669',
            border: '1px solid #BBF7D0',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#059669' }}>
            location_on
          </span>
          <span>GPS Active • Classroom Check Ready (±{coords?.accuracy || 0}m)</span>
        </div>
      )}

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
              <div
                style={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  width: '18px',
                  height: '18px',
                  borderTop: '3px solid #2563EB',
                  borderLeft: '3px solid #2563EB',
                  borderTopLeftRadius: '6px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: '18px',
                  height: '18px',
                  borderTop: '3px solid #2563EB',
                  borderRight: '3px solid #2563EB',
                  borderTopRightRadius: '6px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  left: -2,
                  width: '18px',
                  height: '18px',
                  borderBottom: '3px solid #2563EB',
                  borderLeft: '3px solid #2563EB',
                  borderBottomLeftRadius: '6px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: '18px',
                  height: '18px',
                  borderBottom: '3px solid #2563EB',
                  borderRight: '3px solid #2563EB',
                  borderBottomRightRadius: '6px',
                }}
              />
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

      {/* Action Controls (Camera Switcher & Upload Image Button) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          maxWidth: '320px',
          width: '100%',
          marginBottom: '14px',
        }}
      >
        {/* Upload QR Image Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            flex: 1,
            minWidth: '130px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: '#F8FAFC',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#1E293B',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563EB' }}>
            {isUploading ? 'sync' : 'upload_file'}
          </span>
          <span>{isUploading ? 'Processing...' : 'Upload QR Image'}</span>
        </button>

        {/* Camera Switcher if multiple cameras */}
        {availableCameras.length > 1 && scanning && (
          <div
            style={{
              flex: 1,
              minWidth: '130px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#F8FAFC',
              padding: '8px 12px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
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
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1E293B',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              {availableCameras.map((cam, idx) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Cam ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

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
            Retry Scanner
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
          <span style={{ fontSize: '0.775rem', opacity: 0.9 }}>
            {scanResult?.distance != null
              ? `Verified inside classroom (${scanResult.distance}m away)`
              : 'Attendance recorded successfully'}
          </span>
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
