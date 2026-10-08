"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import DeliveryProgressBar from "@/components/DeliveryProgressBar";
import CampusDesksModal from "@/components/CampusDesksModal";
import VeatecLogo from "@/components/VeatecLogo";
import { CAMPUS_LOCATIONS } from "@/lib/locations";
import { BatchWithDetails } from "@/lib/types";
import {
  Utensils,
  Truck,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  Phone,
  ChefHat,
  Users,
  CheckCircle2,
  ShoppingBag,
  X,
  ChevronRight,
} from "lucide-react";

interface Props {
  initialBatches: BatchWithDetails[];
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

      {/* Top Banner: VEATEC Brand & 1-2-3 Steps Flow */}
      <section className="border-b border-purple-100/70 bg-gradient-to-b from-purple-50/50 via-white to-transparent px-3 py-5 sm:py-7">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center text-center">
            {/* Main VEATEC Brand Display */}
            <div className="mb-3.5 hover:scale-[1.02] transition-transform">
              <VeatecLogo size="xl" showSubtitle={true} />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/90 border border-purple-200/80 px-3 py-0.5 text-xs font-bold text-purple-900 shadow-2xs">
              <Sparkles className="h-3 w-3 text-[#B4213A]" />
              <span>ระบบรวมสั่งข้าวเที่ยงชาว VISTEC (สถาบันวิทยสิริเมธี)</span>
            </span>

            <h1 className="mt-2 text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              รวมสั่งให้ครบ <span className="text-[#B4213A]">฿200</span> ส่งฟรีถึงโต๊ะตึกเรียน M4!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-lg">
              ไม่ต้องไปต่อคิวนอกมอ โอนตรงเข้าบัญชีร้านค้า นำส่งที่โต๊ะประจำตึก M4
            </p>
          </div>

          {/* 3 Easy Steps Bar */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-orange-200/80 bg-white p-2.5 shadow-2xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white mx-auto mb-1">
                1
              </div>
              <div className="text-xs font-bold text-gray-900">เลือกร้าน & เมนู</div>
              <div className="text-[10px] text-gray-500 hidden sm:block">กดเพิ่มลงตะกร้า</div>
            </div>

            <div className="rounded-xl border border-blue-200/80 bg-white p-2.5 shadow-2xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white mx-auto mb-1">
                2
              </div>
              <div className="text-xs font-bold text-gray-900">โอนเงิน & แนบสลิป</div>
              <div className="text-[10px] text-gray-500 hidden sm:block">PromptPay ตรงเข้าร้าน</div>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 shadow-2xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white mx-auto mb-1">
                3
              </div>
              <div className="text-xs font-bold text-gray-900">รับข้าวที่โต๊ะตึก</div>
              <div className="text-[10px] text-gray-500 hidden sm:block">กล่องติดชื่อตามจุดส่ง</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-3 py-5 sm:px-6 space-y-8">
        {/* Active Order Pools Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Utensils className="h-4.5 w-4.5 text-purple-800" />
                <span>ร้านเปิดรับออเดอร์วันนี้</span>
                <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                  {batches.length} ร้าน
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                รวมออเดอร์ให้ครบขั้นต่ำ ส่งฟรีถึงโต๊ะกลางตึก M4
              </p>
            </div>

            <Link
              href="/admin"
              className="text-xs font-bold text-purple-800 hover:text-purple-950 hover:underline flex items-center gap-1"
            >
              <span>+ เปิดรอบร้าน</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {batches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">ยังไม่มีรอบสั่งอาหารเปิดอยู่ขณะนี้</h3>
              <p className="mt-1 text-xs text-gray-500">
                คุณสามารถเป็นคนแรกที่เปิดรอบสั่งข้าวสำหรับมื้อนี้ได้
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

                return (
                  <div
                    key={batch.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all"
                  >
                    <div className="space-y-2">
                      {/* Top row: Cuisine & Cutoff / Status */}
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <span className="text-[10px] font-bold text-purple-900 bg-purple-50 border border-purple-100 rounded-md px-1.5 py-0.5 truncate max-w-[130px]">
                          {batch.shop.cuisine}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] shrink-0">
                          <span className="font-semibold text-gray-500 flex items-center gap-0.5">
                            <Clock className="h-3 w-3 text-orange-500" />
                            <span>ปิด {batch.cutoffTime}</span>
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                              batch.status === "OPEN"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {batch.status === "OPEN" ? "เปิดรับ" : batch.status}
                          </span>
                        </div>
                      </div>

                      {/* Shop Title & Description */}
                      <div>
                        <h3 className="text-base font-black text-gray-900 group-hover:text-purple-900 transition-colors leading-snug">
                          {batch.shop.name}
                        </h3>
                        {batch.shop.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {batch.shop.description}
                          </p>
                        )}
                      </div>

                      {/* Compact Progress Bar */}
                      <div className="rounded-xl bg-gray-50/90 p-2 border border-gray-100 space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-700">
                            ฿{batch.currentTotalAmount} <span className="text-gray-400 font-normal">/ ฿{batch.targetMinAmount}</span>
                            <span className="text-[10px] text-gray-400 font-normal ml-1">({batch.orderCount} ออเดอร์)</span>
                          </span>
                          <span
                            className={`text-[11px] font-bold ${
                              isUnlocked ? "text-emerald-700 font-black" : "text-amber-800"
                            }`}
                          >
                            {isUnlocked ? "🎉 ส่งฟรี M4" : `ขาดอีก ฿${remaining}`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isUnlocked ? "bg-emerald-500" : "bg-gradient-to-r from-amber-400 to-orange-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Popular menu inline roll */}
                      <div className="text-[11px] text-gray-600 line-clamp-1">
                        <span className="font-bold text-gray-400 mr-1">แนะนำ:</span>
                        <span>
                          {batch.shop.menuItems.slice(0, 3).map((it) => `${it.name} (฿${it.price})`).join(" · ")}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center gap-1.5 pt-2.5 mt-2 border-t border-gray-100">
                      <Link
                        href={`/order/${batch.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 px-3 py-2 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>สั่งอาหาร</span>
                      </Link>

                      <Link
                        href={`/shop/${batch.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                        title="ดูใบส่งครัว & สลิป"
                      >
                        <ChefHat className="h-3.5 w-3.5 text-purple-700" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Campus Delivery Desks Quick Showcase */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-600">
                <Building2 className="h-3.5 w-3.5" />
                <span>จุดรับข้าวประจำอาคาร (ตึก M4)</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                โต๊ะรับส่งอาหาร ตึก M4
              </h3>
              <p className="text-xs text-gray-500">
                กล่องข้าวจะเขียนชื่อและเบอร์โทร นำไปวางส่งที่โต๊ะวางอาหาร Delivery ชั้น 1 อาคาร M4
              </p>
            </div>

            <button
              onClick={() => setShowDesksModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-800 transition-colors self-start sm:self-auto"
            >
              <span>ดูรูปโต๊ะรับส่ง M4</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 max-w-lg gap-3">
            {CAMPUS_LOCATIONS.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setShowDesksModal(true)}
                className="group cursor-pointer rounded-xl border border-gray-200 p-3 text-left hover:border-orange-500 hover:bg-orange-50/20 transition-all flex items-center gap-3"
              >
                <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-gray-100 shrink-0">
                  <img
                    src={loc.photoUrl}
                    alt={loc.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1 left-1 rounded bg-[#B4213A] px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {loc.shortCode}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 group-hover:text-orange-600 truncate">
                    {loc.name}
                  </div>
                  <div className="text-[11px] text-gray-600 line-clamp-2">
                    {loc.deskDetail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            <strong>VEATEC (VISTEC Eats)</strong> · ระบบรวมสั่งอาหารเพื่อประชาคมชาววิทยสิริเมธี (VISTEC)
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowDesksModal(true)} className="hover:text-orange-600">
              จุดรับข้าว (ตึก M4)
            </button>
            <Link href="/admin" className="hover:text-orange-600">
              ระบบร้านค้า / แอดมิน
            </Link>
          </div>
        </div>
      </footer>

      {showDesksModal && <CampusDesksModal onClose={() => setShowDesksModal(false)} />}
    </div>
  );
}
