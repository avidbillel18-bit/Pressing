import React from 'react';
import { Store, Waves, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { UserRole } from '../types';
import { useOrders } from '../context/OrderContext';

interface RoleSelectionScreenProps {
  currentRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
  onCancel?: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  currentRole,
  onSelectRole,
  onCancel,
}) => {
  const { counters, isOnline } = useOrders();

  return (
    <div className="space-y-5 pb-12">
      {/* If already in a role and user clicked switch, provide a back button */}
      {currentRole && onCancel && (
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            id="role-selection-back-btn"
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع للشاشة السابقة</span>
          </button>
          <span className="text-xs font-bold text-slate-500">
            الدور الحالي: {currentRole === 'shop' ? 'المحل' : 'الغسيل'}
          </span>
        </div>
      )}

      {/* Main Banner */}
      <div className="text-center bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-teal-800/40 relative overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center mx-auto mb-3 text-teal-300">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black text-white">نظام مغسلة الأفرشة والبطانيات</h1>
        <p className="text-xs text-teal-200/90 mt-1 max-w-sm mx-auto font-medium">
          اختر دور هذا الهاتف لبدء العمل. يتم ربط ومزامنة بيانات الهاتفين بشكل مباشر ولحظي.
        </p>

        {/* Sync indicator pill */}
        <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-slate-800/90 border border-teal-500/30 text-xs text-teal-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>قاعدة بيانات فورية متصلة ومزامنة</span>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="space-y-4">
        {/* Role 1: المحل (Shop) */}
        <div
          onClick={() => onSelectRole('shop')}
          className={`cursor-pointer group relative bg-white hover:bg-slate-50/80 rounded-3xl p-5 border-2 transition-all active:scale-[0.99] shadow-xs ${
            currentRole === 'shop' ? 'border-teal-600 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-teal-400'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs group-hover:bg-teal-600 group-hover:text-white transition">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 inline-block mb-0.5">
                  الدور الأول
                </span>
                <h2 className="text-lg font-black text-slate-900">1. دور المحل (الاستقبال)</h2>
              </div>
            </div>

            {currentRole === 'shop' && (
              <span className="text-xs font-bold bg-teal-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> النشط
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 font-medium mb-3.5">
            مخصص لهاتف مكتب الاستقبال والمحل لإدارة الطلبات والزبائن:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              <span>تسجيل طلبات جديدة (رقم 0-1000)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              <span>البحث السريع عن طلب أو زبون</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              <span>متابعة الطلبات الجاهزة بالسدة</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              <span>تسليم الأفرشة وخروجها للزبائن</span>
            </div>
          </div>

          <button
            id="select-shop-role-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectRole('shop');
            }}
            className="w-full py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
          >
            <Store className="w-4 h-4" />
            <span>الدخول كمسؤول المحل (الاستقبال)</span>
          </button>
        </div>

        {/* Role 2: الغسيل (Laundry Area) */}
        <div
          onClick={() => onSelectRole('laundry')}
          className={`cursor-pointer group relative bg-white hover:bg-slate-50/80 rounded-3xl p-5 border-2 transition-all active:scale-[0.99] shadow-xs ${
            currentRole === 'laundry' ? 'border-cyan-600 ring-2 ring-cyan-500/20' : 'border-slate-200 hover:border-cyan-400'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shadow-2xs group-hover:bg-cyan-600 group-hover:text-white transition">
                <Waves className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200 inline-block mb-0.5">
                  الدور الثاني
                </span>
                <h2 className="text-lg font-black text-slate-900">2. دور الغسيل (قسم التنظيف)</h2>
              </div>
            </div>

            {currentRole === 'laundry' && (
              <span className="text-xs font-bold bg-cyan-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> النشط
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 font-medium mb-3.5">
            مخصص لهاتف ورشة الغسيل لمتابعة وتحديث حالة الأفرشة فور الانتهاء:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
              <span>استقبال فوري للطلبات الواردة من المحل</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
              <span>عرض الاسم، الهاتف، نوع الأفرشة والتواريخ</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
              <span>تحويل الحالة بضغطة زر إلى "جاهز بالسدة"</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
              <span>مزامنة مباشرة مع شاشة المحل في نفس اللحظة</span>
            </div>
          </div>

          <button
            id="select-laundry-role-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectRole('laundry');
            }}
            className="w-full py-3.5 rounded-2xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
          >
            <Waves className="w-4 h-4" />
            <span>الدخول كمسؤول قسم الغسيل</span>
          </button>
        </div>
      </div>

      {/* Information Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-600 text-xs space-y-1">
        <div className="flex items-center gap-2 text-slate-800 font-bold">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>ملاحظة حول تشغيل الهاتفين:</span>
        </div>
        <p className="leading-relaxed">
          افتح هذا الرابط على هاتف المحل واختر "المحل"، وافتحه على هاتف قسم الغسيل واختر "الغسيل". أي طلب يتم إضافته أو تعديله يظهر تلقائياً بدون الحاجة لتحديث الصفحة.
        </p>
      </div>
    </div>
  );
};
