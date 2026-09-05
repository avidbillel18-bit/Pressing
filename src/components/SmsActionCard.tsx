import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  RefreshCw,
  Smartphone,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { LaundryOrder } from '../types';
import { useOrders } from '../context/OrderContext';
import {
  sendCustomerReadySMS,
  isNativeAndroidBridgeAvailable,
  openDeviceSmsApp,
  getSavedSimPreference,
} from '../services/smsService';
import { validateAlgerianPhone, buildOrderReadySmsMessage, formatDateTime } from '../lib/orderUtils';

interface SmsActionCardProps {
  order: LaundryOrder;
  compact?: boolean;
  onSmsSentSuccess?: () => void;
}

export const SmsActionCard: React.FC<SmsActionCardProps> = ({
  order,
  compact = false,
  onSmsSentSuccess,
}) => {
  const { updateOrder, showToast } = useOrders();

  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showConfirmResend, setShowConfirmResend] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showWebPreviewModal, setShowWebPreviewModal] = useState(false);

  const phoneValidation = validateAlgerianPhone(order.customerPhone);
  const defaultMessage = buildOrderReadySmsMessage(order.orderNumber);
  const isNative = isNativeAndroidBridgeAvailable();
  const currentSimPref = getSavedSimPreference();

  const handleSendSMS = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    // 1. Check phone presence
    if (!order.customerPhone || !order.customerPhone.trim()) {
      const err = '⚠️ لا يوجد رقم هاتف لهذا الزبون.';
      setErrorMessage(err);
      showToast(err, 'error');
      return;
    }

    // 2. Validate phone number format
    if (!phoneValidation.isValid) {
      const err = '⚠️ رقم هاتف الزبون غير صالح.';
      setErrorMessage(err);
      showToast(err, 'error');
      return;
    }

    setIsSending(true);

    try {
      const result = await sendCustomerReadySMS({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
        phoneNumber: order.customerPhone,
        customMessage: defaultMessage,
        simSlot: currentSimPref,
      });

      if (result.success) {
        const sentTime = result.timestamp || Date.now();
        await updateOrder(order.id, {
          smsSent: true,
          smsSentAt: sentTime,
          smsMessage: defaultMessage,
          smsMessageId: result.messageId || `sim_${Date.now()}`,
          smsError: null,
          smsLastError: null,
          smsLastAttemptAt: sentTime,
          smsSimUsed: result.simUsed || currentSimPref,
        });

        const successText = '✅ تم إرسال SMS للزبون بنجاح.';
        setSuccessNotice(successText);
        showToast(successText, 'success');
        setShowConfirmResend(false);
        if (onSmsSentSuccess) {
          onSmsSentSuccess();
        }
      } else {
        if (result.error === 'WEB_PREVIEW_MODE') {
          // In web browser preview (outside Android APK shell)
          setShowWebPreviewModal(true);
        } else {
          const err = result.error || '❌ تعذر إرسال SMS.';
          setErrorMessage(err);
          showToast(err, 'error');

          // Record failure in order record
          await updateOrder(order.id, {
            smsSent: false,
            smsError: err,
            smsLastError: err,
            smsLastAttemptAt: Date.now(),
          }).catch((e) => console.warn('Could not save SMS failure in order', e));
        }
      }
    } catch (err: any) {
      console.error('Failed to send SMS:', err);
      const fallbackErr = '❌ تعذر إرسال SMS.';
      setErrorMessage(fallbackErr);
      showToast(fallbackErr, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Fallback handler for Web Browser (launches device SMS app and records sent status)
  const handleLaunchSmsApp = async () => {
    const targetPhone = phoneValidation.international || order.customerPhone;
    openDeviceSmsApp(targetPhone, defaultMessage);
    
    // Save sent state upon user manual dispatch
    const sentTime = Date.now();
    await updateOrder(order.id, {
      smsSent: true,
      smsSentAt: sentTime,
      smsMessage: defaultMessage,
      smsMessageId: `manual_${sentTime}`,
      smsError: null,
      smsLastError: null,
      smsLastAttemptAt: sentTime,
    });

    setShowWebPreviewModal(false);
    showToast('تم فتح تطبيق الرسائل وجرى تحديث حالة الطلب', 'success');
  };

  // Compact Mode (for list items / tables)
  if (compact) {
    if (order.smsSent) {
      return (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-emerald-950">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-bold">✅ تم إرسال SMS</span>
            {order.smsSentAt && (
              <span className="text-[10px] text-emerald-800 font-medium">
                ({formatDateTime(order.smsSentAt)})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSendSMS}
            disabled={isSending}
            className="text-[11px] font-black text-cyan-900 bg-white hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md active:scale-95 transition"
            title="إعادة إرسال SMS"
          >
            {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'إعادة إرسال SMS'}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleSendSMS}
        disabled={isSending}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-2xs transition disabled:opacity-50"
      >
        {isSending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>جاري إرسال SMS...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>📱 إرسال SMS للزبون</span>
          </>
        )}
      </button>
    );
  }

  // Full Card Display for Order Details Screen
  return (
    <div className="bg-white rounded-2xl p-4 border border-cyan-300 shadow-2xs space-y-3.5 relative overflow-hidden">
      <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-cyan-500 via-teal-500 to-indigo-500" />

      {/* Header */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-800 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-cyan-800 font-bold block">إشعار شريحة SIM بالهاتف</span>
            <h3 className="text-sm font-black text-slate-900">رسالة جاهزية الطلب للزبون</h3>
          </div>
        </div>

        {order.smsSent ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>✅ تم إرسال SMS</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-900 border border-cyan-200">
            <span>جاهز للإرسال من SIM</span>
          </span>
        )}
      </div>

      {/* Phone Number Display & Verification */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600 font-bold">هاتف الزبون:</span>
          <span className="font-mono font-black text-slate-900 text-sm" dir="ltr">
            {order.customerPhone || 'غير مسجل'}
          </span>
        </div>

        {phoneValidation.isValid ? (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg font-mono">
            {phoneValidation.international}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{phoneValidation.error || '⚠️ رقم هاتف الزبون غير صالح.'}</span>
          </span>
        )}
      </div>

      {/* Message Preview */}
      <div className="space-y-1">
        <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-600" />
          <span>نص الرسالة المرسلة من الشريحة:</span>
        </span>
        <div className="bg-slate-900 text-slate-100 p-3 rounded-xl text-xs font-semibold leading-relaxed border border-slate-800 shadow-inner">
          "{defaultMessage}"
        </div>
      </div>

      {/* Sent History Stamp if already sent */}
      {order.smsSent && order.smsSentAt && (
        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold block">
                تاريخ ووقت آخر إرسال:
              </span>
              <span className="font-black text-emerald-900 text-[11px]">
                {formatDateTime(order.smsSentAt)}
              </span>
            </div>
          </div>
          {order.smsSimUsed && (
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              الشريحة: {order.smsSimUsed}
            </span>
          )}
        </div>
      )}

      {/* Error / Last Error Banner */}
      {(errorMessage || (!order.smsSent && (order.smsLastError || order.smsError))) && (
        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-start gap-2 text-xs text-rose-900">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">تنبيه:</span>
            <span>{errorMessage || order.smsLastError || order.smsError}</span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-950 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Actions */}
      <div className="pt-1">
        {order.smsSent ? (
          <div className="space-y-2">
            {showConfirmResend ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
                <span className="text-amber-900 font-bold block">
                  هل أنت متأكد من إعادة إرسال SMS لهاتف الزبون مرة أخرى؟
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSendSMS}
                    disabled={isSending}
                    className="py-2 px-3 bg-cyan-700 text-white font-black rounded-lg hover:bg-cyan-800 active:scale-95 transition flex items-center justify-center gap-1.5"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري إرسال SMS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>نعم، أرسل الآن</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmResend(false)}
                    disabled={isSending}
                    className="py-2 px-3 bg-white text-slate-700 font-bold border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmResend(true)}
                disabled={isSending}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border-2 border-cyan-400 text-cyan-900 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-2xs active:scale-98 transition"
              >
                <RefreshCw className="w-4 h-4 text-cyan-700" />
                <span>إعادة إرسال SMS</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSendSMS}
            disabled={isSending}
            className="w-full py-3.5 px-4 bg-linear-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-cyan-900/10 active:scale-98 transition disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري إرسال SMS...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>📱 إرسال SMS للزبون</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Web Browser Notice Modal */}
      {showWebPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">إرسال SMS من شريحة الهاتف</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                في تطبيق Android APK المثبت، يتم إرسال الرسالة تلقائياً ومباشرة من شريحة SIM الخاصة بالهاتف.
                <br />
                في متصفح الويب، يمكنك فتح تطبيق الرسائل الافتراضي بالهاتف لإرسالها فوراً:
              </p>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1 text-slate-800 font-medium">
              <div><strong>الرقم:</strong> <span className="font-mono" dir="ltr">{order.customerPhone}</span></div>
              <div><strong>الرسالة:</strong> "{defaultMessage}"</div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleLaunchSmsApp}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>فتح تطبيق الرسائل وإرسال SMS</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWebPreviewModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
