import { NextResponse, connection } from "next/server";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getBatches, getShops } from "@/lib/store";
import { AutocompleteMenuItem, SanitizedMenuItem } from "@/lib/types";

// In-Memory Server-Side Cache for near-zero Firebase reads
let cachedAutocompleteItems: AutocompleteMenuItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export function invalidateAutocompleteCache() {
  cachedAutocompleteItems = null;
  cacheTimestamp = 0;
}

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const requestedShopId = searchParams.get("shopId");
    const forceFresh = searchParams.get("fresh") === "true";

    const isCacheValid =
      !forceFresh &&
      cachedAutocompleteItems !== null &&
      Date.now() - cacheTimestamp < CACHE_TTL_MS;

    let allItems: AutocompleteMenuItem[];

    if (isCacheValid && cachedAutocompleteItems) {
      allItems = cachedAutocompleteItems;
    } else {
      // 1. Fetch Sanitized Menus from Firestore
      const sanitizedMap = new Map<string, SanitizedMenuItem>();
      if (isFirebaseConfigured && db) {
        try {
          const snap = await getDocs(collection(db, "sanitized_menus"));
          snap.docs.forEach((d) => {
            const data = d.data() as SanitizedMenuItem;
            if (data.shopId && data.originalName) {
              const key = `${data.shopId}:::${data.originalName.trim().toLowerCase()}`;
              sanitizedMap.set(key, data);
            }
          });
        } catch (err) {
          console.warn("Failed to load sanitized_menus in autocomplete:", err);
        }
      }

      // 2. Fetch Batches & Aggregate Crowdsourced Orders
      const batches = await getBatches(false);
      const shops = await getShops(false);

      // Temporary map to aggregate by (shopId + sanitized dish name)
      const aggMap = new Map<
        string,
        {
          id: string;
          name: string;
          originalName: string;
          price: number;
          orderCount: number;
          totalQuantity: number;
          shopId: string;
          shopName: string;
          hasTypoCorrected: boolean;
          isShopMenu: boolean;
        }
      >();

      // A. Populate from Shop's official menuItems
      shops.forEach((shop) => {
        (shop.menuItems || []).forEach((m) => {
          const rawName = (m.name || "").trim();
          if (!rawName) return;

          const keyLookup = `${shop.id}:::${rawName.toLowerCase()}`;
          const sanitized = sanitizedMap.get(keyLookup);
          const cleanName = sanitized ? sanitized.sanitizedName.trim() : rawName;
          const hasTypo = sanitized ? sanitized.hasTypo && cleanName !== rawName : false;

          const aggKey = `${shop.id}:::${cleanName.toLowerCase()}`;
          aggMap.set(aggKey, {
            id: `official-${shop.id}-${encodeURIComponent(cleanName)}`,
            name: cleanName,
            originalName: rawName,
            price: Number(m.price) || 0,
            orderCount: 0,
            totalQuantity: 0,
            shopId: shop.id,
            shopName: shop.name,
            hasTypoCorrected: hasTypo,
            isShopMenu: true,
          });
        });
      });

      // B. Populate & Aggregate from Crowdsourced Orders
      batches.forEach((b) => {
        const shop = shops.find((s) => s.id === b.shopId) || b.shop;
        const shopId = shop?.id || b.shopId || "unknown";
        const shopName = shop?.name || "ร้านอาหาร";

        (b.orders || []).forEach((ord) => {
          if (ord.deletedAt) return;
          (ord.items || []).forEach((it) => {
            const rawName = (it.name || "").trim();
            if (!rawName) return;

            const keyLookup = `${shopId}:::${rawName.toLowerCase()}`;
            const sanitized = sanitizedMap.get(keyLookup);
            const cleanName = sanitized ? sanitized.sanitizedName.trim() : rawName;
            const hasTypo = sanitized ? sanitized.hasTypo && cleanName !== rawName : false;

            const aggKey = `${shopId}:::${cleanName.toLowerCase()}`;
            const qty = it.quantity || 1;
            const price = Number(it.price) || 0;

            const existing = aggMap.get(aggKey);
            if (existing) {
              existing.orderCount += 1;
              existing.totalQuantity += qty;
              if (price > 0) existing.price = price;
              if (hasTypo) existing.hasTypoCorrected = true;
            } else {
              aggMap.set(aggKey, {
                id: `crowd-${shopId}-${encodeURIComponent(cleanName)}`,
                name: cleanName,
                originalName: rawName,
                price: price,
                orderCount: 1,
                totalQuantity: qty,
                shopId: shopId,
                shopName: shopName,
                hasTypoCorrected: hasTypo,
                isShopMenu: false,
              });
            }
          });
        });
      });

      // Convert to array and sort by popularity (totalQuantity then orderCount)
      allItems = Array.from(aggMap.values()).sort(
        (a, b) => b.totalQuantity - a.totalQuantity || b.orderCount - a.orderCount
      );

      // Save to server-side cache
      cachedAutocompleteItems = allItems;
      cacheTimestamp = Date.now();
    }

    // Filter by shopId if provided
    let results: AutocompleteMenuItem[];
    if (requestedShopId) {
      const shopItems = allItems.filter((it) => it.shopId === requestedShopId);
      const otherItems = allItems.filter((it) => it.shopId !== requestedShopId);
      // Prioritize current shop items, then append other popular items
      results = [...shopItems, ...otherItems];
    } else {
      results = allItems;
    }

    return NextResponse.json(
      {
        success: true,
        items: results,
        total: results.length,
        cachedAt: new Date(cacheTimestamp).toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/menu-autocomplete error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load autocomplete menu" },
      { status: 500 }
    );
  }
}
