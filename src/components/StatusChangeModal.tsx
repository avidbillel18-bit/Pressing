import React from 'react';
import { Waves, CheckCircle2, Package, X, Check } from 'lucide-react';
import { OrderStatus } from '../types';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: OrderStatus;
  orderNumber: number;
  customerName: string;
  onSelectStatus: (newStatus: OrderStatus) => void;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  orderNumber,
  customerName,
  onSelectStatus,
}) => {
  if (!isOpen) return null;

  const statuses: {
    id: OrderStatus;
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    border: string;
    bg: string;
  }[] = [
    {
      id: 'في الغسيل',
      title: 'في الغسيل (جاري التنظيف)',
      desc: 'القطع قيد الغسيل والتجفيف حالياً',
      icon: <Waves className="w-5 h-5 text-amber-700" />,
      color: 'text-amber-950',
      border: 'border-amber-300',
      bg: 'bg-amber-50',
    },
    {
      id: 'جاهز',
      title: 'جاهز (بالطابق العلوي / السدة)',
      desc: 'تم الانتهاء من الغسيل ومخزن بالسدة - جاهز لإرسال SMS للزبون',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-700" />,
      color: 'text-emerald-950',
      border: 'border-emerald-400',
      bg: 'bg-emerald-50',
    },
    {
      id: 'تم التسليم',
      title: 'تم التسليم (خرج مع الزبون)',
      desc: 'تم تسليم القطع وقبض الحساب وتسجيل موعد الخروج',
      icon: <Package className="w-5 h-5 text-slate-700" />,
      color: 'text-slate-950',
      border: 'border-slate-300',
      bg: 'bg-slate-50',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs text-slate-500 font-bold block">تغيير حالة الطلب</span>
            <h3 className="text-base font-black text-slate-900">
              الطلب #{orderNumber} - {customerName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status choices */}
        <div className="space-y-2.5">
          {statuses.map((s) => {
            const isSelected = currentStatus === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelectStatus(s.id);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-right flex items-center justify-between transition active:scale-[0.98] ${
                  isSelected
                    ? `${s.bg} ${s.border} ring-2 ring-teal-600 shadow-xs`
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                    {s.icon}
                  </div>
                  <div>
                    <span className={`block font-black text-sm ${s.color}`}>{s.title}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{s.desc}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Cancel */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
};
