import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Phone,
  Calendar,
  Layers,
  MapPin,
  Check,
  Search,
  ChevronLeft,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react';
import { ScreenType, LaundryOrder } from '../types';
import { useOrders } from '../context/OrderContext';
import { formatDate } from '../lib/orderUtils';
import { SmsActionCard } from './SmsActionCard';

interface ReadyOrdersScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectOrder: (order: LaundryOrder) => void;
}

export const ReadyOrdersScreen: React.FC<ReadyOrdersScreenProps> = ({
  onNavigate,
  onSelectOrder,
}) => {
  const { orders, markAsDelivered } = useOrders();
  const [filterText, setFilterText] = useState('');

  // Ready orders only
  const readyOrders = orders.filter((o) => o.status === 'جاهز');

  // Filter within ready orders
  const filtered = readyOrders.filter((order) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (
      String(order.orderNumber).includes(term) ||
      (order.customerFirstName || '').toLowerCase().includes(term) ||
      (order.customerLastName || '').toLowerCase().includes(term) ||
      (order.customerPhone || '').includes(term) ||
      (order.storageLocation || '').toLowerCase().includes(term) ||
      (order.itemType || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Back */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          id="ready-back-btn"
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-center">
          <h2 className="text-base font-black text-emerald-950">الطلبات الجاهزة بالسدة</h2>
          <span className="text-xs text-emerald-700 font-medium">
            مغسولة ومجهزة بالطابق العلوي
          </span>
        </div>

        <div className="bg-emerald-700 text-white font-black text-sm px-3 py-1 rounded-xl shadow-xs">
          {readyOrders.length} طلب
        </div>
      </div>

      {/* Info Helper Banner */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-emerald-950 leading-tight">
            جميع الأفرشة المعروضة هنا مغسولة ومخزنة في السدة
          </p>
          <p className="text-[11px] text-emerald-800 mt-0.5">
            تأكد من رقم الرف قبل الصعود، أو اضغط «تم التسليم» فور تسليم الزبون
          </p>
        </div>
      </div>

      {/* Filter within ready */}
      {readyOrders.length > 3 && (
        <div className="relative">
          <input
            id="ready-filter-input"
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="فلترة بالسدة بالرقم أو الاسم أو رقم الرف..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      )}

      {/* Ready Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="text-base font-black text-slate-800">
              {readyOrders.length === 0 ? 'لا توجد طلبات جاهزة حالياً بالسدة' : 'لا توجد نتائج مطابقة للبحث'}
            </p>
            <p className="text-xs text-slate-500">
              عند الانتهاء من غسيل أي دفعة، قم بتغيير حالتها إلى «جاهز» لتظهر هنا فوراً.
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-4 border-2 border-emerald-400/80 shadow-xs space-y-3 relative overflow-hidden"
            >
              {/* Green Ready Flag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white font-black text-2xl flex items-center justify-center shadow-xs">
                    #{order.orderNumber}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {order.customerFirstName} {order.customerLastName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md hover:bg-teal-100"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3 text-teal-600" />
                        {order.customerPhone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Storage Location Badge */}
                <div className="text-left">
                  <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    جاهز للتسليم
                  </span>
                </div>
              </div>

              {/* Items & Storage Shelf Highlight */}
              <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span>الأفرشة الجاهزة:</span>
                    </span>
                    <span className="text-slate-500 text-[11px] font-semibold">
                      استلام: {formatDate(order.entryDate)}
                    </span>
                  </div>

                  {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {order.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="bg-white text-slate-900 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{it.type}</span>
                          <span className="bg-emerald-100 text-emerald-950 px-1.5 py-0.2 rounded text-[11px]">
                            {it.count} جاهزة
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                      <span>{order.itemType}</span>
                      {order.itemCount > 1 && (
                        <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded text-[11px] font-black">
                          {order.itemCount} قطع جاهزة
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Upstairs Shelf location */}
                {order.storageLocation ? (
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>مكان التخزين بالسدة: {order.storageLocation}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">
                    لم يُحدد رقم الرف (موجود بالسدة الرئيسية)
                  </div>
                )}

                {order.notes && (
                  <div className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                    <span className="font-bold">ملاحظات:</span> {order.notes}
                  </div>
                )}
              </div>

              {/* Compact SMS Dispatcher / Status */}
              <div className="pt-0.5">
                <SmsActionCard order={order} compact />
              </div>

              {/* Action Buttons: Big "تم التسليم" & "تفاصيل" */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectOrder(order)}
                  className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition border border-slate-200"
                >
                  <span>عرض التفاصيل</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => markAsDelivered(order.id)}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Check className="w-4 h-4" />
                  <span>تم التسليم للزبون</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Back Button */}
      <button
        id="ready-bottom-back-btn"
        type="button"
        onClick={() => onNavigate('home')}
        className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
      >
        <ArrowRight className="w-4 h-4" />
        <span>رجوع للشاشة الرئيسية</span>
      </button>
    </div>
  );
};
