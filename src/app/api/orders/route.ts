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
    const { batchId, customerName, customerPhone, locationId, items, totalAmount, slipImageUrl } = body;

    if (!batchId || !customerName || !customerPhone || !locationId || !items || !items.length || !totalAmount) {
      return NextResponse.json(
        { success: false, error: "Please fill all required fields and add at least one item." },
        { status: 400 }
      );
    }

    if (!slipImageUrl) {
      return NextResponse.json(
        { success: false, error: "Payment slip upload is required before placing the order." },
        { status: 400 }
      );
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "This batch is already closed for orders." },
        { status: 400 }
      );
    }

    const order = await createOrder({
      batchId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      locationId,
      items,
      totalAmount: Number(totalAmount),
      slipImageUrl,
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
