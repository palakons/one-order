import { NextResponse } from "next/server";
import { getBatches, createBatch, updateBatch } from "@/lib/store";
import { getBangkokDate } from "@/lib/utils";
import { sendNewBoardAnnouncement } from "@/lib/line";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const forceFresh = searchParams.get("fresh") === "true";
    const sanitize = role !== "shop" && role !== "host";
    const batches = await getBatches(sanitize, forceFresh);

    return NextResponse.json(
      { success: true, batches },
      {
        headers: {
          "Cache-Control": forceFresh
            ? "no-store, max-age=0"
            : "public, s-maxage=3, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      shopId,
      date,
      cutoffTime,
      targetMinAmount,
      notes,
      hostLineId,
      hostPhone,
      hostName,
      hostPin,
      isSelfPickup,
      buildingId,
      buildingName,
    } = body;

    const finalDate = (date || "").trim() || getBangkokDate();

    if (!shopId || !cutoffTime || !targetMinAmount) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Default hostPin to provided PIN or last 4 digits of phone
    const cleanPhone = (hostPhone || "").replace(/\D/g, "");
    const derivedPin = (hostPin || "").trim() || (cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "1234");

    const batch = await createBatch({
      shopId,
      date: finalDate,
      cutoffTime,
      targetMinAmount: Number(targetMinAmount),
      notes,
      hostLineId: (hostLineId || "").trim() || undefined,
      hostPhone: (hostPhone || "").trim() || undefined,
      hostName: (hostName || "").trim() || undefined,
      hostPin: derivedPin,
      isSelfPickup: Boolean(isSelfPickup),
      buildingId: (buildingId || "").trim() || "loc-m4",
      buildingName: (buildingName || "").trim() || "ตึก M4",
    });

    // Announce new board to LINE group (Single-card Flex or clean text)
    let lineNotified = false;
    try {
      const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "veatec.vercel.app";
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("https://"))
        ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
        : !rawHost.includes("localhost")
        ? `https://${rawHost}`
        : "https://veatec.vercel.app";

      lineNotified = await sendNewBoardAnnouncement(batch, baseUrl);
      if (lineNotified) {
        await updateBatch(batch.id, {
          boardAnnounced: true,
          boardAnnouncedAt: new Date().toISOString(),
        });
      }
    } catch (lineErr) {
      console.warn("New board LINE broadcast error:", lineErr);
    }

    return NextResponse.json({ success: true, batch, lineNotified }, { status: 201 });
  } catch (error) {
    console.error("Failed to create batch:", error);
    return NextResponse.json({ success: false, error: "Failed to create batch" }, { status: 500 });
  }
}
