export interface MenuItem {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  category?: string;
  popular?: boolean;
  isAvailable?: boolean; // If false, dish is disabled/hidden from suggestion, autocomplete, and ordering
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
  promptpayNumber?: string;
  promptpayAccountName?: string;
  promptpayQrUrl?: string; // QR code image URL (primary payment display)
  menuImageUrl?: string;
  accentColor?: string; // Dominant / average logo color for card accents
  minDeliveryAmount: number; // default 200 THB
  defaultCutoffTime: string; // e.g. "11:15"
  isActive?: boolean; // Active toggle (defaults to true)
  openDays?: number[]; // [0, 1, 2, 3, 4, 5, 6] (0 = Sun, 1 = Mon, ..., 6 = Sat)
  googlePlaceId?: string; // Google Places ID (cached)
  googleOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    nextCloseTime?: string;
  };
  googleLastSyncedDate?: string; // YYYY-MM-DD
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
  slipImagePath?: string; // Stored path e.g. "slips/slip_123.jpg"
  slipTransRef?: string; // Unique transaction ref from slip QR (Anti-duplicate)
  slipBankCode?: string; // Bank code e.g. 014 (SCB)
  slipBankName?: string; // Bank name e.g. SCB (ไทยพาณิชย์)
  isSlipVerified?: boolean; // True if BOT slip QR was verified
  createdAt: string;
  boxLabel: string; // e.g. "#01 Golf - กะเพราหมูกรอบ"
  deletedAt?: string; // For trace/soft-delete
  deletedReason?: string; // Reason if cancelled by host
}

export type BatchStatus = "OPEN" | "LOCKED" | "CLOSED" | "ORDERED" | "DELIVERING" | "PENDING" | "COMPLETED" | "CANCELLED";

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
  hostPin?: string; // 4-digit PIN for host authorization (close/submit)
  isSelfPickup?: boolean; // True if party leader opted to pick up at shop directly
  buildingId?: string; // Specific building ID (e.g. "loc-m4")
  buildingName?: string; // Specific building name (e.g. "ตึก M4")
  sentToShopAt?: string; // ISO string when Host clicked "Send to Shop"
  pendingMessage?: string; // Alert message crafted by leader/AI e.g. food delayed or shop closed
  pendingCreatedAt?: string; // ISO string when pending message was posted
  notes?: string;
  deliveryPhotoUrl?: string; // Shop drop-off photo evidence on campus desk
  deliveryPhotoPath?: string; // Stored path e.g. "delivery/delivery_123.jpg"
  deliveredAt?: string; // ISO string when food was placed at campus desks
  isDeleted?: boolean; // Purged after 7 days (privacy/retention)
  deletedAt?: string; // ISO timestamp when marked deleted
  hostLineUserId?: string; // LINE User ID (U...) of leader for 1-to-1 bot push
  cutoffReminderSent?: boolean; // True if cutoff time reminder was pushed
  cutoffReminderSentAt?: string; // ISO timestamp when cutoff reminder was pushed
  boardAnnounced?: boolean; // True if new board announcement was pushed to LINE group
  boardAnnouncedAt?: string;
  deliveryBroadcastSent?: boolean; // True if food delivered announcement was pushed to LINE group
  deliveryBroadcastSentAt?: string;
  isTest?: boolean; // When true, marked as "For Testing" — excluded from statistics, spending, and broadcast notifications
  cancelledAt?: string; // ISO string when batch was cancelled
  cancelReason?: string; // Reason for cancelling the party/board
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

export type FirebaseSeverity = "normal" | "warning" | "interrupted";

export interface QuotaMetrics {
  readsToday: number;
  writesToday: number;
  deletesToday: number;
  maxDailyReads: number;
  maxDailyWrites: number;
  maxDailyDeletes: number;
  readsPercentage: number;
  writesPercentage: number;
  deletesPercentage: number;
  lastResetPeriod: string;
  nextResetIso: string;
  timeUntilReset: string;
  lastSuccessIso?: string;
  lastErrorIso?: string;
  lastErrorMessage?: string;
}

export interface StorageMetrics {
  totalBatches: number;
  totalOrders: number;
  totalShops: number;
  totalSuggestions: number;
  slipsCount: number;
  deliveryPhotosCount: number;
  estimatedImageStorageBytes: number;
  estimatedImageStorageFormatted: string;
  retentionPolicyDays: number;
  lastCleanupIso?: string;
  lastCleanupSummary?: string;
  firestoreFreeLimitBytes: number;
  storageUsagePercentage: number;
}

export interface SystemStatus {
  firebaseConfigured: boolean;
  severity: FirebaseSeverity;
  quotaExhausted: boolean;
  fallbackMode: boolean;
  activeStorageEngine: "firestore";
  lastError?: string;
  resetTimeInfo: string;
  metrics: QuotaMetrics;
  storageMetrics: StorageMetrics;
}

export interface SanitizedMenuItem {
  id: string; // e.g. shopId + "___" + encodeURIComponent(originalName)
  shopId: string;
  shopName: string;
  originalName: string;
  sanitizedName: string;
  amount: number; // accumulated order count
  hasTypo: boolean;
  source: "thaillm" | "manual";
  updatedAt: string;
}

export interface AutocompleteMenuItem {
  id: string;
  name: string; // Sanitized menu name by ThaiLLM
  originalName: string;
  price: number;
  orderCount: number;
  totalQuantity: number;
  shopId: string;
  shopName: string;
  hasTypoCorrected?: boolean;
  isShopMenu?: boolean;
}


