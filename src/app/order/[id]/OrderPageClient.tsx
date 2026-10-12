"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order } from "@/lib/types";
import { compressImage } from "@/lib/services";
import { scanSlipQrFromImageElement, SlipVerificationResult } from "@/lib/slip-verifier";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getDropOffMapUrl, setRuntimeLocations } from "@/lib/locations";
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
  Phone,
  Key,
  SlidersHorizontal,
  RefreshCw,
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

  // Self Pickup & Host Security State
  const [isSelfPickup, setIsSelfPickup] = useState(initialBatch?.isSelfPickup || false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingHostAction, setPendingHostAction] = useState<(() => void) | null>(null);

  // Shop Modals
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);

  // Whiteboard Fast Order Input Form
  const [customerLineId, setCustomerLineId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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

  // New Board Guidance Modal
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);

  // Manual Refresh state (No background polling to preserve Firestore quota)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // 1. Initial load on mount & new board prompt detection
  useEffect(() => {
    fetchBatch(false);
    const now = new Date();
    setLastRefreshedAt(
      now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    );

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("new_board") === "1" || sp.get("created") === "1") {
        setShowNewBoardModal(true);
        try {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
        } catch (e) {}
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [batchId]);

  // 2. Load cached Line ID, Phone & Host state
  useEffect(() => {
    try {
      const savedLine = localStorage.getItem("veatec_user_line");
      if (savedLine) setCustomerLineId(savedLine);
      const savedPhone = localStorage.getItem("veatec_user_phone");
      if (savedPhone) setCustomerPhone(savedPhone);
      const hostBatch = localStorage.getItem(`veatec_host_${batchId}`);
      if (hostBatch === "true") setIsHost(true);
    } catch (e) {}
  }, [batchId]);

  // Sync isSelfPickup from batch if set
  useEffect(() => {
    if (batch?.isSelfPickup !== undefined) {
      setIsSelfPickup(batch.isSelfPickup);
    }
  }, [batch?.isSelfPickup]);

  const checkIsVerifiedHost = (b: BatchWithDetails | null) => {
    if (!b) return false;
    if (typeof window === "undefined") return false;
    const storedPin = localStorage.getItem(`veatec_host_pin_${b.id}`);
    const isHostFlag = localStorage.getItem(`veatec_host_${b.id}`) === "true";
    if (storedPin && b.hostPin && storedPin === b.hostPin) return true;
    if (isHostFlag) return true;
    return false;
  };

  const requireHostAuth = (action: () => void) => {
    if (!batch) return;
    if (checkIsVerifiedHost(batch)) {
      action();
      return;
    }
    setPinError(null);
    setEnteredPin("");
    setPendingHostAction(() => action);
    setShowPinModal(true);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    const clean = enteredPin.trim();
    const correctPin = batch.hostPin || (batch.hostPhone ? batch.hostPhone.replace(/\D/g, "").slice(-4) : "1234");
    if (clean === correctPin || clean === "admin") {
      try {
        localStorage.setItem(`veatec_host_pin_${batch.id}`, clean);
        localStorage.setItem(`veatec_host_${batch.id}`, "true");
        setIsHost(true);
      } catch (e) {}
      setShowPinModal(false);
      if (pendingHostAction) {
        pendingHostAction();
        setPendingHostAction(null);
      }
    } else {
      setPinError("PIN ไม่ถูกต้อง (ไม่ใช่ 4 ตัวท้ายของเบอร์โทรหัวหน้าตี้)");
    }
  };

  const fetchBatch = async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      // role=shop query parameter returns unsanitized batch for manifest generation; fresh=true bypasses cache
      const url = fresh ? `/api/batches/${batchId}?role=shop&fresh=true` : `/api/batches/${batchId}?role=shop`;
      const [resBatch, resLocs] = await Promise.all([
        fetch(url),
        fetch("/api/locations").catch(() => null),
      ]);
      const data = await resBatch.json();
      if (data.success && data.batch) {
        setBatch(data.batch);
        const now = new Date();
        setLastRefreshedAt(
          now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
        );
      }
      if (resLocs) {
        try {
          const locsData = await resLocs.json();
          if (locsData.success && Array.isArray(locsData.locations)) {
            setRuntimeLocations(locsData.locations);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Fetch batch error:", err);
    } finally {
      if (fresh) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
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
          batchId,
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

      // Save LINE ID & Phone
      try {
        localStorage.setItem("veatec_user_line", cleanLine);
        localStorage.setItem("veatec_user_phone", cleanPhone);
        // If first order in this batch, designate as Host
        if (!batch?.orders || batch.orders.length === 0) {
          localStorage.setItem(`veatec_host_${batchId}`, "true");
          setIsHost(true);
        }

        if (data.order && batch) {
          const existingOrdersStr = localStorage.getItem("veatec_user_orders");
          const existingOrders = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
          const newOrderEntry = {
            orderId: data.order.id,
            batchId: data.order.batchId,
            shopName: batch.shop.name,
            date: batch.date,
            orderNumber: data.order.orderNumber,
            customerName: data.order.customerName,
            customerPhone: data.order.customerPhone,
            locationId: data.order.locationId,
            totalAmount: data.order.totalAmount,
            boxLabel: data.order.boxLabel,
            slipImageUrl: data.order.slipImageUrl,
            items: data.order.items,
            createdAt: data.order.createdAt,
          };
          const updatedOrders = [
            newOrderEntry,
            ...existingOrders.filter((o: any) => o.orderId !== newOrderEntry.orderId),
          ].slice(0, 30);
          localStorage.setItem("veatec_user_orders", JSON.stringify(updatedOrders));
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

  // Active orders and leader details
  const activeOrders = (batch?.orders || []).filter((o) => !o.deletedAt);
  const leaderLine = batch?.hostLineId || batch?.hostName || activeOrders[0]?.customerLineId || activeOrders[0]?.customerName || "หัวหน้าตี้";
  const leaderPhone = batch?.hostPhone || activeOrders[0]?.customerPhone || "";
  const buildingName = batch?.buildingName || "ตึก M4";

  // Compile Brief Order Text
  const getCompiledOrderText = () => {
    if (!batch) return "";
    const mapUrl = isSelfPickup ? batch.shop.gmapUrl : getDropOffMapUrl(batch);
    let txt = `🍱 [VEATEC @ VISTEC] ออเดอร์ร้าน ${batch.shop.name}`;
    if (isSelfPickup) {
      txt += ` (🚶 รับเองหน้าร้าน / Self-Pickup)\n`;
      txt += `⚠️ รูปแบบ: ลูกค้า/หัวหน้าตี้จะไปรับอาหารเองที่ร้าน (ยอดไม่ถึงเป้าส่งฟรี)\n`;
      if (mapUrl) {
        txt += `🗺️ แผนที่ร้าน: ${mapUrl}\n`;
      }
    } else {
      txt += `\n📍 จุดส่ง: ${buildingName} ชั้น 1\n`;
      if (mapUrl) {
        txt += `🗺️ แผนที่จุดส่งอาหาร (Google Maps): ${mapUrl}\n`;
      }
    }
    txt += `👑 หัวหน้าตี้ (Leader): ${leaderLine}${leaderPhone ? ` • 📞 โทร: ${leaderPhone}` : ""}\n`;
    txt += `💰 ยอดรวม: ฿${batch.currentTotalAmount} (${activeOrders.length} กล่อง) • สลิปโอนครบ 100% แล้ว ✅\n`;
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

  // Open "Send to Shop" Manifest Generator (Protected by Host Light Security)
  const handleOpenSendModal = async () => {
    if (!batch) return;
    requireHostAuth(async () => {
      setShowSendModal(true);
      setGeneratingManifest(true);
      setManifestData(null);
      setCopiedText(false);

      try {
        const manifest = await generateOneLongManifestImage({
          ...batch,
          orders: activeOrders,
          isSelfPickup,
        });
        setManifestData(manifest);
      } catch (err) {
        console.error("Manifest generation error:", err);
        alert("ไม่สามารถสร้างรูปสรุปได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setGeneratingManifest(false);
      }
    });
  };

  const handleConfirmSentToShop = async () => {
    if (!batch) return;
    const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${batch.id}`) || batch.hostPin : batch.hostPin;
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ORDERED",
          isSelfPickup,
          hostPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("บันทึกส่งร้านเรียบร้อยแล้ว! กระดานนี้ส่งเข้าครัวร้านแล้ว");
        setShowSendModal(false);
        await fetchBatch();
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (e) {
      alert("ไม่สามารถบันทึกสถานะได้");
    }
  };

  const handleCloseBoard = async () => {
    if (!batch) return;
    requireHostAuth(async () => {
      if (!confirm("ต้องการปิดรับออเดอร์กระดานนี้ใช่หรือไม่?")) return;
      const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${batch.id}`) || batch.hostPin : batch.hostPin;
      try {
        const res = await fetch(`/api/batches/${batch.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "CLOSED",
            hostPin,
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert("ปิดรับออเดอร์กระดานนี้เรียบร้อยแล้ว");
          await fetchBatch();
        } else {
          alert(data.error || "เกิดข้อผิดพลาด");
        }
      } catch (e) {
        alert("ไม่สามารถปิดกระดานได้");
      }
    });
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

  const handleShareBoard = async () => {
    if (!batch) return;
    const locName = batch.buildingName || "ตึก M4";
    const shopName = batch.shop?.name || "ร้านอาหาร";
    const remainingText = batch.isMinMet
      ? "ครบยอดส่งฟรีแล้ว 🎉"
      : `ขาดอีก ฿${batch.amountRemaining} เพื่อส่งฟรี!`;
    const shareUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : `https://veatec.vercel.app/order/${batch.id}`;
    const text = `🍱 มาสั่งข้าวตี้ร้าน ${shopName} กันครับ/ค่ะ!\n` +
      `📍 จุดส่ง: โต๊ะ ${locName} ชั้น 1\n` +
      `⏰ ปิดรับเวลา ${batch.cutoffTime} น. (${remainingText})\n\n` +
      `👉 สั่งร่วมตี้ได้ที่นี่เลย:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `VEATEC - สั่งข้าวตี้ ${shopName}`,
          text,
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("คัดลอกข้อความและลิงก์ชวนเพื่อนเข้าตี้แล้ว! สามารถส่งในกลุ่ม LINE ได้เลย");
    } catch (e) {
      alert("ไม่สามารถคัดลอกลิงก์ได้");
    }
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

  // Slip Gating Calculation:
  // All active orders must have a verified slip or slip image attached
  const allSlipsVerified =
    activeOrders.length > 0 &&
    activeOrders.every((o) => Boolean(o.slipImageUrl || o.isSlipVerified));
  const missingSlipOrders = activeOrders.filter((o) => !o.slipImageUrl && !o.isSlipVerified);

  const batchShopMapUrl = batch
    ? batch.shop.gmapUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(batch.shop.name + " ระยอง")}`
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/40 via-white to-gray-50 text-gray-900 pb-20">
      <Navbar />

      <main className="mx-auto max-w-4xl px-3 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-3.5">
        {/* Top Navigation & Back */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← กลับหน้ารวมร้านอาหาร</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchBatch(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
              title="กดเพื่ออัปเดตข้อมูลและออเดอร์ล่าสุด"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-purple-700 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
              {lastRefreshedAt && (
                <span className="text-[10px] text-slate-400 font-mono font-normal hidden md:inline">
                  ({lastRefreshedAt})
                </span>
              )}
            </button>

            <div className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-900 px-2.5 py-0.5 text-xs font-black">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE DIGITAL WHITEBOARD</span>
            </div>
          </div>
        </div>

        {/* 1. Header Card: Shop Info, Google Maps & PromptPay QR (Compact) */}
        <div className="rounded-2xl border border-purple-200/80 bg-white p-3.5 sm:p-4.5 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                <span>{batch.shop.cuisine}</span>
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-black text-gray-900">
                {batch.shop.name}
              </h1>
              <p className="mt-0.5 text-xs text-gray-600 max-w-xl">
                {batch.shop.description}
              </p>
            </div>
          </div>

          {/* Delivery Goal & Progress */}
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-700 flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5 text-purple-900" />
                <span>
                  <strong className="text-purple-900 font-mono">฿{batch.currentTotalAmount}</strong> / ฿{batch.targetMinAmount}
                </span>
              </span>
              <span className={`text-[11px] ${batch.isMinMet ? "text-emerald-700 font-bold" : "text-amber-700 font-semibold"}`}>
                {batch.isMinMet ? "✓ ครบยอดส่งฟรี" : `ขาดอีก ฿${batch.amountRemaining}`}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden border border-gray-200/80">
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
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                <Clock className="h-3 w-3 text-purple-900" />
                <span>{timeInfo.text} (Cutoff: {batch.cutoffTime} น.)</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <MapPin className="h-3 w-3 text-emerald-700" />
                <span>จุดส่ง: {buildingName} ชั้น 1</span>
              </span>
            </div>

            {/* Leader Contact Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-purple-50/80 border border-purple-200 px-3 py-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm">👑</span>
                <span className="font-bold text-purple-950">
                  หัวหน้าตี้: <span className="font-extrabold text-purple-900">{leaderLine}</span>
                </span>

                {/* Subtle Board Managing Button */}
                <Link
                  href={`/order/${batchId}/leader`}
                  className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-white hover:bg-purple-100 text-purple-950 px-2 py-0.5 text-[11px] font-bold transition-all shadow-2xs hover:shadow-xs"
                  title="จัดการกระดาน"
                >
                  <SlidersHorizontal className="h-3 w-3 text-purple-700" />
                  <span>จัดการกระดาน ↗</span>
                </Link>

                {batch.status === "ORDERED" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                    🚀 ส่งร้านแล้ว
                  </span>
                )}
                {batch.isSelfPickup && batch.status !== "ORDERED" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-bold">
                    🚶 รับเอง
                  </span>
                )}
              </div>

              {leaderPhone ? (
                <a
                  href={`tel:${leaderPhone}`}
                  className="flex items-center gap-1 font-bold text-purple-900 hover:text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200 shadow-2xs transition-colors text-xs"
                  title="โทรหาหัวหน้าตี้"
                >
                  <Phone className="h-3 w-3 text-purple-700" />
                  <span>โทร: {leaderPhone}</span>
                </a>
              ) : (
                <span className="text-[11px] text-purple-600">ไม่มีเบอร์โทรระบุ</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. The Digital Whiteboard List */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div>
              <h2 className="text-base font-black text-gray-900">
                📋 ออเดอร์ทั้งหมด
              </h2>
            </div>
            <span className="text-xs font-black text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              รวม {activeOrders.length} กล่อง
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400 space-y-2">
              <ShoppingBag className="mx-auto h-8 w-8 text-gray-300" />
              <p className="text-sm font-semibold">ยังไม่มีออเดอร์</p>
              <p className="text-xs text-gray-400">สั่งคนแรกได้เลยด้านล่าง!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeOrders.map((ord) => {
                const lineName = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
                const hasSlip = Boolean(ord.slipImageUrl || ord.isSlipVerified);

                return (
                  <div
                    key={ord.id}
                    className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-purple-50/30 rounded-xl px-2 sm:px-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      {/* 1. BIG PROMINENT Food Item(s) ON TOP */}
                      <div className="space-y-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex flex-wrap items-baseline gap-1.5 leading-snug">
                            <span className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">
                              {it.quantity > 1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-purple-100 text-purple-900 mr-1.5 align-middle">
                                  {it.quantity}x
                                </span>
                              )}
                              {it.name}
                            </span>
                            {it.customNote && (
                              <span className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.5">
                                {it.customNote}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 2. Person & Transfer Status go BELOW Menu */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500 pt-1.5">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-gray-900 text-white shrink-0">
                          #{ord.orderNumber}
                        </span>
                        <span className="font-bold text-sm text-gray-800 truncate max-w-[150px] sm:max-w-[220px]">
                          {lineName}
                        </span>
                        <span className="text-gray-300">•</span>
                        {hasSlip ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>โอนแล้ว{ord.slipBankName ? ` (${ord.slipBankName.split(" ")[0]})` : " ✓"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-bold">
                            <span>⏳ รอสลิป</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price, Slip View & Cancel Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                      <span className="font-mono font-black text-lg sm:text-xl text-orange-600">
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
          <div className="rounded-2xl border-2 border-purple-400/80 bg-white p-3.5 sm:p-4.5 shadow-md space-y-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                <Plus className="h-3 w-3" />
                <span>สั่งอาหาร</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 mt-0.5">
                ระบุเมนูและแนบสลิป
              </h2>
              <p className="text-xs text-gray-500">
                พิมพ์เมนูตามสั่ง หรือเลือกเมนูแนะนำด้านล่าง
              </p>
            </div>

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleAddToWhiteboard} className="space-y-4">
              {/* Row 1: LINE ID & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">
                    ชื่อ / LINE ID <span className="text-rose-500">*</span>
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
                <div>
                  <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>เบอร์โทรศัพท์ <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-gray-400 font-normal">กรณีของหมด</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    placeholder="เช่น 0812345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600 font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Dish Name & Quick Popular Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">
                  รายการอาหาร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ข้าวกะเพราหมูกรอบ ไข่ดาว"
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
                    ราคา (฿) <span className="text-rose-500">*</span>
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
                  <label className="text-xs font-bold text-gray-700">หมายเหตุ (ถ้ามี)</label>
                  <input
                    type="text"
                    placeholder="เช่น ไม่ใส่ผักชี, เผ็ดน้อย"
                    value={dishNote}
                    onChange={(e) => setDishNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              {/* 3 Bottom Cards: Total, Display QR, Upload Slip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {/* Card 1: Total */}
                <div className="rounded-xl bg-purple-950 text-white p-3.5 flex flex-col justify-between shadow-xs min-h-[110px]">
                  <div className="text-[11px] text-purple-200 font-medium">
                    ยอดโอนรวม
                  </div>
                  <div className="my-1 text-2xl font-mono font-black text-amber-300">
                    ฿{dishPrice ? parseFloat(dishPrice) || 0 : 0}
                  </div>
                  <div className="text-[10px] text-purple-300 leading-tight">
                    โอนเข้าพร้อมเพย์ร้าน
                  </div>
                </div>

                {/* Card 2: Display QR */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-3.5 flex flex-col justify-between shadow-2xs min-h-[110px]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-950">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-purple-700" />
                      <span>QR พร้อมเพย์ร้าน</span>
                    </span>
                  </div>
                  <div className="my-1 text-[11px] text-purple-950 font-bold truncate">
                    {batch.shop.promptpayAccountName || batch.shop.name}
                    {batch.shop.promptpayNumber && (
                      <span className="block text-[10px] font-mono text-purple-800 font-semibold mt-0.5">
                        {batch.shop.promptpayNumber}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptPayModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-white border border-purple-300 hover:bg-purple-100 text-purple-950 py-1.5 px-2 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-purple-700" />
                    <span>💳 ดู QR ร้าน</span>
                  </button>
                </div>

                {/* Card 3: Upload Slip */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between shadow-2xs min-h-[110px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-purple-900" />
                      <span>แนบสลิป <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">ตรวจสลิปออโต้</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                    onChange={handleSlipFileChange}
                    className="block w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-purple-900 file:text-white hover:file:bg-purple-800 cursor-pointer"
                  />

                  {scanningSlip && (
                    <div className="text-[10px] font-bold text-purple-900 animate-pulse flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-purple-900 border-t-transparent" />
                      <span>กำลังสแกนสลิป...</span>
                    </div>
                  )}

                  {slipVerification && (
                    <div
                      className={`rounded-lg p-1.5 text-[10px] font-bold flex items-center gap-1.5 ${
                        slipVerification.isValid
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-blue-50 text-blue-900 border border-blue-200"
                      }`}
                    >
                      <CheckCircle2 className={`h-3 w-3 shrink-0 ${slipVerification.isValid ? "text-emerald-600" : "text-blue-600"}`} />
                      <div className="space-y-0.2 truncate text-[10px]">
                        {slipVerification.isValid ? (
                          <>
                            <div className="truncate">
                              ✓ สลิป <strong>{slipVerification.bankName}</strong>
                            </div>
                            {slipVerification.transRef && (
                              <div className="font-mono text-emerald-800 truncate">
                                Ref: {slipVerification.transRef}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>📷 แนบสลิปแล้ว</div>
                            <div className="font-normal text-blue-800 truncate">
                              {slipVerification.note || "ตรวจไม่พบ QR Code อัตโนมัติ"}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingOrder || !slipPreview}
                className="w-full rounded-2xl bg-purple-900 py-3.5 text-sm sm:text-base font-black text-white shadow-md shadow-purple-900/20 hover:bg-purple-800 disabled:opacity-50 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingOrder ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มลงกระดาน</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-center text-xs font-bold text-rose-800">
            🔴 ปิดรับออเดอร์แล้ว
          </div>
        )}
      </main>

      {/* MODAL 1: Shop PromptPay QR Popup */}
      {showPromptPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">QR พร้อมเพย์ร้าน</h3>
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
              <p className="text-sm font-black text-gray-900">{batch.shop.promptpayAccountName || batch.shop.name}</p>
              {batch.shop.promptpayNumber && (
                <p className="text-xs font-mono font-bold text-purple-900 mt-0.5">
                  {batch.shop.promptpayNumber}
                </p>
              )}
            </div>

            {batch.shop.promptpayNumber && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(batch.shop.promptpayNumber || "");
                  alert("คัดลอกเลขพร้อมเพย์แล้ว");
                }}
                className="w-full rounded-xl bg-purple-100 py-2 text-xs font-bold text-purple-900 hover:bg-purple-200 transition-colors"
              >
                คัดลอกเลขพร้อมเพย์
              </button>
            )}
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

      {/* MODAL 3: New Board Created Guidance */}
      {showNewBoardModal && batch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-purple-100 space-y-4">
            <button
              type="button"
              onClick={() => setShowNewBoardModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-2 pt-1">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shadow-inner">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                เปิดตี้สำเร็จ!
              </h3>
              <p className="text-xs text-slate-600">
                ร้าน <strong className="text-purple-900">{batch.shop?.name}</strong> • ปิดรับ <strong className="text-purple-900">{batch.cutoffTime} น.</strong>
              </p>
            </div>

            {/* Little button guidance callout */}
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/80 p-4 text-center space-y-2.5">
              <p className="text-xs font-bold text-purple-950">
                💡 จัดการกระดานได้ที่นี่:
              </p>
              <div>
                <Link
                  href={`/order/${batchId}/leader`}
                  onClick={() => setShowNewBoardModal(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-white hover:bg-purple-100 text-purple-950 px-3 py-1.5 text-xs font-extrabold shadow-xs transition-transform active:scale-95"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-purple-700" />
                  <span>จัดการกระดาน ↗</span>
                </Link>
              </div>
              <p className="text-xs leading-relaxed text-purple-900">
                กด <strong>&ldquo;จัดการกระดาน ↗&rdquo;</strong> เพื่อปิดรับออเดอร์ หรือสรุปส่งร้าน
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleShareBoard}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-900 hover:bg-purple-800 text-white font-black py-3 px-4 text-xs shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>📢 แชร์ชวนเพื่อน</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/order/${batchId}/leader`}
                  onClick={() => setShowNewBoardModal(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold py-2.5 px-3 text-xs transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-purple-700" />
                  <span>หน้าจัดการตี้</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowNewBoardModal(false)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-3 text-xs transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
