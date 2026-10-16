import { NextResponse } from "next/server";
import { getBatchById } from "@/lib/store";
import { getLocationForBatch, getDropOffMapUrl } from "@/lib/locations";
import { getImageFromStorage } from "@/lib/storage";
import { formatCutoffDisplay } from "@/lib/utils";
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
      const padding = 24;
      const contentWidth = width - padding * 2;

      let y = 0;
      const headerHeight = 160;
      y += headerHeight + 14;

      const checklistY = y;
      const rowHeight = 54;
      const checklistContentHeight = Math.max(90, orders.length * rowHeight + 80);
      y += checklistContentHeight + 18;

      const slipsY = y;
      const colGap = 14;
      const colWidth = Math.floor((contentWidth - colGap) / 2);
      const slipCardHeight = 270;
      const rowCount = Math.ceil(orders.length / 2);
      const slipsTotalHeight = orders.length > 0 ? rowCount * (slipCardHeight + 14) + 60 : 100;
      y += slipsTotalHeight + 40;

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

      // Header (Compact & Clean)
      svgParts.push(`<rect width="${width}" height="${headerHeight}" fill="url(#headerGrad)"/>`);
      svgParts.push(`<text x="${padding}" y="42" font-family="sans-serif" font-size="22" font-weight="900" fill="#ffffff">🍱 VEATEC — ใบสรุปออเดอร์ร้านค้า</text>`);
      svgParts.push(`<text x="${padding}" y="74" font-family="sans-serif" font-size="19" font-weight="bold" fill="#fef08a">ร้าน: ${escapeXml(batch.shop.name)}</text>`);
      svgParts.push(`<text x="${padding}" y="102" font-family="sans-serif" font-size="13" fill="#e9d5ff">รอบวันที่: ${escapeXml(batch.date)} • สั่งได้ถึง: ${escapeXml(formatCutoffDisplay(batch.cutoffTime, batch.date, "th"))}</text>`);
      svgParts.push(`<text x="${padding}" y="124" font-family="sans-serif" font-size="13" fill="#e9d5ff">จุดส่ง: ${escapeXml(loc.name)} (${escapeXml(loc.deskDetail)})</text>`);
      if (batch.hostName || batch.hostPhone) {
        svgParts.push(`<text x="${padding}" y="146" font-family="sans-serif" font-size="12" fill="#cbd5e1">👑 หัวหน้าตี้: ${escapeXml(batch.hostName || batch.hostLineId || "")} ${escapeXml(batch.hostPhone ? `(โทร: ${batch.hostPhone})` : "")}</text>`);
      }

      // QR Code in Header (Compact 110x110)
      if (qrDataUrl) {
        const qrSize = 100;
        const qrX = width - padding - qrSize - 10;
        const qrY = 24;
        svgParts.push(`<rect x="${qrX - 5}" y="${qrY - 5}" width="${qrSize + 10}" height="${qrSize + 24}" rx="10" fill="#ffffff"/>`);
        svgParts.push(`<image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>`);
        svgParts.push(`<text x="${qrX + qrSize / 2}" y="${qrY + qrSize + 14}" font-family="sans-serif" font-size="9" font-weight="bold" fill="#3b0764" text-anchor="middle">สแกนดูแผนที่โต๊ะ</text>`);
      }

      // Checklist Card (Compact)
      svgParts.push(`<rect x="${padding}" y="${checklistY}" width="${contentWidth}" height="${checklistContentHeight}" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>`);
      svgParts.push(`<text x="${padding + 16}" y="${checklistY + 30}" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1e293b">📋 รายการจัดเตรียมอาหาร (${orders.length} ออเดอร์ • ยอดรวม ฿${batch.currentTotalAmount})</text>`);
      svgParts.push(`<line x1="${padding + 16}" y1="${checklistY + 44}" x2="${width - padding - 16}" y2="${checklistY + 44}" stroke="#f1f5f9" stroke-width="1.5"/>`);

      let itemY = checklistY + 68;
      orders.forEach((ord, idx) => {
        const lineTag = ord.customerLineId ? `@${ord.customerLineId.replace(/^@/, "")}` : ord.customerName;
        const itemsText = ord.items.map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}${it.customNote ? ` (${it.customNote})` : ""}`).join(" + ");

        svgParts.push(`<rect x="${padding + 12}" y="${itemY - 18}" width="${contentWidth - 24}" height="${rowHeight - 6}" rx="8" fill="${idx % 2 === 0 ? "#f8fafc" : "#ffffff"}" stroke="#f1f5f9"/>`);
        svgParts.push(`<rect x="${padding + 18}" y="${itemY - 10}" width="34" height="24" rx="5" fill="#3b0764"/>`);
        svgParts.push(`<text x="${padding + 35}" y="${itemY + 6}" font-family="monospace" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">#${ord.orderNumber}</text>`);
        svgParts.push(`<text x="${padding + 60}" y="${itemY + 2}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">${escapeXml(itemsText.slice(0, 56))}</text>`);
        svgParts.push(`<text x="${padding + 60}" y="${itemY + 20}" font-family="sans-serif" font-size="11" fill="#64748b">กล่อง: ${escapeXml(lineTag)} ${escapeXml(ord.customerPhone ? `• 📞 ${ord.customerPhone}` : "")}</text>`);
        svgParts.push(`<text x="${width - padding - 24}" y="${itemY + 8}" font-family="monospace" font-size="14" font-weight="900" fill="#c2410c" text-anchor="end">฿${ord.totalAmount}</text>`);

        itemY += rowHeight;
      });

      // 2-Column Slips Card
      svgParts.push(`<rect x="${padding}" y="${slipsY}" width="${contentWidth}" height="${slipsTotalHeight}" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>`);
      svgParts.push(`<text x="${padding + 16}" y="${slipsY + 30}" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1e293b">🧾 สลิปโอนเงิน (สลิป 2 คอลัมน์ กระชับ 100% Verified)</text>`);
      svgParts.push(`<line x1="${padding + 16}" y1="${slipsY + 44}" x2="${width - padding - 16}" y2="${slipsY + 44}" stroke="#f1f5f9" stroke-width="1.5"/>`);

      let currentSlipY = slipsY + 60;
      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < 2; c++) {
          const idx = r * 2 + c;
          if (idx >= orders.length) break;

          const ord = orders[idx];
          const colX = padding + 12 + c * (colWidth - 12 + colGap);
          const currentWidth = colWidth - 12;
          const lineTag = ord.customerLineId ? `@${ord.customerLineId.replace(/^@/, "")}` : ord.customerName;

          svgParts.push(`<rect x="${colX}" y="${currentSlipY}" width="${currentWidth}" height="${slipCardHeight}" rx="10" fill="#ffffff" stroke="#e2e8f0"/>`);
          svgParts.push(`<rect x="${colX + 6}" y="${currentSlipY + 6}" width="${currentWidth - 12}" height="28" rx="6" fill="#f1f5f9"/>`);
          svgParts.push(`<text x="${colX + 12}" y="${currentSlipY + 24}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">#${ord.orderNumber} ${escapeXml(lineTag.slice(0, 15))}</text>`);
          svgParts.push(`<text x="${colX + currentWidth - 12}" y="${currentSlipY + 24}" font-family="monospace" font-size="12" font-weight="bold" fill="#c2410c" text-anchor="end">฿${ord.totalAmount}</text>`);

          if (ord.slipImageUrl && ord.slipImageUrl.startsWith("data:image/")) {
            svgParts.push(`<image href="${ord.slipImageUrl}" x="${colX + 8}" y="${currentSlipY + 38}" width="${currentWidth - 16}" height="${slipCardHeight - 46}" preserveAspectRatio="xMidYMid meet"/>`);
          } else {
            svgParts.push(`<rect x="${colX + 8}" y="${currentSlipY + 38}" width="${currentWidth - 16}" height="${slipCardHeight - 46}" rx="6" fill="#ecfdf5" stroke="#a7f3d0"/>`);
            svgParts.push(`<text x="${colX + currentWidth / 2}" y="${currentSlipY + 110}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857" text-anchor="middle">✓ ชำระเงินเรียบร้อย</text>`);
            svgParts.push(`<text x="${colX + currentWidth / 2}" y="${currentSlipY + 140}" font-family="monospace" font-size="16" font-weight="900" fill="#ea580c" text-anchor="middle">฿${ord.totalAmount}</text>`);
            if (ord.slipTransRef) {
              svgParts.push(`<text x="${colX + currentWidth / 2}" y="${currentSlipY + 170}" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">Ref: ${escapeXml(ord.slipTransRef.slice(0, 16))}</text>`);
            }
          }
        }
        currentSlipY += slipCardHeight + 14;
      }

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
    if (!batch.deliveryPhotoUrl && !batch.deliveryPhotoPath) {
      return new NextResponse("Delivery photo not found", { status: 404 });
    }

    const photo = batch.deliveryPhotoUrl || "";

    // A. Check storage files first (path in deliveryPhotoPath or URL like /api/images/...)
    if (batch.deliveryPhotoPath || photo.startsWith("/api/images/")) {
      const storagePath = batch.deliveryPhotoPath || photo.replace(/^\/api\/images\//, "").replace(/^\/+/, "");
      const file = await getImageFromStorage(storagePath);
      if (file) {
        return new NextResponse(new Uint8Array(file.buffer), {
          status: 200,
          headers: {
            "Content-Type": file.mimeType || "image/jpeg",
            "Content-Length": file.buffer.length.toString(),
            "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
          },
        });
      }
    }

    // B. Base64 Data URL
    if (photo.startsWith("data:")) {
      const matches = photo.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1] || "image/jpeg";
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
          },
        });
      }
    }

    // C. External or full HTTP/HTTPS URL: proxy bytes so LINE doesn't fail on redirects
    if (photo.startsWith("http://") || photo.startsWith("https://")) {
      try {
        const remoteRes = await fetch(photo, { signal: AbortSignal.timeout(5000) });
        if (remoteRes.ok) {
          const ab = await remoteRes.arrayBuffer();
          return new NextResponse(new Uint8Array(ab), {
            status: 200,
            headers: {
              "Content-Type": remoteRes.headers.get("content-type") || "image/jpeg",
              "Content-Length": ab.byteLength.toString(),
              "Cache-Control": "public, max-age=86400, s-maxage=86400",
            },
          });
        }
      } catch (proxyErr) {
        console.warn("Failed to proxy remote delivery photo:", proxyErr);
      }
      return NextResponse.redirect(photo);
    }

    // D. Direct storage lookup fallback
    if (photo) {
      const fallbackFile = await getImageFromStorage(photo);
      if (fallbackFile) {
        return new NextResponse(new Uint8Array(fallbackFile.buffer), {
          status: 200,
          headers: {
            "Content-Type": fallbackFile.mimeType || "image/jpeg",
            "Content-Length": fallbackFile.buffer.length.toString(),
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }
    }

    return new NextResponse("Delivery photo not found", { status: 404 });
  } catch (err: any) {
    console.error("Photo endpoint error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
