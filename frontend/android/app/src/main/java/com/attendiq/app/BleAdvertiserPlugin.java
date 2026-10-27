package com.attendiq.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.os.Build;
import android.os.ParcelUuid;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@CapacitorPlugin(
    name = "BleAdvertiser",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class BleAdvertiserPlugin extends Plugin {
    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback callback;
    private boolean isAdvertising = false;
    private String originalAdapterName = null;

    private static final String SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
    private static final int MANUFACTURER_ID = 0xFFFF; // Standard experimental BLE Manufacturer ID

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
                requestPermissionForAlias("bluetooth", call, "advertisingPermissionCallback");
                return;
            }
        } else {
            if (getPermissionState("location") != PermissionState.GRANTED) {
                requestPermissionForAlias("location", call, "advertisingPermissionCallback");
                return;
            }
        }
        doStartAdvertising(call);
    }

    @PermissionCallback
    private void advertisingPermissionCallback(PluginCall call) {
        boolean granted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            granted = getPermissionState("bluetooth") == PermissionState.GRANTED;
        } else {
            granted = getPermissionState("location") == PermissionState.GRANTED;
        }

        if (granted) {
            doStartAdvertising(call);
        } else {
            call.reject("Nearby devices (Bluetooth) permission was denied. Please allow it in App Settings.");
        }
    }

    private void doStartAdvertising(PluginCall call) {
        String studentRoll = call.getString("rollNumber", "STUDENT");
        if (studentRoll == null || studentRoll.trim().isEmpty()) {
            studentRoll = "STUDENT";
        }
        studentRoll = studentRoll.trim();

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Device hardware does not support BLE.");
            return;
        }

        // Auto-enable bluetooth if turned off
        if (!adapter.isEnabled()) {
            try {
                adapter.enable();
            } catch (Exception ignored) {}
        }

        // Save original name to restore on stop (Issue 12)
        if (originalAdapterName == null) {
            try {
                originalAdapterName = adapter.getName();
            } catch (Exception ignored) {}
        }

        try {
            adapter.setName("ATIQ_" + studentRoll);
        } catch (Exception ignored) {}

        advertiser = adapter.getBluetoothLeAdvertiser();
        if (advertiser == null) {
            call.reject("Device hardware does not support BLE Peripheral advertising.");
            return;
        }

        if (isAdvertising && callback != null) {
            try {
                advertiser.stopAdvertising(callback);
            } catch (Exception ignored) {}
            isAdvertising = false;
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0)
                .build();

        // Build 16-byte ultra-compact Primary Advertisement Packet (Guaranteed <= 31 bytes)
        // Uses Manufacturer Specific Data (0xFFFF): [Length 1B][Type 0xFF 1B][ID 2B][Data "ATIQ_<roll>"]
        // Total size: 3 (flags) + 4 (hdr) + 9 ("ATIQ_nova") = 16 bytes! Fits in 100% of Android devices.
        byte[] payloadBytes = ("ATIQ_" + studentRoll).getBytes(StandardCharsets.UTF_8);
        if (payloadBytes.length > 20) {
            byte[] truncated = new byte[20];
            System.arraycopy(payloadBytes, 0, truncated, 0, 20);
            payloadBytes = truncated;
        }

        AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addManufacturerData(MANUFACTURER_ID, payloadBytes)
                .build();

        // Scan response packet carries device name ATIQ_<studentRoll> within its own independent 31-byte budget
        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .setIncludeTxPowerLevel(false)
                .build();

        final String finalRoll = studentRoll;
        callback = new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                super.onStartSuccess(settingsInEffect);
                isAdvertising = true;
                JSObject ret = new JSObject();
                ret.put("advertising", true);
                ret.put("rollNumber", finalRoll);
                call.resolve(ret);
            }

            @Override
            public void onStartFailure(int errorCode) {
                super.onStartFailure(errorCode);
                isAdvertising = false;
                String errorDesc;
                switch (errorCode) {
                    case ADVERTISE_FAILED_DATA_TOO_LARGE:
                        errorDesc = "Data too large (code 1)";
                        break;
                    case ADVERTISE_FAILED_TOO_MANY_ADVERTISERS:
                        errorDesc = "Too many advertisers (code 2)";
                        break;
                    case ADVERTISE_FAILED_ALREADY_STARTED:
                        errorDesc = "Already started (code 3)";
                        break;
                    case ADVERTISE_FAILED_INTERNAL_ERROR:
                        errorDesc = "Internal BLE error (code 4)";
                        break;
                    case ADVERTISE_FAILED_FEATURE_UNSUPPORTED:
                        errorDesc = "Device does not support BLE Peripheral advertising (code 5)";
                        break;
                    default:
                        errorDesc = "code " + errorCode;
                        break;
                }
                call.reject("BLE Advertising start failed: " + errorDesc);
            }
        };

        try {
            advertiser.startAdvertising(settings, data, scanResponse, callback);
        } catch (SecurityException se) {
            call.reject("Missing Bluetooth permission: " + se.getMessage());
        } catch (Exception ex) {
            call.reject("Exception starting BLE advertising: " + ex.getMessage());
        }
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        doStopAdvertising();
        JSObject ret = new JSObject();
        ret.put("advertising", false);
        call.resolve(ret);
    }

    private void doStopAdvertising() {
        if (advertiser != null && callback != null && isAdvertising) {
            try {
                advertiser.stopAdvertising(callback);
            } catch (Exception ignored) {}
            isAdvertising = false;
        }
        // Restore original phone Bluetooth name (Issue 12)
        if (originalAdapterName != null) {
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter != null) {
                    adapter.setName(originalAdapterName);
                }
            } catch (Exception ignored) {}
            originalAdapterName = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        doStopAdvertising();
    }
}
