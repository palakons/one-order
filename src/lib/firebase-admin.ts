import { initializeApp, cert, getApps, getApp, App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!privateKey || !clientEmail || !projectId) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    return adminApp;
  } catch (err) {
    console.warn("Failed to initialize Firebase Admin SDK:", err);
    return null;
  }
}

/**
 * Generates a Google Cloud Storage V4 Presigned Read URL (timed-out link).
 * When accessed, the client downloads DIRECTLY from storage.googleapis.com
 * bypasses Vercel servers entirely, using 0 bytes of Vercel bandwidth!
 * 
 * @param filePath Path inside the bucket (e.g., "slips/slip_123.jpg")
 * @param expiresInMinutes Duration before the link cryptographically expires (default: 15 mins)
 */
export async function getPresignedDownloadUrl(
  filePath: string,
  expiresInMinutes = 15
): Promise<string | null> {
  const app = getAdminApp();
  if (!app) return null;

  try {
    const bucket = getStorage(app).bucket();
    const cleanPath = filePath.replace(/^\/+/, "");
    const file = bucket.file(cleanPath);

    // Check if file exists in the bucket
    const [exists] = await file.exists();
    if (!exists) return null;

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return signedUrl;
  } catch (err) {
    console.warn(`Failed to generate Presigned URL for ${filePath}:`, err);
    return null;
  }
}
