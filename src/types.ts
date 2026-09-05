export type OrderStatus = 'في الغسيل' | 'جاهز' | 'تم التسليم';

export type UserRole = 'shop' | 'laundry';

export interface OrderItem {
  type: string;
  count: number;
}

export interface LaundryOrder {
  id: string;
  orderNumber: number; // 0 - 10000 (sequential, resets from 10000 to 0)
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  itemType: string; // Summary string e.g. "كوفيرطة (10) + فراش (5)" or single type
  itemCount: number; // Total count across all item types
  items?: OrderItem[]; // Itemized list of bedding types with independent quantities
  entryDate: string; // YYYY-MM-DD
  expectedExitDate: string; // YYYY-MM-DD
  actualExitDate?: string | null; // e.g. 2026-08-17 14:30
  status: OrderStatus;
  notes?: string;
  storageLocation?: string; // e.g. "الرف العلوي 1", "سدة اليمين"
  smsSent?: boolean; // True if ready SMS was dispatched to customer
  smsSentAt?: number | null; // Timestamp (ms) of SMS delivery
  smsMessage?: string; // Content of SMS sent
  smsMessageId?: string; // Message ID or Native dispatch ref
  smsError?: string | null; // Error reason if SMS dispatch failed
  smsLastError?: string | null; // Error reason if SMS dispatch failed
  smsLastAttemptAt?: number | null; // Timestamp (ms) of last SMS attempt
  smsSimUsed?: string; // e.g. 'SIM 1', 'SIM 2', 'Default'
  createdAt: number;
  updatedAt: number;
}

export type SimSlotPreference = 'default' | 'sim1' | 'sim2';

export interface SimCardInfo {
  slotIndex: number;
  displayName: string;
  carrierName: string;
  subscriptionId: number;
}

export type ScreenType = 'role-select' | 'home' | 'add' | 'search' | 'ready' | 'all' | 'details' | 'laundry-station' | 'settings';

export interface OrderCounters {
  inWashing: number;
  ready: number;
  delivered: number;
  totalActive: number;
  totalAll: number;
}

export interface PresetItem {
  id: string;
  name: string;
  iconName: string;
}
