"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order } from "@/lib/types";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getTimeRemaining } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CreditCard,
  Share2,
  Copy,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  Trash2,
  Send,
  ShoppingBag,
  Phone,
  Key,
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
} from "lucide-react";

interface Props {
  batchId: string;
  initialBatch: BatchWithDetails | null;
}

export default function LeaderPageClient({ batchId, initialBatch }: Props) {
  const router = useRouter();

  // Batch State
  const [batch, setBatch] = useState<BatchWithDetails | null>(initialBatch);
  const [loading, setLoading] = useState(false);

  // Authentication State (Phone + PIN)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Self Pickup & Manifest State
  const [isSelfPickup, setIsSelfPickup] = useState(initialBatch?.isSelfPickup || false);
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [manifestData, setManifestData] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // 1. Initial Auto-Auth check from localStorage
  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("veatec_user_phone") || "";
      if (savedPhone) setLoginPhone(savedPhone);

      const storedPin = localStorage.getItem(`veatec_host_pin_${batchId}`);
      const isHostFlag = localStorage.getItem(`veatec_host_${batchId}`) === "true";

      // If initialBatch exists, check if stored credentials match
      if (initialBatch) {
        const correctPin =
          initialBatch.hostPin ||
          (initialBatch.hostPhone ? initialBatch.hostPhone.replace(/\D/g, "").slice(-4) : "1234");

        if ((storedPin && storedPin === correctPin) || isHostFlag) {
          setIsAuthenticated(true);
        }
      } else if (isHostFlag) {
        setIsAuthenticated(true);
      }
    } catch (e) {}
  }, [batchId, initialBatch]);

  // Manual Refresh state (No background polling to preserve Firestore quota)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // 2. Initial load on mount
  useEffect(() => {
    fetchBatch(false);
    const now = new Date();
    setLastRefreshedAt(
      now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    );
  }, [batchId]);

  // 3. Sync isSelfPickup when batch updates
  useEffect(() => {
    if (batch?.isSelfPickup !== undefined) {
      setIsSelfPickup(batch.isSelfPickup);
    }
  }, [batch?.isSelfPickup]);

  const fetchBatch = async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      const url = fresh ? `/api/batches/${batchId}?role=leader&fresh=true` : `/api/batches/${batchId}?role=leader`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.batch) {
        setBatch(data.batch);
        const now = new Date();
        setLastRefreshedAt(
          now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
        );
      }
    } catch (err) {
      console.warn("Fetch batch error:", err);
    } finally {
      if (fresh) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  };

  // Handle Login via Phone + PIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoggingIn(true);

    try {
      const res = await fetch(`/api/batches/${batchId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: loginPhone.trim(),
          pin: loginPin.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "เบอร์โทรศัพท์หรือ PIN ไม่ถูกต้อง");
      }

      // Persist in localStorage for zero friction
      try {
        localStorage.setItem(`veatec_host_pin_${batchId}`, loginPin.trim());
        localStorage.setItem(`veatec_host_${batchId}`, "true");
        localStorage.setItem("veatec_user_phone", loginPhone.trim());
      } catch (e) {}

      setIsAuthenticated(true);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      await fetchBatch();
    } catch (err: any) {
      setAuthError(err.message || "ไม่สามารถเข้าสู่ระบบหัวหน้าตี้ได้");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (confirm("ต้องการออกจากระบบแผงควบคุมหัวหน้าตี้ใช่หรือไม่?")) {
      try {
        localStorage.removeItem(`veatec_host_pin_${batchId}`);
        localStorage.removeItem(`veatec_host_${batchId}`);
      } catch (e) {}
      setIsAuthenticated(false);
      setLoginPin("");
    }
  };

  // Toggle Self-Pickup Mode
  const handleToggleSelfPickup = async () => {
    if (!batch) return;
    const nextVal = !isSelfPickup;
    setIsSelfPickup(nextVal);

    const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${batch.id}`) || batch.hostPin : batch.hostPin;
    try {
      await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: batch.status,
          isSelfPickup: nextVal,
          hostPin,
        }),
      });
      await fetchBatch();
    } catch (e) {}
  };

  // Close or Reopen Board
  const handleToggleBoardStatus = async (newStatus: "CLOSED" | "OPEN") => {
    if (!batch) return;
    const confirmMsg =
      newStatus === "CLOSED"
        ? "ต้องการปิดรับออเดอร์กระดานนี้ใช่หรือไม่? สมาชิกจะไม่สามารถสั่งเพิ่มได้"
        : "ต้องการเปิดรับออเดอร์กระดานนี้ต่อใช่หรือไม่?";
    if (!confirm(confirmMsg)) return;

    setUpdatingStatus(true);
    const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${batch.id}`) || batch.hostPin : batch.hostPin;
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          hostPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(newStatus === "CLOSED" ? "ปิดรับออเดอร์เรียบร้อยแล้ว" : "เปิดรับออเดอร์ต่อเรียบร้อยแล้ว");
        await fetchBatch();
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (e) {
      alert("ไม่สามารถเปลี่ยนสถานะได้");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Cancel order (Host only)
  const handleCancelOrder = async (orderId: string, orderNumber: number, customerName: string) => {
    if (!confirm(`ยืนยันการยกเลิกกล่อง #${orderNumber} (${customerName}) ใช่หรือไม่?\n(ระบบจะบันทึกประวัติการยกเลิกไว้)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orders?id=${orderId}&reason=Cancelled by Leader&by=${encodeURIComponent(batch?.hostName || "Leader")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("ยกเลิกรายการเรียบร้อยแล้ว");
        await fetchBatch();
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
    let txt = `🍱 [VEATEC @ VISTEC] ออเดอร์ร้าน ${batch.shop.name}`;
    if (isSelfPickup) {
      txt += ` (🚶 รับเองหน้าร้าน / Self-Pickup)\n`;
      txt += `⚠️ รูปแบบ: ลูกค้า/หัวหน้าตี้จะไปรับอาหารเองที่ร้าน (ยอดไม่ถึงเป้าส่งฟรี)\n`;
    } else {
      txt += `\n📍 จุดส่ง: ${buildingName} ชั้น 1\n`;
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

  // Open "Send to Shop" Manifest Generator
  const handleOpenSendModal = async () => {
    if (!batch) return;
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
  };

  // Confirm Sent to Shop (Updates status to ORDERED)
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

  // Share Manifest to LINE
  const handleShareToLine = async () => {
    if (!manifestData || !batch) return;
    const shareText = getCompiledOrderText();

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
            return;
          }
        }
      }
    }

    // Fallback: download image and copy text
    const link = document.createElement("a");
    link.href = manifestData.dataUrl;
    link.download = `veatec-order-${batch.shop.name}-${batch.date}.jpg`;
    link.click();

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
          <span className="text-sm font-bold text-gray-700">กำลังโหลดข้อมูลแผงควบคุมหัวหน้าตี้...</span>
        </div>
      </div>
    );
  }

  const timeInfo = getTimeRemaining(batch.cutoffTime, batch.date);
  const allSlipsVerified =
    activeOrders.length > 0 &&
    activeOrders.every((o) => Boolean(o.slipImageUrl || o.isSlipVerified));
  const missingSlipOrders = activeOrders.filter((o) => !o.slipImageUrl && !o.isSlipVerified);

  // VIEW 1: Login Form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50 text-gray-900 pb-20">
        <Navbar />
        <main className="mx-auto max-w-md px-4 py-8 space-y-6">
          <Link
            href={`/order/${batchId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← กลับหน้าไวท์บอร์ด</span>
          </Link>

          <div className="rounded-3xl border border-purple-200 bg-white p-6 shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-2xl shadow-inner mx-auto">
                👑
              </div>
              <h1 className="text-xl font-black text-gray-900">เข้าสู่ระบบหัวหน้าตี้</h1>
              <p className="text-xs text-gray-500">
                ตี้ร้าน <strong className="text-purple-900">{batch.shop.name}</strong> • {buildingName}
              </p>
              <div className="text-[11px] font-semibold text-gray-500 bg-gray-50 py-1.5 px-3 rounded-xl border border-gray-100">
                👑 หัวหน้าตี้: <strong>{leaderLine}</strong>
              </div>
            </div>

            {authError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700">
                  เบอร์โทรศัพท์หัวหน้าตี้ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  placeholder="เช่น 0812345678"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-sm font-mono font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">
                    Host PIN (4 หลัก) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400">ค่าเริ่มต้น: 4 ตัวท้ายของเบอร์โทร</span>
                </div>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="เช่น 1234"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3.5 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-2xl bg-purple-900 py-3 text-sm font-black text-white shadow-md shadow-purple-900/20 hover:bg-purple-800 disabled:opacity-50 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {loggingIn ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>กำลังตรวจสอบสิทธิ์...</span>
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    <span>เข้าสู่ระบบแผงควบคุมหัวหน้าตี้</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // VIEW 2: Leader Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/40 via-white to-gray-50 text-gray-900 pb-20">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 space-y-5">
        {/* Top Navigation & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/order/${batchId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← กลับไปหน้าไวท์บอร์ด</span>
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-black">
              <span>👑 LEADER CONTROL PANEL</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="ออกจากระบบหัวหน้าตี้"
            >
              <LogOut className="h-3 w-3" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* 1. Leader Mission Control Header Card */}
        <div className="rounded-3xl border border-purple-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                  {batch.shop.cuisine}
                </span>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-md ${
                    batch.status === "OPEN"
                      ? "bg-emerald-100 text-emerald-800"
                      : batch.status === "ORDERED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  สถานะ: {batch.status}
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-gray-900">
                {batch.shop.name}
              </h1>
              <p className="mt-1 text-xs text-gray-600">
                จุดส่ง: <strong>{buildingName} ชั้น 1</strong> • รอบวันที่: {batch.date} (Cutoff: {batch.cutoffTime} น.)
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {batch.shop.gmapUrl && (
                <a
                  href={batch.shop.gmapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 shadow-2xs transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-rose-600" />
                  <span>ดูเมนูจาก Maps ↗</span>
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
                  <span className="text-gray-400 font-normal ml-1">({activeOrders.length} กล่อง)</span>
                </span>
              </span>
              <span className={batch.isMinMet ? "text-emerald-700 font-black" : "text-amber-700"}>
                {batch.isMinMet ? "🎉 ครบยอดส่งฟรีแล้ว!" : `ขาดอีก ฿${batch.amountRemaining} เพื่อส่งฟรี`}
              </span>
            </div>

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

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-purple-900" />
                <span>{timeInfo.text} (Cutoff: {batch.cutoffTime} น.)</span>
              </span>

              {/* Board Control Buttons */}
              {batch.status === "OPEN" ? (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleToggleBoardStatus("CLOSED")}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors"
                >
                  <Lock className="h-3.5 w-3.5 text-rose-600" />
                  <span>ปิดรับออเดอร์ก่อนเวลา</span>
                </button>
              ) : batch.status === "CLOSED" ? (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleToggleBoardStatus("OPEN")}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>เปิดรับออเดอร์ต่อ</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* 2. Self-Pickup Option when minimum goal is not met */}
        {!batch.isMinMet && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">🚶</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                  ยอดสั่งยังไม่ถึงเป้าส่งฟรี (ขาดอีก ฿{batch.amountRemaining})
                </h4>
                <p className="text-xs text-amber-800">
                  ในฐานะหัวหน้าตี้ คุณสามารถเลือกสั่งแบบ <strong>"ไปรับเองหน้าร้าน (Self-Pickup)"</strong> เพื่อส่งออเดอร์ให้ร้านทำอาหารได้เลย
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSelfPickup}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-2xs self-start sm:self-auto shrink-0 ${
                isSelfPickup
                  ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400"
                  : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-100/50"
              }`}
            >
              <Check className={`h-3.5 w-3.5 ${isSelfPickup ? "opacity-100" : "opacity-0"}`} />
              <span>{isSelfPickup ? "✓ เลือกรับเองหน้าร้านแล้ว" : "เปลี่ยนเป็น: รับเองหน้าร้าน"}</span>
            </button>
          </div>
        )}

        {/* 3. Send to Shop Control Bar */}
        <div className="rounded-3xl border-2 border-purple-200 bg-purple-900 p-5 sm:p-6 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  {allSlipsVerified ? "READY TO SEND" : "SLIPS PENDING"}
                </span>
                <span className="text-xs text-purple-200">
                  {activeOrders.length} กล่องบนกระดาน
                </span>
                {isSelfPickup && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full">
                    🚶 รับเองหน้าร้าน
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1">
                {allSlipsVerified
                  ? isSelfPickup
                    ? "สลิปครบ 100% แล้ว พร้อมส่งร้านแบบรับเองหน้าร้าน! 🚶"
                    : "สลิปครบ 100% แล้ว พร้อมส่งออเดอร์ให้ร้าน! 🎉"
                  : `รอแนบสลิปให้ครบก่อนส่งร้าน (${missingSlipOrders.length} กล่องยังไม่แนบสลิป)`}
              </h2>
              {!allSlipsVerified && missingSlipOrders.length > 0 && (
                <div className="mt-2 text-xs text-amber-200 bg-white/10 p-2.5 rounded-xl border border-white/15">
                  <span>ยังขาดสลิปจาก: </span>
                  <strong>
                    {missingSlipOrders
                      .map((o) => `${o.customerLineId || o.customerName} (${o.customerPhone || "ไม่มีเบอร์"})`)
                      .join(", ")}
                  </strong>
                </div>
              )}
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleOpenSendModal}
                disabled={activeOrders.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-purple-950 font-black px-6 py-3.5 text-base shadow-lg active:scale-95 transition-all w-full sm:w-auto"
              >
                <Send className="h-5 w-5" />
                <span>🚀 รวมส่งร้าน (Send to Shop)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Leader Order Directory (with phone numbers and cancellation) */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-black text-gray-900">
                📋 รายชื่อลูกตี้และออเดอร์ทั้งหมด ({activeOrders.length} กล่อง)
              </h2>
              <p className="text-xs text-gray-500">
                หัวหน้าตี้สามารถดูเบอร์โทรลูกตี้เพื่อติดต่อสอบถามกรณีของหมด หรือยกเลิกออเดอร์ได้ที่นี่
              </p>
            </div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ShoppingBag className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-semibold">ยังไม่มีใครลงชื่อสั่งอาหารในกระดานนี้</p>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{lineName}</span>

                          {/* Leader can see customer phone with click to call */}
                          {ord.customerPhone && (
                            <a
                              href={`tel:${ord.customerPhone}`}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 text-xs font-mono font-bold hover:bg-purple-100 transition-colors"
                              title="แตะเพื่อโทรหาลูกตี้"
                            >
                              <Phone className="h-3 w-3 text-purple-700" />
                              <span>{ord.customerPhone}</span>
                            </a>
                          )}

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
                        <div className="text-xs text-gray-700 mt-1 font-medium">
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

                      <button
                        type="button"
                        onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ยกเลิกออเดอร์นี้"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                    <span>
                      สร้างภาพยาวสำเร็จ! (มีรายการอาหาร จุดส่ง {buildingName} และสลิปทุกใบในรูปเดียว)
                    </span>
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
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2 shrink-0">
                <div className="flex flex-col sm:flex-row items-center gap-2">
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

                {batch.status === "OPEN" && (
                  <button
                    type="button"
                    onClick={handleConfirmSentToShop}
                    className="w-full rounded-2xl bg-purple-900 hover:bg-purple-800 text-white py-2.5 text-xs font-black shadow transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>✅ ยืนยันว่าส่งให้ร้านแล้ว (เปลี่ยนสถานะเป็น ส่งร้านแล้ว)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
