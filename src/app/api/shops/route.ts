import { NextResponse } from "next/server";
import { getShops, saveShop, deleteShop, getShopById } from "@/lib/store";

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
      gmapUrl,
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
      cuisine: cuisine || "อาหารจานด่วน",
      description: description || "",
      phone,
      lineId: lineId || "",
      gmapUrl: gmapUrl || `https://maps.google.com/?q=${encodeURIComponent(name + " ระยอง")}`,
      promptpayNumber,
      promptpayAccountName,
      promptpayQrUrl:
        promptpayQrUrl ||
        `https://promptpay.io/${promptpayNumber}.png`,
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Shop ID is required" }, { status: 400 });
    }

    const existingShop = await getShopById(id);
    const updatedShop = {
      ...(existingShop || {}),
      ...body,
      id,
      minDeliveryAmount: Number(body.minDeliveryAmount) || existingShop?.minDeliveryAmount || 200,
      menuItems: body.menuItems || existingShop?.menuItems || [],
    };

    if (body.promptpayNumber && !body.promptpayQrUrl) {
      updatedShop.promptpayQrUrl = `https://promptpay.io/${body.promptpayNumber}.png`;
    }

    const saved = await saveShop(updatedShop);
    return NextResponse.json({ success: true, shop: saved });
  } catch (error) {
    console.error("Failed to update shop:", error);
    return NextResponse.json({ success: false, error: "Failed to update shop" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Shop ID is required" }, { status: 400 });
    }

    const deleted = await deleteShop(id);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Failed to delete shop:", error);
    return NextResponse.json({ success: false, error: "Failed to delete shop" }, { status: 500 });
  }
}
