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
// Image / Slip Upload Handler
// -------------------------------------------------------------
export async function uploadSlipImage(file: File): Promise<string> {
  if (isFirebaseConfigured && storage) {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `slips/slip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const storageRef = ref(storage, filename);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.warn("Firebase Storage upload failed, falling back to local API:", err);
    }
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
