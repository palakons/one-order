import { NextResponse } from "next/server";
import { craftAnnouncementWithThaiLLM } from "@/lib/thaillm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      shopName,
      situation,
      rawNote,
      batchStatus,
      isSentToShop,
      buildingName,
      totalOrders,
      totalBoxes,
      length,
      tone,
    } = body;

    if (!shopName) {
      return NextResponse.json({ success: false, error: "shopName is required" }, { status: 400 });
    }

    const validLengths = ["extreme_short", "brief", "medium", "long"];
    const validTones = ["official", "casual", "friendly", "extreme_friendly"];

    const result = await craftAnnouncementWithThaiLLM({
      shopName: String(shopName),
      situation: situation ? String(situation) : undefined,
      rawNote: rawNote ? String(rawNote) : undefined,
      batchStatus: batchStatus ? String(batchStatus) : undefined,
      isSentToShop: typeof isSentToShop === "boolean" ? isSentToShop : undefined,
      buildingName: buildingName ? String(buildingName) : undefined,
      totalOrders: typeof totalOrders === "number" ? totalOrders : undefined,
      totalBoxes: typeof totalBoxes === "number" ? totalBoxes : undefined,
      length: validLengths.includes(length) ? length : "brief",
      tone: validTones.includes(tone) ? tone : "official",
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/thaillm/craft error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to craft announcement" },
      { status: 500 }
    );
  }
}
