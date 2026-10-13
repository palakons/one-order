import { NextResponse } from "next/server";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { SanitizedMenuItem } from "@/lib/types";
import {
  sanitizeMenuNamesWithThaiLLM,
  sanitizeSingleMenuNameWithThaiLLM,
} from "@/lib/thaillm";

function getSanitizedDocId(shopId: string, originalName: string): string {
  const hex = Buffer.from(originalName.trim()).toString("hex");
  return `${shopId}___${hex}`;
}

export async function GET() {
  try {
    if (!isFirebaseConfigured || !db) {
      return NextResponse.json({ success: true, items: [] });
    }

    const snap = await getDocs(collection(db, "sanitized_menus"));
    const items: SanitizedMenuItem[] = snap.docs.map((d) => d.data() as SanitizedMenuItem);

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error("GET /api/menu-sanitizer error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch sanitized menus" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || "sanitize";

    // Action 1: Manual update of a sanitized menu name
    if (action === "update_manual") {
      const { id, sanitizedName } = body;
      if (!id || !sanitizedName) {
        return NextResponse.json(
          { success: false, error: "Missing id or sanitizedName" },
          { status: 400 }
        );
      }

      if (isFirebaseConfigured && db) {
        await setDoc(
          doc(db, "sanitized_menus", id),
          {
            sanitizedName: sanitizedName.trim(),
            hasTypo: body.originalName ? body.originalName.trim() !== sanitizedName.trim() : true,
            source: "manual",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return NextResponse.json({ success: true, id, sanitizedName: sanitizedName.trim() });
    }

    // Action 2: Sanitize a single dish
    if (action === "sanitize_single") {
      const { shopId, shopName, originalName, amount = 1 } = body;
      if (!shopId || !originalName) {
        return NextResponse.json(
          { success: false, error: "Missing shopId or originalName" },
          { status: 400 }
        );
      }

      const sanitizedName = await sanitizeSingleMenuNameWithThaiLLM(originalName);
      const hasTypo = sanitizedName.trim() !== originalName.trim();
      const id = getSanitizedDocId(shopId, originalName);

      const record: SanitizedMenuItem = {
        id,
        shopId,
        shopName: shopName || "",
        originalName: originalName.trim(),
        sanitizedName: sanitizedName.trim(),
        amount: Number(amount) || 1,
        hasTypo,
        source: "thaillm",
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, "sanitized_menus", id), record, { merge: true });
      }

      return NextResponse.json({ success: true, item: record });
    }

    // Action 3: Batch sanitize multiple dishes
    const itemsToSanitize: Array<{
      shopId: string;
      shopName: string;
      originalName: string;
      amount: number;
    }> = body.items || [];

    if (!Array.isArray(itemsToSanitize) || itemsToSanitize.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items provided for sanitization" },
        { status: 400 }
      );
    }

    // Extract unique dish names for ThaiLLM
    const uniqueDishNames = Array.from(
      new Set(itemsToSanitize.map((i) => i.originalName.trim()))
    ).filter(Boolean);

    // Call ThaiLLM
    const sanitizedMap = await sanitizeMenuNamesWithThaiLLM(uniqueDishNames);

    // Construct records and save to Firestore
    const savedRecords: SanitizedMenuItem[] = [];

    for (const it of itemsToSanitize) {
      const original = it.originalName.trim();
      const sanitized = sanitizedMap[original] || original;
      const hasTypo = sanitized !== original;
      const id = getSanitizedDocId(it.shopId, original);

      const record: SanitizedMenuItem = {
        id,
        shopId: it.shopId,
        shopName: it.shopName || "",
        originalName: original,
        sanitizedName: sanitized,
        amount: it.amount || 1,
        hasTypo,
        source: "thaillm",
        updatedAt: new Date().toISOString(),
      };

      savedRecords.push(record);

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, "sanitized_menus", id), record, { merge: true });
      }
    }

    return NextResponse.json({
      success: true,
      items: savedRecords,
      totalProcessed: savedRecords.length,
      typosCount: savedRecords.filter((r) => r.hasTypo).length,
    });
  } catch (err: any) {
    console.error("POST /api/menu-sanitizer error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to sanitize menus" },
      { status: 500 }
    );
  }
}
