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

    private static final String SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";

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
                .setConnectable(false)
                .setTimeout(0)
                .build();

        ParcelUuid pUuid = new ParcelUuid(UUID.fromString(SERVICE_UUID));

        // Primary 31-byte advertisement packet
        AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(pUuid)
                .build();

        // Scan response packet carrying student roll number safely within limits
        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceData(pUuid, studentRoll.getBytes(StandardCharsets.UTF_8))
                .build();

        callback = new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                super.onStartSuccess(settingsInEffect);
                isAdvertising = true;
                JSObject ret = new JSObject();
                ret.put("advertising", true);
                ret.put("rollNumber", studentRoll);
                call.resolve(ret);
            }

            @Override
            public void onStartFailure(int errorCode) {
                super.onStartFailure(errorCode);
                isAdvertising = false;
                call.reject("BLE Advertising start failed: code " + errorCode);
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
        if (advertiser != null && callback != null && isAdvertising) {
            try {
                advertiser.stopAdvertising(callback);
            } catch (Exception ignored) {}
            isAdvertising = false;
        }
        JSObject ret = new JSObject();
        ret.put("advertising", false);
        call.resolve(ret);
    }
}
