import { NextResponse } from "next/server";
import { getImageFromStorage, isAllowedWebappRequest } from "@/lib/storage";
import sharp from "sharp";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path || !path.length) {
      return new NextResponse("Image path required", { status: 400 });
    }

    const fullPath = path.join("/");
    const isSlip = fullPath.startsWith("slips/");

    // Security Gate: Ensure payment slips are ONLY accessible through the webapp
    if (isSlip && !isAllowedWebappRequest(request, true)) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: Slips are private and only viewable within the VEATEC web application." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const file = await getImageFromStorage(fullPath);
    if (!file) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const url = new URL(request.url);
    const thumbParam = url.searchParams.get("thumb");
    const widthParam = url.searchParams.get("w");

    // Check if thumbnail/resizing is requested
    // If thumb=true or thumb=1 or w is specified (e.g. w=350)
    let requestedWidth: number | null = null;
    if (widthParam) {
      const parsed = parseInt(widthParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 1200) {
        requestedWidth = parsed;
      }
    } else if (thumbParam === "true" || thumbParam === "1" || thumbParam === "thumb") {
      requestedWidth = 350; // standard default thumbnail width
    }

    let outputBuffer: Buffer | Uint8Array = file.buffer;
    let outputMimeType = file.mimeType;

    if (requestedWidth && !fullPath.includes("_qr") && !fullPath.includes("promptpay") && !fullPath.includes("line_qr")) {
      try {
        outputBuffer = await sharp(file.buffer)
          .resize({ width: requestedWidth, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        outputMimeType = "image/webp";
      } catch (sharpErr) {
        console.warn("Sharp resizing fallback to original:", sharpErr);
        outputBuffer = file.buffer;
      }
    }

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": outputMimeType,
        "Content-Length": outputBuffer.length.toString(),
        "Cache-Control": isSlip
          ? "private, max-age=86400, stale-while-revalidate=86400"
          : "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("Image route error:", err);
    return new NextResponse("Failed to retrieve image", { status: 500 });
  }
}

