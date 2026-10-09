"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { BatchWithDetails } from "@/lib/types";
import {
  CheckCircle2,
  MapPin,
  Clock,
  ShoppingBag,
  ArrowLeft,
  Search,
  Camera,
  ExternalLink,
  ChefHat,
  Package,
} from "lucide-react";

interface Props {
  initialBatch: BatchWithDetails;
  batchId: string;
}

export default function DeliveryClient({ initialBatch, batchId }: Props) {
  const [batch] = useState<BatchWithDetails>(initialBatch);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = (batch.orders || []).filter((ord) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      ord.customerName.toLowerCase().includes(query) ||
      String(ord.orderNumber).includes(query) ||
      (ord.boxLabel || "").toLowerCase().includes(query) ||
      ord.items.some((it) => it.name.toLowerCase().includes(query))
    );
  });

  const isDelivered = batch.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-gray-50 text-gray-900 pb-16">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>กลับหน้าหลัก</span>
          </Link>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>ดูออเดอร์ของฉัน</span>
          </Link>
        </div>

        {/* Hero Delivery Status Card */}
        <div className="rounded-3xl border-2 border-emerald-500 bg-white p-5 sm:p-7 shadow-lg shadow-emerald-900/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {isDelivered ? "✓ ส่งถึงโต๊ะตึก M4 แล้ว" : "กำลังนำส่ง"}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                  อาหารร้าน {batch.shop.name}
                </h1>
                <p className="text-xs text-gray-500">
                  {batch.deliveredAt
                    ? `ส่งถึงจุดรับเมื่อเวลา ${new Date(batch.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} น.`
                    : `รอบส่งมื้อเที่ยง (${batch.orders.length} กล่อง)`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs sm:text-right shrink-0">
              <div className="text-[11px] font-bold text-emerald-900 flex items-center sm:justify-end gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                <span>จุดรับอาหาร</span>
              </div>
              <div className="font-black text-sm text-emerald-950 mt-0.5">
                โต๊ะส่งของ Delivery ชั้น 1 ตึก M4
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                เคาน์เตอร์ชั้น 1 ฝั่งซ้าย
              </div>
            </div>
          </div>

          {/* Delivery Photo Evidence */}
          {batch.deliveryPhotoUrl ? (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-emerald-600" />
                  <span>รูปถ่ายหลักฐานบนโต๊ะตึก M4:</span>
                </span>
                <span className="text-[11px] text-gray-500">ตรวจสอบตำแหน่งกล่องของคุณ</span>
              </div>

              <div className="relative rounded-2xl border-2 border-emerald-500/80 overflow-hidden bg-gray-900 shadow-inner max-h-96 flex items-center justify-center">
                <img
                  src={batch.deliveryPhotoUrl}
                  alt={`หลักฐานส่งอาหาร ${batch.shop.name}`}
                  className="w-full max-h-96 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500 text-xs">
              ยังไม่มีรูปถ่ายหลักฐานจุดส่ง
            </div>
          )}
        </div>

        {/* Box List Section */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                <span>รายชื่อกล่องอาหาร ({batch.orders.length} กล่อง)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ตรวจสอบหมายเลขกล่องของคุณแล้วไปหยิบที่โต๊ะ M4 ได้เลยครับ
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ หรือเลขกล่อง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-8 pr-3 py-1.5 text-xs text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              ไม่พบกล่องอาหารที่ตรงกับ &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-lg bg-gray-900 text-white px-2 py-0.5 text-xs font-mono font-bold">
                      #{String(ord.orderNumber).padStart(2, "0")}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      โต๊ะตึก M4
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-sm text-gray-900">
                      {ord.customerName}
                    </div>
                    <div className="text-xs text-gray-700 mt-1 space-y-0.5">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>
                            {it.quantity}x {it.name}
                            {it.customNote && (
                              <span className="text-amber-800 text-[11px] italic"> ({it.customNote})</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {ord.boxLabel && (
                    <div className="rounded-lg bg-white border border-gray-200 px-2 py-1 text-[11px] font-mono text-gray-600 truncate">
                      เขียนหน้ากล่อง: <strong>{ord.boxLabel}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom Navigation Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="text-xs text-gray-600">
            ต้องการตรวจสอบสถานะออเดอร์ทั้งหมด หรือดูสลิปของตัวเอง?
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors shrink-0"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>ไปที่หน้า &ldquo;ออเดอร์ของฉัน&rdquo;</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
