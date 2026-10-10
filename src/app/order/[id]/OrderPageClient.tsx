"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order } from "@/lib/types";
import { compressImage } from "@/lib/services";
import { scanSlipQrFromImageElement, SlipVerificationResult } from "@/lib/slip-verifier";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getTimeRemaining } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  MapPin,
  Clock,
  ExternalLink,
  CreditCard,
  Share2,
  Copy,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Camera,
  X,
  Check,
  Trash2,
  Send,
  Plus,
  ShoppingBag,
} from "lucide-react";

interface Props {
  batchId: string;
  initialBatch: BatchWithDetails | null;
}

export default function OrderPageClient({ batchId, initialBatch }: Props) {
  const router = useRouter();

  // Live Batch State
  const [batch, setBatch] = useState<BatchWithDetails | null>(initialBatch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shop Modals
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);

  // Whiteboard Fast Order Input Form
  const [customerLineId, setCustomerLineId] = useState("");
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishNote, setDishNote] = useState("");

  // Slip Upload & Instant Verification State
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [scanningSlip, setScanningSlip] = useState(false);
  const [slipVerification, setSlipVerification] = useState<SlipVerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submitting Order State
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Send to Shop & Manifest Modal State
  const [showSendModal, setShowSendModal] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [manifestData, setManifestData] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Host Identification (stored locally for party initiator)
  const [isHost, setIsHost] = useState(false);

  // 1. Poll Batch every 3.5 seconds
  useEffect(() => {
    fetchBatch();
    const interval = setInterval(fetchBatch, 3500);
    return () => clearInterval(interval);
  }, [batchId]);

  // 2. Load cached Line ID & Host state
  useEffect(() => {
    try {
      const savedLine = localStorage.getItem("veatec_user_line");
      if (savedLine) setCustomerLineId(savedLine);
      const hostBatch = localStorage.getItem(`veatec_host_${batchId}`);
      if (hostBatch === "true") setIsHost(true);
    } catch (e) {}
  }, [batchId]);

  const fetchBatch = async () => {
    try {
      // role=shop query parameter returns unsanitized batch for manifest generation
      const res = await fetch(`/api/batches/${batchId}?role=shop`);
      const data = await res.json();
      if (data.success && data.batch) {
        setBatch(data.batch);
      }
    } catch (err) {
      console.warn("Poll batch error:", err);
    }
  };

  // Handle Slip Upload & Immediate BOT QR Scan
  const handleSlipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitError(null);
    setSlipFile(file);
    setScanningSlip(true);
    setSlipVerification(null);

    try {
      // 1. Create preview and compress for storage
      const compressedDataUrl = await compressImage(file, 1000, 0.85);
      setSlipPreview(compressedDataUrl);

      // 2. Scan for BOT Slip QR code using HTML Image element
      const tempImg = new Image();
      tempImg.onload = async () => {
        const verifyRes = await scanSlipQrFromImageElement(tempImg);
        setSlipVerification(verifyRes);
        setScanningSlip(false);
      };
      tempImg.src = compressedDataUrl;
    } catch (err: any) {
      console.error("Slip processing error:", err);
      setScanningSlip(false);
    }
  };

  // Submit Order directly to the Whiteboard
  const handleAddToWhiteboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanLine = customerLineId.trim();
    const cleanDish = dishName.trim();
    const priceNum = parseFloat(dishPrice);

    if (!cleanLine) {
      setSubmitError("กรุณากรอก LINE ID หรือชื่อแสดงผล");
      return;
    }
    if (!cleanDish) {
      setSubmitError("กรุณากรอกเมนูอาหารที่ต้องการสั่ง");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setSubmitError("กรุณาระบุราคาอาหารเป็นตัวเลขที่ถูกต้อง");
      return;
    }
    if (!slipPreview) {
      setSubmitError("กรุณาแนบรูปสลิปโอนเงิน (Force Transfer)");
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          customerName: cleanLine,
          customerLineId: cleanLine,
          customerPhone: "",
          locationId: "loc-m4",
          items: [
            {
              name: cleanDish,
              price: priceNum,
              quantity: 1,
              customNote: dishNote.trim() || undefined,
            },
          ],
          totalAmount: priceNum,
          slipImageUrl: slipPreview,
          slipTransRef: slipVerification?.transRef,
          slipBankCode: slipVerification?.bankCode,
          slipBankName: slipVerification?.bankName,
          isSlipVerified: slipVerification?.isValid || false,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการลงชื่อ");
      }

      // Save LINE ID
      try {
        localStorage.setItem("veatec_user_line", cleanLine);
        // If first order in this batch, designate as Host
        if (!batch?.orders || batch.orders.length === 0) {
          localStorage.setItem(`veatec_host_${batchId}`, "true");
          setIsHost(true);
        }
      } catch (e) {}

      // Reset form
      setDishName("");
      setDishPrice("");
      setDishNote("");
      setSlipFile(null);
      setSlipPreview(null);
      setSlipVerification(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Confetti & refresh
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      await fetchBatch();
    } catch (err: any) {
      setSubmitError(err.message || "ไม่สามารถลงชื่อบนไวท์บอร์ดได้");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Cancel order (with audit trace)
  const handleCancelOrder = async (orderId: string, orderNumber: number, customerName: string) => {
    if (!confirm(`ยืนยันการยกเลิกกล่อง #${orderNumber} (${customerName}) ใช่หรือไม่?\n(ระบบจะบันทึกประวัติการยกเลิกไว้)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orders?id=${orderId}&reason=Cancelled by Host&by=${encodeURIComponent(customerLineId || "Host")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("ยกเลิกรายการเรียบร้อยแล้ว");
        fetchBatch();
      } else {
        alert(data.error || "ไม่สามารถยกเลิกได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการยกเลิก");
    }
  };

  // Compile Brief Order Text
  const getCompiledOrderText = () => {
    if (!batch) return "";
    let txt = `🍱 [VEATEC @ VISTEC] ออเดอร์ร้าน ${batch.shop.name}\n`;
    txt += `📍 จุดส่ง: โต๊ะส่งอาหาร Delivery ชั้น 1 ตึก M4\n`;
    txt += `💰 ยอดรวม: ฿${batch.currentTotalAmount} (${batch.orders.length} กล่อง) • สลิปโอนครบ 100% แล้ว ✅\n`;
    txt += `------------------------------------\n`;
    batch.orders.forEach((o) => {
      const lineTag = o.customerLineId ? `LINE: ${o.customerLineId}` : o.customerName;
      const itemsStr = o.items.map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}${it.customNote ? ` (${it.customNote})` : ""}`).join(", ");
      txt += `#${o.orderNumber} ${lineTag} — ${itemsStr} (฿${o.totalAmount})\n`;
    });
    txt += `------------------------------------\n`;
    txt += `🧾 รูปสลิปทั้งหมดดูได้ที่ภาพใบสรุปยาวที่แนบมาครับ/ค่ะ`;
    return txt;
  };

  // Open "Send to Shop" Manifest Generator
  const handleOpenSendModal = async () => {
    if (!batch) return;
    setShowSendModal(true);
    setGeneratingManifest(true);
    setManifestData(null);
    setCopiedText(false);

    try {
      const manifest = await generateOneLongManifestImage(batch);
      setManifestData(manifest);
    } catch (err) {
      console.error("Manifest generation error:", err);
      alert("ไม่สามารถสร้างรูปสรุปได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setGeneratingManifest(false);
    }
  };

  // Share Manifest to LINE
  const handleShareToLine = async () => {
    if (!manifestData || !batch) return;

    const shareText = getCompiledOrderText();

    // 1. Try Native Web Share API with File
    if (navigator.share && navigator.canShare) {
      const imageFile = new File([manifestData.blob], `veatec-order-${batch.shop.name}-${batch.date}.jpg`, {
        type: "image/jpeg",
      });

      if (navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({
            title: `ออเดอร์ร้าน ${batch.shop.name}`,
            text: shareText,
            files: [imageFile],
          });
          return;
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.warn("Native share failed, falling back to download & LINE scheme", err);
          } else {
            return; // User cancelled share sheet
          }
        }
      }
    }

    // 2. Fallback: Download image and open LINE app with text
    const link = document.createElement("a");
    link.href = manifestData.dataUrl;
    link.download = `veatec-order-${batch.shop.name}-${batch.date}.jpg`;
    link.click();

    // Copy text to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
    } catch (e) {}

    alert("บันทึกรูปภาพสรุปและคัดลอกข้อความแล้ว! กำลังเปิด LINE เพื่อให้คุณส่งให้ร้าน...");
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank");
  };

  if (!batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-900 border-t-transparent" />
          <span className="text-sm font-bold text-gray-700">กำลังโหลดกระดานไวท์บอร์ด...</span>
        </div>
      </div>
    );
  }

  const timeInfo = getTimeRemaining(batch.cutoffTime, batch.date);
  const isBatchClosed = batch.status !== "OPEN" || timeInfo.isExpired;
  const activeOrders = (batch.orders || []).filter((o) => !o.deletedAt);

  // Slip Gating Calculation:
  // All active orders must have a verified slip or slip image attached
  const allSlipsVerified =
    activeOrders.length > 0 &&
    activeOrders.every((o) => Boolean(o.slipImageUrl || o.isSlipVerified));
  const missingSlipOrders = activeOrders.filter((o) => !o.slipImageUrl && !o.isSlipVerified);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/40 via-white to-gray-50 text-gray-900 pb-20">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 space-y-5">
        {/* Top Navigation & Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← กลับหน้ารวมร้านอาหาร</span>
          </Link>
          <div className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-900 px-3 py-1 text-xs font-black">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE DIGITAL WHITEBOARD</span>
          </div>
        </div>

        {/* 1. Header Card: Shop Info, Google Maps & PromptPay QR */}
        <div className="rounded-3xl border border-purple-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                <span>{batch.shop.cuisine}</span>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-gray-900">
                {batch.shop.name}
              </h1>
              <p className="mt-1 text-xs text-gray-600 max-w-xl">
                {batch.shop.description}
              </p>
            </div>

            {/* Quick Actions: Google Maps & PromptPay QR */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {batch.shop.gmapUrl && (
                <a
                  href={batch.shop.gmapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 shadow-2xs transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-rose-600" />
                  <span>Google Maps ↗</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowPromptPayModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100 shadow-2xs transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5 text-purple-700" />
                <span>💳 ดู QR พร้อมเพย์ร้าน</span>
              </button>
            </div>
          </div>

          {/* Delivery Goal & Progress */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-700 flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-purple-900" />
                <span>
                  ยอดสั่งตอนนี้: <strong className="text-purple-900 text-sm">฿{batch.currentTotalAmount}</strong> / ฿{batch.targetMinAmount}
                </span>
              </span>
              <span className={batch.isMinMet ? "text-emerald-700 font-black" : "text-amber-700"}>
                {batch.isMinMet
                  ? "🎉 ครบยอดส่งฟรีที่ตึก M4 แล้ว!"
                  : `ขาดอีก ฿${batch.amountRemaining} เพื่อส่งฟรี`}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden border border-gray-200/80">
              <div
                className={`h-full transition-all duration-500 ${
                  batch.isMinMet
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                    : "bg-gradient-to-r from-amber-400 to-orange-500"
                }`}
                style={{ width: `${Math.min(100, (batch.currentTotalAmount / batch.targetMinAmount) * 100)}%` }}
              />
            </div>

            {/* Time & Destination Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-purple-900" />
                <span>{timeInfo.text} (Cutoff: {batch.cutoffTime} น.)</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                <span>จุดส่ง: โต๊ะส่งอาหาร Delivery ชั้น 1 ตึก M4</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Gated "Send to Shop" Action Bar (Slip-Gated) */}
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-900 p-4 sm:p-5 text-white shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  {allSlipsVerified ? "READY TO SEND" : "SLIP VERIFICATION"}
                </span>
                <span className="text-xs text-purple-200">
                  {activeOrders.length} กล่องบนกระดาน
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black mt-1">
                {allSlipsVerified
                  ? "สลิปครบ 100% แล้ว พร้อมส่งออเดอร์ให้ร้าน! 🎉"
                  : `รอแนบสลิปให้ครบก่อนส่งร้าน (${missingSlipOrders.length} กล่องยังไม่แนบสลิป)`}
              </h2>
            </div>

            {/* Trigger Button or Status Notice */}
            <div>
              {allSlipsVerified ? (
                <button
                  type="button"
                  onClick={handleOpenSendModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black px-5 py-3 text-sm sm:text-base shadow-lg shadow-black/20 active:scale-95 transition-all w-full sm:w-auto"
                >
                  <Send className="h-4 w-4" />
                  <span>🚀 รวมส่งร้าน (Send to Shop)</span>
                </button>
              ) : (
                <div className="text-xs text-amber-200 font-semibold bg-white/10 px-3 py-2 rounded-xl border border-white/15">
                  {missingSlipOrders.length > 0 ? (
                    <span>
                      รอสลิปจาก:{" "}
                      <strong>
                        {missingSlipOrders.map((o) => o.customerLineId || o.customerName).join(", ")}
                      </strong>
                    </span>
                  ) : (
                    <span>ยังไม่มีออเดอร์บนไวท์บอร์ด</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. The Digital Whiteboard List */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-black text-gray-900">
                📋 รายชื่อบนไวท์บอร์ด (Live Orders List)
              </h2>
              <p className="text-xs text-gray-500">
                ทุกคนเห็นรายการเดียวกันแบบเรียลไทม์ ตรวจสอบสลิปได้ทันที
              </p>
            </div>
            <span className="text-xs font-black text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              รวม {activeOrders.length} กล่อง
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400 space-y-2">
              <ShoppingBag className="mx-auto h-8 w-8 text-gray-300" />
              <p className="text-sm font-semibold">ยังไม่มีใครลงชื่อบนกระดานนี้</p>
              <p className="text-xs text-gray-400">เป็นคนแรกที่เปิดตี้ร้านนี้ได้เลยด้านล่าง!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeOrders.map((ord) => {
                const lineName = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
                const hasSlip = Boolean(ord.slipImageUrl || ord.isSlipVerified);

                return (
                  <div
                    key={ord.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white font-mono font-bold text-xs shrink-0 mt-0.5">
                        #{ord.orderNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{lineName}</span>
                          {hasSlip ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>โอนแล้ว {ord.slipBankName ? `(${ord.slipBankName})` : "✓"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                              <span>⏳ รอสลิป</span>
                            </span>
                          )}
                        </div>

                        {/* Dish Details */}
                        <div className="text-xs text-gray-700 mt-0.5 font-medium">
                          {ord.items.map((it, idx) => (
                            <span key={idx}>
                              {it.quantity > 1 ? `${it.quantity}x ` : ""}
                              <strong>{it.name}</strong>
                              {it.customNote && <span className="text-amber-800 italic"> ({it.customNote})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Price, Slip View & Cancel Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="font-mono font-black text-sm sm:text-base text-orange-600">
                        ฿{ord.totalAmount}
                      </span>

                      {ord.slipImageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSlip({
                              url: ord.slipImageUrl,
                              title: `สลิปกล่อง #${ord.orderNumber} (${lineName})`,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-purple-50 hover:border-purple-300 transition-colors shadow-2xs"
                        >
                          <Eye className="h-3 w-3 text-purple-700" />
                          <span>ดูสลิป</span>
                        </button>
                      )}

                      {/* Delete with trace (Host only or before sent) */}
                      {isHost && batch.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                          className="p-1 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="ยกเลิกออเดอร์นี้ (บันทึกประวัติ)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. The 1-Screen Order Input Form (Force Transfer) */}
        {!isBatchClosed ? (
          <div className="rounded-3xl border-2 border-purple-400/80 bg-white p-5 sm:p-6 shadow-md space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">
                <Plus className="h-3.5 w-3.5" />
                <span>ลงชื่อสั่งอาหาร (Join Whiteboard)</span>
              </div>
              <h2 className="text-lg font-black text-gray-900 mt-1">
                พิมพ์เมนูที่คุณอยากกิน แล้วแนบสลิปเพื่อขึ้นกระดาน
              </h2>
              <p className="text-xs text-gray-500">
                ร้านป้าทำอาหารตามสั่งได้ทุกอย่าง หรือแตะเลือกจากเมนูยอดนิยมด้านล่าง
              </p>
            </div>

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleAddToWhiteboard} className="space-y-4">
              {/* Row 1: LINE ID / Name */}
              <div>
                <label className="text-xs font-bold text-gray-700">
                  LINE ID หรือชื่อของคุณ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Golf หรือ @golf_123"
                  value={customerLineId}
                  onChange={(e) => setCustomerLineId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Row 2: Dish Name & Quick Popular Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">
                  เมนูที่ต้องการสั่ง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="พิมพ์เมนูตามใจชอบ เช่น ข้าวกะเพราหมูกรอบ ไข่ดาวไม่สุก"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />

                {/* Popular Dish Chips for 1-Tap Autofill */}
                {batch.shop.menuItems && batch.shop.menuItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-gray-400">เมนูแนะนำ:</span>
                    {batch.shop.menuItems.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setDishName(m.name);
                          setDishPrice(String(m.price));
                        }}
                        className="rounded-lg border border-purple-200 bg-purple-50/60 px-2.5 py-1 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors"
                      >
                        {m.name} (฿{m.price})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: Price & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">
                    ราคาอาหาร (฿) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="เช่น 60"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-sm font-bold text-orange-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                  <input
                    type="text"
                    placeholder="เช่น ไม่ใส่ผักชี, เผ็ดน้อย"
                    value={dishNote}
                    onChange={(e) => setDishNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              {/* Row 4: Slip Upload with Automatic BOT Slip QR Verification */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-purple-700" />
                      <span>แนบสลิปโอนเงิน (Force Transfer) <span className="text-rose-500">*</span></span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      สแกนจ่ายพร้อมเพย์ร้าน แล้วแนบรูปสลิปเพื่อขึ้นกระดาน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptPayModal(true)}
                    className="text-xs font-bold text-purple-700 hover:underline"
                  >
                    ดู QR พร้อมเพย์ร้าน
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                  onChange={handleSlipFileChange}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-900 file:text-white hover:file:bg-purple-800 cursor-pointer"
                />

                {/* Instant Scan Results */}
                {scanningSlip && (
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900 animate-pulse">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-900 border-t-transparent" />
                    <span>กำลังสแกน QR Code ตรวจสอบสลิปธนาคาร...</span>
                  </div>
                )}

                {slipVerification && (
                  <div
                    className={`rounded-xl p-3 text-xs flex items-center gap-2 font-bold ${
                      slipVerification.isValid
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <div>
                      {slipVerification.isValid ? (
                        <span>
                          ✓ ตรวจพบสลิปธนาคาร <strong>{slipVerification.bankName}</strong> (Ref: {slipVerification.transRef})
                        </span>
                      ) : (
                        <span>{slipVerification.error || "แนบรูปสลิปเรียบร้อย"}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingOrder || !slipPreview}
                className="w-full rounded-2xl bg-purple-900 py-3.5 text-sm sm:text-base font-black text-white shadow-md shadow-purple-900/20 hover:bg-purple-800 disabled:opacity-50 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {submittingOrder ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>กำลังบันทึกลงไวท์บอร์ด...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>+ ลงชื่อบนไวท์บอร์ด (บันทึกออเดอร์)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-center text-xs font-bold text-rose-800">
            🔴 รอบสั่งอาหารนี้ปิดรับแล้ว (หมดเวลา Cutoff)
          </div>
        )}
      </main>

      {/* MODAL 1: Shop PromptPay QR Popup */}
      {showPromptPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">QR พร้อมเพย์ร้านค้า</h3>
              <button
                type="button"
                onClick={() => setShowPromptPayModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto w-52 h-52 bg-white rounded-2xl border-2 border-purple-200 p-2 shadow-inner flex items-center justify-center">
              <img
                src={batch.shop.promptpayQrUrl || `https://promptpay.io/${batch.shop.promptpayNumber}.png`}
                alt="PromptPay QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-xs text-gray-500">ชื่อบัญชี:</p>
              <p className="text-sm font-black text-gray-900">{batch.shop.promptpayAccountName}</p>
              <p className="text-xs font-mono font-bold text-purple-900 mt-0.5">
                {batch.shop.promptpayNumber}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(batch.shop.promptpayNumber);
                alert("คัดลอกเบอร์พร้อมเพย์แล้ว!");
              }}
              className="w-full rounded-xl bg-purple-100 py-2 text-xs font-bold text-purple-900 hover:bg-purple-200 transition-colors"
            >
              คัดลอกหมายเลขพร้อมเพย์
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Slip Viewer */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-h-[90vh] max-w-md rounded-2xl bg-white p-4 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-xs text-gray-900">{selectedSlip.title}</h3>
              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
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

      {/* MODAL 3: "One Long Manifest Image" Generator & Sender */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] rounded-3xl bg-white p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-900 font-bold text-xs">
                  <Send className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-black text-sm text-gray-900">สรุปออเดอร์ส่งร้าน (Send to Shop)</h3>
                  <p className="text-[11px] text-gray-500">สร้างภาพสรุปยาวใบเดียว ฝังสลิปครบทุกกล่อง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Preview Area */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1">
              {generatingManifest ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-900 border-t-transparent" />
                  <span className="text-xs font-black text-purple-900">
                    กำลังสร้างภาพสรุปยาวใบเดียว (รวมสลิปทุกกล่อง)...
                  </span>
                  <span className="text-[11px] text-gray-400">ใช้เวลาประมาณ 1-2 วินาที</span>
                </div>
              ) : manifestData ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>สร้างภาพยาวสำเร็จ! (มีรายการอาหาร จุดส่ง M4 และสลิปทุกใบในรูปเดียว)</span>
                  </div>

                  {/* Long Image Preview */}
                  <div className="rounded-2xl border-2 border-gray-300 overflow-hidden bg-slate-900 shadow-inner max-h-96 overflow-y-auto">
                    <img
                      src={manifestData.dataUrl}
                      alt="One Long Manifest"
                      className="w-full h-auto object-contain"
                    />
                  </div>

                  {/* Brief Text Preview Box */}
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span>ข้อความสรุปสำหรับส่งในแชต:</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(getCompiledOrderText());
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2000);
                        }}
                        className="text-[11px] text-purple-700 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedText ? "✓ คัดลอกแล้ว" : "คัดลอกข้อความ"}</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-sans text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {getCompiledOrderText()}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            {manifestData && (
              <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShareToLine}
                  className="w-full sm:flex-1 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] py-3 text-sm font-black text-white shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  <span>แชร์เข้า LINE ร้านทันที</span>
                </button>

                <a
                  href={manifestData.dataUrl}
                  download={`veatec-order-${batch.shop.name}-${batch.date}.jpg`}
                  className="w-full sm:w-auto rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 py-3 px-4 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>บันทึกรูปยาว</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
