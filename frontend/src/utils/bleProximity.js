import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Attendance Service UUID
export const ATTENDIQ_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';

// Register native Android BLE Peripheral Advertiser plugin
const BleAdvertiser = registerPlugin('BleAdvertiser');

// Log-distance path loss constants for indoor 2.4 GHz BLE
const DEFAULT_MEASURED_POWER = -59; // RSSI expected at exactly 1 meter (dBm)
const PATH_LOSS_EXPONENT = 2.4; // Indoor classroom environment path-loss factor
export const DESK_HOVER_DISTANCE_THRESHOLD = 0.5; // Max meters for auto hover mark

/**
 * Checks if running natively inside Android container
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Calculates approximate physical distance in meters using Log-Distance Path Loss:
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
 * Student Phone BLE Peripheral: Broadcasts student roll number on desk
 */
let isBroadcasting = false;

export const startStudentBleBeacon = async (rollNumber) => {
  if (!isNativePlatform() || !rollNumber) return false;
  try {
    await BleAdvertiser.startAdvertising({ rollNumber: String(rollNumber).trim() });
    isBroadcasting = true;
    return true;
  } catch (err) {
    console.warn('Student BLE Beacon advertising failed:', err);
    isBroadcasting = false;
    return false;
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
 * Teacher Phone BLE Central Scanner:
 * Listens for student BLE beacons. When distance < 0.5m, triggers auto hover mark.
 */
let isScanning = false;

export const startBleRadarScan = async ({ onDeviceDetected, onDeviceHovered, onError }) => {
  if (!isNativePlatform()) return false;

  try {
    await initializeBle();

    const isEnabled = await BleClient.isEnabled();
    if (!isEnabled) {
      onError?.(new Error('Bluetooth is turned off. Please turn on Bluetooth.'));
      return false;
    }

    isScanning = true;

    await BleClient.requestLEScan(
      {
        services: [ATTENDIQ_SERVICE_UUID],
        allowDuplicates: true,
      },
      (result) => {
        const rssi = result.rssi;
        const distance = calculateDistanceMeters(rssi);
        const deviceId = result.device?.deviceId;

        // Extract student roll number from serviceData
        let studentRoll = null;
        if (result.serviceData) {
          const rawData =
            result.serviceData[ATTENDIQ_SERVICE_UUID] ||
            result.serviceData[ATTENDIQ_SERVICE_UUID.toLowerCase()] ||
            result.serviceData[ATTENDIQ_SERVICE_UUID.toUpperCase()];

          if (rawData) {
            try {
              const buffer = rawData.buffer || rawData;
              studentRoll = new TextDecoder().decode(new Uint8Array(buffer));
            } catch (decErr) {
              console.warn('Failed to decode student roll bytes:', decErr);
            }
          }
        }

        const devName = result.device?.name || result.localName || studentRoll || 'Desk Phone';

        const payload = {
          deviceId,
          name: devName,
          studentRoll: studentRoll?.trim() || null,
          rssi,
          distance,
        };

        onDeviceDetected?.(payload);

        // Immediate hover mark when physically within < 0.5m
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
    }
  } catch (err) {
    console.warn('Error stopping BLE scan:', err);
  }
};
