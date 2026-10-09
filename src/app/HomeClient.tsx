"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CampusDesksModal from "@/components/CampusDesksModal";
import { BatchWithDetails, Shop } from "@/lib/types";
import {
  Utensils,
  Truck,
  ArrowRight,
  Clock,
  ChefHat,
  CheckCircle2,
  ShoppingBag,
  X,
  ChevronRight,
} from "lucide-react";

interface Props {
  initialBatches: BatchWithDetails[];
}

interface ShopTheme {
  primary: string;
  glowColor: string;
  bgGradient: string;
  borderColor: string;
  tagBg: string;
  progressBar: string;
  buttonClass: string;
}

function getShopDiffuseTheme(shop: Shop): ShopTheme {
  const id = (shop.id || "").toLowerCase();
  const name = (shop.name || "").toLowerCase();
  const cuisine = (shop.cuisine || "").toLowerCase();

  // 1. ครัวป้าต่าย ป่ายุบใน (Fiery Basil / Stir-fry)
  if (id.includes("tai") || id.includes("nee") || name.includes("ต่าย") || name.includes("ป้าณี")) {
    return {
      primary: "#EA580C",
      glowColor: "rgba(234, 88, 12, 0.28)",
      bgGradient: "from-orange-50/70 via-white to-amber-50/30",
      borderColor: "border-orange-200/90 hover:border-orange-400",
      tagBg: "bg-orange-100/90 text-orange-900 border-orange-200",
      progressBar: "bg-gradient-to-r from-orange-500 to-amber-500",
      buttonClass: "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-xs shadow-orange-600/20",
    };
  }

  // 2. ร้านอาหารชาวไร่ วังจันทร์ (Legendary Seafood & Chinese)
  if (id.includes("chao") || id.includes("chai") || name.includes("ชาวไร่")) {
    return {
      primary: "#D97706",
      glowColor: "rgba(217, 119, 6, 0.28)",
      bgGradient: "from-amber-50/70 via-white to-yellow-50/30",
      borderColor: "border-amber-200/90 hover:border-amber-400",
      tagBg: "bg-amber-100/90 text-amber-900 border-amber-200",
      progressBar: "bg-gradient-to-r from-amber-500 to-yellow-500",
      buttonClass: "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-xs shadow-amber-600/20",
    };
  }

  // 3. ครัวมั่งมี วังจันทร์ กม.68 (Homemade Chinese-Thai & Seafood)
  if (id.includes("mangmee") || id.includes("wan") || name.includes("มั่งมี")) {
    return {
      primary: "#E11D48",
      glowColor: "rgba(225, 29, 72, 0.25)",
      bgGradient: "from-rose-50/70 via-white to-orange-50/30",
      borderColor: "border-rose-200/90 hover:border-rose-400",
      tagBg: "bg-rose-100/90 text-rose-900 border-rose-200",
      progressBar: "bg-gradient-to-r from-rose-500 to-orange-500",
      buttonClass: "bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white shadow-xs shadow-rose-600/20",
    };
  }

  // 4. ครัวคุณส้ม สี่แยกป่ายุบใน (Som Tum / Isan)
  if (id.includes("som") || id.includes("somtum") || name.includes("ส้ม")) {
    return {
      primary: "#059669",
      glowColor: "rgba(5, 150, 105, 0.26)",
      bgGradient: "from-emerald-50/70 via-white to-teal-50/30",
      borderColor: "border-emerald-200/90 hover:border-emerald-400",
      tagBg: "bg-emerald-100/90 text-emerald-900 border-emerald-200",
      progressBar: "bg-gradient-to-r from-emerald-500 to-teal-500",
      buttonClass: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs shadow-emerald-600/20",
    };
  }

  // 5. Lin's Tea House & Cafe (Wangchan Cafe & Drinks)
  if (id.includes("lin") || id.includes("cafe") || name.includes("lin") || cuisine.includes("เครื่องดื่ม") || cuisine.includes("กาแฟ") || cuisine.includes("ชา")) {
    return {
      primary: "#7C3AED",
      glowColor: "rgba(124, 58, 237, 0.28)",
      bgGradient: "from-purple-50/70 via-white to-indigo-50/30",
      borderColor: "border-purple-200/90 hover:border-purple-400",
      tagBg: "bg-purple-100/90 text-purple-900 border-purple-200",
      progressBar: "bg-gradient-to-r from-purple-500 to-indigo-500",
      buttonClass: "bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs shadow-purple-900/20",
    };
  }

  // Fallback
  return {
    primary: "#EA580C",
    glowColor: "rgba(234, 88, 12, 0.25)",
    bgGradient: "from-orange-50/70 via-white to-amber-50/30",
    borderColor: "border-orange-200/90 hover:border-orange-400",
    tagBg: "bg-orange-100/90 text-orange-900 border-orange-200",
    progressBar: "bg-gradient-to-r from-orange-500 to-amber-500",
    buttonClass: "bg-gradient-to-r from-orange-600 to-amber-600 text-white",
  };
}

export default function HomeClient({ initialBatches }: Props) {
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [showDesksModal, setShowDesksModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [dismissedOrder, setDismissedOrder] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("veatec_user_orders");
      if (stored) {
        const orders = JSON.parse(stored);
        if (Array.isArray(orders) && orders.length > 0) {
          setActiveOrder(orders[0]);
        }
      }
    } catch (e) {
      console.warn("Could not read recent order", e);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchBatches, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/20 via-white to-gray-50 text-gray-900">
      <Navbar />

      {/* Active Order Live Polling Sticky Bar */}
      {activeOrder && !dismissedOrder && (() => {
        const matchingBatch = batches.find((b) => b.id === activeOrder.batchId);
        const status = matchingBatch ? matchingBatch.status : "OPEN";
        const isCompleted = status === "COMPLETED";
        const isDelivering = status === "DELIVERING";
        const isCooking = status === "LOCKED";

        const bgClass = isCompleted
          ? "bg-gradient-to-r from-emerald-600 via-teal-700 to-purple-900 text-white shadow-md shadow-emerald-900/10"
          : isDelivering
          ? "bg-gradient-to-r from-blue-600 to-indigo-800 text-white shadow-md shadow-blue-900/10"
          : isCooking
          ? "bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md shadow-amber-900/10"
          : "bg-gradient-to-r from-purple-900 via-purple-800 to-[#B4213A] text-white shadow-md shadow-purple-900/10";

        const titleText = isCompleted
          ? `🎉 ข้าวของคุณส่งถึงตึก M4 แล้ว! (#${activeOrder.orderNumber} ${activeOrder.customerName})`
          : isDelivering
          ? `🛵 ไรเดอร์กำลังเดินทางมาส่งที่ตึก M4 (${activeOrder.shopName})`
          : isCooking
          ? `👨‍🍳 ร้านกำลังปรุงอาหาร (${activeOrder.shopName})`
          : `⏳ ออเดอร์ #${activeOrder.orderNumber} บันทึกแล้ว (${activeOrder.shopName})`;

        const subText = isCompleted
          ? `ป้ายกล่อง: ${activeOrder.boxLabel || 'ตึก M4'} • แตะเพื่อดูรูปถ่าย & ไปรับข้าว ➔`
          : isDelivering
          ? `กำลังนำอาหารมาที่โต๊ะรับของชั้น 1 ตึก M4 • แตะดูสถานะ ➔`
          : isCooking
          ? `ครัวกำลังทำตามคิว • แตะดูสถานะ ➔`
          : `รอปิดรอบเวลา ${matchingBatch?.cutoffTime || '11:15'} น. • แตะดูรายละเอียด ➔`;

        return (
          <div className="sticky top-14 z-30 w-full px-2 sm:px-4 py-1.5 transition-all animate-in fade-in slide-in-from-top-2">
            <div className={`mx-auto max-w-4xl rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 ${bgClass}`}>
              <Link href="/orders" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-95">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white shrink-0 backdrop-blur-xs">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 animate-pulse" />
                  ) : isDelivering ? (
                    <Truck className="h-5 w-5" />
                  ) : isCooking ? (
                    <ChefHat className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs sm:text-sm font-black truncate">{titleText}</div>
                  <div className="text-[11px] text-white/85 truncate">{subText}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/70 shrink-0 hidden sm:block" />
              </Link>
              <button
                type="button"
                onClick={() => setDismissedOrder(true)}
                className="rounded-lg p-1 text-white/70 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
                title="ซ่อนแถบแจ้งเตือน"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Lean Hero Header: Single Subtext + Clear 1-2-3 Step Flow */}
      <section className="border-b border-purple-100/60 bg-gradient-to-b from-purple-50/40 via-white to-transparent px-3 pt-5 pb-5">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            รวมสั่งอาหารกลางวัน ส่งฟรีถึงโต๊ะตึก M4
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 font-medium">
            รวมยอดครบ ฿200 ต่อร้าน ส่งฟรีถึงโต๊ะวางอาหารชั้น 1 ตึก M4 ทุกวันจันทร์–ศุกร์
          </p>

          {/* Clear Compact 1-2-3 Step Flow */}
          <div className="mt-3.5 grid grid-cols-3 gap-2 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-200/70 bg-white/95 px-2 py-1.5 shadow-2xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-900 text-[10px] font-black text-white shrink-0">
                1
              </span>
              <span className="text-xs font-bold text-gray-800 truncate">เลือกร้าน & เมนู</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-200/70 bg-white/95 px-2 py-1.5 shadow-2xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B4213A] text-[10px] font-black text-white shrink-0">
                2
              </span>
              <span className="text-xs font-bold text-gray-800 truncate">โอน & แนบสลิป</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-200/70 bg-white/95 px-2 py-1.5 shadow-2xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white shrink-0">
                3
              </span>
              <span className="text-xs font-bold text-gray-800 truncate">รับที่โต๊ะตึก M4</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-3 py-5 sm:px-6 space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-1.5">
              <Utensils className="h-4 w-4 text-purple-900" />
              <span>ร้านเปิดรับวันนี้</span>
            </h2>
            <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
              {batches.length} ร้าน
            </span>
          </div>

          <Link
            href="/admin"
            className="text-xs font-bold text-purple-900 hover:text-[#B4213A] transition-colors flex items-center gap-1"
          >
            <span>+ เปิดรอบร้าน</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Batches Grid */}
        {batches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-bold text-gray-900">ยังไม่มีรอบสั่งอาหารเปิดอยู่ขณะนี้</h3>
            <p className="mt-1 text-xs text-gray-500">
              คุณสามารถเปิดรอบสั่งข้าวสำหรับมื้อนี้ได้
            </p>
            <Link
              href="/admin"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800"
            >
              + เปิดรอบสั่งอาหารใหม่
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => {
              const isUnlocked = batch.currentTotalAmount >= batch.targetMinAmount;
              const remaining = Math.max(0, batch.targetMinAmount - batch.currentTotalAmount);
              const percentage = Math.min(100, Math.round((batch.currentTotalAmount / batch.targetMinAmount) * 100));
              const theme = getShopDiffuseTheme(batch.shop);

              return (
                <div
                  key={batch.id}
                  className={`group relative overflow-hidden flex flex-col justify-between rounded-2xl border ${theme.borderColor} bg-gradient-to-br ${theme.bgGradient} p-3.5 shadow-2xs hover:shadow-md transition-all duration-300`}
                >
                  {/* Diffuse bloom absorbing the logo color */}
                  <div
                    className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: theme.glowColor }}
                  />

                  <div className="relative space-y-2.5">
                    {/* Header: Shop Logo Avatar + Name + Cutoff */}
                    <div className="flex items-start gap-3">
                      {/* Shop Logo Avatar */}
                      <div className="relative h-13 w-13 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-xs">
                        {batch.shop.menuImageUrl ? (
                          <img
                            src={batch.shop.menuImageUrl}
                            alt={batch.shop.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-700 font-black text-lg">
                            {batch.shop.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Name & Badges */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border truncate max-w-[130px] ${theme.tagBg}`}>
                            {batch.shop.cuisine}
                          </span>
                          <span className="font-semibold text-gray-500 flex items-center gap-0.5 shrink-0">
                            <Clock className="h-3 w-3 text-orange-500" />
                            <span>ปิด {batch.cutoffTime}</span>
                          </span>
                        </div>

                        <h3 className="mt-1 text-base font-black text-gray-900 group-hover:text-purple-950 transition-colors leading-tight truncate">
                          {batch.shop.name}
                        </h3>
                      </div>
                    </div>

                    {/* Target Progress Bar */}
                    <div className="rounded-xl bg-white/85 backdrop-blur-2xs p-2 border border-gray-100/80 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-700">
                          ฿{batch.currentTotalAmount} <span className="text-gray-400 font-normal">/ ฿{batch.targetMinAmount}</span>
                          <span className="text-[10px] text-gray-400 font-normal ml-1">({batch.orderCount} กล่อง)</span>
                        </span>
                        <span
                          className={`text-[11px] font-bold ${
                            isUnlocked ? "text-emerald-700 font-black" : "text-amber-800"
                          }`}
                        >
                          {isUnlocked ? "🎉 ครบขั้นต่ำแล้ว" : `ขาดอีก ฿${remaining}`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isUnlocked ? "bg-emerald-500" : theme.progressBar
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Compact Bottom Actions */}
                  <div className="relative flex items-center gap-1.5 pt-2 mt-2 border-t border-gray-100/90">
                    <Link
                      href={`/order/${batch.id}`}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl ${theme.buttonClass} px-3 py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>สั่งอาหาร</span>
                    </Link>
                    <Link
                      href={`/shop/${batch.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-200/90 bg-white/90 p-2 text-gray-600 hover:text-gray-900 hover:bg-white shadow-2xs transition-colors"
                      title="ดูใบครัว & สลิป"
                    >
                      <ChefHat className="h-3.5 w-3.5 text-gray-700" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Clean Compact Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-5">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            <strong>VEATEC</strong> · ระบบรวมสั่งอาหารประชาคม VISTEC (จุดรับ: ตึก M4 ชั้น 1)
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowDesksModal(true)} className="hover:text-purple-900 font-medium">
              จุดรับข้าว (ตึก M4)
            </button>
            <Link href="/orders" className="hover:text-purple-900 font-medium">
              ตรวจเช็คออเดอร์
            </Link>
            <Link href="/admin" className="hover:text-purple-900 font-medium">
              ระบบร้านค้า / แอดมิน
            </Link>
          </div>
        </div>
      </footer>

      {showDesksModal && <CampusDesksModal onClose={() => setShowDesksModal(false)} />}
    </div>
  );
}
