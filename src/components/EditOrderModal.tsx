import React, { useState } from 'react';
import {
  X,
  Save,
  Layers,
  User,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { LaundryOrder, OrderItem } from '../types';
import {
  PRESET_ITEMS,
  STORAGE_LOCATIONS,
  formatOrderItemsSummary,
  getTotalItemsCount,
} from '../lib/orderUtils';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LaundryOrder;
  onSave: (id: string, updatedData: Partial<LaundryOrder>) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
}) => {
  if (!isOpen) return null;

  const [customerFirstName, setCustomerFirstName] = useState(order.customerFirstName);
  const [customerLastName, setCustomerLastName] = useState(order.customerLastName);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);
  
  // Initialize multiple bedding types
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>(() => {
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      return order.items.map((it) => ({
        type: it.type,
        count: Math.max(1, Math.floor(Number(it.count)) || 1),
      }));
    }
    return [
      {
        type: order.itemType || PRESET_ITEMS[0].name,
        count: Math.max(1, Math.floor(Number(order.itemCount)) || 1),
      },
    ];
  });

  const [showAddTypePicker, setShowAddTypePicker] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [itemsError, setItemsError] = useState('');

  const [entryDate, setEntryDate] = useState(order.entryDate);
  const [expectedExitDate, setExpectedExitDate] = useState(order.expectedExitDate);
  const [storageLocation, setStorageLocation] = useState(order.storageLocation || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available presets excluding already selected types
  const availablePresets = PRESET_ITEMS.filter(
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
    if (itemsError) setItemsError('');
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
    if (itemsError) setItemsError('');
  };

  const handleAddPresetType = (typeName: string) => {
    if (selectedItems.some((item) => item.type === typeName)) return;
    setSelectedItems((prev) => [...prev, { type: typeName, count: 1 }]);
    setShowAddTypePicker(false);
    if (itemsError) setItemsError('');
  };

  const handleAddCustomType = () => {
    const trimmed = customTypeInput.trim();
    if (!trimmed) return;
    if (selectedItems.some((item) => item.type.toLowerCase() === trimmed.toLowerCase())) {
      setItemsError('هذا الصنف مضاف مسبقاً');
      return;
    }
    setSelectedItems((prev) => [...prev, { type: trimmed, count: 1 }]);
    setCustomTypeInput('');
    setShowAddTypePicker(false);
    if (itemsError) setItemsError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFirstName.trim() || !customerLastName.trim() || !customerPhone.trim()) {
      return;
    }

    if (selectedItems.length === 0) {
      setItemsError('يرجى إضافة نوع أفرشة واحد على الأقل');
      return;
    }

    for (const it of selectedItems) {
      if (!it.type || !it.type.trim()) {
        setItemsError('يرجى تحديد نوع الأفرشة لجميع العناصر');
        return;
      }
      const countNum = Number(it.count);
      if (isNaN(countNum) || !Number.isInteger(countNum) || countNum <= 0) {
        setItemsError('يجب أن يكون العدد رقماً صحيحاً أكبر من 0 لجميع الأنواع');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const summaryItemType = formatOrderItemsSummary(selectedItems);
      const totalItemCount = getTotalItemsCount(selectedItems);

      await onSave(order.id, {
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
        storageLocation: storageLocation.trim() || '',
        notes: notes.trim() || '',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCount = getTotalItemsCount(selectedItems);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl space-y-4 my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black bg-slate-900 text-amber-300 px-2.5 py-1 rounded-xl">
              #{order.orderNumber}
            </span>
            <h3 className="text-base font-black text-slate-900">تعديل بيانات الطلب</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleUpdate} className="space-y-3.5">
          {/* Customer Names */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الأول</label>
              <input
                type="text"
                value={customerFirstName}
                onChange={(e) => setCustomerFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اللقب</label>
              <input
                type="text"
                value={customerLastName}
                onChange={(e) => setCustomerLastName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
            <input
              type="tel"
              dir="ltr"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-left focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Multiple Bedding Types & Independent Quantities */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                <label className="text-xs font-black text-slate-800">
                  أنواع الأفرشة والأعداد
                </label>
              </div>
              <span className="text-[11px] font-black bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 rounded-lg">
                الإجمالي: {totalCount} قطعة
              </span>
            </div>

            {/* List of items */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {selectedItems.length === 0 ? (
                <p className="text-xs text-rose-500 font-bold text-center py-2">
                  لم يتم اختيار أي نوع. اضغط أدناه لإضافة أفرشة.
                </p>
              ) : (
                selectedItems.map((item, index) => {
                  const countNum = Number(item.count);
                  const isInvalid = isNaN(countNum) || !Number.isInteger(countNum) || countNum <= 0;

                  return (
                    <div
                      key={`${item.type}-${index}`}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 bg-white ${
                        isInvalid ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-black text-slate-900 truncate">
                        {item.type}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemCount(index, Math.max(1, countNum - 1))}
                            disabled={countNum <= 1}
                            className="w-6 h-6 rounded bg-white text-slate-700 disabled:opacity-40 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.count === 0 ? '' : item.count}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              handleUpdateItemCount(index, val);
                            }}
                            className="w-12 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemCount(index, (isNaN(countNum) ? 0 : countNum) + 1)}
                            className="w-6 h-6 rounded bg-teal-600 text-white flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {itemsError && (
              <div className="flex items-center gap-1 text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{itemsError}</span>
              </div>
            )}

            {/* Add Type Selector */}
            {!showAddTypePicker ? (
              <button
                type="button"
                onClick={() => setShowAddTypePicker(true)}
                className="w-full py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-dashed border-teal-400 text-xs font-black flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-teal-700 stroke-[3]" />
                <span>+ إضافة نوع أفرشة</span>
              </button>
            ) : (
              <div className="p-3 bg-white rounded-xl border border-teal-300 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-black text-slate-800">
                    اختر نوعاً لإضافته:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTypePicker(false);
                      setCustomTypeInput('');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {availablePresets.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {availablePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleAddPresetType(preset.name)}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-400 border border-slate-200 text-slate-800 text-[11px] font-bold text-right flex items-center justify-between"
                      >
                        <span className="truncate">{preset.name}</span>
                        <Plus className="w-3 h-3 text-teal-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-1">
                    تمت إضافة جميع الأصناف المحددة مسبقاً.
                  </p>
                )}

                {/* Custom Type in Modal */}
                <div className="pt-1.5 border-t border-slate-100 flex gap-1.5">
                  <input
                    type="text"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomType();
                      }
                    }}
                    placeholder="أو اكتب نوعاً مخصصاً..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomType}
                    disabled={!customTypeInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-bold"
                  >
                    إضافة
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الدخول</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الخروج المتوقع</label>
              <input
                type="date"
                value={expectedExitDate}
                onChange={(e) => setExpectedExitDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </div>
          </div>

          {/* Storage Shelf */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مكان التخزين بالسدة (الطابق العلوي)
            </label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="مثال: الرف العلوي 1..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500 mb-1.5"
            />
            <div className="flex flex-wrap gap-1">
              {STORAGE_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setStorageLocation(loc)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

