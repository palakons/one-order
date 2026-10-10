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
  gmapUrl?: string; // Google Maps link for the restaurant
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
  customerName: string; // Display Name / Nickname / LINE Name
  customerPhone: string;
  customerLineId?: string; // LINE handle or LINE ID for notifications
  locationId: string; // e.g. loc-v (Desk Table M4)
  items: OrderItem[];
  totalAmount: number;
  slipImageUrl: string;
  slipTransRef?: string; // Unique transaction ref from slip QR (Anti-duplicate)
  slipBankCode?: string; // Bank code e.g. 014 (SCB)
  slipBankName?: string; // Bank name e.g. SCB (ไทยพาณิชย์)
  isSlipVerified?: boolean; // True if BOT slip QR was verified
  createdAt: string;
  boxLabel: string; // e.g. "#01 Golf - กะเพราหมูกรอบ"
  deletedAt?: string; // For trace/soft-delete
  deletedReason?: string; // Reason if cancelled by host
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
  hostLineId?: string; // Host / Open party initiator LINE ID
  hostPhone?: string; // Host / Leader phone number (for issues)
  hostName?: string; // Host / Leader display name
  buildingId?: string; // Specific building ID (e.g. "loc-m4")
  buildingName?: string; // Specific building name (e.g. "ตึก M4")
  sentToShopAt?: string; // ISO string when Host clicked "Send to Shop"
  notes?: string;
  deliveryPhotoUrl?: string; // Shop drop-off photo evidence on campus desk
  deliveredAt?: string; // ISO string when food was placed at campus desks
}

export interface BatchWithDetails extends Batch {
  shop: Shop;
  orders: Order[];
  currentTotalAmount: number;
  isMinMet: boolean;
  amountRemaining: number;
  orderCount: number;
}

export interface Suggestion {
  id: string;
  name?: string;
  contact?: string;
  category: "SHOP" | "BUG" | "SERVICE" | "OTHER";
  message: string;
  createdAt: string;
  status?: "NEW" | "REVIEWED" | "RESOLVED";
}

