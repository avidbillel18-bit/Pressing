import React, { useState } from 'react';
import {
  ArrowRight,
  Save,
  X,
  User,
  Phone,
  Calendar,
  Layers,
  FileText,
  MapPin,
  Sparkles,
  Plus,
  Minus,
  Check,
  Trash2,
  AlertCircle,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import { ScreenType, OrderStatus, OrderItem } from '../types';
import { useOrders } from '../context/OrderContext';
import {
  PRESET_ITEMS,
  STORAGE_LOCATIONS,
  getTodayString,
  addDays,
  formatOrderItemsSummary,
  getTotalItemsCount,
  isOrderNumberDuplicate,
  validateManualOrderNumber,
} from '../lib/orderUtils';

interface AddOrderScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export const AddOrderScreen: React.FC<AddOrderScreenProps> = ({ onNavigate }) => {
  const { orders, addOrder } = useOrders();

  const today = getTodayString();
  const defaultExitDate = addDays(today, 3); // Standard 3-day turnaround

  // Form State - Manual Order Number
  const [orderNumberInput, setOrderNumberInput] = useState<string>('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Multiple Bedding Types State
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([
    { type: PRESET_ITEMS[0].name, count: 1 },
  ]);
  const [showAddTypePicker, setShowAddTypePicker] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');

  const [entryDate, setEntryDate] = useState(today);
  const [expectedExitDate, setExpectedExitDate] = useState(defaultExitDate);
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time check for duplicate order number
  const trimmedOrderNumber = orderNumberInput.trim();
  const isDuplicateNumber = trimmedOrderNumber !== '' && isOrderNumberDuplicate(trimmedOrderNumber, orders);

  // Available preset items that are not yet selected
  const availablePresetItems = PRESET_ITEMS.filter(
    (preset) => !selectedItems.some((item) => item.type === preset.name)
  );

  const handleUpdateItemCount = (index: number, newCount: number) => {
    setSelectedItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, count: newCount };
        }
        return item;
      })
    );
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: '' }));
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: '' }));
    }
  };

  const handleAddPresetType = (typeName: string) => {
    if (selectedItems.some((item) => item.type === typeName)) {
      return;
    }
    setSelectedItems((prev) => [...prev, { type: typeName, count: 1 }]);
    setShowAddTypePicker(false);
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: '' }));
    }
  };

  const handleAddCustomType = () => {
    const trimmed = customTypeInput.trim();
    if (!trimmed) return;
    if (selectedItems.some((item) => item.type.toLowerCase() === trimmed.toLowerCase())) {
      setErrors((prev) => ({ ...prev, customType: 'هذا الصنف مضاف مسبقاً' }));
      return;
    }
    setSelectedItems((prev) => [...prev, { type: trimmed, count: 1 }]);
    setCustomTypeInput('');
    setShowAddTypePicker(false);
    if (errors.items || errors.customType) {
      setErrors((prev) => ({ ...prev, items: '', customType: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Validate manual order number
    const numValidation = validateManualOrderNumber(orderNumberInput, orders);
    if (!numValidation.isValid) {
      newErrors.orderNumber = numValidation.error || 'يرجى إدخال رقم الطلب';
    }

    // 2. Validate customer information
    if (!customerFirstName.trim()) {
      newErrors.customerFirstName = 'يرجى إدخال اسم الزبون';
    }
    if (!customerLastName.trim()) {
      newErrors.customerLastName = 'يرجى إدخال لقب الزبون';
    }
    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'يرجى إدخال رقم الهاتف';
    }
    
    // 3. Validate bedding items
    if (selectedItems.length === 0) {
      newErrors.items = 'يرجى إضافة نوع أفرشة واحد على الأقل';
    } else {
      for (const it of selectedItems) {
        if (!it.type || !it.type.trim()) {
          newErrors.items = 'يرجى تحديد نوع الأفرشة';
          break;
        }
        const cnt = Number(it.count);
        if (isNaN(cnt) || !Number.isInteger(cnt) || cnt <= 0) {
          newErrors.items = 'يجب أن يكون العدد رقماً صحيحاً أكبر من 0 لجميع الأنواع';
          break;
        }
      }
    }

    if (!entryDate) {
      newErrors.entryDate = 'يرجى تحديد تاريخ الدخول';
    }
    if (!expectedExitDate) {
      newErrors.expectedExitDate = 'يرجى تحديد تاريخ الخروج المتوقع';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const summaryItemType = formatOrderItemsSummary(selectedItems);
      const totalItemCount = getTotalItemsCount(selectedItems);
      const finalOrderNumber = Number(orderNumberInput.trim());

      await addOrder({
        orderNumber: finalOrderNumber,
        customerFirstName: customerFirstName.trim(),
        customerLastName: customerLastName.trim(),
        customerPhone: customerPhone.trim(),
        itemType: summaryItemType,
        itemCount: totalItemCount,
        items: selectedItems.map((it) => ({
          type: it.type.trim(),
          count: Math.max(1, Math.floor(Number(it.count)) || 1),
        })),
        entryDate,
        expectedExitDate,
        status: 'في الغسيل' as OrderStatus,
        storageLocation: storageLocation.trim() || '',
        notes: notes.trim() || '',
      });

      onNavigate('home');
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes('مستعمل')) {
        setErrors((prev) => ({
          ...prev,
          orderNumber: '⚠️ رقم الطلب هذا مستعمل من قبل، اختر رقماً آخر.',
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDaysFromToday = (days: number) => {
    setExpectedExitDate(addDays(today, days));
  };

  const totalCount = getTotalItemsCount(selectedItems);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          id="add-order-back-btn"
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-center">
          <span className="text-xs text-slate-500 font-semibold block">تسجيل طلب جديد</span>
          <span className="text-sm font-black text-slate-800">غسيل أفرشة وبطانيات</span>
        </div>

        {/* Assigned Order Number Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 transition ${
            isDuplicateNumber
              ? 'bg-rose-50 border-rose-500 text-rose-800'
              : trimmedOrderNumber
              ? 'bg-teal-50 border-teal-500 text-teal-900'
              : 'bg-slate-100 border-slate-300 text-slate-500'
          }`}
        >
          <span className="text-xs font-bold">رقم:</span>
          <span className="text-lg font-black font-mono">
            {trimmedOrderNumber ? `#${trimmedOrderNumber}` : '#---'}
          </span>
        </div>
      </div>

      {/* Main Order Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* 0. Manual Order Number Card (واضح ويدوي تماماً) */}
        <div
          className={`bg-white p-4 rounded-2xl border-2 shadow-2xs space-y-3 transition ${
            isDuplicateNumber
              ? 'border-rose-400 bg-rose-50/20'
              : errors.orderNumber
              ? 'border-rose-400 bg-rose-50/20'
              : trimmedOrderNumber
              ? 'border-teal-500/80 bg-teal-50/10'
              : 'border-teal-400/60'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-black">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  رقم الطلب <span className="text-rose-500">*</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  أدخل رقم الوصل المكتوب على ورقة الزبون يدوياً
                </p>
              </div>
            </div>

            {trimmedOrderNumber && !isDuplicateNumber && !errors.orderNumber && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                رقم متاح
              </span>
            )}
          </div>

          <div>
            <label htmlFor="orderNumberInput" className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم الطلب (أرقام فقط):
            </label>
            <div className="relative">
              <input
                id="orderNumberInput"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={orderNumberInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setOrderNumberInput(val);
                  if (errors.orderNumber) {
                    setErrors((prev) => ({ ...prev, orderNumber: '' }));
                  }
                }}
                placeholder="اكتب رقم الطلب هنا (مثال: 1 أو 25 أو 1250 أو 9999)"
                className={`w-full px-4 py-3 rounded-xl border-2 text-lg font-black font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                  isDuplicateNumber || errors.orderNumber
                    ? 'border-rose-500 bg-rose-50/60 text-rose-950 placeholder:text-rose-400'
                    : 'border-slate-300 bg-slate-50/60 text-slate-900 placeholder:text-slate-400'
                }`}
                dir="ltr"
                required
                autoFocus
              />
            </div>

            {/* Duplicate Warning or Validation Error */}
            {(isDuplicateNumber || errors.orderNumber) && (
              <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {isDuplicateNumber
                    ? '⚠️ رقم الطلب هذا مستعمل من قبل، اختر رقماً آخر.'
                    : errors.orderNumber}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 1. Customer Information Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-black text-slate-800">بيانات الزبون</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* First Name */}
            <div>
              <label htmlFor="customerFirstName" className="block text-xs font-bold text-slate-700 mb-1">
                الاسم الأول <span className="text-rose-500">*</span>
              </label>
              <input
                id="customerFirstName"
                type="text"
                value={customerFirstName}
                onChange={(e) => {
                  setCustomerFirstName(e.target.value);
                  if (errors.customerFirstName) setErrors({ ...errors, customerFirstName: '' });
                }}
                placeholder="مثال: محمد"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.customerFirstName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-slate-50/50'
                }`}
              />
              {errors.customerFirstName && (
                <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                  {errors.customerFirstName}
                </span>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="customerLastName" className="block text-xs font-bold text-slate-700 mb-1">
                اللقب <span className="text-rose-500">*</span>
              </label>
              <input
                id="customerLastName"
                type="text"
                value={customerLastName}
                onChange={(e) => {
                  setCustomerLastName(e.target.value);
                  if (errors.customerLastName) setErrors({ ...errors, customerLastName: '' });
                }}
                placeholder="مثال: بوعلام"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.customerLastName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-slate-50/50'
                }`}
              />
              {errors.customerLastName && (
                <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                  {errors.customerLastName}
                </span>
              )}
            </div>
          </div>

          {/* Customer Phone */}
          <div>
            <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-700 mb-1">
              رقم الهاتف <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="customerPhone"
                type="tel"
                dir="ltr"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  if (errors.customerPhone) setErrors({ ...errors, customerPhone: '' });
                }}
                placeholder="05 / 06 / 07 ..."
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-bold text-left tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.customerPhone ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-slate-50/50'
                }`}
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            {errors.customerPhone && (
              <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                {errors.customerPhone}
              </span>
            )}
          </div>
        </div>

        {/* 2. Multiple Bedding Types & Quantities Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-black text-slate-800">
                أنواع الأفرشة والكميات <span className="text-rose-500">*</span>
              </h3>
            </div>
            <span className="text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
              الإجمالي: {totalCount} {totalCount === 1 ? 'قطعة' : 'قطع'}
            </span>
          </div>

          {errors.items && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errors.items}</span>
            </div>
          )}

          {/* List of currently selected item types with counts */}
          <div className="space-y-2.5">
            {selectedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                  <span className="font-bold text-xs text-slate-800 truncate">{item.type}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleUpdateItemCount(index, Math.max(1, item.count - 1))}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 text-sm font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1 font-black text-xs text-slate-900 bg-slate-50 min-w-7 text-center">
                      {item.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemCount(index, item.count + 1)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 text-sm font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Remove Item Type */}
                  {selectedItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 active:scale-95"
                      title="حذف هذا الصنف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Button to show picker to add another type */}
          {!showAddTypePicker ? (
            <button
              type="button"
              onClick={() => setShowAddTypePicker(true)}
              className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-teal-400 hover:border-teal-600 hover:bg-teal-50/50 text-teal-800 text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة نوع أفرشة إضافي لنفس الطلب</span>
            </button>
          ) : (
            <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-900">اختر نوع الأفرشة الإضافي:</span>
                <button
                  type="button"
                  onClick={() => setShowAddTypePicker(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preset buttons */}
              {availablePresetItems.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {availablePresetItems.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleAddPresetType(preset.name)}
                      className="text-left px-2.5 py-2 rounded-lg bg-white hover:bg-teal-100/70 border border-teal-200 text-[11px] font-bold text-slate-800 transition"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Custom type input */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-slate-600 block">أو اكتب نوعاً مخصصاً:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    placeholder="مثال: غطاء أريكة، صالون مغربي..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomType}
                    disabled={!customTypeInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold disabled:opacity-50"
                  >
                    إضافة
                  </button>
                </div>
                {errors.customType && (
                  <span className="text-[11px] text-rose-600 font-semibold block">{errors.customType}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Dates Information Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-black text-slate-800">التواريخ والمواعيد</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Entry Date */}
            <div>
              <label htmlFor="entryDate" className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الدخول <span className="text-rose-500">*</span>
              </label>
              <input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Expected Exit Date */}
            <div>
              <label htmlFor="expectedExitDate" className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الخروج المتوقع <span className="text-rose-500">*</span>
              </label>
              <input
                id="expectedExitDate"
                type="date"
                value={expectedExitDate}
                onChange={(e) => setExpectedExitDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Quick Date Presets */}
          <div>
            <span className="text-[11px] text-slate-500 font-bold block mb-1.5">مواعيد تسليم سريعة:</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setDaysFromToday(2)}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                بعد يومين
              </button>
              <button
                type="button"
                onClick={() => setDaysFromToday(3)}
                className="py-1.5 px-2 rounded-lg bg-teal-50 border border-teal-300 text-teal-800 text-xs font-black"
              >
                بعد 3 أيام (المعتاد)
              </button>
              <button
                type="button"
                onClick={() => setDaysFromToday(5)}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                بعد 5 أيام
              </button>
            </div>
          </div>
        </div>

        {/* 4. Storage Location & Notes Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <MapPin className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-black text-slate-800">مكان التخزين بالسدة والملاحظات</h3>
          </div>

          <div>
            <label htmlFor="storageLocation" className="block text-xs font-bold text-slate-700 mb-1">
              رقم الرف / مكان التخزين بالسدة (اختياري):
            </label>
            <input
              id="storageLocation"
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="مثال: الرف العلوي 2، سدة الزرابي..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
            />

            {/* Quick shelf suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {STORAGE_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setStorageLocation(loc)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border font-semibold ${
                    storageLocation === loc
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="orderNotes" className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات خاصة (بقع، تعليمات غسيل، عطور):
            </label>
            <textarea
              id="orderNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: بقعة زيت في الوسط، يرجى تعطير إضافي..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* 5. Bottom Action Buttons (Save, Cancel, Back) */}
        <div className="space-y-2 pt-2">
          {/* Save Button */}
          <button
            id="add-order-submit-btn"
            type="submit"
            disabled={isSubmitting || isDuplicateNumber}
            className="w-full py-4 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white font-black text-lg shadow-md border border-teal-600 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'جاري الحفظ...'
                : trimmedOrderNumber
                ? `حفظ الطلب رقم #${trimmedOrderNumber}`
                : 'حفظ الطلب الجديد'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Cancel Button */}
            <button
              id="add-order-cancel-btn"
              type="button"
              onClick={() => onNavigate('home')}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <X className="w-4 h-4" />
              <span>إلغاء</span>
            </button>

            {/* Back Button */}
            <button
              id="add-order-back-secondary-btn"
              type="button"
              onClick={() => onNavigate('home')}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع للرئيسية</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
