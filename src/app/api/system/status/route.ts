import { NextResponse } from "next/server";
import { getSystemStatus, checkFirestoreHealth } from "@/lib/store";

export async function GET() {
  try {
    const status = await checkFirestoreHealth();
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ success: true, status: getSystemStatus() });
  }
}
