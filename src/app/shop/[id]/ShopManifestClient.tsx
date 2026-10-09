"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import LineShareButton from "@/components/LineShareButton";
import { BatchWithDetails, BatchStatus } from "@/lib/types";
import { getLocationById } from "@/lib/locations";
import { changeBatchStatus, compressImage } from "@/lib/services";
import {
  ChefHat,
  ArrowLeft,
  Truck,
  ShoppingBag,
  CheckCircle2,
  Phone,
  Clock,
  Printer,
  Eye,
  X,
  Building2,
  Calendar,
  AlertTriangle,
  Package,
  User,
  Camera,
  Share2,
  Check,
  Copy,
  MapPin,
} from "lucide-react";
import { maskPhoneNumber } from "@/lib/utils";

interface Props {
  batchId: string;
  initialBatch: BatchWithDetails | null;
}

export default function ShopManifestClient({ batchId, initialBatch }: Props) {
  const [batch, setBatch] = useState<BatchWithDetails | null>(initialBatch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; name: string; amount: number } | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"order" | "customer">("order");

  // Delivery evidence photo state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryPhotoData, setDeliveryPhotoData] = useState<string | null>(null);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Quick 1-tap Camera & Gallery input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  const togglePhoneReveal = (id: string) => {
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Load persistent checklist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`veatec_manifest_checked_${batchId}`);
      if (stored) {
        setCheckedItems(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
    const interval = setInterval(fetchBatch, 4000);
    return () => clearInterval(interval);
  }, [batchId]);

  const fetchBatch = async () => {
    try {
      // Request full merchant data to verify slips
      const res = await fetch(`/api/batches/${batchId}?role=shop`);
      const data = await res.json();
      if (data.success) {
        setBatch(data.batch);
      } else {
        if (!batch) setError(data.error || "Batch not found");
      }
    } catch (err: any) {
      if (!batch) setError(err.message || "Failed to load batch");
    }
  };

  const handleStatusChange = async (newStatus: BatchStatus) => {
    if (newStatus === "COMPLETED") {
      setShowDeliveryModal(true);
      return;
    }
    try {
      const updated = await changeBatchStatus(batchId, newStatus);
      setBatch(updated);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDeliverySubmit = async (withPhoto = true) => {
    setUploadingDelivery(true);
    try {
      const photoToSave = withPhoto ? (deliveryPhotoData || undefined) : undefined;
      const updated = await changeBatchStatus(batchId, "COMPLETED", photoToSave);
      setBatch(updated);
      setShowDeliveryModal(false);
      setDeliveryPhotoData(null);
      setPhotoError(null);
    } catch (err: any) {
      alert(err.message || "Failed to complete delivery");
    } finally {
      setUploadingDelivery(false);
    }
  };

  const handleDeliveryPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setPhotoError(null);
        setDeliveryPhotoData(null);
        setCompressingPhoto(true);
        setShowDeliveryModal(true);
        const compressed = await compressImage(file, 900, 0.70);
        if (!compressed || !compressed.startsWith("data:image/")) {
          throw new Error("รูปภาพไม่สมบูรณ์ กรุณาถ่ายภาพใหม่อีกครั้ง หรือเลือกจากอัลบั้ม");
        }
        setDeliveryPhotoData(compressed);
      } catch (err: any) {
        console.error("Compression error:", err);
        setPhotoError(err?.message || "ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง หรือเลือกจากอัลบั้ม");
        setDeliveryPhotoData(null);
      } finally {
        setCompressingPhoto(false);
      }
    }
    e.target.value = "";
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`veatec_manifest_checked_${batchId}`, JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleCopyCookingSummary = () => {
    if (!batch) return;
    const lines = [
      `🍱 สรุปยอดทำอาหารร้าน ${batch.shop.name}`,
      `📅 วันที่: ${batch.date} (รวม ${batch.orders.length} กล่อง)`,
      `---------------------------------`,
      ...cookingSummary.map(
        (it, idx) =>
          `${idx + 1}. ${it.name} x ${it.quantity}${
            it.notes.length > 0 ? ` (${it.notes.join(", ")})` : ""
          }`
      ),
      `---------------------------------`,
      `📍 จุดส่งอาหาร: โต๊ะส่งอาหาร Delivery ชั้น 1 ตึก M4`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  if (!batch) {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="mx-auto max-w-4xl p-8 text-center text-gray-500">
            Loading shop manifest...
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-md p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">Batch Not Found</h2>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Aggregate cooking items
  const cookingSummary: { name: string; quantity: number; notes: string[] }[] = [];
  const itemMap: Record<string, { quantity: number; notes: string[] }> = {};

  batch.orders.forEach((ord) => {
    ord.items.forEach((it) => {
      if (!itemMap[it.name]) {
        itemMap[it.name] = { quantity: 0, notes: [] };
      }
      itemMap[it.name].quantity += it.quantity;
      if (it.customNote) {
        itemMap[it.name].notes.push(it.customNote);
      }
    });
  });

  Object.entries(itemMap).forEach(([name, data]) => {
    cookingSummary.push({
      name,
      quantity: data.quantity,
      notes: data.notes,
    });
  });

  // Building delivery counts
  const buildingBreakdown: Record<string, { count: number; desk: string }> = {};
  batch.orders.forEach((ord) => {
    const loc = getLocationById(ord.locationId);
    const locName = loc ? loc.name : ord.locationId;
    const desk = loc ? loc.deskDetail : "Lobby";
    if (!buildingBreakdown[locName]) {
      buildingBreakdown[locName] = { count: 0, desk };
    }
    buildingBreakdown[locName].count += 1;
  });

  // Group orders by Customer (keyed by phone or name)
  const customerMap: Record<
    string,
    {
      customerName: string;
      customerPhone: string;
      locationId: string;
      orders: typeof batch.orders;
      totalAmount: number;
      items: Array<{ name: string; quantity: number; price: number; notes: string[] }>;
    }
  > = {};

  batch.orders.forEach((ord) => {
    const key = `${ord.customerName}_${ord.customerPhone}`.trim();
    if (!customerMap[key]) {
      customerMap[key] = {
        customerName: ord.customerName,
        customerPhone: ord.customerPhone,
        locationId: ord.locationId,
        orders: [],
        totalAmount: 0,
        items: [],
      };
    }
    customerMap[key].orders.push(ord);
    customerMap[key].totalAmount += ord.totalAmount;

    ord.items.forEach((it) => {
      const existing = customerMap[key].items.find((i) => i.name === it.name);
      if (existing) {
        existing.quantity += it.quantity;
        if (it.customNote) existing.notes.push(it.customNote);
      } else {
        customerMap[key].items.push({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          notes: it.customNote ? [it.customNote] : [],
        });
      }
    });
  });

  const customerList = Object.values(customerMap);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 sm:pb-16">
      <Navbar />

      {/* Hidden Mobile Camera Input with capture="environment" for 1-tap mobile camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleDeliveryPhotoChange}
        className="hidden"
      />
      {/* Hidden Gallery Input in case they want to select an existing photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
        onChange={handleDeliveryPhotoChange}
        className="hidden"
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-orange-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← กลับหน้าหลัก</span>
          </Link>

          {/* Copy LINE Summary & Print */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCookingSummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <Copy className="h-4 w-4 text-emerald-600" />
              <span>{copiedSummary ? "✓ คัดลอกสำเร็จ!" : "คัดลอกสรุปส่ง LINE ร้าน"}</span>
            </button>
            <LineShareButton batch={batch} />
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ใบรายการ</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Quick Delivery Hero Card (When not yet completed) */}
        {batch.status !== "COMPLETED" ? (
          <div className="rounded-3xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 sm:p-6 text-white shadow-xl shadow-emerald-900/15 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs">
                  <Truck className="h-3.5 w-3.5" />
                  <span>1-Click Delivery Update</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  อาหารมาส่งถึงโต๊ะตึก M4 แล้วใช่ไหม?
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
                  วางกล่องอาหารบนโต๊ะ Delivery แล้วแตะถ่ายรูป 1 ครั้ง เพื่อแจ้งเตือนทุกคนทันที!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm sm:text-base font-black text-emerald-900 shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
                >
                  <Camera className="h-5 w-5 text-emerald-600" />
                  <span>📸 ถ่ายรูปส่งอาหาร (Delivered)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm("ยืนยันว่าอาหารส่งถึงโต๊ะ M4 เรียบร้อยแล้ว (ไม่แนบรูปถ่าย)?")) {
                      handleDeliverySubmit(false);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-800/60 border border-emerald-400/40 px-3.5 py-3.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                  title="ส่งอาหารเรียบร้อยโดยไม่แนบรูปถ่าย"
                >
                  <span>ส่งแล้ว (ไม่ถ่ายรูป)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-800/40 border border-white/20 px-3 py-3.5 text-xs font-bold text-emerald-100 hover:bg-emerald-800 transition-colors"
                  title="เลือกรูปจากอัลบั้ม"
                >
                  <span>เลือกรูป</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Delivered Evidence Banner (if completed) */
          <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/90 p-5 sm:p-6 shadow-sm animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shrink-0">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    ✓ นำส่งถึงโต๊ะตึกเรียนแล้ว (Delivered)
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">
                    อาหารส่งถึงจุดรับข้าวประจำตึกเรียบร้อยแล้ว
                  </h2>
                  <p className="text-xs text-emerald-800">
                    {batch.deliveredAt
                      ? `ส่งเมื่อเวลา ${new Date(batch.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} น.`
                      : "ส่งถึงโต๊ะตึกเรียนแล้ว"}
                  </p>
                </div>
              </div>

              {/* Share to LINE button & Retake Photo */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 shadow-2xs"
                >
                  <Camera className="h-4 w-4 text-emerald-600" />
                  <span>ถ่ายรูปใหม่</span>
                </button>

                <a
                  href={`https://line.me/R/msg/text/?${encodeURIComponent(
                    `🍱 [VEATEC @ VISTEC] ข้าวร้าน ${batch.shop.name} มาส่งถึงโต๊ะตึก M4 แล้วครับ/ค่ะ! 🎉\n` +
                    `นศ. และอาจารย์สามารถไปรับกล่องข้าวของตัวเองที่โต๊ะประจำตึก M4 ได้เลย\n` +
                    `👉 ตรวจสอบกล่องของคุณ & ดูรูปถ่ายส่งของ: ${typeof window !== 'undefined' ? `${window.location.origin}/delivery/${batch.id}` : ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#06C755] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#05b34c] transition-all shrink-0"
                >
                  <Share2 className="h-4 w-4" />
                  <span>แชร์แจ้งเตือน LINE</span>
                </a>
              </div>
            </div>

            {/* Drop-off Photo Preview */}
            {batch.deliveryPhotoUrl && (
              <div className="mt-4 pt-3.5 border-t border-emerald-200">
                <div className="text-xs font-bold text-emerald-900 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-emerald-700" />
                    <span>ภาพถ่ายหลักฐานการวางส่งที่โต๊ะ (Food Drop-off Photo):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    เปลี่ยนรูปถ่าย
                  </button>
                </div>
                <div
                  onClick={() =>
                    setSelectedSlip({
                      url: batch.deliveryPhotoUrl!,
                      name: "ภาพถ่ายหลักฐานการวางส่งที่โต๊ะ (Delivery Proof)",
                      amount: batch.currentTotalAmount,
                    })
                  }
                  className="group relative h-48 sm:h-64 w-full sm:w-80 cursor-pointer overflow-hidden rounded-2xl border-2 border-emerald-300 bg-gray-100 shadow-sm"
                >
                  <img
                    src={batch.deliveryPhotoUrl}
                    alt="หลักฐานการวางส่ง"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                    <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-xs flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>กดเพื่อดูรูปขยาย</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Big Delivery Decision Banner */}
        <div
          className={`rounded-3xl border p-6 sm:p-7 shadow-sm transition-all ${
            batch.isMinMet
              ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/50"
              : "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tracking-wide ${
                    batch.isMinMet
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {batch.isMinMet ? (
                    <>
                      <Truck className="h-4 w-4" />
                      <span>ส่งฟรีถึงโต๊ะตึก M4 (ยอดครบแล้ว)</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      <span>รับเองที่หน้าร้าน (ยอดไม่ถึง ฿{batch.targetMinAmount})</span>
                    </>
                  )}
                </span>
                <span className="text-xs font-bold text-gray-600">
                  รอบวันที่: {batch.date} (ปิดรับ: {batch.cutoffTime} น.)
                </span>
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">
                {batch.shop.name} — ใบสรุปออเดอร์ครัว
              </h1>

              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                {batch.isMinMet ? (
                  <>
                    🎉 <strong>ยอดครบส่งฟรีแล้ว! (฿{batch.currentTotalAmount} / ฿{batch.targetMinAmount})</strong> ทำอาหารตามรายการด้านล่าง แล้วนำส่งที่โต๊ะส่งอาหาร ชั้น 1 ตึก M4 ได้เลยครับ/ค่ะ
                  </>
                ) : (
                  <>
                    ⚠️ <strong>ยอดรวม ฿{batch.currentTotalAmount}</strong> (ยังไม่ถึงยอดส่งฟรี ฿{batch.targetMinAmount}) ลูกค้าโอนเงินชำระครบแล้ว เตรียมไว้ให้ลูกค้ามารับที่หน้าร้านครับ/ค่ะ
                  </>
                )}
              </p>
            </div>

            {/* Total orders and amount */}
            <div className="rounded-2xl bg-white border border-gray-200/80 p-4 shrink-0 text-center sm:text-right shadow-2xs">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                ยอดเงินโอนรวม (ครบ 100%)
              </div>
              <div className="text-3xl font-black text-orange-600">
                ฿{batch.currentTotalAmount}
              </div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">
                {batch.orders.length} กล่อง / ออเดอร์
              </div>
            </div>
          </div>

          {/* Delivery Drop-off Desk Summary */}
          {batch.isMinMet && (
            <div className="mt-6 pt-4 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-emerald-950">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>จุดส่งอาหาร: โต๊ะส่งอาหาร Delivery ชั้น 1 ตึก M4 (เคาน์เตอร์ฝั่งซ้าย)</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 self-start sm:self-auto">
                รวม {batch.orders.length} กล่อง
              </span>
            </div>
          )}
        </div>

        {/* Section 1: Kitchen Cooking Sheet */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 shrink-0">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">
                  1. สรุปรายการอาหารสำหรับครัว (ทำอาหารตามยอดนี้)
                </h2>
                <p className="text-xs text-gray-500">
                  รวมจำนวนจานทั้งหมด แตะที่รายการเพื่อติ๊กถูกเมื่อทำเสร็จ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCookingSummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-100 transition-colors shrink-0"
            >
              <Copy className="h-3.5 w-3.5 text-orange-600" />
              <span>{copiedSummary ? "✓ คัดลอกสำเร็จ!" : "คัดลอกสรุปส่ง LINE ร้าน"}</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {cookingSummary.map((item, idx) => {
              const isDone = Boolean(checkedItems[`cook-${idx}`]);
              return (
                <div
                  key={idx}
                  onClick={() => toggleCheck(`cook-${idx}`)}
                  className={`flex items-start justify-between py-3 cursor-pointer rounded-lg px-2 transition-colors ${
                    isDone ? "bg-gray-50 opacity-60 line-through" : "hover:bg-orange-50/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-sm text-gray-900">{item.name}</div>
                      {item.notes.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.notes.map((note, nIdx) => (
                            <span
                              key={nIdx}
                              className="inline-block mr-2 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 rounded px-1.5 py-0.5"
                            >
                              โน้ต: {note}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-base font-black text-orange-600">
                    x {item.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Box Labels & Packaging Guide with Toggle */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                2. จัดอาหารใส่กล่อง & เขียนป้ายหน้ากล่อง
              </h2>
              <p className="text-xs text-gray-500">
                สลับดูแยกตามกล่องเดี่ยว หรือรวมตามชื่อคนสั่งเพื่อใส่ถุงเดียวกัน
              </p>
            </div>

            {/* View Mode Toggle: By Order vs By Customer */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("order")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "order"
                    ? "bg-white text-orange-600 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>แยกตามกล่อง ({batch.orders.length} กล่อง)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("customer")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "customer"
                    ? "bg-white text-orange-600 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>รวมตามคนสั่ง ({customerList.length} คน)</span>
              </button>
            </div>
          </div>

          {/* View 1: By Order (Individual Boxes) */}
          {viewMode === "order" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500">
                แสดง {batch.orders.length} กล่อง สำหรับจัดอาหารและเขียนเบอร์กล่อง:
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {batch.orders.map((ord) => {
                  const loc = getLocationById(ord.locationId);
                  const locName = loc ? loc.name : ord.locationId;
                  const isChecked = Boolean(checkedItems[`order-${ord.id}`]);

                  return (
                    <div
                      key={ord.id}
                      className={`rounded-xl border p-4 space-y-2.5 transition-all ${
                        isChecked
                          ? "border-emerald-300 bg-emerald-50/30 opacity-70"
                          : "border-gray-200 bg-gray-50/60 hover:border-orange-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(`order-${ord.id}`)}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                          <span className="inline-flex items-center rounded-md bg-gray-900 text-white px-2 py-0.5 text-xs font-mono font-bold">
                            #{String(ord.orderNumber).padStart(2, "0")}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                          {locName}
                        </span>
                      </div>

                      {/* Recipient */}
                      <div>
                        <div className="font-bold text-sm text-gray-900">
                          {ord.customerName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={`tel:${ord.customerPhone}`}
                            className="text-xs text-gray-600 hover:text-orange-600 flex items-center gap-1 font-medium"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{revealedPhones[ord.id] ? ord.customerPhone : maskPhoneNumber(ord.customerPhone)}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setRevealedPhones((prev) => ({ ...prev, [ord.id]: !prev[ord.id] }))}
                            className="text-[10px] text-gray-400 hover:text-gray-700 underline"
                          >
                            {revealedPhones[ord.id] ? "ซ่อน" : "แสดงเบอร์"}
                          </button>
                        </div>
                      </div>

                      {/* Food items */}
                      <div className="pt-2 border-t border-gray-200/80 text-xs text-gray-800 space-y-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {it.quantity}x <strong>{it.name}</strong>
                              {it.customNote && (
                                <span className="text-amber-800 italic"> ({it.customNote})</span>
                              )}
                            </span>
                            <span className="font-semibold text-gray-600">฿{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Box Label text to write */}
                      <div className="rounded-lg bg-white border border-gray-200 p-2 text-[11px] font-mono text-gray-700">
                        <strong className="text-gray-900">เขียนหน้ากล่อง:</strong> {ord.boxLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View 2: By Customer (Grouped Bags) */}
          {viewMode === "customer" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500">
                รวมรายการของลูกค้า {customerList.length} คน สำหรับจัดใส่ถุงรวม:
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {customerList.map((customer, cIdx) => {
                  const loc = getLocationById(customer.locationId);
                  const locName = loc ? loc.name : customer.locationId;
                  const isChecked = Boolean(checkedItems[`cust-${cIdx}`]);
                  const boxNumbers = customer.orders
                    .map((o) => `#${String(o.orderNumber).padStart(2, "0")}`)
                    .join(", ");

                  return (
                    <div
                      key={cIdx}
                      className={`rounded-2xl border p-5 space-y-3 transition-all ${
                        isChecked
                          ? "border-emerald-300 bg-emerald-50/30 opacity-70"
                          : "border-gray-200 bg-white hover:border-orange-300 shadow-2xs"
                      }`}
                    >
                      {/* Customer Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(`cust-${cIdx}`)}
                            className="mt-1 h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-gray-900">
                                {customer.customerName}
                              </h3>
                              <span className="rounded bg-orange-100 text-orange-800 text-[11px] font-bold px-2 py-0.5">
                                {customer.orders.length} กล่อง
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <a
                                href={`tel:${customer.customerPhone}`}
                                className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{revealedPhones[customer.customerPhone] ? customer.customerPhone : maskPhoneNumber(customer.customerPhone)}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => setRevealedPhones((prev) => ({ ...prev, [customer.customerPhone]: !prev[customer.customerPhone] }))}
                                className="text-[10px] text-gray-400 hover:text-gray-700 underline"
                              >
                                {revealedPhones[customer.customerPhone] ? "ซ่อน" : "แสดงเบอร์"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Location Desk Badge */}
                        <div className="text-right">
                          <span className="inline-block text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
                            {locName}
                          </span>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            กล่อง: <strong>{boxNumbers}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Aggregated food items for this customer */}
                      <div className="space-y-1.5 text-xs text-gray-800">
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                          รายการอาหารในถุงนี้:
                        </div>
                        {customer.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-start rounded-lg bg-gray-50 px-2.5 py-1.5"
                          >
                            <div>
                              <span className="font-bold text-gray-900">
                                {it.quantity}x {it.name}
                              </span>
                              {it.notes.length > 0 && (
                                <div className="text-[11px] text-amber-800 italic">
                                  ↳ {it.notes.join(", ")}
                                </div>
                              )}
                            </div>
                            <span className="font-semibold text-gray-700">
                              ฿{it.price * it.quantity}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Customer total amount and slips */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">ยอดโอนรวม:</span>
                          <span className="font-black text-sm text-orange-600">
                            ฿{customer.totalAmount}
                          </span>
                        </div>

                        {/* Slips preview button */}
                        <div className="flex gap-1.5">
                          {customer.orders.map((ord, oIdx) => (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() =>
                                setSelectedSlip({
                                  url: ord.slipImageUrl,
                                  name: customer.customerName,
                                  amount: ord.totalAmount,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-colors"
                            >
                              <Eye className="h-3 w-3 text-orange-600" />
                              <span>สลิป #{ord.orderNumber}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Transfer Slip Evidence Gallery */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                3. ตรวจสอบสลิปโอนเงินเข้าบัญชีร้าน (Payment Slips)
              </h2>
              <p className="text-xs text-gray-500">
                แตะที่รูปเพื่อดูสลิปขนาดเต็ม และตรวจสอบยอดเงินเข้ากับแอปธนาคารของร้าน
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {batch.orders.length} สลิปโอนเงิน
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {batch.orders.map((ord) => (
              <div
                key={ord.id}
                onClick={() =>
                  setSelectedSlip({
                    url: ord.slipImageUrl,
                    name: ord.customerName,
                    amount: ord.totalAmount,
                  })
                }
                className="group cursor-pointer rounded-xl border border-gray-200 p-2.5 hover:border-orange-500 hover:shadow-md transition-all bg-white"
              >
                {/* Thumbnail */}
                <div className="relative h-44 w-full overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={ord.slipImageUrl}
                    alt={`Slip ${ord.customerName}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                    <span className="opacity-0 group-hover:opacity-100 rounded-full bg-black/70 p-2 text-white">
                      <Eye className="h-4 w-4" />
                    </span>
                  </div>
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white">
                    #{String(ord.orderNumber).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-2 text-xs">
                  <div className="font-bold text-gray-900 truncate">
                    {ord.customerName}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-black text-orange-600">฿{ord.totalAmount}</span>
                    <span className="text-[10px] text-gray-600 font-semibold">
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Delivery Status */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${batch.status === "COMPLETED" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                <h3 className="font-bold text-sm sm:text-base text-gray-900">
                  {batch.status === "COMPLETED"
                    ? "สถานะ: ส่งอาหารเรียบร้อยแล้ว (Delivered)"
                    : "สถานะ: กำลังรวบรวม & เตรียมจัดส่ง (In Progress)"}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {batch.status === "COMPLETED"
                  ? "อาหารวางไว้ที่โต๊ะรับ Delivery ชั้น 1 ตึก M4 เรียบร้อยแล้ว (LINE ส่งแจ้งเตือนแล้ว)"
                  : "เมื่ออาหารมาถึงโต๊ะ M4 แตะปุ่มถ่ายรูปเพื่อแจ้งเตือนนักศึกษา/อาจารย์ทุกคนทันที"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {batch.status === "COMPLETED" ? (
                <>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                  >
                    <Camera className="h-4 w-4 text-emerald-600" />
                    <span>ถ่ายรูปใหม่</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("ต้องการรีเซ็ตสถานะกลับเป็นเปิดรับออเดอร์หรือไม่?")) {
                        handleStatusChange("OPEN");
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    รีเซ็ตสถานะ
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Camera className="h-4 w-4" />
                  <span>📸 ถ่ายรูปส่งอาหาร (Mark Delivered)</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* High-Res Slip Zoom Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[90vh] max-w-lg rounded-2xl bg-white p-4 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm text-gray-900">{selectedSlip.name}</h3>
                <span className="text-xs font-black text-orange-600">
                  Amount: ฿{selectedSlip.amount}
                </span>
              </div>
              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 overflow-y-auto max-h-[75vh] flex items-center justify-center bg-gray-50 rounded-lg">
              <img
                src={selectedSlip.url}
                alt="Full Transfer Slip"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delivery Evidence Photo Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">ถ่ายรูปส่งอาหาร (Delivered)</h3>
                  <p className="text-[11px] text-gray-500">โต๊ะ Delivery ชั้น 1 ตึก M4</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryModal(false);
                  setDeliveryPhotoData(null);
                  setPhotoError(null);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                ถ่ายรูปกล่องอาหารที่วางไว้บนโต๊ะรับอาหาร เพื่อให้นักศึกษา / อาจารย์เปิดดูและมารับได้ทันที
              </p>

              {photoError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{photoError}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                    >
                      <Camera className="h-3.5 w-3.5" /> ถ่ายใหม่อีกครั้ง
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                    >
                      เลือกจากอัลบั้ม
                    </button>
                  </div>
                </div>
              )}

              {compressingPhoto ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-gray-50 rounded-2xl border border-emerald-200 shadow-inner">
                  <div className="h-9 w-9 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
                  <span className="text-xs font-black text-emerald-950">กำลังเตรียมและปรับขนาดรูปถ่าย...</span>
                  <span className="text-[11px] text-gray-500">กรุณารอสักครู่ (ไม่เกิน 1-2 วินาที)</span>
                </div>
              ) : deliveryPhotoData ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl border-2 border-emerald-500 overflow-hidden bg-gray-50 max-h-72 flex items-center justify-center shadow-inner">
                    <img
                      src={deliveryPhotoData}
                      alt="Delivery evidence preview"
                      className="max-h-68 w-auto object-contain rounded-xl"
                    />
                    <div className="absolute top-2 left-2 rounded-full bg-emerald-600/90 text-white px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                      <Check className="h-3 w-3" /> รูปพร้อมส่ง
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <span>รูปถ่ายที่โต๊ะวางอาหาร</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <Camera className="h-3.5 w-3.5" /> ถ่ายใหม่
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-600 font-medium hover:underline"
                      >
                        เลือกรูปอื่น
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-colors"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">ถ่ายรูปด้วยกล้อง</span>
                    <span className="text-[10px] text-emerald-700 mt-0.5">เปิดกล้องทันที</span>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-gray-400 hover:bg-gray-100/70 cursor-pointer transition-colors"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-600 mb-2">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">เลือกจากอัลบั้ม</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">รูปในเครื่อง</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={uploadingDelivery || compressingPhoto || !deliveryPhotoData}
                  onClick={() => handleDeliverySubmit(true)}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all ${
                    deliveryPhotoData && !compressingPhoto && !uploadingDelivery
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 active:scale-98"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  <Check className="h-5 w-5" />
                  <span>
                    {uploadingDelivery
                      ? "กำลังบันทึกและแจ้งเตือน LINE..."
                      : compressingPhoto
                      ? "กำลังเตรียมรูปถ่าย..."
                      : "✅ ยืนยันส่งอาหารทันที (แจ้งทุกคน)"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={uploadingDelivery}
                  onClick={() => handleDeliverySubmit(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  ส่งอาหารแล้ว (ไม่แนบรูปถ่าย)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Delivery Bar on Mobile (only when not completed) */}
      {batch.status !== "COMPLETED" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden border-t border-emerald-200 bg-white/95 backdrop-blur-md p-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
            >
              <Camera className="h-5 w-5" />
              <span>ถ่ายรูปส่งอาหาร (Delivered)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("ยืนยันว่าส่งอาหารเรียบร้อยแล้ว (ไม่แนบรูปถ่าย)?")) {
                  handleDeliverySubmit(false);
                }
              }}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-bold text-gray-700 active:scale-98"
            >
              ไม่ถ่ายรูป
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
