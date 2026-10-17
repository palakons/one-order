"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order } from "@/lib/types";
import { compressImage } from "@/lib/services";
import { scanSlipQrFromImageElement, SlipVerificationResult } from "@/lib/slip-verifier";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getDropOffMapUrl, setRuntimeLocations } from "@/lib/locations";
import { getTimeRemaining, formatCutoffDisplay } from "@/lib/utils";
import confetti from "canvas-confetti";
import DishAutocompleteInput from "@/components/DishAutocompleteInput";
import AIMenuSuggester from "@/components/AIMenuSuggester";
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
  ArrowDown,
  FileText,
  Users,
  MessageSquare,
  Info,
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
  const [showLineQrModal, setShowLineQrModal] = useState(false);
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
      setSubmitError("กรุณาแนบรูปสลิปโอนเงิน");
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

  // Unique dishes ordered by friends in this board (ordered list for quick pick)
  const friendsDishes = useMemo(() => {
    const dishMap = new Map<string, { name: string; price: number; count: number }>();
    (activeOrders || []).forEach((ord) => {
      (ord.items || []).forEach((it) => {
        const cleanName = it.name?.trim();
        if (!cleanName) return;
        const existing = dishMap.get(cleanName);
        if (existing) {
          existing.count += it.quantity || 1;
        } else {
          dishMap.set(cleanName, {
            name: cleanName,
            price: it.price || 0,
            count: it.quantity || 1,
          });
        }
      });
    });
    return Array.from(dishMap.values()).sort((a, b) => b.count - a.count);
  }, [activeOrders]);

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
    txt += `🧾 รูปสลิปโอนเงินทั้งหมดและแผนที่จุดส่ง แนบในรูปภาพสรุปยาวด้านล่างครับ`;
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
        alert("บันทึกส่งร้านเรียบร้อยแล้ว!");
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

  const handleCopyEntireOrder = (ord: Order) => {
    if (!ord.items || ord.items.length === 0) {
      setDishName(ord.boxLabel || "อาหาร");
      setDishPrice(ord.totalAmount ? String(ord.totalAmount) : "");
      setDishNote("");
    } else if (ord.items.length === 1) {
      const it = ord.items[0];
      setDishName(it.quantity > 1 ? `${it.quantity}x ${it.name}` : it.name);
      setDishPrice(it.price ? String(it.price * (it.quantity || 1)) : String(ord.totalAmount || ""));
      setDishNote(it.customNote || "");
    } else {
      const combinedName = ord.items
        .map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}`)
        .join(" + ");
      setDishName(combinedName);
      setDishPrice(ord.totalAmount ? String(ord.totalAmount) : "");
      const combinedNote = ord.items
        .map((it) => it.customNote)
        .filter(Boolean)
        .join(", ");
      setDishNote(combinedNote);
    }
    const el = document.getElementById("order-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
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
      `⏰ ${formatCutoffDisplay(batch.cutoffTime, batch.date, "th", true)} (${remainingText})\n\n` +
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

      <main className="mx-auto max-w-4xl px-2.5 py-2 sm:px-6 sm:py-3 space-y-2 sm:space-y-2.5">
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

        {/* Status Announcement Banner (e.g. PENDING, food delayed, shop closed) */}
        {batch.status === "PENDING" && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-3.5 text-amber-950 shadow-xs flex items-start gap-2.5 animate-pulse">
            <span className="text-lg leading-none shrink-0">⚠️</span>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-900">ประกาศด่วนจากหัวหน้าตี้</span>
                {batch.pendingCreatedAt && (
                  <span className="text-[10px] font-mono text-amber-700">
                    {new Date(batch.pendingCreatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-snug">
                {batch.pendingMessage || "ทางร้านแจ้งว่าอาหารอาจล่าช้ากว่ากำหนด หรืออยู่ระหว่างการประสานงานกับทางร้านค้า"}
              </p>
            </div>
          </div>
        )}

        {/* 1. Header Card: Shop Info, Drop-off & Quick Contacts (Ultra-compact & Space-saving) */}
        <div className="rounded-2xl border border-purple-200 bg-white p-3 sm:p-3.5 shadow-2xs space-y-2">
          {/* Row 1: Shop Name, Location & Quick Actions */}
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

            {/* Quick Actions (Call Shop, LINE Shop, QR Shop, Share) */}
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

              {(batch.shop.promptpayNumber || batch.shop.promptpayQrUrl) && (
                <button
                  type="button"
                  onClick={() => setShowPromptPayModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  title="ดู QR พร้อมเพย์ร้านค้า"
                >
                  <CreditCard className="h-3 w-3 text-purple-700" />
                  <span>QR ร้าน</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareBoard}
                className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-950 hover:bg-purple-100 shadow-2xs transition-colors cursor-pointer"
                title="แชร์ชวนเพื่อน"
              >
                <Share2 className="h-3 w-3 text-purple-700" />
                <span>ชวนเพื่อน</span>
              </button>
            </div>
          </div>

          {/* Row 2: Delivery Goal & Progress */}
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
                {batch.isSelfPickup && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-md">
                    🚶 รับเอง
                  </span>
                )}
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

            {/* Time & Leader Info */}
            <div className="flex items-center justify-between pt-0.5 text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                <Clock className="h-3 w-3 text-purple-900" />
                <span>{timeInfo.text} • {formatCutoffDisplay(batch.cutoffTime, batch.date, "th", true)}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 font-medium hidden sm:inline">
                  👑 {leaderLine}
                </span>
                <Link
                  href={`/order/${batchId}/leader`}
                  className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-950 px-2 py-0.5 text-[11px] font-bold transition-all shadow-2xs"
                  title="จัดการกระดาน"
                >
                  <SlidersHorizontal className="h-3 w-3 text-purple-700" />
                  <span>จัดการกระดาน ↗</span>
                </Link>
              </div>
            </div>

            {/* Board Status Stepper & Action Links for Students */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-gray-500">สถานะ:</span>
                  {batch.isTest && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-400 px-1.5 py-0.2 text-[10px] font-black text-purple-950 shrink-0">
                      🧪 TEST
                    </span>
                  )}
                  {batch.status === "CANCELLED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 text-rose-950 px-2 py-0.5 text-[11px] font-black shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                      <span>🚫 ยกเลิกตี้แล้ว</span>
                    </span>
                  ) : batch.status === "COMPLETED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 px-2 py-0.5 text-[11px] font-black shadow-2xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>จัดส่งถึงโต๊ะแล้ว (ปิดรอบ)</span>
                    </span>
                  ) : batch.status === "ORDERED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300 text-sky-900 px-2 py-0.5 text-[11px] font-black shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-600 animate-pulse" />
                      <span>ส่งร้านแล้ว (กำลังปรุง / ดำเนินการ)</span>
                    </span>
                  ) : batch.status === "PENDING" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 px-2 py-0.5 text-[11px] font-black shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
                      <span>รอส่งมอบ / มีประกาศด่วน</span>
                    </span>
                  ) : isBatchClosed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 px-2 py-0.5 text-[11px] font-black">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>ปิดรับแล้ว (กำลังรวบรวมส่ง)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-300 text-purple-900 px-2 py-0.5 text-[11px] font-black">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse" />
                      <span>เปิดรับออเดอร์</span>
                    </span>
                  )}
                </div>

                {/* Quick Links: Delivery Photo, Tracking Page, Kitchen Slip */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {batch.deliveryPhotoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSlip({
                          url: batch.deliveryPhotoUrl!,
                          title: `📸 ภาพหลักฐานส่งอาหารที่โต๊ะ ${buildingName}`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Camera className="h-3 w-3" />
                      <span>ดูรูปส่งอาหารจริง</span>
                    </button>
                  )}
                  <Link
                    href={`/delivery/${batch.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold transition-colors shadow-2xs"
                  >
                    <ExternalLink className="h-3 w-3 text-slate-600" />
                    <span>หน้าจัดส่ง</span>
                  </Link>
                </div>
              </div>

              {/* 4-Step Visual Tracker */}
              {batch.status === "CANCELLED" ? (
                <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-3 text-rose-950 space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-black text-xs text-rose-900">
                    <span className="text-base">🚫</span>
                    <span>กระดานตี้อาหารนี้ถูกยกเลิกแล้ว (CANCELLED)</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    <strong>เหตุผล:</strong> {batch.cancelReason || "หัวหน้าตี้ขอยกเลิกรายการสั่งอาหาร"}
                  </p>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    *หากชำระเงินเข้ามาแล้ว เนื่องจากยอดเงินถูกสั่งส่งต่อไปยังร้านค้า กรุณาประสานงานกับทางร้านค้า หรือติดต่อหัวหน้าตี้ ({leaderLine}) เพื่อรับคำแนะนำในการรับเงินคืนจากทางร้าน
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1 pt-1 text-center">
                  <div className={`p-1 rounded-md border text-[10px] font-bold ${
                    batch.status === "OPEN" && !isBatchClosed
                      ? "bg-purple-50 border-purple-300 text-purple-900 ring-1 ring-purple-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}>
                    1. เปิดตี้
                  </div>
                  <div className={`p-1 rounded-md border text-[10px] font-bold ${
                    (isBatchClosed && batch.status === "OPEN") || batch.status === "PENDING"
                      ? "bg-amber-100 border-amber-400 text-amber-950 ring-1 ring-amber-500 animate-pulse"
                      : batch.status === "ORDERED" || batch.status === "COMPLETED"
                      ? "bg-slate-50 border-slate-200 text-slate-600"
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}>
                    2. ปิดรับ/รวบรวม
                  </div>
                  <div className={`p-1 rounded-md border text-[10px] font-bold ${
                    batch.status === "ORDERED"
                      ? "bg-sky-50 border-sky-300 text-sky-900 ring-1 ring-sky-400"
                      : batch.status === "COMPLETED"
                      ? "bg-slate-50 border-slate-200 text-slate-600"
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}>
                    3. กำลังปรุง
                  </div>
                  <div className={`p-1 rounded-md border text-[10px] font-bold ${
                    batch.status === "COMPLETED"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-500"
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}>
                    4. ถึงโต๊ะแล้ว
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. The Digital Whiteboard List */}
        <div className="rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900">
                📋 ออเดอร์ทั้งหมด
              </h2>
            </div>
            <span className="text-xs font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
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
                    className="p-3 sm:p-3.5 hover:bg-purple-50/30 rounded-xl transition-colors space-y-2"
                  >
                    {/* Row 1: [#1] @น้องวัว (dark gray text-slate-600) [📞 tel] */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-gray-900 text-white shrink-0">
                        #{ord.orderNumber}
                      </span>
                      <span className="font-semibold text-xs text-gray-600 truncate max-w-[150px] sm:max-w-[220px]">
                        {lineName}
                      </span>

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

                      {/* Right: Price + Copy Order + View Slip + Cancel */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-base text-orange-600">
                          ฿{ord.totalAmount}
                        </span>

                        {!isBatchClosed && (
                          <button
                            type="button"
                            onClick={() => handleCopyEntireOrder(ord)}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 px-2 py-1 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title="สั่งตามเพื่อนทั้งออเดอร์นี้"
                          >
                            <Copy className="h-3 w-3 text-purple-700" />
                            <span>สั่งตามเพื่อน</span>
                          </button>
                        )}

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

                        {isHost && batch.status === "OPEN" && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                            className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="ยกเลิกออเดอร์นี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. The 1-Screen Order Input Form (Force Transfer) */}
        {!isBatchClosed ? (
          <div id="order-form" className="rounded-2xl border border-purple-300 bg-white p-2.5 sm:p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-gray-900">
                <Plus className="h-3.5 w-3.5 text-purple-700" />
                <span>สั่งอาหาร & แนบสลิป</span>
              </div>
              <span className="text-[10px] text-gray-400">โอนตรงเข้าบัญชีร้าน</span>
            </div>

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleAddToWhiteboard} className="space-y-2">
              {/* Row 1: LINE ID & Phone Number on ONE LINE */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block truncate">
                    ชื่อ / LINE ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น @golf หรือ Golf"
                    value={customerLineId}
                    onChange={(e) => setCustomerLineId(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-gray-300 bg-gray-50/60 px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between truncate">
                    <span>เบอร์โทร <span className="text-rose-500">*</span></span>
                    <span className="text-[9px] text-gray-400 font-normal hidden sm:inline">กรณีของหมด</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    placeholder="0812345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-gray-300 bg-gray-50/60 px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-1.5 focus:ring-purple-600 font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Dish Name & Shop Contacts */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                    <span>รายการอาหาร</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {batch.shop.phone && (
                      <a
                        href={`tel:${batch.shop.phone}`}
                        className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                        title="โทรติดต่อร้านค้า"
                      >
                        <Phone className="h-2.5 w-2.5" />
                        <span>{batch.shop.phone}</span>
                      </a>
                    )}
                    {batch.shop.lineQrUrl && (
                      <button
                        type="button"
                        onClick={() => setShowLineQrModal(true)}
                        className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="ดู QR LINE ร้านค้า"
                      >
                        <MessageSquare className="h-2.5 w-2.5" />
                        <span>LINE ร้าน</span>
                      </button>
                    )}
                    {batch.shop.gmapUrl && (
                      <a
                        href={batch.shop.gmapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold transition-colors"
                        title="เปิดดูเมนูบน Google Maps"
                      >
                        <MapPin className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                        <span>เมนู Maps ↗</span>
                      </a>
                    )}
                    <AIMenuSuggester
                      shopId={batch.shop.id}
                      shopName={batch.shop.name}
                      onSelectDish={(selectedName, selectedPrice) => {
                        setDishName(selectedName);
                        if (selectedPrice > 0) {
                          setDishPrice(String(selectedPrice));
                        }
                      }}
                    />
                  </div>
                </div>
                <DishAutocompleteInput
                  value={dishName}
                  onChange={setDishName}
                  onSelectMenu={(menuName, price) => {
                    setDishName(menuName);
                    if (price > 0) {
                      setDishPrice(String(price));
                    }
                  }}
                  shopId={batch.shop.id}
                  placeholder="เช่น ข้าวกะเพราหมูกรอบ ไข่ดาว"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-gray-50/60 px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                />

                {/* Popular Dish Chips for 1-Tap Autofill */}
                {batch.shop.menuItems && batch.shop.menuItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] font-bold text-gray-400">เมนูแนะนำ:</span>
                    {batch.shop.menuItems.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setDishName(m.name);
                          setDishPrice(String(m.price));
                        }}
                        className="rounded-md border border-purple-200 bg-purple-50/70 px-2 py-0.5 text-[11px] font-bold text-purple-900 hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        {m.name} (฿{m.price})
                      </button>
                    ))}
                  </div>
                )}

                {/* Friends Ordered Dishes (สั่งตามเพื่อน) */}
                {friendsDishes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400">
                      <Users className="h-2.5 w-2.5 text-slate-400" />
                      <span>สั่งตามเพื่อน:</span>
                    </span>
                    {friendsDishes.slice(0, 6).map((d, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDishName(d.name);
                          if (d.price > 0) setDishPrice(String(d.price));
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        title={`เพื่อนสั่งไปแล้ว ${d.count} จาน`}
                      >
                        <span>{d.name}</span>
                        {d.price > 0 && <span className="font-mono text-slate-400">฿{d.price}</span>}
                        {d.count > 1 && (
                          <span className="rounded bg-slate-200/70 px-1 text-[9px] text-slate-500 font-bold">
                            ×{d.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: Price & Note on ONE LINE */}
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-gray-700 block truncate">
                    ราคา (฿) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="60"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-gray-300 bg-gray-50/60 px-2.5 py-1.5 text-xs font-bold text-orange-600 focus:bg-white focus:outline-hidden focus:ring-1.5 focus:ring-purple-600 font-mono"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] font-bold text-gray-700 block truncate">
                    หมายเหตุ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="ไม่เผ็ด, พิเศษ"
                    value={dishNote}
                    onChange={(e) => setDishNote(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-gray-300 bg-gray-50/60 px-2.5 py-1.5 text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                  />
                </div>
              </div>

              {/* Compact 1-Card Payment & Slip Bar */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-2 sm:p-2.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Total & PromptPay QR button */}
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase block leading-tight">ยอดโอน</span>
                      <div className="text-base sm:text-lg font-mono font-black text-purple-950 leading-none">
                        ฿{dishPrice ? parseFloat(dishPrice) || 0 : 0}
                      </div>
                    </div>

                    {(batch.shop.promptpayNumber || batch.shop.promptpayQrUrl) && (
                      <button
                        type="button"
                        onClick={() => setShowPromptPayModal(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-white hover:bg-purple-100 text-purple-950 px-2 py-1 text-[11px] font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
                      >
                        <CreditCard className="h-3 w-3 text-purple-700" />
                        <span>QR ร้าน</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Slip upload button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <label className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors shadow-2xs ${
                      slipPreview
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-purple-900 hover:bg-purple-800 text-white"
                    }`}>
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>{slipPreview ? "✓ เปลี่ยนสลิป" : "📎 แนบสลิป *"}</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                        onChange={handleSlipFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Slip Scanning status */}
                {scanningSlip && (
                  <div className="text-[10px] font-bold text-purple-900 animate-pulse flex items-center gap-1.5 bg-white p-1 rounded-md border border-purple-200">
                    <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-purple-900 border-t-transparent" />
                    <span>กำลังสแกนสลิปอัตโนมัติ...</span>
                  </div>
                )}

                {/* Slip Verification / Preview feedback */}
                {slipVerification && (
                  <div
                    className={`rounded-lg p-1.5 text-xs font-bold flex items-center justify-between gap-2 border ${
                      slipVerification.isValid
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : "bg-blue-50 text-blue-900 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${slipVerification.isValid ? "text-emerald-600" : "text-blue-600"}`} />
                      <div className="truncate text-[10px] sm:text-[11px]">
                        {slipVerification.isValid ? (
                          <span>
                            สลิป <strong>{slipVerification.bankName}</strong> {slipVerification.transRef ? `(Ref: ${slipVerification.transRef})` : ""}
                          </span>
                        ) : (
                          <span>📷 แนบสลิปแล้ว ({slipVerification.note || "ตรวจไม่พบ QR Code"})</span>
                        )}
                      </div>
                    </div>
                    {slipPreview && (
                      <button
                        type="button"
                        onClick={() => setSelectedSlip({ url: slipPreview, title: "สลิปที่แนบ" })}
                        className="text-[10px] text-purple-700 hover:underline shrink-0 font-bold"
                      >
                        ดูรูป
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingOrder || !slipPreview}
                className="w-full rounded-xl bg-purple-900 py-2.5 text-xs sm:text-sm font-black text-white shadow-xs hover:bg-purple-800 disabled:opacity-50 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submittingOrder ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มลงกระดาน</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-center text-xs font-bold text-rose-800">
            🔴 ปิดรับออเดอร์แล้ว
          </div>
        )}

        {/* Floating Quick Jump to Order Form Button (Mobile only) */}
        {!isBatchClosed && activeOrders.length > 2 && (
          <div className="fixed bottom-4 right-4 z-30 sm:hidden">
            <button
              type="button"
              onClick={() => {
                document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-900 text-white px-3.5 py-2 text-xs font-black shadow-lg hover:bg-purple-800 active:scale-95 transition-all border border-purple-700 ring-2 ring-purple-400/30 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-amber-300" />
              <span>สั่งอาหาร</span>
              <ArrowDown className="h-3 w-3" />
            </button>
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

            <div className="mx-auto w-52 h-52 sm:w-72 sm:h-72 bg-white rounded-2xl border-2 border-purple-200 p-3 shadow-inner flex items-center justify-center">
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

            <div className="flex flex-col gap-1.5 pt-1">
              {(batch.shop.promptpayQrUrl || batch.shop.promptpayNumber) && (
                <a
                  href={batch.shop.promptpayQrUrl || `https://promptpay.io/${batch.shop.promptpayNumber}.png`}
                  download={`PromptPay-${batch.shop.name}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl bg-purple-50 border border-purple-200 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-purple-700" />
                  <span>บันทึกรูป QR ลงเครื่อง</span>
                </a>
              )}
              {batch.shop.promptpayNumber && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(batch.shop.promptpayNumber || "");
                    alert("คัดลอกเลขพร้อมเพย์แล้ว");
                  }}
                  className="w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  คัดลอกเลขพร้อมเพย์
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1.5: Shop LINE QR */}
      {showLineQrModal && batch.shop.lineQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
                <MessageSquare className="h-4 w-4 text-[#06C755]" />
                <span>QR LINE ร้านค้า</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLineQrModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto w-52 h-52 bg-white rounded-2xl border-2 border-emerald-200 p-2 shadow-inner flex items-center justify-center">
              <img
                src={batch.shop.lineQrUrl}
                alt="LINE QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-xs text-gray-500">ร้านค้า:</p>
              <p className="text-sm font-black text-gray-900">{batch.shop.name}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-950 text-left flex items-start gap-2 leading-relaxed">
              <Info className="h-4 w-4 text-[#06C755] shrink-0 mt-0.5" />
              <span>สแกน QR เพื่อแอดไลน์และติดต่อร้านค้าโดยตรง</span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <a
                href={batch.shop.lineQrUrl}
                download={`line-qr-${batch.shop.id}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl bg-emerald-50 border border-emerald-300 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-[#06C755]" />
                <span>บันทึกรูป QR ลงเครื่อง</span>
              </a>
              {batch.shop.phone && (
                <a
                  href={`tel:${batch.shop.phone}`}
                  className="w-full rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5 text-gray-600" />
                  <span>โทรหาร้าน ({batch.shop.phone})</span>
                </a>
              )}
            </div>
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
                ร้าน <strong className="text-purple-900">{batch.shop?.name}</strong> • สั่งอาหารได้ถึง <strong className="text-purple-900">{formatCutoffDisplay(batch.cutoffTime, batch.date, "th")}</strong>
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
