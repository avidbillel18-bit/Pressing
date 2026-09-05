package com.dz.pressing.bridges;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.SmsManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.webkit.JavascriptInterface;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class AndroidSMSBridge {

    private final Activity activity;
    private static final int SMS_PERMISSION_REQ_CODE = 8844;

    public AndroidSMSBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return true;
    }

    @JavascriptInterface
    public boolean checkPermission() {
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    @JavascriptInterface
    public boolean requestPermission() {
        if (checkPermission()) return true;
        ActivityCompat.requestPermissions(
            activity,
            new String[]{ Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE },
            SMS_PERMISSION_REQ_CODE
        );
        return false;
    }

    @JavascriptInterface
    public String getSimCards() {
        JSONArray arr = new JSONArray();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    SubscriptionManager sm = (SubscriptionManager) activity.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null) {
                        List<SubscriptionInfo> list = sm.getActiveSubscriptionInfoList();
                        if (list != null) {
                            for (SubscriptionInfo info : list) {
                                JSONObject obj = new JSONObject();
                                obj.put("slotIndex", info.getSimSlotIndex());
                                obj.put("displayName", info.getDisplayName().toString());
                                obj.put("carrierName", info.getCarrierName().toString());
                                obj.put("subscriptionId", info.getSubscriptionId());
                                arr.put(obj);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // ignore
        }
        return arr.toString();
    }

    @JavascriptInterface
    public String sendSms(String phoneNumber, String message, String simSlot) {
        JSONObject result = new JSONObject();
        try {
            if (!checkPermission()) {
                result.put("success", false);
                result.put("error", "لم يتم السماح بإرسال SMS. يمكنك تفعيل صلاحية SMS من إعدادات الهاتف.");
                return result.toString();
            }

            SmsManager smsManager = null;
            String simUsedLabel = "الافتراضية";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && simSlot != null && !"default".equalsIgnoreCase(simSlot)) {
                try {
                    SubscriptionManager sm = (SubscriptionManager) activity.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null && ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                        List<SubscriptionInfo> list = sm.getActiveSubscriptionInfoList();
                        if (list != null) {
                            int targetSlot = "sim1".equalsIgnoreCase(simSlot) ? 0 : 1;
                            for (SubscriptionInfo info : list) {
                                if (info.getSimSlotIndex() == targetSlot) {
                                    int subId = info.getSubscriptionId();
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        smsManager = activity.getSystemService(SmsManager.class).createForSubscriptionId(subId);
                                    } else {
                                        smsManager = SmsManager.getSmsManagerForSubscriptionId(subId);
                                    }
                                    simUsedLabel = "sim1".equalsIgnoreCase(simSlot) ? "SIM 1" : "SIM 2";
                                    break;
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    // fallback
                }
            }

            if (smsManager == null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    smsManager = activity.getSystemService(SmsManager.class);
                } else {
                    smsManager = SmsManager.getDefault();
                }
            }

            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }

            result.put("success", true);
            result.put("message", "✅ تم إرسال SMS للزبون بنجاح.");
            result.put("messageId", "sim_" + System.currentTimeMillis());
            result.put("simUsed", simUsedLabel);
            return result.toString();

        } catch (Exception e) {
            try {
                result.put("success", false);
                result.put("error", "❌ تعذر إرسال SMS: " + e.getMessage());
            } catch (Exception ignored) {}
            return result.toString();
        }
    }
}
