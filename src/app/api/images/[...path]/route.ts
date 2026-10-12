import { NextResponse } from "next/server";
import { getImageFromStorage, isAllowedWebappRequest } from "@/lib/storage";

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

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": file.buffer.length.toString(),
        "Cache-Control": isSlip
          ? "private, no-transform, max-age=3600"
          : "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    console.error("Image route error:", err);
    return new NextResponse("Failed to retrieve image", { status: 500 });
  }
}
