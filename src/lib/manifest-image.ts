import QRCode from "qrcode";
import { BatchWithDetails, Order } from "./types";
import { getLocationForBatch, getDropOffMapUrl } from "./locations";

/**
 * Cross-browser rounded rectangle helper for HTML5 Canvas
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

/**
 * Resilient image loader that NEVER rejects, preventing canvas crashes.
 * Resolves null on CORS errors or timeouts.
 */
function loadSlipImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      console.warn("Slip image load timed out, falling back to receipt card:", src.slice(0, 50));
      resolve(null);
    }, 4000);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      console.warn("Slip image failed to load / CORS blocked, using receipt card:", src.slice(0, 50));
      resolve(null);
    };

    // Only set crossOrigin for remote HTTP(S) URLs to avoid Safari data-URI bugs
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.src = src;
  });
}

/**
 * Generates "The One Long Manifest Image" containing:
 * 1. Top destination (M4 Delivery Table) & shop order header
 * 2. High-contrast Cooking Checklist with box numbers, items & LINE IDs
 * 3. 100% of all transfer slips (or verified BOT receipt cards) stacked in order
 */
export async function generateOneLongManifestImage(
  batch: BatchWithDetails
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  const canvasWidth = 800;
  const padding = 28;
  const contentWidth = canvasWidth - padding * 2;

  // Filter only active orders (exclude soft-deleted)
  const orders = (batch.orders || []).filter((o) => !o.deletedAt);

  // 1. Preload all slip images and calculate dynamic card heights
  const slipEntries: Array<{
    order: Order;
    img: HTMLImageElement | null;
    drawHeight: number;
  }> = [];

  for (const ord of orders) {
    let img: HTMLImageElement | null = null;
    let drawHeight = 120; // Default height for fallback verified receipt card

    if (ord.slipImageUrl) {
      img = await loadSlipImage(ord.slipImageUrl);
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const aspect = img.naturalHeight / img.naturalWidth;
        const maxSlipWidth = Math.min(contentWidth, 680);
        drawHeight = Math.round(maxSlipWidth * aspect);
      }
    }

    slipEntries.push({ order: ord, img, drawHeight });
  }

  // 2. Generate Google Maps QR Code for Drop-Off Point (or Shop if self-pickup)
  const isSelfPickup = Boolean(batch.isSelfPickup);
  const location = getLocationForBatch(batch);
  const dropOffMapUrl = isSelfPickup ? (batch.shop.gmapUrl || "") : getDropOffMapUrl(batch);
  let mapQrImage: HTMLImageElement | null = null;

  if (dropOffMapUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(dropOffMapUrl, {
        width: 160,
        margin: 1,
        color: {
          dark: "#2e1065", // deep purple 950 for high contrast scanning
          light: "#ffffff",
        },
      });
      mapQrImage = await loadSlipImage(qrDataUrl);
    } catch (err) {
      console.warn("Map QR code generation failed:", err);
    }
  }

  // 3. Compute dynamic canvas height
  const headerHeight = 145;
  const destCardHeight = 155;
  let totalHeight = 0;
  totalHeight += headerHeight;
  totalHeight += 20; // Spacing
  totalHeight += destCardHeight;
  totalHeight += 25; // Spacing

  // Cooking Checklist height
  const checklistHeight = Math.max(orders.length * 64 + 90, 140);
  totalHeight += checklistHeight;
  totalHeight += 40;  // Gap between checklist and slips

  // Slips Section Title
  totalHeight += 65;

  // Slips cards height
  for (const s of slipEntries) {
    if (s.img) {
      totalHeight += 48 + s.drawHeight + 24; // label box (48px) + img + gap (24px)
    } else {
      totalHeight += 120 + 20; // fallback receipt card (120px) + gap (20px)
    }
  }

  totalHeight += 85; // Footer

  canvas.width = canvasWidth;
  canvas.height = totalHeight;

  // Overall Background
  ctx.fillStyle = "#f8fafc"; // slate-50
  ctx.fillRect(0, 0, canvasWidth, totalHeight);

  let currentY = 0;

  // -----------------------------------------------------------------
  // HEADER BANNER
  // -----------------------------------------------------------------
  const headerGradient = ctx.createLinearGradient(0, 0, canvasWidth, headerHeight);
  headerGradient.addColorStop(0, "#3b0764"); // deep purple 950
  headerGradient.addColorStop(0.6, "#581c87"); // purple 900
  headerGradient.addColorStop(1, "#831843"); // pink/rose 900
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, canvasWidth, headerHeight);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Top App Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("🍱 VEATEC @ VISTEC — ใบสรุปออเดอร์ร้านอาหาร", padding, 42);

  // Shop Name Accent
  ctx.fillStyle = "#fef08a"; // yellow-200 accent
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`ร้าน: ${batch.shop.name}`, padding, 78);

  // Sub metadata
  const leaderLine = batch.hostLineId || (orders[0]?.customerLineId ? `@${orders[0].customerLineId}` : orders[0]?.customerName);
  const leaderPhone = batch.hostPhone || orders[0]?.customerPhone;
  const leaderContact = leaderPhone ? `👑 หัวหน้าตี้: ${leaderLine || "Leader"} (โทร: ${leaderPhone})` : (leaderLine ? `👑 หัวหน้าตี้: ${leaderLine}` : "");

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "14px sans-serif";
  const dateStr = `รอบวันที่: ${batch.date} (Cutoff: ${batch.cutoffTime} น.) ${leaderContact ? `• ${leaderContact}` : ""}`;
  const totalStr = `ยอดเงินรวม: ฿${batch.currentTotalAmount} (${orders.length} กล่อง) • ชำระเงินครบ 100% แล้ว ✅`;
  ctx.fillText(dateStr, padding, 110);
  ctx.fillText(totalStr, padding, 130);

  ctx.restore();

  currentY = headerHeight + 20;

  // -----------------------------------------------------------------
  // SECTION: DESTINATION & GOOGLE MAPS QR CARD
  // -----------------------------------------------------------------
  const destCardY = currentY;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // White Card with subtle accent border
  ctx.fillStyle = "#ffffff";
  drawRoundRect(ctx, padding, destCardY, contentWidth, destCardHeight, 16);
  ctx.fill();
  ctx.strokeStyle = isSelfPickup ? "#fde68a" : "#c084fc"; // amber or purple-300
  ctx.lineWidth = 2;
  ctx.stroke();

  // Badge Pill
  const pillWidth = isSelfPickup ? 250 : 270;
  ctx.fillStyle = isSelfPickup ? "#fef3c7" : "#f3e8ff"; // amber-100 or purple-100
  drawRoundRect(ctx, padding + 16, destCardY + 12, pillWidth, 26, 6);
  ctx.fill();
  ctx.fillStyle = isSelfPickup ? "#92400e" : "#6b21a8";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(
    isSelfPickup ? "🚶 รูปแบบ: รับเองหน้าร้าน (SELF-PICKUP)" : "📍 จุดส่งอาหาร (DELIVERY DROP-OFF)",
    padding + 24,
    destCardY + 29
  );

  // Big Destination Heading
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 21px sans-serif";
  if (isSelfPickup) {
    ctx.fillText(`ลูกค้ารับเองที่ร้าน ${batch.shop.name}`, padding + 16, destCardY + 66);
  } else {
    ctx.fillText(`โต๊ะรับอาหาร ${location.name} ชั้น 1`, padding + 16, destCardY + 66);
  }

  // Desk Detail
  ctx.fillStyle = isSelfPickup ? "#64748b" : "#334155";
  ctx.font = "bold 14px sans-serif";
  if (isSelfPickup) {
    ctx.fillText(`ลูกค้า/หัวหน้าตี้เดินทางไปรับเองที่ร้าน • ร้านไม่ต้องมาส่งที่ ม.`, padding + 16, destCardY + 91);
  } else {
    ctx.fillText(`📌 โต๊ะวาง: ${location.deskDetail}`, padding + 16, destCardY + 91);
  }

  // Leader Contact
  ctx.fillStyle = "#6b21a8";
  ctx.font = "14px sans-serif";
  ctx.fillText(
    `👑 ผู้ประสานงาน: ${leaderLine || "หัวหน้าตี้"}${leaderPhone ? ` (โทร: ${leaderPhone})` : ""}`,
    padding + 16,
    destCardY + 115
  );

  // Map Prompt Info
  ctx.fillStyle = "#0284c7";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(
    `🗺️ พิกัด Google Maps: สแกน QR Code ด้านขวาเพื่อนําทางไปยังจุดส่ง ➔`,
    padding + 16,
    destCardY + 138
  );

  // Right Side: High-Contrast QR Code Box
  const qrBoxWidth = 118;
  const qrBoxHeight = 132;
  const qrBoxX = padding + contentWidth - qrBoxWidth - 14;
  const qrBoxY = destCardY + 11;

  ctx.fillStyle = "#f8fafc";
  drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxWidth, qrBoxHeight, 12);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (mapQrImage) {
    // Draw 96x96 QR Code inside
    ctx.drawImage(mapQrImage, qrBoxX + 11, qrBoxY + 10, 96, 96);
    ctx.textAlign = "center";
    ctx.fillStyle = "#581c87";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("สแกนแผนที่ 🗺️", qrBoxX + qrBoxWidth / 2, qrBoxY + 122);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("MAP LINK", qrBoxX + qrBoxWidth / 2, qrBoxY + 60);
    ctx.font = "10px sans-serif";
    ctx.fillText("(ไม่มี QR)", qrBoxX + qrBoxWidth / 2, qrBoxY + 78);
  }

  ctx.restore();

  currentY = destCardY + destCardHeight + 25;

  // -----------------------------------------------------------------
  // SECTION 1: ITEMIZED ORDER LIST (COOKING CHECKLIST)
  // -----------------------------------------------------------------
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const checklistCardY = currentY;

  // White Card Container
  ctx.fillStyle = "#ffffff";
  drawRoundRect(ctx, padding, checklistCardY, contentWidth, checklistHeight, 16);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Checklist Header Title
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("📝 รายการอาหารที่ต้องทำ (Cooking Checklist):", padding + 20, checklistCardY + 36);

  const totalBoxesCount = orders.reduce(
    (sum, o) => sum + (o.items && o.items.length > 0 ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1),
    0
  );

  ctx.fillStyle = "#64748b";
  ctx.font = "13px sans-serif";
  ctx.fillText(
    `รวมทั้งหมด ${totalBoxesCount} กล่อง (${orders.length} ออเดอร์) • โปรดจัดเตรียมและแปะหมายเลขกล่องตามรายการนี้:`,
    padding + 20,
    checklistCardY + 62
  );

  let rowY = checklistCardY + 86;

  if (orders.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("ยังไม่มีรายการอาหาร", padding + 20, rowY + 20);
  } else {
    orders.forEach((ord, idx) => {
      const isEven = idx % 2 === 0;

      // Zebra background
      if (!isEven) {
        ctx.fillStyle = "#f8fafc";
        drawRoundRect(ctx, padding + 10, rowY, contentWidth - 20, 56, 8);
        ctx.fill();
      }

      // Box Badge [#01]
      ctx.fillStyle = "#581c87"; // purple-900 badge
      drawRoundRect(ctx, padding + 16, rowY + 11, 52, 34, 6);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`#${String(ord.orderNumber).padStart(2, "0")}`, padding + 42, rowY + 28);

      // Dish Item Details
      ctx.textAlign = "left";
      const items = ord.items && Array.isArray(ord.items) && ord.items.length > 0
        ? ord.items
        : [{ name: ord.boxLabel || "อาหาร", price: ord.totalAmount, quantity: 1, customNote: "" }];

      const itemsSummaryText = items
        .map((it) => `${(it.quantity || 1) > 1 ? `${it.quantity}x ` : ""}${it.name}${it.customNote ? ` (${it.customNote})` : ""}`)
        .join(" + ");

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(itemsSummaryText.slice(0, 48), padding + 78, rowY + 19);

      // Line 2: Customer LINE & Phone
      ctx.fillStyle = "#64748b";
      ctx.font = "13px sans-serif";
      const lineIdStr = ord.customerLineId ? `👤 LINE: @${ord.customerLineId}` : `👤 ${ord.customerName}`;
      const phoneStr = ord.customerPhone ? ` • 📞 ${ord.customerPhone}` : "";
      ctx.fillText(`${lineIdStr}${phoneStr}`.slice(0, 68), padding + 78, rowY + 39);

      // Right-aligned Price Badge
      ctx.textAlign = "right";
      ctx.fillStyle = "#c2410c"; // orange-700
      ctx.font = "bold 18px monospace";
      ctx.fillText(`฿${ord.totalAmount}`, padding + contentWidth - 20, rowY + 28);

      rowY += 64;
    });
  }

  ctx.restore();

  currentY += checklistHeight + 35;

  // -----------------------------------------------------------------
  // SECTION 2: SLIPS SECTION DIVIDER
  // -----------------------------------------------------------------
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("🧾 หลักฐานสลิปโอนเงิน (เรียงตามลำดับกล่องด้านบน):", padding, currentY);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px sans-serif";
  ctx.fillText("ตรวจสอบยอดเงินโอนเข้าบัญชีร้านตามหมายเลขกล่องได้ทันที (สลิปครบ 100%)", padding, currentY + 24);

  ctx.restore();

  currentY += 45;

  // -----------------------------------------------------------------
  // DRAW EACH SLIP IN SEQUENTIAL ORDER (100% OF ORDERS INCLUDED)
  // -----------------------------------------------------------------
  slipEntries.forEach(({ order, img, drawHeight }) => {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const lineIdStr = order.customerLineId ? `@${order.customerLineId}` : order.customerName;
    const phoneInfo = order.customerPhone ? ` • โทร: ${order.customerPhone}` : "";

    if (img) {
      const cardHeight = 48 + drawHeight + 16;

      // Slip Card Background
      ctx.fillStyle = "#ffffff";
      drawRoundRect(ctx, padding, currentY, contentWidth, cardHeight, 16);
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Slip Header Pill
      ctx.fillStyle = "#f1f5f9";
      drawRoundRect(ctx, padding + 10, currentY + 8, contentWidth - 20, 34, 8);
      ctx.fill();

      // Box # and Customer
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(
        `[ กล่อง #${String(order.orderNumber).padStart(2, "0")} ] ${lineIdStr}${phoneInfo} • ยอด ฿${order.totalAmount}`,
        padding + 22,
        currentY + 25
      );

      // Bank verification badge
      if (order.slipBankName || order.slipTransRef) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#15803d"; // emerald-700
        ctx.font = "bold 12px sans-serif";
        const bankRef = `✅ ${order.slipBankName || "ธนาคาร"} Ref: ${order.slipTransRef || "Verified"}`;
        ctx.fillText(bankRef.slice(0, 38), padding + contentWidth - 24, currentY + 25);
      }

      // Draw Slip Image Centered
      const maxSlipWidth = Math.min(contentWidth, 680);
      const slipX = padding + Math.round((contentWidth - maxSlipWidth) / 2);
      const slipY = currentY + 50;
      ctx.drawImage(img, slipX, slipY, maxSlipWidth, drawHeight);

      currentY += cardHeight + 20;
    } else {
      // Fallback Receipt Card (ensures every single slip is represented)
      const fallbackHeight = 120;

      ctx.fillStyle = "#ffffff";
      drawRoundRect(ctx, padding, currentY, contentWidth, fallbackHeight, 16);
      ctx.fill();
      ctx.strokeStyle = "#a7f3d0"; // emerald-200 border
      ctx.lineWidth = 2;
      ctx.stroke();

      // Header Pill
      ctx.fillStyle = "#ecfdf5"; // emerald-50
      drawRoundRect(ctx, padding + 10, currentY + 8, contentWidth - 20, 34, 8);
      ctx.fill();

      ctx.fillStyle = "#065f46"; // emerald-800
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(
        `[ กล่อง #${String(order.orderNumber).padStart(2, "0")} ] ${lineIdStr}${phoneInfo} • ยอด ฿${order.totalAmount}`,
        padding + 22,
        currentY + 25
      );

      ctx.textAlign = "right";
      ctx.fillStyle = "#047857";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("✅ สลิปโอนเงินผ่านการยืนยันแล้ว", padding + contentWidth - 24, currentY + 25);

      // Body of receipt card
      ctx.textAlign = "left";
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(`สลิปชำระเงิน: ${order.slipBankName || "ธนาคารพาณิชย์ (BOT EMVCo)"}`, padding + 22, currentY + 62);

      ctx.fillStyle = "#475569";
      ctx.font = "13px monospace";
      ctx.fillText(`เลขที่อ้างอิง (TransRef): ${order.slipTransRef || "TR-" + order.id}`, padding + 22, currentY + 85);

      ctx.textAlign = "right";
      ctx.fillStyle = "#ea580c";
      ctx.font = "bold 22px monospace";
      ctx.fillText(`฿${order.totalAmount}.00`, padding + contentWidth - 24, currentY + 74);

      currentY += fallbackHeight + 20;
    }

    ctx.restore();
  });

  // -----------------------------------------------------------------
  // FOOTER
  // -----------------------------------------------------------------
  ctx.save();
  ctx.fillStyle = "#64748b";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    "VEATEC Hub • สถาบันวิทยสิริเมธี (VISTEC) • Wangchan Valley, Rayong",
    canvasWidth / 2,
    currentY + 25
  );
  ctx.fillText(
    `สร้างเมื่อ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. วันที่ ${new Date().toLocaleDateString("th-TH")}`,
    canvasWidth / 2,
    currentY + 48
  );
  ctx.restore();

  // Export to Blob & DataURL safely
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            // Fallback blob conversion from dataUrl if toBlob fails
            const byteString = atob(dataUrl.split(",")[1]);
            const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const fallbackBlob = new Blob([ab], { type: mimeString });
            resolve({ blob: fallbackBlob, dataUrl });
          }
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      reject(err);
    }
  });
}
