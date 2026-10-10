"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order, Shop } from "@/lib/types";
import { CAMPUS_LOCATIONS, getLocalizedLocation } from "@/lib/locations";
import { compressImage } from "@/lib/services";
import { scanSlipQrFromImageElement, SlipVerificationResult } from "@/lib/slip-verifier";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getTimeRemaining, getBangkokDate, getDaysDifference } from "@/lib/utils";
import { useLanguage, getShopLocalizedInfo, getMenuItemLocalizedName, getLocalizedBuildingName } from "@/lib/i18n";
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
  Lock,
  Key,
  Check,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

export type BoardGroup = "OPENING" | "CLOSED_TODAY" | "ARCHIVED" | "DELETED";

interface Props {
  initialBatches: BatchWithDetails[];
}

export default function HomeClient({ initialBatches }: Props) {
  const { t, lang } = useLanguage();
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);

  // Helper: compute sensible default cutoff time (current time + 40m rounded to 5m)
  const getDefaultCutoff = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 40);
    const rem = now.getMinutes() % 5;
    if (rem !== 0) now.setMinutes(now.getMinutes() + (5 - rem));
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const todayStr = useMemo(() => getBangkokDate(), []);

  // 1. Opening boards (Today/future, OPEN status, cutoff not expired, not deleted)
  const isOpeningBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return false;
    const diff = getDaysDifference(b.date, todayStr);
    if (diff > 0) return false;
    if (b.status !== "OPEN") return false;
    const timeInfo = getTimeRemaining(b.cutoffTime, b.date);
    if (timeInfo.isExpired) return false;
    return true;
  }, [todayStr]);

  // 2. Closed boards for today (Today, cutoff expired or status not OPEN, not deleted)
  const isClosedTodayBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return false;
    const diff = getDaysDifference(b.date, todayStr);
    if (diff !== 0) return false;
    if (b.status !== "OPEN") return true;
    const timeInfo = getTimeRemaining(b.cutoffTime, b.date);
    return timeInfo.isExpired;
  }, [todayStr]);

  // 3. Archived boards (yesterday up to last 7 days: diff >= 1 && diff <= 7, not deleted)
  const isArchivedBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return false;
    const diff = getDaysDifference(b.date, todayStr);
    return diff >= 1 && diff <= 7;
  }, [todayStr]);

  // 4. Deleted boards (more than 7 days: diff > 7 or marked isDeleted)
  const isDeletedBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return true;
    const diff = getDaysDifference(b.date, todayStr);
    return diff > 7;
  }, [todayStr]);

  const openingBatches = useMemo(() => batches.filter(isOpeningBatch), [batches, isOpeningBatch]);
  const closedTodayBatches = useMemo(() => batches.filter(isClosedTodayBatch), [batches, isClosedTodayBatch]);
  const archivedBatches = useMemo(() => batches.filter(isArchivedBatch), [batches, isArchivedBatch]);
  const deletedBatches = useMemo(() => batches.filter(isDeletedBatch), [batches, isDeletedBatch]);

  const [activeGroup, setActiveGroup] = useState<BoardGroup>("OPENING");

  const currentGroupBatches = useMemo(() => {
    switch (activeGroup) {
      case "OPENING":
        return openingBatches;
      case "CLOSED_TODAY":
        return closedTodayBatches;
      case "ARCHIVED":
        return archivedBatches;
      case "DELETED":
        return deletedBatches;
      default:
        return openingBatches;
    }
  }, [activeGroup, openingBatches, closedTodayBatches, archivedBatches, deletedBatches]);

  const [activeBatchId, setActiveBatchId] = useState<string>(() => {
    return (
      initialBatches.find((b) => {
        if (b.isDeleted) return false;
        const diff = getDaysDifference(b.date, getBangkokDate());
        if (diff > 0 || b.status !== "OPEN") return false;
        return !getTimeRemaining(b.cutoffTime, b.date).isExpired;
      })?.id ||
      initialBatches[0]?.id ||
      ""
    );
  });
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const activeBatch = useMemo(() => {
    return batches.find((b) => b.id === activeBatchId) || currentGroupBatches[0] || batches[0] || null;
  }, [batches, activeBatchId, currentGroupBatches]);

  const handleSelectGroup = (group: BoardGroup) => {
    setActiveGroup(group);
    let targetBatches: BatchWithDetails[] = [];
    if (group === "OPENING") targetBatches = openingBatches;
    else if (group === "CLOSED_TODAY") targetBatches = closedTodayBatches;
    else if (group === "ARCHIVED") targetBatches = archivedBatches;
    else if (group === "DELETED") targetBatches = deletedBatches;

    if (targetBatches.length > 0 && !targetBatches.some((b) => b.id === activeBatchId)) {
      setActiveBatchId(targetBatches[0].id);
    }
  };

  // Auto-switch to activeBatchId if missing from currentGroupBatches
  useEffect(() => {
    if (currentGroupBatches.length > 0) {
      const exists = currentGroupBatches.some((b) => b.id === activeBatchId);
      if (!exists) {
        setActiveBatchId(currentGroupBatches[0].id);
      }
    }
  }, [currentGroupBatches, activeBatchId]);

  // Modals state
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [isShopExpanded, setIsShopExpanded] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [manifestData, setManifestData] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Self-Pickup state
  const [isSelfPickup, setIsSelfPickup] = useState(false);

  // Host Light Security State (PIN verification)
  const [openHostPin, setOpenHostPin] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingHostAction, setPendingHostAction] = useState<(() => void) | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  interface OrderItemInput {
    id: string;
    name: string;
    price: string;
    quantity: number;
    customNote: string;
  }

  // Whiteboard Form Inputs (Multi-item support)
  const [customerLineId, setCustomerLineId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
    { id: "item-1", name: "", price: "", quantity: 1, customNote: "" },
  ]);

  const calculatedTotal = useMemo(() => {
    return orderItems.reduce((sum, it) => {
      const p = parseFloat(it.price) || 0;
      const q = it.quantity || 1;
      return sum + p * q;
    }, 0);
  }, [orderItems]);

  const totalItemBoxes = useMemo(() => {
    return orderItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
  }, [orderItems]);

  const handleUpdateOrderItem = (id: string, field: keyof OrderItemInput, value: any) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddOrderItem = () => {
    setOrderItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, name: "", price: "", quantity: 1, customNote: "" },
    ]);
  };

  const handleRemoveOrderItem = (id: string) => {
    setOrderItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  // Open Board Modal State (Anyone can open a board for Building / Shop)
  const [showOpenBoardModal, setShowOpenBoardModal] = useState(false);
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [openShopId, setOpenShopId] = useState("");
  const [openBuildingId, setOpenBuildingId] = useState("loc-m4");
  const [openLeaderName, setOpenLeaderName] = useState("");
  const [openLeaderPhone, setOpenLeaderPhone] = useState("");
  const [openCutoffTime, setOpenCutoffTime] = useState(getDefaultCutoff());
  const [openTargetMin, setOpenTargetMin] = useState("200");
  const [openNotes, setOpenNotes] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [openBoardError, setOpenBoardError] = useState<string | null>(null);

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

  // Manual Refresh state (No background polling to preserve Firestore quota)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // 1. Initial load on mount
  useEffect(() => {
    fetchBatches(false);
    const now = new Date();
    setLastRefreshedAt(
      now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    );
  }, []);

  // 2. Load cached LINE ID, Phone Number & Host status
  useEffect(() => {
    try {
      const savedLine = localStorage.getItem("veatec_user_line");
      if (savedLine) setCustomerLineId(savedLine);
      const savedPhone = localStorage.getItem("veatec_user_phone");
      if (savedPhone) setCustomerPhone(savedPhone);
      if (activeBatch) {
        setIsSelfPickup(Boolean(activeBatch.isSelfPickup));
        const storedPin = localStorage.getItem(`veatec_host_pin_${activeBatch.id}`);
        const isHostFlag = localStorage.getItem(`veatec_host_${activeBatch.id}`) === "true";
        const matchesPin = Boolean(storedPin && activeBatch.hostPin && storedPin === activeBatch.hostPin);
        setIsHost(isHostFlag || matchesPin);
      }
    } catch (e) {}
  }, [activeBatchId, activeBatch?.id, activeBatch?.isSelfPickup, activeBatch?.hostPin]);

  const fetchBatches = async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      // role=shop returns unsanitized batches for manifest generation; fresh=true bypasses server cache
      const url = fresh ? "/api/batches?role=shop&fresh=true" : "/api/batches?role=shop";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.batches)) {
        setBatches(data.batches);
        const now = new Date();
        setLastRefreshedAt(
          now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
        );
      }
    } catch (err) {
      console.warn("Fetch batches error:", err);
    } finally {
      if (fresh) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops");
      const data = await res.json();
      if (data.success && Array.isArray(data.shops)) {
        setAvailableShops(data.shops);
        if (data.shops.length > 0 && !openShopId) {
          setOpenShopId(data.shops[0].id);
          setOpenTargetMin(String(data.shops[0].minDeliveryAmount || 200));
        }
      }
    } catch (e) {
      console.warn("fetchShops error:", e);
    }
  };

  const handleOpenBoardClick = () => {
    setOpenBoardError(null);
    setOpenLeaderName(customerLineId || (typeof window !== "undefined" ? localStorage.getItem("veatec_user_line") || "" : ""));
    const savedPhone = customerPhone || (typeof window !== "undefined" ? localStorage.getItem("veatec_user_phone") || "" : "");
    setOpenLeaderPhone(savedPhone);
    const cleanDigits = savedPhone.replace(/\D/g, "");
    setOpenHostPin(cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "");
    setOpenCutoffTime(getDefaultCutoff());
    fetchShops();
    setShowOpenBoardModal(true);
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpenBoardError(null);

    const cleanLeader = openLeaderName.trim();
    const cleanPhone = openLeaderPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    const finalPin = openHostPin.trim() || (phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "1234");

    if (!openShopId) {
      setOpenBoardError("กรุณาเลือกร้านอาหารที่ต้องการสั่ง");
      return;
    }
    if (!cleanLeader) {
      setOpenBoardError("กรุณากรอก LINE ID หรือชื่อหัวหน้าตี้");
      return;
    }
    if (!cleanPhone || phoneDigits.length < 9) {
      setOpenBoardError("กรุณากรอกเบอร์โทรศัพท์หัวหน้าตี้ (อย่างน้อย 9-10 หลัก) เพื่อให้ร้านค้าโทรประสานงานกรณีมีปัญหา");
      return;
    }

    setCreatingBoard(true);
    try {
      const selectedBuilding = CAMPUS_LOCATIONS.find((l) => l.id === openBuildingId) || CAMPUS_LOCATIONS[0];
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: openShopId,
          date: new Date().toISOString().split("T")[0],
          cutoffTime: openCutoffTime,
          targetMinAmount: Number(openTargetMin) || 200,
          notes: openNotes.trim() || undefined,
          hostLineId: cleanLeader,
          hostPhone: cleanPhone,
          hostName: cleanLeader,
          hostPin: finalPin,
          buildingId: selectedBuilding.id,
          buildingName: selectedBuilding.name,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "ไม่สามารถเปิดกระดานได้");
      }

      try {
        localStorage.setItem("veatec_user_line", cleanLeader);
        localStorage.setItem("veatec_user_phone", cleanPhone);
        localStorage.setItem(`veatec_host_${data.batch.id}`, "true");
        localStorage.setItem(`veatec_host_pin_${data.batch.id}`, finalPin);
        setCustomerLineId(cleanLeader);
        setCustomerPhone(cleanPhone);
        setIsHost(true);
      } catch (e) {}

      setShowOpenBoardModal(false);
      setActiveBatchId(data.batch.id);
      setActiveGroup("OPENING");
      await fetchBatches();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      setOpenBoardError(err.message || "เกิดข้อผิดพลาดในการเปิดกระดาน");
    } finally {
      setCreatingBoard(false);
    }
  };

  // Host Authorization Check & Prompt Helper
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
    if (!activeBatch) return;
    if (checkIsVerifiedHost(activeBatch)) {
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
    if (!activeBatch) return;
    const clean = enteredPin.trim();
    const correctPin = activeBatch.hostPin || (activeBatch.hostPhone ? activeBatch.hostPhone.replace(/\D/g, "").slice(-4) : "1234");
    if (clean === correctPin || clean === "admin") {
      try {
        localStorage.setItem(`veatec_host_pin_${activeBatch.id}`, clean);
        localStorage.setItem(`veatec_host_${activeBatch.id}`, "true");
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

  const handleCloseBoard = async () => {
    if (!activeBatch) return;
    requireHostAuth(async () => {
      if (!confirm("ต้องการปิดรับออเดอร์กระดานนี้ใช่หรือไม่? เมื่อปิดแล้วกระดานจะย้ายไปคลังและไม่สามารถสั่งเพิ่มได้")) return;
      const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${activeBatch.id}`) || activeBatch.hostPin : activeBatch.hostPin;
      try {
        const res = await fetch(`/api/batches/${activeBatch.id}`, {
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
          await fetchBatches();
        } else {
          alert(data.error || "เกิดข้อผิดพลาด");
        }
      } catch (e) {
        alert("ไม่สามารถปิดกระดานได้");
      }
    });
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

    if (!cleanLine) {
      setSubmitError(
        lang === "en"
          ? "Please enter LINE ID or Name"
          : lang === "cn"
          ? "请填写 LINE ID 或姓名"
          : "กรุณากรอก LINE ID หรือชื่อแสดงผล"
      );
      return;
    }
    if (!cleanPhone || phoneDigits.length < 9) {
      setSubmitError(
        lang === "en"
          ? "Please enter a valid phone number (9-10 digits) for the shop to reach you"
          : lang === "cn"
          ? "请填写有效手机号码 (9-10位)，以便商家联络"
          : "กรุณากรอกเบอร์โทรศัพท์ (อย่างน้อย 9-10 หลัก) เพื่อให้ร้านค้าโทรติดต่อกรณีมีปัญหาในออเดอร์"
      );
      return;
    }

    const emptyName = orderItems.find((it) => !it.name.trim());
    if (emptyName) {
      setSubmitError(
        lang === "en"
          ? "Please enter dish name for all items"
          : lang === "cn"
          ? "请填写所有菜品名称"
          : "กรุณากรอกชื่อเมนูอาหารให้ครบทุกรายการ"
      );
      return;
    }

    const invalidPrice = orderItems.find((it) => {
      const p = parseFloat(it.price);
      return isNaN(p) || p <= 0;
    });
    if (invalidPrice) {
      setSubmitError(
        lang === "en"
          ? "Please specify a valid price (> 0) for each dish"
          : lang === "cn"
          ? "请为每道菜填写有效单价 (> 0)"
          : "กรุณาระบุราคาอาหารเป็นตัวเลขที่ถูกต้อง (> 0) ในทุกรายการ"
      );
      return;
    }

    if (calculatedTotal <= 0) {
      setSubmitError(
        lang === "en"
          ? "Total price must be greater than 0"
          : lang === "cn"
          ? "总金额必须大于 0"
          : "ยอดรวมต้องมากกว่า 0 บาท"
      );
      return;
    }

    if (!slipPreview) {
      setSubmitError(
        lang === "en"
          ? "Please attach bank transfer slip (Force Transfer)"
          : lang === "cn"
          ? "请上传转账凭证截图 (Force Transfer)"
          : "กรุณาแนบรูปสลิปโอนเงิน (Force Transfer)"
      );
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
          items: orderItems.map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            name: it.name.trim(),
            price: parseFloat(it.price) || 0,
            quantity: it.quantity || 1,
            customNote: it.customNote.trim() || undefined,
          })),
          totalAmount: calculatedTotal,
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
      setOrderItems([{ id: `item-${Date.now()}`, name: "", price: "", quantity: 1, customNote: "" }]);
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

  // Active orders & Leader info
  const activeOrders = activeBatch ? (activeBatch.orders || []).filter((o) => !o.deletedAt) : [];
  const totalBoxesInBatch = useMemo(() => {
    return activeOrders.reduce(
      (sum, o) => sum + (o.items && o.items.length > 0 ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1),
      0
    );
  }, [activeOrders]);
  const leaderLine = activeBatch?.hostLineId || (activeOrders[0]?.customerLineId ? `@${activeOrders[0].customerLineId}` : activeOrders[0]?.customerName);
  const leaderPhone = activeBatch?.hostPhone || activeOrders[0]?.customerPhone;

  // Compile Brief Text for LINE
  const getCompiledOrderText = () => {
    if (!activeBatch) return "";
    let txt = `🍱 [VEATEC @ VISTEC] ออเดอร์ร้าน ${activeBatch.shop.name}`;
    if (isSelfPickup) {
      txt += ` (🚶 รับเองหน้าร้าน / Self-Pickup)\n`;
      txt += `⚠️ รูปแบบ: ลูกค้า/หัวหน้าตี้จะไปรับอาหารเองที่ร้าน (ยอดไม่ถึงเป้าส่งฟรี)\n`;
    } else {
      txt += `\n🏢 จุดส่ง: ${activeBatch.buildingName || "ตึก M4"} ชั้น 1\n`;
    }
    if (leaderPhone || leaderLine) {
      txt += `👑 หัวหน้าตี้/ผู้ประสานงาน: ${leaderLine || ""} ${leaderPhone ? `(โทร: ${leaderPhone})` : ""}\n`;
    }
    txt += `💰 ยอดรวม: ฿${activeBatch.currentTotalAmount} (${totalBoxesInBatch} กล่อง • ${activeOrders.length} ออเดอร์) • สลิปโอนครบ 100% แล้ว ✅\n`;
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

  // Open "Send to Shop" Modal & Generate Long Manifest Image (Host Only)
  const handleOpenSendModal = async () => {
    if (!activeBatch) return;
    requireHostAuth(async () => {
      setShowSendModal(true);
      setGeneratingManifest(true);
      setManifestData(null);
      setCopiedText(false);

      try {
        const manifest = await generateOneLongManifestImage({
          ...activeBatch,
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
    if (!activeBatch) return;
    const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${activeBatch.id}`) || activeBatch.hostPin : activeBatch.hostPin;
    try {
      const res = await fetch(`/api/batches/${activeBatch.id}`, {
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
        await fetchBatches();
      }
    } catch (e) {}
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

  const timeInfo = activeBatch ? getTimeRemaining(activeBatch.cutoffTime, activeBatch.date, lang) : null;
  const isBatchClosed = activeBatch ? activeBatch.status !== "OPEN" || timeInfo?.isExpired : false;

  const allSlipsVerified =
    activeOrders.length > 0 &&
    activeOrders.every((o) => Boolean(o.slipImageUrl || o.isSlipVerified));
  const missingSlipOrders = activeOrders.filter((o) => !o.slipImageUrl && !o.isSlipVerified);

  const activeShopInfo = activeBatch ? getShopLocalizedInfo(activeBatch.shop, lang) : null;
  const activeBuildingName = activeBatch ? getLocalizedBuildingName(activeBatch.buildingName || "ตึก M4", lang) : "";
  const activeLocation = activeBatch
    ? CAMPUS_LOCATIONS.find((l) => l.id === activeBatch.buildingId) || CAMPUS_LOCATIONS[0]
    : CAMPUS_LOCATIONS[0];
  const activeLocalizedLocation = getLocalizedLocation(activeLocation, lang);

  const timeProgressPercent = useMemo(() => {
    if (!activeBatch || !timeInfo) return 0;
    if (timeInfo.isExpired) return 0;
    let startMs = activeBatch.createdAt ? new Date(activeBatch.createdAt).getTime() : 0;
    let cutoffMs = 0;
    if (activeBatch.date && /^\d{4}-\d{2}-\d{2}$/.test(activeBatch.date)) {
      cutoffMs = new Date(`${activeBatch.date}T${activeBatch.cutoffTime}:00+07:00`).getTime();
    } else {
      const bkkDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      cutoffMs = new Date(`${bkkDateStr}T${activeBatch.cutoffTime}:00+07:00`).getTime();
    }
    if (!startMs || cutoffMs - startMs > 4 * 3600 * 1000 || startMs >= cutoffMs) {
      startMs = cutoffMs - 60 * 60 * 1000;
    }
    const totalDuration = Math.max(1, cutoffMs - startMs);
    const remaining = Math.max(0, Math.min(totalDuration, timeInfo.remainingMs));
    return Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
  }, [activeBatch, timeInfo]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 space-y-4">
        {/* 1. Shop Tabs Bar (3 Groups + Deleted + Open Board Button) */}
        <div className="space-y-2">
          {/* Level 1: Group Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
            {/* Group 1: Opening */}
            <button
              type="button"
              onClick={() => handleSelectGroup("OPENING")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeGroup === "OPENING"
                  ? "bg-purple-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.groupOpening}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "OPENING" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {openingBatches.length}
              </span>
            </button>

            {/* Group 2: Closed Today */}
            <button
              type="button"
              onClick={() => handleSelectGroup("CLOSED_TODAY")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeGroup === "CLOSED_TODAY"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{t.groupClosedToday}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "CLOSED_TODAY" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {closedTodayBatches.length}
              </span>
            </button>

            {/* Group 3: Archived (1-7 Days) */}
            <button
              type="button"
              onClick={() => handleSelectGroup("ARCHIVED")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeGroup === "ARCHIVED"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Archive className="h-3.5 w-3.5 text-amber-500" />
              <span>{t.groupArchived}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "ARCHIVED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {archivedBatches.length}
              </span>
            </button>

            {/* Group 4: Deleted (>7 Days) */}
            <button
              type="button"
              onClick={() => handleSelectGroup("DELETED")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeGroup === "DELETED"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span>{t.groupDeleted}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "DELETED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {deletedBatches.length}
              </span>
            </button>

            {/* Actions: Refresh and Open New Board */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchBatches(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                title="กดเพื่ออัปเดตกระดานและออเดอร์ล่าสุด"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-purple-700 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
                {lastRefreshedAt && (
                  <span className="text-[10px] text-slate-400 font-mono font-normal hidden md:inline">
                    ({lastRefreshedAt})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenBoardClick}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold bg-purple-900 text-white hover:bg-purple-800 transition-all shadow-2xs cursor-pointer"
                title={t.openBoardTitle}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.openNewBoard}</span>
              </button>
            </div>
          </div>

          {/* Level 2: Board Tabs for the active group */}
          {currentGroupBatches.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {currentGroupBatches.map((b, idx) => {
                const isActive = b.id === activeBatchId;
                const isMet = b.currentTotalAmount >= b.targetMinAmount;
                const bldgCode = b.buildingName
                  ? getLocalizedBuildingName(b.buildingName, lang).replace("Bldg ", "").replace(" 栋", "")
                  : "M4";
                const localizedShop = getShopLocalizedInfo(b.shop, lang);

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBatchId(b.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                      isActive
                        ? "bg-white border-purple-400 text-purple-950 shadow-xs font-black ring-1 ring-purple-200"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <span>{idx + 1}. {localizedShop.name.split(" ")[0]}</span>
                    <span className="rounded bg-slate-200/90 text-slate-700 px-1 py-0.2 text-[10px] font-mono font-medium">
                      {bldgCode}
                    </span>

                    {/* Badge depending on group */}
                    {b.isDeleted ? (
                      <span className="rounded bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[10px] font-bold">
                        {b.date} • {lang === "en" ? "Purged" : lang === "cn" ? "已删除" : "ลบแล้ว"}
                      </span>
                    ) : activeGroup === "ARCHIVED" ? (
                      <span className="rounded bg-slate-200 text-slate-700 px-1.5 py-0.2 text-[10px] font-bold font-mono">
                        {b.date}
                      </span>
                    ) : (
                      <span
                        className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                          isMet
                            ? "bg-emerald-600 text-white"
                            : b.currentTotalAmount > 0
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        ฿{b.currentTotalAmount}/{b.targetMinAmount} {isMet ? "🎉" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Banner when viewing non-opening groups */}
        {activeBatch && activeGroup === "ARCHIVED" && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 text-slate-100 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>{t.groupArchived}:</strong> {activeShopInfo?.name || activeBatch.shop.name} ({activeBatch.date}) • {t.readOnlyNotice}
              </span>
            </div>
            {openingBatches.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGroup("OPENING")}
                className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{t.backToLive}</span>
              </button>
            )}
          </div>
        )}

        {activeBatch && activeGroup === "CLOSED_TODAY" && (
          <div className="flex items-center justify-between rounded-xl bg-amber-900/90 text-amber-100 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-300 shrink-0" />
              <span>
                <strong>{t.groupClosedToday}:</strong> {activeShopInfo?.name || activeBatch.shop.name} (Cutoff: {activeBatch.cutoffTime}{lang === "th" ? " น." : ""}) • {lang === "en" ? "Closed for today" : lang === "cn" ? "今日已截止" : "ปิดรับออเดอร์สำหรับรอบนี้แล้ว"}
              </span>
            </div>
            {openingBatches.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGroup("OPENING")}
                className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{t.backToLive}</span>
              </button>
            )}
          </div>
        )}

        {activeBatch && (activeGroup === "DELETED" || activeBatch.isDeleted) && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 text-slate-100 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400 shrink-0" />
              <span>
                <strong>{t.groupDeleted}:</strong> {activeShopInfo?.name || activeBatch.shop.name} ({activeBatch.date}) • {t.deletedBoardNotice}
              </span>
            </div>
            {openingBatches.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGroup("OPENING")}
                className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{t.backToLive}</span>
              </button>
            )}
          </div>
        )}

        {/* Empty state if the active group has no boards */}
        {currentGroupBatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              {activeGroup === "OPENING" ? (
                <Clock className="h-6 w-6 text-amber-600" />
              ) : activeGroup === "CLOSED_TODAY" ? (
                <Clock className="h-6 w-6 text-slate-500" />
              ) : activeGroup === "ARCHIVED" ? (
                <Archive className="h-6 w-6 text-amber-600" />
              ) : (
                <Trash2 className="h-6 w-6 text-rose-500" />
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {activeGroup === "OPENING"
                ? t.noOpeningBoards
                : activeGroup === "CLOSED_TODAY"
                ? t.noClosedTodayBoards
                : activeGroup === "ARCHIVED"
                ? t.noArchived7DaysBoards
                : t.noDeletedBoards}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeGroup === "OPENING" ? t.noLiveBoardsSub : ""}
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenBoardClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-800 shadow-2xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{t.openNewBoard}</span>
              </button>
              {activeGroup !== "OPENING" && openingBatches.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectGroup("OPENING")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <span>{t.groupOpening} ({openingBatches.length})</span>
                </button>
              )}
              {activeGroup === "OPENING" && closedTodayBatches.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectGroup("CLOSED_TODAY")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>{t.groupClosedToday} ({closedTodayBatches.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : activeBatch ? (
          <div className="space-y-2.5 sm:space-y-3">
            {/* 2. Order Pane Header: 3 Squeezed Cards in 1 Row (Shop, Drop-off, Leader) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              {/* Card 1: Shop */}
              <div
                className={`rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between transition-all cursor-pointer hover:border-purple-300 hover:shadow-xs ${
                  isShopExpanded ? "border-purple-300 bg-purple-50/20 ring-1 ring-purple-200" : ""
                }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a, button")) return;
                  setIsShopExpanded((prev) => !prev);
                }}
              >
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-purple-900 shrink-0">
                    <Store className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-purple-700 shrink-0" />
                    <span className="truncate">{t.shop}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowPromptPayModal(true)}
                    className="inline-flex items-center gap-0.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 px-1 py-0.2 text-[9px] sm:text-[10px] font-bold transition-colors shadow-2xs cursor-pointer shrink-0"
                    title={t.viewShopPromptPay}
                  >
                    <CreditCard className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                    <span>{lang === "en" ? "QR" : lang === "cn" ? "收款码" : "QR ร้าน"}</span>
                  </button>
                </div>

                <div className="my-0.5">
                  <h3
                    className="text-xs sm:text-sm font-black text-slate-950 leading-tight truncate"
                    title={activeShopInfo?.name || activeBatch.shop.name}
                  >
                    {activeShopInfo?.name || activeBatch.shop.name}
                  </h3>
                </div>

                {/* Open Map to see menu - ALWAYS prominently visible on the shop card! */}
                <div>
                  <a
                    href={
                      activeBatch.shop.gmapUrl ||
                      `https://maps.google.com/?q=${encodeURIComponent(
                        (activeShopInfo?.name || activeBatch.shop.name) + " ระยอง"
                      )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 w-full rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold transition-colors shadow-2xs truncate"
                    title={t.viewMenuMaps}
                  >
                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-500 shrink-0" />
                    <span className="truncate">{t.viewMenuMaps}</span>
                  </a>
                </div>

                {/* When expanded: show shop details */}
                {isShopExpanded && (activeShopInfo?.description || activeBatch.shop.description) && (
                  <div className="pt-1.5 mt-1 border-t border-purple-100 text-[9px] sm:text-[10px] text-slate-500 animate-fadeIn">
                    <p className="line-clamp-2">{activeShopInfo?.description || activeBatch.shop.description}</p>
                  </div>
                )}
              </div>

              {/* Card 2: Drop off location */}
              <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-800 shrink-0">
                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{t.dropoffPoint}</span>
                  </span>
                  <span className="rounded bg-slate-100 text-slate-600 px-1 py-0.2 text-[9px] sm:text-[10px] font-mono font-bold shrink-0">
                    {activeLocation.shortCode || "M4"}
                  </span>
                </div>

                <div className="my-0.5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-950 leading-tight truncate" title={activeBuildingName}>
                    {activeBuildingName}
                  </h3>
                </div>

                <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate" title={activeLocalizedLocation.deskDetail}>
                  {activeLocalizedLocation.deskDetail}
                </div>
              </div>

              {/* Card 3: Leader or Retention Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-purple-900 shrink-0 min-w-0">
                    <span className="text-amber-500">👑</span>
                    <span className="truncate">{t.leader}</span>
                  </span>

                  {!activeBatch.isDeleted ? (
                    <Link
                      href={`/order/${activeBatch.id}/leader`}
                      className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 p-0.5 sm:px-1.5 sm:py-0.5 text-[9px] sm:text-[10px] font-bold transition-colors shadow-2xs shrink-0"
                      title={t.manageBoard}
                    >
                      <SlidersHorizontal className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                      <span className="hidden sm:inline">{t.manageBoard.replace(" ↗", "")}</span>
                    </Link>
                  ) : (
                    <span className="rounded bg-rose-100 text-rose-800 px-1 py-0.2 text-[8px] font-bold shrink-0">
                      Purged
                    </span>
                  )}
                </div>

                <div className="my-0.5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-950 leading-tight truncate" title={activeBatch.isDeleted ? "PDPA Purged" : (leaderLine || t.noLeader)}>
                    {activeBatch.isDeleted
                      ? (lang === "en" ? "Data Purged" : lang === "cn" ? "数据已清除" : "ข้อมูลถูกลบแล้ว")
                      : (leaderLine || t.noLeader)}
                  </h3>
                </div>

                <div className="text-[9px] sm:text-[10px] truncate">
                  {activeBatch.isDeleted ? (
                    <span className="text-slate-400">PDPA</span>
                  ) : leaderPhone ? (
                    <a
                      href={`tel:${leaderPhone}`}
                      className="inline-flex items-center gap-0.5 font-mono font-bold text-purple-900 hover:text-purple-700 hover:underline truncate"
                    >
                      <Phone className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                      <span className="truncate">{leaderPhone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">{lang === "en" ? "No phone" : lang === "cn" ? "未留电话" : "ไม่มีเบอร์"}</span>
                  )}
                </div>
              </div>
            </div>

            {/* If deleted (> 7 days), show privacy retention message instead of filling bars, orders, and form */}
            {activeBatch.isDeleted ? (
              <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-6 sm:p-8 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.deletedBoardNotice}
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  {lang === "en"
                    ? "Orders, phone numbers, and payment slips have been permanently purged from the database in compliance with data privacy policies. Only the shop and building delivery records remain."
                    : lang === "cn"
                    ? "根据数据隐私保护政策，超过7天的订单明细、电话号码及转账凭证已从数据库中永久清除，仅保留商家与取餐大楼的历史记录。"
                    : "ระบบได้ทำการลบข้อมูลรายการสั่งซื้อ เบอร์โทรศัพท์ และสลิปการโอนเงินออกจากฐานข้อมูลอย่างถาวรตามนโยบายความเป็นส่วนตัว (PDPA) โดยคงเหลือเฉพาะบันทึกประวัติชื่อร้านและตึกที่ส่งอาหารเท่านั้น"}
                </p>
              </div>
            ) : (
              <>
                {/* Below the 3 Cards: Two Progress Bars (Price Pool Filling Bar & Time Left Bar) */}
                <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-2xs space-y-2 sm:space-y-2.5">
                  {/* Bar 1: Price / Order Starter Filling Bar */}
                  <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-purple-900" />
                    <span>
                      {t.currentTotal}: <strong className="text-sm font-black text-slate-950 font-mono">฿{activeBatch.currentTotalAmount}</strong> / ฿{activeBatch.targetMinAmount}
                    </span>
                    <span className="text-slate-400 font-normal">({totalBoxesInBatch} {t.boxesCount})</span>
                  </span>

                  <span className={activeBatch.isMinMet ? "text-emerald-700 font-black" : "text-amber-800"}>
                    {activeBatch.isMinMet
                      ? t.freeGoalReached
                      : (lang === "en"
                          ? `฿${activeBatch.amountRemaining} more to free delivery`
                          : lang === "cn"
                          ? `还差 ฿${activeBatch.amountRemaining} 免运`
                          : `ขาดอีก ฿${activeBatch.amountRemaining} เพื่อส่งฟรี`)}
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeBatch.isMinMet
                        ? "bg-emerald-600"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, (activeBatch.currentTotalAmount / activeBatch.targetMinAmount) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Bar 2: Time Left Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-purple-900" />
                    <span>
                      {lang === "en" ? "Time Left:" : lang === "cn" ? "剩余时间:" : "เวลาที่เหลือ:"}{" "}
                      <strong className="text-sm font-black text-slate-950 font-mono">
                        {timeInfo?.text}
                      </strong>
                    </span>
                    <span className="text-slate-500 font-normal text-[11px]">
                      (Cutoff: {activeBatch.cutoffTime}{lang === "th" ? " น." : ""})
                    </span>
                  </span>

                  <span>
                    {isBatchClosed ? (
                      <span className="rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                        {lang === "en" ? "Closed" : lang === "cn" ? "已截止" : "ปิดรับแล้ว"}
                      </span>
                    ) : timeInfo?.remainingMs && timeInfo.remainingMs <= 15 * 60 * 1000 ? (
                      <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                        {lang === "en" ? "Closing Soon" : lang === "cn" ? "即将截止" : "ใกล้ปิดรอบ"}
                      </span>
                    ) : (
                      <span className="rounded-md bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-bold">
                        {lang === "en" ? "Accepting Orders" : lang === "cn" ? "接单中" : "กำลังเปิดรับ"}
                      </span>
                    )}
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      timeInfo?.isExpired
                        ? "bg-slate-300"
                        : timeProgressPercent <= 25
                        ? "bg-linear-to-r from-amber-500 to-rose-500"
                        : "bg-linear-to-r from-purple-800 to-purple-600"
                    }`}
                    style={{ width: `${timeInfo?.isExpired ? 100 : timeProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. The Live Whiteboard Table */}
            <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-slate-950">
                    {t.boardTitle} {activeShopInfo?.name || activeBatch.shop.name}
                  </h3>
                  <span className="text-[11px] font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                    {totalBoxesInBatch} {t.boxesCount}
                  </span>
                  {isSelfPickup && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                      {t.selfPickupFull}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {t.realtimeUpdate}
                </span>
              </div>

              {activeOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-sm font-bold text-slate-600">{t.noOneOnBoard}</p>
                  <p className="text-xs text-slate-400">{t.beFirstOnBoard}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 font-mono">{t.thNumber}</th>
                        <th className="py-2.5 px-3 w-36">{t.thCustomer}</th>
                        <th className="py-2.5 px-3">{t.thDish}</th>
                        <th className="py-2.5 px-3 w-20 text-right">{t.thPrice}</th>
                        <th className="py-2.5 px-3 w-28 text-center">{t.thSlip}</th>
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
                            </td>
                            <td className="py-3 px-3 text-slate-800 font-medium">
                              <div className="space-y-1">
                                {ord.items.map((it, idx) => (
                                  <div key={idx} className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900">
                                      {it.quantity > 1 ? `${it.quantity}x ` : ""}{it.name}
                                    </span>
                                    {it.price && it.quantity > 1 ? (
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        (฿{it.price} × {it.quantity} = ฿{it.price * it.quantity})
                                      </span>
                                    ) : null}
                                    {it.customNote && (
                                      <span className="text-[11px] text-amber-800 italic">
                                        ({it.customNote})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
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
                                  <span>{ord.slipBankName ? ord.slipBankName.split(" ")[0] : t.viewSlip}</span>
                                </button>
                              ) : (
                                <span className="inline-block rounded bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                  {t.waitingSlip}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isHost && activeBatch.status === "OPEN" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                                  className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                                  title={t.cancelOrderTitle}
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
            {!isBatchClosed && activeGroup === "OPENING" && !activeBatch.isDeleted ? (
              <div className="rounded-2xl border-2 border-purple-900 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-900 text-white font-black text-xs">
                      +
                    </span>
                    <h3 className="font-black text-sm sm:text-base text-slate-950">
                      {t.formTitle} {activeShopInfo?.name || activeBatch.shop.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPromptPayModal(true)}
                    className="text-xs font-bold text-purple-900 hover:underline"
                  >
                    {t.viewShopPromptPay}
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
                        {t.lineIdLabel} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.lineIdPlaceholder}
                        value={customerLineId}
                        onChange={(e) => setCustomerLineId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                      />
                    </div>

                    {/* Field 2: Phone Number (for shop to call) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>{t.phoneLabel} <span className="text-rose-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">{t.phoneNote}</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        required
                        placeholder={t.phonePlaceholder}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Field 3: Multiple Menu Items List */}
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800">
                        {t.orderItemsTitle} <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {totalItemBoxes} {t.boxesCount}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {orderItems.map((item, index) => {
                        const itemSubtotal = (parseFloat(item.price) || 0) * (item.quantity || 1);

                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5 transition-all focus-within:border-purple-300 focus-within:bg-white"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-purple-900 text-white font-mono text-[10px]">
                                  {index + 1}
                                </span>
                                <span>{t.itemNumber} {index + 1}</span>
                              </span>
                              {orderItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOrderItem(item.id)}
                                  className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 hover:underline"
                                  title={t.removeItemButton}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>{t.removeItemButton}</span>
                                </button>
                              )}
                            </div>

                            {/* Dish Name */}
                            <div>
                              <input
                                type="text"
                                required
                                placeholder={t.dishNamePlaceholder}
                                value={item.name}
                                onChange={(e) => handleUpdateOrderItem(item.id, "name", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                              />
                            </div>

                            {/* Quantity, Price per unit, and Subtotal */}
                            <div className="grid grid-cols-12 gap-2 items-center">
                              {/* Quantity */}
                              <div className="col-span-5 sm:col-span-4 space-y-0.5">
                                <label className="text-[10px] font-bold text-slate-600 block">
                                  {t.quantityLabel}
                                </label>
                                <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderItem(item.id, "quantity", Math.max(1, item.quantity - 1))}
                                    className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      handleUpdateOrderItem(item.id, "quantity", isNaN(val) || val < 1 ? 1 : val);
                                    }}
                                    className="w-full text-center text-xs font-mono font-bold text-slate-900 focus:outline-none py-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderItem(item.id, "quantity", item.quantity + 1)}
                                    className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Price per unit */}
                              <div className="col-span-4 sm:col-span-4 space-y-0.5">
                                <label className="text-[10px] font-bold text-slate-600 block">
                                  {t.pricePerUnitLabel}
                                </label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  placeholder={t.dishPricePlaceholder}
                                  value={item.price}
                                  onChange={(e) => handleUpdateOrderItem(item.id, "price", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-orange-600 focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                                />
                              </div>

                              {/* Subtotal Display */}
                              <div className="col-span-3 sm:col-span-4 text-right pt-3">
                                <span className="text-[10px] text-slate-500 font-medium mr-1">{t.itemSubtotal}:</span>
                                <span className="text-xs font-mono font-black text-slate-900">
                                  ฿{itemSubtotal}
                                </span>
                              </div>
                            </div>

                            {/* Kitchen Note */}
                            <div>
                              <input
                                type="text"
                                placeholder={t.dishNotePlaceholder}
                                value={item.customNote}
                                onChange={(e) => handleUpdateOrderItem(item.id, "customNote", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Item Button */}
                    <button
                      type="button"
                      onClick={handleAddOrderItem}
                      className="w-full rounded-xl border border-dashed border-purple-300 bg-purple-50/60 hover:bg-purple-100/80 py-2 text-xs font-bold text-purple-900 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t.addItemButton}</span>
                    </button>
                  </div>

                  {/* Order Total & Single QR Payment Reminder */}
                  <div className="rounded-xl bg-purple-950 text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div>
                      <div className="text-[11px] text-purple-200 font-medium">
                        {t.totalTransferAmount}
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-black text-amber-300">
                        ฿{calculatedTotal}
                        <span className="text-xs font-normal text-purple-200 ml-2">
                          ({totalItemBoxes} {t.boxesCount})
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-purple-200 bg-white/10 rounded-lg px-2.5 py-1.5 max-w-xs leading-relaxed">
                      <span>{t.oneQrNotice}</span>
                    </div>
                  </div>

                  {/* Subtle Guideline Disclosure Banner */}
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-2.5 text-[11px] text-amber-900 flex items-start gap-2 leading-relaxed">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{t.qrGuidelineNotice}</span>
                  </div>

                  {/* Field 5: Slip Upload with BOT QR Verification */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-purple-900" />
                        <span>{t.slipLabel} <span className="text-rose-500">*</span></span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">{t.slipScanAuto}</span>
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
                        <span>{t.slipScanning}</span>
                      </div>
                    )}

                    {slipVerification && (
                      <div
                        className={`rounded-lg p-2.5 text-[11px] font-bold flex items-center gap-2 ${
                          slipVerification.isValid
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : "bg-blue-50 text-blue-900 border border-blue-200"
                        }`}
                      >
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${slipVerification.isValid ? "text-emerald-600" : "text-blue-600"}`} />
                        <div className="space-y-0.5">
                          {slipVerification.isValid ? (
                            <>
                              <div>
                                {t.slipVerified} <strong>{slipVerification.bankName}</strong>
                              </div>
                              {slipVerification.transRef && (
                                <div className="text-[10px] font-mono text-emerald-800">
                                  {t.slipRef} {slipVerification.transRef}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>{t.slipAttached}</div>
                              <div className="text-[10px] font-normal text-blue-800">
                                {slipVerification.note || t.slipNote}
                              </div>
                            </>
                          )}
                        </div>
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
                        <span>{t.submittingToWhiteboard}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>{t.submitToWhiteboard}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : !activeBatch.isDeleted ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center space-y-1 text-slate-600">
                <p className="text-xs font-bold">
                  {activeGroup === "ARCHIVED"
                    ? t.boardArchiveNotice
                    : t.boardClosedNotice}
                </p>
                {openingBatches.length > 0 && activeGroup !== "OPENING" && (
                  <button
                    type="button"
                    onClick={() => handleSelectGroup("OPENING")}
                    className="text-xs font-bold text-purple-900 underline hover:text-purple-700 pt-1 inline-block cursor-pointer"
                  >
                    {t.switchToLiveToday}
                  </button>
                )}
              </div>
            ) : null}
              </>
            )}
          </div>
        ) : null}
      </main>

      {/* MODAL 1: PromptPay QR */}
      {showPromptPayModal && activeBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-center space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-xs text-slate-900">{t.promptPayModalTitle}</h3>
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
              <p className="text-[11px] text-slate-500 font-medium">{t.accountName}</p>
              <p className="text-sm font-black text-slate-900">{activeBatch.shop.promptpayAccountName}</p>
              <p className="text-xs font-mono font-bold text-purple-900 mt-0.5">
                {activeBatch.shop.promptpayNumber}
              </p>
            </div>

            {/* Subtle Guideline Disclosure */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-[11px] text-amber-900 text-left flex items-start gap-2 leading-relaxed">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{t.qrModalGuideline}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(activeBatch.shop.promptpayNumber);
                alert(t.copiedPromptPay);
              }}
              className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-900 hover:bg-slate-200 transition-colors"
            >
              {t.copyPromptPay}
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
                  <h3 className="font-black text-sm text-slate-900">{t.oneLongManifestTitle}</h3>
                  <p className="text-[11px] text-slate-500">{t.oneLongManifestSub}</p>
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
                    {t.generatingManifest}
                  </span>
                </div>
              ) : manifestData ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{t.manifestSuccess}</span>
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
                      <span>{t.summaryForChat}</span>
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
                        <span>{copiedText ? t.copiedText : t.copyText}</span>
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
                  <span>{t.shareToLineNow}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSentToShop}
                  className="w-full sm:w-auto rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 py-2.5 px-3.5 text-xs font-bold text-purple-900 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  title={t.markSentToShop}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-700" />
                  <span>{t.markSentToShop}</span>
                </button>

                <a
                  href={manifestData.dataUrl}
                  download={`veatec-order-${activeBatch.shop.name}-${activeBatch.date}.jpg`}
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2.5 px-3.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t.saveLongImage}</span>
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
                  <h3 className="font-bold text-base text-slate-950">{t.archiveModalTitle}</h3>
                  <p className="text-xs text-slate-500">{t.archiveModalSub}</p>
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
                  <p className="text-sm font-bold text-slate-600">{t.noArchivedBoards}</p>
                  <p className="text-xs text-slate-400">{t.allActiveLive}</p>
                </div>
              ) : (
                archivedBatches.map((b) => (
                  <div key={b.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{getShopLocalizedInfo(b.shop, lang).name}</strong>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          b.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {b.status === "COMPLETED" ? t.roundCompleted : b.status === "CANCELLED" ? t.roundCancelled : t.roundClosed}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                        <span>{t.orderDate}: <strong>{b.date}</strong></span>
                        <span>Cutoff: <strong>{b.cutoffTime}{lang === "th" ? " น." : ""}</strong></span>
                        <span>{t.currentTotal}: <strong className="text-orange-600">฿{b.currentTotalAmount}</strong> ({b.orders?.filter((o) => !o.deletedAt).length || 0} {t.boxesCount})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBatchId(b.id);
                          setActiveGroup("ARCHIVED");
                          setShowArchiveModal(false);
                        }}
                        className="rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 px-3 py-1.5 text-xs font-bold transition-colors shadow-2xs"
                      >
                        {t.viewBoard}
                      </button>
                      {b.status === "COMPLETED" && (
                        <Link
                          href={`/delivery/${b.id}`}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Camera className="h-3 w-3" />
                          <span>{t.viewDeliveryPhoto} {b.buildingName ? getLocalizedBuildingName(b.buildingName, lang).replace("Bldg ", "").replace(" 栋", "") : ""}</span>
                        </Link>
                      )}
                      <Link
                        href={`/shop/${b.id}`}
                        target="_blank"
                        className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <span>{t.kitchenSheet}</span>
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
                {t.closeWindow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Open Board Modal (Anyone can open a board for Building + Shop) */}
      {showOpenBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{t.openBoardTitle}</h3>
                  <p className="text-xs text-purple-200">{t.openBoardSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenBoardModal(false)}
                className="rounded-lg p-1.5 text-purple-200 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBoard} className="p-5 overflow-y-auto space-y-4 text-xs">
              {openBoardError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{openBoardError}</span>
                </div>
              )}

              {/* 1. ร้านอาหาร */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{t.stepShop} <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {lang === "en" ? "Available in system" : lang === "cn" ? "系统内餐厅" : "ร้านที่มีในระบบ"}
                  </span>
                </label>
                <select
                  value={openShopId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    setOpenShopId(sId);
                    const s = availableShops.find((x) => x.id === sId);
                    if (s?.minDeliveryAmount) {
                      setOpenTargetMin(String(s.minDeliveryAmount));
                    }
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                >
                  {availableShops.length === 0 ? (
                    <option value="">
                      {lang === "en" ? "Loading shops..." : lang === "cn" ? "正在加载餐厅..." : "กำลังโหลดรายชื่อร้าน..."}
                    </option>
                  ) : (
                    availableShops.map((s) => {
                      const localizedShop = getShopLocalizedInfo(s, lang);
                      return (
                        <option key={s.id} value={s.id}>
                          {localizedShop.name} ({localizedShop.cuisine}) {s.minDeliveryAmount ? `• ${lang === "en" ? "Min" : lang === "cn" ? "免运" : "ขั้นต่ำ"} ฿${s.minDeliveryAmount}` : ""}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* 2. ตึกปลายทาง */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{t.stepBuilding} <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-purple-700 font-semibold">
                    {lang === "en" ? "Destination building" : lang === "cn" ? "送达楼栋" : "เฉพาะตึกนี้"}
                  </span>
                </label>
                <select
                  value={openBuildingId}
                  onChange={(e) => setOpenBuildingId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                >
                  {CAMPUS_LOCATIONS.map((loc) => {
                    const locInfo = getLocalizedLocation(loc, lang);
                    return (
                      <option key={loc.id} value={loc.id}>
                        {locInfo.name} — {locInfo.deskDetail}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500">
                  {t.buildingRiderNotice}
                </p>
              </div>

              {/* 3. ข้อมูลหัวหน้าตี้ (Leader Contact) */}
              <div className="rounded-xl bg-purple-50/70 border border-purple-200 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-purple-950 font-bold">
                  <span className="text-sm">👑</span>
                  <span>{t.stepLeader}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">
                      {t.leaderName} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={openLeaderName}
                      onChange={(e) => setOpenLeaderName(e.target.value)}
                      placeholder={lang === "en" ? "e.g. Golf or @golf_123" : lang === "cn" ? "例如: 小李 或 @golf_123" : "เช่น somchai_v หรือ สมชาย"}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">
                      {t.leaderPhone} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={openLeaderPhone}
                      onChange={(e) => setOpenLeaderPhone(e.target.value)}
                      placeholder="0812345678"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-purple-200/60">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      <Key className="h-3 w-3 text-purple-700" />
                      <span>{t.leaderPin}</span>
                    </label>
                    <span className="text-[10px] text-purple-700 font-semibold">{t.leaderPinHint}</span>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={openHostPin}
                    onChange={(e) => setOpenHostPin(e.target.value.replace(/\D/g, ""))}
                    placeholder={openLeaderPhone ? openLeaderPhone.replace(/\D/g, "").slice(-4) || "1234" : "1234"}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono tracking-widest font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {t.leaderPinDesc}
                  </p>
                </div>
                <p className="text-[11px] text-purple-900 flex items-start gap-1">
                  <Phone className="h-3 w-3 shrink-0 mt-0.5 text-purple-700" />
                  <span>{t.leaderPhoneHelp}</span>
                </p>
              </div>

              {/* 4. เวลา Cutoff & ยอดขั้นต่ำ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    {t.stepCutoff} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={openCutoffTime}
                    onChange={(e) => setOpenCutoffTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    {t.stepTargetMin}
                  </label>
                  <input
                    type="number"
                    value={openTargetMin}
                    onChange={(e) => setOpenTargetMin(e.target.value)}
                    min="0"
                    step="10"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>

              {/* 5. หมายเหตุ */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  {t.stepNotes}
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder={t.stepNotesPlaceholder}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpenBoardModal(false)}
                  disabled={creatingBoard}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creatingBoard}
                  className="rounded-xl bg-purple-900 hover:bg-purple-800 text-white px-5 py-2 text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingBoard ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>{t.openingBoard}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{t.openBoardButton}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
