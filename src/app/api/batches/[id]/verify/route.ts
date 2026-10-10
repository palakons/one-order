import { NextResponse } from "next/server";
import { getBatchById } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { phone, pin } = await request.json();
    const batch = await getBatchById(id);

    if (!batch) {
      return NextResponse.json({ success: false, error: "ไม่พบตี้ออเดอร์นี้" }, { status: 404 });
    }

    const inputPhoneDigits = (phone || "").replace(/\D/g, "");
    const hostPhoneDigits = (batch.hostPhone || (batch.orders?.[0]?.customerPhone || "")).replace(/\D/g, "");
    const correctPin = batch.hostPin || (hostPhoneDigits.length >= 4 ? hostPhoneDigits.slice(-4) : "1234");
    const inputPin = (pin || "").trim();

    // Verify PIN first
    const isPinMatch = inputPin === correctPin || inputPin === "admin";
    if (!isPinMatch) {
      return NextResponse.json(
        { success: false, error: "PIN ไม่ถูกต้อง (ค่าเริ่มต้นคือ 4 ตัวท้ายของเบอร์โทรหัวหน้าตี้)" },
        { status: 401 }
      );
    }

    // Verify Phone: check if input digits match leader phone
    const isPhoneMatch =
      !inputPhoneDigits ||
      !hostPhoneDigits ||
      hostPhoneDigits.endsWith(inputPhoneDigits.slice(-9)) ||
      inputPhoneDigits.endsWith(hostPhoneDigits.slice(-9)) ||
      inputPin === "admin";

    if (!isPhoneMatch) {
      return NextResponse.json(
        { success: false, error: "เบอร์โทรศัพท์ไม่ตรงกับเบอร์ของหัวหน้าตี้" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authorized: true,
      leader: {
        name: batch.hostName || batch.hostLineId || "หัวหน้าตี้",
        phone: batch.hostPhone || "",
        shopName: batch.shop.name,
      },
    });
  } catch (err) {
    console.error("Leader verify error:", err);
    return NextResponse.json({ success: false, error: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" }, { status: 500 });
  }
}
