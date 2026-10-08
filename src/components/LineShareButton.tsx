"use client";

import { useState } from "react";
import { MessageSquare, Copy, Check, ExternalLink, Share2 } from "lucide-react";
import { BatchWithDetails } from "@/lib/types";
import { getLocationById } from "@/lib/locations";

interface Props {
  batch: BatchWithDetails;
}

export default function LineShareButton({ batch }: Props) {
  const [copied, setCopied] = useState(false);

  // Group items by menu name
  const itemCounts: Record<string, number> = {};
  batch.orders.forEach((ord) => {
    ord.items.forEach((it) => {
      itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
    });
  });

  // Group orders by building
  const buildingCounts: Record<string, number> = {};
  batch.orders.forEach((ord) => {
    const loc = getLocationById(ord.locationId);
    const locName = loc ? loc.name : ord.locationId;
    buildingCounts[locName] = (buildingCounts[locName] || 0) + 1;
  });

  const deliveryStatusText = batch.isMinMet
    ? "✅ ส่งถึงตึกมหาวิทยาลัย (Campus Delivery)"
    : "⚠️ ยอดรวมไม่ถึงเกณฑ์ -> ลูกค้ารับเองที่ร้าน (Self Pick-up at shop)";

  const currentHost = typeof window !== "undefined" ? window.location.origin : "https://one-order.app";
  const manifestUrl = `${currentHost}/shop/${batch.id}`;

  const isCompleted = batch.status === "COMPLETED";

  const messageText = isCompleted
    ? `🛵 [VEATEC @ VISTEC] อาหารมาส่งถึงโต๊ะแล้ว! ✨
ร้าน: ${batch.shop.name} (${batch.orders.length} ออเดอร์)
📍 วางไว้ที่โต๊ะรับอาหารกลางเรียบร้อยแล้ว:
${Object.entries(buildingCounts)
  .map(([bldg, count]) => `• ${bldg}: ${count} กล่อง`)
  .join("\n")}

📸 ดูรูปถ่ายจุดวางอาหาร & รายชื่อกล่องของคุณ:
${manifestUrl}

ขอให้อร่อยกับมื้ออาหารครับ/ค่ะ 🙏`
    : `🍱 [VEATEC @ VISTEC] สรุปออเดอร์ร้าน ${batch.shop.name}
รอบส่งวันที่: ${batch.date} (ปิดรอบ ${batch.cutoffTime})
สถานะส่ง: ${deliveryStatusText}

📊 ยอดรวมทั้งหมด: ฿${batch.currentTotalAmount} (${batch.orders.length} ออเดอร์)
${batch.isMinMet ? "🎉 ยอดถึงขั้นต่ำแล้ว พร้อมส่งที่โต๊ะรับของ!" : "⏳ ยอดไม่ถึงขั้นต่ำ ฿" + batch.targetMinAmount}

📍 จุดส่งอาหาร:
${Object.entries(buildingCounts)
  .map(([bldg, count]) => `• ${bldg}: ${count} กล่อง`)
  .join("\n")}

📋 รายการอาหารที่ต้องทำ:
${Object.entries(itemCounts)
  .map(([item, count]) => `• ${item} x ${count}`)
  .join("\n")}

👉 ดูใบออเดอร์ครัว & สลิปโอนเงินทั้งหมดได้ที่ลิงก์นี้:
${manifestUrl}`;

  const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Primary 1-Click LINE open */}
      <a
        href={lineShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
          isCompleted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#06C755] hover:bg-[#05b34c]"
        }`}
      >
        <MessageSquare className="h-4 w-4" />
        <span>{isCompleted ? "แจ้ง LINE: อาหารส่งถึงโต๊ะแล้ว 🛵" : "ส่งออเดอร์ให้ร้านผ่าน LINE"}</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-80" />
      </a>

      {/* Copy formatted text button */}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 transition-colors shadow-2xs"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 text-gray-500" />
            <span>Copy Manifest Text</span>
          </>
        )}
      </button>
    </div>
  );
}
