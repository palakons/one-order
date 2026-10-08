import fs from "fs/promises";
import path from "path";
import { Shop, Batch, Order, BatchWithDetails, BatchStatus } from "./types";
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

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

interface DatabaseSchema {
  shops: Shop[];
  batches: Batch[];
  orders: Order[];
}

const SEED_DATA: DatabaseSchema = {
  shops: [
    {
      id: "shop-auntie-nee",
      name: "ป้าณี อาหารตามสั่ง",
      nameEn: "Auntie Nee Cook-to-Order",
      cuisine: "Thai Street Food / Rice Dishes",
      description: "อาหารตามสั่งจานด่วนหน้ามหาวิทยาลัย รสจัดจ้าน สะอาด ให้เยอะ คุ้มราคา",
      phone: "081-987-6543",
      lineId: "auntie_nee_food",
      promptpayNumber: "0819876543",
      promptpayAccountName: "สมณี ใจอารีย์ (Somnee J.)",
      promptpayQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=0819876543",
      menuImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:15",
      menuItems: [
        { id: "m1", name: "ข้าวกะเพราหมูกรอบ", nameEn: "Crispy Pork Holy Basil Rice", price: 60, popular: true },
        { id: "m2", name: "ข้าวผัดหมู / ไก่", nameEn: "Fried Rice (Pork / Chicken)", price: 50, popular: false },
        { id: "m3", name: "ข้าวหมูกระเทียมพริกไทย", nameEn: "Garlic Pepper Pork with Rice", price: 55, popular: true },
        { id: "m4", name: "ข้าวผัดพริกแกงหมูกรอบ", nameEn: "Crispy Pork Red Curry Paste Rice", price: 65, popular: false },
        { id: "m5", name: "ผัดซีอิ๊วหมูนุ่ม", nameEn: "Stir-fried Wide Rice Noodles (Pad See Ew)", price: 55, popular: false },
        { id: "m6", name: "ข้าวไข่เจียวทรงเครื่อง", nameEn: "Thai Minced Pork Omelette Rice", price: 45, popular: false },
        { id: "m7", name: "ไข่ดาวฟูกรอบ", nameEn: "Crispy Fried Egg (Add-on)", price: 10, popular: true },
        { id: "m8", name: "ไข่เจียว", nameEn: "Omelette (Add-on)", price: 15, popular: false },
      ],
    },
    {
      id: "shop-uncle-chai",
      name: "ข้าวมันไก่เฮียไช้",
      nameEn: "Uncle Chai Hainanese Chicken Rice",
      cuisine: "Hainanese Chicken Rice",
      description: "ไก่นุ่มชุ่มฉ่ำ ข้าวมันหอม น้ำจิ้มเต้าเจี้ยวรสเด็ด แถมน้ำซุปมะนาวดอง",
      phone: "089-123-4567",
      lineId: "chai_chickenrice",
      promptpayNumber: "0891234567",
      promptpayAccountName: "สมชาย วัฒนากูล (Somchai W.)",
      promptpayQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=0891234567",
      menuImageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:20",
      menuItems: [
        { id: "c1", name: "ข้าวมันไก่ต้มพิเศษ", nameEn: "Boiled Chicken Rice (Special)", price: 55, popular: true },
        { id: "c2", name: "ข้าวมันไก่ทอดกรอบ", nameEn: "Crispy Fried Chicken Rice", price: 55, popular: true },
        { id: "c3", name: "ข้าวมันไก่ผสม (ต้ม+ทอด)", nameEn: "Combo Chicken Rice (Boiled + Fried)", price: 65, popular: true },
        { id: "c4", name: "ข้าวหมูแดงหมูกรอบ", nameEn: "BBQ Pork & Crispy Pork Rice", price: 65, popular: false },
        { id: "c5", name: "เพิ่มตับไก่", nameEn: "Extra Chicken Liver", price: 15, popular: false },
      ],
    },
    {
      id: "shop-mae-wan",
      name: "แม่วรรณ ก๋วยเตี๋ยวเรือ & บะหมี่เกี๊ยว",
      nameEn: "Mae Wan Boat Noodles",
      cuisine: "Noodles & Dumplings",
      description: "ก๋วยเตี๋ยวเรือน้ำตกเข้มข้น ไม่ต้องปรุง เกี๊ยวหมูแน่นคำโต",
      phone: "086-555-8888",
      lineId: "maewan_noodles",
      promptpayNumber: "0865558888",
      promptpayAccountName: "วรรณเพ็ญ ศรีสุข (Wanpen S.)",
      promptpayQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=0865558888",
      menuImageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:30",
      menuItems: [
        { id: "n1", name: "ก๋วยเตี๋ยวเรือน้ำตกหมูสด-หมูตุ๋น", nameEn: "Pork Boat Noodles with Thick Broth", price: 50, popular: true },
        { id: "n2", name: "บะหมี่แห้งเกี๊ยวหมูแดง", nameEn: "Egg Noodles with Pork Dumplings & BBQ Pork", price: 60, popular: true },
        { id: "n3", name: "เกี๊ยวหมูทอดกรอบ", nameEn: "Crispy Fried Dumplings", price: 35, popular: false },
        { id: "n4", name: "กากหมูเจียวหอมกรอบ", nameEn: "Crispy Pork Crackling", price: 20, popular: true },
      ],
    },
    {
      id: "shop-somtum-nee",
      name: "ส้มตำเจ๊ณี วังจันทร์",
      nameEn: "Som Tum Jae Nee (Isan Food)",
      cuisine: "ส้มตำ & อาหารอีสานแซ่บ",
      description: "ส้มตำปลาร้านัว ไก่ย่างเตาถ่านหอมกรุ่น คอหมูย่างนุ่มฉ่ำ ลาบหมูรสจัดจ้าน",
      phone: "084-777-9999",
      lineId: "jaenee_somtum",
      promptpayNumber: "0847779999",
      promptpayAccountName: "ณภัทร สมใจ (Napat S.)",
      promptpayQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=0847779999",
      menuImageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 200,
      defaultCutoffTime: "11:20",
      menuItems: [
        { id: "s1", name: "ส้มตำไทยไข่เค็ม", nameEn: "Thai Papaya Salad with Salted Egg", price: 55, popular: true },
        { id: "s2", name: "ส้มตำปูปลาร้า (นัวแซ่บ)", nameEn: "Spicy Papaya Salad with Fermented Fish", price: 50, popular: true },
        { id: "s3", name: "ไก่ย่างเตาถ่าน (สะโพก)", nameEn: "Charcoal Grilled Chicken", price: 70, popular: true },
        { id: "s4", name: "คอหมูย่างน้ำจิ้มแจ่ว", nameEn: "Grilled Pork Neck with Jaew Sauce", price: 80, popular: true },
        { id: "s5", name: "ลาบหมูคั่วข้าวคั่วหอม", nameEn: "Spicy Minced Pork Salad (Larb)", price: 65, popular: false },
        { id: "s6", name: "ข้าวเหนียวนุ่มร้อนๆ", nameEn: "Sticky Rice", price: 10, popular: true },
      ],
    },
    {
      id: "shop-vistec-cafe",
      name: "VISTEC Café & Refreshment",
      nameEn: "VISTEC Campus Café",
      cuisine: "เครื่องดื่ม ชา กาแฟสด & ขนม",
      description: "กาแฟคั่วบดสดใหม่ ชาไทยตรามือเข้มข้น มัทฉะเกรดพรีเมียม สดชื่นยามบ่าย",
      phone: "082-333-7777",
      lineId: "vistec_cafe",
      promptpayNumber: "0823337777",
      promptpayAccountName: "วิทยสิริเมธี คาเฟ่ (Vistec Cafe)",
      promptpayQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=0823337777",
      menuImageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
      minDeliveryAmount: 150,
      defaultCutoffTime: "11:45",
      menuItems: [
        { id: "k1", name: "ชาไทยเย็นโบราณ (หวานน้อย)", nameEn: "Traditional Thai Iced Tea", price: 45, popular: true },
        { id: "k2", name: "อเมริกาโน่เย็น (คั่วกลาง)", nameEn: "Iced Americano", price: 50, popular: true },
        { id: "k3", name: "อเมริกาโน่น้ำส้มยูสุ", nameEn: "Iced Yuzu Americano", price: 65, popular: true },
        { id: "k4", name: "มัทฉะลาเต้ญี่ปุ่นแท้", nameEn: "Uji Matcha Latte", price: 60, popular: true },
        { id: "k5", name: "ชามะนาวน้ำผึ้งแท้", nameEn: "Honey Lemon Iced Tea", price: 50, popular: false },
        { id: "k6", name: "ขนมปังปิ้งเนยนมฮอกไกโด", nameEn: "Hokkaido Butter Milk Toast", price: 35, popular: false },
      ],
    },
  ],
  batches: [
    {
      id: "batch-today-01",
      shopId: "shop-auntie-nee",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:15",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-02",
      shopId: "shop-uncle-chai",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:20",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 3000000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-03",
      shopId: "shop-mae-wan",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:25",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 2400000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-04",
      shopId: "shop-somtum-nee",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:30",
      targetMinAmount: 200,
      status: "OPEN",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      notes: "รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4",
    },
    {
      id: "batch-today-05",
      shopId: "shop-vistec-cafe",
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
        { id: "item-1", name: "ข้าวกะเพราหมูกรอบ", price: 60, quantity: 1, customNote: "เผ็ดน้อย ไม่ใส่ถั่วฝักยาว" },
        { id: "item-2", name: "ไข่ดาวฟูกรอบ", price: 10, quantity: 1, customNote: "ไข่แดงไม่สุก" },
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
        { id: "item-3", name: "ข้าวผัดหมู", price: 50, quantity: 1, customNote: "ขอน้ำปลาพริกเยอะๆ" },
      ],
      totalAmount: 50,
      slipImageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80",
      createdAt: new Date(Date.now() - 900000).toISOString(),
      boxLabel: "#02 อลิสา (Alice) - M4 Building [ข้าวผัดหมู]",
    },
  ],
};

// -------------------------------------------------------------
// Local JSON File Helpers (Fallback when Firebase is not active)
// -------------------------------------------------------------
async function ensureDataFile(): Promise<DatabaseSchema> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(content) as DatabaseSchema;
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(SEED_DATA, null, 2), "utf-8");
    return SEED_DATA;
  }
}

async function writeData(data: DatabaseSchema): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// -------------------------------------------------------------
// Firestore Helpers (Active when Firebase is configured)
// -------------------------------------------------------------
async function ensureFirestoreSeeded(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const shopsSnap = await getDocs(collection(db, "shops"));
    if (shopsSnap.empty) {
      // Seed shops
      for (const shop of SEED_DATA.shops) {
        await setDoc(doc(db, "shops", shop.id), shop);
      }
      // Seed batches
      for (const batch of SEED_DATA.batches) {
        await setDoc(doc(db, "batches", batch.id), batch);
      }
      // Seed orders
      for (const order of SEED_DATA.orders) {
        await setDoc(doc(db, "orders", order.id), order);
      }
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
      await setDoc(doc(db, "shops", shop.id), shop);
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

export async function getBatches(): Promise<BatchWithDetails[]> {
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

      return batches.map((b) =>
        enrichBatchFromData(b, shops, orders.filter((o) => o.batchId === b.id))
      );
    } catch (err) {
      console.warn("Firestore getBatches failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  return data.batches.map((b) => enrichBatch(b, data));
}

export async function getBatchById(id: string): Promise<BatchWithDetails | undefined> {
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
        return enrichBatchFromData(batch, shops, orders);
      }
    } catch (err) {
      console.warn("Firestore getBatchById failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  const batch = data.batches.find((b) => b.id === id);
  if (!batch) return undefined;
  return enrichBatch(batch, data);
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
      await setDoc(doc(db, "batches", id), newBatch);
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
      await updateDoc(doc(db, "batches", batchId), updatePayload);
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
      await setDoc(doc(db, "orders", newOrder.id), newOrder);
      return newOrder;
    } catch (err) {
      console.warn("Firestore createOrder failed, using local fallback:", err);
    }
  }

  const data = await ensureDataFile();
  data.orders.push(newOrder);
  await writeData(data);
  return newOrder;
}
