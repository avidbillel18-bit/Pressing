import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection } from '../lib/firebase';
import { LaundryOrder, OrderCounters, OrderStatus } from '../types';
import { isOrderNumberDuplicate, validateManualOrderNumber } from '../lib/orderUtils';

const LOCAL_STORAGE_KEY = 'dz_laundry_orders_backup';

interface OrderContextType {
  orders: LaundryOrder[];
  loading: boolean;
  isOnline: boolean;
  counters: OrderCounters;
  addOrder: (orderData: Omit<LaundryOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateOrder: (id: string, orderData: Partial<LaundryOrder>) => Promise<void>;
  updateOrderStatus: (id: string, newStatus: OrderStatus) => Promise<void>;
  markAsDelivered: (id: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  toastMessage: { text: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

function cleanPayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with localStorage cache if available for instant UI rendering
  const [orders, setOrders] = useState<LaundryOrder[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Sync state to local storage backup
  const saveToLocal = (newOrders: LaundryOrder[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newOrders));
    } catch (e) {
      console.warn('Could not save to local storage', e);
    }
  };

  // Track network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time synchronization with Firestore
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const setupSync = async () => {
      try {
        // Test connection on boot
        testConnection();

        const ordersCol = collection(db, 'orders');
        const q = query(ordersCol, orderBy('createdAt', 'desc'));

        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const fetchedOrders: LaundryOrder[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              fetchedOrders.push({
                id: docSnap.id,
                orderNumber: data.orderNumber ?? 0,
                customerFirstName: data.customerFirstName || '',
                customerLastName: data.customerLastName || '',
                customerPhone: data.customerPhone || '',
                itemType: data.itemType || '',
                itemCount: data.itemCount || 1,
                items: Array.isArray(data.items)
                  ? data.items
                      .filter((it: any) => it && typeof it === 'object' && it.type)
                      .map((it: any) => ({
                        type: String(it.type || ''),
                        count: Math.max(1, parseInt(it.count, 10) || 1),
                      }))
                  : undefined,
                entryDate: data.entryDate || '',
                expectedExitDate: data.expectedExitDate || '',
                actualExitDate: data.actualExitDate || null,
                status: data.status || 'في الغسيل',
                notes: data.notes || '',
                storageLocation: data.storageLocation || '',
                createdAt: data.createdAt || Date.now(),
                updatedAt: data.updatedAt || Date.now(),
              });
            });

            setOrders(fetchedOrders);
            saveToLocal(fetchedOrders);
            setLoading(false);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'orders');
            setLoading(false);
          }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'orders');
        setLoading(false);
      }
    };

    setupSync();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Calculate live counters
  const counters: OrderCounters = {
    inWashing: orders.filter((o) => o.status === 'في الغسيل').length,
    ready: orders.filter((o) => o.status === 'جاهز').length,
    delivered: orders.filter((o) => o.status === 'تم التسليم').length,
    totalActive: orders.filter((o) => o.status !== 'تم التسليم').length,
    totalAll: orders.length,
  };

  // Add new order with manual unique order number validation
  const addOrder = async (orderData: Omit<LaundryOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    // Check if orderNumber is provided and not duplicate
    if (orderData.orderNumber === undefined || orderData.orderNumber === null || String(orderData.orderNumber).trim() === '') {
      const err = 'يرجى إدخال رقم الطلب.';
      showToast(err, 'error');
      throw new Error(err);
    }

    if (isOrderNumberDuplicate(orderData.orderNumber, orders)) {
      const err = '⚠️ رقم الطلب هذا مستعمل من قبل، اختر رقماً آخر.';
      showToast(err, 'error');
      throw new Error(err);
    }

    const ordersCol = collection(db, 'orders');
    const newDocRef = doc(ordersCol);
    const now = Date.now();

    const rawOrderPayload = {
      ...orderData,
      storageLocation: orderData.storageLocation ?? '',
      notes: orderData.notes ?? '',
      actualExitDate: orderData.actualExitDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const newOrderPayload = cleanPayload(rawOrderPayload);

    try {
      await setDoc(newDocRef, newOrderPayload);
      showToast(`تم تسجيل الطلب رقم ${orderData.orderNumber} بنجاح!`, 'success');
      return newDocRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${newDocRef.id}`);
      
      // Fallback local update if network error
      const localOrder: LaundryOrder = {
        id: newDocRef.id,
        ...rawOrderPayload,
      };
      const updated = [localOrder, ...orders];
      setOrders(updated);
      saveToLocal(updated);
      showToast(`تم تسجيل الطلب محلياً رقم ${orderData.orderNumber}`, 'success');
      return newDocRef.id;
    }
  };

  // Update order details
  const updateOrder = async (id: string, orderData: Partial<LaundryOrder>): Promise<void> => {
    const orderRef = doc(db, 'orders', id);
    const payload = cleanPayload({
      ...orderData,
      updatedAt: Date.now(),
    });

    try {
      await updateDoc(orderRef, payload);
      showToast('تم تحديث بيانات الطلب بنجاح', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
      // Fallback local update
      const updated = orders.map((o) => (o.id === id ? { ...o, ...payload } : o));
      setOrders(updated);
      saveToLocal(updated);
      showToast('تم التحديث محلياً', 'success');
    }
  };

  // Change order status
  const updateOrderStatus = async (id: string, newStatus: OrderStatus): Promise<void> => {
    const orderRef = doc(db, 'orders', id);
    const payload: Record<string, any> = {
      status: newStatus,
      updatedAt: Date.now(),
    };

    if (newStatus === 'تم التسليم') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      payload.actualExitDate = `${year}-${month}-${day} ${hours}:${minutes}`;
    } else {
      payload.actualExitDate = null;
    }

    try {
      await updateDoc(orderRef, payload);
      showToast(`تم تغيير الحالة إلى: "${newStatus}"`, 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
      // Fallback local update
      const updated = orders.map((o) => (o.id === id ? { ...o, ...payload } : o));
      setOrders(updated);
      saveToLocal(updated);
      showToast(`تم تغيير الحالة محلياً إلى: "${newStatus}"`, 'info');
    }
  };

  // Quick mark as delivered
  const markAsDelivered = async (id: string): Promise<void> => {
    await updateOrderStatus(id, 'تم التسليم');
  };

  // Delete order (if required by worker)
  const deleteOrder = async (id: string): Promise<void> => {
    const orderRef = doc(db, 'orders', id);
    try {
      await deleteDoc(orderRef);
      showToast('تم حذف الطلب', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
      const updated = orders.filter((o) => o.id !== id);
      setOrders(updated);
      saveToLocal(updated);
      showToast('تم الحذف محلياً', 'info');
    }
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        isOnline,
        counters,
        addOrder,
        updateOrder,
        updateOrderStatus,
        markAsDelivered,
        deleteOrder,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

