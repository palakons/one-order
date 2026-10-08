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
} from "lucide-react";

interface Props {
  initialBatches: BatchWithDetails[];
}

export default function HomeClient({ initialBatches }: Props) {
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [showDesksModal, setShowDesksModal] = useState(false);

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
              รวมสั่งให้ครบ <span className="text-[#B4213A]">฿200</span> ส่งฟรีถึงโต๊ะตึกเรียน!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-lg">
              ไม่ต้องไปต่อคิวนอกมอ โอนตรงเข้าบัญชีร้านค้า นำส่งที่โต๊ะประจำตึก (V, M1-M4, โรงอาหาร, K)
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
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-orange-600" />
                <span>ร้านเปิดรับออเดอร์วันนี้</span>
              </h2>
              <p className="text-xs text-gray-500">
                สั่งก่อนเวลาปิดรับ เพื่อรวมยอดให้ครบ ฿200 ส่งฟรีถึงตึก
              </p>
            </div>

            <Link
              href="/admin"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
            >
              <span>+ เปิดรอบร้านใหม่</span>
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
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700"
              >
                + เปิดรอบสั่งอาหารใหม่
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs hover:border-orange-300 hover:shadow-sm transition-all"
                >
                  <div>
                    {/* Header: Shop Name & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/80 rounded px-1.5 py-0.5">
                          {batch.shop.cuisine}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-gray-900 mt-1">
                          {batch.shop.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {batch.shop.description}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0 ${
                          batch.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {batch.status === "OPEN" ? "🟢 เปิดรับ" : batch.status}
                      </span>
                    </div>

                    {/* Progress Bar Component */}
                    <div className="my-3">
                      <DeliveryProgressBar
                        currentAmount={batch.currentTotalAmount}
                        targetAmount={batch.targetMinAmount}
                        cutoffTime={batch.cutoffTime}
                        orderCount={batch.orderCount}
                      />
                    </div>

                    {/* Popular items teaser */}
                    <div className="rounded-xl bg-gray-50/80 p-2.5 mb-3 border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-500 mb-1">
                        ตัวอย่างเมนูยอดนิยม:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {batch.shop.menuItems.slice(0, 4).map((item) => (
                          <span
                            key={item.id}
                            className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                          >
                            {item.name} (฿{item.price})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link
                      href={`/order/${batch.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:from-orange-700 hover:to-amber-700 transition-all active:scale-[0.98]"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>สั่งอาหารร้านนี้ ➔</span>
                    </Link>

                    <Link
                      href={`/shop/${batch.id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      title="ดูใบส่งครัว & สลิป"
                    >
                      <ChefHat className="h-3.5 w-3.5 text-orange-600" />
                      <span>ใบส่งครัว</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Campus Delivery Desks Quick Showcase */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-600">
                <Building2 className="h-3.5 w-3.5" />
                <span>จุดรับข้าวประจำตึก (7 จุดส่ง)</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                โต๊ะรับส่งอาหารประจำแต่ละตึก
              </h3>
              <p className="text-xs text-gray-500">
                กล่องข้าวจะเขียนชื่อและเบอร์โทร นำไปวางส่งที่โต๊ะล็อบบี้ตึกที่คุณเลือก
              </p>
            </div>

            <button
              onClick={() => setShowDesksModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-800 transition-colors self-start sm:self-auto"
            >
              <span>ดูรูปโต๊ะรับส่ง & แผนที่</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {CAMPUS_LOCATIONS.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setShowDesksModal(true)}
                className="group cursor-pointer rounded-xl border border-gray-200 p-2 text-center hover:border-orange-500 hover:bg-orange-50/20 transition-all"
              >
                <div className="relative h-14 w-full overflow-hidden rounded-lg bg-gray-100 mb-1.5">
                  <img
                    src={loc.photoUrl}
                    alt={loc.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
                    {loc.shortCode}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-orange-600 truncate">
                  {loc.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  โต๊ะล็อบบี้
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
              จุดรับข้าว (7 ตึก)
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
