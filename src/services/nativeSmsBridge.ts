import { Capacitor, registerPlugin } from '@capacitor/core';
import { SimSlotPreference, SimCardInfo } from '../types';

export interface NativeSmsResult {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
  simUsed?: string;
  isNative: boolean;
}

export interface NativePermissionStatus {
  granted: boolean;
  canRequest: boolean;
  status: 'granted' | 'denied' | 'prompt' | 'unavailable';
}

export interface DirectSmsPluginInterface {
  checkPermissions(): Promise<{ sms: string; status: string }>;
  requestPermissions(): Promise<{ sms: string; status: string }>;
  sendSms(options: {
    phoneNumber: string;
    message: string;
    simSlot?: string;
  }): Promise<{ success: boolean; message?: string; messageId?: string; simUsed?: string; error?: string }>;
  getSimCards(): Promise<{ simCards: SimCardInfo[] }>;
}

const DirectSmsPlugin = registerPlugin<DirectSmsPluginInterface>('DirectSmsPlugin');

declare global {
  interface Window {
    // Standard JavascriptInterface for custom Android WebView wrapper
    AndroidSMSBridge?: {
      sendSms: (phoneNumber: string, message: string, simSlot?: string) => string | boolean;
      checkPermission?: () => boolean | string;
      requestPermission?: () => boolean | string;
      getSimCards?: () => string; // JSON string of SimCardInfo[]
      isAvailable?: () => boolean;
    };
  }
}

const SIM_PREF_KEY = 'dz_laundry_sim_slot_pref';

/**
 * Get the saved SIM slot preference from local storage
 */
export function getSavedSimPreference(): SimSlotPreference {
  try {
    const saved = localStorage.getItem(SIM_PREF_KEY);
    if (saved === 'sim1' || saved === 'sim2') return saved;
  } catch (e) {
    console.warn('Could not read SIM pref', e);
  }
  return 'default';
}

/**
 * Save SIM slot preference
 */
export function setSavedSimPreference(pref: SimSlotPreference): void {
  try {
    localStorage.setItem(SIM_PREF_KEY, pref);
  } catch (e) {
    console.warn('Could not write SIM pref', e);
  }
}

/**
 * Check if the Android Native Bridge is active on the current device
 */
export function isNativeAndroidBridgeAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check if running inside Android WebView with JavascriptInterface
  if (window.AndroidSMSBridge && typeof window.AndroidSMSBridge.sendSms === 'function') {
    return true;
  }

  // 2. Check if running in Capacitor Native Android environment
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return true;
  }

  return false;
}

/**
 * Check if SEND_SMS permission is granted
 */
export async function checkNativeSmsPermission(): Promise<NativePermissionStatus> {
  // 1. Android JavascriptInterface
  if (window.AndroidSMSBridge?.checkPermission) {
    try {
      const res = window.AndroidSMSBridge.checkPermission();
      const isGranted = res === true || res === 'granted' || res === 'true';
      return {
        granted: isGranted,
        canRequest: !isGranted,
        status: isGranted ? 'granted' : 'prompt',
      };
    } catch (e) {
      console.warn('Error checking permission via AndroidSMSBridge', e);
    }
  }

  // 2. Capacitor Plugin check if available
  if (Capacitor.isNativePlatform()) {
    try {
      if (DirectSmsPlugin && typeof DirectSmsPlugin.checkPermissions === 'function') {
        const perm = await DirectSmsPlugin.checkPermissions();
        const isGranted = perm.sms === 'granted' || perm.status === 'granted';
        return {
          granted: isGranted,
          canRequest: perm.sms !== 'denied',
          status: isGranted ? 'granted' : 'prompt',
        };
      }
    } catch (e) {
      console.warn('Capacitor checkPermissions error', e);
    }
  }

  // Web Browser environment
  return {
    granted: false,
    canRequest: true,
    status: 'prompt',
  };
}

/**
 * Request SEND_SMS permission from the user
 */
export async function requestNativeSmsPermission(): Promise<boolean> {
  // 1. Android JavascriptInterface
  if (window.AndroidSMSBridge?.requestPermission) {
    try {
      const res = window.AndroidSMSBridge.requestPermission();
      return res === true || res === 'granted' || res === 'true';
    } catch (e) {
      console.warn('Error requesting permission via AndroidSMSBridge', e);
    }
  }

  // 2. Capacitor Plugin request
  if (Capacitor.isNativePlatform()) {
    try {
      if (DirectSmsPlugin && typeof DirectSmsPlugin.requestPermissions === 'function') {
        const res = await DirectSmsPlugin.requestPermissions();
        return res.sms === 'granted' || res.status === 'granted';
      }
    } catch (e) {
      console.warn('Capacitor requestPermissions error', e);
    }
  }

  return false;
}

/**
 * Get list of available active SIM cards from device (Dual SIM support)
 */
export async function getNativeSimCards(): Promise<SimCardInfo[]> {
  if (window.AndroidSMSBridge?.getSimCards) {
    try {
      const raw = window.AndroidSMSBridge.getSimCards();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error fetching SIM cards from bridge', e);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      if (DirectSmsPlugin && typeof DirectSmsPlugin.getSimCards === 'function') {
        const res = await DirectSmsPlugin.getSimCards();
        if (res?.simCards && Array.isArray(res.simCards)) {
          return res.simCards;
        }
      }
    } catch (e) {
      console.warn('Capacitor getSimCards error', e);
    }
  }

  return [
    { slotIndex: 0, displayName: 'SIM 1', carrierName: 'الشريحة الأولى (SIM 1)', subscriptionId: 1 },
    { slotIndex: 1, displayName: 'SIM 2', carrierName: 'الشريحة الثانية (SIM 2)', subscriptionId: 2 },
  ];
}

/**
 * Send real SMS directly from the phone's SIM card using Android SmsManager
 */
export async function sendDirectNativeSms(params: {
  phoneNumber: string; // international or local phone number e.g. +213550123456
  message: string;
  simSlot?: SimSlotPreference;
}): Promise<NativeSmsResult> {
  const { phoneNumber, message } = params;
  const simSlot = params.simSlot || getSavedSimPreference();

  // 1. Try Android JavascriptInterface Bridge (SmsManager)
  if (window.AndroidSMSBridge && typeof window.AndroidSMSBridge.sendSms === 'function') {
    try {
      const response = window.AndroidSMSBridge.sendSms(phoneNumber, message, simSlot);
      
      // Response can be a JSON string with details or boolean
      if (typeof response === 'string') {
        try {
          const parsed = JSON.parse(response);
          if (parsed.success) {
            return {
              success: true,
              message: '✅ تم إرسال SMS للزبون بنجاح.',
              messageId: parsed.messageId || `native_${Date.now()}`,
              simUsed: parsed.simUsed || (simSlot === 'default' ? 'الافتراضية' : simSlot === 'sim1' ? 'SIM 1' : 'SIM 2'),
              isNative: true,
            };
          } else {
            return {
              success: false,
              error: parsed.error || '❌ تعذر إرسال SMS.',
              isNative: true,
            };
          }
        } catch {
          if (response.toLowerCase().includes('ok') || response.toLowerCase().includes('success')) {
            return {
              success: true,
              message: '✅ تم إرسال SMS للزبون بنجاح.',
              messageId: `native_${Date.now()}`,
              isNative: true,
            };
          } else {
            return {
              success: false,
              error: response || '❌ تعذر إرسال SMS.',
              isNative: true,
            };
          }
        }
      }

      if (response === true) {
        return {
          success: true,
          message: '✅ تم إرسال SMS للزبون بنجاح.',
          messageId: `native_${Date.now()}`,
          isNative: true,
        };
      } else {
        return {
          success: false,
          error: '❌ تعذر إرسال SMS.',
          isNative: true,
        };
      }
    } catch (e: any) {
      console.error('Error invoking AndroidSMSBridge.sendSms', e);
      return {
        success: false,
        error: e?.message || '❌ تعذر إرسال SMS.',
        isNative: true,
      };
    }
  }

  // 2. Try Capacitor DirectSmsPlugin
  if (Capacitor.isNativePlatform()) {
    try {
      if (DirectSmsPlugin && typeof DirectSmsPlugin.sendSms === 'function') {
        const res = await DirectSmsPlugin.sendSms({
          phoneNumber,
          message,
          simSlot,
        });

        if (res?.success) {
          return {
            success: true,
            message: '✅ تم إرسال SMS للزبون بنجاح.',
            messageId: res.messageId || `cap_${Date.now()}`,
            simUsed: res.simUsed || simSlot,
            isNative: true,
          };
        } else {
          return {
            success: false,
            error: res?.error || '❌ تعذر إرسال SMS.',
            isNative: true,
          };
        }
      }
    } catch (e: any) {
      console.error('Capacitor DirectSmsPlugin error', e);
      return {
        success: false,
        error: e?.message || '❌ تعذر إرسال SMS.',
        isNative: true,
      };
    }
  }

  // 3. Not in Android Native APK (Running in Web Browser / Preview)
  return {
    success: false,
    error: 'WEB_PREVIEW_MODE',
    isNative: false,
  };
}

/**
 * Launch Android SMS messaging app (sms URI fallback when outside native APK)
 */
export function openDeviceSmsApp(phoneNumber: string, message: string): void {
  try {
    const cleanNumber = phoneNumber.replace(/\s+/g, '');
    const encodedBody = encodeURIComponent(message);
    const smsUrl = `sms:${cleanNumber}?body=${encodedBody}`;
    window.location.href = smsUrl;
  } catch (e) {
    console.warn('Could not launch SMS app URI', e);
  }
}
