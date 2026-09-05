import React from 'react';
import { Printer, X, Tag } from 'lucide-react';
import { LaundryOrder } from '../types';

interface CustomerOrderCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LaundryOrder;
}

export const CustomerOrderCardModal: React.FC<CustomerOrderCardModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!isOpen) return null;

  const orderNumStr = String(order.orderNumber).padStart(4, '0');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 text-center relative animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-ticket-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto mb-1">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black text-slate-900">وصل / بطاقة الزبون</h3>
          <p className="text-xs text-slate-500">
            تُلصق مع الأفرشة أو تُسلم للزبون
          </p>
        </div>

        {/* Printable Card Area - STRICT: ONLY Order Number (TOP) and Customer Last Name (BOTTOM) */}
        <div
          id="printable-customer-card"
          className="bg-white border-4 border-slate-900 rounded-3xl p-8 space-y-8 shadow-sm text-center"
        >
          {/* TOP: ORDER NUMBER (Very large, bold, high-contrast) */}
          <div className="space-y-1">
            <div className="text-6xl font-black text-slate-950 tracking-widest font-mono select-all">
              {orderNumStr}
            </div>
          </div>

          <div className="w-full border-b-4 border-slate-900"></div>

          {/* BOTTOM: CUSTOMER LAST NAME (Very large, bold, high-contrast) */}
          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-slate-950 uppercase tracking-wide break-words select-all">
              {order.customerLastName}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            id="print-ticket-btn"
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الوصل</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
