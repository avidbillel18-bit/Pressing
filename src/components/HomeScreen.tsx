import React from 'react';
import {
  PlusCircle,
  Search,
  CheckCircle2,
  ListOrdered,
  Waves,
  Sparkles,
  ArrowLeft,
  Phone,
  Clock,
  Package,
  Layers,
} from 'lucide-react';
import { ScreenType, LaundryOrder } from '../types';
import { useOrders } from '../context/OrderContext';
import { formatDate } from '../lib/orderUtils';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectOrder: (order: LaundryOrder) => void;
  onSwitchRole?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, onSelectOrder, onSwitchRole }) => {
  const { counters, orders } = useOrders();

  // Get up to 3 recently readied orders upstairs
  const readyOrdersPreview = orders
    .filter((o) => o.status === 'جاهز')
    .slice(0, 3);

  return (
    <div className="space-y-5 pb-8">
      {/* Role Header Banner */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
          <div>
            <span className="text-xs font-black text-teal-800 block">دور المحل (الاستقبال)</span>
            <span className="text-[11px] text-slate-500 font-medium">تسجيل، بحث، وتسليم الطلبات</span>
          </div>
        </div>

        {onSwitchRole && (
          <button
            id="home-switch-role-btn"
            type="button"
            onClick={onSwitchRole}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition"
          >
            <span>تبديل الدور</span>
          </button>
        )}
      </div>

      {/* Top Banner: Worker Quick Context & Active Orders Count */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-4 shadow-sm border border-teal-800/40">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Sparkles className="w-3 h-3" /> نظام العمل الداخلي
            </span>
            <h2 className="text-lg font-black mt-1 text-white">متابعة غسيل وتخزين الأفرشة</h2>
            <p className="text-xs text-teal-200/80">المخزن بالسدة متاح على شاشة الهاتف</p>
          </div>

          <div className="text-center bg-slate-800/90 border border-teal-500/40 px-3.5 py-2 rounded-xl shadow-inner">
            <span className="block text-[11px] text-slate-300 font-medium">الطلبات النشطة</span>
            <span className="text-2xl font-black text-amber-300 tracking-wider">
              {counters.totalActive}
            </span>
            <span className="block text-[10px] text-slate-400">في المحل</span>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            ملخص حالة الطلبات اليوم
          </h3>
          <span className="text-xs text-slate-600 font-medium">
            النشطة حالياً: <strong className="text-slate-900">{counters.totalActive}</strong>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* في الغسيل */}
          <button
            id="stat-card-washing"
            type="button"
            onClick={() => onNavigate('all')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 active:scale-95 transition shadow-xs"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mb-1 text-amber-700">
              <Waves className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-amber-800">{counters.inWashing}</span>
            <span className="text-xs font-bold text-amber-900 mt-0.5">في الغسيل</span>
          </button>

          {/* جاهز في الطابق العلوي */}
          <button
            id="stat-card-ready"
            type="button"
            onClick={() => onNavigate('ready')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/90 border-2 border-emerald-400 text-emerald-950 active:scale-95 transition shadow-xs relative overflow-hidden"
          >
            <span className="absolute top-1 left-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-1 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-emerald-700">{counters.ready}</span>
            <span className="text-xs font-bold text-emerald-900 mt-0.5">جاهزة بالسدة</span>
          </button>

          {/* تم التسليم */}
          <button
            id="stat-card-delivered"
            type="button"
            onClick={() => onNavigate('all')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 active:scale-95 transition shadow-xs"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mb-1 text-slate-700">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-slate-800">{counters.delivered}</span>
            <span className="text-xs font-bold text-slate-700 mt-0.5">تم التسليم</span>
          </button>
        </div>
      </div>

      {/* 4 Large Touch Buttons for Workers */}
      <div className="space-y-3 pt-1">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          الإجراءات الرئيسية
        </h3>

        {/* 1. إضافة طلب */}
        <button
          id="home-btn-add-order"
          type="button"
          onClick={() => onNavigate('add')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-black text-lg shadow-md active:scale-[0.98] transition border border-teal-500/50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <PlusCircle className="w-7 h-7 text-white" />
            </div>
            <div className="text-right">
              <span className="block leading-tight text-xl">إضافة طلب</span>
              <span className="block text-xs text-teal-100 font-normal mt-0.5">
                تسجيل بطانيات وأفرشة جديدة وإدخال رقم الوصل يدوياً
              </span>
            </div>
          </div>
          <ArrowLeft className="w-6 h-6 text-teal-200" />
        </button>

        {/* 2. البحث عن طلب */}
        <button
          id="home-btn-search-order"
          type="button"
          onClick={() => onNavigate('search')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-black text-lg shadow-xs border-2 border-slate-200 active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="block leading-tight text-lg">البحث عن طلب</span>
              <span className="block text-xs text-slate-600 font-normal mt-0.5">
                بالرقم (0-1000) أو الاسم أو رقم الهاتف
              </span>
            </div>
          </div>
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>

        {/* 3. الطلبات الجاهزة */}
        <button
          id="home-btn-ready-orders"
          type="button"
          onClick={() => onNavigate('ready')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-lg shadow-md border border-emerald-600 active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="leading-tight text-lg">الطلبات الجاهزة</span>
                <span className="text-xs bg-emerald-900 text-white px-2 py-0.5 rounded-full font-bold">
                  {counters.ready} طلب
                </span>
              </div>
              <span className="block text-xs text-emerald-100 font-normal mt-0.5">
                المخزنة بالطابق العلوي وجاهزة للتسليم
              </span>
            </div>
          </div>
          <ArrowLeft className="w-6 h-6 text-emerald-200" />
        </button>

        {/* 4. كل الطلبات */}
        <button
          id="home-btn-all-orders"
          type="button"
          onClick={() => onNavigate('all')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-black text-lg shadow-xs border-2 border-slate-200 active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <ListOrdered className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="leading-tight text-lg">كل الطلبات</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {counters.totalAll}
                </span>
              </div>
              <span className="block text-xs text-slate-600 font-normal mt-0.5">
                تصفية وسجل العمليات حسب التاريخ والحالة
              </span>
            </div>
          </div>
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>

        {/* 5. إعدادات SimGate SMS */}
        <button
          id="home-btn-sms-settings"
          type="button"
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-black text-base shadow-2xs border border-slate-300 active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-800">
              <Phone className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="block leading-tight text-sm font-bold">إعدادات SMS و SimGate</span>
              <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                حالة الربط واختبار إرسال الرسائل للمدير
              </span>
            </div>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Upstairs Storage Quick Glance (الطلبات الجاهزة بالسدة) */}
      {readyOrdersPreview.length > 0 && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              جاهز بالسدة (الطابق العلوي):
            </span>
            <button
              id="view-all-ready-link"
              type="button"
              onClick={() => onNavigate('ready')}
              className="text-xs font-bold text-emerald-700 underline"
            >
              عرض الكل ({counters.ready})
            </button>
          </div>

          <div className="space-y-1.5">
            {readyOrdersPreview.map((order) => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs active:bg-emerald-100/50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg bg-emerald-700 text-white font-black text-sm flex items-center justify-center">
                    #{order.orderNumber}
                  </span>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">
                      {order.customerFirstName} {order.customerLastName}
                    </span>
                    <span className="text-xs text-slate-600 block">
                      {order.itemType} {order.itemCount > 1 ? `(${order.itemCount} قطع)` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  {order.storageLocation ? (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md block">
                      {order.storageLocation}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-600 block font-medium">
                      جاهز للتسليم
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
