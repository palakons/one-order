import { NextResponse } from "next/server";
import {
  getDeliveryLocations,
  saveDeliveryLocation,
  deleteDeliveryLocation,
} from "@/lib/store";

export async function GET() {
  try {
    const locations = await getDeliveryLocations();
    return NextResponse.json({ success: true, locations });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      nameEn,
      nameCn,
      shortCode,
      description,
      deskDetail,
      deskDetailEn,
      deskDetailCn,
      photoUrl,
      color,
      mapUrl,
    } = body;

    if (!name || !shortCode || !deskDetail) {
      return NextResponse.json(
        { success: false, error: "Missing required location details" },
        { status: 400 }
      );
    }

    const locationId = id || `loc-${shortCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`;

    const newLocation = {
      id: locationId,
      name,
      nameEn: nameEn || name,
      nameCn: nameCn || name,
      shortCode: shortCode.toUpperCase(),
      description: description || `จุดส่งอาหาร ${name}`,
      descriptionEn: nameEn || name,
      descriptionCn: nameCn || name,
      deskDetail,
      deskDetailEn: deskDetailEn || deskDetail,
      deskDetailCn: deskDetailCn || deskDetail,
      photoUrl:
        photoUrl ||
        "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80",
      color: color || "bg-purple-900",
      mapUrl: mapUrl ? String(mapUrl).trim() : `https://maps.google.com/?q=${encodeURIComponent(name + " VISTEC Rayong")}`,
    };

    const saved = await saveDeliveryLocation(newLocation);
    return NextResponse.json({ success: true, location: saved }, { status: 201 });
  } catch (error) {
    console.error("Failed to save location:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save location" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Location ID is required" },
        { status: 400 }
      );
    }

    const deleted = await deleteDeliveryLocation(id);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Failed to delete location:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
