import { db, isFirebaseConfigured, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, Bytes } from "firebase/firestore";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";

// Convert a path like "slips/slip_123.jpg" to a Firestore document ID
export function pathToDocId(path: string): string {
  return encodeURIComponent(path.trim()).replace(/\./g, "_");
}

export interface StoredImageMeta {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

/**
 * Save an image buffer to storage (Firestore storage_files and Firebase Storage if available).
 * Keeps images completely separate from main batch/order JSON documents.
 */
export async function saveImageToStorage(
  category: "slips" | "delivery" | "shops" | "locations" | "general",
  buffer: Buffer,

  mimeType = "image/jpeg",
  customFilename?: string
): Promise<StoredImageMeta> {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const filename = customFilename || `${category}_${timestamp}_${randomStr}.${ext}`;
  const filePath = `${category}/${filename}`;
  const docId = pathToDocId(filePath);
  const createdAt = new Date().toISOString();

  // 1. Primary: Save to Firebase Cloud Storage bucket (Admin SDK or Client SDK)
  let savedToCloudStorage = false;
  try {
    const { getAdminApp } = await import("./firebase-admin");
    const adminApp = getAdminApp();
    if (adminApp) {
      const { getStorage } = await import("firebase-admin/storage");
      const bucket = getStorage(adminApp).bucket();
      await bucket.file(filePath).save(buffer, {
        contentType: mimeType,
        metadata: { contentType: mimeType },
      });
      savedToCloudStorage = true;
    }
  } catch (adminErr) {
    // Fallback to client SDK if Admin SDK is unavailable
    if (isFirebaseConfigured && storage) {
      try {
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, buffer, { contentType: mimeType });
        savedToCloudStorage = true;
      } catch (err) {
        console.warn("Firebase Storage bucket upload notice, falling back to Firestore:", err);
      }
    }
  }


  // 2. Fallback: Save to Firestore storage_files collection if Cloud Storage is not available
  if (!savedToCloudStorage && isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "storage_files", docId);
      await setDoc(docRef, {
        path: filePath,
        category,
        mimeType,
        sizeBytes: buffer.length,
        data: Bytes.fromUint8Array(buffer),
        createdAt,
      });
    } catch (err) {
      console.error(`Failed to save image ${filePath} to Firestore storage_files:`, err);
    }
  }

  return {
    path: filePath,
    url: `/api/images/${filePath}`,
    size: buffer.length,
    mimeType,
    createdAt,
  };
}

/**
 * Offload a base64 Data URL to storage, returning the storage path and URL.
 */
export async function saveBase64ToStorage(
  category: "slips" | "delivery" | "shops" | "locations" | "general",
  dataUrl: string,
  customFilename?: string
): Promise<StoredImageMeta> {

  const matches = dataUrl.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 Data URL");
  }

  const mimeType = matches[1] || "image/jpeg";
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  const stored = await saveImageToStorage(category, buffer, mimeType, customFilename);

  // Pre-generate WebP thumbnail asynchronously if not a QR code
  if (customFilename && !customFilename.includes("_qr") && !customFilename.includes("promptpay") && !customFilename.includes("line_qr")) {
    (async () => {
      try {
        const sharp = (await import("sharp")).default;
        const thumbBuffer = await sharp(buffer)
          .resize({ width: 350, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const dotIndex = customFilename.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? customFilename.substring(0, dotIndex) : customFilename;
        await saveImageToStorage(category, thumbBuffer, "image/webp", `${baseName}_thumb.webp`);
      } catch (e) {
        // Ignore background thumbnail generation errors
      }
    })();
  }

  return stored;
}


/**
 * Retrieve an image binary from storage by its path.
 */
export async function getImageFromStorage(
  filePath: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cleanPath = filePath.replace(/^\/+/, "");

  // 1. Try Firebase Cloud Storage bucket first if available
  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, cleanPath);
      const rawBytes = await getBytes(storageRef);
      return {
        buffer: Buffer.from(rawBytes),
        mimeType: cleanPath.endsWith(".png") ? "image/png" : "image/jpeg",
      };
    } catch (e) {
      // Fallback to Firestore storage_files
    }
  }

  // 2. Fetch from Firestore storage_files collection
  if (isFirebaseConfigured && db) {
    try {
      const docId = pathToDocId(cleanPath);
      const docRef = doc(db, "storage_files", docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.data && typeof data.data.toUint8Array === "function") {
          return {
            buffer: Buffer.from(data.data.toUint8Array()),
            mimeType: data.mimeType || "image/jpeg",
          };
        }
      }
    } catch (err) {
      console.error(`Failed to fetch image ${cleanPath} from storage_files:`, err);
    }
  }

  return null;
}

/**
 * Delete an image from storage by its path.
 */
export async function deleteImageFromStorage(filePath: string): Promise<boolean> {
  const cleanPath = filePath.replace(/^\/+/, "");
  let deleted = false;

  if (isFirebaseConfigured && db) {
    try {
      const docId = pathToDocId(cleanPath);
      await deleteDoc(doc(db, "storage_files", docId));
      deleted = true;
    } catch (e) {}
  }

  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, cleanPath);
      await deleteObject(storageRef);
      deleted = true;
    } catch (e) {}
  }

  return deleted;
}

/**
 * Security check: Verify that request originates from the VEATEC web application.
 * Protects payment slips from public unauthorized scraping/hotlinking.
 */
export function isAllowedWebappRequest(request: Request, isSecureSlip = false): boolean {
  if (!isSecureSlip) return true;

  const referer = request.headers.get("referer") || "";
  const secFetchSite = request.headers.get("sec-fetch-site") || "";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const authHeader = request.headers.get("authorization") || "";

  // 1. Authorized admin / leader headers bypass
  if (authHeader.includes("admin") || authHeader.includes("m4-admin")) {
    return true;
  }

  // 2. Browser Same-Origin / Same-Site check
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return true;
  }

  // 3. Referer domain match
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && refererUrl.host === host) return true;
      if (refererUrl.hostname.includes("vercel.app") || refererUrl.hostname.includes("localhost") || refererUrl.hostname.includes("127.0.0.1")) {
        return true;
      }
    } catch (e) {}
  }

  return false;
}
