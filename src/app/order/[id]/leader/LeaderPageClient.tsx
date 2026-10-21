"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order } from "@/lib/types";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getDropOffMapUrl, setRuntimeLocations } from "@/lib/locations";
import { getTimeRemaining, formatCutoffDisplay } from "@/lib/utils";
import { compressImage } from "@/lib/services";
import ShopQrModal from "@/components/ShopQrModal";
import confetti from "canvas-confetti";

import {
  ArrowLeft,
  MapPin,
  Clock,
  CreditCard,
  Share2,
  MessageSquare,
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
  Camera,
  ChefHat,
  ArrowRight,
  Bell,
  FileText,
  Sparkles,
  Ban,
  Info,
  ZoomIn,
  Maximize2,
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
  const [showLineQrModal, setShowLineQrModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [manifestData, setManifestData] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // AI Announcement Crafter & Pending Status State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSituation, setAiSituation] = useState<string>("อาหารล่าช้ากว่ากำหนด (คิวแน่น)");
  const [aiCustomNote, setAiCustomNote] = useState("");
  const [aiLength, setAiLength] = useState<"extreme_short" | "brief" | "medium" | "long">("brief");
  const [aiTone, setAiTone] = useState<"official" | "casual" | "friendly" | "extreme_friendly">("official");
  const [aiIncludeBoardInfo, setAiIncludeBoardInfo] = useState(false);
  const [isCraftingAi, setIsCraftingAi] = useState(false);
  const [craftedMessage, setCraftedMessage] = useState("");
  const [copiedCraftedMessage, setCopiedCraftedMessage] = useState(false);
  const [submittingPending, setSubmittingPending] = useState(false);

  // Delivery Evidence Photo State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryPhotoData, setDeliveryPhotoData] = useState<string | null>(null);
  const [compressingDeliveryPhoto, setCompressingDeliveryPhoto] = useState(false);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);
  const [deliveryPhotoError, setDeliveryPhotoError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendingLineReminder, setSendingLineReminder] = useState(false);

  // Cancel Board State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPin, setCancelPin] = useState("");
  const [cancelReason, setCancelReason] = useState("ร้านปิดกะทันหัน / วัตถุดิบหมด");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancellingBoard, setIsCancellingBoard] = useState(false);

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

  // Helper: Format Board Info Snippet
  const buildBoardInfoSnippet = (b = batch) => {
    if (!b) return "";
    const shopName = b.shop?.name || "ร้านอาหาร";
    const leaderName = b.hostName || "หัวหน้าตี้";
    const locName = b.buildingName || "ตึก M4";
    const orderTimeDisplay = b.cutoffTime ? `ส่งร้านรอบ ${b.cutoffTime}` : "";
    const boardUrl = typeof window !== "undefined" ? `${window.location.origin}/order/${b.id}` : `https://veatec.vercel.app/order/${b.id}`;
    return `\n\n🏪 ร้าน: ${shopName}\n👤 หัวหน้าตี้: ${leaderName}\n⏰ เวลา: ${orderTimeDisplay}\n📍 จุดส่ง: ${locName}\n🔗 ลิงก์กระดาน: ${boardUrl}`;
  };

  // Craft Tactful Message via ThaiLLM
  const handleCraftWithAi = async () => {
    if (!batch) return;
    setIsCraftingAi(true);
    const currentActiveOrders = (batch.orders || []).filter((o) => !o.deletedAt);
    const calculatedBoxes = currentActiveOrders.reduce(
      (sum, ord) => sum + (ord.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0),
      0
    );

    try {
      const res = await fetch("/api/thaillm/craft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: batch.shop.name,
          situation: aiSituation.trim() || undefined,
          rawNote: aiCustomNote.trim() || undefined,
          batchStatus: batch.status,
          isSentToShop: batch.status === "ORDERED" || batch.status === "DELIVERING" || batch.status === "COMPLETED",
          buildingName: batch.buildingName || "M4",
          totalOrders: currentActiveOrders.length,
          totalBoxes: calculatedBoxes,
          length: aiLength,
          tone: aiTone,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        const baseMsg = data.message.trim();
        const finalMsg = aiIncludeBoardInfo ? `${baseMsg}${buildBoardInfoSnippet(batch)}` : baseMsg;
        setCraftedMessage(finalMsg);
      } else {
        alert(data.error || "ไม่สามารถให้ AI เรียบเรียงได้ในขณะนี้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
    } finally {
      setIsCraftingAi(false);
    }
  };

  // Generate Strict Templated Message (No AI latency, exact policy wording)
  const handleGenerateTemplateMsg = () => {
    if (!batch) return;
    const shopName = batch.shop?.name || "ร้านอาหาร";
    const leaderName = batch.hostName || "หัวหน้าตี้";
    const baseMsg = `ประกาศแจ้งร้านปิด ${leaderName} จะสั่งใหม่ในวันพรุ่งนี้เวลาเดิม หากไม่ต้องการกรุณากดลบออเดอร์ของท่าน และนำสลิปไปสั่งตรงกับทางร้าน (${shopName}) ในวันที่ท่านสะดวก`;
    const finalMsg = aiIncludeBoardInfo ? `${baseMsg}${buildBoardInfoSnippet(batch)}` : baseMsg;
    setCraftedMessage(finalMsg);
  };

  // Publish Pending Notice to Board & LINE
  const handlePublishPendingNotice = async (clearOnly = false) => {
    if (!batch) return;
    setSubmittingPending(true);
    const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${batch.id}`) || batch.hostPin : batch.hostPin;
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: clearOnly ? (batch.deliveryPhotoUrl ? "COMPLETED" : "ORDERED") : "PENDING",
          pendingMessage: clearOnly ? "" : craftedMessage.trim() || aiCustomNote.trim() || aiSituation,
          hostPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(clearOnly ? "ยกเลิกสถานะรอตรวจสอบแล้ว" : "ประกาศแจ้งเตือนและขึ้นสถานะรอตรวจสอบ (PENDING) เรียบร้อยแล้ว ⚠️");
        setShowAiModal(false);
        setCraftedMessage("");
        setAiCustomNote("");
        await fetchBatch();
      } else {
        alert(data.error || "ไม่สามารถบันทึกได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setSubmittingPending(false);
    }
  };

  // Cancel Entire Board (Host PIN required)
  const handleConfirmCancelBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    setCancelError(null);

    const storedPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${batch.id}`) || "" : "";
    const pinToSubmit = cancelPin.trim() || storedPin || batch.hostPin || "";

    if (!pinToSubmit) {
      setCancelError("กรุณากรอก PIN 4 หลักของหัวหน้าตี้");
      return;
    }

    const finalReason = customCancelReason.trim() || cancelReason;
    setIsCancellingBoard(true);

    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          hostPin: pinToSubmit,
          cancelReason: finalReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("ยกเลิกกระดานตี้เรียบร้อยแล้ว 🚫");
        setShowCancelModal(false);
        setCancelPin("");
        setCustomCancelReason("");
        await fetchBatch();
      } else {
        setCancelError(data.error || "ไม่สามารถยกเลิกกระดานได้");
      }
    } catch (err) {
      setCancelError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsCancellingBoard(false);
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

  // Compile Brief Order Text (Compact, deduplicated, easy to read)
  // Compile Brief Order Text (3-Tier Clear Hierarchy: Board -> Order -> Menu Items)
  const getCompiledOrderText = () => {
    if (!batch) return "";
    const mapUrl = isSelfPickup ? batch.shop.gmapUrl : getDropOffMapUrl(batch);
    const totalBoxes = activeOrders.reduce(
      (sum, o) => sum + (o.items && o.items.length > 0 ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1),
      0
    );

    let txt = `🍱 [VEATEC] สรุปออเดอร์ร้าน ${batch.shop.name}\n`;
    if (isSelfPickup) {
      txt += `🚶 รับเองหน้าร้าน`;
      if (mapUrl) txt += ` • แผนที่: ${mapUrl}`;
      txt += `\n`;
    } else {
      txt += `📍 จุดส่ง: ${buildingName} ชั้น 1`;
      if (mapUrl) txt += ` • แผนที่: ${mapUrl}`;
      txt += `\n`;
    }
    if (leaderPhone || leaderLine) {
      txt += `👑 หัวหน้าตี้: ${leaderLine}${leaderPhone ? ` (โทร: ${leaderPhone})` : ""}\n`;
    }
    txt += `💰 ยอดโอนรวมทั้งรอบ: ฿${batch.currentTotalAmount} (${totalBoxes} กล่อง | ${activeOrders.length} ออเดอร์) • สลิปครบ 100% ✅\n`;
    txt += `──────────────────────────────\n`;

    activeOrders.forEach((o, idx) => {
      const lineTag = o.customerLineId ? `@${o.customerLineId.replace(/^@/, "")}` : o.customerName;
      const phoneTag = o.customerPhone ? ` • 📞 ${o.customerPhone}` : "";
      const orderNum = String(o.orderNumber || idx + 1).padStart(2, "0");

      txt += `[ ออเดอร์ที่ ${orderNum} ] 👤 ${lineTag}${phoneTag}\n`;

      const items = o.items && o.items.length > 0
        ? o.items
        : [{ name: o.boxLabel || "อาหาร", price: o.totalAmount, quantity: 1, customNote: "" }];

      items.forEach((it) => {
        const qty = it.quantity || 1;
        const note = it.customNote ? ` (${it.customNote})` : "";
        const pricePerUnit = it.price > 0 ? it.price : Math.round(o.totalAmount / (items.length || 1));
        const itemTotal = pricePerUnit * qty;

        if (qty > 1) {
          txt += `  • ${qty}x ${it.name}${note} [@฿${pricePerUnit} = ฿${itemTotal}]\n`;
        } else {
          txt += `  • 1x ${it.name}${note} [@฿${pricePerUnit}]\n`;
        }
      });

      txt += `  ↳ 💵 รวมยอดคนนี้: ฿${o.totalAmount} (ตรงกับสลิป #${orderNum})\n\n`;
    });

    txt += `──────────────────────────────\n`;
    txt += `🧾 รูปสลิปโอนเงินทั้งหมดและแผนที่จุดส่ง แนบในรูปภาพสรุปยาวด้านล่างครับ\n`;
    txt += `💡 หากทางร้านมีอัปเดตเบอร์โทรหรือ QR พร้อมเพย์ แจ้งหัวหน้าตี้ได้เลยนะครับ`;
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
        alert("บันทึกส่งร้านเรียบร้อยแล้ว! กระดานนี้ปิดรับออเดอร์แล้ว");
        setShowSendModal(false);
        if (data.batch) setBatch(data.batch);
        await fetchBatch();
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (e) {
      alert("ไม่สามารถบันทึกสถานะได้");
    }
  };

  // Handle Delivery Photo Selection / Compression
  const handleDeliveryPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setDeliveryPhotoError(null);
        setDeliveryPhotoData(null);
        setCompressingDeliveryPhoto(true);
        // Lean delivery photo compression: 640px, 0.65 quality (~40-50 KB)
        const compressed = await compressImage(file, 640, 0.65);
        if (!compressed || !compressed.startsWith("data:image/")) {
          throw new Error("รูปภาพไม่สมบูรณ์ กรุณาถ่ายภาพใหม่อีกครั้ง หรือเลือกจากอัลบั้ม");
        }
        setDeliveryPhotoData(compressed);
      } catch (err: any) {
        console.error("Compression error:", err);
        setDeliveryPhotoError(err?.message || "ไม่สามารถประมวลผลรูปภาพได้");
        setDeliveryPhotoData(null);
      } finally {
        setCompressingDeliveryPhoto(false);
      }
    }
    e.target.value = "";
  };

  // Submit Delivery to Table (Marks status as COMPLETED and notifies LINE)
  const handleDeliverySubmit = async (withPhoto = true) => {
    if (!batch) return;
    setUploadingDelivery(true);
    const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${batch.id}`) || batch.hostPin : batch.hostPin;
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          deliveryPhotoUrl: withPhoto ? (deliveryPhotoData || undefined) : undefined,
          hostPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        if (data.lineNotified) {
          alert("บันทึกส่งอาหารเรียบร้อยแล้ว! ระบบส่งแจ้งเตือนเข้ากลุ่ม LINE สำเร็จ 🎉");
        } else {
          alert("บันทึกส่งอาหารเรียบร้อยแล้ว! (สถานะในระบบอัปเดตแล้ว แต่ไม่พบกลุ่ม LINE หรือส่งแจ้งเตือน LINE ไม่สำเร็จ)");
        }
        setShowDeliveryModal(false);
        setDeliveryPhotoData(null);
        setDeliveryPhotoError(null);
        await fetchBatch();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการบันทึกสถานะ");
      }
    } catch (err: any) {
      alert("ไม่สามารถบันทึกสถานะได้");
    } finally {
      setUploadingDelivery(false);
    }
  };

  // Trigger LINE Push Reminder with Manifest and Order Text
  const handleSendLineReminder = async () => {
    if (!batch) return;
    setSendingLineReminder(true);
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remind" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "ไม่สามารถส่งข้อความเข้า LINE ได้");
      }
      alert(data.message || "ส่งสรุปออเดอร์เข้า LINE เรียบร้อยแล้ว 🎉");
      await fetchBatch(true);
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการส่งแจ้งเตือนเข้า LINE");
    } finally {
      setSendingLineReminder(false);
    }
  };

  // Share Board Invitation to Friends
  const handleShareBoardInvite = async () => {
    if (!batch) return;
    const locName = batch.buildingName || "ตึก M4";
    const shopName = batch.shop.name;
    const remainingText = batch.isMinMet
      ? "ครบยอดส่งฟรีแล้ว 🎉"
      : `ขาดอีก ฿${batch.amountRemaining} เพื่อส่งฟรี!`;
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/order/${batch.id}` : "https://veatec.vercel.app";
    const text = `🍱 มาสั่งข้าวตี้ร้าน ${shopName} กันครับ/ค่ะ!\n` +
      `📍 จุดส่ง: โต๊ะ ${locName} ชั้น 1\n` +
      `⏰ ${formatCutoffDisplay(batch.cutoffTime, batch.date, "th", true)} (${remainingText})\n\n` +
      `👉 สั่งร่วมตี้ได้ที่นี่เลย:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `VEATEC - สั่งข้าวตี้ ${shopName}`,
          text,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("คัดลอกข้อความชวนเพื่อนแล้ว! กำลังเปิด LINE เพื่อให้คุณส่งเข้ากลุ่ม...");
    } catch (e) {}
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };

  // Button 1: Send Compiled Order Text directly to LINE Chat
  const handleSendTextToLine = async () => {
    if (!batch) return;
    const shareText = getCompiledOrderText();

    try {
      await navigator.clipboard.writeText(shareText);
    } catch (e) {}

    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank");
  };

  // Button 2: Share Long Manifest Image via Web Share API or download fallback
  const handleShareImageOnly = async () => {
    if (!manifestData || !batch) return;
    const safeFileName = `order-manifest-${batch.id.slice(0, 8)}.jpg`;

    if (navigator.share && navigator.canShare) {
      const imageFile = new File([manifestData.blob], safeFileName, {
        type: "image/jpeg",
      });

      if (navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({
            title: `ออเดอร์ร้าน ${batch.shop.name}`,
            files: [imageFile],
          });
          return;
        } catch (err: any) {
          if (err.name === "AbortError") return; // User cancelled
          console.warn("Share image failed, falling back to download", err);
        }
      }
    }

    // Fallback: download image
    const link = document.createElement("a");
    link.href = manifestData.dataUrl;
    link.download = safeFileName;
    link.click();
    alert("บันทึกรูปภาพสรุปลงเครื่องเรียบร้อยแล้ว!");
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

  // Chronological 3-Phase mapping
  const currentPhase: 1 | 2 | 3 =
    batch.status === "COMPLETED"
      ? 3
      : batch.status === "ORDERED" || batch.status === "DELIVERING"
      ? 2
      : 1;

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

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block truncate">
                    เบอร์โทร <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    placeholder="0812345678"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-gray-300 bg-gray-50/50 px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block truncate">
                    PIN (4 หลัก) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="1234"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-gray-300 bg-gray-50/50 px-2.5 py-1.5 text-center text-xs font-mono font-bold tracking-widest text-gray-900 focus:bg-white focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-xl bg-purple-900 py-2.5 text-xs sm:text-sm font-black text-white shadow-xs hover:bg-purple-800 disabled:opacity-50 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                {loggingIn ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <>
                    <Key className="h-3.5 w-3.5" />
                    <span>เข้าสู่ระบบหัวหน้าตี้</span>
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

      <main className="mx-auto max-w-4xl px-2.5 py-2 sm:px-6 sm:py-3 space-y-2 sm:space-y-2.5">
        {/* Top Navigation & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/order/${batchId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← กลับหน้าไวท์บอร์ด</span>
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-black">
              <span>👑 หัวหน้าตี้</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-bold text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="ออกจากระบบหัวหน้าตี้"
            >
              <LogOut className="h-3 w-3" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* 1. Shop Info & Goal Bar (Ultra-compact & Space-saving) */}
        <div className="rounded-2xl border border-purple-200 bg-white p-3 sm:p-3.5 shadow-2xs space-y-2">
          {/* Row 1: Shop Name, Drop-off Location & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-base sm:text-lg font-black text-gray-950 tracking-tight">
                {batch.shop.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                <MapPin className="h-3 w-3 text-purple-700 shrink-0" />
                <span>{buildingName} ชั้น 1</span>
              </span>
            </div>

            {/* Quick Contacts: Phone, LINE, QR, Share */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {batch.shop.phone && (
                <a
                  href={`tel:${batch.shop.phone}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 shadow-2xs transition-colors"
                  title="โทรติดต่อร้านค้า"
                >
                  <Phone className="h-3 w-3 text-emerald-700" />
                  <span>{batch.shop.phone}</span>
                </a>
              )}

              {batch.shop.lineQrUrl && (
                <button
                  type="button"
                  onClick={() => setShowLineQrModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-[#06C755]/10 hover:bg-[#06C755]/20 px-2.5 py-0.5 text-xs font-bold text-emerald-900 shadow-2xs transition-colors cursor-pointer"
                  title="ดู QR LINE ร้านค้า"
                >
                  <MessageSquare className="h-3 w-3 text-[#06C755]" />
                  <span>LINE ร้าน</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareBoardInvite}
                className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-950 hover:bg-purple-100 shadow-2xs transition-colors cursor-pointer"
                title="แชร์ชวนเพื่อน"
              >
                <Share2 className="h-3 w-3 text-purple-700" />
                <span>ชวนเพื่อน</span>
              </button>
            </div>
          </div>

          {/* Row 2: Target Progress & Self-pickup toggle */}
          <div className="pt-1.5 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-700 flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-purple-900" />
                  <span>
                    ยอดรวม: <strong className="text-purple-900 font-mono">฿{batch.currentTotalAmount}</strong>/฿{batch.targetMinAmount}
                    <span className="text-gray-400 font-normal ml-1">({activeOrders.length} กล่อง)</span>
                  </span>
                </span>
              </div>

              <span className={`text-[11px] ${batch.isMinMet ? "text-emerald-700 font-bold" : "text-amber-700 font-semibold"}`}>
                {batch.isMinMet ? "✓ ครบยอดส่งฟรี" : `ขาดอีก ฿${batch.amountRemaining}`}
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden border border-gray-200/80">
              <div
                className={`h-full transition-all duration-500 ${
                  batch.isMinMet
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                    : "bg-gradient-to-r from-amber-400 to-orange-500"
                }`}
                style={{ width: `${Math.min(100, (batch.currentTotalAmount / batch.targetMinAmount) * 100)}%` }}
              />
            </div>

            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1 border-t border-gray-100">
              <span className="flex items-center gap-1.5 font-bold text-purple-950">
                <Clock className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                <span className="font-mono bg-purple-100/70 text-purple-900 px-1.5 py-0.5 rounded text-xs">{timeInfo.text}</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">
                {formatCutoffDisplay(batch.cutoffTime, batch.date, "th", true)}
              </span>
            </div>
          </div>
        </div>

        {/* Active PENDING notice banner in Leader UI */}
        {batch.status === "PENDING" && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 sm:p-4 text-amber-950 shadow-xs flex items-start justify-between gap-3 animate-pulse">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-900">ประกาศด่วนจากหัวหน้าตี้ (กำลังแสดงบนกระดาน)</span>
                  {batch.pendingCreatedAt && (
                    <span className="text-[10px] font-mono text-amber-700">
                      {new Date(batch.pendingCreatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-snug">
                  {batch.pendingMessage || "ทางร้านแจ้งว่าอาหารอาจล่าช้ากว่ากำหนด"}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={submittingPending}
              onClick={() => handlePublishPendingNotice(true)}
              className="rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2.5 py-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              ยกเลิกประกาศ
            </button>
          </div>
        )}

        {/* 2. Chronological 3-Phase Stepper */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-2xs">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* Step 1 */}
            <div
              className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl transition-all ${
                currentPhase === 1
                  ? "bg-purple-100 text-purple-950 ring-2 ring-purple-600/30 font-black shadow-2xs"
                  : currentPhase > 1
                  ? "bg-emerald-50 text-emerald-900 font-bold"
                  : "bg-slate-50 text-slate-400 font-medium"
              }`}
            >
              <span
                className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-mono font-bold shrink-0 ${
                  currentPhase > 1
                    ? "bg-emerald-600 text-white"
                    : currentPhase === 1
                    ? "bg-purple-900 text-white animate-pulse"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentPhase > 1 ? "✓" : "1"}
              </span>
              <div className="min-w-0">
                <p className="text-xs truncate font-black">รับออเดอร์</p>
                <p className="text-[10px] text-slate-500 truncate hidden sm:block">ชวนเพื่อน & ตรวจสลิป</p>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl transition-all ${
                currentPhase === 2
                  ? "bg-amber-100 text-amber-950 ring-2 ring-amber-500/40 font-black shadow-2xs"
                  : currentPhase > 2
                  ? "bg-emerald-50 text-emerald-900 font-bold"
                  : "bg-slate-50 text-slate-400 font-medium"
              }`}
            >
              <span
                className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-mono font-bold shrink-0 ${
                  currentPhase > 2
                    ? "bg-emerald-600 text-white"
                    : currentPhase === 2
                    ? "bg-amber-600 text-white animate-pulse"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentPhase > 2 ? "✓" : "2"}
              </span>
              <div className="min-w-0">
                <p className="text-xs truncate font-black">สั่งร้านค้า</p>
                <p className="text-[10px] text-slate-500 truncate hidden sm:block">ส่งสรุป & รอร้านทำ</p>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl transition-all ${
                currentPhase === 3
                  ? "bg-emerald-100 text-emerald-950 ring-2 ring-emerald-500/40 font-black shadow-2xs"
                  : "bg-slate-50 text-slate-400 font-medium"
              }`}
            >
              <span
                className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-mono font-bold shrink-0 ${
                  currentPhase === 3
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentPhase === 3 ? "🎉" : "3"}
              </span>
              <div className="min-w-0">
                <p className="text-xs truncate font-black">ส่งถึงโต๊ะแล้ว</p>
                <p className="text-[10px] text-slate-500 truncate hidden sm:block">ถ่ายรูปวางโต๊ะ & เตือน</p>
              </div>
            </div>
          </div>

          {/* Unified Order Lifecycle Controller (IKEA-inspired Clean Strip) */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-600 animate-ping" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold">การจัดการตี้:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. Close / Reopen Toggle */}
              {batch.status === "OPEN" ? (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleToggleBoardStatus("CLOSED")}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-800 transition-all active:scale-98 cursor-pointer shadow-2xs"
                  title="ปิดรับออเดอร์ (ไม่ให้คนสั่งเพิ่ม)"
                >
                  <Lock className="h-3.5 w-3.5 text-rose-600" />
                  <span>1. ปิดรับออเดอร์</span>
                </button>
              ) : batch.status === "CLOSED" ? (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleToggleBoardStatus("OPEN")}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800 transition-all active:scale-98 cursor-pointer shadow-2xs"
                  title="เปิดรับออเดอร์เพิ่ม"
                >
                  <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>1. เปิดรับต่อ</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60"
                  title="ปิดรับแล้วเนื่องจากเลยขั้นตอนนี้แล้ว"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>1. ปิดรับแล้ว ✓</span>
                </button>
              )}

              {/* 2. Send To Shop */}
              {currentPhase === 1 ? (
                <button
                  type="button"
                  onClick={handleOpenSendModal}
                  disabled={activeOrders.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-purple-950 px-3 py-1.5 text-xs font-black transition-all active:scale-98 cursor-pointer shadow-2xs"
                  title="สรุปรายการและส่งออเดอร์ให้ร้านค้า"
                >
                  <ChefHat className="h-3.5 w-3.5" />
                  <span>2. สั่งร้านค้า</span>
                </button>
              ) : currentPhase === 2 ? (
                <button
                  type="button"
                  onClick={handleOpenSendModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 text-xs font-black transition-all cursor-pointer shadow-2xs"
                  title="เปิดดูหรือแก้ไขใบสรุปออเดอร์ที่ส่งร้านแล้ว"
                >
                  <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                  <span>2. สั่งร้านแล้ว (ดูสรุป) ✓</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60"
                >
                  <ChefHat className="h-3.5 w-3.5 text-slate-400" />
                  <span>2. สั่งร้านแล้ว ✓</span>
                </button>
              )}

              {/* 3. Received / Delivered to Table */}
              {currentPhase === 2 ? (
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-black transition-all active:scale-98 cursor-pointer shadow-xs"
                  title="ถ่ายรูปอาหารวางโต๊ะ เพื่อแจ้งสมาชิกลงมารับ"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>3. ส่งของถึงโต๊ะ</span>
                </button>
              ) : currentPhase === 3 ? (
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-black transition-all cursor-pointer shadow-2xs"
                  title="ถ่ายรูปใหม่หรือดูรูปจัดส่ง"
                >
                  <Camera className="h-3.5 w-3.5 text-emerald-600" />
                  <span>3. ส่งถึงโต๊ะแล้ว ✓</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60"
                  title="ต้องสั่งร้านค้าก่อนจึงจะกดส่งถึงโต๊ะได้"
                >
                  <Camera className="h-3.5 w-3.5 text-slate-400" />
                  <span>3. ส่งของถึงโต๊ะ</span>
                </button>
              )}

              {/* AI Crafter Emergency / Late Notice */}
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1.5 text-xs font-bold transition-all active:scale-98 cursor-pointer shadow-2xs"
                title="ประกาศแจ้งอาหารเลท / ร้านปิด ด้วย AI หรือ Template"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>{batch.status === "PENDING" ? "แก้ไขประกาศแจ้งเตือน" : "แจ้งเตือนเลท / ร้านปิด (AI)"}</span>
              </button>

              {/* 4. Cancel Party */}
              {batch.status !== "CANCELLED" && batch.status !== "COMPLETED" ? (
                <button
                  type="button"
                  onClick={() => {
                    setCancelError(null);
                    setCancelPin("");
                    setShowCancelModal(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="ยกเลิกตี้/กระดานนี้ (ต้องใส่ PIN)"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-500" />
                  <span>ยกเลิกตี้</span>
                </button>
              ) : batch.status === "CANCELLED" ? (
                <span className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">
                  <Ban className="h-3.5 w-3.5" />
                  <span>ยกเลิกตี้แล้ว</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* 3. Phase Hero Action Card: Adaptive to current chronological stage */}
        {currentPhase === 1 && (
          <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-900 to-indigo-950 p-3.5 sm:p-4 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                    PHASE 1 • รับออเดอร์
                  </span>
                  {allSlipsVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                      ✓ สลิปครบ 100%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                      ⏳ รอสลิป ({missingSlipOrders.length} กล่อง)
                    </span>
                  )}
                  {isSelfPickup && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full">
                      🚶 รับเอง
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {allSlipsVerified
                    ? "สลิปครบแล้ว พร้อมส่งออเดอร์ให้ร้าน 🍱"
                    : `กำลังรวบรวมออเดอร์ (ขาดสลิป ${missingSlipOrders.length} กล่อง)`}
                </h2>
                <p className="text-xs text-purple-200">
                  {allSlipsVerified
                    ? "สร้างใบสรุปออเดอร์เพื่อส่งให้ร้านค้าใน LINE"
                    : "ตรวจสอบสลิปของสมาชิก หรือแชร์ชวนเพื่อนเพิ่มก่อนปิดตี้"}
                </p>
              </div>

              {/* Primary Action Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenSendModal}
                  disabled={activeOrders.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-purple-950 font-black px-4 py-2.5 text-xs sm:text-sm shadow-md active:scale-98 transition-all w-full sm:w-auto cursor-pointer"
                >
                  <ChefHat className="h-4 w-4" />
                  <span>สั่งร้านค้า (สร้างใบสรุปออเดอร์)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Missing Slips Warning Banner */}
            {!allSlipsVerified && missingSlipOrders.length > 0 && (
              <div className="text-xs text-amber-100 bg-black/25 p-2.5 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-300">⏳ ขาดสลิป ({missingSlipOrders.length} กล่อง): </span>
                  <span>
                    {missingSlipOrders
                      .map((o) => `${o.customerLineId ? `@${o.customerLineId}` : o.customerName}${o.customerPhone ? ` (${o.customerPhone})` : ""}`)
                      .join(", ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleShareBoardInvite}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <Share2 className="h-3 w-3" />
                  <span>ทวงสลิป / ชวนเพื่อน</span>
                </button>
              </div>
            )}
          </div>
        )}

        {currentPhase === 2 && (
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-slate-900 to-amber-950 p-3.5 sm:p-4 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                    PHASE 2 • ร้านกำลังทำอาหาร
                  </span>
                  <span className="text-xs text-amber-200">
                    {activeOrders.length} กล่อง
                  </span>
                  {isSelfPickup && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full">
                      🚶 รับเอง
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  ร้านกำลังทำอาหาร 🍳
                </h2>
                <p className="text-xs text-amber-100">
                  {isSelfPickup
                    ? "ส่งออเดอร์ให้ร้านแล้ว รอเวลารับอาหารที่หน้าร้านได้เลย"
                    : `ส่งออเดอร์ให้ร้านแล้ว เมื่ออาหารมาส่งที่โต๊ะ ${buildingName} ให้กดถ่ายรูปวางโต๊ะ`}
                </p>
              </div>

              {/* Primary Action Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black px-4 py-2.5 text-xs sm:text-sm shadow-lg active:scale-98 transition-all w-full sm:w-auto ring-2 ring-emerald-400/40 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>📸 อาหารมาส่งแล้ว (ถ่ายรูปวางโต๊ะ)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Quick helper toolbar for Phase 2 */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-amber-200 text-[11px] font-bold mr-1">เครื่องมือติดต่อ:</span>

              {batch.shop.phone && (
                <a
                  href={`tel:${batch.shop.phone}`}
                  className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg font-bold transition-colors"
                >
                  <Phone className="h-3 w-3 text-emerald-400" />
                  <span>โทรหาร้าน ({batch.shop.phone})</span>
                </a>
              )}



              {batch.shop.lineQrUrl && (
                <button
                  type="button"
                  onClick={() => setShowLineQrModal(true)}
                  className="inline-flex items-center gap-1 bg-[#06C755]/80 hover:bg-[#06C755] text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shadow-2xs"
                  title="ดู QR LINE ร้านค้า"
                >
                  <MessageSquare className="h-3 w-3 text-white" />
                  <span>LINE ร้าน</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenSendModal}
                className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                title="เปิดดูใบสรุปออเดอร์อีกครั้ง"
              >
                <FileText className="h-3 w-3 text-amber-300" />
                <span>ดูใบสรุปออเดอร์</span>
              </button>

              <button
                type="button"
                disabled={sendingLineReminder}
                onClick={handleSendLineReminder}
                className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                title="ส่งข้อความแจ้งสถานะเข้า LINE กลุ่ม"
              >
                <Bell className={`h-3 w-3 text-purple-300 ${sendingLineReminder ? "animate-spin" : ""}`} />
                <span>{sendingLineReminder ? "กำลังส่ง..." : "แจ้งเตือนใน LINE"}</span>
              </button>
            </div>
          </div>
        )}

        {currentPhase === 3 && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-950 to-teal-950 p-3.5 sm:p-4 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    PHASE 3 • อาหารส่งถึงโต๊ะแล้ว 🎉
                  </span>
                  <span className="text-xs text-emerald-200">
                    {activeOrders.length} กล่อง
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  จัดส่งเรียบร้อยแล้ว สมาชิกลงมารับอาหารได้เลย 🎉
                </h2>
                <p className="text-xs text-emerald-200">
                  ระบบแจ้งเตือนเข้ากลุ่ม LINE แล้ว วางอาหารที่โต๊ะ {buildingName} ชั้น 1
                </p>
              </div>

              {/* Action Buttons: Customer view link + Photo view */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  href={`/delivery/${batch.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-black px-3.5 py-2 text-xs sm:text-sm shadow-md transition-all"
                >
                  <span>📱 หน้ารับอาหาร</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(true)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-2 text-xs transition-all cursor-pointer"
                  title="ถ่ายรูปใหม่หรืออัปเดตรูปหลักฐาน"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>ถ่ายใหม่</span>
                </button>
              </div>
            </div>

            {/* Proof Photo & Quick Actions in Phase 3 */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {batch.deliveryPhotoUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPhoto({
                        url: batch.deliveryPhotoUrl!,
                        title: `หลักฐานการวางอาหาร - ร้าน ${batch.shop.name}`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Eye className="h-3 w-3" />
                    <span>ดูรูปถ่ายที่โต๊ะ</span>
                  </button>
                ) : (
                  <span className="text-emerald-300 text-[11px]">(ไม่มีรูปถ่ายแนบ)</span>
                )}

                <button
                  type="button"
                  onClick={handleOpenSendModal}
                  className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-xs"
                >
                  <FileText className="h-3 w-3" />
                  <span>ดูใบสรุปยาว</span>
                </button>
              </div>

              <button
                type="button"
                disabled={sendingLineReminder}
                onClick={handleSendLineReminder}
                className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-xs"
                title="ส่งแจ้งเตือนซ้ำเข้า LINE กลุ่ม"
              >
                <Bell className={`h-3 w-3 ${sendingLineReminder ? "animate-spin" : ""}`} />
                <span>{sendingLineReminder ? "กำลังส่ง..." : "แจ้งเตือน LINE อีกครั้ง"}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Leader Order Directory (with phone numbers and cancellation) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900">
                📋 ออเดอร์ทั้งหมด ({activeOrders.length} กล่อง)
              </h2>
            </div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ShoppingBag className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-semibold">ยังไม่มีออเดอร์ในกระดานนี้</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeOrders.map((ord) => {
                const lineName = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
                const hasSlip = Boolean(ord.slipImageUrl || ord.isSlipVerified);

                return (
                  <div
                    key={ord.id}
                    className="p-3 sm:p-3.5 hover:bg-purple-50/30 rounded-xl transition-colors space-y-2"
                  >
                    {/* Row 1: [#1] @น้องวัว (dark gray) [📞 0123456789] */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-gray-900 text-white shrink-0">
                        #{ord.orderNumber}
                      </span>
                      <span className="font-semibold text-xs text-gray-600 truncate max-w-[150px] sm:max-w-[220px]">
                        {lineName}
                      </span>

                      {/* Leader can see customer phone with click to call */}
                      {ord.customerPhone && (
                        <a
                          href={`tel:${ord.customerPhone}`}
                          className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200/80 px-2 py-0.5 text-[11px] font-mono font-semibold hover:bg-purple-100 transition-colors shrink-0"
                          title="แตะเพื่อโทรหาลูกตี้"
                        >
                          <Phone className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                          <span>{ord.customerPhone}</span>
                        </a>
                      )}
                    </div>

                    {/* Row 2: Numbered Menu Items */}
                    <div className="space-y-1 pl-0.5">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex flex-wrap items-baseline gap-1.5 leading-snug">
                          <span className="text-sm sm:text-base font-black text-gray-950">
                            <span className="text-gray-500 font-bold mr-1">{idx + 1}.</span>
                            {it.quantity > 1 && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-black bg-purple-100 text-purple-900 mr-1.5">
                                {it.quantity}x
                              </span>
                            )}
                            {it.name}
                          </span>
                          {it.customNote && (
                            <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.2">
                              {it.customNote}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Row 3: [โอนแล้ว (KTB)]   ฿95 [ดูสลิป] [🗑️] */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {/* Left: Transfer status */}
                      {hasSlip ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>โอนแล้ว{ord.slipBankName ? ` (${ord.slipBankName.split(" ")[0]})` : " ✓"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-bold shrink-0">
                          <span>⏳ รอสลิป</span>
                        </span>
                      )}

                      {/* Right: Price + View Slip + Cancel */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-base text-orange-600">
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
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2 py-1 text-xs font-bold text-purple-900 hover:bg-purple-50 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Eye className="h-3 w-3 text-purple-700" />
                            <span>ดูสลิป</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="ยกเลิกออเดอร์นี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: Shop PromptPay QR Popup */}
      <ShopQrModal
        isOpen={showPromptPayModal}
        onClose={() => setShowPromptPayModal(false)}
        type="promptpay"
        shop={batch.shop}
      />

      {/* MODAL 1.5: Shop LINE QR Popup */}
      <ShopQrModal
        isOpen={showLineQrModal}
        onClose={() => setShowLineQrModal(false)}
        type="line"
        shop={batch.shop}
      />

      {/* MODAL 2: Slip / Full-Screen QR Viewer (z-[60] to cleanly overlay above any open modal) */}

      {selectedSlip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[92vh] w-full max-w-lg rounded-3xl bg-white p-4 sm:p-5 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-sm text-gray-900">{selectedSlip.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 overflow-y-auto max-h-[78vh] flex items-center justify-center bg-gray-50 rounded-2xl p-2 sm:p-4">
              <img
                src={selectedSlip.url}
                alt="Full View"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-xs"
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
                  <h3 className="font-black text-sm text-gray-900">สรุปออเดอร์ส่งร้าน</h3>
                  <p className="text-[11px] text-gray-500">ใบสรุปยาวพร้อมสลิปทุกกล่อง</p>
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
                    กำลังสร้างใบสรุปยาว...
                  </span>
                  <span className="text-[11px] text-gray-400">ใช้เวลาประมาณ 1-2 วินาที</span>
                </div>
              ) : manifestData ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      สร้างใบสรุปสำเร็จ! (รวมรายการและสลิปครบ)
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
                      <span>ข้อความสรุป:</span>
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
                {/* 1. Primary Action: Send Text directly to LINE */}
                <button
                  type="button"
                  onClick={handleSendTextToLine}
                  className="w-full rounded-2xl bg-[#06C755] hover:bg-[#05b34c] py-3 text-sm font-black text-white shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>💬 ส่งข้อความสรุปเข้า LINE</span>
                </button>

                {/* 2. Secondary Row: Share Image & Save Image */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareImageOnly}
                    className="rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Share2 className="h-3.5 w-3.5 text-gray-600" />
                    <span>🖼️ แชร์รูปใบสรุปยาว</span>
                  </button>

                  <a
                    href={manifestData.dataUrl}
                    download={`order-manifest-${batch.id.slice(0, 8)}.jpg`}
                    className="rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 transition-colors text-center shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-gray-600" />
                    <span>บันทึกรูปลงเครื่อง</span>
                  </a>
                </div>

                {/* 3. Host Action: Confirm Sent to Shop */}
                {(batch.status === "OPEN" || batch.status === "CLOSED") && (
                  <button
                    type="button"
                    onClick={handleConfirmSentToShop}
                    className="w-full rounded-2xl bg-purple-900 hover:bg-purple-800 text-white py-2.5 text-xs font-black shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>✅ ยืนยันส่งร้านแล้ว</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Inputs for Camera / Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleDeliveryPhotoChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleDeliveryPhotoChange}
        className="hidden"
      />

      {/* Modal: Delivery Evidence Photo */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">ถ่ายรูปวางโต๊ะ</h3>
                  <p className="text-xs text-emerald-200">โต๊ะวางอาหารชั้น 1 {batch?.buildingName || "ตึก M4"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryModal(false);
                  setDeliveryPhotoData(null);
                  setDeliveryPhotoError(null);
                }}
                className="rounded-lg p-1.5 text-emerald-200 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  ถ่ายรูปอาหารที่วางบนโต๊ะ ระบบจะแจ้งเตือนเข้า <strong>LINE</strong> ทันที 🎉
                </span>
              </div>

              {deliveryPhotoError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                  {deliveryPhotoError}
                </div>
              )}

              {/* Photo Preview or Select */}
              {deliveryPhotoData ? (
                <div className="space-y-3">
                  <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                    <img
                      src={deliveryPhotoData}
                      alt="Delivery preview"
                      className="h-full w-full object-contain"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="rounded-xl bg-black/60 hover:bg-black/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm transition-colors flex items-center gap-1"
                      >
                        <Camera className="h-3 w-3" />
                        <span>ถ่ายใหม่</span>
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
                    <span className="text-xs font-bold text-gray-900">ถ่ายรูป</span>
                    <span className="text-[10px] text-emerald-700 mt-0.5">เปิดกล้อง</span>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-gray-400 hover:bg-gray-100/70 cursor-pointer transition-colors"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-600 mb-2">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">เลือกรูป</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">จากเครื่อง</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={uploadingDelivery || compressingDeliveryPhoto || !deliveryPhotoData}
                  onClick={() => handleDeliverySubmit(true)}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all ${
                    deliveryPhotoData && !compressingDeliveryPhoto && !uploadingDelivery
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 active:scale-98"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  <Check className="h-5 w-5" />
                  <span>
                    {uploadingDelivery
                      ? "กำลังบันทึกและแจ้งเตือน LINE..."
                      : compressingDeliveryPhoto
                      ? "กำลังเตรียมรูป..."
                      : "✅ ยืนยันส่งอาหาร (แจ้งใน LINE)"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={uploadingDelivery}
                  onClick={() => handleDeliverySubmit(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  ส่งแล้ว (ไม่แนบรูป)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Announcement Crafter & PENDING Status */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-h-[92vh] max-w-lg w-full rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-amber-50/70">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">ผู้ช่วยร่างประกาศแจ้งเตือน (AI Crafter)</h3>
                  <p className="text-[11px] text-slate-500">เรียบเรียงข้อความสุภาพ รวดเร็ว และตั้งสถานะรอตรวจสอบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-slate-700">
              {/* Situation Presets with Toggle on/off */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 block">
                    เลือกสถานการณ์ที่เกิดขึ้น (แตะซ้ำเพื่อเปิด/ปิด):
                  </label>
                  {aiSituation && (
                    <button
                      type="button"
                      onClick={() => setAiSituation("")}
                      className="text-[10px] text-amber-700 hover:underline font-semibold"
                    >
                      ยกเลิกที่เลือก
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    "อาหารล่าช้ากว่ากำหนด (คิวแน่น)",
                    "ร้านปิดกะทันหัน / วัตถุดิบหมด",
                    "ร้านขอปรับเปลี่ยนเมนูบางรายการ",
                    "ฝนตกหนัก / ไรเดอร์ส่งช้า",
                    "ขอยกเลิกตี้อาหาร (ร้านปิด/ยกเลิกออเดอร์)",
                  ].map((preset) => {
                    const isSelected = aiSituation === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAiSituation(isSelected ? "" : preset)}
                        className={`text-left px-2.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? "bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{preset}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                            isSelected ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {isSelected ? "เลือกอยู่ ✓" : "แตะเลือก"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Leader's Raw Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  รายละเอียดเพิ่มเติม (คำสั้นๆ จากหัวหน้าตี้):
                </label>
                <input
                  type="text"
                  placeholder="เช่น ป้าบอกคนเยอะ ขอส่งเลท 20 นาที หรือ กะเพราหมดขอเปลี่ยนเป็นหมูกระเทียม"
                  value={aiCustomNote}
                  onChange={(e) => setAiCustomNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Radio Group: Length (Extreme Short / Brief / Med / Long) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  ความยาวข้อความ (Length):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "extreme_short", label: "สั้นจิ๋ว (Extreme)", desc: "5-10 คำ ไวสุด" },
                    { id: "brief", label: "กระชับ (Brief)", desc: "1 ประโยคสั้น" },
                    { id: "medium", label: "ปานกลาง (Med)", desc: "2 ประโยค พอดี" },
                    { id: "long", label: "ละเอียด (Long)", desc: "3-4 ประโยค" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`flex flex-col p-2 rounded-xl border cursor-pointer transition-all ${
                        aiLength === item.id
                          ? "bg-purple-50 border-purple-600 ring-1 ring-purple-500 text-purple-950 font-bold shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="aiLength"
                          value={item.id}
                          checked={aiLength === item.id}
                          onChange={() => setAiLength(item.id as "extreme_short" | "brief" | "medium" | "long")}
                          className="h-3.5 w-3.5 text-purple-700 focus:ring-purple-500 accent-purple-800"
                        />
                        <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-500 pl-5 mt-0.5">{item.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Radio Group: Tone (Official / Casual / Friendly / Extreme Friendly) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  โทนและระดับภาษา (Tone):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "official", label: "กึ่งทางการ (Official)", desc: "สุภาพ สุขุม หนักแน่น" },
                    { id: "casual", label: "กันเอง (Casual)", desc: "สบายๆ เหมือนเพื่อน" },
                    { id: "friendly", label: "อบอุ่น (Friendly)", desc: "เป็นมิตร เข้าอกเข้าใจ" },
                    { id: "extreme_friendly", label: "น่ารักสุด (Extreme)", desc: "อ้อน นุ่มนวล เทคแคร์ ✨" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`flex flex-col p-2 rounded-xl border cursor-pointer transition-all ${
                        aiTone === item.id
                          ? "bg-amber-50 border-amber-500 ring-1 ring-amber-400 text-amber-950 font-bold shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="aiTone"
                          value={item.id}
                          checked={aiTone === item.id}
                          onChange={() => setAiTone(item.id as "official" | "casual" | "friendly" | "extreme_friendly")}
                          className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 accent-amber-600"
                        />
                        <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-500 pl-5 mt-0.5">{item.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Toggle: Add Board Info (Shop, Leader, Time, Bldg, URL) */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl border border-purple-200 bg-purple-50/60 transition-all">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-900 text-white shrink-0">
                    <Share2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      แนบข้อมูลกระดาน (Add Board Info)
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      เพิ่มชื่อร้าน, ชื่อหัวหน้าตี้, รอบเวลา, ตึกส่ง, ลิงก์กระดาน สำหรับแชร์เข้ากลุ่ม LINE
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !aiIncludeBoardInfo;
                    setAiIncludeBoardInfo(nextVal);
                    if (craftedMessage.trim()) {
                      const snippet = buildBoardInfoSnippet(batch);
                      if (nextVal) {
                        if (!craftedMessage.includes("🔗 ลิงก์กระดาน:")) {
                          setCraftedMessage(`${craftedMessage.trim()}${snippet}`);
                        }
                      } else {
                        // Strip snippet if present
                        const cleaned = craftedMessage
                          .replace(/\n\n(?:🏪 ร้าน:[\s\S]*?|👤 หัวหน้าตี้:[\s\S]*?)(?:🔗 ลิงก์กระดาน:.*|$)/g, "")
                          .trim();
                        setCraftedMessage(cleaned);
                      }
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    aiIncludeBoardInfo ? "bg-purple-900" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      aiIncludeBoardInfo ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Buttons: AI Crafter + Template Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isCraftingAi}
                  onClick={handleCraftWithAi}
                  className="w-full py-2.5 rounded-xl bg-linear-to-r from-purple-900 to-indigo-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-60 active:scale-98"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isCraftingAi ? "animate-spin" : ""}`} />
                  <span>{isCraftingAi ? "กำลังให้ AI เรียบเรียง..." : "✨ ให้ AI เรียบเรียงข้อความ"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateTemplateMsg}
                  className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                  title="ใส่ข้อความแม่แบบทางการ (ร้านปิด/ยกเลิกตี้) ทันทีโดยไม่ต้องรอ AI"
                >
                  <FileText className="h-3.5 w-3.5 text-amber-700" />
                  <span>📋 ใช้ข้อความแม่แบบ (ร้านปิด)</span>
                </button>
              </div>

              {/* Crafted Message Box */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 text-xs">
                    ข้อความที่จะแสดงบนกระดาน / แชร์เข้ากลุ่ม (แก้ไขได้):
                  </label>
                  {craftedMessage && (
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(craftedMessage);
                        setCopiedCraftedMessage(true);
                        setTimeout(() => setCopiedCraftedMessage(false), 2000);
                      }}
                      className="text-[11px] text-purple-800 hover:underline font-bold flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedCraftedMessage ? "✓ คัดลอกแล้ว" : "คัดลอกข้อความ"}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  placeholder="ข้อความประกาศจะปรากฏที่นี่ หรือพิมพ์เองได้โดยตรง..."
                  value={craftedMessage}
                  onChange={(e) => setCraftedMessage(e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-amber-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />

                {/* Quick Share to LINE Group Button */}
                {craftedMessage.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = craftedMessage.trim();
                      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                        navigator.share({ title: `ประกาศจากตี้ ${batch?.shop.name}`, text }).catch(() => {});
                        return;
                      }
                      window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>แชร์ข้อความนี้เข้ากลุ่ม LINE</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                *จะถูกบันทึกขึ้นหัวกระดานตี้อาหาร
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={submittingPending || (!craftedMessage.trim() && !aiCustomNote.trim() && !aiSituation)}
                  onClick={() => handlePublishPendingNotice(false)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <span>⚠️ ประกาศแจ้งเตือน (PENDING)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Cancel Board (Host PIN Required) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-rose-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-rose-100 bg-rose-50/80">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                  <Ban className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-rose-950">ยืนยันยกเลิกกระดานตี้อาหาร</h3>
                  <p className="text-[11px] text-rose-800">กระดานจะเปลี่ยนสถานะเป็น CANCELLED ทันที</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelBoard} className="p-4 space-y-3.5">
              {cancelError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              {/* Warning box */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>⚠️ ข้อควรทราบก่อนยกเลิก:</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  หากมีการโอนเงินและส่งออเดอร์ไปยังร้านค้าแล้ว กรุณาแจ้งทางร้านค้าเพื่อระงับรายการและประสานงานเรื่องเงินคืนให้เพื่อนสมาชิก
                </p>
              </div>

              {/* Reason Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">เหตุผลในการยกเลิก:</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium text-slate-800 bg-white focus:border-rose-500 focus:outline-hidden"
                >
                  <option value="ร้านปิดกะทันหัน / วัตถุดิบหมด">ร้านปิดกะทันหัน / วัตถุดิบหมด</option>
                  <option value="ยอดไม่ถึงขั้นต่ำที่ร้านกำหนด">ยอดไม่ถึงขั้นต่ำที่ร้านกำหนด</option>
                  <option value="ฝนตกหนัก / ร้านไม่สามารถจัดส่งได้">ฝนตกหนัก / ร้านไม่สามารถจัดส่งได้</option>
                  <option value="หัวหน้าตี้ติดภารกิจด่วน">หัวหน้าตี้ติดภารกิจด่วน</option>
                  <option value="อื่นๆ (ระบุเพิ่มเติม)">อื่นๆ (ระบุเพิ่มเติมด้านล่าง)</option>
                </select>
              </div>

              {/* Custom reason note */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">ข้อความชี้แจงเพิ่มเติม (จะแสดงให้ลูกตี้เห็น):</label>
                <input
                  type="text"
                  placeholder="เช่น ร้านแจ้งปิดปรับปรุงระบบ, ติดประชุมด่วน..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              {/* Host PIN Input */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>PIN หัวหน้าตี้ 4 หลัก:</span>
                  <span className="text-[10px] text-slate-500 font-normal">เพื่อความปลอดภัย</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="PIN 4 หลัก (เช่น เบอร์โทร 4 ตัวท้าย)"
                  value={cancelPin}
                  onChange={(e) => setCancelPin(e.target.value)}
                  className="w-full text-center text-lg tracking-widest font-mono rounded-xl border-2 border-rose-300 p-2 text-rose-950 focus:border-rose-600 focus:outline-hidden"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={isCancellingBoard}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isCancellingBoard ? "กำลังยกเลิก..." : "ยืนยันยกเลิกตี้ 🚫"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for Selected Photo */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[92vh] max-w-xl w-full rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                  {selectedPhoto.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[80vh] flex items-center justify-center bg-black">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
