import { NextResponse, connection } from "next/server";
import { recommendMenuWithThaiLLM } from "@/lib/thaillm";
import { getShops, getBatches } from "@/lib/store";

export async function POST(request: Request) {
  await connection();
  try {
    const body = await request.json();
    const prompt = (body.prompt || "").trim();
    const shopId = (body.shopId || "").trim();
    let shopName = (body.shopName || "").trim();
    let menuItems = Array.isArray(body.menuItems) ? body.menuItems : [];

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุความต้องการ เช่น อยากได้ แซ่บๆ ถูกๆ มีผักด้วย" },
        { status: 400 }
      );
    }

    // If menuItems not supplied by client, fetch from store
    if (menuItems.length === 0 && shopId) {
      const shops = await getShops(false);
      const targetShop = shops.find((s) => s.id === shopId);
      const disabledNames = new Set<string>();
      if (targetShop) {
        if (!shopName) shopName = targetShop.name;
        (targetShop.menuItems || []).forEach((m) => {
          if (m.isAvailable === false) {
            disabledNames.add(m.name.trim().toLowerCase());
            return;
          }
          if (m.name) {
            menuItems.push({ name: m.name, price: m.price || 0 });
          }
        });
      }

      // Also supplement with crowdsourced items for this shop (unless disabled)
      const batches = await getBatches(false);
      batches.forEach((b) => {
        if ((b.shopId || b.shop?.id) === shopId) {
          (b.orders || []).forEach((ord) => {
            if (ord.deletedAt) return;
            (ord.items || []).forEach((it) => {
              const cleanName = (it.name || "").trim().toLowerCase();
              if (cleanName && !disabledNames.has(cleanName) && !menuItems.some((m: any) => m.name.toLowerCase() === cleanName)) {
                menuItems.push({ name: it.name.trim(), price: it.price || 0 });
              }
            });
          });
        }
      });
    }

    if (menuItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ไม่พบรายการเมนูของร้านนี้ในระบบ กรุณาลองใหม่อีกครั้ง",
        },
        { status: 400 }
      );
    }

    const result = await recommendMenuWithThaiLLM({
      userPrompt: prompt,
      shopName: shopName || "ร้านอาหาร",
      shopMenus: menuItems,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/thaillm/recommend error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to get AI recommendations" },
      { status: 500 }
    );
  }
}
