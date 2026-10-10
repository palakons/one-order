import { NextResponse } from "next/server";
import { getBatchById } from "@/lib/store";
import { getLocationForBatch, getDropOffMapUrl } from "@/lib/locations";
import QRCode from "qrcode";
import sharp from "sharp";

function escapeXml(str: string): string {
  if (!str) return "";
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const batch = await getBatchById(id, false);
    if (!batch) {
      return new NextResponse("Batch not found", { status: 404 });
    }

    // 1. If type === "manifest", dynamically render the One Long Manifest Image via SVG & sharp
    if (type === "manifest") {
      const orders = (batch.orders || []).filter((o) => !o.deletedAt);
      const loc = getLocationForBatch(batch);
      const mapUrl = getDropOffMapUrl(batch);

      let qrDataUrl = "";
      try {
        qrDataUrl = await QRCode.toDataURL(mapUrl, {
          margin: 1,
          width: 140,
          color: { dark: "#1e1b4b", light: "#ffffff" },
        });
      } catch (e) {
        console.warn("QR code generation error:", e);
      }

      const width = 800;
      const padding = 28;
      const contentWidth = width - padding * 2;

      let y = 0;
      const headerHeight = 220;
      y += headerHeight + 20;

      const checklistY = y;
      const rowHeight = 72;
      const checklistContentHeight = Math.max(120, orders.length * rowHeight + 100);
      y += checklistContentHeight + 30;

      const slipsY = y;
      const slipCardHeight = 420;
      const slipsTotalHeight = orders.length > 0 ? orders.length * (slipCardHeight + 20) + 80 : 120;
      y += slipsTotalHeight + 60;

      const totalHeight = y;

      const svgParts: string[] = [];
      svgParts.push(`<svg width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">`);
      svgParts.push(`<defs>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b0764"/>
          <stop offset="60%" stop-color="#581c87"/>
          <stop offset="100%" stop-color="#831843"/>
        </linearGradient>
      </defs>`);

      // Canvas background
      svgParts.push(`<rect width="${width}" height="${totalHeight}" fill="#f8fafc"/>`);

      // Header
      svgParts.push(`<rect width="${width}" height="${headerHeight}" fill="url(#headerGrad)"/>`);
      svgParts.push(`<text x="${padding}" y="50" font-family="sans-serif" font-size="28" font-weight="900" fill="#ffffff">🍱 VEATEC — ใบสรุปออเดอร์ร้านค้า</text>`);
      svgParts.push(`<text x="${padding}" y="88" font-family="sans-serif" font-size="22" font-weight="bold" fill="#fbcfe8">ร้าน: ${escapeXml(batch.shop.name)}</text>`);
      svgParts.push(`<text x="${padding}" y="120" font-family="sans-serif" font-size="14" fill="#e9d5ff">รอบวันที่: ${escapeXml(batch.date)} • ปิดรอบ: ${escapeXml(batch.cutoffTime)} น.</text>`);
      svgParts.push(`<text x="${padding}" y="145" font-family="sans-serif" font-size="14" fill="#e9d5ff">จุดส่งอาหาร: ${escapeXml(loc.name)} (${escapeXml(loc.deskDetail)})</text>`);
      if (batch.hostName || batch.hostPhone) {
        svgParts.push(`<text x="${padding}" y="170" font-family="sans-serif" font-size="13" fill="#cbd5e1">👑 หัวหน้าตี้: ${escapeXml(batch.hostName || batch.hostLineId || "")} ${escapeXml(batch.hostPhone ? `(โทร: ${batch.hostPhone})` : "")}</text>`);
      }

      // QR Code in Header
      if (qrDataUrl) {
        const qrSize = 130;
        const qrX = width - padding - qrSize - 10;
        const qrY = 35;
        svgParts.push(`<rect x="${qrX - 6}" y="${qrY - 6}" width="${qrSize + 12}" height="${qrSize + 28}" rx="12" fill="#ffffff"/>`);
        svgParts.push(`<image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>`);
        svgParts.push(`<text x="${qrX + qrSize / 2}" y="${qrY + qrSize + 16}" font-family="sans-serif" font-size="10" font-weight="bold" fill="#3b0764" text-anchor="middle">สแกนดูแผนที่โต๊ะ M4</text>`);
      }

      // Checklist Card
      svgParts.push(`<rect x="${padding}" y="${checklistY}" width="${contentWidth}" height="${checklistContentHeight}" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>`);
      svgParts.push(`<text x="${padding + 20}" y="${checklistY + 36}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1e293b">📋 รายการจัดเตรียมอาหาร (${orders.length} ออเดอร์ • ยอดรวม ฿${batch.currentTotalAmount})</text>`);
      svgParts.push(`<line x1="${padding + 20}" y1="${checklistY + 52}" x2="${width - padding - 20}" y2="${checklistY + 52}" stroke="#f1f5f9" stroke-width="2"/>`);

      let itemY = checklistY + 85;
      orders.forEach((ord, idx) => {
        const lineTag = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
        const itemsText = ord.items.map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}${it.customNote ? ` (${it.customNote})` : ""}`).join(" + ");

        svgParts.push(`<rect x="${padding + 16}" y="${itemY - 24}" width="${contentWidth - 32}" height="${rowHeight - 8}" rx="10" fill="${idx % 2 === 0 ? "#f8fafc" : "#ffffff"}" stroke="#f1f5f9"/>`);
        svgParts.push(`<rect x="${padding + 24}" y="${itemY - 14}" width="36" height="26" rx="6" fill="#3b0764"/>`);
        svgParts.push(`<text x="${padding + 42}" y="${itemY + 4}" font-family="sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">#${ord.orderNumber}</text>`);
        svgParts.push(`<text x="${padding + 70}" y="${itemY - 1}" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${escapeXml(itemsText)}</text>`);
        svgParts.push(`<text x="${padding + 70}" y="${itemY + 20}" font-family="sans-serif" font-size="12" fill="#64748b">กล่อง: ${escapeXml(lineTag)} ${escapeXml(ord.customerPhone ? `• โทร ${ord.customerPhone}` : "")}</text>`);
        svgParts.push(`<text x="${width - padding - 32}" y="${itemY + 5}" font-family="sans-serif" font-size="15" font-weight="900" fill="#581c87" text-anchor="end">฿${ord.totalAmount}</text>`);

        itemY += rowHeight;
      });

      // Stacked Slips Card
      svgParts.push(`<rect x="${padding}" y="${slipsY}" width="${contentWidth}" height="${slipsTotalHeight}" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>`);
      svgParts.push(`<text x="${padding + 20}" y="${slipsY + 36}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1e293b">🧾 สลิปโอนเงิน PromptPay ครบทุกออเดอร์ (100% Verified)</text>`);
      svgParts.push(`<line x1="${padding + 20}" y1="${slipsY + 52}" x2="${width - padding - 20}" y2="${slipsY + 52}" stroke="#f1f5f9" stroke-width="2"/>`);

      let currentSlipY = slipsY + 75;
      orders.forEach((ord) => {
        const lineTag = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
        svgParts.push(`<rect x="${padding + 16}" y="${currentSlipY}" width="${contentWidth - 32}" height="36" rx="8" fill="#f1f5f9"/>`);
        svgParts.push(`<text x="${padding + 28}" y="${currentSlipY + 23}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155">ออเดอร์ #${ord.orderNumber} (${escapeXml(lineTag)}) • ฿${ord.totalAmount}</text>`);

        if (ord.slipImageUrl && ord.slipImageUrl.startsWith("data:image/")) {
          svgParts.push(`<image href="${ord.slipImageUrl}" x="${padding + 20}" y="${currentSlipY + 44}" width="${contentWidth - 40}" height="${slipCardHeight - 54}" preserveAspectRatio="xMidYMid meet"/>`);
        } else {
          svgParts.push(`<rect x="${padding + 20}" y="${currentSlipY + 44}" width="${contentWidth - 40}" height="${slipCardHeight - 64}" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-dasharray="6 4"/>`);
          svgParts.push(`<text x="${width / 2}" y="${currentSlipY + 160}" font-family="sans-serif" font-size="14" font-weight="bold" fill="#10b981" text-anchor="middle">✓ ชำระเงินเรียบร้อยแล้ว (฿${ord.totalAmount})</text>`);
          if (ord.slipTransRef) {
            svgParts.push(`<text x="${width / 2}" y="${currentSlipY + 190}" font-family="sans-serif" font-size="12" fill="#64748b" text-anchor="middle">รหัสอ้างอิง BOT: ${escapeXml(ord.slipTransRef)}</text>`);
          }
        }

        currentSlipY += slipCardHeight + 20;
      });

      svgParts.push(`</svg>`);

      const fullSvg = svgParts.join("\n");
      const jpegBuffer = await sharp(Buffer.from(fullSvg))
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      return new NextResponse(jpegBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": jpegBuffer.length.toString(),
          "Cache-Control": "public, max-age=1800, s-maxage=1800",
        },
      });
    }

    // 2. Default: Delivery Evidence Photo
    if (!batch.deliveryPhotoUrl) {
      return new NextResponse("Delivery photo not found", { status: 404 });
    }

    const photo = batch.deliveryPhotoUrl;

    if (photo.startsWith("http://") || photo.startsWith("https://")) {
      return NextResponse.redirect(photo);
    }

    const matches = photo.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse("Invalid image format", { status: 400 });
    }

    const mimeType = matches[1] || "image/jpeg";
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    console.error("Photo endpoint error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
