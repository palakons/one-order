import fs from "fs/promises";
import path from "path";
import { Shop, Batch, Order, BatchWithDetails, BatchStatus, Suggestion } from "./types";
import { getLocationById } from "./locations";
import { isFirebaseConfigured, db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

interface DatabaseSchema {
  shops: Shop[];
  batches: Batch[];
  orders: Order[];
  suggestions?: Suggestion[];
}

declare global {
  // eslint-disable-next-line no-var
  var __VEATEC_MEMORY_DB__: DatabaseSchema | undefined;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? "/tmp" : path.join(process.cwd(), "src", "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

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
      promptpayNumber: "contact shop",
      promptpayAccountName: "ครัวป้าต่าย ป่ายุบใน (Contact Shop)",
      promptpayQrUrl: "contact shop",
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
      promptpayNumber: "0814546374",
      promptpayAccountName: "ร้านอาหารชาวไร่ (Chao Rai Restaurant)",
      promptpayQrUrl: "contact shop",
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
      promptpayNumber: "0871379837",
      promptpayAccountName: "ครัวมั่งมี โต๊ะจีน (Krua Mangmee)",
      promptpayQrUrl: "contact shop",
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
      promptpayNumber: "0644395163",
      promptpayAccountName: "ครัวคุณส้ม ป่ายุบใน (Khun Som)",
      promptpayQrUrl: "contact shop",
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
      promptpayNumber: "contact shop",
      promptpayAccountName: "Lin's Tea House (Contact Shop)",
      promptpayQrUrl: "contact shop",
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

async function ensureFirestoreSeeded(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    for (const shop of SEED_DATA.shops) {
      await setDoc(doc(db, "shops", shop.id), cleanForFirestore(shop), { merge: true });
    }
    for (const batch of SEED_DATA.batches) {
      await setDoc(doc(db, "batches", batch.id), cleanForFirestore(batch), { merge: true });
    }
  } catch (err) {
    console.warn("Firestore seed check warning:", err);
  }
}

// -------------------------------------------------------------
// Public Data API (Automatic Firestore / Local Switch)
// -------------------------------------------------------------
export async function getShops(): Promise<Shop[]> {
  if (isFirebaseConfigured && db) {
    try {
      await ensureFirestoreSeeded();
      const snap = await getDocs(collection(db, "shops"));
      return snap.docs.map((d) => d.data() as Shop);
    } catch (err) {
      console.warn("Firestore getShops failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  return data.shops;
}

export async function getShopById(id: string): Promise<Shop | undefined> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, "shops", id));
      if (snap.exists()) return snap.data() as Shop;
    } catch (err) {
      console.warn("Firestore getShopById failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  return data.shops.find((s) => s.id === id);
}

export async function saveShop(shop: Shop): Promise<Shop> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "shops", shop.id), cleanForFirestore(shop));
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

export async function getBatches(sanitize = true): Promise<BatchWithDetails[]> {
  let result: BatchWithDetails[] = [];

  if (isFirebaseConfigured && db) {
    try {
      await ensureFirestoreSeeded();
      const [batchesSnap, ordersSnap, shopsSnap] = await Promise.all([
        getDocs(collection(db, "batches")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "shops")),
      ]);

      const batches = batchesSnap.docs.map((d) => d.data() as Batch);
      const orders = ordersSnap.docs.map((d) => d.data() as Order);
      const shops = shopsSnap.docs.map((d) => d.data() as Shop);

      result = batches.map((b) =>
        enrichBatchFromData(b, shops, orders.filter((o) => o.batchId === b.id))
      );
    } catch (err) {
      console.warn("Firestore getBatches failed, using local fallback:", err);
    }
  }

  if (result.length === 0) {
    const data = await ensureDataFile();
    result = data.batches.map((b) => enrichBatch(b, data));
  }

  return sanitize ? result.map(sanitizeBatchDetails) : result;
}

export async function getBatchById(id: string, sanitize = false): Promise<BatchWithDetails | undefined> {
  let result: BatchWithDetails | undefined;

  if (isFirebaseConfigured && db) {
    try {
      const batchSnap = await getDoc(doc(db, "batches", id));
      if (batchSnap.exists()) {
        const batch = batchSnap.data() as Batch;
        const [ordersSnap, shopsSnap] = await Promise.all([
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "shops")),
        ]);
        const orders = ordersSnap.docs
          .map((d) => d.data() as Order)
          .filter((o) => o.batchId === id);
        const shops = shopsSnap.docs.map((d) => d.data() as Shop);
        result = enrichBatchFromData(batch, shops, orders);
      }
    } catch (err) {
      console.warn("Firestore getBatchById failed, using local fallback:", err);
    }
  }

  if (!result) {
    const data = await ensureDataFile();
    const batch = data.batches.find((b) => b.id === id);
    if (!batch) return undefined;
    result = enrichBatch(batch, data);
  }

  return sanitize && result ? sanitizeBatchDetails(result) : result;
}

function enrichBatchFromData(batch: Batch, shops: Shop[], orders: Order[]): BatchWithDetails {
  const shop = shops.find((s) => s.id === batch.shopId) || shops[0] || SEED_DATA.shops[0];
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
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "batches", id), cleanForFirestore(newBatch));
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
  deliveryPhotoUrl?: string
): Promise<BatchWithDetails | undefined> {
  const updatePayload: Record<string, any> = { status };
  if (deliveryPhotoUrl) {
    updatePayload.deliveryPhotoUrl = deliveryPhotoUrl;
    updatePayload.deliveredAt = new Date().toISOString();
  } else if (status === "COMPLETED") {
    updatePayload.deliveredAt = new Date().toISOString();
  }

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, "batches", batchId), cleanForFirestore(updatePayload));
      return getBatchById(batchId);
    } catch (err) {
      console.warn("Firestore updateBatchStatus failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  const batch = data.batches.find((b) => b.id === batchId);
  if (!batch) return undefined;
  batch.status = status;
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
  customerPhone: string;
  locationId: string;
  items: Array<{ id?: string; name: string; price: number; quantity: number; customNote?: string }>;
  totalAmount: number;
  slipImageUrl: string;
}): Promise<Order> {
  let existingOrders: Order[] = [];

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "orders"));
      existingOrders = snap.docs
        .map((d) => d.data() as Order)
        .filter((o) => o.batchId === input.batchId);
    } catch (err) {
      console.warn("Firestore check existing orders failed:", err);
    }
  } else {
    const data = await ensureDataFile();
    existingOrders = data.orders.filter((o) => o.batchId === input.batchId);
  }

  const orderNumber = existingOrders.length + 1;
  const loc = getLocationById(input.locationId);
  const locCode = loc ? loc.shortCode : input.locationId;
  const itemsSummary = input.items.map((i) => i.name).join(" + ");
  const boxLabel = `#${String(orderNumber).padStart(2, "0")} ${input.customerName} - ${locCode} [${itemsSummary}]`;

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    batchId: input.batchId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
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
    createdAt: new Date().toISOString(),
    boxLabel,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "orders", newOrder.id), cleanForFirestore(newOrder));
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

export async function getSuggestions(): Promise<Suggestion[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "suggestions"));
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
      await setDoc(doc(db, "suggestions", newSuggestion.id), cleanForFirestore(newSuggestion));
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
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "suggestions", id));
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
      const snap = await getDoc(doc(db, "system", "line_config"));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.groupIds)) {
          data.groupIds.forEach((id: string) => {
            if (typeof id === "string" && id.trim()) groups.add(id.trim());
          });
        }
        if (typeof data.activeGroupId === "string" && data.activeGroupId.trim()) {
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
      const snap = await getDoc(ref);
      const existing: string[] = snap.exists() ? (snap.data().groupIds || []) : [];
      const updated = Array.from(new Set([...existing, cleanId]));
      await setDoc(
        ref,
        {
          activeGroupId: cleanId,
          groupIds: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Firestore saveActiveLineGroupId failed:", err);
    }
  }
}


