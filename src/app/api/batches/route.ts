import { NextResponse } from "next/server";
import { getBatches, createBatch } from "@/lib/store";
import { getBangkokDate } from "@/lib/utils";
import { checkAndDispatchCutoffReminders } from "@/lib/line";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const forceFresh = searchParams.get("fresh") === "true";
    const sanitize = role !== "shop" && role !== "host";
    const batches = await getBatches(sanitize, forceFresh);

    // Trigger non-blocking cutoff reminder check in the background
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "veatec.vercel.app";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    checkAndDispatchCutoffReminders(`${protocol}://${hostHeader}`).catch(() => {});

    return NextResponse.json({ success: true, batches });
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

    return NextResponse.json({ success: true, batch }, { status: 201 });
  } catch (error) {
    console.error("Failed to create batch:", error);
    return NextResponse.json({ success: false, error: "Failed to create batch" }, { status: 500 });
  }
}
