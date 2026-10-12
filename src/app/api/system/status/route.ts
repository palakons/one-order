import { NextResponse } from "next/server";
import {
  getSystemStatus,
  checkFirestoreHealth,
  resetSystemQuota,
  resetQuotaMetrics,
  runStorageCleanup,
  getStorageMetrics,
} from "@/lib/store";

export async function GET() {
  try {
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

    if (action === "cleanup_storage") {
      const retentionDays = Number(body?.retentionDays) || 30;
      const result = await runStorageCleanup(retentionDays);
      const status = await getSystemStatus();
      return NextResponse.json({
        success: result.success,
        status,
        result,
        message: result.message,
      });
    }

    if (action === "refresh_storage") {
      const storageMetrics = await getStorageMetrics();
      const status = await getSystemStatus();
      return NextResponse.json({
        success: true,
        status: { ...status, storageMetrics },
        message: "อัปเดตสถิติพื้นที่จัดเก็บบน Google Cloud เรียบร้อยแล้ว",
      });
    }

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

    // Default action: "probe"
    const status = await checkFirestoreHealth();
    return NextResponse.json({
      success: true,
      status,
      message: "ทดสอบการเชื่อมต่อ Google Cloud Firestore และอัปเดตสถานะล่าสุดเรียบร้อยแล้ว",
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
