import { validateAlgerianPhone, buildOrderReadySmsMessage } from '../lib/orderUtils';
import {
  sendDirectNativeSms,
  checkNativeSmsPermission,
  requestNativeSmsPermission,
  isNativeAndroidBridgeAvailable,
  openDeviceSmsApp,
  getSavedSimPreference,
  setSavedSimPreference,
  getNativeSimCards,
  NativePermissionStatus,
} from './nativeSmsBridge';
import { SimSlotPreference, SimCardInfo } from '../types';

export interface SendSmsParams {
  orderId?: string;
  orderNumber: number;
  customerName: string;
  phoneNumber: string;
  customMessage?: string;
  simSlot?: SimSlotPreference;
}

export interface SendSmsResult {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
  timestamp?: number;
  phoneFormatted?: string;
  simUsed?: string;
  isNative?: boolean;
  needsPermissionPrompt?: boolean;
  openedSmsApp?: boolean;
}

export interface NativeSmsStatus {
  isNativeAvailable: boolean;
  simPreference: SimSlotPreference;
  permissionStatus: NativePermissionStatus;
  availableSims: SimCardInfo[];
}

/**
 * Send real SMS to customer using the phone's native SIM card via Android Native Bridge
 */
export async function sendCustomerReadySMS(params: SendSmsParams): Promise<SendSmsResult> {
  const { orderNumber, phoneNumber, customMessage, simSlot } = params;

  // 1. Validate phone number strictly
  if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
    return {
      success: false,
      error: '⚠️ لا يوجد رقم هاتف لهذا الزبون.',
    };
  }

  const validation = validateAlgerianPhone(phoneNumber);
  if (!validation.isValid) {
    return {
      success: false,
      error: '⚠️ رقم هاتف الزبون غير صالح.',
    };
  }

  const messageText = customMessage || buildOrderReadySmsMessage(orderNumber);
  const targetPhone = validation.international || `+213${validation.cleanLocal?.replace(/^0/, '')}`;
  const selectedSim = simSlot || getSavedSimPreference();

  // 2. Check if running inside Android Native environment
  const isNative = isNativeAndroidBridgeAvailable();

  if (isNative) {
    // Check permission
    const perm = await checkNativeSmsPermission();
    if (!perm.granted) {
      // Request permission
      const granted = await requestNativeSmsPermission();
      if (!granted) {
        return {
          success: false,
          error: 'لم يتم السماح بإرسال SMS. يمكنك تفعيل صلاحية SMS من إعدادات الهاتف.',
          needsPermissionPrompt: true,
          isNative: true,
        };
      }
    }

    // Send via Native Android SMS API (SmsManager)
    const nativeResult = await sendDirectNativeSms({
      phoneNumber: targetPhone,
      message: messageText,
      simSlot: selectedSim,
    });

    if (nativeResult.success) {
      return {
        success: true,
        message: '✅ تم إرسال SMS للزبون بنجاح.',
        messageId: nativeResult.messageId || `sim_${Date.now()}`,
        timestamp: Date.now(),
        phoneFormatted: validation.cleanLocal,
        simUsed: nativeResult.simUsed || (selectedSim === 'default' ? 'الافتراضية' : selectedSim === 'sim1' ? 'SIM 1' : 'SIM 2'),
        isNative: true,
      };
    } else {
      return {
        success: false,
        error: nativeResult.error || '❌ تعذر إرسال SMS.',
        isNative: true,
      };
    }
  }

  // 3. Web Preview / Browser Mode
  // Direct SMS from SIM requires the compiled Android APK shell.
  // In web preview mode, we provide option to open the device's default SMS app with the text pre-filled
  return {
    success: false,
    error: 'WEB_PREVIEW_MODE',
    phoneFormatted: validation.cleanLocal,
    isNative: false,
  };
}

/**
 * Send a Test SMS (Manager only)
 */
export async function sendManagerTestSMS(rawPhone: string, simSlot?: SimSlotPreference): Promise<SendSmsResult> {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return {
      success: false,
      error: '⚠️ لا يوجد رقم هاتف لهذا الزبون.',
    };
  }

  const validation = validateAlgerianPhone(rawPhone);
  if (!validation.isValid) {
    return {
      success: false,
      error: '⚠️ رقم هاتف الزبون غير صالح.',
    };
  }

  const testMessage = 'رسالة اختبار من نظام Pressing.';
  const targetPhone = validation.international || `+213${validation.cleanLocal?.replace(/^0/, '')}`;
  const selectedSim = simSlot || getSavedSimPreference();

  const isNative = isNativeAndroidBridgeAvailable();
  if (isNative) {
    const perm = await checkNativeSmsPermission();
    if (!perm.granted) {
      const granted = await requestNativeSmsPermission();
      if (!granted) {
        return {
          success: false,
          error: 'لم يتم السماح بإرسال SMS. يمكنك تفعيل صلاحية SMS من إعدادات الهاتف.',
          isNative: true,
        };
      }
    }

    const nativeResult = await sendDirectNativeSms({
      phoneNumber: targetPhone,
      message: testMessage,
      simSlot: selectedSim,
    });

    if (nativeResult.success) {
      return {
        success: true,
        message: '✅ تم إرسال SMS الاختبارية بنجاح!',
        messageId: nativeResult.messageId || `test_${Date.now()}`,
        timestamp: Date.now(),
        phoneFormatted: validation.cleanLocal,
        isNative: true,
      };
    } else {
      return {
        success: false,
        error: nativeResult.error || '❌ تعذر إرسال SMS الاختبارية.',
        isNative: true,
      };
    }
  }

  return {
    success: false,
    error: 'WEB_PREVIEW_MODE',
    phoneFormatted: validation.cleanLocal,
    isNative: false,
  };
}

/**
 * Get the current Native Android SMS and SIM status
 */
export async function getNativeSmsStatus(): Promise<NativeSmsStatus> {
  const isNative = isNativeAndroidBridgeAvailable();
  const simPreference = getSavedSimPreference();
  const permissionStatus = await checkNativeSmsPermission();
  const availableSims = await getNativeSimCards();

  return {
    isNativeAvailable: isNative,
    simPreference,
    permissionStatus,
    availableSims,
  };
}

export {
  isNativeAndroidBridgeAvailable,
  openDeviceSmsApp,
  getSavedSimPreference,
  setSavedSimPreference,
  checkNativeSmsPermission,
  requestNativeSmsPermission,
};
