import { NextResponse } from "next/server";
import { getBatchById, updateBatchStatus } from "@/lib/store";
import { BatchStatus } from "@/lib/types";
import { pushLineMessage } from "@/lib/line";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchById(id);
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
    const { status, deliveryPhotoUrl } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    const updated = await updateBatchStatus(id, status as BatchStatus, deliveryPhotoUrl);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    // Broadcast ONLY when food is delivered (COMPLETED) with photo evidence
    if (status === "COMPLETED") {
      try {
        const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "veatec.vercel.app";
        const protocol = request.headers.get("x-forwarded-proto") || "https";
        const manifestUrl = `${protocol}://${hostHeader}/shop/${updated.id}`;

        let photoUrlForLine: string | undefined = undefined;
        if (updated.deliveryPhotoUrl) {
          if (updated.deliveryPhotoUrl.startsWith("http")) {
            photoUrlForLine = updated.deliveryPhotoUrl;
          } else {
            photoUrlForLine = `${protocol}://${hostHeader}/api/batches/${updated.id}/photo`;
          }
        }

        const broadcastText = `🛵 [VEATEC @ VISTEC] อาหารมาส่งถึงโต๊ะตึก M4 แล้วครับ! ✨\n` +
          `ร้าน: ${updated.shop.name} (${updated.orders.length} กล่อง)\n` +
          `📍 วางไว้ที่โต๊ะรับอาหารชั้น 1 ตึก M4 เรียบร้อยแล้ว\n\n` +
          `📸 ดูรูปถ่ายหลักฐาน & รายชื่อกล่องของคุณ:\n${manifestUrl}\n\n` +
          `ขอให้อร่อยกับมื้ออาหารครับ/ค่ะ 🙏`;

        // Push to LINE group if configured (non-blocking)
        pushLineMessage(broadcastText, photoUrlForLine).catch((err) => {
          console.warn("Auto LINE broadcast on delivery error:", err);
        });
      } catch (err) {
        console.warn("Broadcast preparation error:", err);
      }
    }

    return NextResponse.json({ success: true, batch: updated });
  } catch (error) {
    console.error("Failed to update batch:", error);
    return NextResponse.json({ success: false, error: "Failed to update batch" }, { status: 500 });
  }
}
