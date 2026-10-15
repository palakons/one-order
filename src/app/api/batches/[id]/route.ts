import { NextResponse } from "next/server";
import { getBatchById, updateBatchStatus, updateBatch } from "@/lib/store";
import { getDropOffMapUrl } from "@/lib/locations";
import { BatchStatus } from "@/lib/types";
import { pushLineMessage, sendBatchReminderToLine, sendDeliveryAnnouncement } from "@/lib/line";

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
    const { status, deliveryPhotoUrl, hostPin, isSelfPickup, sentToShopAt, pendingMessage, isTest } = body;

    const existing = await getBatchById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    // If only updating isTest flag or other batch fields without status change:
    const targetStatus = status || existing.status;

    if (!targetStatus) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    if (existing.hostPin && (targetStatus === "ORDERED" || targetStatus === "CLOSED" || targetStatus === "LOCKED" || targetStatus === "CANCELLED" || targetStatus === "PENDING")) {
      const authHeader = request.headers.get("authorization") || "";
      const isAdmin = authHeader.includes("m4-admin") || authHeader.includes("admin");
      if (!isAdmin && hostPin && hostPin !== existing.hostPin) {
        return NextResponse.json({ success: false, error: "PIN หัวหน้าตี้ไม่ถูกต้อง (เฉพาะผู้เปิดตี้เท่านั้น)" }, { status: 403 });
      }
    }

    const updated = await updateBatchStatus(id, targetStatus as BatchStatus, deliveryPhotoUrl, {
      isSelfPickup: isSelfPickup !== undefined ? Boolean(isSelfPickup) : undefined,
      sentToShopAt,
      pendingMessage: pendingMessage !== undefined ? String(pendingMessage) : undefined,
      isTest: isTest !== undefined ? Boolean(isTest) : undefined,
    });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    // Broadcast ONLY when food is delivered (COMPLETED)
    // Suppress LINE Broadcast if batch is marked as a Test board (isTest: true)
    let lineNotified = false;
    let lineError: string | null = null;
    const isFirstTimeDelivered =
      targetStatus === "COMPLETED" &&
      existing.status !== "COMPLETED" &&
      !existing.deliveryBroadcastSent &&
      !updated.isTest;

    if (isFirstTimeDelivered) {
      try {
        const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "veatec.vercel.app";
        // Always enforce public https for LINE API callbacks and links
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("https://"))
          ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
          : !rawHost.includes("localhost")
          ? `https://${rawHost}`
          : "https://veatec.vercel.app";

        let photoUrlForLine: string | undefined = undefined;
        if (updated.deliveryPhotoUrl) {
          if (updated.deliveryPhotoUrl.startsWith("https://")) {
            photoUrlForLine = updated.deliveryPhotoUrl;
          } else if (updated.deliveryPhotoUrl.startsWith("/")) {
            photoUrlForLine = `${baseUrl}${updated.deliveryPhotoUrl}`;
          } else if (updated.deliveryPhotoUrl.startsWith("data:image/")) {
            photoUrlForLine = `${baseUrl}/api/batches/${updated.id}/photo`;
          } else {
            photoUrlForLine = `${baseUrl}/api/batches/${updated.id}/photo`;
          }
        } else if (updated.deliveryPhotoPath) {
          photoUrlForLine = `${baseUrl}/api/images/${updated.deliveryPhotoPath.replace(/^\/+/, "")}`;
        }

        // Send exactly 1 card to the LINE group (Flex message with embedded photo or clean single text message)
        lineNotified = await sendDeliveryAnnouncement(updated, baseUrl, photoUrlForLine);
        console.log(`[Delivery] LINE broadcast for batch ${updated.id}: ${lineNotified ? "SUCCESS" : "NO_TARGET_OR_FAILED"}`);

        if (lineNotified) {
          await updateBatch(updated.id, {
            deliveryBroadcastSent: true,
            deliveryBroadcastSentAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.error("Auto LINE broadcast on delivery error:", err);
        lineError = err?.message || String(err);
      }
    } else if (status === "COMPLETED") {
      console.log(`[Delivery] Batch ${updated.id} already broadcasted previously, skipping duplicate LINE message`);
      lineNotified = true;
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
