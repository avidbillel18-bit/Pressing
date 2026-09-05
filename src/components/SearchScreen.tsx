import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  Phone,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  Waves,
  Package,
  X,
  AlertCircle,
} from 'lucide-react';
import { ScreenType, LaundryOrder, OrderStatus } from '../types';
import { useOrders } from '../context/OrderContext';
import { formatDate } from '../lib/orderUtils';

interface SearchScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectOrder?: (order: LaundryOrder) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onNavigate,
}) => {
  const { orders } = useOrders();
  const [orderNumberInput, setOrderNumberInput] = useState('');

  const trimmedInput = orderNumberInput.trim();
  const parsedNumber = trimmedInput !== '' ? Number(trimmedInput) : null;

  // Exact matching by order number (handles both number and string representations)
  const matchedOrder = trimmedInput !== ''
    ? orders.find((o) => {
        if (String(o.orderNumber).trim() === trimmedInput) return true;
        if (parsedNumber !== null && !isNaN(parsedNumber) && Number(o.orderNumber) === parsedNumber) return true;
        return false;
      })
    : null;

  const isSearchActive = trimmedInput !== '';

  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'في الغسيل':
        return (
          <div className="bg-orange-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
            <Waves className="w-5 h-5 text-white" />
            <span className="text-base font-black">في الغسيل</span>
          </div>
        );
      case 'جاهز':
        return (
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span className="text-base font-black">جاهز</span>
          </div>
        );
      case 'تم التسليم':
        return (
          <div className="bg-slate-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
            <Package className="w-5 h-5 text-white" />
            <span className="text-base font-black">تم التسليم</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          id="search-back-btn"
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-center">
          <h2 className="text-base font-black text-slate-800">البحث برقم الطلب</h2>
          <span className="text-xs text-slate-500 font-medium">
            البحث الدقيق المباشر
          </span>
        </div>

        <div className="w-16"></div>
      </div>

      {/* Search Input Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <label htmlFor="search-order-number-input" className="block text-xs font-bold text-slate-700">
          أدخل رقم الطلب:
        </label>
        <div className="relative">
          <input
            id="search-order-number-input"
            type="number"
            inputMode="numeric"
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            placeholder="مثال: 45 أو 120..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-teal-500/40 text-lg font-black text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          {orderNumberInput ? (
            <button
              id="clear-search-btn"
              type="button"
              onClick={() => setOrderNumberInput('')}
              className="absolute left-3 top-3.5 p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          )}
        </div>
      </div>

      {/* Search Results Area */}
      {!isSearchActive ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-700">أدخل رقم الطلب للبحث</h3>
          <p className="text-xs text-slate-500">
            اكتب رقم الطلب أعلاه لعرض بياناته وحالته فورياً.
          </p>
        </div>
      ) : !matchedOrder ? (
        /* No Match Found */
        <div className="bg-white rounded-2xl p-8 text-center border border-rose-200 shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-rose-700">لا يوجد طلب بهذا الرقم</h3>
          <p className="text-xs text-slate-500">
            تأكد من كتابة رقم الطلب الصحيح المسجل في المغسلة.
          </p>
        </div>
      ) : (
        /* Matched Order Card */
        <div className="bg-white rounded-3xl p-5 border-2 border-teal-600/40 shadow-md space-y-4">
          {/* 1. Order Number Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs text-slate-500 font-bold block">رقم الطلب:</span>
              <span className="text-2xl font-black text-slate-900">
                #{matchedOrder.orderNumber}
              </span>
            </div>

            {/* Current Status Badge */}
            <div className="text-left">
              <span className="text-[11px] text-slate-500 font-bold block mb-1">الحالة:</span>
              {getStatusDisplay(matchedOrder.status)}
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-3 text-sm">
            {/* Customer First Name and Last Name */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">الاسم واللقب:</span>
              <span className="text-base font-black text-slate-900">
                {matchedOrder.customerFirstName} {matchedOrder.customerLastName}
              </span>
            </div>

            {/* Phone Number */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">رقم الهاتف:</span>
              <a
                href={`tel:${matchedOrder.customerPhone}`}
                className="flex items-center gap-1.5 text-base font-black text-teal-700 hover:text-teal-900 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200"
                dir="ltr"
              >
                <Phone className="w-4 h-4 text-teal-600" />
                <span>{matchedOrder.customerPhone}</span>
              </a>
            </div>

            {/* Item Type & Quantities */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">نوع الأفرشة والكميات:</span>
                <span className="text-xs font-black text-cyan-950 bg-cyan-100/80 px-2 py-0.5 rounded-md">
                  الإجمالي: {matchedOrder.itemCount} {matchedOrder.itemCount === 1 ? 'قطعة' : 'قطع'}
                </span>
              </div>
              {matchedOrder.items && Array.isArray(matchedOrder.items) && matchedOrder.items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {matchedOrder.items.map((it, idx) => (
                    <span
                      key={idx}
                      className="bg-white text-slate-900 border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{it.type}</span>
                      <span className="bg-cyan-100 text-cyan-900 px-1.5 py-0.2 rounded text-[11px]">
                        {it.count}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-extrabold text-slate-900">
                  {matchedOrder.itemType} ({matchedOrder.itemCount} قطع)
                </p>
              )}
            </div>

            {/* Entry Date */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">تاريخ الدخول:</span>
              <span className="text-sm font-bold text-slate-800">
                {formatDate(matchedOrder.entryDate)}
              </span>
            </div>

            {/* Expected Exit Date */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">تاريخ الخروج المتوقع:</span>
              <span className="text-sm font-bold text-slate-800">
                {formatDate(matchedOrder.expectedExitDate)}
              </span>
            </div>

            {/* Actual Exit Date (if available) */}
            {matchedOrder.actualExitDate && (
              <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">تاريخ الخروج الفعلي:</span>
                <span className="text-sm font-bold text-slate-900">
                  {matchedOrder.actualExitDate}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
