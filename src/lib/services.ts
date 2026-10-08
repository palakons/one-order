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
export async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.FileReader) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        // Fallback to original data URL if image rendering fails
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = (err) => reject(err);
  });
}

export async function uploadSlipImage(file: File): Promise<string> {
  // Always compress the slip first in-browser (~60-80 KB)
  let compressedDataUrl = "";
  try {
    compressedDataUrl = await compressImage(file, 800, 0.72);
  } catch (err) {
    console.warn("Slip compression failed, will fallback:", err);
  }

  // If Firebase Storage is configured and on Blaze plan, attempt bucket upload
  if (isFirebaseConfigured && storage && compressedDataUrl) {
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
      console.warn(
        "Firebase Storage upload failed (Spark tier requires Blaze for bucket). Saving compressed base64 directly into Firestore:",
        err
      );
    }
  }

  // Spark Tier $0 Mode: return the compressed base64 Data URL directly!
  // Firestore documents support up to 1 MB, and ~60-80 KB fits easily with 0 extra cost & 0 setup.
  if (compressedDataUrl) {
    return compressedDataUrl;
  }

  // Fallback to local upload endpoint
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to upload slip image");
  }
  return data.url;
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

  // Graceful polling fallback (polls every 3 seconds for active batches)
  let active = true;
  const poll = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const data = await res.json();
      if (data.success && active) onUpdate(data.batch);
    } catch (err) {
      console.error("Poll error", err);
    }
  };

  const intervalId = setInterval(poll, 3500);
  return () => {
    active = false;
    clearInterval(intervalId);
  };
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
  status: BatchStatus
): Promise<BatchWithDetails> {
  const res = await fetch(`/api/batches/${batchId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to update batch status");
  }
  return data.batch;
}
