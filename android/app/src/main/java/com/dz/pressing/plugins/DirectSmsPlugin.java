package com.dz.pressing.plugins;

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
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "DirectSmsPlugin",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE }
        )
    }
)
public class DirectSmsPlugin extends Plugin {

    private static final String SMS_SENT_ACTION = "com.dz.pressing.SMS_SENT";
    private static final String SMS_DELIVERED_ACTION = "com.dz.pressing.SMS_DELIVERED";

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context context = getContext();
        boolean hasSendSms = ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
        
        JSObject ret = new JSObject();
        ret.put("sms", hasSendSms ? "granted" : "prompt");
        ret.put("status", hasSendSms ? "granted" : "prompt");
        call.resolve(ret);
    }

    @PluginMethod
    public void getSimCards(PluginCall call) {
        Context context = getContext();
        JSArray simCardsArray = new JSArray();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    SubscriptionManager subscriptionManager = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (subscriptionManager != null) {
                        List<SubscriptionInfo> subscriptionInfoList = subscriptionManager.getActiveSubscriptionInfoList();
                        if (subscriptionInfoList != null) {
                            for (SubscriptionInfo info : subscriptionInfoList) {
                                JSObject sim = new JSObject();
                                sim.put("slotIndex", info.getSimSlotIndex());
                                sim.put("displayName", info.getDisplayName().toString());
                                sim.put("carrierName", info.getCarrierName().toString());
                                sim.put("subscriptionId", info.getSubscriptionId());
                                simCardsArray.put(sim);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Non-critical, fallback to standard slot 0 and 1
        }

        if (simCardsArray.length() == 0) {
            JSObject sim1 = new JSObject();
            sim1.put("slotIndex", 0);
            sim1.put("displayName", "SIM 1");
            sim1.put("carrierName", "SIM 1");
            sim1.put("subscriptionId", 1);
            simCardsArray.put(sim1);

            JSObject sim2 = new JSObject();
            sim2.put("slotIndex", 1);
            sim2.put("displayName", "SIM 2");
            sim2.put("carrierName", "SIM 2");
            sim2.put("subscriptionId", 2);
            simCardsArray.put(sim2);
        }

        JSObject ret = new JSObject();
        ret.put("simCards", simCardsArray);
        call.resolve(ret);
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String message = call.getString("message");
        String simSlot = call.getString("simSlot", "default");

        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            call.reject("⚠️ لا يوجد رقم هاتف لهذا الزبون.");
            return;
        }

        if (message == null || message.trim().isEmpty()) {
            call.reject("⚠️ محتوى الرسالة فارغ.");
            return;
        }

        Context context = getContext();

        // 1. Verify Permission
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("لم يتم السماح بإرسال SMS. يمكنك تفعيل صلاحية SMS من إعدادات الهاتف.");
            return;
        }

        // 2. Select Appropriate SmsManager for SIM slot (Dual SIM support)
        SmsManager smsManager = null;
        String simUsedLabel = "الافتراضية";

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && !"default".equalsIgnoreCase(simSlot)) {
                SubscriptionManager subscriptionManager = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                if (subscriptionManager != null && ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    List<SubscriptionInfo> subList = subscriptionManager.getActiveSubscriptionInfoList();
                    if (subList != null) {
                        int targetSlot = "sim1".equalsIgnoreCase(simSlot) ? 0 : 1;
                        for (SubscriptionInfo info : subList) {
                            if (info.getSimSlotIndex() == targetSlot) {
                                int subId = info.getSubscriptionId();
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    smsManager = context.getSystemService(SmsManager.class).createForSubscriptionId(subId);
                                } else {
                                    smsManager = SmsManager.getSmsManagerForSubscriptionId(subId);
                                }
                                simUsedLabel = "sim1".equalsIgnoreCase(simSlot) ? "SIM 1" : "SIM 2";
                                break;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Fallback to default
        }

        if (smsManager == null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = context.getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }
        }

        if (smsManager == null) {
            call.reject("❌ تعذر الوصول لخدمة SMS بالهاتف.");
            return;
        }

        // 3. Register PendingIntent & BroadcastReceiver to get real transmission outcome
        final String actionId = SMS_SENT_ACTION + "_" + System.currentTimeMillis();
        final SmsManager finalSmsManager = smsManager;
        final String finalSimUsed = simUsedLabel;

        BroadcastReceiver sentReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context arg0, Intent arg1) {
                try {
                    context.unregisterReceiver(this);
                } catch (Exception e) {
                    // ignore
                }

                switch (getResultCode()) {
                    case Activity.RESULT_OK:
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("message", "✅ تم إرسال SMS للزبون بنجاح.");
                        ret.put("messageId", "sim_" + System.currentTimeMillis());
                        ret.put("simUsed", finalSimUsed);
                        call.resolve(ret);
                        break;
                    case SmsManager.RESULT_ERROR_NO_SERVICE:
                        call.reject("❌ فشل الإرسال: لا توجد تغطية شبكة هاتف (No Service).");
                        break;
                    case SmsManager.RESULT_ERROR_RADIO_OFF:
                        call.reject("❌ فشل الإرسال: وضع الطيران مفعّل أو شبكة الهاتف معطلة.");
                        break;
                    case SmsManager.RESULT_ERROR_NULL_PDU:
                    case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                    default:
                        call.reject("❌ تعذر إرسال SMS. تأكد من توفر رصيد بالـ SIM وصحة الرقم.");
                        break;
                }
            }
        };

        try {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(sentReceiver, new IntentFilter(actionId), Context.RECEIVER_NOT_EXPORTED);
            } else {
                context.registerReceiver(sentReceiver, new IntentFilter(actionId));
            }

            PendingIntent sentPI = PendingIntent.getBroadcast(context, 0, new Intent(actionId), flags);

            ArrayList<String> parts = finalSmsManager.divideMessage(message);
            if (parts.size() > 1) {
                ArrayList<PendingIntent> sentIntents = new ArrayList<>();
                for (int i = 0; i < parts.size(); i++) {
                    sentIntents.add(i == 0 ? sentPI : null);
                }
                finalSmsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null);
            } else {
                finalSmsManager.sendTextMessage(phoneNumber, null, message, sentPI, null);
            }
        } catch (Exception e) {
            try {
                context.unregisterReceiver(sentReceiver);
            } catch (Exception ex) {
                // ignore
            }
            call.reject("❌ تعذر إرسال SMS: " + e.getMessage());
        }
    }
}
