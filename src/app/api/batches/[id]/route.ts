import { NextResponse } from "next/server";
import { getBatchById, updateBatchStatus } from "@/lib/store";
import { BatchStatus } from "@/lib/types";

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
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    const updated = await updateBatchStatus(id, status as BatchStatus);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, batch: updated });
  } catch (error) {
    console.error("Failed to update batch:", error);
    return NextResponse.json({ success: false, error: "Failed to update batch" }, { status: 500 });
  }
}
