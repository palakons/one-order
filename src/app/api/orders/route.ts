import { NextResponse } from "next/server";
import { createOrder, getBatchById, getBatches } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 });
    }

    const cleanSearch = phone.trim().replace(/\D/g, "");
    if (cleanSearch.length < 9) {
      return NextResponse.json({ success: false, error: "Valid 9-10 digit phone number required" }, { status: 400 });
    }

    // Get unsanitized batches for direct matching
    const rawBatches = await getBatches(false);
    const userOrders: Array<any> = [];

    for (const b of rawBatches) {
      for (const ord of b.orders || []) {
        const ordDigits = (ord.customerPhone || "").replace(/\D/g, "");
        if (
          ordDigits === cleanSearch ||
          (ordDigits.length >= 9 && cleanSearch.endsWith(ordDigits)) ||
          (cleanSearch.length >= 9 && ordDigits.endsWith(cleanSearch))
        ) {
          userOrders.push({
            orderId: ord.id,
            batchId: b.id,
            shopName: b.shop.name,
            date: b.date,
            orderNumber: ord.orderNumber,
            customerName: ord.customerName,
            customerPhone: ord.customerPhone,
            locationId: ord.locationId,
            totalAmount: ord.totalAmount,
            boxLabel: ord.boxLabel,
            slipImageUrl: ord.slipImageUrl,
            items: ord.items,
            createdAt: ord.createdAt,
            batchStatus: b.status,
            deliveryPhotoUrl: b.deliveryPhotoUrl,
          });
        }
      }
    }

    return NextResponse.json({ success: true, orders: userOrders });
  } catch (error: any) {
    console.error("Failed to lookup orders:", error);
    return NextResponse.json({ success: false, error: "Failed to lookup orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      batchId,
      customerName,
      customerPhone,
      customerLineId,
      locationId = "loc-v",
      items,
      totalAmount,
      slipImageUrl,
      slipTransRef,
      slipBankCode,
      slipBankName,
      isSlipVerified,
    } = body;

    const displayName = (customerName || customerLineId || "").trim();

    if (!batchId || !displayName || !items || !items.length || !totalAmount) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกชื่อหรือ LINE ID และเลือกรายการอาหาร" },
        { status: 400 }
      );
    }

    if (!slipImageUrl) {
      return NextResponse.json(
        { success: false, error: "กรุณาแนบสลิปโอนเงินก่อนยืนยันออเดอร์ (Force Transfer)" },
        { status: 400 }
      );
    }

    const batch = await getBatchById(batchId, false);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "รอบนี้ปิดรับออเดอร์แล้ว" },
        { status: 400 }
      );
    }

    // Anti-duplicate slip check (by BOT TransRef)
    if (slipTransRef && batch.orders) {
      const isDuplicate = batch.orders.some(
        (o) => o.slipTransRef === slipTransRef && !o.deletedAt
      );
      if (isDuplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `สลิปรหัสอ้างอิง ${slipTransRef} นี้ถูกใช้งานไปแล้วในรอบนี้ (ไม่สามารถใช้สลิปซ้ำได้)`,
          },
          { status: 400 }
        );
      }
    }

    const order = await createOrder({
      batchId,
      customerName: displayName,
      customerPhone: (customerPhone || "").trim(),
      customerLineId: (customerLineId || "").trim(),
      locationId,
      items,
      totalAmount: Number(totalAmount),
      slipImageUrl,
      slipTransRef,
      slipBankCode,
      slipBankName,
      isSlipVerified,
    });

    const updatedBatch = await getBatchById(batchId);

    return NextResponse.json(
      {
        success: true,
        order,
        batch: updatedBatch,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");
    const reason = searchParams.get("reason") || "Cancelled by host";
    const by = searchParams.get("by") || "Host";

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const { deleteOrder } = await import("@/lib/store");
    const ok = await deleteOrder(orderId, reason, by);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Order cancelled with audit trace" });
  } catch (error: any) {
    console.error("Failed to delete order:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete order" },
      { status: 500 }
    );
  }
}

