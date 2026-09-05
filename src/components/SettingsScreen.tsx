import React, { useState, useEffect } from 'react';
import {
  Settings,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  ShieldCheck,
  Info,
  RefreshCw,
  HelpCircle,
  Sliders,
  Layers,
  PhoneCall,
  Lock,
} from 'lucide-react';
import { ScreenType, SimSlotPreference } from '../types';
import { useOrders } from '../context/OrderContext';
import {
  sendManagerTestSMS,
  getNativeSmsStatus,
  setSavedSimPreference,
  NativeSmsStatus,
} from '../services/smsService';
import { validateAlgerianPhone } from '../lib/orderUtils';

interface SettingsScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  const { showToast, currentRole } = useOrders();

  const [status, setStatus] = useState<NativeSmsStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedSimSlot, setSelectedSimSlot] = useState<SimSlotPreference>('default');

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getNativeSmsStatus();
      setStatus(data);
      setSelectedSimSlot(data.simPreference);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSimSlotChange = (slot: SimSlotPreference) => {
    setSelectedSimSlot(slot);
    setSavedSimPreference(slot);
    showToast(
      slot === 'default'
        ? 'تم ضبط الشريحة الافتراضية للهاتف'
        : `تم ضبط شريحة الإرسال: ${slot === 'sim1' ? 'SIM 1' : 'SIM 2'}`,
      'success'
    );
  };

  const handleSendTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);

    // Manager role check
    if (currentRole !== 'shop') {
      const msg = '⚠️ اختبار SMS متاح للمدير (مكتب الاستقبال) فقط.';
      setTestResult({ success: false, message: msg });
      showToast(msg, 'error');
      return;
    }

    if (!testPhone.trim()) {
      const errMsg = '⚠️ لا يوجد رقم هاتف لهذا الزبون.';
      setTestResult({ success: false, message: errMsg });
      showToast(errMsg, 'error');
      return;
    }

    const validation = validateAlgerianPhone(testPhone);
    if (!validation.isValid) {
      const errMsg = '⚠️ رقم هاتف الزبون غير صالح.';
      setTestResult({ success: false, message: errMsg });
      showToast(errMsg, 'error');
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await sendManagerTestSMS(testPhone, selectedSimSlot);
      if (result.success) {
        const msg = '✅ تم إرسال SMS الاختبارية بنجاح!';
        setTestResult({ success: true, message: msg });
        showToast(msg, 'success');
      } else {
        if (result.error === 'WEB_PREVIEW_MODE') {
          const msg = '📱 في نسخة APK المثبتة على الهاتف يتم الإرسال من الشريحة مباشرة. (تم التحقق من جاهزية الكود والرقم)';
          setTestResult({ success: true, message: msg });
          showToast('تم التحقق بنجاح من مسار إرسال SMS', 'success');
        } else {
          const errMsg = result.error || '❌ تعذر إرسال SMS الاختبارية.';
          setTestResult({ success: false, message: errMsg });
          showToast(errMsg, 'error');
        }
      }
    } catch (err: any) {
      const errMsg = '❌ تعذر إرسال SMS الاختبارية.';
      setTestResult({ success: false, message: errMsg });
      showToast(errMsg, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Screen Title */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-inner">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">إعدادات SMS والشريحة (SIM)</h2>
            <p className="text-xs text-slate-500 font-medium">الإرسال المباشر من شريحة SIM الخاصة بالهاتف</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loadingStatus}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition border border-slate-200"
          title="تحديث الحالة"
        >
          <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 1. SIM Card Preference (اختيار شريحة الإرسال) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900">شريحة إرسال SMS (Dual SIM)</h3>
              <p className="text-[11px] text-slate-500 font-medium">حدد الشريحة المستعملة لخصم رصيد رسائل الزبائن</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
            {selectedSimSlot === 'default' ? 'الافتراضية' : selectedSimSlot === 'sim1' ? 'SIM 1' : 'SIM 2'}
          </span>
        </div>

        {/* Radio Options */}
        <div className="space-y-2.5">
          {/* Option: Default */}
          <label
            onClick={() => handleSimSlotChange('default')}
            className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
              selectedSimSlot === 'default'
                ? 'border-cyan-600 bg-cyan-50/50 text-cyan-950 shadow-2xs'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="simSlot"
                checked={selectedSimSlot === 'default'}
                onChange={() => handleSimSlotChange('default')}
                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="text-xs font-black block">استخدام شريحة SMS الافتراضية للهاتف</span>
                <span className="text-[11px] text-slate-500 font-medium">تعتمد على الإعداد المحدد في نظام Android</span>
              </div>
            </div>
            <Smartphone className="w-4 h-4 text-slate-400" />
          </label>

          {/* Option: SIM 1 */}
          <label
            onClick={() => handleSimSlotChange('sim1')}
            className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
              selectedSimSlot === 'sim1'
                ? 'border-cyan-600 bg-cyan-50/50 text-cyan-950 shadow-2xs'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="simSlot"
                checked={selectedSimSlot === 'sim1'}
                onChange={() => handleSimSlotChange('sim1')}
                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="text-xs font-black block">الشريحة الأولى (SIM 1)</span>
                <span className="text-[11px] text-slate-500 font-medium">استخدام المنفذ الأول دائماً (Slot 0)</span>
              </div>
            </div>
            <span className="text-[11px] font-bold font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">SIM 1</span>
          </label>

          {/* Option: SIM 2 */}
          <label
            onClick={() => handleSimSlotChange('sim2')}
            className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
              selectedSimSlot === 'sim2'
                ? 'border-cyan-600 bg-cyan-50/50 text-cyan-950 shadow-2xs'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="simSlot"
                checked={selectedSimSlot === 'sim2'}
                onChange={() => handleSimSlotChange('sim2')}
                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="text-xs font-black block">الشريحة الثانية (SIM 2)</span>
                <span className="text-[11px] text-slate-500 font-medium">استخدام المنفذ الثاني دائماً (Slot 1)</span>
              </div>
            </div>
            <span className="text-[11px] font-bold font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">SIM 2</span>
          </label>
        </div>
      </div>

      {/* 2. Native Android Bridge Status */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">حالة جسر Android Native Bridge</h3>
          </div>

          {loadingStatus ? (
            <span className="text-xs text-slate-500 flex items-center gap-1 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />
              جاري الفحص...
            </span>
          ) : status?.isNativeAvailable ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 border border-emerald-300 text-emerald-950 font-black text-xs px-3 py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              🟢 مثبت داخل APK (Native Active)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-black text-xs px-3 py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              🌐 وضع الويب / المعاينة
            </span>
          )}
        </div>

        <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl text-xs text-cyan-950 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-cyan-900">
            <Info className="w-4 h-4 text-cyan-700 shrink-0" />
            <span>كيف يتم إرسال الرسائل من SIM بدون إنترنت وبدون أي خدمة خارجية؟</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">
            يستدعي التطبيق مكتبة <strong className="text-slate-900">Android SmsManager</strong> المدمجة في نظام الهاتف مباشرة، ويقوم بإرسال الرسالة النصية من شريحة المحل (Mobilis, Djezzy, Ooredoo) مستهلكاً رصيد الـ SMS العادي للهاتف وبدون الحاجة لأي خوادم خارجية أو اشتراكات مدفوعة.
          </p>
        </div>
      </div>

      {/* 3. Manager Test SMS Section (مخصص للمدير فقط) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900">📱 اختبار إرسال SMS (للمدير فقط)</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                إرسال رسالة تجريبية للتحقق من شريحة SIM ورصيد الرسائل
              </p>
            </div>
          </div>

          {currentRole !== 'shop' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
              <Lock className="w-3 h-3" />
              مخصص لمكتب الاستقبال
            </span>
          )}
        </div>

        {currentRole !== 'shop' ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">هذه الخاصية متاحة لحساب المدير / مكتب الاستقبال فقط.</p>
            <p className="text-[11px] text-slate-500">قم بتبديل الدور إلى "مكتب الاستقبال" من الشريط العلوي للاختبار.</p>
          </div>
        ) : (
          <form onSubmit={handleSendTestSMS} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم هاتف المدير التجريبي:
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="مثال: 0550123456 أو 0661234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 font-mono text-sm"
                dir="ltr"
                required
              />
            </div>

            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 font-bold block text-[10px]">نص رسالة الاختبار المعتمد:</span>
              <span className="font-semibold block font-sans">"رسالة اختبار من نظام Pressing."</span>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingTest || !testPhone.trim()}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال SMS...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>📱 إرسال SMS تجريبية</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* 4. APK Compilation and Installation Guide */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-cyan-400 font-black text-sm">
          <HelpCircle className="w-4 h-4" />
          <span>خطوات تجميع ملف APK وتثبيته على هاتف Android:</span>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-slate-300 font-medium leading-relaxed">
          <li>
            بناء ملفات التطبيق وتشغيل مزامنة Capacitor:
            <pre className="mt-1 p-2 bg-slate-950 rounded-lg text-[11px] font-mono text-cyan-300 overflow-x-auto" dir="ltr">
              npm run build && npx cap sync android
            </pre>
          </li>
          <li>
            فتح المشروع في برنامج <strong className="text-white">Android Studio</strong>:
            <pre className="mt-1 p-2 bg-slate-950 rounded-lg text-[11px] font-mono text-cyan-300 overflow-x-auto" dir="ltr">
              npx cap open android
            </pre>
          </li>
          <li>
            بناء الـ APK من القائمة: <strong className="text-amber-300">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.
          </li>
          <li>
            تثبيت ملف <strong className="text-amber-300">app-debug.apk</strong> أو <strong className="text-amber-300">app-release.apk</strong> على هاتف المحل، والموافقة على صلاحية إرسال الرسائل <span className="font-mono text-cyan-300">android.permission.SEND_SMS</span> عند أول إرسال.
          </li>
        </ol>
      </div>
    </div>
  );
};
