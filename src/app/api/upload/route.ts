import { NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process and compress image with sharp (natively handles HEIF/HEIC, JPEG, PNG, WEBP, etc.)
    // .rotate() automatically handles EXIF orientation from mobile phone cameras
    const compressedBuffer = await sharp(buffer)
      .rotate()
      .resize(900, 900, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      dataUrl,
      size: compressedBuffer.length,
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
