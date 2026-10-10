import { NextResponse } from "next/server";
import {
  getSystemStatus,
  checkFirestoreHealth,
  resetSystemQuota,
  resetQuotaMetrics,
  syncFirestoreToFallback,
  getFallbackDatabase,
} from "@/lib/store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("export") === "true") {
      const dbData = await getFallbackDatabase();
      const filename = `veatec-store-backup-${new Date().toISOString().split("T")[0]}.json`;
      return new NextResponse(JSON.stringify(dbData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const status = await getSystemStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "probe";

    if (action === "reset_metrics") {
      await resetQuotaMetrics();
      const status = await getSystemStatus();
      return NextResponse.json({
        success: true,
        status,
        message: "รีเซ็ตตัวนับ Request รายวันเรียบร้อยแล้ว",
      });
    }

    if (action === "reset_quota_flag") {
      const status = await resetSystemQuota();
      return NextResponse.json({
        success: true,
        status,
        message: "รีเซ็ตสถานะ Quota เป็นปกติเรียบร้อยแล้ว",
      });
    }

    if (action === "sync_to_fallback") {
      const result = await syncFirestoreToFallback();
      const status = await getSystemStatus();
      return NextResponse.json({
        success: result.success,
        status,
        result,
        message: result.message || result.error,
      });
    }

    // Default action: "probe"
    const status = await checkFirestoreHealth();
    return NextResponse.json({
      success: true,
      status,
      message: "ทดสอบการเชื่อมต่อและอัปเดตสถานะล่าสุดเรียบร้อยแล้ว",
    });
  } catch (error: any) {
    const status = await getSystemStatus();
    return NextResponse.json({
      success: false,
      status,
      error: error?.message || "เกิดข้อผิดพลาดในการตรวจสอบสถานะ",
    });
  }
}
