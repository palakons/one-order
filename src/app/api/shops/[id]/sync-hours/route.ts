import { NextResponse } from "next/server";
import { syncShopOpeningHoursFromGoogle } from "@/lib/google-places";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const force = Boolean(body.force);

    const result = await syncShopOpeningHoursFromGoogle(id, force);
    return NextResponse.json({
      ...result,
      googleOpeningHours: result.shop?.googleOpeningHours,
      openDays: result.shop?.openDays,
    });
  } catch (error: any) {
    console.error("POST /api/shops/[id]/sync-hours error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync opening hours" },
      { status: 500 }
    );
  }
}
