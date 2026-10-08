import { NextResponse } from "next/server";
import { getBatchById } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchById(id);

    if (!batch || !batch.deliveryPhotoUrl) {
      return new NextResponse("Delivery photo not found", { status: 404 });
    }

    const photo = batch.deliveryPhotoUrl;

    // If it's already an external HTTP/HTTPS URL
    if (photo.startsWith("http://") || photo.startsWith("https://")) {
      return NextResponse.redirect(photo);
    }

    // If it's a data URI (e.g. data:image/jpeg;base64,...)
    const matches = photo.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse("Invalid image format", { status: 400 });
    }

    const mimeType = matches[1] || "image/jpeg";
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    console.error("Photo endpoint error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
