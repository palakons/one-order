import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/firebase-admin";

const ALLOWED_CATEGORIES = ["slips", "delivery", "shops", "locations", "general"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, contentType = "image/jpeg", customFilename } = body;

    if (!category || !ALLOWED_CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: `Invalid contentType. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
      ? "webp"
      : "jpg";

    const filename = customFilename
      ? customFilename.replace(/[^a-zA-Z0-9._-]/g, "_")
      : `${category}_${timestamp}_${randomStr}.${ext}`;

    const filePath = `${category}/${filename}`;

    const presigned = await getPresignedUploadUrl(filePath, contentType, 10);
    if (!presigned) {
      return NextResponse.json(
        { success: false, error: "Cloud storage not available or Admin SDK unconfigured" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadUrl: presigned.uploadUrl,
      filePath: presigned.filePath,
      directUrl: presigned.directUrl,
      proxyUrl: presigned.proxyUrl,
      // For public assets (shops, delivery, locations), directUrl is immediately usable
      // For private assets (slips), proxyUrl triggers timed signed read URL redirects
      url: category === "slips" ? presigned.proxyUrl : presigned.directUrl,
    });
  } catch (error: any) {
    console.error("Presign upload route error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate presigned upload URL" },
      { status: 500 }
    );
  }
}
