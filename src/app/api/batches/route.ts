import { NextResponse } from "next/server";
import { getBatches, createBatch } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const sanitize = role !== "shop" && role !== "host";
    const batches = await getBatches(sanitize);
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
      buildingId,
      buildingName,
    } = body;

    if (!shopId || !date || !cutoffTime || !targetMinAmount) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const batch = await createBatch({
      shopId,
      date,
      cutoffTime,
      targetMinAmount: Number(targetMinAmount),
      notes,
      hostLineId: (hostLineId || "").trim() || undefined,
      hostPhone: (hostPhone || "").trim() || undefined,
      hostName: (hostName || "").trim() || undefined,
      buildingId: (buildingId || "").trim() || "loc-m4",
      buildingName: (buildingName || "").trim() || "ตึก M4",
    });

    return NextResponse.json({ success: true, batch }, { status: 201 });
  } catch (error) {
    console.error("Failed to create batch:", error);
    return NextResponse.json({ success: false, error: "Failed to create batch" }, { status: 500 });
  }
}
