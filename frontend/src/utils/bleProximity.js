import { BleClient, ScanMode } from '@capacitor-community/bluetooth-le';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Attendance Service UUID
export const ATTENDIQ_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';

// Register native Android BLE Peripheral Advertiser plugin
const BleAdvertiser = registerPlugin('BleAdvertiser');

// Physical BLE proximity calibration for mobile smartphones:
// Phone BLE antennas inside cases typically broadcast between -55 dBm and -82 dBm when nearby
export const DESK_HOVER_DISTANCE_THRESHOLD = 2.0; // Realistic desk hover range (< 2.0m)

/**
 * Checks if running natively inside Android container
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();

// Calibrated Log-Distance Path Loss constants for 2.4 GHz BLE between smartphones indoors
const MEASURED_POWER_AT_1M = -68; // RSSI expected at exactly 1 meter
const PATH_LOSS_EXPONENT = 2.4; // Classroom propagation path loss exponent

/**
 * Calculates continuous physical distance in meters using standard Log-Distance Path Loss model:
 * d = 10 ^ ((MeasuredPower - RSSI) / (10 * N))
 */
export const calculateDistanceMeters = (rssi, txPower = MEASURED_POWER_AT_1M) => {
  if (!rssi || rssi === 0) return 999.0;
  const ratio = (txPower - rssi) / (10 * PATH_LOSS_EXPONENT);
  const distance = Math.pow(10, ratio);
  return Number(Math.max(0.1, distance).toFixed(2));
};

/**
 * Initialize Bluetooth hardware client
 */
let isBleInitialized = false;

export const initializeBle = async () => {
  if (!isNativePlatform()) return false;
  try {
    if (!isBleInitialized) {
      await BleClient.initialize();
      isBleInitialized = true;
    }
    return true;
  } catch (err) {
    console.warn('BLE Initialization warning:', err);
    return false;
  }
};

/**
 * Auto-Turn On Bluetooth if disabled
 */
export const ensureBluetoothEnabled = async () => {
  if (!isNativePlatform()) return true;
  try {
    await initializeBle();
    let isEnabled = false;
    try {
      isEnabled = await BleClient.isEnabled();
    } catch (e) {
      console.warn('BLE isEnabled check failed:', e);
    }

    if (!isEnabled) {
      try {
        await BleClient.requestEnable();
      } catch (reqErr) {
        console.warn('requestEnable rejected, attempting enable():', reqErr);
        try {
          await BleClient.enable();
        } catch (enErr) {
          console.warn('enable() fallback error:', enErr);
        }
      }

      try {
        isEnabled = await BleClient.isEnabled();
      } catch (e) {}
    }

    // Non-intrusive location check: do not open settings dialog repeatedly
    try {
      const loc = await BleClient.isLocationEnabled();
      if (loc && loc.value === false) {
        console.info("BLE Location service is disabled on device.");
      }
    } catch (ignored) {}

    return isEnabled;
  } catch (err) {
    console.warn('ensureBluetoothEnabled error:', err);
    return false;
  }
};

/**
 * Student Phone BLE Peripheral: Broadcasts student roll number on desk
 */
let isBroadcasting = false;

export const startStudentBleBeacon = async (rollNumber) => {
  if (!isNativePlatform() || !rollNumber) return false;
  try {
    // 1. Ensure Bluetooth hardware is on
    await ensureBluetoothEnabled();

    // 2. Start advertising roll number
    await BleAdvertiser.startAdvertising({ rollNumber: String(rollNumber).trim() });
    isBroadcasting = true;
    return true;
  } catch (err) {
    console.warn('Student BLE Beacon advertising failed:', err);
    isBroadcasting = false;
    throw err;
  }
};

export const stopStudentBleBeacon = async () => {
  if (!isNativePlatform() || !isBroadcasting) return;
  try {
    await BleAdvertiser.stopAdvertising();
    isBroadcasting = false;
  } catch (err) {
    console.warn('Student BLE Beacon stop failed:', err);
  }
};

/**
 * Decode hex string to ASCII/UTF-8
 */
const hexToString = (hex) => {
  if (!hex || typeof hex !== 'string') return '';
  let str = '';
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  for (let i = 0; i < clean.length; i += 2) {
    const code = parseInt(clean.substring(i, i + 2), 16);
    if (!isNaN(code) && code >= 32 && code <= 126) {
      str += String.fromCharCode(code);
    }
  }
  return str;
};

/**
 * Universal payload decoder handling hex strings (from Android BleClient),
 * plain text, DataViews, or ArrayBuffers.
 */
const decodePayload = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    // If it's a hex-encoded string from Android plugin
    if (/^[0-9a-fA-F]+$/.test(val) && val.length % 2 === 0) {
      const decodedHex = hexToString(val);
      if (decodedHex && decodedHex.length > 0) return decodedHex;
    }
    return val;
  }
  try {
    const buf = val.buffer || val;
    return new TextDecoder().decode(new Uint8Array(buf)).trim();
  } catch (e) {
    return '';
  }
};

/**
 * Checks if incoming scan result is from an AttendIQ beacon
 */
export const isAttendIqBeacon = (result) => {
  if (!result) return false;
  const name = result.device?.name || result.localName || '';
  if (name.includes('ATIQ_') || name.includes('STUDENT') || name.includes('nova')) return true;

  if (result.serviceData) {
    for (const key of Object.keys(result.serviceData)) {
      if (key.toLowerCase().includes('ffe0')) return true;
    }
  }
  // Check uuids array
  const uuidList = result.uuids || result.services || [];
  for (const s of uuidList) {
    if (s.toLowerCase().includes('ffe0')) return true;
  }

  // Check raw advertisement packet
  if (result.rawAdvertisement && typeof result.rawAdvertisement === 'string') {
    const raw = result.rawAdvertisement.toLowerCase();
    if (raw.includes('415449515f') || raw.includes('ffe0')) return true;
  }

  return false;
};

/**
 * Decode student roll number or ID from incoming BLE advertisement
 */
export const extractRollFromServiceData = (result) => {
  if (!result) return null;

  // 1. First priority: device name e.g. "ATIQ_nova"
  const devName = result.device?.name || result.localName || '';
  if (devName.includes('ATIQ_')) {
    const extracted = devName.split('ATIQ_')[1]?.trim();
    if (extracted) return extracted;
  }

  // 2. Second priority: serviceData payload with hex / string decoding
  if (result.serviceData) {
    for (const [key, val] of Object.entries(result.serviceData)) {
      if (key.toLowerCase().includes('ffe0')) {
        const decoded = decodePayload(val);
        if (decoded) {
          const clean = decoded.replace('ATIQ_', '').trim();
          if (clean) return clean;
        }
      }
    }
    // Strictly accept other service data keys only if they carry the explicit ATIQ_ signature
    for (const val of Object.values(result.serviceData)) {
      const decoded = decodePayload(val);
      if (decoded && decoded.includes('ATIQ_')) {
        const clean = decoded.replace('ATIQ_', '').trim();
        if (clean) return clean;
      }
    }
  }

  // 3. Third priority: raw advertisement hex scan for "ATIQ_" (415449515f)
  if (result.rawAdvertisement && typeof result.rawAdvertisement === 'string') {
    const raw = result.rawAdvertisement.toLowerCase();
    const marker = '415449515f'; // "ATIQ_" in hex
    const idx = raw.indexOf(marker);
    if (idx !== -1) {
      const restHex = raw.substring(idx + marker.length);
      const decoded = hexToString(restHex);
      if (decoded) {
        const clean = decoded.split(/[\x00-\x1F\x7F]/)[0].trim();
        if (clean) return clean;
      }
    }
  }

  // 4. Fallback: localName or device name if formatted as Roll
  if (devName && !devName.includes('Unknown') && !devName.includes('Desk Phone')) {
    return devName.replace('ATIQ_', '').trim();
  }

  return null;
};

// Shared state for the continuous BLE scanner (avoids scanner collision)
let isScanning = false;
const liveDetectedDevices = new Map();
const deviceListeners = new Set();

export const registerBleDetectionListener = (listener) => {
  deviceListeners.add(listener);
  return () => deviceListeners.delete(listener);
};

export const getLiveDetectedDevice = (id) => {
  if (!id) return null;
  const normalized = id.toLowerCase().trim();
  const entry = liveDetectedDevices.get(normalized);
  if (entry && (Date.now() - entry.timestamp) <= 5000) {
    return entry;
  }
  return null;
};

/**
 * Teacher Phone BLE Central Scanner:
 * Single continuous low-latency LE scanner that powers both auto-walk & targeted hover.
 */
export const startBleRadarScan = async ({ onDeviceDetected, onDeviceHovered, onError }) => {
  if (!isNativePlatform()) return false;

  try {
    const isEnabled = await ensureBluetoothEnabled();
    if (!isEnabled) {
      onError?.(new Error('Bluetooth could not be turned on. Please enable Bluetooth in Settings.'));
      return false;
    }

    if (isScanning) {
      return true; // Already running smoothly
    }

    isScanning = true;

    // Scan all nearby BLE devices to prevent hardware filter packet dropping
    await BleClient.requestLEScan(
      {
        scanMode: ScanMode.SCAN_MODE_LOW_LATENCY,
        allowDuplicates: true,
        allowExtendedAdvertising: true,
      },
      (result) => {
        const studentRoll = extractRollFromServiceData(result);
        if (!studentRoll && !isAttendIqBeacon(result)) {
          return;
        }

        const rssi = result.rssi;
        const distance = calculateDistanceMeters(rssi);
        const deviceId = result.device?.deviceId || `ble_${Math.random().toString(36).substring(7)}`;
        const devName = studentRoll ? `ATIQ_${studentRoll}` : (result.device?.name || result.localName || 'Desk Phone');
        const rollKey = (studentRoll || devName.replace('ATIQ_', '')).toLowerCase().trim();

        const payload = {
          deviceId,
          name: devName,
          studentRoll: rollKey,
          rssi,
          distance,
          timestamp: Date.now(),
        };

        // Update shared registry
        liveDetectedDevices.set(rollKey, payload);
        deviceListeners.forEach((fn) => {
          try {
            fn(payload);
          } catch (e) {}
        });

        onDeviceDetected?.(payload);

        // Auto-hover when physically within <= 0.5m
        if (distance <= DESK_HOVER_DISTANCE_THRESHOLD) {
          onDeviceHovered?.(payload);
        }
      },
    );

    return true;
  } catch (err) {
    console.error('Failed to start BLE radar scan:', err);
    isScanning = false;
    onError?.(err);
    return false;
  }
};

export const stopBleRadarScan = async () => {
  if (!isNativePlatform()) return;
  try {
    if (isScanning) {
      await BleClient.stopLEScan();
      isScanning = false;
      liveDetectedDevices.clear();
    }
  } catch (err) {
    console.warn('Error stopping BLE scan:', err);
    isScanning = false;
  }
};

/**
 * Targeted Proximity Listen for a specific Student:
 * Uses the live stream from the continuous scanner without starting a second competing scan.
 */
export const listenForStudentSignal = async (targetId, timeoutMs = 3500) => {
  if (!isNativePlatform() || !targetId) {
    return {
      success: false,
      error: 'NOT_NATIVE_BLE',
      message: 'Native Bluetooth required for physical proximity detection.',
    };
  }

  const normalized = targetId.toLowerCase().trim();

  // 1. Check if the continuous scanner already detected this student within the last 4 seconds
  const existing = getLiveDetectedDevice(normalized);
  if (existing && existing.distance <= DESK_HOVER_DISTANCE_THRESHOLD) {
    return {
      success: true,
      distance: existing.distance,
      rssi: existing.rssi,
      mode: 'live-cached-signal',
    };
  }

  // 2. Ensure continuous scanner is running
  await ensureBluetoothEnabled();
  if (!isScanning) {
    await startBleRadarScan({});
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve({
          success: false,
          error: 'NOT_IN_RANGE',
          message: `No Bluetooth signal received from ID ${targetId}. Please ensure student's Desk Check-in is open within desk range (< 2m).`,
        });
      }
    }, timeoutMs);

    const unsubscribe = registerBleDetectionListener((dev) => {
      if (!resolved && dev.studentRoll) {
        const rollMatch = dev.studentRoll.toLowerCase().trim();
        if (rollMatch === normalized) {
          if (dev.distance <= DESK_HOVER_DISTANCE_THRESHOLD) {
            resolved = true;
            clearTimeout(timer);
            unsubscribe();
            resolve({
              success: true,
              distance: dev.distance,
              rssi: dev.rssi,
              mode: 'shared-stream-acquired',
            });
          }
        }
      }
    });
  });
};
