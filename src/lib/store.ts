import fs from "fs/promises";
import path from "path";
import { Shop, Batch, Order, BatchWithDetails, BatchStatus, Suggestion } from "./types";
import { getLocationById, DeliveryLocation, CAMPUS_LOCATIONS } from "./locations";
import { getBangkokDate, getDaysDifference } from "./utils";
import { isFirebaseConfigured, db } from "./firebase";
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
  var __VEATEC_MEMORY_DB__: DatabaseSchema | undefined;
  // eslint-disable-next-line no-var
  var __VEATEC_METRICS__: StoredMetrics | undefined;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? "/tmp" : path.join(process.cwd(), "src", "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const METRICS_FILE = path.join(DATA_DIR, "metrics.json");

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
      menuItems: [
        { id: "pt1", name: "ข้าวกะเพราหมูกรอบคั่วพริกแห้ง", nameEn: "Crispy Pork Holy Basil Rice", price: 60, popular: true },
        { id: "pt2", name: "ข้าวหมูกระเทียมพริกไทยสด", nameEn: "Garlic Pepper Pork with Rice", price: 55, popular: true },
        { id: "pt3", name: "ข้าวผัดพริกแกงหมูป่าหน่อไม้ดอง", nameEn: "Wild Boar Red Curry Paste Rice", price: 65, popular: true },
        { id: "pt4", name: "ข้าวกะเพราไก่บ้านรสเด็ด", nameEn: "Free-range Chicken Holy Basil Rice", price: 60, popular: false },
        { id: "pt5", name: "ข้าวผัดโบราณหมูนุ่ม", nameEn: "Traditional Thai Pork Fried Rice", price: 50, popular: false },
        { id: "pt6", name: "ข้าวไข่เจียวหมูสับฟูกรอบ", nameEn: "Minced Pork Omelette Rice", price: 45, popular: false },
        { id: "pt7", name: "ต้มยำไก่บ้านน้ำใส (กับข้าว)", nameEn: "Clear Spicy Chicken Soup (Tom Yum)", price: 80, popular: true },
        { id: "pt8", name: "ผัดซีอิ๊วหมูเส้นใหญ่", nameEn: "Stir-fried Wide Rice Noodles (Pad See Ew)", price: 55, popular: false },
        { id: "pt9", name: "ไข่ดาวฟูกรอบ", nameEn: "Crispy Fried Egg (Add-on)", price: 10, popular: true },
      ],
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
      menuItems: [
        { id: "cr1", name: "หอยจ๊อปูทอดกรอบเนื้อแน่น (จาน 5 ลูก)", nameEn: "Crispy Crab Meat Rolls (Hoi Jor)", price: 120, popular: true },
        { id: "cr2", name: "ข้าวผัดเนื้อปูแกะสด", nameEn: "Fresh Crab Fried Rice", price: 70, popular: true },
        { id: "cr3", name: "ข้าวราดเนื้อปูผัดผงกะหรี่", nameEn: "Stir-fried Crab in Yellow Curry with Rice", price: 80, popular: true },
        { id: "cr4", name: "ข้าวหมูป่าผัดเผ็ดเครื่องแกงชาวไร่", nameEn: "Spicy Wild Boar Curry Paste Rice", price: 70, popular: true },
        { id: "cr5", name: "แกงป่าปลาเห็ดโคนราดข้าว", nameEn: "Spicy Jungle Curry Fish with Rice", price: 75, popular: false },
        { id: "cr6", name: "แฮ่กึ้นกุ้งทอดสูตรชาวไร่ (จานเดี่ยว)", nameEn: "Crispy Deep-fried Shrimp Cakes", price: 90, popular: true },
        { id: "cr7", name: "ข้าวออส่วนหอยนางรมราดข้าว", nameEn: "Stir-fried Oysters with Egg on Rice", price: 85, popular: false },
        { id: "cr8", name: "ข้าวไข่เจียวเนื้อปูฟูกรอบ", nameEn: "Fluffy Crab Omelette Rice", price: 70, popular: true },
      ],
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
      menuItems: [
        { id: "mm1", name: "ข้าวแห้งทะเลทรงเครื่อง (Signature)", nameEn: "Signature Dry Seafood Rice Bowl", price: 70, popular: true },
        { id: "mm2", name: "ข้าวราดปลาพิโรธผัดฉ่าสูตรเด็ด", nameEn: "Fiery Stir-fried Spicy Fish with Rice", price: 70, popular: true },
        { id: "mm3", name: "กระเพาะปลาผัดแห้งเนื้อปู", nameEn: "Stir-fried Fish Maw with Crab Meat", price: 80, popular: true },
        { id: "mm4", name: "สุกี้โบราณแห้งทะเลรวมมิตร", nameEn: "Traditional Dry Seafood Suki", price: 65, popular: false },
        { id: "mm5", name: "ข้าวผัดกุ้งสดเนื้อเด้ง", nameEn: "Fresh Shrimp Fried Rice", price: 60, popular: false },
        { id: "mm6", name: "ทอดมันกุ้งกรอบ (4 ชิ้น)", nameEn: "Crispy Shrimp Cakes (4 pcs)", price: 80, popular: true },
        { id: "mm7", name: "ต้มยำรวมมิตรทะเลน้ำข้น (กับข้าว)", nameEn: "Creamy Tom Yum Seafood Soup", price: 90, popular: true },
        { id: "mm8", name: "ข้าวไข่ตุ๋นทะเลทรงเครื่อง", nameEn: "Steamed Egg with Seafood on Rice", price: 60, popular: false },
      ],
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
      menuItems: [
        { id: "ks1", name: "ส้มตำไทยไข่เค็ม", nameEn: "Thai Papaya Salad with Salted Egg", price: 55, popular: true },
        { id: "ks2", name: "ส้มตำปูปลาร้านัวแซ่บ", nameEn: "Spicy Papaya Salad with Fermented Fish", price: 50, popular: true },
        { id: "ks3", name: "คอหมูย่างเตาถ่านน้ำจิ้มแจ่ว (จานเดี่ยว)", nameEn: "Grilled Pork Neck with Jaew Sauce", price: 80, popular: true },
        { id: "ks4", name: "ลาบหมูคั่วข้าวคั่วหอมมะนาวแท้", nameEn: "Spicy Minced Pork Salad (Larb)", price: 65, popular: false },
        { id: "ks5", name: "ข้าวกะเพราเป็ดพะโล้ผัดกะเพรากรอบ", nameEn: "Stewed Duck Holy Basil Rice", price: 65, popular: true },
        { id: "ks6", name: "ข้าวผัดต้มยำทะเลแซ่บ", nameEn: "Spicy Tom Yum Seafood Fried Rice", price: 65, popular: false },
        { id: "ks7", name: "ต้มแซ่บกระดูกหมูอ่อน (กับข้าว)", nameEn: "Spicy Pork Rib Soup", price: 80, popular: true },
        { id: "ks8", name: "ข้าวเหนียวนุ่มร้อนๆ", nameEn: "Steamed Sticky Rice", price: 10, popular: true },
      ],
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
      menuItems: [
        { id: "lt1", name: "ชาไทยพรีเมียมเย็น (สูตรเข้มข้น หวานน้อย)", nameEn: "Signature Thai Iced Tea", price: 50, popular: true },
        { id: "lt2", name: "Iced Americano Special Blend (คั่วกลาง)", nameEn: "Iced Americano Medium Roast", price: 55, popular: true },
        { id: "lt3", name: "Uji Matcha Latte (มัทฉะอุจิแท้จากญี่ปุ่น)", nameEn: "Authentic Uji Matcha Latte", price: 65, popular: true },
        { id: "lt4", name: "Iced Yuzu Americano (ส้มยูสุแท้)", nameEn: "Iced Yuzu Americano", price: 70, popular: true },
        { id: "lt5", name: "ชาพีชเลมอนสดชื่น (Peach Lemon Iced Tea)", nameEn: "Refreshing Peach Lemon Tea", price: 55, popular: false },
        { id: "lt6", name: "ขนมปังปิ้งเนยนมฮอกไกโด", nameEn: "Hokkaido Butter Milk Toast", price: 35, popular: false },
        { id: "lt7", name: "ครัวซองต์เนยสดฝรั่งเศส", nameEn: "French Butter Croissant", price: 65, popular: true },
      ],
    },
  ],
  batches: [
    {
      id: "batch-today-01",
      shopId: "shop-pa-tai",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:15",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-02",
      shopId: "shop-chao-rai",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:20",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 3000000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-03",
      shopId: "shop-krua-mangmee",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:25",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 2400000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-04",
      shopId: "shop-khun-som",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:30",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-05",
      shopId: "shop-lins-tea",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:45",
      targetMinAmount: 150,
      status: "OPEN",
      createdAt: new Date(Date.now() - 1200000).toISOString(),
      notes: "รอบส่งเครื่องดื่มและกาแฟ ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-closed",
      shopId: "shop-chao-rai",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "09:30",
      targetMinAmount: 200,
      status: "ORDERED",
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      sentToShopAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      notes: "รอบเช้าพิเศษ ปิดรอบส่งร้านเรียบร้อย",
      buildingId: "loc-m4",
      buildingName: "ตึก M4",
    },
    {
      id: "batch-archived-01",
      shopId: "shop-krua-mangmee",
      date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
      cutoffTime: "11:25",
      targetMinAmount: 200,
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      deliveredAt: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
      notes: "จัดส่งเรียบร้อยแล้ว",
      buildingId: "loc-m4",
      buildingName: "ตึก M4",
    },
    {
      id: "batch-deleted-01",
      shopId: "shop-khun-som",
      date: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0],
      cutoffTime: "11:30",
      targetMinAmount: 200,
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      isDeleted: true,
      deletedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      buildingId: "loc-m4",
      buildingName: "ตึก M4",
    },
  ],
  orders: [
    {
      id: "ord-sample-1",
      orderNumber: 1,
      batchId: "batch-today-01",
      customerName: "สมชาย (Somchai)",
      customerPhone: "081-111-2222",
      locationId: "loc-m4",
      items: [
        { id: "pt1", name: "ข้าวกะเพราหมูกรอบคั่วพริกแห้ง", price: 60, quantity: 1, customNote: "เผ็ดน้อย ไม่ใส่ถั่วฝักยาว" },
        { id: "pt9", name: "ไข่ดาวฟูกรอบ", price: 10, quantity: 1, customNote: "ไข่แดงไม่สุก" },
      ],
      totalAmount: 70,
      slipImageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      boxLabel: "#01 สมชาย (Somchai) - M4 Building [ข้าวกะเพราหมูกรอบ + ไข่ดาว]",
    },
    {
      id: "ord-sample-2",
      orderNumber: 2,
      batchId: "batch-today-01",
      customerName: "อลิสา (Alice)",
      customerPhone: "089-333-4444",
      locationId: "loc-m4",
      items: [
        { id: "pt2", name: "ข้าวหมูกระเทียมพริกไทยสด", price: 55, quantity: 1, customNote: "ขอพริกน้ำปลาเพิ่ม" },
      ],
      totalAmount: 55,
      slipImageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80",
      createdAt: new Date(Date.now() - 900000).toISOString(),
      boxLabel: "#02 อลิสา (Alice) - M4 Building [ข้าวหมูกระเทียม]",
    },
  ],
};

// -------------------------------------------------------------
// Local In-Memory & JSON File Helpers (Fallback when Firebase is not active)
// -------------------------------------------------------------
async function ensureDataFile(): Promise<DatabaseSchema> {
  if (globalThis.__VEATEC_MEMORY_DB__) {
    return globalThis.__VEATEC_MEMORY_DB__;
  }

  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(content) as DatabaseSchema;
    globalThis.__VEATEC_MEMORY_DB__ = parsed;
    return parsed;
  } catch {
    const initial = structuredClone(SEED_DATA);
    globalThis.__VEATEC_MEMORY_DB__ = initial;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
    } catch {
      // Read-only filesystem safe (Vercel serverless)
    }
    return initial;
  }
}

async function writeData(data: DatabaseSchema): Promise<void> {
  globalThis.__VEATEC_MEMORY_DB__ = data;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Read-only filesystem safe (Vercel serverless)
  }
}

// -------------------------------------------------------------
// Firestore Helpers (Active when Firebase is configured)
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
// System & Firebase Health Diagnostics & Quota Tracker
// -------------------------------------------------------------
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

export interface FallbackStorageState {
  storageFile: string;
  isServerless: boolean;
  fileExists: boolean;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  inMemoryLoaded: boolean;
  counts: {
    shops: number;
    batches: number;
    openBatches: number;
    orders: number;
    suggestions: number;
    locations: number;
  };
  lastModifiedIso?: string;
}

export interface SystemStatus {
  firebaseConfigured: boolean;
  severity: FirebaseSeverity;
  quotaExhausted: boolean;
  fallbackMode: boolean;
  activeStorageEngine: "firestore" | "fallback_local";
  lastError?: string;
  resetTimeInfo: string;
  metrics: QuotaMetrics;
  fallbackState: FallbackStorageState;
}

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

async function loadStoredMetrics(): Promise<StoredMetrics> {
  const currentPeriod = getPacificDateString();
  if (globalThis.__VEATEC_METRICS__) {
    if (globalThis.__VEATEC_METRICS__.lastResetPeriod !== currentPeriod) {
      globalThis.__VEATEC_METRICS__.readsToday = 0;
      globalThis.__VEATEC_METRICS__.writesToday = 0;
      globalThis.__VEATEC_METRICS__.deletesToday = 0;
      globalThis.__VEATEC_METRICS__.lastResetPeriod = currentPeriod;
      saveStoredMetrics(globalThis.__VEATEC_METRICS__).catch(() => {});
    }
    return globalThis.__VEATEC_METRICS__;
  }

  try {
    const raw = await fs.readFile(METRICS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as StoredMetrics;
    if (parsed.lastResetPeriod !== currentPeriod) {
      parsed.readsToday = 0;
      parsed.writesToday = 0;
      parsed.deletesToday = 0;
      parsed.lastResetPeriod = currentPeriod;
      saveStoredMetrics(parsed).catch(() => {});
    }
    globalThis.__VEATEC_METRICS__ = parsed;
    return parsed;
  } catch {
    const fresh: StoredMetrics = {
      readsToday: 0,
      writesToday: 0,
      deletesToday: 0,
      lastResetPeriod: currentPeriod,
    };
    globalThis.__VEATEC_METRICS__ = fresh;
    saveStoredMetrics(fresh).catch(() => {});
    return fresh;
  }
}

async function saveStoredMetrics(m: StoredMetrics): Promise<void> {
  globalThis.__VEATEC_METRICS__ = m;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(METRICS_FILE, JSON.stringify(m, null, 2), "utf-8");
  } catch {
    // serverless safe
  }
}

export function recordFirestoreOp(op: "read" | "write" | "delete", count = 1) {
  const currentPeriod = getPacificDateString();
  if (!globalThis.__VEATEC_METRICS__) {
    globalThis.__VEATEC_METRICS__ = {
      readsToday: 0,
      writesToday: 0,
      deletesToday: 0,
      lastResetPeriod: currentPeriod,
    };
  }

  const m = globalThis.__VEATEC_METRICS__;
  if (m.lastResetPeriod !== currentPeriod) {
    m.readsToday = 0;
    m.writesToday = 0;
    m.deletesToday = 0;
    m.lastResetPeriod = currentPeriod;
  }

  if (op === "read") m.readsToday += count;
  if (op === "write") m.writesToday += count;
  if (op === "delete") m.deletesToday += count;
  m.lastSuccessIso = new Date().toISOString();

  saveStoredMetrics(m).catch(() => {});
}

export async function resetQuotaMetrics(): Promise<void> {
  const currentPeriod = getPacificDateString();
  const fresh: StoredMetrics = {
    readsToday: 0,
    writesToday: 0,
    deletesToday: 0,
    lastResetPeriod: currentPeriod,
    lastSuccessIso: new Date().toISOString(),
  };
  globalThis.__VEATEC_METRICS__ = fresh;
  await saveStoredMetrics(fresh);
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

  if (globalThis.__VEATEC_METRICS__) {
    globalThis.__VEATEC_METRICS__.lastErrorIso = new Date().toISOString();
    globalThis.__VEATEC_METRICS__.lastErrorMessage = errMsg;
    saveStoredMetrics(globalThis.__VEATEC_METRICS__).catch(() => {});
  }
}

export async function getQuotaMetrics(): Promise<QuotaMetrics> {
  const stored = await loadStoredMetrics();
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

export async function getFallbackStorageState(): Promise<FallbackStorageState> {
  const data = await ensureDataFile();
  let fileExists = false;
  let fileSizeBytes = 0;
  let lastModifiedIso: string | undefined = undefined;

  try {
    const st = await fs.stat(DATA_FILE);
    fileExists = true;
    fileSizeBytes = st.size;
    lastModifiedIso = st.mtime.toISOString();
  } catch {
    fileExists = false;
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return {
    storageFile: DATA_FILE,
    isServerless,
    fileExists,
    fileSizeBytes,
    fileSizeFormatted: formatSize(fileSizeBytes),
    inMemoryLoaded: Boolean(globalThis.__VEATEC_MEMORY_DB__),
    counts: {
      shops: data.shops?.length || 0,
      batches: data.batches?.length || 0,
      openBatches: data.batches?.filter((b) => b.status === "OPEN" && !b.isDeleted).length || 0,
      orders: data.orders?.length || 0,
      suggestions: data.suggestions?.length || 0,
      locations: data.locations?.length || CAMPUS_LOCATIONS.length,
    },
    lastModifiedIso,
  };
}

export async function getFallbackDatabase(): Promise<DatabaseSchema> {
  return await ensureDataFile();
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

export async function syncFirestoreToFallback(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  counts?: FallbackStorageState["counts"];
}> {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: "ไม่ได้ตั้งค่า Firebase" };
  }

  try {
    const [shopsSnap, batchesSnap, ordersSnap, locsSnap, suggsSnap] = await Promise.all([
      trackedGetDocs(collection(db, "shops")),
      trackedGetDocs(collection(db, "batches")),
      trackedGetDocs(collection(db, "orders")),
      trackedGetDocs(collection(db, "locations")).catch(() => ({ docs: [] } as any)),
      trackedGetDocs(collection(db, "suggestions")).catch(() => ({ docs: [] } as any)),
    ]);

    const schema: DatabaseSchema = {
      shops: shopsSnap.docs.map((d: any) => d.data() as Shop),
      batches: batchesSnap.docs.map((d: any) => d.data() as Batch),
      orders: ordersSnap.docs.map((d: any) => d.data() as Order),
      locations: locsSnap.docs.map((d: any) => d.data() as DeliveryLocation),
      suggestions: suggsSnap.docs.map((d: any) => d.data() as Suggestion),
    };

    if (!schema.locations || schema.locations.length === 0) {
      schema.locations = [...CAMPUS_LOCATIONS];
    }

    await writeData(schema);
    const fbState = await getFallbackStorageState();

    return {
      success: true,
      message: "ซิงค์ข้อมูลจาก Firestore ลง Fallback Cache เรียบร้อยแล้ว",
      counts: fbState.counts,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `ซิงค์ล้มเหลว: ${err?.message || String(err)}`,
    };
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
  const fallbackState = await getFallbackStorageState();
  const fallbackMode = lastQuotaExhausted || !isFirebaseConfigured;

  return {
    firebaseConfigured: isFirebaseConfigured,
    severity: isFirebaseConfigured ? lastSystemSeverity : "normal",
    quotaExhausted: lastQuotaExhausted,
    fallbackMode,
    activeStorageEngine: fallbackMode ? "fallback_local" : "firestore",
    lastError: lastErrorMessage || undefined,
    resetTimeInfo: "ทุกวันเวลา 14:00 - 15:00 น. ICT (00:00 US Pacific Time)",
    metrics,
    fallbackState,
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
      await Promise.all([
        ...SEED_DATA.shops.map((shop) =>
          trackedSetDoc(doc(firestore, "shops", shop.id), cleanForFirestore(shop), { merge: true }, 3000)
        ),
        ...SEED_DATA.batches.map((batch) =>
          trackedSetDoc(doc(firestore, "batches", batch.id), cleanForFirestore(batch), { merge: true }, 3000)
        ),
      ]);
    }
  } catch (err) {
    console.warn("Firestore seed check warning:", err);
  }
}

// -------------------------------------------------------------
// In-Memory Short-TTL Cache & Deduplication (Reduces Firestore reads)
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
// Public Data API (Automatic Firestore / Local Switch)
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
      console.warn("Firestore getShops failed, using local fallback:", err);
    }
  }

  if (result.length === 0) {
    const data = await ensureDataFile();
    result = data.shops;
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
      console.warn("Firestore getShopById failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  return data.shops.find((s) => s.id === id);
}

export async function saveShop(shop: Shop): Promise<Shop> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    try {
      await trackedSetDoc(doc(db, "shops", shop.id), cleanForFirestore(shop), undefined, 2500);
      return shop;
    } catch (err) {
      console.warn("Firestore saveShop failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  const index = data.shops.findIndex((s) => s.id === shop.id);
  if (index >= 0) {
    data.shops[index] = shop;
  } else {
    data.shops.push(shop);
  }
  await writeData(data);
  return shop;
}

export async function deleteShop(id: string): Promise<boolean> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    try {
      await trackedDeleteDoc(doc(db, "shops", id), 2500);
    } catch (err) {
      console.warn("Firestore deleteShop failed:", err);
    }
  }

  const data = await ensureDataFile();
  const index = data.shops.findIndex((s) => s.id === id);
  if (index >= 0) {
    data.shops.splice(index, 1);
    await writeData(data);
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

  const data = await ensureDataFile();
  if (data.locations && data.locations.length > 0) {
    return data.locations;
  }
  return CAMPUS_LOCATIONS;
}

export async function saveDeliveryLocation(loc: DeliveryLocation): Promise<DeliveryLocation> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    try {
      await trackedSetDoc(doc(db, "locations", loc.id), cleanForFirestore(loc), undefined, 2500);
    } catch (err) {
      console.warn("Firestore saveDeliveryLocation failed:", err);
    }
  }

  const data = await ensureDataFile();
  if (!data.locations) {
    data.locations = [...CAMPUS_LOCATIONS];
  }
  const idx = data.locations.findIndex((l) => l.id === loc.id);
  if (idx >= 0) {
    data.locations[idx] = loc;
  } else {
    data.locations.push(loc);
  }
  await writeData(data);
  return loc;
}

export async function deleteDeliveryLocation(id: string): Promise<boolean> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    try {
      await trackedDeleteDoc(doc(db, "locations", id), 2500);
    } catch (err) {
      console.warn("Firestore deleteDeliveryLocation failed:", err);
    }
  }

  const data = await ensureDataFile();
  if (!data.locations) {
    data.locations = [...CAMPUS_LOCATIONS];
  }
  const idx = data.locations.findIndex((l) => l.id === id);
  if (idx >= 0) {
    data.locations.splice(idx, 1);
    await writeData(data);
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
      console.warn("Firestore getBatches failed, using local fallback:", err);
    }
  }

  if (result.length === 0) {
    const data = await ensureDataFile();
    const todayStr = getBangkokDate();
    let hasUpdates = false;
    for (const b of data.batches) {
      const diff = getDaysDifference(b.date, todayStr);
      if (diff > 7 && !b.isDeleted) {
        b.isDeleted = true;
        b.deletedAt = new Date().toISOString();
        hasUpdates = true;
      }
    }
    if (hasUpdates) {
      writeData(data).catch(() => {});
    }
    result = data.batches.map((b) => enrichBatch(b, data));
  }

  cachedBatches = { data: result, timestamp: Date.now() };
  return sanitize ? result.map(sanitizeBatchDetails) : result;
}

export async function getBatchById(id: string, sanitize = false, forceFresh = false): Promise<BatchWithDetails | undefined> {
  // Deduplicate and use cache if available and fresh
  if (!forceFresh && cachedBatches && Date.now() - cachedBatches.timestamp < BATCHES_CACHE_TTL_MS) {
    const found = cachedBatches.data.find((b) => b.id === id);
    if (found) {
      return sanitize ? sanitizeBatchDetails(found) : found;
    }
  }

  // Otherwise, load via getBatches to hydrate the in-memory cache
  const allBatches = await getBatches(false, forceFresh);
  const found = allBatches.find((b) => b.id === id);
  return sanitize && found ? sanitizeBatchDetails(found) : found;
}

function enrichBatchFromData(batch: Batch, shops: Shop[], orders: Order[]): BatchWithDetails {
  const shop = shops.find((s) => s.id === batch.shopId) || shops[0] || SEED_DATA.shops[0];
  const isDeleted = Boolean(batch.isDeleted || getDaysDifference(batch.date) > 7);

  if (isDeleted) {
    return {
      ...batch,
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
    shop,
    orders,
    currentTotalAmount,
    isMinMet,
    amountRemaining,
    orderCount: orders.length,
  };
}

function enrichBatch(batch: Batch, data: DatabaseSchema): BatchWithDetails {
  const shop = data.shops.find((s) => s.id === batch.shopId) || data.shops[0];
  const isDeleted = Boolean(batch.isDeleted || getDaysDifference(batch.date) > 7);

  if (isDeleted) {
    return {
      ...batch,
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

  const orders = data.orders.filter((o) => o.batchId === batch.id);
  const currentTotalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const isMinMet = currentTotalAmount >= batch.targetMinAmount;
  const amountRemaining = Math.max(0, batch.targetMinAmount - currentTotalAmount);

  return {
    ...batch,
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
  };

  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    try {
      await trackedSetDoc(doc(db, "batches", id), cleanForFirestore(newBatch), undefined, 2500);
      const shops = await getShops();
      return enrichBatchFromData(newBatch, shops, []);
    } catch (err) {
      console.warn("Firestore createBatch failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  data.batches.unshift(newBatch);
  await writeData(data);
  return enrichBatch(newBatch, data);
}

export async function updateBatchStatus(
  batchId: string,
  status: BatchStatus,
  deliveryPhotoUrl?: string,
  extra?: { isSelfPickup?: boolean; sentToShopAt?: string }
): Promise<BatchWithDetails | undefined> {
  invalidateStoreCache();
  const updatePayload: Record<string, any> = { status };
  if (extra?.isSelfPickup !== undefined) {
    updatePayload.isSelfPickup = extra.isSelfPickup;
  }
  if (extra?.sentToShopAt) {
    updatePayload.sentToShopAt = extra.sentToShopAt;
  } else if (status === "ORDERED") {
    updatePayload.sentToShopAt = new Date().toISOString();
  }
  if (deliveryPhotoUrl) {
    updatePayload.deliveryPhotoUrl = deliveryPhotoUrl;
    updatePayload.deliveredAt = new Date().toISOString();
  } else if (status === "COMPLETED") {
    updatePayload.deliveredAt = new Date().toISOString();
  }

  if (isFirebaseConfigured && db) {
    try {
      await trackedUpdateDoc(doc(db, "batches", batchId), cleanForFirestore(updatePayload), 2500);
      return getBatchById(batchId);
    } catch (err) {
      console.warn("Firestore updateBatchStatus failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  const batch = data.batches.find((b) => b.id === batchId);
  if (!batch) return undefined;
  batch.status = status;
  if (extra?.isSelfPickup !== undefined) {
    batch.isSelfPickup = extra.isSelfPickup;
  }
  if (extra?.sentToShopAt) {
    batch.sentToShopAt = extra.sentToShopAt;
  } else if (status === "ORDERED") {
    batch.sentToShopAt = new Date().toISOString();
  }
  if (deliveryPhotoUrl) {
    batch.deliveryPhotoUrl = deliveryPhotoUrl;
    batch.deliveredAt = new Date().toISOString();
  } else if (status === "COMPLETED") {
    batch.deliveredAt = new Date().toISOString();
  }
  await writeData(data);
  return enrichBatch(batch, data);
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

  if (isFirebaseConfigured && db) {
    try {
      const snap = await trackedGetDocs(collection(db, "orders"), 2000);
      existingOrders = snap.docs
        .map((d) => d.data() as Order)
        .filter((o) => o.batchId === input.batchId && !o.deletedAt);
    } catch (err) {
      console.warn("Firestore check existing orders failed:", err);
    }
  } else {
    const data = await ensureDataFile();
    existingOrders = data.orders.filter((o) => o.batchId === input.batchId && !o.deletedAt);
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
    slipImageUrl: input.slipImageUrl,
    slipTransRef: input.slipTransRef,
    slipBankCode: input.slipBankCode,
    slipBankName: input.slipBankName,
    isSlipVerified: input.isSlipVerified ?? Boolean(input.slipImageUrl),
    createdAt: new Date().toISOString(),
    boxLabel,
  };

  if (isFirebaseConfigured && db) {
    try {
      await trackedSetDoc(doc(db, "orders", newOrder.id), cleanForFirestore(newOrder), undefined, 2500);
      return newOrder;
    } catch (err) {
      console.error("Firestore createOrder failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  data.orders.push(newOrder);
  await writeData(data);
  return newOrder;
}

export async function deleteOrder(
  orderId: string,
  reason = "Cancelled by user/host",
  by = "Host"
): Promise<boolean> {
  invalidateStoreCache();
  if (isFirebaseConfigured && db) {
    try {
      const orderRef = doc(db, "orders", orderId);
      const snap = await trackedGetDoc(orderRef, 2000);
      if (snap.exists()) {
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
    } catch (err) {
      console.error("Firestore deleteOrder failed:", err);
    }
  }

  const data = await ensureDataFile();
  const ord = data.orders.find((o) => o.id === orderId);
  if (ord) {
    ord.deletedAt = new Date().toISOString();
    ord.deletedReason = `${reason} (by ${by})`;
    await writeData(data);
    return true;
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
      console.warn("Firestore getSuggestions failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  return (data.suggestions || []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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
    try {
      await trackedSetDoc(doc(db, "suggestions", newSuggestion.id), cleanForFirestore(newSuggestion), undefined, 2500);
      return newSuggestion;
    } catch (err) {
      console.error("Firestore createSuggestion failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  if (!data.suggestions) data.suggestions = [];
  data.suggestions.push(newSuggestion);
  await writeData(data);
  return newSuggestion;
}

export async function deleteSuggestion(id: string): Promise<boolean> {
  if (isFirebaseConfigured && db) {
    try {
      await trackedDeleteDoc(doc(db, "suggestions", id), 2500);
      return true;
    } catch (err) {
      console.warn("Firestore deleteSuggestion failed:", err);
    }
  }

  const data = await ensureDataFile();
  if (data.suggestions) {
    data.suggestions = data.suggestions.filter((s) => s.id !== id);
    await writeData(data);
  }
  return true;
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



