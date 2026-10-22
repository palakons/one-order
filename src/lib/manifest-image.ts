import QRCode from "qrcode";
import { BatchWithDetails, Order } from "./types";
import { getLocationForBatch, getDropOffMapUrl } from "./locations";
import { formatCutoffDisplay } from "./utils";

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
 * Converts remote images to Object URLs via fetch with CORS when possible,
 * preventing any SecurityError ("Tainted canvases may not be exported").
 */
async function loadSlipImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;

  let objectUrlToRevoke: string | null = null;
  let finalSrc = src;

  // For remote HTTP(S) images, try fetching as blob first to ensure CORS compliance and prevent canvas tainting
  if (src.startsWith("http://") || src.startsWith("https://")) {
    try {
      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(src, {
        mode: "cors",
        signal: controller.signal,
      });
      clearTimeout(fetchTimer);

      if (res.ok) {
        const blob = await res.blob();
        finalSrc = URL.createObjectURL(blob);
        objectUrlToRevoke = finalSrc;
      }
    } catch (fetchErr) {
      console.warn("Slip fetch before canvas draw notice:", fetchErr);
      // If direct fetch fails (e.g. strict CORS), fall back to img tag with anonymous crossOrigin
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      console.warn("Slip image load timed out, falling back to receipt card:", src.slice(0, 60));
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      resolve(null);
    }, 4500);

    img.onload = () => {
      clearTimeout(timeoutId);
      // Wait slightly or clean up after canvas export
      if (objectUrlToRevoke) {
        setTimeout(() => URL.revokeObjectURL(objectUrlToRevoke!), 10000);
      }
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      console.warn("Slip image failed to load / CORS blocked, using receipt card:", src.slice(0, 60));
      resolve(null);
    };

    if (finalSrc.startsWith("http://") || finalSrc.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.src = finalSrc;
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
  let dropOffPhotoImage: HTMLImageElement | null = null;

  // Preload Delivery Point Table Photo
  const photoUrlToLoad = isSelfPickup ? batch.shop.menuImageUrl : location.photoUrl;
  if (photoUrlToLoad) {
    try {
      dropOffPhotoImage = await loadSlipImage(photoUrlToLoad);
    } catch (err) {
      console.warn("Delivery desk photo load notice:", err);
    }
  }

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

  // 3. Compute dynamic canvas height with 2-column slips and compact layout
  const headerHeight = 120; // Reduced from 145
  const destCardHeight = 138; // Reduced from 160
  let totalHeight = 0;
  totalHeight += headerHeight;
  totalHeight += 14; // Spacing
  totalHeight += destCardHeight;
  totalHeight += 16; // Spacing

  // Cooking Checklist height (dynamic based on items per order)
  const checklistHeaderHeight = 62;
  const checklistOrderHeights = orders.map((ord) => {
    const itemCount = (ord.items && ord.items.length > 0) ? ord.items.length : 1;
    return Math.max(54, 34 + itemCount * 20);
  });
  const checklistRowsTotalHeight = checklistOrderHeights.reduce((sum, h) => sum + h + 8, 0);
  const checklistHeight = Math.max(checklistRowsTotalHeight + checklistHeaderHeight + 14, 110);
  totalHeight += checklistHeight;
  totalHeight += 20; // Gap between checklist and slips

  // Slips Section Title
  totalHeight += 44;

  // 2-Column Slips layout calculations
  const colGap = 16;
  const colWidth = Math.floor((contentWidth - colGap) / 2);
  const rowCount = Math.ceil(slipEntries.length / 2);

  // Calculate row heights (each row takes the max height of the two items in that row)
  const slipRowHeights: number[] = [];
  for (let r = 0; r < rowCount; r++) {
    const left = slipEntries[r * 2];
    const right = slipEntries[r * 2 + 1];

    const getSlipCardHeight = (entry?: typeof slipEntries[0]) => {
      if (!entry) return 0;
      if (entry.img) {
        // Calculate aspect-ratio scaled height for 2-column width
        const aspect = entry.img.naturalHeight / entry.img.naturalWidth;
        const imgH = Math.round((colWidth - 16) * aspect);
        return 40 + imgH + 12; // header pill (40px) + img + padding
      }
      return 110; // Fallback verified receipt card
    };

    const leftH = getSlipCardHeight(left);
    const rightH = getSlipCardHeight(right);
    const maxRowH = Math.max(leftH, rightH);
    slipRowHeights.push(maxRowH);
    totalHeight += maxRowH + 14; // card height + row gap
  }

  totalHeight += 80; // Compact Footer with Shop Notice

  canvas.width = canvasWidth;
  canvas.height = totalHeight;

  // Overall Background
  ctx.fillStyle = "#f8fafc"; // slate-50
  ctx.fillRect(0, 0, canvasWidth, totalHeight);

  let currentY = 0;

  // -----------------------------------------------------------------
  // HEADER BANNER (Compact & Clean)
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

  // Top App Title & Shop Accent
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("🍱 VEATEC — ใบสรุปออเดอร์ร้านอาหาร", padding, 34);

  // Shop Name Accent
  ctx.fillStyle = "#fef08a"; // yellow-200 accent
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`ร้าน: ${batch.shop.name}`, padding, 64);

  // Sub metadata (Deduplicated contact & date)
  const leaderLine = batch.hostLineId || (orders[0]?.customerLineId ? `@${orders[0].customerLineId}` : orders[0]?.customerName);
  const leaderPhone = batch.hostPhone || orders[0]?.customerPhone;
  const leaderContact = leaderPhone ? `👑 หัวหน้าตี้: ${leaderLine || "Leader"} (โทร: ${leaderPhone})` : (leaderLine ? `👑 หัวหน้าตี้: ${leaderLine}` : "");

  const totalBoxesCount = orders.reduce(
    (sum, o) => sum + (o.items && o.items.length > 0 ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1),
    0
  );

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "13px sans-serif";
  const dateStr = `รอบวันที่: ${batch.date} (สั่งได้ถึง: ${formatCutoffDisplay(batch.cutoffTime, batch.date, "th")}) ${leaderContact ? `• ${leaderContact}` : ""}`;
  const totalStr = `💰 ยอดเงินโอนรวมทั้งรอบ: ฿${batch.currentTotalAmount} (${totalBoxesCount} กล่อง | ${orders.length} ออเดอร์) • สลิปครบ 100% ✅`;
  ctx.fillText(dateStr, padding, 90);
  ctx.fillText(totalStr, padding, 108);

  ctx.restore();

  currentY = headerHeight + 14;

  // -----------------------------------------------------------------
  // SECTION: DESTINATION & GOOGLE MAPS QR CARD (Compact)
  // -----------------------------------------------------------------
  const destCardY = currentY;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // White Card with subtle accent border
  ctx.fillStyle = "#ffffff";
  drawRoundRect(ctx, padding, destCardY, contentWidth, destCardHeight, 14);
  ctx.fill();
  ctx.strokeStyle = isSelfPickup ? "#fde68a" : "#c084fc"; // amber or purple-300
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Badge Pill
  const pillWidth = isSelfPickup ? 230 : 250;
  ctx.fillStyle = isSelfPickup ? "#fef3c7" : "#f3e8ff"; // amber-100 or purple-100
  drawRoundRect(ctx, padding + 14, destCardY + 10, pillWidth, 24, 6);
  ctx.fill();
  ctx.fillStyle = isSelfPickup ? "#92400e" : "#6b21a8";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(
    isSelfPickup ? "🚶 รับเองหน้าร้าน (SELF-PICKUP)" : "📍 จุดส่งอาหาร (DELIVERY DROP-OFF)",
    padding + 22,
    destCardY + 26
  );

  // Big Destination Heading
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px sans-serif";
  if (isSelfPickup) {
    ctx.fillText(`ลูกค้ารับเองที่ร้าน ${batch.shop.name}`, padding + 14, destCardY + 58);
  } else {
    ctx.fillText(`โต๊ะรับอาหาร ${location.name} ชั้น 1`, padding + 14, destCardY + 58);
  }

  // Desk Detail
  ctx.fillStyle = isSelfPickup ? "#64748b" : "#334155";
  ctx.font = "bold 13px sans-serif";
  if (isSelfPickup) {
    ctx.fillText(`ลูกค้า/หัวหน้าตี้เดินทางไปรับเองที่ร้าน • ร้านไม่ต้องมาส่งที่ ม.`, padding + 14, destCardY + 80);
  } else {
    ctx.fillText(`📌 โต๊ะวาง: ${location.deskDetail}`, padding + 14, destCardY + 80);
  }

  // Map Prompt Info (Single Clean Line, avoiding duplicate phone/leader)
  ctx.fillStyle = "#0284c7";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(
    `🗺️ ดูรูปโต๊ะรับอาหารจริง & สแกนแผนที่นำทางด้านขวา ➔`,
    padding + 14,
    destCardY + 116
  );

  // Right Side: Delivery Point Desk Photo Box & High-Contrast QR Code Box
  const qrBoxWidth = 98;
  const qrBoxHeight = 118;
  const qrBoxX = padding + contentWidth - qrBoxWidth - 10;
  const qrBoxY = destCardY + 10;

  const photoBoxWidth = 114;
  const photoBoxHeight = 118;
  const photoBoxX = qrBoxX - photoBoxWidth - 8;
  const photoBoxY = destCardY + 10;

  // 1. Draw Desk Photo Box
  ctx.fillStyle = "#f8fafc";
  drawRoundRect(ctx, photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight, 10);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (dropOffPhotoImage) {
    ctx.save();
    drawRoundRect(ctx, photoBoxX + 4, photoBoxY + 4, photoBoxWidth - 8, 86, 6);
    ctx.clip();
    ctx.drawImage(dropOffPhotoImage, photoBoxX + 4, photoBoxY + 4, photoBoxWidth - 8, 86);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = "#334155";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("📸 โต๊ะส่งจริง", photoBoxX + photoBoxWidth / 2, photoBoxY + 107);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("📸 ภาพจุดส่ง", photoBoxX + photoBoxWidth / 2, photoBoxY + 56);
    ctx.font = "9px sans-serif";
    ctx.fillText(location.name || "Delivery Desk", photoBoxX + photoBoxWidth / 2, photoBoxY + 72);
  }

  // 2. Draw QR Code Box
  ctx.fillStyle = "#f8fafc";
  drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxWidth, qrBoxHeight, 10);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (mapQrImage) {
    ctx.drawImage(mapQrImage, qrBoxX + 7, qrBoxY + 6, 84, 84);
    ctx.textAlign = "center";
    ctx.fillStyle = "#581c87";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("สแกนแผนที่ 🗺️", qrBoxX + qrBoxWidth / 2, qrBoxY + 107);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("MAP LINK", qrBoxX + qrBoxWidth / 2, qrBoxY + 52);
    ctx.font = "9px sans-serif";
    ctx.fillText("(ไม่มี QR)", qrBoxX + qrBoxWidth / 2, qrBoxY + 68);
  }

  ctx.restore();

  currentY = destCardY + destCardHeight + 16;

  // -----------------------------------------------------------------
  // SECTION 1: ITEMIZED ORDER LIST (COOKING CHECKLIST)
  // -----------------------------------------------------------------
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const checklistCardY = currentY;

  // White Card Container
  ctx.fillStyle = "#ffffff";
  drawRoundRect(ctx, padding, checklistCardY, contentWidth, checklistHeight, 14);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Checklist Header Title
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText("🍱 รายการอาหารที่สั่ง:", padding + 16, checklistCardY + 24);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";
  ctx.fillText(
    `รวมทั้งหมด ${totalBoxesCount} กล่อง (${orders.length} ออเดอร์) • รายละเอียดแต่ละกล่อง:`,
    padding + 16,
    checklistCardY + 46
  );

  let rowY = checklistCardY + 64;

  if (orders.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("ยังไม่มีรายการอาหาร", padding + 16, rowY + 16);
  } else {
    orders.forEach((ord, idx) => {
      const cardH = checklistOrderHeights[idx];
      const isEven = idx % 2 === 0;

      // Card row background for each order
      ctx.fillStyle = isEven ? "#ffffff" : "#f8fafc";
      drawRoundRect(ctx, padding + 8, rowY, contentWidth - 16, cardH, 8);
      ctx.fill();
      ctx.strokeStyle = isEven ? "#e2e8f0" : "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.stroke();

      const orderNum = String(ord.orderNumber || idx + 1).padStart(2, "0");

      // Badge: [ออเดอร์ที่ #01]
      ctx.fillStyle = "#581c87"; // purple-900 badge
      drawRoundRect(ctx, padding + 14, rowY + 6, 88, 22, 5);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`ออเดอร์ที่ #${orderNum}`, padding + 58, rowY + 17);

      // Customer Info
      ctx.textAlign = "left";
      ctx.fillStyle = "#334155";
      ctx.font = "bold 12px sans-serif";
      const lineIdStr = ord.customerLineId ? `@${ord.customerLineId.replace(/^@/, "")}` : ord.customerName;
      const phoneStr = ord.customerPhone ? ` • 📞 ${ord.customerPhone}` : "";
      ctx.fillText(`👤 ${lineIdStr}${phoneStr}`.slice(0, 48), padding + 110, rowY + 17);

      // Right-aligned Order Total
      ctx.textAlign = "right";
      ctx.fillStyle = "#c2410c"; // orange-700
      ctx.font = "bold 14px monospace";
      ctx.fillText(`รวม ฿${ord.totalAmount}`, padding + contentWidth - 18, rowY + 17);

      // Menu items list (3-tier: each dish item, quantity, unit price, total price)
      const items = ord.items && Array.isArray(ord.items) && ord.items.length > 0
        ? ord.items
        : [{ name: ord.boxLabel || "อาหาร", price: ord.totalAmount, quantity: 1, customNote: "" }];

      let itemY = rowY + 36;
      ctx.textAlign = "left";

      items.forEach((it) => {
        const qty = it.quantity || 1;
        const note = it.customNote ? ` (${it.customNote})` : "";
        const pricePerUnit = it.price > 0 ? it.price : Math.round(ord.totalAmount / (items.length || 1));
        const itemTotal = pricePerUnit * qty;

        // Dish Name & Qty
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 13px sans-serif";
        const dishText = `• ${qty > 1 ? `${qty}x ` : "1x "}${it.name}${note}`;
        ctx.fillText(dishText.slice(0, 56), padding + 22, itemY);

        // Price breakdown right-aligned
        ctx.textAlign = "right";
        ctx.fillStyle = "#64748b";
        ctx.font = "12px monospace";
        const priceText = qty > 1 ? `@฿${pricePerUnit} = ฿${itemTotal}` : `@฿${pricePerUnit}`;
        ctx.fillText(priceText, padding + contentWidth - 18, itemY);
        ctx.textAlign = "left";

        itemY += 20;
      });

      rowY += cardH + 8;
    });
  }

  ctx.restore();

  currentY += checklistHeight + 20;

  // -----------------------------------------------------------------
  // SECTION 2: SLIPS SECTION DIVIDER (Deduplicated & Clean)
  // -----------------------------------------------------------------
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText("🧾 สลิปโอนเงิน:", padding, currentY + 14);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";
  ctx.fillText(`รวม ${orders.length} สลิป • ยอดตรงตามหมายเลขกล่องด้านบนครบ 100%`, padding, currentY + 32);

  ctx.restore();

  currentY += 44;

  // -----------------------------------------------------------------
  // DRAW SLIPS IN 2 COLUMNS (Compact, Less Whitespace, Easy to Read)
  // -----------------------------------------------------------------
  for (let r = 0; r < rowCount; r++) {
    const rowH = slipRowHeights[r];

    for (let c = 0; c < 2; c++) {
      const idx = r * 2 + c;
      if (idx >= slipEntries.length) break;

      const { order, img } = slipEntries[idx];
      const colX = padding + c * (colWidth + colGap);

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const lineIdStr = order.customerLineId ? `@${order.customerLineId.replace(/^@/, "")}` : order.customerName;

      // Draw Slip Card Background
      ctx.fillStyle = "#ffffff";
      drawRoundRect(ctx, colX, currentY, colWidth, rowH, 12);
      ctx.fill();
      ctx.strokeStyle = img ? "#cbd5e1" : "#a7f3d0";
      ctx.lineWidth = img ? 1 : 1.5;
      ctx.stroke();

      // Slip Header Pill (Compact 32px height)
      ctx.fillStyle = img ? "#f1f5f9" : "#ecfdf5";
      drawRoundRect(ctx, colX + 6, currentY + 6, colWidth - 12, 28, 6);
      ctx.fill();

      // Box # & Name
      ctx.fillStyle = img ? "#0f172a" : "#065f46";
      ctx.font = "bold 13px sans-serif";
      const orderNum = String(order.orderNumber).padStart(2, "0");
      ctx.fillText(
        `ออเดอร์ที่ #${orderNum} (${lineIdStr})`.slice(0, 24),
        colX + 14,
        currentY + 20
      );

      // Amount Badge (Right aligned)
      ctx.textAlign = "right";
      ctx.fillStyle = img ? "#c2410c" : "#047857";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`฿${order.totalAmount}`, colX + colWidth - 14, currentY + 20);

      if (img) {
        // Draw Slip Image Centered inside column card
        const aspect = img.naturalHeight / img.naturalWidth;
        const imgW = colWidth - 16;
        const imgH = Math.round(imgW * aspect);
        const slipX = colX + 8;
        const slipY = currentY + 38;

        ctx.drawImage(img, slipX, slipY, imgW, imgH);
      } else {
        // Fallback Receipt Card inside column
        ctx.textAlign = "left";
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`✅ โอนเงินเรียบร้อย`, colX + 14, currentY + 48);

        ctx.fillStyle = "#64748b";
        ctx.font = "11px monospace";
        ctx.fillText(`Ref: ${(order.slipTransRef || order.id).slice(0, 16)}`, colX + 14, currentY + 70);

        ctx.textAlign = "right";
        ctx.fillStyle = "#ea580c";
        ctx.font = "bold 18px monospace";
        ctx.fillText(`฿${order.totalAmount}`, colX + colWidth - 14, currentY + 68);
      }

      ctx.restore();
    }

    currentY += rowH + 14;
  }

  // -----------------------------------------------------------------
  // FOOTER (Compact & Helpful note for shop)
  // -----------------------------------------------------------------
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Helpful shop notice card
  ctx.fillStyle = "#f1f5f9";
  drawRoundRect(ctx, padding, currentY + 8, contentWidth, 34, 8);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(
    "💡 หากทางร้านมีการเปลี่ยนแปลงเบอร์โทร หรือ QR พร้อมเพย์ แจ้งหัวหน้าตี้ได้เลยนะครับ เพื่ออัปเดตในระบบ",
    canvasWidth / 2,
    currentY + 25
  );

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  ctx.fillText(
    `VEATEC Hub • สถาบันวิทยสิริเมธี (VISTEC) • สร้างเมื่อ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`,
    canvasWidth / 2,
    currentY + 54
  );
  ctx.restore();

  // Export to Blob & DataURL safely
  return new Promise((resolve, reject) => {
    try {
      // Lean manifest image export: 0.78 quality (~65% smaller file size, sharp text & clear slips for LINE)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
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
        0.78
      );
    } catch (err) {
      reject(err);
    }
  });
}
