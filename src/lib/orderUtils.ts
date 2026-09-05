import { LaundryOrder, OrderItem, OrderStatus } from '../types';

/**
 * Format itemized order items into a clean summary string
 */
export function formatOrderItemsSummary(items?: OrderItem[], fallbackType?: string): string {
  if (items && items.length > 0) {
    return items.map((i) => `${i.type} (${i.count})`).join(' + ');
  }
  return fallbackType || '';
}

/**
 * Compute total count of items across all selected types
 */
export function getTotalItemsCount(items?: OrderItem[], fallbackCount?: number): number {
  if (items && items.length > 0) {
    return items.reduce((sum, i) => sum + (Number(i.count) || 0), 0);
  }
  return fallbackCount || 1;
}

/**
 * Checks if an order number is already used in the existing orders collection
 */
export function isOrderNumberDuplicate(
  orderNumber: number | string,
  orders: LaundryOrder[],
  excludeOrderId?: string
): boolean {
  if (orderNumber === undefined || orderNumber === null || orderNumber === '') return false;
  
  const targetStr = String(orderNumber).trim();
  const targetNum = Number(targetStr);

  return (orders || []).some((o) => {
    if (excludeOrderId && o.id === excludeOrderId) return false;
    
    // Check match as string or number
    if (String(o.orderNumber).trim() === targetStr) return true;
    if (!isNaN(targetNum) && Number(o.orderNumber) === targetNum) return true;
    
    return false;
  });
}

/**
 * Validate a manually entered order number
 */
export function validateManualOrderNumber(
  rawNumber: string | number,
  orders: LaundryOrder[],
  excludeOrderId?: string
): { isValid: boolean; error?: string; cleanNumber?: number } {
  const str = String(rawNumber ?? '').trim();
  
  if (!str) {
    return { isValid: false, error: 'يرجى إدخال رقم الطلب.' };
  }

  const num = Number(str);
  if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return { isValid: false, error: 'يجب أن يكون رقم الطلب رقماً صحيحاً موجباً (مثال: 1, 25, 1250).' };
  }

  if (isOrderNumberDuplicate(num, orders, excludeOrderId)) {
    return { isValid: false, error: '⚠️ رقم الطلب هذا مستعمل من قبل، اختر رقماً آخر.' };
  }

  return { isValid: true, cleanNumber: num };
}

/**
 * Common laundry item presets in Algerian Arabic
 */
export const PRESET_ITEMS = [
  { id: 'blanket_single', name: 'كوفيرطة (بطانية مفردة)', icon: 'Sparkles' },
  { id: 'blanket_double', name: 'كوفيرطة دوبل (كبيرة)', icon: 'Layers' },
  { id: 'bedding_set', name: 'فراش / كوفرولي', icon: 'Bed' },
  { id: 'carpet', name: 'زربية / تابي', icon: 'Grid' },
  { id: 'duvet', name: 'لحاف / دراوات', icon: 'Wind' },
  { id: 'pillows', name: 'وسائد / مخاد', icon: 'Package' },
  { id: 'burnous', name: 'برنوس / قش صوف', icon: 'Shirt' },
  { id: 'curtains', name: 'ستائر / ريدوات', icon: 'Columns' },
];

export const STORAGE_LOCATIONS = [
  'الرف العلوي 1 (يمين)',
  'الرف العلوي 2 (وسط)',
  'الرف العلوي 3 (يسار)',
  'السدة - قسم البطانيات',
  'السدة - قسم الزرابي',
  'طاولة التسليم السريع',
];

/**
 * Format date in Algerian readable format
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
}

/**
 * Format timestamp into Arabic time string (e.g. 14:30 - 2026/08/17)
 */
export function formatDateTime(timestamp: number | string | null | undefined): string {
  if (!timestamp) return '-';
  try {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  } catch {
    return String(timestamp);
  }
}

/**
 * Get current date as YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to a YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate Algerian mobile phone number.
 * Supported prefixes: 05 (Ooredoo), 06 (Mobilis), 07 (Djezzy).
 * Also accepts international formats (+213 5/6/7, 00213 5/6/7, 213 5/6/7).
 */
export function validateAlgerianPhone(rawPhone: string | null | undefined): {
  isValid: boolean;
  error?: string;
  cleanLocal?: string; // e.g. 0550123456
  international?: string; // e.g. +213550123456
} {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return { isValid: false, error: '⚠️ لا يوجد رقم هاتف لهذا الزبون.' };
  }

  // Remove whitespace, dashes, slashes, dots, parentheses
  let cleaned = rawPhone.replace(/[\s\-\/\.\(\)]/g, '').trim();

  // Handle leading + or 00
  if (cleaned.startsWith('00213')) {
    cleaned = cleaned.substring(5);
  } else if (cleaned.startsWith('+213')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('213') && cleaned.length === 12) {
    cleaned = cleaned.substring(3);
  }

  // If now it starts with 5, 6, 7 and has 9 digits, prepend '0' for local format
  if (/^[567]\d{8}$/.test(cleaned)) {
    cleaned = '0' + cleaned;
  }

  // Must be 10 digits starting with 05, 06, or 07
  const isAlgerianMobile = /^0[567]\d{8}$/.test(cleaned);

  if (!isAlgerianMobile) {
    return {
      isValid: false,
      error: 'رقم هاتف الزبون غير صالح.',
    };
  }

  const international = '+213' + cleaned.substring(1);

  return {
    isValid: true,
    cleanLocal: cleaned,
    international: international,
  };
}

/**
 * Builds the standard Algerian SMS message for order ready notification
 */
export function buildOrderReadySmsMessage(orderNumber: number | string): string {
  return `السلام عليكم، طلبكم رقم ${orderNumber} راه واجد وتقدروا تجيو تستلموه. شكراً لثقتكم.`;
}

