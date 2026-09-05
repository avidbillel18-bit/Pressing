import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Filter,
  Search,
  Calendar,
  Layers,
  ChevronLeft,
  Waves,
  CheckCircle2,
  Package,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react';
import { ScreenType, LaundryOrder, OrderStatus } from '../types';
import { useOrders } from '../context/OrderContext';
import { formatDate, getTodayString } from '../lib/orderUtils';

interface AllOrdersScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectOrder: (order: LaundryOrder) => void;
}

export const AllOrdersScreen: React.FC<AllOrdersScreenProps> = ({
  onNavigate,
  onSelectOrder,
}) => {
  const { orders } = useOrders();

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const todayStr = getTodayString();

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // 2. Date Filter based on entryDate or createdAt
      if (dateFilter !== 'all') {
        const orderDate = order.entryDate || '';
        const orderTimestamp = order.createdAt;
        const now = new Date();

        if (dateFilter === 'today') {
          if (orderDate !== todayStr) return false;
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
          if (orderDate !== yStr) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (orderTimestamp < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          if (orderTimestamp < thirtyDaysAgo) return false;
        }
      }

      // 3. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchNumber = String(order.orderNumber).includes(term);
        const matchName = `${order.customerFirstName} ${order.customerLastName}`.toLowerCase().includes(term);
        const matchPhone = (order.customerPhone || '').replace(/\s+/g, '').includes(term.replace(/\s+/g, ''));
        const matchItem = (order.itemType || '').toLowerCase().includes(term);
        if (!matchNumber && !matchName && !matchPhone && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, dateFilter, searchTerm, todayStr]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'في الغسيل':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            <Waves className="w-3 h-3 text-amber-700" />
            في الغسيل
          </span>
        );
      case 'جاهز':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            جاهز بالسدة
          </span>
        );
      case 'تم التسليم':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            <Package className="w-3 h-3 text-slate-500" />
            تم التسليم
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Back */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          id="all-orders-back-btn"
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-center">
          <h2 className="text-base font-black text-slate-800">كل الطلبات والسجلات</h2>
          <span className="text-xs text-slate-500 font-medium">
            متابعة التاريخ وتصفية الحالات
          </span>
        </div>

        <div className="bg-slate-900 text-white font-black text-sm px-3 py-1 rounded-xl shadow-xs">
          {filteredOrders.length} طلب
        </div>
      </div>

      {/* Filters Box */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Search within all */}
        <div className="relative">
          <input
            id="all-orders-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالرقم، الاسم، الهاتف، أو الصنف..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Status Filters */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">تصفية حسب الحالة:</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'في الغسيل', label: 'في الغسيل' },
              { id: 'جاهز', label: 'جاهز' },
              { id: 'تم التسليم', label: 'المسلمة' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`py-1.5 px-2 rounded-xl text-xs font-black transition text-center ${
                  statusFilter === tab.id
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filters */}
        <div className="space-y-1 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 block">تصفية حسب التاريخ:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'كل التواريخ' },
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'الأمس' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  dateFilter === d.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 space-y-2">
            <Filter className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">لا توجد طلبات تطابق هذه التصفية</p>
            <p className="text-xs text-slate-400">جرب تغيير الحالة أو التاريخ المحدد</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs hover:border-slate-300 transition active:bg-slate-50 cursor-pointer space-y-2.5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-300 font-black text-lg flex items-center justify-center shadow-xs">
                    #{order.orderNumber}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {order.customerFirstName} {order.customerLastName}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium block" dir="ltr">
                      {order.customerPhone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {getStatusBadge(order.status)}
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Items & Dates */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1 text-slate-800 font-bold truncate max-w-[55%]">
                  <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">{order.itemType}</span>
                  {order.itemCount > 1 && (
                    <span className="text-slate-500 text-[11px]">({order.itemCount})</span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>دخول: {formatDate(order.entryDate)}</span>
                  <span>| خروج: {formatDate(order.expectedExitDate)}</span>
                </div>
              </div>

              {/* Storage location if any */}
              {order.storageLocation && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>مكان السدة: {order.storageLocation}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Back Button */}
      <button
        id="all-orders-bottom-back-btn"
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
