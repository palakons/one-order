import { getShops, saveShop, getShopById } from "@/lib/store";
import { getBangkokDate } from "@/lib/utils";
import { Shop } from "@/lib/types";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

/**
 * Sync Google Maps Opening Hours for a Shop
 * Strict Rule: At most 1 Google Places API call per shop per day (Bangkok date).
 * Uses FieldMask to guarantee minimal/free-tier SKU usage.
 */
export async function syncShopOpeningHoursFromGoogle(shopId: string, force = false): Promise<{
  success: boolean;
  shop?: Shop;
  cached: boolean;
  message: string;
}> {
  const shop = await getShopById(shopId);
  if (!shop) {
    return { success: false, cached: false, message: "Shop not found" };
  }

  const today = getBangkokDate();

  // If already synced today and not forced, return cached data without hitting Google Places API (0 requests)
  if (!force && shop.googleLastSyncedDate === today && shop.openDays) {
    return {
      success: true,
      shop,
      cached: true,
      message: `ใช้ข้อมูลเวลาทำการจากแคชของวันนี้แล้ว (${today})`,
    };
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return {
      success: true,
      shop,
      cached: true,
      message: "GOOGLE_MAPS_API_KEY not configured, using local opening hours",
    };
  }

  try {
    let placeData: any = null;

    // 1. If we already have googlePlaceId, fetch details directly (ultra-fast & cheapest SKU)
    if (shop.googlePlaceId) {
      const res = await fetch(`https://places.googleapis.com/v1/places/${shop.googlePlaceId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "id,regularOpeningHours,currentOpeningHours",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        placeData = await res.json();
      }
    }

    // 2. If no placeId or details failed, search by name + "ระยอง"
    if (!placeData || !placeData.id) {
      const query = `${shop.name} ระยอง`;
      const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName,places.regularOpeningHours,places.currentOpeningHours",
        },
        body: JSON.stringify({ textQuery: query }),
        signal: AbortSignal.timeout(6000),
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        placeData = searchJson.places?.[0] || null;
      }
    }

    if (!placeData) {
      return {
        success: false,
        shop,
        cached: false,
        message: `ไม่พบข้อมูลร้าน "${shop.name}" บน Google Maps`,
      };
    }

    const regHours = placeData.regularOpeningHours || placeData.currentOpeningHours;
    let newOpenDays = shop.openDays || [1, 2, 3, 4, 5];

    if (regHours?.periods && Array.isArray(regHours.periods)) {
      const daysSet = new Set<number>();
      regHours.periods.forEach((p: any) => {
        if (p?.open?.day !== undefined) {
          daysSet.add(Number(p.open.day));
        }
      });
      if (daysSet.size > 0) {
        newOpenDays = Array.from(daysSet).sort((a, b) => a - b);
      }
    }

    const updatedShop: Shop = {
      ...shop,
      openDays: newOpenDays,
      googlePlaceId: placeData.id || shop.googlePlaceId,
      googleOpeningHours: {
        openNow: regHours?.openNow,
        weekdayDescriptions: regHours?.weekdayDescriptions || [],
        nextCloseTime: regHours?.nextCloseTime,
      },
      googleLastSyncedDate: today,
    };

    await saveShop(updatedShop);

    return {
      success: true,
      shop: updatedShop,
      cached: false,
      message: `ซิงก์เวลาเปิดปิดจาก Google Maps สำเร็จ (${newOpenDays.length} วันทำการ)`,
    };
  } catch (err: any) {
    console.warn(`[GooglePlaces] Sync failed for ${shop.name}:`, err);
    return {
      success: true,
      shop,
      cached: true,
      message: "ไม่สามารถเชื่อมต่อ Google Maps ได้ในขณะนี้ ใช้เวลาทำการเดิมในระบบ",
    };
  }
}
