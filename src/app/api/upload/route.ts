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

    // Process and compress image with sharp (convert to modern, highly compressed WebP)
    // .rotate() automatically handles EXIF orientation from mobile phone cameras
    const fullWebpBuffer = await sharp(buffer)
      .rotate()
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbWebpBuffer = await sharp(buffer)
      .rotate()
      .resize(350, 350, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 7);
    const baseName = `${category}_${timestamp}_${randomStr}`;

    // Store both full image and thumbnail directly in storage
    const stored = await saveImageToStorage(category, fullWebpBuffer, "image/webp", `${baseName}.webp`);
    const storedThumb = await saveImageToStorage(category, thumbWebpBuffer, "image/webp", `${baseName}_thumb.webp`);

    return NextResponse.json({
      success: true,
      path: stored.path,
      url: stored.url,
      thumbnailUrl: storedThumb.url,
      size: stored.size,
      thumbSize: storedThumb.size,
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
