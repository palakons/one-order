import { NextResponse } from "next/server";
import sharp from "sharp";
import { saveImageToStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const categoryRaw = (formData.get("category") as string) || "slips";
    const category = (["slips", "delivery", "shops", "general"].includes(categoryRaw)
      ? categoryRaw
      : "slips") as "slips" | "delivery" | "shops" | "general";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process and compress image with sharp (natively handles HEIF/HEIC, JPEG, PNG, WEBP, etc.)
    // .rotate() automatically handles EXIF orientation from mobile phone cameras
    const compressedBuffer = await sharp(buffer)
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();

    // Store binary in dedicated storage (offloading from main Firestore documents)
    const stored = await saveImageToStorage(category, compressedBuffer, "image/jpeg", file.name);

    // Also supply temporary dataUrl for instant in-memory preview if needed
    const dataUrl = `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      path: stored.path,
      url: stored.url,
      dataUrl,
      size: stored.size,
      name: file.name,
    });
  } catch (error: any) {
    console.error("Server image upload/compression error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process image" },
      { status: 500 }
    );
  }
}
