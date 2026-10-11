import { NextResponse } from "next/server";
import { getBatchById, updateBatchStatus } from "@/lib/store";
import { getDropOffMapUrl } from "@/lib/locations";
import { BatchStatus } from "@/lib/types";
import { pushLineMessage, sendBatchReminderToLine } from "@/lib/line";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isPrivilegedRole =
      searchParams.get("role") === "shop" ||
      searchParams.get("role") === "leader" ||
      request.headers.get("x-view-role") === "shop" ||
      request.headers.get("x-view-role") === "leader";
    const forceFresh = searchParams.get("fresh") === "true";

    // Sanitize unless specifically requested by shop or leader role
    const batch = await getBatchById(id, !isPrivilegedRole, forceFresh);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 400 });
    }

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error("Failed to fetch batch:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch batch" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, deliveryPhotoUrl, hostPin, isSelfPickup, sentToShopAt } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    // Light Security Check: If batch has a hostPin, verify authorization for host actions (close/order)
    const existing = await getBatchById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    if (existing.hostPin && (status === "ORDERED" || status === "CLOSED" || status === "LOCKED" || status === "CANCELLED")) {
      const authHeader = request.headers.get("authorization") || "";
      const isAdmin = authHeader.includes("m4-admin") || authHeader.includes("admin");
      if (!isAdmin && hostPin !== existing.hostPin) {
        return NextResponse.json({ success: false, error: "PIN หัวหน้าตี้ไม่ถูกต้อง (เฉพาะผู้เปิดตี้เท่านั้น)" }, { status: 403 });
      }
    }

    const updated = await updateBatchStatus(id, status as BatchStatus, deliveryPhotoUrl, {
      isSelfPickup: isSelfPickup !== undefined ? Boolean(isSelfPickup) : undefined,
      sentToShopAt,
    });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    // Broadcast ONLY when food is delivered (COMPLETED) with photo evidence
    let lineNotified = false;
    let lineError: string | null = null;
    if (status === "COMPLETED") {
      try {
        const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "veatec.vercel.app";
        // Always enforce public https for LINE API callbacks and links
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("https://"))
          ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
          : !rawHost.includes("localhost")
          ? `https://${rawHost}`
          : "https://veatec.vercel.app";

        // Direct students to the safe public delivery page instead of internal merchant sheet!
        const deliveryUrl = `${baseUrl}/delivery/${updated.id}`;

        let photoUrlForLine: string | undefined = undefined;
        if (updated.deliveryPhotoUrl) {
          if (updated.deliveryPhotoUrl.startsWith("https://")) {
            photoUrlForLine = updated.deliveryPhotoUrl;
          } else if (!updated.deliveryPhotoUrl.startsWith("http://")) {
            photoUrlForLine = `${baseUrl}/api/batches/${updated.id}/photo`;
          }
        }

        const bldgName = updated.buildingName || "ตึก M4";
        const dropOffMap = getDropOffMapUrl(updated);
        const orderCount = (updated.orders || []).filter((o) => !o.deletedAt).length;
        const broadcastText = `🛵 [VEATEC @ VISTEC] อาหารมาส่งถึงโต๊ะ${bldgName} แล้วครับ! ✨\n` +
          `ร้าน: ${updated.shop.name} (${orderCount} กล่อง)\n` +
          `📍 วางไว้ที่โต๊ะรับอาหารชั้น 1 ${bldgName} เรียบร้อยแล้ว\n` +
          (dropOffMap ? `🗺️ แผนที่จุดส่ง: ${dropOffMap}\n` : "") +
          `\n📸 ดูรูปถ่ายหลักฐาน & รายชื่อกล่องของคุณ:\n${deliveryUrl}\n\n` +
          `ขอให้อร่อยกับมื้ออาหารครับ/ค่ะ 🙏`;

        // Push to LINE group - MUST AWAIT because on Vercel Serverless unawaited promises terminate when response returns!
        lineNotified = await pushLineMessage(broadcastText, photoUrlForLine);
        console.log(`[Delivery] LINE broadcast for batch ${updated.id}: ${lineNotified ? "SUCCESS" : "NO_TARGET_OR_FAILED"}`);
      } catch (err: any) {
        console.error("Auto LINE broadcast on delivery error:", err);
        lineError = err?.message || String(err);
      }
    }

    return NextResponse.json({ success: true, batch: updated, lineNotified, lineError });
  } catch (error) {
    console.error("Failed to update batch:", error);
    return NextResponse.json({ success: false, error: "Failed to update batch" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action || "remind";

    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "veatec.vercel.app";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("https://"))
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : !rawHost.includes("localhost")
      ? `https://${rawHost}`
      : "https://veatec.vercel.app";

    if (action === "remind" || action === "push_summary") {
      const result = await sendBatchReminderToLine(id, appUrl);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Batch action error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute action" },
      { status: 500 }
    );
  }
}
