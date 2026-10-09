import { NextResponse } from "next/server";
import { getSuggestions, createSuggestion, deleteSuggestion } from "@/lib/store";

export async function GET() {
  try {
    const suggestions = await getSuggestions();
    return NextResponse.json({ success: true, suggestions });
  } catch (err: any) {
    console.error("GET /api/suggestions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contact, category, message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุข้อความข้อเสนอแนะ" },
        { status: 400 }
      );
    }

    const suggestion = await createSuggestion({
      name: name || "",
      contact: contact || "",
      category: category || "OTHER",
      message: message.trim(),
    });

    return NextResponse.json({ success: true, suggestion });
  } catch (err: any) {
    console.error("POST /api/suggestions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing suggestion ID" }, { status: 400 });
    }

    await deleteSuggestion(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/suggestions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
