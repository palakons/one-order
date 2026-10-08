export interface MenuItem {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  category?: string;
  popular?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  nameEn?: string;
  cuisine: string;
  description: string;
  phone: string;
  lineId?: string;
  promptpayNumber: string;
  promptpayAccountName: string;
  promptpayQrUrl?: string;
  menuImageUrl?: string;
  minDeliveryAmount: number; // default 200 THB
  defaultCutoffTime: string; // e.g. "11:15"
  menuItems: MenuItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customNote?: string;
}

export interface Order {
  id: string;
  orderNumber: number; // 1, 2, 3...
  batchId: string;
  customerName: string;
  customerPhone: string;
  locationId: string; // loc-v, loc-m1, etc.
  items: OrderItem[];
  totalAmount: number;
  slipImageUrl: string;
  createdAt: string;
  boxLabel: string; // e.g. "#01 Somchai (M2) - ข้าวกะเพราหมูกรอบ"
}

export type BatchStatus = "OPEN" | "LOCKED" | "DELIVERING" | "COMPLETED" | "CANCELLED";

export interface Batch {
  id: string;
  shopId: string;
  date: string;
  cutoffTime: string; // e.g. "11:15"
  targetMinAmount: number; // e.g. 200 THB
  status: BatchStatus;
  createdAt: string;
  notes?: string;
}

export interface BatchWithDetails extends Batch {
  shop: Shop;
  orders: Order[];
  currentTotalAmount: number;
  isMinMet: boolean;
  amountRemaining: number;
  orderCount: number;
}
