import { BatchWithDetails, Order } from "./types";

/**
 * Loads an image from a URL/DataURL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Generates the "One Long Manifest Image" containing:
 * 1. Top destination (M4 Table) & shop order summary
 * 2. Itemized order checklist
 * 3. All transfer slips stacked sequentially matching the order numbers
 */
export async function generateOneLongManifestImage(
  batch: BatchWithDetails
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  const canvasWidth = 800;
  const padding = 30;
  const contentWidth = canvasWidth - padding * 2;

  // 1. Preload all slip images and calculate heights
  const slipImages: Array<{ order: Order; img: HTMLImageElement; drawHeight: number }> = [];
  for (const ord of batch.orders) {
    if (ord.slipImageUrl) {
      try {
        const img = await loadImage(ord.slipImageUrl);
        const aspect = img.naturalHeight / img.naturalWidth;
        // Scale to fit content width with max width of 680px
        const maxSlipWidth = Math.min(contentWidth, 680);
        const drawHeight = Math.round(maxSlipWidth * aspect);
        slipImages.push({ order: ord, img, drawHeight });
      } catch (e) {
        console.warn("Failed to load slip image for order #" + ord.orderNumber, e);
      }
    }
  }

  // 2. Compute dynamic canvas height
  let totalHeight = 0;
  totalHeight += 240; // Top header banner & destination info
  totalHeight += 50;  // Order list section title
  totalHeight += batch.orders.length * 48 + 20; // Order list items
  totalHeight += 60;  // Slips section divider

  // Each slip height: label box (50px) + image + gap (25px)
  for (const s of slipImages) {
    totalHeight += 54 + s.drawHeight + 25;
  }

  totalHeight += 70; // Footer

  canvas.width = canvasWidth;
  canvas.height = totalHeight;

  // Background
  ctx.fillStyle = "#f8fafc"; // soft slate background
  ctx.fillRect(0, 0, canvasWidth, totalHeight);

  let currentY = 0;

  // Header Banner
  const headerGradient = ctx.createLinearGradient(0, 0, canvasWidth, 220);
  headerGradient.addColorStop(0, "#4c1d95"); // deep purple
  headerGradient.addColorStop(0.5, "#6b21a8");
  headerGradient.addColorStop(1, "#9f1239"); // rose
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, canvasWidth, 220);

  // Top Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("🍱 VEATEC @ VISTEC — ใบสรุปออเดอร์ร้านอาหาร", padding, 48);

  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#fef08a"; // yellow accent
  ctx.fillText(`ร้าน: ${batch.shop.name}`, padding, 84);

  // Destination Pill
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.roundRect(padding, 102, contentWidth, 54, 12);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("📍 จุดส่ง: โต๊ะส่งอาหาร Delivery ชั้น 1 ตึก M4", padding + 16, 136);

  // Sub metadata
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "16px sans-serif";
  const dateStr = `รอบวันที่: ${batch.date} (Cutoff: ${batch.cutoffTime} น.)`;
  const totalStr = `ยอดเงินรวม: ฿${batch.currentTotalAmount} (${batch.orders.length} กล่อง) • ชำระเงินครบ 100% ✅`;
  ctx.fillText(dateStr, padding, 185);
  ctx.fillText(totalStr, padding, 208);

  currentY = 245;

  // Section 1: Itemized Order List
  ctx.fillStyle = "#ffffff";
  ctx.roundRect(padding, currentY, contentWidth, batch.orders.length * 48 + 70, 16);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("📝 รายการอาหารที่ต้องทำ (Cooking Checklist):", padding + 18, currentY + 34);

  let rowY = currentY + 65;
  batch.orders.forEach((ord, idx) => {
    // Alternating row background
    if (idx % 2 === 1) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(padding + 10, rowY - 22, contentWidth - 20, 38);
    }

    // Box badge
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`#${String(ord.orderNumber).padStart(2, "0")}`, padding + 18, rowY);

    // Food item details
    const itemsText = ord.items
      .map((it) => `${it.quantity}x ${it.name}${it.customNote ? ` (${it.customNote})` : ""}`)
      .join(", ");
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(itemsText.slice(0, 48), padding + 60, rowY);

    // Customer LINE
    const lineTag = ord.customerLineId ? `LINE: ${ord.customerLineId}` : ord.customerName;
    ctx.fillStyle = "#64748b";
    ctx.font = "14px sans-serif";
    ctx.fillText(`(${lineTag.slice(0, 18)})`, padding + 480, rowY);

    // Price
    ctx.fillStyle = "#ea580c"; // orange price
    ctx.font = "bold 16px monospace";
    ctx.fillText(`฿${ord.totalAmount}`, padding + contentWidth - 65, rowY);

    rowY += 46;
  });

  currentY += batch.orders.length * 48 + 95;

  // Section 2: Slips Divider
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("🧾 หลักฐานสลิปโอนเงิน (เรียงตามลำดับกล่องด้านบน):", padding, currentY);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px sans-serif";
  ctx.fillText("ตรวจสอบยอดเงินเข้าบัญชีตามหมายเลขกล่องได้ทันที", padding, currentY + 24);

  currentY += 45;

  // Draw Each Slip
  slipImages.forEach(({ order, img, drawHeight }) => {
    const cardHeight = 52 + drawHeight + 16;

    // Slip card background
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(padding, currentY, contentWidth, cardHeight, 16);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Slip Label Header Box
    ctx.fillStyle = "#f1f5f9";
    ctx.roundRect(padding + 8, currentY + 8, contentWidth - 16, 40, 10);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px sans-serif";
    const lineIdStr = order.customerLineId ? `LINE: ${order.customerLineId}` : order.customerName;
    ctx.fillText(
      `[ กล่อง #${order.orderNumber} ] ผู้สั่ง: ${lineIdStr} • ยอด ฿${order.totalAmount}`,
      padding + 20,
      currentY + 34
    );

    // Slip Bank / Ref badge
    if (order.slipBankName || order.slipTransRef) {
      ctx.fillStyle = "#15803d"; // green text
      ctx.font = "12px sans-serif";
      const bankRef = `${order.slipBankName || "ธนาคาร"} Ref: ${order.slipTransRef || "Verified"}`;
      ctx.fillText(bankRef.slice(0, 35), padding + contentWidth - 280, currentY + 34);
    }

    // Draw Slip Image Centered
    const maxSlipWidth = Math.min(contentWidth, 680);
    const slipX = padding + Math.round((contentWidth - maxSlipWidth) / 2);
    const slipY = currentY + 56;
    ctx.drawImage(img, slipX, slipY, maxSlipWidth, drawHeight);

    currentY += cardHeight + 20;
  });

  // Footer
  ctx.fillStyle = "#64748b";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "VEATEC Hub • สถาบันวิทยสิริเมธี (VISTEC) • Wangchan Valley, Rayong",
    canvasWidth / 2,
    currentY + 30
  );
  ctx.fillText(
    `สร้างเมื่อ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. วันที่ ${new Date().toLocaleDateString("th-TH")}`,
    canvasWidth / 2,
    currentY + 50
  );

  // Export to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          resolve({ blob, dataUrl });
        } else {
          reject(new Error("Failed to generate image blob"));
        }
      },
      "image/jpeg",
      0.92
    );
  });
}
