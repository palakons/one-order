import {
  Shop,
  Batch,
  Order,
  BatchWithDetails,
  BatchStatus,
  Suggestion,
  StorageMetrics,
  SystemStatus,
  QuotaMetrics,
  FirebaseSeverity,
} from "./types";
import { getLocationById, DeliveryLocation, CAMPUS_LOCATIONS } from "./locations";
import { getBangkokDate, getDaysDifference } from "./utils";
import { isFirebaseConfigured, db } from "./firebase";
import { saveBase64ToStorage, deleteImageFromStorage } from "./storage";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface DatabaseSchema {
  shops: Shop[];
  batches: Batch[];
  orders: Order[];
  suggestions?: Suggestion[];
  locations?: DeliveryLocation[];
}

export interface StoredMetrics {
  readsToday: number;
  writesToday: number;
  deletesToday: number;
  lastResetPeriod: string;
  lastSuccessIso?: string;
  lastErrorIso?: string;
  lastErrorMessage?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __VEATEC_METRICS__: StoredMetrics | undefined;
}

export const MAX_DAILY_READS = 50000;
export const MAX_DAILY_WRITES = 20000;
export const MAX_DAILY_DELETES = 20000;

const SEED_DATA: DatabaseSchema = {
  shops: [
    {
      id: "shop-pa-tai",
      name: "ครัวป้าต่าย ป่ายุบใน",
      nameEn: "Krua Pa Tai (Payubnai - Wangchan)",
      cuisine: "อาหารตามสั่งพื้นบ้าน / ปลอดโฟมรักษ์ระยอง",
      description: "ร้านอาหารตามสั่งขวัญใจชุมชนป่ายุบใน ใกล้ VISTEC รสจัดจ้าน ให้เยอะ ร้านต้นแบบปลอดโฟมรักษ์ระยอง",
      phone: "089-245-8891",
      lineId: "patai_payubnai",
      gmapUrl: "https://maps.google.com/?q=ครัวป้าต่าย+ป่ายุบใน+วังจันทร์+ระยอง",
      promptpayNumber: "0892458891",
      promptpayAccountName: "ครัวป้าต่าย ป่ายุบใน",
      promptpayQrUrl: "https://promptpay.io/0892458891.png",
      menuImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:15",
      isActive: true,
      openDays: [1, 2, 3, 4, 5],
      menuItems: [],
    },
    {
      id: "shop-chao-rai",
      name: "ร้านอาหารชาวไร่ วังจันทร์",
      nameEn: "Chao Rai Restaurant (Wangchan 344)",
      cuisine: "อาหารไทย-จีน & อาหารป่าชื่อดังกว่า 30 ปี",
      description: "ร้านอาหารระดับตำนาน อ.วังจันทร์ ริมถนนสาย 344 แยกชุมแสง วัตถุดิบทะเลสด อาหารป่ารสจัด และหอยจ๊อปูเนื้อทะลัก",
      phone: "081-454-6374",
      lineId: "chaorai_wangchan",
      gmapUrl: "https://maps.google.com/?q=ร้านอาหารชาวไร่+วังจันทร์+ระยอง",
      promptpayNumber: "0814546374",
      promptpayAccountName: "ร้านอาหารชาวไร่ (Chao Rai Restaurant)",
      promptpayQrUrl: "https://promptpay.io/0814546374.png",
      menuImageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:20",
      isActive: true,
      openDays: [1, 2, 3, 4, 5],
      menuItems: [],
    },
    {
      id: "shop-krua-mangmee",
      name: "ครัวมั่งมี วังจันทร์ (กม.68)",
      nameEn: "Krua Mangmee (KM.68 Payubnai)",
      cuisine: "อาหารไทย-จีนโฮมเมด & ข้าวแห้งทะเล",
      description: "ร้านดังประจำ ต.ป่ายุบใน กม.68 เมนูขึ้นชื่อข้าวแห้งทะเล ปลาพิโรธรสจัดจ้าน และกระเพาะปลาผัดแห้งสูตรภัตตาคาร",
      phone: "087-137-9837",
      lineId: "mangmee_km68",
      gmapUrl: "https://maps.google.com/?q=ครัวมั่งมี+วังจันทร์+กม.68+ระยอง",
      promptpayNumber: "0871379837",
      promptpayAccountName: "ครัวมั่งมี โต๊ะจีน (Krua Mangmee)",
      promptpayQrUrl: "https://promptpay.io/0871379837.png",
      menuImageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:25",
      isActive: true,
      openDays: [1, 2, 3, 4, 5],
      menuItems: [],
    },
    {
      id: "shop-khun-som",
      name: "ครัวคุณส้ม สี่แยกป่ายุบใน",
      nameEn: "Krua Khun Som (Payubnai Junction)",
      cuisine: "ส้มตำ อาหารอีสาน & จานด่วนแซ่บ",
      description: "ร้านแซ่บติดรั้ววังจันทร์วัลเลย์ ณ สี่แยกป่ายุบใน เมนูส้มตำปลาร้านัว คอหมูย่างฉ่ำๆ ลาบหมูคั่ว และกะเพราเป็ดพะโล้",
      phone: "064-439-5163",
      lineId: "khunsom_payubnai",
      gmapUrl: "https://maps.google.com/?q=ครัวคุณส้ม+สี่แยกป่ายุบใน+ระยอง",
      promptpayNumber: "0644395163",
      promptpayAccountName: "ครัวคุณส้ม ป่ายุบใน (Khun Som)",
      promptpayQrUrl: "https://promptpay.io/0644395163.png",
      menuImageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:30",
      isActive: true,
      openDays: [1, 2, 3, 4, 5],
      menuItems: [],
    },
    {
      id: "shop-lins-tea",
      name: "Lin's Tea House & Eatery วังจันทร์",
      nameEn: "Lin's Tea House & Eatery (Wangchan)",
      cuisine: "ชา กาแฟสด & เบเกอรี่โฮมเมด",
      description: "คาเฟ่มินิมอลยอดนิยมของ อ.วังจันทร์ เมนูชาพรีเมียม กาแฟสดหอมกรุ่น และขนมปังโฮมเมด สดชื่นยามบ่าย",
      phone: "082-456-7890",
      lineId: "lins_teahouse",
      gmapUrl: "https://maps.google.com/?q=Lin's+Tea+House+Wangchan+Rayong",
      promptpayNumber: "0824567890",
      promptpayAccountName: "Lin's Tea House & Eatery",
      promptpayQrUrl: "https://promptpay.io/0824567890.png",
      menuImageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 150,
      defaultCutoffTime: "11:45",
      isActive: true,
      openDays: [1, 2, 3, 4, 5],
      menuItems: [],
    },
  ],
  batches: [],
  orders: [],
};

// -------------------------------------------------------------
// Firestore Helpers
// -------------------------------------------------------------
function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Timeout helper to ensure Firestore never hangs serverless function execution
async function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Firestore query timed out after ${ms}ms`));
    }, ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

// -------------------------------------------------------------
// Quota & Health Diagnostics Tracker
// -------------------------------------------------------------
let lastSystemSeverity: FirebaseSeverity = "normal";
let lastQuotaExhausted = false;
let lastErrorMessage: string | null = null;

function getPacificDateString(date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value || "";
    const m = parts.find((p) => p.type === "month")?.value || "";
    const d = parts.find((p) => p.type === "day")?.value || "";
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().split("T")[0];
  }
}

function calculateNextResetInfo(): { nextResetIso: string; timeUntilReset: string } {
  const now = new Date();
  const bkkFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = bkkFormatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "2026", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1", 10) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1", 10);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);

  let targetDay = day;
  if (hour >= 15) {
    targetDay += 1;
  }

  // 15:00 Bangkok (UTC+7) is 08:00 UTC
  const targetDate = new Date(Date.UTC(year, month, targetDay, 8, 0, 0));
  const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
  const hoursLeft = Math.floor(diffMs / 3600000);
  const minsLeft = Math.floor((diffMs % 3600000) / 60000);

  return {
    nextResetIso: targetDate.toISOString(),
    timeUntilReset: `${hoursLeft} ชม. ${minsLeft} นาที`,
  };
}

function getStoredMetrics(): StoredMetrics {
  const currentPeriod = getPacificDateString();
  if (!globalThis.__VEATEC_METRICS__ || globalThis.__VEATEC_METRICS__.lastResetPeriod !== currentPeriod) {
    globalThis.__VEATEC_METRICS__ = {
      readsToday: 0,
      writesToday: 0,
      deletesToday: 0,
      lastResetPeriod: currentPeriod,
    };
  }
  return globalThis.__VEATEC_METRICS__;
}

export function recordFirestoreOp(op: "read" | "write" | "delete", count = 1) {
  const m = getStoredMetrics();
  if (op === "read") m.readsToday += count;
  if (op === "write") m.writesToday += count;
  if (op === "delete") m.deletesToday += count;
  m.lastSuccessIso = new Date().toISOString();
}

export async function resetQuotaMetrics(): Promise<void> {
  const currentPeriod = getPacificDateString();
  globalThis.__VEATEC_METRICS__ = {
    readsToday: 0,
    writesToday: 0,
    deletesToday: 0,
    lastResetPeriod: currentPeriod,
    lastSuccessIso: new Date().toISOString(),
  };
}

export function onFirestoreSuccess() {
  if (lastQuotaExhausted) {
    lastQuotaExhausted = false;
    lastSystemSeverity = "normal";
    lastErrorMessage = null;
  }
}

export function recordFirestoreError(err: any) {
  const errMsg = String(err?.message || err || "");
  if (
    errMsg.includes("resource-exhausted") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("Quota exceeded")
  ) {
    lastSystemSeverity = "interrupted";
    lastQuotaExhausted = true;
  } else if (errMsg.includes("timed out") || errMsg.includes("timeout")) {
    lastSystemSeverity = "warning";
  }
  lastErrorMessage = errMsg;

  const m = getStoredMetrics();
  m.lastErrorIso = new Date().toISOString();
  m.lastErrorMessage = errMsg;
}

export async function getQuotaMetrics(): Promise<QuotaMetrics> {
  const stored = getStoredMetrics();
  const resetInfo = calculateNextResetInfo();

  const readsPercentage = Math.min(100, Number(((stored.readsToday / MAX_DAILY_READS) * 100).toFixed(2)));
  const writesPercentage = Math.min(100, Number(((stored.writesToday / MAX_DAILY_WRITES) * 100).toFixed(2)));
  const deletesPercentage = Math.min(100, Number(((stored.deletesToday / MAX_DAILY_DELETES) * 100).toFixed(2)));

  return {
    readsToday: stored.readsToday,
    writesToday: stored.writesToday,
    deletesToday: stored.deletesToday,
    maxDailyReads: MAX_DAILY_READS,
    maxDailyWrites: MAX_DAILY_WRITES,
    maxDailyDeletes: MAX_DAILY_DELETES,
    readsPercentage,
    writesPercentage,
    deletesPercentage,
    lastResetPeriod: stored.lastResetPeriod,
    nextResetIso: resetInfo.nextResetIso,
    timeUntilReset: resetInfo.timeUntilReset,
    lastSuccessIso: stored.lastSuccessIso,
    lastErrorIso: stored.lastErrorIso,
    lastErrorMessage: stored.lastErrorMessage,
  };
}

// -------------------------------------------------------------
// Cloud Storage & 30-Day Retention Management
// -------------------------------------------------------------
export async function getStorageMetrics(): Promise<StorageMetrics> {
  let totalBatches = 0;
  let totalOrders = 0;
  let totalShops = 0;
  let totalSuggestions = 0;
  let slipsCount = 0;
  let deliveryPhotosCount = 0;
  let estimatedImageStorageBytes = 0;
  let lastCleanupIso: string | undefined = undefined;
  let lastCleanupSummary: string | undefined = undefined;

  if (isFirebaseConfigured && db) {
    try {
      const [batchesSnap, ordersSnap, shopsSnap, suggsSnap, metaSnap, storageFilesSnap] = await Promise.all([
        trackedGetDocs(collection(db, "batches"), 3000).catch(() => ({ docs: [] } as any)),
        trackedGetDocs(collection(db, "orders"), 3000).catch(() => ({ docs: [] } as any)),
        trackedGetDocs(collection(db, "shops"), 2000).catch(() => ({ docs: [] } as any)),
        trackedGetDocs(collection(db, "suggestions"), 2000).catch(() => ({ docs: [] } as any)),
        trackedGetDoc(doc(db, "system", "storage_retention"), 2000).catch(() => ({ exists: () => false } as any)),
        trackedGetDocs(collection(db, "storage_files"), 3000).catch(() => ({ docs: [] } as any)),
      ]);

      totalBatches = batchesSnap.docs.length;
      totalOrders = ordersSnap.docs.length;
      totalShops = shopsSnap.docs.length;
      totalSuggestions = suggsSnap.docs.length;

      ordersSnap.docs.forEach((d: any) => {
        const o = d.data() as Order;
        if (o.slipImageUrl && o.slipImageUrl.length > 50 && o.slipImageUrl.startsWith("data:image/")) {
          slipsCount++;
          estimatedImageStorageBytes += Math.round(o.slipImageUrl.length * 0.75);
        }
      });

      batchesSnap.docs.forEach((d: any) => {
        const b = d.data() as Batch;
        if (b.deliveryPhotoUrl && b.deliveryPhotoUrl.length > 50 && b.deliveryPhotoUrl.startsWith("data:image/")) {
          deliveryPhotosCount++;
          estimatedImageStorageBytes += Math.round(b.deliveryPhotoUrl.length * 0.75);
        }
      });

      storageFilesSnap.docs.forEach((d: any) => {
        const sf = d.data();
        if (sf.category === "slips") slipsCount++;
        else if (sf.category === "delivery") deliveryPhotosCount++;
        estimatedImageStorageBytes += sf.sizeBytes || 45000;
      });

      if (metaSnap && typeof metaSnap.exists === "function" && metaSnap.exists()) {
        const meta = metaSnap.data();
        lastCleanupIso = meta?.lastCleanupIso;
        lastCleanupSummary = meta?.lastCleanupSummary;
      }
    } catch (err) {
      console.warn("getStorageMetrics warning:", err);
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const freeLimit = 1024 * 1024 * 1024; // 1 GiB free tier
  const usagePct = Number(((estimatedImageStorageBytes / freeLimit) * 100).toFixed(3));

  return {
    totalBatches,
    totalOrders,
    totalShops,
    totalSuggestions,
    slipsCount,
    deliveryPhotosCount,
    estimatedImageStorageBytes,
    estimatedImageStorageFormatted: formatSize(estimatedImageStorageBytes),
    retentionPolicyDays: 30,
    lastCleanupIso,
    lastCleanupSummary,
    firestoreFreeLimitBytes: freeLimit,
    storageUsagePercentage: usagePct,
  };
}

export async function runStorageCleanup(retentionDays = 30): Promise<{
  success: boolean;
  slipsPurged: number;
  photosPurged: number;
  batchesArchived: number;
  estimatedBytesFreed: number;
  message: string;
}> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      slipsPurged: 0,
      photosPurged: 0,
      batchesArchived: 0,
      estimatedBytesFreed: 0,
      message: "ไม่ได้ตั้งค่า Firebase",
    };
  }

  try {
    const [batchesSnap, ordersSnap] = await Promise.all([
      trackedGetDocs(collection(db, "batches"), 4000),
      trackedGetDocs(collection(db, "orders"), 4000),
    ]);

    const todayStr = getBangkokDate();
    let slipsPurged = 0;
    let photosPurged = 0;
    let batchesArchived = 0;
    let estimatedBytesFreed = 0;

    const updates: Promise<any>[] = [];

    // 1. Process Orders: strip slipImageUrl if older than retentionDays
    ordersSnap.docs.forEach((d: any) => {
      const o = d.data() as Order;
      const orderDateStr = o.createdAt ? o.createdAt.split("T")[0] : "";
      const diff = orderDateStr ? getDaysDifference(orderDateStr, todayStr) : 0;

      if (diff > retentionDays && o.slipImageUrl) {
        const bytes = Math.round(o.slipImageUrl.length * 0.75);
        estimatedBytesFreed += bytes;
        slipsPurged++;
        updates.push(
          trackedUpdateDoc(doc(db!, "orders", o.id), {
            slipImageUrl: "",
            slipPurgedAt: new Date().toISOString(),
          }).catch((err) => console.warn(`Failed to purge slip for order ${o.id}:`, err))
        );
      }
    });

    // 2. Process Batches: strip deliveryPhotoUrl and archive if older than retentionDays
    batchesSnap.docs.forEach((d: any) => {
      const b = d.data() as Batch;
      const batchDateStr = b.date || (b.createdAt ? b.createdAt.split("T")[0] : "");
      const diff = batchDateStr ? getDaysDifference(batchDateStr, todayStr) : 0;

      const needsArchive = diff > 7 && !b.isDeleted;
      const needsPhotoPurge = diff > retentionDays && Boolean(b.deliveryPhotoUrl);

      if (needsArchive || needsPhotoPurge) {
        const patch: Record<string, any> = {};
        if (needsArchive) {
          patch.isDeleted = true;
          patch.deletedAt = b.deletedAt || new Date().toISOString();
          batchesArchived++;
        }
        if (needsPhotoPurge && b.deliveryPhotoUrl) {
          const bytes = Math.round(b.deliveryPhotoUrl.length * 0.75);
          estimatedBytesFreed += bytes;
          photosPurged++;
          patch.deliveryPhotoUrl = "";
          patch.photoPurgedAt = new Date().toISOString();
        }
        updates.push(
          trackedUpdateDoc(doc(db!, "batches", b.id), patch).catch((err) =>
            console.warn(`Failed to update batch ${b.id}:`, err)
          )
        );
      }
    });

    // 3. Process storage_files collection: delete image binaries older than retentionDays
    try {
      const storageFilesSnap = await trackedGetDocs(collection(db!, "storage_files"), 3000).catch(() => ({ docs: [] } as any));
      storageFilesSnap.docs.forEach((d: any) => {
        const sf = d.data();
        const sfDateStr = sf.createdAt ? sf.createdAt.split("T")[0] : "";
        const diff = sfDateStr ? getDaysDifference(sfDateStr, todayStr) : 0;
        if (diff > retentionDays) {
          estimatedBytesFreed += sf.sizeBytes || 45000;
          if (sf.category === "slips") slipsPurged++;
          else if (sf.category === "delivery") photosPurged++;
          updates.push(
            trackedDeleteDoc(d.ref).catch((err) => console.warn(`Failed to delete storage_file ${d.id}:`, err))
          );
          if (sf.path) {
            deleteImageFromStorage(sf.path).catch(() => {});
          }
        }
      });
    } catch (e) {}

    await Promise.all(updates);

    const formatSize = (bytes: number) => {
      if (bytes === 0) return "0 B";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const summary = `ล้างสลิป ${slipsPurged} รายการ, รูปจัดส่ง ${photosPurged} รายการ, อาร์ไคฟ์ ${batchesArchived} รอบ (คืนพื้นที่ ~${formatSize(estimatedBytesFreed)})`;

    // Save retention metadata in Firestore
    await trackedSetDoc(
      doc(db, "system", "storage_retention"),
      {
        lastCleanupIso: new Date().toISOString(),
        lastCleanupSummary: summary,
        slipsPurged,
        photosPurged,
        batchesArchived,
        estimatedBytesFreed,
        retentionDays,
      },
      { merge: true }
    ).catch(() => {});

    invalidateStoreCache();

    return {
      success: true,
      slipsPurged,
      photosPurged,
      batchesArchived,
      estimatedBytesFreed,
      message: `ดำเนินการสำเร็จ: ${summary}`,
    };
  } catch (err: any) {
    return {
      success: false,
      slipsPurged: 0,
      photosPurged: 0,
      batchesArchived: 0,
      estimatedBytesFreed: 0,
      message: `เกิดข้อผิดพลาดในการล้างไฟล์: ${err?.message || String(err)}`,
    };
  }
}

let lastDailyCleanupDate = "";
function triggerDailyCleanupIfNeeded() {
  const today = getBangkokDate();
  if (lastDailyCleanupDate !== today) {
    lastDailyCleanupDate = today;
    runStorageCleanup(30).catch((err) => console.warn("Auto daily storage cleanup error:", err));
  }
}

// -------------------------------------------------------------
// Tracked Firestore Call Wrappers
// -------------------------------------------------------------
async function trackedGetDocs(q: any, timeoutMs = 2500) {
  try {
    const snap = await withTimeout(getDocs(q), timeoutMs);
    const readCount = Math.max(1, snap.docs.length);
    recordFirestoreOp("read", readCount);
    onFirestoreSuccess();
    return snap;
  } catch (err) {
    recordFirestoreError(err);
    throw err;
  }
}

async function trackedGetDoc(ref: any, timeoutMs = 2000) {
  try {
    const snap = await withTimeout(getDoc(ref), timeoutMs);
    recordFirestoreOp("read", 1);
    onFirestoreSuccess();
    return snap;
  } catch (err) {
    recordFirestoreError(err);
    throw err;
  }
}

async function trackedSetDoc(ref: any, data: any, options?: any, timeoutMs = 2500) {
  try {
    const result = options
      ? await withTimeout(setDoc(ref, data, options), timeoutMs)
      : await withTimeout(setDoc(ref, data), timeoutMs);
    recordFirestoreOp("write", 1);
    onFirestoreSuccess();
    return result;
  } catch (err) {
    recordFirestoreError(err);
    throw err;
  }
}

async function trackedUpdateDoc(ref: any, data: any, timeoutMs = 2500) {
  try {
    const result = await withTimeout(updateDoc(ref, data), timeoutMs);
    recordFirestoreOp("write", 1);
    onFirestoreSuccess();
    return result;
  } catch (err) {
    recordFirestoreError(err);
    throw err;
  }
}

async function trackedDeleteDoc(ref: any, timeoutMs = 2500) {
  try {
    const result = await withTimeout(deleteDoc(ref), timeoutMs);
    recordFirestoreOp("delete", 1);
    onFirestoreSuccess();
    return result;
  } catch (err) {
    recordFirestoreError(err);
    throw err;
  }
}

export async function resetSystemQuota(): Promise<SystemStatus> {
  lastSystemSeverity = "normal";
  lastQuotaExhausted = false;
  lastErrorMessage = null;
  return await getSystemStatus();
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const metrics = await getQuotaMetrics();
  const storageMetrics = await getStorageMetrics();

  return {
    firebaseConfigured: isFirebaseConfigured,
    severity: isFirebaseConfigured ? lastSystemSeverity : "normal",
    quotaExhausted: lastQuotaExhausted,
    fallbackMode: false,
    activeStorageEngine: "firestore",
    lastError: lastErrorMessage || undefined,
    resetTimeInfo: "ทุกวันเวลา 14:00 - 15:00 น. ICT (00:00 US Pacific Time)",
    metrics,
    storageMetrics,
  };
}

export async function checkFirestoreHealth(): Promise<SystemStatus> {
  if (!isFirebaseConfigured || !db) {
    return await getSystemStatus();
  }

  try {
    await trackedGetDocs(collection(db, "shops"), 2500);
    lastSystemSeverity = "normal";
    lastQuotaExhausted = false;
    lastErrorMessage = null;
    return await getSystemStatus();
  } catch (err: any) {
    recordFirestoreError(err);
    return await getSystemStatus();
  }
}

let hasAttemptedSeed = false;
export async function ensureFirestoreSeeded(): Promise<void> {
  if (!isFirebaseConfigured || !db || hasAttemptedSeed) return;
  const firestore = db;
  hasAttemptedSeed = true;
  try {
    const testSnap = await trackedGetDocs(collection(firestore, "shops"), 2000);
    if (testSnap.empty) {
      await Promise.all(
        SEED_DATA.shops.map((shop) =>
          trackedSetDoc(doc(firestore, "shops", shop.id), cleanForFirestore(shop), { merge: true }, 3000)
        )
      );
    }
  } catch (err) {
    console.warn("Firestore seed check warning:", err);
  }
}

// -------------------------------------------------------------
// In-Memory Short-TTL Cache & Deduplication
// -------------------------------------------------------------
let cachedBatches: { data: BatchWithDetails[]; timestamp: number } | null = null;
let cachedShops: { data: Shop[]; timestamp: number } | null = null;
const BATCHES_CACHE_TTL_MS = 10000; // 10 seconds deduplication
const SHOPS_CACHE_TTL_MS = 60000; // 60 seconds

export function invalidateStoreCache() {
  cachedBatches = null;
  cachedShops = null;
}

// -------------------------------------------------------------
// Public Data API (Google Cloud Firestore Single Source of Truth)
// -------------------------------------------------------------
export async function getShops(forceFresh = false): Promise<Shop[]> {
  if (!forceFresh && cachedShops && Date.now() - cachedShops.timestamp < SHOPS_CACHE_TTL_MS) {
    return cachedShops.data;
  }

  let result: Shop[] = [];
  if (isFirebaseConfigured && db) {
    try {
      const snap = await trackedGetDocs(collection(db, "shops"), 2000);
      if (!snap.empty) {
        result = snap.docs.map((d) => d.data() as Shop);
      }
    } catch (err) {
      console.warn("Firestore getShops failed:", err);
    }
  }

  if (result.length === 0) {
    result = SEED_DATA.shops;
  }

  cachedShops = { data: result, timestamp: Date.now() };
  return result;
}

export async function getShopById(id: string): Promise<Shop | undefined> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await trackedGetDoc(doc(db, "shops", id), 2000);
      if (snap.exists()) return snap.data() as Shop;
    } catch (err) {
      console.warn("Firestore getShopById failed:", err);
    }
  }

  return SEED_DATA.shops.find((s) => s.id === id);
}

export async function saveShop(shop: Shop): Promise<Shop> {
  invalidateStoreCache();

  // Offload any Base64 data URLs to dedicated storage URLs so no Base64 blobs are persisted
  const processedShop = { ...shop };
  if (processedShop.menuImageUrl && processedShop.menuImageUrl.startsWith("data:image/")) {
    try {
      const stored = await saveBase64ToStorage("shops", processedShop.menuImageUrl, `${processedShop.id}_menu.jpg`);
      processedShop.menuImageUrl = stored.url;
    } catch (e) {
      console.warn("Failed to offload shop menuImageUrl:", e);
    }
  }
  if (processedShop.lineQrUrl && processedShop.lineQrUrl.startsWith("data:image/")) {
    try {
      const stored = await saveBase64ToStorage("shops", processedShop.lineQrUrl, `${processedShop.id}_line_qr.jpg`);
      processedShop.lineQrUrl = stored.url;
    } catch (e) {
      console.warn("Failed to offload shop lineQrUrl:", e);
    }
  }
  if (processedShop.promptpayQrUrl && processedShop.promptpayQrUrl.startsWith("data:image/")) {
    try {
      const stored = await saveBase64ToStorage("shops", processedShop.promptpayQrUrl, `${processedShop.id}_pp_qr.jpg`);
      processedShop.promptpayQrUrl = stored.url;
    } catch (e) {
      console.warn("Failed to offload shop promptpayQrUrl:", e);
    }
  }

  if (isFirebaseConfigured && db) {
    await trackedSetDoc(doc(db, "shops", processedShop.id), cleanForFirestore(processedShop), { merge: true }, 2500);
    return processedShop;
  }
  throw new Error("Firestore is not configured. Cannot save shop.");
}

export async function deleteShop(id: string): Promise<boolean> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    await trackedDeleteDoc(doc(db, "shops", id), 2500);
    return true;
  }
  return false;
}

export async function getDeliveryLocations(): Promise<DeliveryLocation[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await trackedGetDocs(collection(db, "locations"), 2500);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as DeliveryLocation);
      }
    } catch (err) {
      console.warn("Firestore getDeliveryLocations failed:", err);
    }
  }
  return CAMPUS_LOCATIONS;
}

export async function saveDeliveryLocation(loc: DeliveryLocation): Promise<DeliveryLocation> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    await trackedSetDoc(doc(db, "locations", loc.id), cleanForFirestore(loc), { merge: true }, 2500);
    return loc;
  }
  throw new Error("Firestore is not configured. Cannot save location.");
}

export async function deleteDeliveryLocation(id: string): Promise<boolean> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    await trackedDeleteDoc(doc(db, "locations", id), 2500);
    return true;
  }
  return false;
}

export function sanitizeOrder(o: Order): Order {
  const phone = o.customerPhone || "";
  const digits = phone.replace(/\D/g, "");
  const maskedPhone =
    digits.length >= 9
      ? `${digits.slice(0, 3)}-***-${digits.slice(-4)}`
      : phone ? "***" : "";

  return {
    ...o,
    customerPhone: maskedPhone,
    slipImageUrl: "", // Never leak customer bank transfer slips in public listings
  };
}

export function sanitizeBatchDetails(batch: BatchWithDetails): BatchWithDetails {
  return {
    ...batch,
    orders: (batch.orders || []).map(sanitizeOrder),
  };
}

export async function getBatches(sanitize = true, forceFresh = false): Promise<BatchWithDetails[]> {
  if (!forceFresh && cachedBatches && Date.now() - cachedBatches.timestamp < BATCHES_CACHE_TTL_MS) {
    return sanitize ? cachedBatches.data.map(sanitizeBatchDetails) : cachedBatches.data;
  }

  triggerDailyCleanupIfNeeded();

  let result: BatchWithDetails[] = [];

  if (isFirebaseConfigured && db) {
    try {
      const [batchesSnap, ordersSnap, shopsSnap] = await Promise.all([
        trackedGetDocs(collection(db, "batches")),
        trackedGetDocs(collection(db, "orders")),
        trackedGetDocs(collection(db, "shops")),
      ]);

      if (!batchesSnap.empty) {
        const batches = batchesSnap.docs.map((d) => d.data() as Batch);
        const orders = ordersSnap.docs.map((d) => d.data() as Order);
        const shops = shopsSnap.docs.map((d) => d.data() as Shop);

        // Retention maintenance: mark batches older than 7 days as deleted in Firestore
        const todayStr = getBangkokDate();
        for (const b of batches) {
          const diff = getDaysDifference(b.date, todayStr);
          if (diff > 7 && !b.isDeleted) {
            b.isDeleted = true;
            b.deletedAt = new Date().toISOString();
            trackedUpdateDoc(doc(db, "batches", b.id), {
              isDeleted: true,
              deletedAt: b.deletedAt,
            }).catch((err) => console.warn("Failed to mark batch deleted in Firestore:", err));
          }
        }

        result = batches.map((b) =>
          enrichBatchFromData(b, shops, orders.filter((o) => o.batchId === b.id))
        );
      }
    } catch (err) {
      console.warn("Firestore getBatches failed:", err);
    }
  }

  cachedBatches = { data: result, timestamp: Date.now() };
  return sanitize ? result.map(sanitizeBatchDetails) : result;
}

export async function getBatchById(id: string, sanitize = false, forceFresh = false): Promise<BatchWithDetails | undefined> {
  if (!forceFresh && cachedBatches && Date.now() - cachedBatches.timestamp < BATCHES_CACHE_TTL_MS) {
    const found = cachedBatches.data.find((b) => b.id === id);
    if (found) {
      return sanitize ? sanitizeBatchDetails(found) : found;
    }
  }

  const allBatches = await getBatches(false, forceFresh);
  const found = allBatches.find((b) => b.id === id);
  if (found) {
    return sanitize ? sanitizeBatchDetails(found) : found;
  }

  // Fallback: If not found in allBatches (e.g. edge-case cache or pagination), try fetching document directly from Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docSnap = await trackedGetDoc(doc(db, "batches", id));
      if (docSnap.exists()) {
        const batchData = docSnap.data() as Batch;
        const [ordersSnap, shopsSnap] = await Promise.all([
          trackedGetDocs(collection(db, "orders")),
          trackedGetDocs(collection(db, "shops")),
        ]);
        const orders = ordersSnap.docs.map((d) => d.data() as Order).filter((o) => o.batchId === id);
        const shops = shopsSnap.docs.map((d) => d.data() as Shop);
        const enriched = enrichBatchFromData(batchData, shops, orders);
        return sanitize ? sanitizeBatchDetails(enriched) : enriched;
      }
    } catch (err) {
      console.warn("Direct Firestore getDoc fallback failed for batch:", id, err);
    }
  }

  return undefined;
}

function enrichBatchFromData(batch: Batch, shops: Shop[], orders: Order[]): BatchWithDetails {
  const rawShop = shops.find((s) => s.id === batch.shopId) || shops[0] || SEED_DATA.shops[0];
  
  // Clean shop object: NEVER allow Base64 data URLs inside batch JSON payloads
  const cleanShop: Shop = {
    ...rawShop,
    menuImageUrl: rawShop.menuImageUrl && rawShop.menuImageUrl.startsWith("data:image/") ? "" : rawShop.menuImageUrl,
    lineQrUrl: rawShop.lineQrUrl && rawShop.lineQrUrl.startsWith("data:image/") ? "" : rawShop.lineQrUrl,
    promptpayQrUrl: rawShop.promptpayQrUrl && rawShop.promptpayQrUrl.startsWith("data:image/") ? "" : rawShop.promptpayQrUrl,
  };

  const shop = cleanShop;
  const isDeleted = Boolean(batch.isDeleted || getDaysDifference(batch.date) > 7);

  // Auto-reconciliation: If batch has a delivery photo uploaded, it MUST be COMPLETED!
  const hasDeliveryPhoto = Boolean(batch.deliveryPhotoUrl || batch.deliveryPhotoPath);
  const reconciledStatus = hasDeliveryPhoto && batch.status !== "CANCELLED" ? "COMPLETED" : batch.status;

  if (isDeleted) {
    return {
      ...batch,
      status: reconciledStatus,
      isDeleted: true,
      deletedAt: batch.deletedAt || new Date().toISOString(),
      shop,
      orders: [],
      currentTotalAmount: 0,
      isMinMet: false,
      amountRemaining: batch.targetMinAmount,
      orderCount: 0,
      hostPhone: undefined,
      hostLineId: undefined,
      hostPin: undefined,
      notes: undefined,
    };
  }

  const currentTotalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const isMinMet = currentTotalAmount >= batch.targetMinAmount;
  const amountRemaining = Math.max(0, batch.targetMinAmount - currentTotalAmount);

  return {
    ...batch,
    status: reconciledStatus,
    shop,
    orders,
    currentTotalAmount,
    isMinMet,
    amountRemaining,
    orderCount: orders.length,
  };
}

export async function createBatch(batchData: {
  shopId: string;
  date: string;
  cutoffTime: string;
  targetMinAmount: number;
  notes?: string;
  hostLineId?: string;
  hostPhone?: string;
  hostName?: string;
  hostPin?: string;
  isSelfPickup?: boolean;
  buildingId?: string;
  buildingName?: string;
}): Promise<BatchWithDetails> {
  const id = `batch-${Date.now()}`;
  const newBatch: Batch = {
    id,
    shopId: batchData.shopId,
    date: batchData.date,
    cutoffTime: batchData.cutoffTime,
    targetMinAmount: batchData.targetMinAmount,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    notes: batchData.notes,
    hostLineId: batchData.hostLineId || undefined,
    hostPhone: batchData.hostPhone || undefined,
    hostName: batchData.hostName || undefined,
    hostPin: batchData.hostPin || undefined,
    isSelfPickup: Boolean(batchData.isSelfPickup),
    buildingId: batchData.buildingId || "loc-m4",
    buildingName: batchData.buildingName || "ตึก M4",
    boardAnnounced: false,
    deliveryBroadcastSent: false,
  };

  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    await trackedSetDoc(doc(db, "batches", id), cleanForFirestore(newBatch), undefined, 2500);
    const shops = await getShops();
    return enrichBatchFromData(newBatch, shops, []);
  }

  throw new Error("Firestore is not configured. Cannot create batch.");
}

export async function updateBatchStatus(
  batchId: string,
  status: BatchStatus,
  deliveryPhotoUrl?: string,
  extra?: {
    isSelfPickup?: boolean;
    sentToShopAt?: string;
    pendingMessage?: string;
    pendingCreatedAt?: string;
    isTest?: boolean;
    cancelReason?: string;
    cancelledAt?: string;
  }
): Promise<BatchWithDetails | undefined> {
  invalidateStoreCache();
  const updatePayload: Record<string, any> = { status };
  if (status === "CANCELLED") {
    updatePayload.cancelledAt = extra?.cancelledAt || new Date().toISOString();
    if (extra?.cancelReason !== undefined) {
      updatePayload.cancelReason = extra.cancelReason;
    }
  }
  if (extra?.isTest !== undefined) {
    updatePayload.isTest = Boolean(extra.isTest);
  }
  if (extra?.isSelfPickup !== undefined) {
    updatePayload.isSelfPickup = extra.isSelfPickup;
  }
  if (extra?.pendingMessage !== undefined) {
    updatePayload.pendingMessage = extra.pendingMessage;
    updatePayload.pendingCreatedAt = extra.pendingCreatedAt || new Date().toISOString();
  }
  if (extra?.sentToShopAt) {
    updatePayload.sentToShopAt = extra.sentToShopAt;
  } else if (status === "ORDERED") {
    updatePayload.sentToShopAt = new Date().toISOString();
  }
  if (deliveryPhotoUrl) {
    let finalPhotoUrl = deliveryPhotoUrl;
    let deliveryPhotoPath: string | undefined = undefined;
    if (deliveryPhotoUrl.startsWith("data:image/")) {
      try {
        const stored = await saveBase64ToStorage("delivery", deliveryPhotoUrl, `delivery_${batchId}.jpg`);
        finalPhotoUrl = stored.url;
        deliveryPhotoPath = stored.path;
      } catch (err) {
        console.warn("Failed to offload delivery photo to storage:", err);
      }
    }
    updatePayload.deliveryPhotoUrl = finalPhotoUrl;
    if (deliveryPhotoPath) {
      updatePayload.deliveryPhotoPath = deliveryPhotoPath;
    }
    updatePayload.deliveredAt = new Date().toISOString();
  } else if (status === "COMPLETED") {
    updatePayload.deliveredAt = new Date().toISOString();
  }

  if (isFirebaseConfigured && db) {
    await trackedUpdateDoc(doc(db, "batches", batchId), cleanForFirestore(updatePayload), 2500);
    return getBatchById(batchId);
  }

  throw new Error("Firestore is not configured. Cannot update batch.");
}

export async function updateBatch(
  batchId: string,
  fields: Partial<Batch>
): Promise<BatchWithDetails | undefined> {
  invalidateStoreCache();
  const payload = { ...fields };
  if (payload.deliveryPhotoUrl && payload.deliveryPhotoUrl.startsWith("data:image/")) {
    try {
      const stored = await saveBase64ToStorage("delivery", payload.deliveryPhotoUrl, `delivery_${batchId}.jpg`);
      payload.deliveryPhotoUrl = stored.url;
      payload.deliveryPhotoPath = stored.path;
    } catch (err) {
      console.warn("Failed to offload delivery photo in updateBatch:", err);
    }
  }
  if (isFirebaseConfigured && db) {
    await trackedUpdateDoc(doc(db, "batches", batchId), cleanForFirestore(payload), 2500);
    return getBatchById(batchId);
  }
  throw new Error("Firestore is not configured. Cannot update batch.");
}

export async function createOrder(input: {
  batchId: string;
  customerName: string;
  customerPhone?: string;
  customerLineId?: string;
  locationId: string;
  items: Array<{ id?: string; name: string; price: number; quantity: number; customNote?: string }>;
  totalAmount: number;
  slipImageUrl: string;
  slipTransRef?: string;
  slipBankCode?: string;
  slipBankName?: string;
  isSlipVerified?: boolean;
}): Promise<Order> {
  invalidateStoreCache();
  let existingOrders: Order[] = [];

  let slipImageUrl = input.slipImageUrl;
  let slipImagePath: string | undefined = undefined;

  // Offload base64 slip image to storage if applicable
  if (slipImageUrl && slipImageUrl.startsWith("data:image/")) {
    try {
      const stored = await saveBase64ToStorage("slips", slipImageUrl);
      slipImageUrl = stored.url;
      slipImagePath = stored.path;
    } catch (err) {
      console.warn("Failed to offload slip to storage:", err);
    }
  }

  if (isFirebaseConfigured && db) {
    try {
      const snap = await trackedGetDocs(collection(db, "orders"), 2000);
      existingOrders = snap.docs
        .map((d) => d.data() as Order)
        .filter((o) => o.batchId === input.batchId && !o.deletedAt);
    } catch (err) {
      console.warn("Firestore check existing orders failed:", err);
    }
  }

  const orderNumber = existingOrders.length + 1;
  const loc = getLocationById(input.locationId);
  const locCode = loc ? loc.shortCode : input.locationId;
  const itemsSummary = input.items.map((i) => i.name).join(" + ");
  const lineTag = input.customerLineId ? `@${input.customerLineId}` : input.customerName;
  const boxLabel = `#${String(orderNumber).padStart(2, "0")} ${lineTag} - ${locCode} [${itemsSummary}]`;

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    batchId: input.batchId,
    customerName: input.customerName,
    customerPhone: input.customerPhone || "",
    customerLineId: input.customerLineId || "",
    locationId: input.locationId,
    items: input.items.map((it, idx) => ({
      id: it.id || `item-${Date.now()}-${idx}`,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      customNote: it.customNote,
    })),
    totalAmount: input.totalAmount,
    slipImageUrl,
    slipImagePath,
    slipTransRef: input.slipTransRef,
    slipBankCode: input.slipBankCode,
    slipBankName: input.slipBankName,
    isSlipVerified: input.isSlipVerified ?? Boolean(slipImageUrl),
    createdAt: new Date().toISOString(),
    boxLabel,
  };

  if (isFirebaseConfigured && db) {
    await trackedSetDoc(doc(db, "orders", newOrder.id), cleanForFirestore(newOrder), undefined, 2500);
    return newOrder;
  }

  throw new Error("Firestore is not configured. Cannot create order.");
}

export async function deleteOrder(
  orderId: string,
  reason = "Cancelled by user/host",
  by = "Host"
): Promise<boolean> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    const orderRef = doc(db, "orders", orderId);
    const snap = await trackedGetDoc(orderRef, 2000);
    if (snap.exists()) {
      const orderData = snap.data() as Order;
      if (orderData.slipImagePath) {
        deleteImageFromStorage(orderData.slipImagePath).catch(() => {});
      }
      await trackedUpdateDoc(
        orderRef,
        {
          deletedAt: new Date().toISOString(),
          deletedReason: `${reason} (by ${by})`,
        },
        2500
      );
      return true;
    }
  }
  return false;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await trackedGetDocs(collection(db, "suggestions"), 2000);
      const list = snap.docs.map((d) => d.data() as Suggestion);
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn("Firestore getSuggestions failed:", err);
    }
  }
  return [];
}

export async function createSuggestion(input: {
  name?: string;
  contact?: string;
  category: "SHOP" | "BUG" | "SERVICE" | "OTHER";
  message: string;
}): Promise<Suggestion> {
  const newSuggestion: Suggestion = {
    id: `sug-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: input.name?.trim() || "Anonymous",
    contact: input.contact?.trim() || "",
    category: input.category || "OTHER",
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
    status: "NEW",
  };

  if (isFirebaseConfigured && db) {
    await trackedSetDoc(doc(db, "suggestions", newSuggestion.id), cleanForFirestore(newSuggestion), undefined, 2500);
    return newSuggestion;
  }

  throw new Error("Firestore is not configured. Cannot create suggestion.");
}

export async function deleteSuggestion(id: string): Promise<boolean> {
  if (isFirebaseConfigured && db) {
    await trackedDeleteDoc(doc(db, "suggestions", id), 2500);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// LINE Group Configuration Management
// -------------------------------------------------------------
export async function getActiveLineGroupIds(): Promise<string[]> {
  const groups = new Set<string>();
  if (process.env.LINE_GROUP_ID) {
    groups.add(process.env.LINE_GROUP_ID.trim());
  }

  if (isFirebaseConfigured && db) {
    try {
      const snap = await trackedGetDoc(doc(db, "system", "line_config"), 2000);
      if (snap.exists()) {
        const data = snap.data() as any;
        if (Array.isArray(data?.groupIds)) {
          data.groupIds.forEach((id: string) => {
            if (typeof id === "string" && id.trim()) groups.add(id.trim());
          });
        }
        if (typeof data?.activeGroupId === "string" && data.activeGroupId.trim()) {
          groups.add(data.activeGroupId.trim());
        }
      }
    } catch (err) {
      console.warn("Firestore getActiveLineGroupIds failed:", err);
    }
  }

  return Array.from(groups);
}

export async function saveActiveLineGroupId(groupId: string): Promise<void> {
  const cleanId = (groupId || "").trim();
  if (!cleanId || (!cleanId.startsWith("C") && !cleanId.startsWith("R"))) return;

  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "system", "line_config");
      const snap = await trackedGetDoc(ref, 2000);
      const existing: string[] = snap.exists() ? ((snap.data() as any)?.groupIds || []) : [];
      const updated = Array.from(new Set([...existing, cleanId]));
      await trackedSetDoc(
        ref,
        {
          activeGroupId: cleanId,
          groupIds: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
        2500
      );
    } catch (err) {
      console.warn("Firestore saveActiveLineGroupId failed:", err);
    }
  }
}

export async function removeActiveLineGroupId(groupId: string): Promise<void> {
  const cleanId = (groupId || "").trim();
  if (!cleanId) return;

  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, "system", "line_config");
      const snap = await trackedGetDoc(ref, 2000);
      const existing: string[] = snap.exists() ? ((snap.data() as any)?.groupIds || []) : [];
      const updated = existing.filter((id) => id !== cleanId);
      await trackedSetDoc(
        ref,
        {
          activeGroupId: updated[0] || "",
          groupIds: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
        2500
      );
    } catch (err) {
      console.warn("Firestore removeActiveLineGroupId failed:", err);
    }
  }
}
