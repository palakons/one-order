import { isFirebaseConfigured, db, storage } from "./firebase";
import { BatchWithDetails, Shop, Order, BatchStatus } from "./types";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getLocationById } from "./locations";

// -------------------------------------------------------------
// Image / Slip Compression and Upload Handler
// -------------------------------------------------------------
// Image / Slip Compression and Upload Handler
// -------------------------------------------------------------
async function compressWithBitmap(blob: Blob, maxDim: number, quality: number): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    // Attempt with orientation preservation
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Fallback without options (older WebKit / Android)
    bitmap = await createImageBitmap(blob);
  }

  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas context failed");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", quality);
}

async function compressWithFileReader(blob: Blob, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

async function compressWithObjectURL(blob: Blob, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(blob);
    } catch (err) {
      reject(err);
      return;
    }

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image"));
    };

    img.src = objectUrl;
  });
}

async function compressWithServer(file: File | Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Server compression failed (${res.status})`);
  }
  const data = await res.json();
  if (!data.success || (!data.url && !data.dataUrl)) {
    throw new Error(data.error || "Server compression failed");
  }
  return data.dataUrl || data.url;
}

export async function compressImage(
  file: File,
  maxDim = 900,
  quality = 0.70
): Promise<string> {
  if (typeof window === "undefined") return "";

  // Check if file is HEIC / HEIF format
  const fileName = (file.name || "").toLowerCase();
  const fileType = (file.type || "").toLowerCase();
  const isHeic =
    fileType.includes("heic") ||
    fileType.includes("heif") ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif");

  let processableBlob: Blob = file;

  // Convert HEIC client-side if needed
  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const conv = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8,
      });
      processableBlob = Array.isArray(conv) ? conv[0] : (conv as Blob);
    } catch (heicErr) {
      console.warn("Client-side heic2any conversion failed, will attempt fallbacks:", heicErr);
    }
  }

  let result = "";

  // Strategy 1: Hardware-accelerated createImageBitmap (fastest, lowest memory on mobile)
  if (typeof createImageBitmap !== "undefined") {
    try {
      result = await compressWithBitmap(processableBlob, maxDim, quality);
    } catch (err) {
      console.warn("createImageBitmap failed, falling back to FileReader:", err);
    }
  }

  // Strategy 2: FileReader DataURL with Image element (essential on Android Chrome for content URIs)
  if (!result) {
    try {
      result = await compressWithFileReader(processableBlob, maxDim, quality);
    } catch (err) {
      console.warn("FileReader image decode failed, falling back to ObjectURL:", err);
    }
  }

  // Strategy 3: URL.createObjectURL with Image element
  if (!result) {
    try {
      result = await compressWithObjectURL(processableBlob, maxDim, quality);
    } catch (err) {
      console.warn("compressWithObjectURL failed, attempting server fallback:", err);
    }
  }

  // Strategy 4: High-reliability Server-side Sharp Fallback (natively handles HEIC & complex EXIF)
  if (!result) {
    try {
      // Only send if within Vercel body limits (~4.2MB)
      if (file.size <= 4.2 * 1024 * 1024) {
        result = await compressWithServer(file);
      }
    } catch (err) {
      console.warn("Server-side compression fallback failed:", err);
    }
  }

  // Final check: Validate compressed result format
  if (!result || !result.startsWith("data:image/")) {
    throw new Error("ไม่สามารถประมวลผลรูปภาพได้ กรุณาถ่ายใหม่อีกครั้ง หรือเลือกจากอัลบั้ม");
  }

  // Extra safety: If base64 string is still > 1MB, downscale further to 640px
  if (result.length > 1024 * 1024) {
    try {
      if (typeof createImageBitmap !== "undefined") {
        result = await compressWithBitmap(processableBlob, 640, 0.60);
      } else {
        result = await compressWithFileReader(processableBlob, 640, 0.60);
      }
    } catch (err) {
      console.warn("Secondary compression failed, using first result:", err);
    }
  }

  return result;
}

export async function uploadSlipImage(file: File): Promise<string> {
  // Always compress the slip first in-browser (~60-80 KB)
  let compressedDataUrl = "";
  try {
    compressedDataUrl = await compressImage(file, 800, 0.72);
  } catch (err) {
    console.warn("Slip compression failed, will fallback:", err);
  }

  // 1. Instant Zero-CORS Spark Tier Mode:
  // If compressed base64 is available, use it directly!
  // Firestore documents support up to 1 MB, and ~50 KB fits easily with 0 extra cost,
  // zero external CORS preflight failures on any domain (veatec.vercel.app),
  // and instant order submission.
  if (compressedDataUrl && process.env.NEXT_PUBLIC_ENABLE_FIREBASE_STORAGE !== "true") {
    return compressedDataUrl;
  }

  // 2. If explicitly enabled via NEXT_PUBLIC_ENABLE_FIREBASE_STORAGE="true" and bucket is configured
  if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE_STORAGE === "true" && isFirebaseConfigured && storage && compressedDataUrl) {
    try {
      const ext = "jpg";
      const filename = `slips/slip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const storageRef = ref(storage, filename);
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();
      const snapshot = await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.warn("Firebase Storage upload failed, falling back to base64 Data URL:", err);
      return compressedDataUrl;
    }
  }

  // 3. Fallback to server endpoint (which uses sharp to compress and return base64)
  const serverResult = await compressWithServer(file);
  return serverResult;
}

// -------------------------------------------------------------
// Fetch Batches
// -------------------------------------------------------------
export async function getBatchesList(): Promise<BatchWithDetails[]> {
  const res = await fetch("/api/batches", { cache: "no-store" });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.batches;
}

// -------------------------------------------------------------
// Fetch Single Batch
// -------------------------------------------------------------
export async function getBatch(batchId: string): Promise<BatchWithDetails> {
  const res = await fetch(`/api/batches/${batchId}`, { cache: "no-store" });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.batch;
}

// -------------------------------------------------------------
// Real-time Batch Subscription (Firestore or Polling)
// -------------------------------------------------------------
export function subscribeToBatch(
  batchId: string,
  onUpdate: (batch: BatchWithDetails) => void
): () => void {
  // If Firebase is active and initialized
  if (isFirebaseConfigured && db) {
    try {
      const batchRef = doc(db, "batches", batchId);
      const unsubscribe = onSnapshot(batchRef, async (docSnap) => {
        if (docSnap.exists()) {
          // fetch full enriched batch from api or compute
          const res = await fetch(`/api/batches/${batchId}`);
          const data = await res.json();
          if (data.success) onUpdate(data.batch);
        }
      });
      return unsubscribe;
    } catch (err) {
      console.warn("Firestore subscription failed, falling back to polling", err);
    }
  }

  // No background polling to preserve Firestore quota
  return () => {};
}

// -------------------------------------------------------------
// Submit Order
// -------------------------------------------------------------
export async function placeOrder(orderData: {
  batchId: string;
  customerName: string;
  customerPhone: string;
  locationId: string;
  items: Array<{ name: string; price: number; quantity: number; customNote?: string }>;
  totalAmount: number;
  slipFile?: File;
  slipImageUrl?: string;
}): Promise<{ order: Order; batch: BatchWithDetails }> {
  let slipUrl = orderData.slipImageUrl;

  if (orderData.slipFile) {
    slipUrl = await uploadSlipImage(orderData.slipFile);
  }

  if (!slipUrl) {
    throw new Error("Payment slip is required");
  }

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      batchId: orderData.batchId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      locationId: orderData.locationId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      slipImageUrl: slipUrl,
    }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to submit order");
  }

  return {
    order: data.order,
    batch: data.batch,
  };
}

// -------------------------------------------------------------
// Update Batch Status
// -------------------------------------------------------------
export async function changeBatchStatus(
  batchId: string,
  status: BatchStatus,
  deliveryPhotoUrl?: string
): Promise<BatchWithDetails> {
  // Reject oversized payloads before sending
  if (deliveryPhotoUrl && deliveryPhotoUrl.length > 2 * 1024 * 1024) {
    throw new Error("ขนาดไฟล์รูปภาพใหญ่เกินไป กรุณาถ่ายภาพใหม่อีกครั้ง");
  }

  const res = await fetch(`/api/batches/${batchId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, deliveryPhotoUrl }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 413) {
      throw new Error("ขนาดไฟล์รูปภาพใหญ่เกินกว่าที่ระบบรองรับ กรุณาถ่ายภาพใหม่อีกครั้ง");
    }
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || `HTTP ${res.status}: ${text}`);
    } catch (parseErr: any) {
      if (parseErr.message && !parseErr.message.includes("is not valid JSON")) throw parseErr;
      throw new Error(text || `Server Error ${res.status}`);
    }
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to update batch status");
  }
  return data.batch;
}

