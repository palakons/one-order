"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order } from "@/lib/types";
import { compressImage } from "@/lib/services";
import { scanSlipQrFromImageElement, SlipVerificationResult } from "@/lib/slip-verifier";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getTimeRemaining } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
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
  Camera,
  X,
  Trash2,
  Send,
  Plus,
  ShoppingBag,
  Store,
  Info,
  ShieldCheck,
  Zap,
  Phone,
  Archive,
  ArrowLeft,
} from "lucide-react";

interface Props {
  initialBatches: BatchWithDetails[];
}

export default function HomeClient({ initialBatches }: Props) {
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);

  // Split batches into Live Boards vs Archived/Past Boards
  const isLiveBatch = (b: BatchWithDetails) => {
    const today = new Date().toISOString().split("T")[0];
    if (b.status === "COMPLETED" || b.status === "CANCELLED") return false;
    if (b.date < today) return false;
    return true;
  };

  const liveBatches = useMemo(() => batches.filter(isLiveBatch), [batches]);
  const archivedBatches = useMemo(() => batches.filter((b) => !isLiveBatch(b)), [batches]);

  const [activeBatchId, setActiveBatchId] = useState<string>(
    initialBatches.find(isLiveBatch)?.id || initialBatches[0]?.id || ""
  );
  const [viewingArchivedBatch, setViewingArchivedBatch] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Active batch object: if in archive view, allow selecting from all batches, else prioritize live batches
  const activeBatch = viewingArchivedBatch
    ? batches.find((b) => b.id === activeBatchId) || batches[0] || null
    : liveBatches.find((b) => b.id === activeBatchId) || liveBatches[0] || batches[0] || null;

  // Auto-switch to first live batch if active batch is missing from liveBatches
  useEffect(() => {
    if (!viewingArchivedBatch && liveBatches.length > 0) {
      const existsInLive = liveBatches.some((b) => b.id === activeBatchId);
      if (!existsInLive) {
        setActiveBatchId(liveBatches[0].id);
      }
    }
  }, [liveBatches, activeBatchId, viewingArchivedBatch]);

  // Modals state
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [manifestData, setManifestData] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Whiteboard Form Inputs
  const [customerLineId, setCustomerLineId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishNote, setDishNote] = useState("");

  // Slip upload & BOT verification
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [scanningSlip, setScanningSlip] = useState(false);
  const [slipVerification, setSlipVerification] = useState<SlipVerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Host state
  const [isHost, setIsHost] = useState(false);

  // 1. Poll batches every 3.5s
  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 3500);
    return () => clearInterval(interval);
  }, []);

  // 2. Load cached LINE ID, Phone Number & Host status
  useEffect(() => {
    try {
      const savedLine = localStorage.getItem("veatec_user_line");
      if (savedLine) setCustomerLineId(savedLine);
      const savedPhone = localStorage.getItem("veatec_user_phone");
      if (savedPhone) setCustomerPhone(savedPhone);
      if (activeBatchId) {
        const hostBatch = localStorage.getItem(`veatec_host_${activeBatchId}`);
        setIsHost(hostBatch === "true");
      }
    } catch (e) {}
  }, [activeBatchId]);

  const fetchBatches = async () => {
    try {
      // role=shop returns unsanitized batches for manifest generation
      const res = await fetch("/api/batches?role=shop");
      const data = await res.json();
      if (data.success && Array.isArray(data.batches)) {
        setBatches(data.batches);
      }
    } catch (err) {
      console.warn("Poll batches error:", err);
    }
  };

  // Slip File Change & Auto BOT QR Scan
  const handleSlipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitError(null);
    setSlipFile(file);
    setScanningSlip(true);
    setSlipVerification(null);

    try {
      const compressedDataUrl = await compressImage(file, 1000, 0.85);
      setSlipPreview(compressedDataUrl);

      const tempImg = new Image();
      tempImg.onload = async () => {
        const verifyRes = await scanSlipQrFromImageElement(tempImg);
        setSlipVerification(verifyRes);
        setScanningSlip(false);
      };
      tempImg.src = compressedDataUrl;
    } catch (err) {
      setScanningSlip(false);
    }
  };

  // Add Order directly to Whiteboard
  const handleAddToWhiteboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) return;

    setSubmitError(null);
    const cleanLine = customerLineId.trim();
    const cleanPhone = customerPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    const cleanDish = dishName.trim();
    const priceNum = parseFloat(dishPrice);

    if (!cleanLine) {
      setSubmitError("กรุณากรอก LINE ID หรือชื่อแสดงผล");
      return;
    }
    if (!cleanPhone || phoneDigits.length < 9) {
      setSubmitError("กรุณากรอกเบอร์โทรศัพท์ (อย่างน้อย 9-10 หลัก) เพื่อให้ร้านค้าโทรติดต่อกรณีมีปัญหาในออเดอร์");
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
          batchId: activeBatch.id,
          customerName: cleanLine,
          customerLineId: cleanLine,
          customerPhone: cleanPhone,
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

      try {
        localStorage.setItem("veatec_user_line", cleanLine);
        localStorage.setItem("veatec_user_phone", cleanPhone);
        if (!activeBatch.orders || activeBatch.orders.length === 0) {
          localStorage.setItem(`veatec_host_${activeBatch.id}`, "true");
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

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      await fetchBatches();
    } catch (err: any) {
      setSubmitError(err.message || "ไม่สามารถลงชื่อบนไวท์บอร์ดได้");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Cancel order (with audit trace)
  const handleCancelOrder = async (orderId: string, orderNumber: number, lineName: string) => {
    if (!confirm(`ยืนยันการยกเลิกกล่อง #${orderNumber} (${lineName}) ใช่หรือไม่?\n(ระบบจะบันทึกประวัติการยกเลิกไว้)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orders?id=${orderId}&reason=Cancelled by Host&by=${encodeURIComponent(customerLineId || "Host")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("ยกเลิกรายการเรียบร้อยแล้ว");
        fetchBatches();
      } else {
        alert(data.error || "ไม่สามารถยกเลิกได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการยกเลิก");
    }
  };

  // Compile Brief Text for LINE
  const getCompiledOrderText = () => {
    if (!activeBatch) return "";
    let txt = `🍱 [VEATEC @ VISTEC] ออเดอร์ร้าน ${activeBatch.shop.name}\n`;
    txt += `📍 จุดส่ง: โต๊ะส่งอาหาร Delivery ชั้น 1 ตึก M4\n`;
    txt += `💰 ยอดรวม: ฿${activeBatch.currentTotalAmount} (${activeOrders.length} กล่อง) • สลิปโอนครบ 100% แล้ว ✅\n`;
    txt += `------------------------------------\n`;
    activeOrders.forEach((o) => {
      const lineTag = o.customerLineId ? `LINE: @${o.customerLineId}` : o.customerName;
      const phoneTag = o.customerPhone ? ` • โทร: ${o.customerPhone}` : "";
      const itemsStr = o.items.map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}${it.customNote ? ` (${it.customNote})` : ""}`).join(", ");
      txt += `#${o.orderNumber} ${lineTag}${phoneTag} — ${itemsStr} (฿${o.totalAmount})\n`;
    });
    txt += `------------------------------------\n`;
    txt += `🧾 รูปสลิปทั้งหมดดูได้ที่ภาพใบสรุปยาวที่แนบมาครับ/ค่ะ`;
    return txt;
  };

  // Open "Send to Shop" Modal & Generate Long Manifest Image
  const handleOpenSendModal = async () => {
    if (!activeBatch) return;
    setShowSendModal(true);
    setGeneratingManifest(true);
    setManifestData(null);
    setCopiedText(false);

    try {
      const manifest = await generateOneLongManifestImage({ ...activeBatch, orders: activeOrders });
      setManifestData(manifest);
    } catch (err) {
      console.error("Manifest generation error:", err);
      alert("ไม่สามารถสร้างรูปสรุปได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setGeneratingManifest(false);
    }
  };

  // Share to LINE
  const handleShareToLine = async () => {
    if (!manifestData || !activeBatch) return;
    const shareText = getCompiledOrderText();

    if (navigator.share && navigator.canShare) {
      const imageFile = new File([manifestData.blob], `veatec-order-${activeBatch.shop.name}-${activeBatch.date}.jpg`, {
        type: "image/jpeg",
      });

      if (navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({
            title: `ออเดอร์ร้าน ${activeBatch.shop.name}`,
            text: shareText,
            files: [imageFile],
          });
          return;
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.warn("Native share error:", err);
          } else {
            return;
          }
        }
      }
    }

    // Fallback: Download image and open LINE app with text
    const link = document.createElement("a");
    link.href = manifestData.dataUrl;
    link.download = `veatec-order-${activeBatch.shop.name}-${activeBatch.date}.jpg`;
    link.click();

    try {
      await navigator.clipboard.writeText(shareText);
    } catch (e) {}

    alert("บันทึกรูปภาพสรุปและคัดลอกข้อความแล้ว! กำลังเปิด LINE เพื่อให้คุณส่งให้ร้าน...");
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank");
  };

  const timeInfo = activeBatch ? getTimeRemaining(activeBatch.cutoffTime, activeBatch.date) : null;
  const isBatchClosed = activeBatch ? activeBatch.status !== "OPEN" || timeInfo?.isExpired : false;
  const activeOrders = activeBatch ? (activeBatch.orders || []).filter((o) => !o.deletedAt) : [];

  const allSlipsVerified =
    activeOrders.length > 0 &&
    activeOrders.every((o) => Boolean(o.slipImageUrl || o.isSlipVerified));
  const missingSlipOrders = activeOrders.filter((o) => !o.slipImageUrl && !o.isSlipVerified);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <Navbar />

      {/* Craigslist Lean Minimal Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-900 text-white font-mono font-black text-xs">
                M4
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                VEATEC @ VISTEC M4 — กระดานสั่งข้าวเที่ยง (Digital Whiteboard)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              รวมออเดอร์ส่งฟรีถึงโต๊ะ Delivery ชั้น 1 ตึก M4 • ปิดรับ 11:15 น. ทุกวัน
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 text-emerald-800 px-2.5 py-1 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE SYSTEM</span>
            </span>
            {archivedBatches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchiveModal(true)}
                className="text-slate-500 hover:text-purple-900 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors"
                title="คลังกระดานที่ปิดรอบแล้ว (Archived Boards)"
              >
                <Archive className="h-3.5 w-3.5 text-slate-400" />
                <span>Archive ({archivedBatches.length})</span>
              </button>
            )}
            <Link
              href="/admin"
              className="text-slate-500 hover:text-purple-900 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-md"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 space-y-4">
        {/* 1. Live Shop Tabs Bar & Obscured Archive Button */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
          {liveBatches.map((b, idx) => {
            const isActive = !viewingArchivedBatch && b.id === activeBatchId;
            const isMet = b.currentTotalAmount >= b.targetMinAmount;

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setViewingArchivedBatch(false);
                  setActiveBatchId(b.id);
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl px-3.5 py-2 text-xs font-bold transition-all border-t border-x ${
                  isActive
                    ? "bg-white border-slate-300 text-slate-950 shadow-xs -mb-px z-10 font-black border-b-2 border-b-white"
                    : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                <span>{idx + 1}. {b.shop.name.split(" ")[0]}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                    isMet
                      ? "bg-emerald-600 text-white"
                      : b.currentTotalAmount > 0
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  ฿{b.currentTotalAmount}/{b.targetMinAmount} {isMet ? "🎉" : ""}
                </span>
              </button>
            );
          })}

          {/* Obscured Archive Button on Tabs Bar */}
          {archivedBatches.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchiveModal(true)}
              className="ml-auto flex items-center gap-1.5 whitespace-nowrap rounded-t-xl px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              title="ดูกระดานที่ปิดรอบแล้ว (Archived Boards)"
            >
              <Archive className="h-3.5 w-3.5 text-slate-400" />
              <span>กระดานเก่า ({archivedBatches.length})</span>
            </button>
          )}
        </div>

        {/* When viewing an archived board, show top notification banner */}
        {viewingArchivedBatch && activeBatch && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 text-slate-100 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>กำลังดูกระดานเก่า:</strong> {activeBatch.shop.name} ({activeBatch.date}) • ปิดรับออเดอร์แล้ว (Read-Only)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewingArchivedBatch(false);
                if (liveBatches[0]) setActiveBatchId(liveBatches[0].id);
              }}
              className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-bold transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>กลับกระดานสด</span>
            </button>
          </div>
        )}

        {/* Empty state if no live batches exist right now */}
        {liveBatches.length === 0 && !viewingArchivedBatch ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">ไม่มีกระดานเปิดรับออเดอร์ในขณะนี้</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              กระดานของวันนี้อาจยังไม่ได้เปิด หรือรอบสั่งทั้งหมดเสร็จสิ้นแล้ว
            </p>
            <div className="flex justify-center gap-2 pt-1">
              {archivedBatches.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  <Archive className="h-4 w-4 text-slate-500" />
                  <span>ดูกระดานเก่าในคลัง ({archivedBatches.length})</span>
                </button>
              )}
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-800 shadow-2xs"
              >
                <span>เปิดกระดานใหม่ (Admin)</span>
              </Link>
            </div>
          </div>
        ) : activeBatch ? (
          <div className="space-y-4">
            {/* 2. Active Whiteboard Header Box */}
            <div className="rounded-2xl border border-slate-300 bg-white p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                      {activeBatch.shop.cuisine}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      รอบวันที่: {activeBatch.date}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-1">
                    {activeBatch.shop.name}
                  </h2>
                  <p className="text-xs text-slate-600 max-w-xl mt-0.5">
                    {activeBatch.shop.description}
                  </p>
                </div>

                {/* Google Maps & PromptPay Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeBatch.shop.gmapUrl && (
                    <a
                      href={activeBatch.shop.gmapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <MapPin className="h-3.5 w-3.5 text-rose-600" />
                      <span>Google Maps ↗</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPromptPayModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors shadow-2xs"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-purple-700" />
                    <span>💳 ดู QR พร้อมเพย์ร้าน</span>
                  </button>
                </div>
              </div>

              {/* Progress & Cutoff Status Row */}
              <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800">
                    ยอดรวมตอนนี้: <strong className="text-sm font-black text-purple-950">฿{activeBatch.currentTotalAmount}</strong> / ฿{activeBatch.targetMinAmount}
                    <span className="text-slate-400 font-normal ml-1">({activeOrders.length} กล่อง)</span>
                  </span>
                  <span className={activeBatch.isMinMet ? "text-emerald-700 font-black" : "text-amber-800"}>
                    {activeBatch.isMinMet
                      ? "🎉 ครบยอดส่งฟรีที่ตึก M4 แล้ว!"
                      : `ขาดอีก ฿${activeBatch.amountRemaining} เพื่อส่งฟรี`}
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeBatch.isMinMet
                        ? "bg-emerald-600"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, (activeBatch.currentTotalAmount / activeBatch.targetMinAmount) * 100)}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-semibold text-slate-600">
                  <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                    <Clock className="h-3 w-3 text-purple-900" />
                    <span>{timeInfo?.text} (Cutoff: {activeBatch.cutoffTime} น.)</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <MapPin className="h-3 w-3 text-emerald-700" />
                    <span>ส่งที่: โต๊ะส่งอาหาร Delivery ชั้น 1 ตึก M4</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Slip-Gated "Send to Shop" Action Bar */}
            <div className="rounded-xl border border-slate-300 bg-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${allSlipsVerified ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className="text-xs font-black text-slate-900">
                    {allSlipsVerified
                      ? "สลิปครบ 100% แล้ว พร้อมส่งออเดอร์ให้ร้าน! 🎉"
                      : `รอแนบสลิปให้ครบก่อนส่งร้าน (${missingSlipOrders.length} กล่องยังไม่แนบสลิป)`}
                  </span>
                </div>
                {!allSlipsVerified && missingSlipOrders.length > 0 && (
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    รอสลิปจาก: <strong>{missingSlipOrders.map((o) => o.customerLineId || o.customerName).join(", ")}</strong>
                  </p>
                )}
              </div>

              <div>
                {allSlipsVerified ? (
                  <button
                    type="button"
                    onClick={handleOpenSendModal}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-black px-4 py-2.5 text-xs sm:text-sm shadow-md active:scale-95 transition-all w-full sm:w-auto"
                  >
                    <Send className="h-4 w-4" />
                    <span>🚀 รวมส่งร้าน (Send to Shop)</span>
                  </button>
                ) : (
                  <span className="inline-block text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    ปุ่มจะเปิดเมื่อสลิปครบทุกกล่อง
                  </span>
                )}
              </div>
            </div>

            {/* 4. The Live Whiteboard Table */}
            <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-slate-950">
                    กระดานออเดอร์ร้าน {activeBatch.shop.name}
                  </h3>
                  <span className="text-[11px] font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                    {activeOrders.length} กล่อง
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  อัปเดตเรียลไทม์
                </span>
              </div>

              {activeOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-sm font-bold text-slate-600">ยังไม่มีใครลงชื่อบนกระดานนี้</p>
                  <p className="text-xs text-slate-400">เป็นคนแรกที่เปิดตี้ร้านนี้ได้เลยด้านล่าง!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 font-mono">#</th>
                        <th className="py-2.5 px-3 w-40">ผู้สั่ง / เบอร์ติดต่อ</th>
                        <th className="py-2.5 px-3">รายการอาหาร</th>
                        <th className="py-2.5 px-3 w-20 text-right">ราคา</th>
                        <th className="py-2.5 px-3 w-28 text-center">สลิป</th>
                        <th className="py-2.5 px-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeOrders.map((ord) => {
                        const lineName = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
                        const hasSlip = Boolean(ord.slipImageUrl || ord.isSlipVerified);

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              #{ord.orderNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-900">
                              <span className="font-bold text-xs block">{lineName}</span>
                              {ord.customerPhone && (
                                <a
                                  href={`tel:${ord.customerPhone}`}
                                  className="text-[10px] text-slate-500 hover:text-purple-900 font-mono flex items-center gap-1 mt-0.5"
                                  title="แตะเพื่อโทรหาลูกค้า"
                                >
                                  <Phone className="h-2.5 w-2.5 text-slate-400" />
                                  <span>{ord.customerPhone}</span>
                                </a>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-800 font-medium">
                              {ord.items.map((it, idx) => (
                                <span key={idx}>
                                  {it.quantity > 1 ? `${it.quantity}x ` : ""}
                                  <strong>{it.name}</strong>
                                  {it.customNote && <span className="text-amber-800 italic"> ({it.customNote})</span>}
                                </span>
                              ))}
                            </td>
                            <td className="py-3 px-3 font-mono font-black text-orange-600 text-right">
                              ฿{ord.totalAmount}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {hasSlip ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedSlip({
                                      url: ord.slipImageUrl,
                                      title: `สลิปกล่อง #${ord.orderNumber} (${lineName})`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>{ord.slipBankName ? ord.slipBankName.split(" ")[0] : "ดูสลิป ✓"}</span>
                                </button>
                              ) : (
                                <span className="inline-block rounded bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                  รอสลิป
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isHost && activeBatch.status === "OPEN" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                                  className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                                  title="ยกเลิกออเดอร์นี้"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 5. Fast 1-Screen Order Input Form (Force Transfer) */}
            {!isBatchClosed && !viewingArchivedBatch ? (
              <div className="rounded-2xl border-2 border-purple-900 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-900 text-white font-black text-xs">
                      +
                    </span>
                    <h3 className="font-black text-sm sm:text-base text-slate-950">
                      ลงชื่อสั่งอาหารร้าน {activeBatch.shop.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptPayModal(true)}
                    className="text-xs font-bold text-purple-900 hover:underline"
                  >
                    ดู QR พร้อมเพย์ร้าน ↗
                  </button>
                </div>

                {submitError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleAddToWhiteboard} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Field 1: LINE ID */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">
                        LINE ID หรือชื่อคุณ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น Golf หรือ @golf_123"
                        value={customerLineId}
                        onChange={(e) => setCustomerLineId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                      />
                    </div>

                    {/* Field 2: Phone Number (for shop to call) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>เบอร์โทรศัพท์ (ร้านโทรหาเมื่อมีปัญหา) <span className="text-rose-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">กรณีของหมด</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        required
                        placeholder="เช่น 0812345678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Field 3: Dish Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">
                      เมนูที่ต้องการสั่ง (พิมพ์อิสระ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ข้าวกะเพราหมูกรอบ ไข่ดาวไม่สุก"
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                    />
                  </div>

                  {/* Quick Popular Dish Chips */}
                  {activeBatch.shop.menuItems && activeBatch.shop.menuItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">เมนูแนะนำ:</span>
                      {activeBatch.shop.menuItems.slice(0, 5).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setDishName(m.name);
                            setDishPrice(String(m.price));
                          }}
                          className="rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800 transition-colors"
                        >
                          {m.name} (฿{m.price})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Field 3: Price */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">
                        ราคา (฿) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="เช่น 60"
                        value={dishPrice}
                        onChange={(e) => setDishPrice(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-orange-600 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                      />
                    </div>

                    {/* Field 4: Note */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">
                        หมายเหตุ (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ไม่ใส่ผักชี, พิเศษ"
                        value={dishNote}
                        onChange={(e) => setDishNote(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                      />
                    </div>
                  </div>

                  {/* Field 5: Slip Upload with BOT QR Verification */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-purple-900" />
                        <span>แนบสลิปโอนเงิน (Force Transfer) <span className="text-rose-500">*</span></span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">สแกน QR บนสลิปอัตโนมัติ</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                      onChange={handleSlipFileChange}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-900 file:text-white hover:file:bg-purple-800 cursor-pointer"
                    />

                    {scanningSlip && (
                      <div className="text-[11px] font-bold text-purple-900 animate-pulse flex items-center gap-1.5">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-900 border-t-transparent" />
                        <span>กำลังสแกน QR Code ตรวจสอบสลิปธนาคาร...</span>
                      </div>
                    )}

                    {slipVerification && (
                      <div
                        className={`rounded-lg p-2 text-[11px] font-bold flex items-center gap-1.5 ${
                          slipVerification.isValid
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {slipVerification.isValid
                            ? `✓ ตรวจพบสลิปธนาคาร ${slipVerification.bankName} (Ref: ${slipVerification.transRef})`
                            : (slipVerification.error || "แนบรูปสลิปเรียบร้อย")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submittingOrder || !slipPreview}
                    className="w-full rounded-xl bg-purple-900 py-3 text-xs sm:text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50 active:scale-99 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {submittingOrder ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>กำลังบันทึกลงกระดาน...</span>
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
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center space-y-1 text-slate-600">
                <p className="text-xs font-bold">
                  {viewingArchivedBatch
                    ? "📦 กระดานนี้เป็นคลังประวัติ (ปิดรอบแล้ว - อ่านอย่างเดียว)"
                    : "🔴 รอบสั่งอาหารนี้ปิดรับแล้ว (หมดเวลา Cutoff)"}
                </p>
                {viewingArchivedBatch && liveBatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingArchivedBatch(false);
                      setActiveBatchId(liveBatches[0].id);
                    }}
                    className="text-xs font-bold text-purple-900 underline hover:text-purple-700 pt-1 inline-block"
                  >
                    สลับไปสั่งอาหารบนกระดานสดวันนี้ ↗
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* MODAL 1: PromptPay QR */}
      {showPromptPayModal && activeBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-center space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-xs text-slate-900">QR พร้อมเพย์ร้านค้า</h3>
              <button
                type="button"
                onClick={() => setShowPromptPayModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto w-48 h-48 bg-white rounded-xl border border-slate-300 p-2 shadow-inner flex items-center justify-center">
              <img
                src={activeBatch.shop.promptpayQrUrl || `https://promptpay.io/${activeBatch.shop.promptpayNumber}.png`}
                alt="PromptPay QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-[11px] text-slate-500 font-medium">ชื่อบัญชี:</p>
              <p className="text-sm font-black text-slate-900">{activeBatch.shop.promptpayAccountName}</p>
              <p className="text-xs font-mono font-bold text-purple-900 mt-0.5">
                {activeBatch.shop.promptpayNumber}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(activeBatch.shop.promptpayNumber);
                alert("คัดลอกเบอร์พร้อมเพย์แล้ว!");
              }}
              className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-900 hover:bg-slate-200 transition-colors"
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
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-900">{selectedSlip.title}</h3>
              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 overflow-y-auto max-h-[75vh] flex items-center justify-center bg-slate-50 rounded">
              <img
                src={selectedSlip.url}
                alt="Full Transfer Slip"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: One Long Manifest Image Generator */}
      {showSendModal && activeBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] rounded-2xl bg-white p-5 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-900 text-white font-bold text-xs">
                  <Send className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">สรุปออเดอร์ส่งร้าน (Send to Shop)</h3>
                  <p className="text-[11px] text-slate-500">สร้างภาพสรุปยาวใบเดียว ฝังสลิปครบทุกกล่อง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
              {generatingManifest ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="h-7 w-7 animate-spin rounded-full border-3 border-purple-900 border-t-transparent" />
                  <span className="text-xs font-black text-purple-900">
                    กำลังสร้างภาพสรุปยาวใบเดียว (รวมสลิปทุกกล่อง)...
                  </span>
                  <span className="text-[11px] text-slate-400">ใช้เวลาประมาณ 1-2 วินาที</span>
                </div>
              ) : manifestData ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>สร้างภาพยาวสำเร็จ! (มีรายการอาหาร จุดส่ง M4 และสลิปทุกใบในรูปเดียว)</span>
                  </div>

                  <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-900 shadow-inner max-h-80 overflow-y-auto">
                    <img
                      src={manifestData.dataUrl}
                      alt="One Long Manifest"
                      className="w-full h-auto object-contain"
                    />
                  </div>

                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>ข้อความสรุปสำหรับส่งในแชต:</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(getCompiledOrderText());
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2000);
                        }}
                        className="text-[11px] text-purple-900 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedText ? "✓ คัดลอกแล้ว" : "คัดลอกข้อความ"}</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-sans text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {getCompiledOrderText()}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>

            {manifestData && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShareToLine}
                  className="w-full sm:flex-1 rounded-xl bg-[#06C755] hover:bg-[#05b34c] py-2.5 text-xs sm:text-sm font-black text-white shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  <span>แชร์เข้า LINE ร้านทันที</span>
                </button>

                <a
                  href={manifestData.dataUrl}
                  download={`veatec-order-${activeBatch.shop.name}-${activeBatch.date}.jpg`}
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2.5 px-3.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>บันทึกรูปยาว</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Archived Boards Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                  <Archive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-950">คลังกระดานเก่า (Archived Boards)</h3>
                  <p className="text-xs text-slate-500">กระดานที่ปิดรับออเดอร์แล้ว หรือรอบวันก่อนหน้า</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-100">
              {archivedBatches.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-1">
                  <Archive className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">ยังไม่มีกระดานเก่าในคลัง</p>
                  <p className="text-xs text-slate-400">ทุกกระดานในปัจจุบันยังเปิดเป็น Live Board</p>
                </div>
              ) : (
                archivedBatches.map((b) => (
                  <div key={b.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{b.shop.name}</strong>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          b.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {b.status === "COMPLETED" ? "ส่งแล้ว ✅" : b.status === "CANCELLED" ? "ยกเลิกแล้ว" : "ปิดรอบแล้ว"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                        <span>รอบวันที่: <strong>{b.date}</strong></span>
                        <span>Cutoff: <strong>{b.cutoffTime} น.</strong></span>
                        <span>ยอด: <strong className="text-orange-600">฿{b.currentTotalAmount}</strong> ({b.orders?.filter((o) => !o.deletedAt).length || 0} กล่อง)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBatchId(b.id);
                          setViewingArchivedBatch(true);
                          setShowArchiveModal(false);
                        }}
                        className="rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 px-3 py-1.5 text-xs font-bold transition-colors shadow-2xs"
                      >
                        เปิดดูกระดาน
                      </button>
                      {b.status === "COMPLETED" && (
                        <Link
                          href={`/delivery/${b.id}`}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Camera className="h-3 w-3" />
                          <span>ดูรูปส่ง M4</span>
                        </Link>
                      )}
                      <Link
                        href={`/shop/${b.id}`}
                        target="_blank"
                        className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <span>Kitchen Sheet</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
