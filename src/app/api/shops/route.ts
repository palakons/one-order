import { NextResponse } from "next/server";
import { getShops, saveShop } from "@/lib/store";

export async function GET() {
  try {
    const shops = await getShops();
    return NextResponse.json({ success: true, shops });
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch shops" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      nameEn,
      cuisine,
      description,
      phone,
      lineId,
      promptpayNumber,
      promptpayAccountName,
      promptpayQrUrl,
      menuImageUrl,
      minDeliveryAmount,
      defaultCutoffTime,
      menuItems,
    } = body;

    if (!name || !phone || !promptpayNumber || !promptpayAccountName) {
      return NextResponse.json(
        { success: false, error: "Missing required shop details" },
        { status: 400 }
      );
    }

    const newShop = {
      id: `shop-${Date.now()}`,
      name,
      nameEn,
      cuisine: cuisine || "Street Food",
      description: description || "",
      phone,
      lineId: lineId || "",
      promptpayNumber,
      promptpayAccountName,
      promptpayQrUrl:
        promptpayQrUrl ||
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${promptpayNumber}`,
      menuImageUrl: menuImageUrl || "",
      minDeliveryAmount: Number(minDeliveryAmount) || 200,
      defaultCutoffTime: defaultCutoffTime || "11:15",
      menuItems: menuItems || [],
    };

    const saved = await saveShop(newShop);
    return NextResponse.json({ success: true, shop: saved }, { status: 201 });
  } catch (error) {
    console.error("Failed to save shop:", error);
    return NextResponse.json({ success: false, error: "Failed to save shop" }, { status: 500 });
  }
}
