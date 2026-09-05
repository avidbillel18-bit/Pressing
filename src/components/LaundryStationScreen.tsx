import React, { useState, useMemo } from 'react';
import {
  Waves,
  CheckCircle2,
  Phone,
  Calendar,
  Layers,
  MapPin,
  FileText,
  Clock,
  Search,
  ArrowRight,
  Sparkles,
  Check,
  AlertCircle,
  Package,
  X,
  Hash,
  User,
  ChevronLeft,
  Camera,
  Edit3,
} from 'lucide-react';
import { LaundryOrder, OrderStatus, ScreenType } from '../types';
import { useOrders } from '../context/OrderContext';
import { formatDate } from '../lib/orderUtils';
import { StatusChangeModal } from './StatusChangeModal';
import { PaperPhotoModal } from './PaperPhotoModal';
import { EditOrderModal } from './EditOrderModal';
import { SmsActionCard } from './SmsActionCard';

interface LaundryStationScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectOrder: (order: LaundryOrder) => void;
  onSwitchRole: () => void;
}

export const LaundryStationScreen: React.FC<LaundryStationScreenProps> = ({
  onNavigate,
  onSelectOrder,
  onSwitchRole,
}) => {
  const { orders, updateOrderStatus, updateOrder, counters } = useOrders();
  const [activeTab, setActiveTab] = useState<'washing' | 'ready' | 'all'>('washing');
  
  // Search state: search by 'number' or 'lastName'
  const [searchMode, setSearchMode] = useState<'number' | 'lastName'>('number');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatchedOrderId, setSelectedMatchedOrderId] = useState<string | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<LaundryOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<LaundryOrder | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [ocrSuccessNotice, setOcrSuccessNotice] = useState<string | null>(null);

  const trimmedQuery = searchQuery.trim();
  const isSearchActive = trimmedQuery !== '';

  // Calculate matching orders based on search mode
  const matchingOrders = useMemo(() => {
    if (!isSearchActive) return [];

    if (searchMode === 'number') {
      const parsedNum = Number(trimmedQuery);
      if (isNaN(parsedNum)) return [];
      // Match exact order number
      return orders.filter((o) => o.orderNumber === parsedNum);
    } else {
      // Match exact or contains customer last name
      const cleanSearchLastName = trimmedQuery.toLowerCase();
      return orders.filter((o) => {
        const lastName = (o.customerLastName || '').trim().toLowerCase();
        return lastName === cleanSearchLastName || lastName.includes(cleanSearchLastName);
      });
    }
  }, [orders, isSearchActive, searchMode, trimmedQuery]);

  // Determine currently focused order if search result has 1 item or user picked one from multiple
  const activeFocusOrder = useMemo(() => {
    if (matchingOrders.length === 1) {
      return matchingOrders[0];
    }
    if (selectedMatchedOrderId) {
      return orders.find((o) => o.id === selectedMatchedOrderId) || null;
    }
    return null;
  }, [matchingOrders, selectedMatchedOrderId, orders]);

  // Normal tab list when search is inactive
  const regularTabOrders = orders.filter((o) => {
    if (activeTab === 'washing') return o.status === 'في الغسيل';
    if (activeTab === 'ready') return o.status === 'جاهز';
    return true;
  });

  const handleMarkAsReady = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    await updateOrderStatus(orderId, 'جاهز');
  };

  const handleMarkAsWashing = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    await updateOrderStatus(orderId, 'في الغسيل');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedMatchedOrderId(null);
    setOcrSuccessNotice(null);
  };

  // When camera OCR reads text from customer paper
  const handleRecognizedFromPhoto = (data: { orderNumber?: string; customerLastName?: string }) => {
    setSelectedMatchedOrderId(null);

    if (data.orderNumber) {
      // Prioritize order number
      const numOnly = data.orderNumber.replace(/[^0-9]/g, '');
      setSearchMode('number');
      setSearchQuery(numOnly);
      setOcrSuccessNotice(
        `تم التعرف على رقم الطلب #${numOnly}${data.customerLastName ? ` واللقب (${data.customerLastName})` : ''}`
      );
    } else if (data.customerLastName) {
      // Use last name
      setSearchMode('lastName');
      setSearchQuery(data.customerLastName);
      setOcrSuccessNotice(`تم التعرف على لقب الزبون: "${data.customerLastName}"`);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'في الغسيل':
        return (
          <div className="bg-orange-500 text-white px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs">
            <Waves className="w-4 h-4 text-white" />
            <span className="text-sm font-black">في الغسيل</span>
          </div>
        );
      case 'جاهز':
        return (
          <div className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span className="text-sm font-black">جاهز</span>
          </div>
        );
      case 'تم التسليم':
        return (
          <div className="bg-slate-600 text-white px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs">
            <Package className="w-4 h-4 text-white" />
            <span className="text-sm font-black">تم التسليم</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Header with Back to Role Selection Button */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          id="laundry-back-role-btn"
          type="button"
          onClick={onSwitchRole}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع لاختيار الدور</span>
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span className="text-xs text-cyan-800 font-bold">قسم الغسيل</span>
          </div>
          <h2 className="text-base font-black text-slate-900">ورشة ومعالجة الأفرشة</h2>
        </div>

        <div className="flex items-center gap-1 bg-cyan-50 border border-cyan-300 text-cyan-900 px-2.5 py-1 rounded-xl">
          <Waves className="w-4 h-4 text-cyan-600" />
          <span className="text-xs font-black">{counters.inWashing} للغسيل</span>
        </div>
      </div>

      {/* Main Action Block: 📷 "تصوير الورقة" & Manual Search */}
      <div className="bg-white p-4 rounded-3xl border-2 border-cyan-500/50 shadow-sm space-y-3.5">
        {/* 1. Camera OCR Button (Primary Feature) */}
        <button
          id="laundry-camera-photo-btn"
          type="button"
          onClick={() => setShowPhotoModal(true)}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 active:scale-[0.98] text-white font-black text-base shadow-md flex items-center justify-center gap-2.5 transition"
        >
          <Camera className="w-6 h-6 text-white" />
          <span>📷 تصوير الورقة (قراءة رقم الطلب واللقب)</span>
        </button>

        {/* 2. Manual Search Options (Order Number & Last Name) */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-700">أو البحث اليدوي:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {/* Option 1: 🔢 Search by order number */}
              <button
                id="search-by-number-mode-btn"
                type="button"
                onClick={() => {
                  setSearchMode('number');
                  setSelectedMatchedOrderId(null);
                  setOcrSuccessNotice(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                  searchMode === 'number'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>🔢 برقم الطلب</span>
              </button>

              {/* Option 2: 👤 Search by last name */}
              <button
                id="search-by-lastname-mode-btn"
                type="button"
                onClick={() => {
                  setSearchMode('lastName');
                  setSelectedMatchedOrderId(null);
                  setOcrSuccessNotice(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                  searchMode === 'lastName'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>👤 باللقب</span>
              </button>
            </div>
          </div>

          {/* Search Input Field */}
          <div className="relative">
            <input
              id="laundry-order-search-input"
              type={searchMode === 'number' ? 'number' : 'text'}
              inputMode={searchMode === 'number' ? 'numeric' : 'text'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedMatchedOrderId(null);
                setOcrSuccessNotice(null);
              }}
              placeholder={
                searchMode === 'number'
                  ? 'اكتب رقم الطلب المطابق (مثال: 0258 أو 45)...'
                  : 'اكتب لقب الزبون المطابق (مثال: بن علي، BEN SALAH)...'
              }
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border-2 border-cyan-400/60 text-lg font-black text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {searchQuery ? (
              <button
                id="laundry-clear-search-btn"
                type="button"
                onClick={handleClearSearch}
                className="absolute left-3 top-3.5 p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            )}
          </div>
        </div>

        {/* Active Search & OCR Info Banner */}
        {isSearchActive && (
          <div className="flex flex-col gap-1 bg-cyan-50/90 p-2.5 rounded-xl text-xs text-cyan-900 border border-cyan-200">
            <div className="flex items-center justify-between font-bold">
              <span>
                {searchMode === 'number'
                  ? `البحث برقم الطلب: #${trimmedQuery}`
                  : `البحث بلقب الزبون: "${trimmedQuery}"`}
              </span>
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-cyan-700 hover:text-cyan-950 underline font-bold"
              >
                إلغاء وعرض كل الطلبات
              </button>
            </div>
            {ocrSuccessNotice && (
              <span className="text-[11px] text-teal-800 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                {ocrSuccessNotice}
              </span>
            )}
          </div>
        )}
      </div>

      {/* SEARCH RESULTS SECTION:
          STRICT RULE: When searching, show ONLY the matching order(s), NEVER the full list! */}
      {isSearchActive ? (
        <div className="space-y-3">
          {matchingOrders.length === 0 ? (
            /* 1. No Match Found Alert */
            <div className="bg-white rounded-3xl p-8 text-center border-2 border-rose-200 shadow-2xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-rose-700">لا يوجد طلب مطابق</h3>
              <p className="text-xs text-slate-500">
                {searchMode === 'number'
                  ? `لم يتم العثور على أي طلب برقم #${trimmedQuery}`
                  : `لم يتم العثور على أي طلب باللقب "${trimmedQuery}"`}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>إعادة تصوير الورقة</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs"
                >
                  مسح والعودة للقائمة
                </button>
              </div>
            </div>
          ) : activeFocusOrder ? (
            /* 2. Single Order or Focused Order Card: Shows ONLY the required fields */
            <div className="bg-white rounded-3xl p-5 border-2 border-cyan-600 shadow-md space-y-4">
              {/* Back to multiple results list if there was more than one match */}
              {matchingOrders.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedMatchedOrderId(null)}
                  className="flex items-center gap-1 text-xs font-black text-cyan-800 bg-cyan-50 px-3 py-1.5 rounded-xl hover:bg-cyan-100 w-fit"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة للطلبات المطابقة للقب ({matchingOrders.length})</span>
                </button>
              )}

              {/* Order Header: Order Number & Current Status */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-slate-950 text-amber-300 px-3.5 py-1.5 rounded-2xl font-black text-xl shadow-xs tracking-wider">
                    #{activeFocusOrder.orderNumber}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">رقم الطلب</span>
                    <span className="text-xs font-black text-slate-800">نتيجة البحث المطابقة</span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[11px] text-slate-400 font-bold block mb-1">الحالة الحالية:</span>
                  {getStatusBadge(activeFocusOrder.status)}
                </div>
              </div>

              {/* Required Order Result Details:
                  1. Order number
                  2. First name
                  3. Last name
                  4. Phone number
                  5. Item type
                  6. Entry date
                  7. Expected exit date
                  8. Current status */}
              <div className="space-y-2.5 text-xs sm:text-sm">
                {/* 1. First Name */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-500">الاسم الأول:</span>
                  <span className="font-black text-slate-900 text-sm sm:text-base">
                    {activeFocusOrder.customerFirstName}
                  </span>
                </div>

                {/* 2. Last Name */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-500">اللقب:</span>
                  <span className="font-black text-slate-900 text-sm sm:text-base">
                    {activeFocusOrder.customerLastName}
                  </span>
                </div>

                {/* 3. Phone Number */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-500">رقم الهاتف:</span>
                  <a
                    href={`tel:${activeFocusOrder.customerPhone}`}
                    className="flex items-center gap-1.5 font-black text-teal-700 hover:text-teal-900 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200"
                    dir="ltr"
                  >
                    <Phone className="w-4 h-4 text-teal-600" />
                    <span>{activeFocusOrder.customerPhone}</span>
                  </a>
                </div>

                {/* 4. Bedding Items & Quantities */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-700" />
                      <span className="font-black text-slate-800 text-xs sm:text-sm">
                        أنواع الأفرشة والأعداد:
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-cyan-900 bg-cyan-100/80 px-2.5 py-0.5 rounded-lg border border-cyan-300">
                        الإجمالي: {activeFocusOrder.itemCount} {activeFocusOrder.itemCount === 1 ? 'قطعة' : 'قطع'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrderToEdit(activeFocusOrder)}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-cyan-800 border border-slate-300 text-xs font-bold flex items-center gap-1 shadow-2xs"
                        title="تعديل أنواع الأفرشة أو الكميات"
                      >
                        <Edit3 className="w-3 h-3 text-cyan-700" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  </div>

                  {activeFocusOrder.items && Array.isArray(activeFocusOrder.items) && activeFocusOrder.items.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeFocusOrder.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                              {it.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                                activeFocusOrder.status === 'جاهز'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                  : 'bg-amber-50 text-amber-900 border-amber-300'
                              }`}
                            >
                              {it.count} {it.count === 1 ? 'قطعة' : 'قطع'}
                              {activeFocusOrder.status === 'جاهز' ? ' (جاهزة)' : ' (للغسيل)'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        {activeFocusOrder.itemType}
                      </span>
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                          activeFocusOrder.status === 'جاهز'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {activeFocusOrder.itemCount} {activeFocusOrder.itemCount === 1 ? 'قطعة' : 'قطع'}
                        {activeFocusOrder.status === 'جاهز' ? ' (جاهزة)' : ' (للغسيل)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 5. Entry Date */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-500">تاريخ الدخول:</span>
                  <span className="font-bold text-slate-800">
                    {formatDate(activeFocusOrder.entryDate)}
                  </span>
                </div>

                {/* 6. Expected Exit Date */}
                <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 flex items-center justify-between">
                  <span className="font-bold text-amber-900">تاريخ الخروج المتوقع:</span>
                  <span className="font-black text-amber-950">
                    {formatDate(activeFocusOrder.expectedExitDate)}
                  </span>
                </div>

                {/* Storage Location if set */}
                {activeFocusOrder.storageLocation && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">مكان التخزين بالسدة:</span>
                    <span className="font-bold text-indigo-900">{activeFocusOrder.storageLocation}</span>
                  </div>
                )}
              </div>

              {/* Status Change Buttons: "في الغسيل" → "جاهز" (Updates Firebase Realtime immediately) */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="block text-xs font-black text-slate-700">
                  تغيير حالة الطلب (تحديث فوري مع هاتف المحل):
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {/* Mark as "في الغسيل" */}
                  <button
                    id="laundry-status-washing-btn"
                    type="button"
                    onClick={(e) => handleMarkAsWashing(e, activeFocusOrder.id)}
                    className={`py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      activeFocusOrder.status === 'في الغسيل'
                        ? 'bg-orange-500 text-white ring-2 ring-orange-400 shadow-sm'
                        : 'bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-300'
                    }`}
                  >
                    <Waves className="w-4 h-4" />
                    <span>في الغسيل</span>
                  </button>

                  {/* Mark as "جاهز" */}
                  <button
                    id="laundry-status-ready-btn"
                    type="button"
                    onClick={(e) => handleMarkAsReady(e, activeFocusOrder.id)}
                    className={`py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      activeFocusOrder.status === 'جاهز'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-sm'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>جاهز بالسدة</span>
                  </button>
                </div>
              </div>

              {/* SMS Notification to Customer when Ready */}
              {activeFocusOrder.status === 'جاهز' && (
                <SmsActionCard order={activeFocusOrder} />
              )}

              {/* Clear Search & Return */}
              <button
                type="button"
                onClick={handleClearSearch}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                إغلاق نتيجة البحث والعودة لقائمة الطلبات
              </button>
            </div>
          ) : (
            /* 3. Multiple Matching Orders for Last Name: Show ONLY matching orders for worker to choose */
            <div className="space-y-3">
              <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-2xl text-xs text-cyan-900 font-bold flex items-center justify-between">
                <span>تم العثور على {matchingOrders.length} طلبات تطابق اللقب: "{trimmedQuery}"</span>
                <span className="text-[11px] text-cyan-700">اختر الطلب المطلوب</span>
              </div>

              {matchingOrders.map((order) => {
                const isWashing = order.status === 'في الغسيل';
                const isReady = order.status === 'جاهز';

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedMatchedOrderId(order.id)}
                    className={`bg-white rounded-2xl p-4 border-2 transition shadow-2xs space-y-3 cursor-pointer hover:border-cyan-500 active:scale-[0.99] ${
                      isWashing
                        ? 'border-amber-300 bg-amber-50/20'
                        : isReady
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-slate-950 text-amber-300 px-3 py-1 rounded-xl font-black text-lg shadow-xs tracking-wider">
                          #{order.orderNumber}
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold block">الزبون:</span>
                          <h4 className="text-sm font-black text-slate-900">
                            {order.customerFirstName} {order.customerLastName}
                          </h4>
                        </div>
                      </div>
                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-700" />
                            <span>أنواع الأفرشة والأعداد:</span>
                          </span>
                          <span className="text-[10px] font-black text-cyan-900 bg-cyan-100/70 px-2 py-0.5 rounded-md">
                            الإجمالي: {order.itemCount} قطع
                          </span>
                        </div>
                        {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {order.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="bg-white text-slate-900 border border-slate-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                              >
                                <span>{it.type}</span>
                                <span className="bg-cyan-100 text-cyan-950 font-black px-1.5 py-0.2 rounded text-[11px]">
                                  {it.count}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="font-extrabold text-slate-900">{order.itemType} ({order.itemCount} قطع)</p>
                        )}
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block">رقم الهاتف:</span>
                        <p className="font-bold text-teal-700" dir="ltr">{order.customerPhone}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block">تاريخ الدخول:</span>
                        <p className="font-bold text-slate-800">{formatDate(order.entryDate)}</p>
                      </div>
                      <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200 col-span-2 flex items-center justify-between">
                        <span className="text-[10px] text-amber-800 font-bold block">الخروج المتوقع:</span>
                        <p className="font-black text-amber-950">{formatDate(order.expectedExitDate)}</p>
                      </div>
                    </div>

                    {/* Direct Button to Mark as Ready or Open Full Details */}
                    <div className="flex items-center gap-2 pt-1">
                      {isWashing && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsReady(e, order.id)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>تحويل إلى "جاهز بالسدة"</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToEdit(order);
                        }}
                        className="py-2.5 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-cyan-800 border border-slate-300 flex items-center gap-1"
                        title="تعديل الأفرشة والكميات"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMatchedOrderId(order.id)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border transition ${
                          isWashing
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                            : 'flex-1 bg-slate-900 hover:bg-slate-800 text-white border-slate-900 flex items-center justify-center gap-1'
                        }`}
                      >
                        <span>عرض التفاصيل</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* REGULAR QUEUE: Shown ONLY when search input is empty */
        <>
          {/* Tab Selectors */}
          <div className="grid grid-cols-3 gap-2 bg-slate-200/80 p-1.5 rounded-2xl">
            <button
              id="tab-laundry-washing"
              type="button"
              onClick={() => setActiveTab('washing')}
              className={`py-2.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeTab === 'washing'
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400'
                  : 'text-slate-700 hover:bg-white/50'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>في الغسيل ({counters.inWashing})</span>
            </button>

            <button
              id="tab-laundry-ready"
              type="button"
              onClick={() => setActiveTab('ready')}
              className={`py-2.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeTab === 'ready'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>جاهزة بالسدة ({counters.ready})</span>
            </button>

            <button
              id="tab-laundry-all"
              type="button"
              onClick={() => setActiveTab('all')}
              className={`py-2.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/50'
              }`}
            >
              <span>كل الطلبات ({orders.length})</span>
            </button>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {regularTabOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h4 className="text-sm font-black text-slate-800">
                  {activeTab === 'washing'
                    ? 'لا توجد طلبات معلقة في الغسيل حالياً'
                    : 'لا توجد طلبات في هذه القائمة'}
                </h4>
                <p className="text-xs text-slate-500">
                  {activeTab === 'washing'
                    ? 'أي طلب جديد يتم تسجيله من هاتف المحل سيظهر هنا تلقائياً ولحظياً.'
                    : 'يمكنك استخدام تصوير الورقة بالكاميرا أو البحث اليدوي أعلاه.'}
                </p>
              </div>
            ) : (
              regularTabOrders.map((order) => {
                const isWashing = order.status === 'في الغسيل';
                const isReady = order.status === 'جاهز';

                return (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className={`bg-white rounded-2xl p-4 border-2 transition shadow-2xs space-y-3 cursor-pointer hover:border-cyan-400 active:scale-[0.99] ${
                      isWashing
                        ? 'border-amber-300 bg-amber-50/20'
                        : isReady
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header Row: Order Number & Customer Name */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        {/* Big Bold Order Number */}
                        <div className="bg-slate-950 text-amber-300 px-3 py-1 rounded-xl font-black text-lg shadow-xs tracking-wider">
                          #{order.orderNumber}
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-bold block">الزبون:</span>
                          <h4 className="text-sm font-black text-slate-900">
                            {order.customerFirstName} {order.customerLastName}
                          </h4>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    {/* Main Details Grid for Laundry Worker */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Item Type & Count */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-cyan-700" />
                            <span>أنواع الأفرشة والكميات:</span>
                          </span>
                          <span className="text-[11px] font-black text-cyan-900 bg-cyan-100/70 px-2 py-0.5 rounded-md">
                            الإجمالي: {order.itemCount} {order.itemCount === 1 ? 'قطعة' : 'قطع'}
                          </span>
                        </div>

                        {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {order.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="bg-white text-slate-900 border border-slate-200 px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-2xs"
                              >
                                <span>{it.type}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[11px] font-black ${
                                    isReady
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {it.count} {isReady ? 'جاهزة' : 'للغسيل'}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="font-extrabold text-slate-900 text-xs">
                            {order.itemType} ({order.itemCount} قطع)
                          </p>
                        )}
                      </div>

                      {/* Customer Phone (Click to Call) */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <Phone className="w-3 h-3 text-teal-600" /> رقم الهاتف:
                        </span>
                        <a
                          href={`tel:${order.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-teal-700 hover:text-teal-900 block truncate"
                          dir="ltr"
                        >
                          {order.customerPhone}
                        </a>
                      </div>

                      {/* Entry Date */}
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" /> تاريخ الدخول:
                        </span>
                        <p className="font-bold text-slate-800">{formatDate(order.entryDate)}</p>
                      </div>

                      {/* Expected Exit Date */}
                      <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200 space-y-0.5 col-span-2 flex items-center justify-between">
                        <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" /> الخروج المتوقع:
                        </span>
                        <p className="font-black text-amber-950">{formatDate(order.expectedExitDate)}</p>
                      </div>
                    </div>

                    {/* Storage Location or Notes if present */}
                    {(order.storageLocation || order.notes) && (
                      <div className="flex flex-wrap gap-2 text-xs pt-1">
                        {order.storageLocation && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold">
                            <MapPin className="w-3 h-3 text-indigo-600" />
                            <span>المكان: {order.storageLocation}</span>
                          </span>
                        )}
                        {order.notes && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium truncate max-w-full">
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>{order.notes}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Direct Action Buttons for Laundry Role */}
                    <div className="pt-1 flex items-center gap-2">
                      {isWashing && (
                        <button
                          id={`mark-ready-btn-${order.orderNumber}`}
                          type="button"
                          onClick={(e) => handleMarkAsReady(e, order.id)}
                          className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>تحويل إلى "جاهز بالسدة"</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToEdit(order);
                        }}
                        className="py-3 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-cyan-800 border border-slate-300 flex items-center justify-center gap-1"
                        title="تعديل الأفرشة أو الكميات"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderForModal(order);
                        }}
                        className={`py-3 px-3 rounded-xl text-xs font-bold border transition ${
                          isWashing
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            : 'flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 flex items-center justify-center gap-1'
                        }`}
                      >
                        <span>تغيير الحالة...</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Clear Back Button at bottom of screen */}
      <div className="pt-4 text-center">
        <button
          id="laundry-bottom-back-btn"
          type="button"
          onClick={onSwitchRole}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-black text-sm border border-slate-300 shadow-2xs transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع لاختيار الدور (المحل / الغسيل)</span>
        </button>
      </div>

      {/* Camera OCR Photo Modal */}
      <PaperPhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onRecognized={handleRecognizedFromPhoto}
      />

      {/* Modal for editing bedding types and counts */}
      {orderToEdit && (
        <EditOrderModal
          isOpen={true}
          order={orderToEdit}
          onClose={() => setOrderToEdit(null)}
          onSave={async (id, data) => {
            await updateOrder(id, data);
            setOrderToEdit(null);
          }}
        />
      )}

      {/* Modal for manual status adjustment */}
      {selectedOrderForModal && (
        <StatusChangeModal
          isOpen={true}
          onClose={() => setSelectedOrderForModal(null)}
          currentStatus={selectedOrderForModal.status}
          orderNumber={selectedOrderForModal.orderNumber}
          customerName={`${selectedOrderForModal.customerFirstName} ${selectedOrderForModal.customerLastName}`}
          onSelectStatus={async (newStatus) => {
            await updateOrderStatus(selectedOrderForModal.id, newStatus);
            setSelectedOrderForModal(null);
          }}
        />
      )}
    </div>
  );
};
