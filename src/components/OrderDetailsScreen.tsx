import React, { useState } from 'react';
import {
  ArrowRight,
  Phone,
  Calendar,
  Layers,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  Waves,
  Package,
  Edit3,
  RefreshCw,
  Check,
  Share2,
  Trash2,
  Printer,
} from 'lucide-react';
import { ScreenType, LaundryOrder, OrderStatus } from '../types';
import { useOrders } from '../context/OrderContext';
import { formatDate, formatDateTime } from '../lib/orderUtils';
import { StatusChangeModal } from './StatusChangeModal';
import { EditOrderModal } from './EditOrderModal';
import { CustomerOrderCardModal } from './CustomerOrderCardModal';
import { SmsActionCard } from './SmsActionCard';

interface OrderDetailsScreenProps {
  order: LaundryOrder;
  onNavigate: (screen: ScreenType) => void;
  onBack: () => void;
}

export const OrderDetailsScreen: React.FC<OrderDetailsScreenProps> = ({
  order,
  onNavigate,
  onBack,
}) => {
  const { updateOrderStatus, updateOrder, markAsDelivered, deleteOrder } = useOrders();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'في الغسيل':
        return {
          title: 'في الغسيل',
          desc: 'القطع قيد المعالجة والغسيل',
          icon: <Waves className="w-5 h-5 text-amber-700" />,
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          text: 'text-amber-900',
        };
      case 'جاهز':
        return {
          title: 'جاهز (بالطابق العلوي / السدة)',
          desc: 'تم الغسيل وهي جاهزة بالمخزن العلوي للتسليم',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-700" />,
          bg: 'bg-emerald-50',
          border: 'border-2 border-emerald-500',
          text: 'text-emerald-950',
        };
      case 'تم التسليم':
        return {
          title: 'تم التسليم للزبون',
          desc: 'تم تسليم القطع وخروجها من المحل',
          icon: <Package className="w-5 h-5 text-slate-700" />,
          bg: 'bg-slate-100',
          border: 'border-slate-300',
          text: 'text-slate-900',
        };
    }
  };

  const statusInfo = getStatusDisplay(order.status);

  return (
    <div className="space-y-4 pb-16">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          id="order-details-back-btn"
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-center">
          <span className="text-xs text-slate-500 font-bold block">تفاصيل الطلب</span>
          <span className="text-base font-black text-slate-900">
            {order.customerFirstName} {order.customerLastName}
          </span>
        </div>

        <div className="bg-slate-900 text-amber-300 font-black text-lg px-3 py-1 rounded-xl shadow-xs">
          #{order.orderNumber}
        </div>
      </div>

      {/* Status Hero Card */}
      <div
        className={`${statusInfo.bg} ${statusInfo.border} rounded-2xl p-4 shadow-xs space-y-2`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-xs">
              {statusInfo.icon}
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">الحالة الحالية:</span>
              <h2 className={`text-base font-black ${statusInfo.text}`}>{statusInfo.title}</h2>
            </div>
          </div>

          <button
            id="change-status-btn"
            type="button"
            onClick={() => setShowStatusModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-black border border-slate-300 shadow-2xs active:scale-95 transition"
          >
            تغيير الحالة
          </button>
        </div>
        <p className="text-xs text-slate-600 font-medium">{statusInfo.desc}</p>
      </div>

      {/* SMS Customer Notification Card (Prominent when Ready / "القش واجد") */}
      {order.status === 'جاهز' && (
        <SmsActionCard order={order} />
      )}

      {/* Main Order Details Cards */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        {/* Customer Information */}
        <div className="space-y-2 border-b border-slate-100 pb-3.5">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            معلومات الزبون
          </span>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">الاسم واللقب:</span>
              <span className="text-base font-black text-slate-900">
                {order.customerFirstName} {order.customerLastName}
              </span>
            </div>

            {/* Direct Call Button */}
            <a
              href={`tel:${order.customerPhone}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-black text-sm active:scale-95 transition"
              dir="ltr"
            >
              <Phone className="w-4 h-4 text-teal-600" />
              <span>{order.customerPhone}</span>
            </a>
          </div>
        </div>

        {/* Item & Washing Type */}
        <div className="space-y-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              الأفرشة والقطع
            </span>
            <span className="text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
              الإجمالي: {order.itemCount} {order.itemCount === 1 ? 'قطعة' : 'قطع'}
            </span>
          </div>

          {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="space-y-1.5">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-sm font-black text-slate-900">{item.type}</span>
                  </div>
                  <span className="text-xs font-black bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg">
                    العدد: {item.count} {item.count === 1 ? 'قطعة' : 'قطع'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600" />
                <div>
                  <span className="text-sm font-black text-slate-900 block">{order.itemType}</span>
                  <span className="text-xs text-slate-500 font-medium">
                    الكمية: {order.itemCount} {order.itemCount === 1 ? 'قطعة' : 'قطع'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dates & Timeline */}
        <div className="space-y-2 border-b border-slate-100 pb-3.5">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            مواعيد الدخول والخروج
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <span className="text-[11px] text-slate-500 font-bold block">تاريخ الدخول (الاستلام):</span>
              <span className="text-xs font-black text-slate-800">{formatDate(order.entryDate)}</span>
            </div>

            <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-200">
              <span className="text-[11px] text-teal-800 font-bold block">تاريخ الخروج المتوقع:</span>
              <span className="text-xs font-black text-teal-950">
                {formatDate(order.expectedExitDate)}
              </span>
            </div>
          </div>

          {order.actualExitDate && (
            <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">تاريخ ووقت التسليم الفعلي:</span>
              <span className="font-black text-slate-900">{formatDateTime(order.actualExitDate)}</span>
            </div>
          )}
        </div>

        {/* Upstairs Storage Shelf & Notes */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            الموقع بالسدة والملاحظات
          </span>

          <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <span className="text-[11px] text-emerald-800 font-bold block">
                مكان التخزين بالطابق العلوي (السدة):
              </span>
              <span className="text-xs font-black text-emerald-950">
                {order.storageLocation || 'غير محدد بالرف (موجود بالسدة الرئيسية)'}
              </span>
            </div>
          </div>

          {order.notes ? (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> ملاحظات خاصة:
              </span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">{order.notes}</p>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic block">لا توجد ملاحظات إضافية</span>
          )}
        </div>
      </div>

      {/* Action Buttons: Edit, Change Status, Mark Delivered, Back */}
      <div className="space-y-2 pt-2">
        {/* Quick Mark Delivered Button (if not already delivered) */}
        {order.status !== 'تم التسليم' && (
          <button
            id="order-details-mark-delivered-btn"
            type="button"
            onClick={() => markAsDelivered(order.id)}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-lg shadow-md flex items-center justify-center gap-2 transition"
          >
            <Check className="w-6 h-6" />
            <span>تم التسليم للزبون</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Edit Button */}
          <button
            id="order-details-edit-btn"
            type="button"
            onClick={() => setShowEditModal(true)}
            className="py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-black text-sm border-2 border-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition shadow-2xs"
          >
            <Edit3 className="w-4 h-4 text-teal-600" />
            <span>تعديل الطلب</span>
          </button>

          {/* Change Status Button */}
          <button
            id="order-details-change-status-secondary-btn"
            type="button"
            onClick={() => setShowStatusModal(true)}
            className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-95 transition shadow-xs"
          >
            <RefreshCw className="w-4 h-4 text-amber-300" />
            <span>تغيير الحالة</span>
          </button>
        </div>

        {/* Print / View Customer Card Button */}
        <button
          id="order-details-customer-card-btn"
          type="button"
          onClick={() => setShowCardModal(true)}
          className="w-full py-3.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border-2 border-teal-300 font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition"
        >
          <Printer className="w-4 h-4 text-teal-700" />
          <span>عرض / طباعة وصل الزبون (رقم الطلب واللقب)</span>
        </button>

        {/* Back to Home Button */}
        <button
          id="order-details-return-home-btn"
          type="button"
          onClick={onBack}
          className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        {/* Optional Delete Trigger with safe confirmation */}
        <div className="pt-2 text-center">
          {showDeleteConfirm ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <span className="text-xs text-rose-800 font-bold block">
                هل أنت متأكد من حذف هذا السجل نهائياً؟
              </span>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await deleteOrder(order.id);
                    onBack();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                >
                  نعم، احذف
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[11px] text-slate-600 hover:text-rose-600 font-semibold inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>حذف الطلب في حال الخطأ</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Modal */}
      <StatusChangeModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        currentStatus={order.status}
        orderNumber={order.orderNumber}
        customerName={`${order.customerFirstName} ${order.customerLastName}`}
        onSelectStatus={(newStatus) => updateOrderStatus(order.id, newStatus)}
      />

      {/* Edit Modal */}
      <EditOrderModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        order={order}
        onSave={updateOrder}
      />

      {/* Customer Ticket / Card Modal (Strict: Last name, Order number, and QR code only) */}
      <CustomerOrderCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        order={order}
      />
    </div>
  );
};
