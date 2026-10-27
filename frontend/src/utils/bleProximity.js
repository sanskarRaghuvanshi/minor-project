import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

// Attendance Service UUID
export const ATTENDIQ_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';

// Log-distance path loss constants for indoor 2.4 GHz BLE
const DEFAULT_MEASURED_POWER = -59; // RSSI expected at exactly 1 meter (dBm)
const PATH_LOSS_EXPONENT = 2.4; // Indoor classroom environment path-loss factor
export const DESK_HOVER_DISTANCE_THRESHOLD = 0.5; // Max meters for auto hover mark

/**
 * Checks if running natively inside Android/iOS container
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Calculates approximate physical distance in meters using the Log-Distance Path Loss model:
 * Distance = 10 ^ ((Measured Power - RSSI) / (10 * N))
 */
export const calculateDistanceMeters = (rssi, txPower = DEFAULT_MEASURED_POWER) => {
  if (!rssi || rssi === 0) return 999.0;
  const ratio = (txPower - rssi) / (10 * PATH_LOSS_EXPONENT);
  const distance = Math.pow(10, ratio);
  return Number(distance.toFixed(2));
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
    console.warn('BLE Initialization failed or not supported:', err);
    return false;
  }
};

/**
 * Starts continuous BLE scanning for Teacher Radar
 * When a student device is detected within < 0.5m, onDeviceHovered is called.
 */
let isScanning = false;

export const startBleRadarScan = async ({ onDeviceDetected, onDeviceHovered, onError }) => {
  if (!isNativePlatform()) {
    console.log('BLE Radar: Browser environment detected. Using simulated/hybrid heartbeat.');
    return false;
  }

  try {
    await initializeBle();

    // Check / Request Bluetooth enabled
    const isEnabled = await BleClient.isEnabled();
    if (!isEnabled) {
      onError?.(new Error('Bluetooth is turned off. Please turn on Bluetooth.'));
      return false;
    }

    isScanning = true;

    await BleClient.requestLEScan(
      {
        allowDuplicates: true,
      },
      (result) => {
        const rssi = result.rssi;
        const distance = calculateDistanceMeters(rssi);
        const deviceName = result.device?.name || result.localName || 'Desk Device';
        const deviceId = result.device?.deviceId;

        // Notify general detection
        onDeviceDetected?.({
          deviceId,
          name: deviceName,
          rssi,
          distance,
        });

        // Trigger immediate hover mark if within close desk proximity (< 0.5m)
        if (distance <= DESK_HOVER_DISTANCE_THRESHOLD) {
          onDeviceHovered?.({
            deviceId,
            name: deviceName,
            rssi,
            distance,
          });
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

/**
 * Stops continuous BLE scanning
 */
export const stopBleRadarScan = async () => {
  if (!isNativePlatform()) return;
  try {
    if (isScanning) {
      await BleClient.stopLEScan();
      isScanning = false;
    }
  } catch (err) {
    console.warn('Error stopping BLE LE scan:', err);
  }
};
