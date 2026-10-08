import { NextResponse } from "next/server";
import { createOrder, getBatchById } from "@/lib/store";

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
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 });
  }
}
