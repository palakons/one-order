import { NextResponse } from "next/server";
import { getImageFromStorage, saveImageToStorage, isAllowedWebappRequest } from "@/lib/storage";
import sharp from "sharp";


export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

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

    // Zero-Vercel-Egress: If it is a slip, redirect to a secure, timed-out V4 Presigned URL on Google Cloud Storage!
    // The image bytes flow directly from storage.googleapis.com to client (0 bytes Vercel egress).
    if (isSlip) {
      try {
        const { getPresignedDownloadUrl } = await import("@/lib/firebase-admin");
        const presignedUrl = await getPresignedDownloadUrl(fullPath, 15);
        if (presignedUrl) {
          return NextResponse.redirect(presignedUrl, {
            status: 302,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
              "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
            },
          });
        }
      } catch (adminErr) {
        console.warn("Presigned URL fallback to internal stream:", adminErr);
      }
    }

    const url = new URL(request.url);
    const thumbParam = url.searchParams.get("thumb");
    const widthParam = url.searchParams.get("w");
    const isThumbRequested = Boolean(widthParam || thumbParam === "true" || thumbParam === "1" || thumbParam === "thumb");

    // Zero-Vercel-Egress: For non-thumbnail full images (shops, delivery, locations),
    // 302 Redirect directly to Google Firebase Storage CDN!
    // Vercel only returns a 300-byte 302 header, Google pays the 100% bandwidth!
    if (!isThumbRequested) {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "one-order-af750.firebasestorage.app";
      const encodedPath = encodeURIComponent(fullPath);
      const directGoogleStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
      return NextResponse.redirect(directGoogleStorageUrl, {
        status: 302,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        },
      });
    }

    const file = await getImageFromStorage(fullPath);
    if (!file) {
      return new NextResponse("Image not found", { status: 404 });
    }


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
      // 1. Check if pre-computed thumbnail already exists in storage (Zero CPU / Zero compute overhead)
      const dotIndex = fullPath.lastIndexOf(".");
      const basePath = dotIndex !== -1 ? fullPath.substring(0, dotIndex) : fullPath;
      const thumbPath = `${basePath}_thumb.webp`;

      const existingThumb = await getImageFromStorage(thumbPath);
      if (existingThumb) {
        outputBuffer = existingThumb.buffer;
        outputMimeType = "image/webp";
      } else {
        // 2. Generate thumbnail WebP on-the-fly with sharp
        try {
          outputBuffer = await sharp(file.buffer)
            .resize({ width: requestedWidth, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          outputMimeType = "image/webp";

          // 3. Save thumbnail permanently to storage under the exact category so future requests never re-read original or re-compute!
          const category = (fullPath.split("/")[0] || "general") as "slips" | "delivery" | "shops" | "locations" | "general";
          await saveImageToStorage(category, Buffer.from(outputBuffer), "image/webp", thumbPath.split("/").pop());
        } catch (sharpErr) {
          console.warn("Sharp resizing fallback to original:", sharpErr);
          outputBuffer = file.buffer;
        }

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

