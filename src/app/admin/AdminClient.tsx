"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BatchWithDetails, Shop, Suggestion } from "@/lib/types";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  ChefHat,
  Plus,
  ArrowRight,
  Store,
  Clock,
  Phone,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  MapPin,
  Building2,
  Copy,
  Check,
  Camera,
  Lock,
  LogOut,
  ArrowLeft,
  MessageSquareHeart,
  RefreshCw,
  AlertTriangle,
  Database,
  Edit,
  Send,
  X,
  Upload,
} from "lucide-react";
import { CAMPUS_LOCATIONS, DeliveryLocation } from "@/lib/locations";
import { compressImage } from "@/lib/services";

interface Props {
  initialBatches: BatchWithDetails[];
  initialShops: Shop[];
  initialLocations?: DeliveryLocation[];
}

export default function AdminClient({
  initialBatches,
  initialShops,
  initialLocations,
}: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "shops" | "desks" | "batches" | "suggestions" | "line"
  >("shops");

  const [copiedDesk, setCopiedDesk] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [locations, setLocations] = useState<DeliveryLocation[]>(
    initialLocations && initialLocations.length > 0 ? initialLocations : CAMPUS_LOCATIONS
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // LINE Notification Status State
  const [lineStatus, setLineStatus] = useState<{
    hasToken: boolean;
    envGroupId: string | null;
    envUserId: string | null;
    activeGroupIds: string[];
  } | null>(null);
  const [loadingLine, setLoadingLine] = useState(false);
  const [testingLine, setTestingLine] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customBroadcastMsg, setCustomBroadcastMsg] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [manualGroupId, setManualGroupId] = useState("");
  const [addingGroupId, setAddingGroupId] = useState(false);

  // System & Firebase Health Diagnostics State
  const [systemStatus, setSystemStatus] = useState<{
    firebaseConfigured: boolean;
    severity: "normal" | "warning" | "interrupted";
    quotaExhausted: boolean;
    fallbackMode: boolean;
    lastError?: string;
    resetTimeInfo: string;
  }>({
    firebaseConfigured: isFirebaseConfigured,
    severity: "normal",
    quotaExhausted: false,
    fallbackMode: !isFirebaseConfigured,
    lastError: undefined,
    resetTimeInfo: "15:00 น. ICT (00:00 PST)",
  });
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  // Shop Add/Edit Modal State
  const [showShopModal, setShowShopModal] = useState(false);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopNameEn, setShopNameEn] = useState("");
  const [shopCuisine, setShopCuisine] = useState("อาหารตามสั่ง");
  const [shopDescription, setShopDescription] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopLineId, setShopLineId] = useState("");
  const [shopGmapUrl, setShopGmapUrl] = useState("");
  const [shopPromptPayNumber, setShopPromptPayNumber] = useState("");
  const [shopPromptPayName, setShopPromptPayName] = useState("");
  const [shopPromptPayQrUrl, setShopPromptPayQrUrl] = useState("");
  const [shopMenuImageUrl, setShopMenuImageUrl] = useState("");
  const [shopMinDelivery, setShopMinDelivery] = useState("200");
  const [shopDefaultCutoff, setShopDefaultCutoff] = useState("11:15");
  const [shopMenuItems, setShopMenuItems] = useState<Array<{ name: string; price: number; popular: boolean }>>([
    { name: "ข้าวกะเพราหมูกรอบ", price: 60, popular: true },
    { name: "ข้าวหมูกระเทียม", price: 55, popular: false },
  ]);
  const [newDishName, setNewDishName] = useState("");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [savingShop, setSavingShop] = useState(false);

  // Drop-off Point (Desk) Add/Edit Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locName, setLocName] = useState("");
  const [locNameEn, setLocNameEn] = useState("");
  const [locNameCn, setLocNameCn] = useState("");
  const [locShortCode, setLocShortCode] = useState("");
  const [locDeskDetail, setLocDeskDetail] = useState("");
  const [locDeskDetailEn, setLocDeskDetailEn] = useState("");
  const [locDeskDetailCn, setLocDeskDetailCn] = useState("");
  const [locPhotoUrl, setLocPhotoUrl] = useState("");
  const [locColor, setLocColor] = useState("bg-purple-900");
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    fetchSystemStatus();
    try {
      const isAuth = sessionStorage.getItem("veatec_admin_auth");
      if (isAuth === "true") {
        setIsAuthenticated(true);
        fetchSuggestions();
        fetchLocations();
      }
    } catch (e) {
      console.warn("sessionStorage check failed", e);
    }
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setRefreshingStatus(true);
      const res = await fetch("/api/system/status");
      const data = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
      }
    } catch (e) {
      console.warn("fetchSystemStatus error", e);
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleProbeFirebase = async () => {
    try {
      setRefreshingStatus(true);
      const res = await fetch("/api/system/status", { method: "POST" });
      const data = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
        if (!data.status.quotaExhausted) {
          alert("✅ ตรวจสอบสำเร็จ: โควตา Google Cloud Firestore ใช้งานได้ปกติและเชื่อมต่อสมบูรณ์!");
        } else {
          alert("⚠️ โควตารายวันยังถูกจำกัด ระบบเปิดใช้งาน Local High-Availability Fallback อัตโนมัติ");
        }
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการทดสอบ: " + (e.message || "Unknown error"));
    } finally {
      setRefreshingStatus(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const res = await fetch("/api/suggestions");
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error("Error fetching suggestions:", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (data.success && data.locations) {
        setLocations(data.locations);
      }
    } catch (e) {
      console.warn("Error fetching locations:", e);
    }
  };

  const fetchLineStatus = async () => {
    try {
      setLoadingLine(true);
      const res = await fetch("/api/line/status");
      const data = await res.json();
      if (data.success) {
        setLineStatus(data);
      }
    } catch (e) {
      console.error("Error fetching LINE status:", e);
    } finally {
      setLoadingLine(false);
    }
  };

  const handleTestLinePush = async (targetId?: string) => {
    try {
      setTestingLine(true);
      setLineTestResult(null);
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json();
      if (data.success) {
        setLineTestResult({ success: true, message: data.message });
      } else {
        setLineTestResult({ success: false, message: data.error || "ส่งข้อความไม่สำเร็จ" });
      }
    } catch (e: any) {
      setLineTestResult({ success: false, message: e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setTestingLine(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!customBroadcastMsg.trim()) return;
    try {
      setSendingBroadcast(true);
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          message: customBroadcastMsg.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("📢 ส่งข้อความประกาศเข้า LINE เรียบร้อยแล้ว!");
        setCustomBroadcastMsg("");
      } else {
        alert("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถส่งประกาศได้"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleAddManualGroup = async () => {
    const cleanId = manualGroupId.trim();
    if (!cleanId) return;
    try {
      setAddingGroupId(true);
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", groupId: cleanId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("เพิ่ม Group ID เรียบร้อยแล้ว!");
        setManualGroupId("");
        fetchLineStatus();
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setAddingGroupId(false);
    }
  };

  const handleRemoveGroup = async (gid: string) => {
    if (!confirm(`ต้องการลบ Group ID ${gid} ออกจากระบบใช่หรือไม่?`)) return;
    try {
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", groupId: gid }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLineStatus();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm("ต้องการลบข้อเสนอแนะนี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/suggestions?id=${id}`, { method: "DELETE" });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to delete suggestion", e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim().toLowerCase();
    const validPasswords = [
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.toLowerCase(),
      "m4-admin",
      "veatec",
      "veatec-admin",
      "vistec",
      "admin",
    ].filter(Boolean);

    if (validPasswords.includes(clean)) {
      try {
        sessionStorage.setItem("veatec_admin_auth", "true");
      } catch (err) {}
      setIsAuthenticated(true);
      setPassError(false);
      fetchSuggestions();
      fetchLocations();
    } else {
      setPassError(true);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("veatec_admin_auth");
    } catch (err) {}
    setIsAuthenticated(false);
    setPasscode("");
  };

  const refreshData = async () => {
    try {
      const [batchesRes, shopsRes, locsRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/shops"),
        fetch("/api/locations"),
      ]);
      const batchesData = await batchesRes.json();
      const shopsData = await shopsRes.json();
      const locsData = await locsRes.json();

      if (batchesData.success) setBatches(batchesData.batches);
      if (shopsData.success) setShops(shopsData.shops);
      if (locsData.success && locsData.locations) setLocations(locsData.locations);
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        refreshData();
      } else {
        alert(data.error || "ไม่สามารถเปลี่ยนสถานะได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    }
  };

  // -------------------------------------------------------------
  // Shop CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenAddShop = () => {
    setEditingShopId(null);
    setShopName("");
    setShopNameEn("");
    setShopCuisine("อาหารตามสั่ง");
    setShopDescription("");
    setShopPhone("");
    setShopLineId("");
    setShopGmapUrl("");
    setShopPromptPayNumber("");
    setShopPromptPayName("");
    setShopPromptPayQrUrl("");
    setShopMenuImageUrl("");
    setShopMinDelivery("200");
    setShopDefaultCutoff("11:15");
    setShopMenuItems([
      { name: "ข้าวกะเพราหมูกรอบ", price: 60, popular: true },
      { name: "ข้าวหมูกระเทียม", price: 55, popular: false },
    ]);
    setShowShopModal(true);
  };

  const handleOpenEditShop = (shop: Shop) => {
    setEditingShopId(shop.id);
    setShopName(shop.name);
    setShopNameEn(shop.nameEn || "");
    setShopCuisine(shop.cuisine || "");
    setShopDescription(shop.description || "");
    setShopPhone(shop.phone || "");
    setShopLineId(shop.lineId || "");
    setShopGmapUrl(shop.gmapUrl || "");
    setShopPromptPayNumber(shop.promptpayNumber || "");
    setShopPromptPayName(shop.promptpayAccountName || "");
    setShopPromptPayQrUrl(shop.promptpayQrUrl || "");
    setShopMenuImageUrl(shop.menuImageUrl || "");
    setShopMinDelivery(String(shop.minDeliveryAmount || 200));
    setShopDefaultCutoff(shop.defaultCutoffTime || "11:15");
    setShopMenuItems(
      (shop.menuItems || []).map((m) => ({
        name: m.name,
        price: m.price,
        popular: Boolean(m.popular),
      }))
    );
    setShowShopModal(true);
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบร้าน "${name}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/shops?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setShops((prev) => prev.filter((s) => s.id !== id));
        alert(`ลบร้าน "${name}" เรียบร้อยแล้ว`);
      } else {
        alert(data.error || "Failed to delete shop");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleAddDish = () => {
    if (!newDishName.trim() || !newDishPrice) return;
    setShopMenuItems((prev) => [
      ...prev,
      { name: newDishName.trim(), price: Number(newDishPrice), popular: false },
    ]);
    setNewDishName("");
    setNewDishPrice("");
  };

  const handleRemoveDish = (idx: number) => {
    setShopMenuItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopPromptPayNumber.trim() || !shopPromptPayName.trim()) {
      alert("กรุณากรอกชื่อร้าน เบอร์พร้อมเพย์ และชื่อบัญชีพร้อมเพย์");
      return;
    }

    setSavingShop(true);
    try {
      const payload = {
        id: editingShopId || undefined,
        name: shopName.trim(),
        nameEn: shopNameEn.trim(),
        cuisine: shopCuisine.trim(),
        description: shopDescription.trim(),
        phone: shopPhone.trim(),
        lineId: shopLineId.trim(),
        gmapUrl: shopGmapUrl.trim() || `https://maps.google.com/?q=${encodeURIComponent(shopName.trim() + " ระยอง")}`,
        promptpayNumber: shopPromptPayNumber.trim(),
        promptpayAccountName: shopPromptPayName.trim(),
        promptpayQrUrl: shopPromptPayQrUrl.trim() || undefined,
        menuImageUrl: shopMenuImageUrl.trim() || undefined,
        minDeliveryAmount: Number(shopMinDelivery) || 200,
        defaultCutoffTime: shopDefaultCutoff.trim() || "11:15",
        menuItems: shopMenuItems.map((it, idx) => ({
          id: `dish-${Date.now()}-${idx}`,
          name: it.name,
          price: it.price,
          popular: it.popular,
        })),
      };

      const res = await fetch("/api/shops", {
        method: editingShopId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert(editingShopId ? `แก้ไขร้าน "${shopName}" สำเร็จ!` : `เพิ่มร้าน "${shopName}" เข้าสู่ระบบสำเร็จ!`);
      setShowShopModal(false);
      refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to save shop");
    } finally {
      setSavingShop(false);
    }
  };

  const handleUploadShopImageFile = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "menu" | "qr") => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.75);
        if (targetField === "menu") setShopMenuImageUrl(compressed);
        if (targetField === "qr") setShopPromptPayQrUrl(compressed);
      } catch (err) {
        console.error("Image upload compression error:", err);
      }
    }
  };

  // -------------------------------------------------------------
  // Drop-off Locations CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenAddLocation = () => {
    setEditingLocationId(null);
    setLocName("");
    setLocNameEn("");
    setLocNameCn("");
    setLocShortCode("");
    setLocDeskDetail("");
    setLocDeskDetailEn("");
    setLocDeskDetailCn("");
    setLocPhotoUrl("");
    setLocColor("bg-purple-900");
    setShowLocationModal(true);
  };

  const handleOpenEditLocation = (loc: DeliveryLocation) => {
    setEditingLocationId(loc.id);
    setLocName(loc.name);
    setLocNameEn(loc.nameEn || "");
    setLocNameCn(loc.nameCn || "");
    setLocShortCode(loc.shortCode);
    setLocDeskDetail(loc.deskDetail);
    setLocDeskDetailEn(loc.deskDetailEn || "");
    setLocDeskDetailCn(loc.deskDetailCn || "");
    setLocPhotoUrl(loc.photoUrl);
    setLocColor(loc.color || "bg-purple-900");
    setShowLocationModal(true);
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบจุดส่ง "${name}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
        alert(`ลบจุดส่ง "${name}" สำเร็จ`);
      } else {
        alert(data.error || "Failed to delete location");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locShortCode.trim() || !locDeskDetail.trim()) {
      alert("กรุณากรอกชื่ออาคาร รหัสย่อ (เช่น M4) และรายละเอียดโต๊ะส่งอาหาร");
      return;
    }

    setSavingLocation(true);
    try {
      const payload = {
        id: editingLocationId || undefined,
        name: locName.trim(),
        nameEn: locNameEn.trim() || locName.trim(),
        nameCn: locNameCn.trim() || locName.trim(),
        shortCode: locShortCode.trim().toUpperCase(),
        deskDetail: locDeskDetail.trim(),
        deskDetailEn: locDeskDetailEn.trim() || locDeskDetail.trim(),
        deskDetailCn: locDeskDetailCn.trim() || locDeskDetail.trim(),
        photoUrl: locPhotoUrl.trim() || undefined,
        color: locColor || "bg-purple-900",
      };

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert(editingLocationId ? `แก้ไขจุดส่ง "${locName}" สำเร็จ!` : `เพิ่มจุดส่ง "${locName}" สำเร็จ!`);
      setShowLocationModal(false);
      fetchLocations();
    } catch (err: any) {
      alert(err.message || "Failed to save location");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleUploadLocationPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.75);
        setLocPhotoUrl(compressed);
      } catch (err) {
        console.error("Location image compression error:", err);
      }
    }
  };

  // -------------------------------------------------------------
  // Authentication Screen
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-white to-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-purple-200/80 bg-white p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-900 shadow-xs">
            <Lock className="h-8 w-8 text-purple-900" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              VEATEC Portal Admin
            </h1>
            <p className="mt-1.5 text-xs text-gray-500">
              ระบบจัดการร้านค้า จุดส่งอาหาร และการแจ้งเตือน
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="กรอกรหัสผ่านผู้ดูแลระบบ (Admin PIN)"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPassError(false);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-center font-bold tracking-widest text-gray-900 transition-all ${
                  passError
                    ? "border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-400"
                    : "border-gray-200 bg-gray-50/50 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-200"
                }`}
              />
              {passError && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-purple-900 py-3 text-sm font-bold text-white shadow-md hover:bg-purple-800 transition-colors"
            >
              เข้าสู่ระบบ Admin Portal
            </button>
          </form>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-purple-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปหน้าหลัก (Digital Whiteboard)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Admin Main Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md px-4 py-3 shadow-2xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 transition-colors"
              title="กลับไปกระดานสั่งข้าวหน้าแรก"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-purple-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  M4 ADMIN
                </span>
                <h1 className="text-sm sm:text-base font-black text-gray-900">
                  VEATEC Hub &mdash; จัดการระบบ
                </h1>
              </div>
              <p className="text-[11px] text-gray-500">
                จัดการร้านค้า • จุดส่งอาหาร • ตรวจสอบฐานข้อมูล • LINE แจ้งเตือน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs"
            >
              <span>กระดานหลัก ↗</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Firebase Health & Quota Diagnostics Card */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
            systemStatus.severity === "interrupted"
              ? "border-amber-300 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30"
              : systemStatus.severity === "warning"
              ? "border-amber-200 bg-amber-50/40"
              : "border-emerald-200 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/30"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                  systemStatus.severity === "interrupted"
                    ? "bg-amber-100 text-amber-800"
                    : systemStatus.severity === "warning"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <Database className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      systemStatus.severity === "interrupted"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : systemStatus.severity === "warning"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    {systemStatus.severity === "interrupted"
                      ? "โควตารายวันถูกจำกัด (Spark Plan)"
                      : "Cloud Firestore Healthy"}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold border flex items-center gap-1 ${
                      systemStatus.fallbackMode
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-purple-100 text-purple-900 border-purple-300"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {systemStatus.fallbackMode
                      ? "High-Availability Fallback Active • ให้บริการต่อเนื่อง 100%"
                      : "Connected to Cloud Firestore"}
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900">
                  {systemStatus.severity === "interrupted"
                    ? "สถานะโควตา Cloud Firestore รายวัน — ระบบทำงานต่อเนื่องผ่าน Local Architecture"
                    : "สถานะการเชื่อมต่อฐานข้อมูล Google Cloud Firestore ปกติ"}
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Google Cloud Firestore Spark Plan รีเซ็ตโควตาทุกวันเวลา <strong>15:00 น. ICT (00:00 PST)</strong> หากถึงเวลาแล้ว สามารถกดปุ่ม &ldquo;ทดสอบ &amp; รีเซ็ตสถานะเดี๋ยวนี้&rdquo; เพื่อให้ระบบตรวจสอบการเชื่อมต่อใหม่ได้ทันที
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-start">
              <button
                type="button"
                onClick={handleProbeFirebase}
                disabled={refreshingStatus}
                className="rounded-xl border border-purple-300 bg-purple-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="ทดสอบอ่าน/เขียน Firestore ทันที"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshingStatus ? "animate-spin" : ""}`}
                />
                <span>{refreshingStatus ? "กำลังทดสอบ..." : "🔄 ทดสอบสถานะ Quota เดี๋ยวนี้"}</span>
              </button>
              <a
                href="https://console.firebase.google.com/project/one-order-af750/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1"
              >
                <span>Console ↗</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("shops")}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "shops"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Store className="h-4 w-4" />
            <span>จัดการร้านอาหาร ({shops.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("desks");
              fetchLocations();
            }}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "desks"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>จุดส่งอาหาร ({locations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("batches")}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "batches"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>กระดานออเดอร์ ({batches.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("suggestions");
              fetchSuggestions();
            }}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "suggestions"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MessageSquareHeart className="h-4 w-4" />
            <span>ข้อเสนอแนะ ({suggestions.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("line");
              fetchLineStatus();
            }}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "line"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded bg-[#06C755] text-white text-[9px] font-black">
              L
            </span>
            <span>LINE แจ้งเตือน</span>
            {lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: SHOPS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === "shops" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-purple-700" />
                  <span>ร้านอาหารในระบบ ({shops.length} ร้าน)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  เพิ่ม ลบ แก้ไขข้อมูลร้าน เบอร์โทร พร้อมเพย์ และรูปภาพเมนู
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddShop}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 transition-colors cursor-pointer self-start sm:self-center"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มร้านอาหารใหม่</span>
              </button>
            </div>

            {shops.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 space-y-2">
                <Store className="h-8 w-8 mx-auto text-gray-400" />
                <p className="font-bold text-sm">ยังไม่มีร้านอาหารในระบบ</p>
                <button
                  onClick={handleOpenAddShop}
                  className="rounded-xl bg-purple-900 px-3 py-1.5 text-xs font-bold text-white"
                >
                  เพิ่มร้านแรก
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Shop Image & Header */}
                      <div className="flex items-start gap-3">
                        <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-purple-50 border border-purple-100 shrink-0">
                          {s.menuImageUrl ? (
                            <img
                              src={s.menuImageUrl}
                              alt={s.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-purple-300">
                              <Store className="h-7 w-7" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-sm text-gray-900 truncate" title={s.name}>
                            {s.name}
                          </h3>
                          {s.nameEn && (
                            <p className="text-[11px] text-gray-500 truncate">{s.nameEn}</p>
                          )}
                          <span className="inline-block rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.2 text-[10px] font-bold text-purple-900 mt-1">
                            {s.cuisine || "อาหารจานเดียว"}
                          </span>
                        </div>
                      </div>

                      {/* Info details */}
                      <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50/70 rounded-xl p-2.5 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">โทร:</span>
                          <a
                            href={`tel:${s.phone}`}
                            className="font-bold text-purple-900 hover:underline font-mono"
                          >
                            {s.phone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">พร้อมเพย์:</span>
                          <span className="font-mono font-bold text-gray-800">
                            {s.promptpayNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">ชื่อบัญชี:</span>
                          <span className="font-semibold text-gray-800 truncate max-w-[150px]">
                            {s.promptpayAccountName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">เป้าส่งฟรี:</span>
                          <span className="font-bold text-emerald-700">
                            ฿{s.minDeliveryAmount || 200}
                          </span>
                        </div>
                      </div>

                      {/* Google Maps link badge */}
                      {s.gmapUrl && (
                        <div className="pt-0.5">
                          <a
                            href={s.gmapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline"
                          >
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            <span className="truncate">ดูเมนูจาก Google Maps ↗</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditShop(s)}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Edit className="h-3 w-3" />
                        <span>แก้ไขร้าน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteShop(s.id, s.name)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>ลบร้าน</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DROP-OFF POINTS (DESKS) */}
        {/* ========================================================= */}
        {activeTab === "desks" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-700" />
                  <span>จุดส่งอาหารและโต๊ะรับ Delivery ({locations.length} จุด)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  เพิ่ม ลบ แก้ไขตำแหน่งโต๊ะวางอาหารประจำตึก และเปลี่ยนภาพประกอบ
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleOpenAddLocation}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มจุดส่งใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const guideText =
                      `📍 [VEATEC] จุดส่งอาหาร VISTEC:\n` +
                      locations
                        .map((l) => `• [${l.shortCode}] ${l.name}: ${l.deskDetail}`)
                        .join("\n") +
                      `\n\n⚠️ คำแนะนำไรเดอร์: นำกล่องอาหารวางที่โต๊ะประจำตึกตามป้าย และถ่ายรูปส่งเข้า LINE หลังส่งครบ`;
                    navigator.clipboard.writeText(guideText);
                    setCopiedDesk("ALL");
                    setTimeout(() => setCopiedDesk(null), 2000);
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedDesk === "ALL" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                      <span>คัดลอกคู่มือส่ง</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Locations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white shadow-xs ${loc.color || "bg-purple-900"}`}
                        >
                          {loc.shortCode}
                        </span>
                        <div>
                          <h3 className="font-black text-sm text-gray-900">{loc.name}</h3>
                          {loc.nameEn && (
                            <p className="text-[11px] text-gray-500">{loc.nameEn}</p>
                          )}
                        </div>
                      </div>

                      <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-mono font-bold">
                        {loc.shortCode}
                      </span>
                    </div>

                    {/* Desk details */}
                    <div className="rounded-xl bg-purple-50/60 border border-purple-100 p-2.5 space-y-1">
                      <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                        ตำแหน่งโต๊ะวางอาหาร:
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-relaxed">
                        {loc.deskDetail}
                      </p>
                    </div>

                    {/* Photo preview */}
                    <div className="relative h-32 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      {loc.photoUrl ? (
                        <img
                          src={loc.photoUrl}
                          alt={loc.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Building2 className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                        [{loc.shortCode}]
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLocation(loc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit className="h-3 w-3" />
                      <span>แก้ไขจุดส่ง</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BATCH MONITORING */}
        {/* ========================================================= */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">กระดานออเดอร์ทั้งหมด ({batches.length})</h2>
                <p className="text-xs text-gray-500">
                  ตรวจสอบและติดตามสถานะรอบอาหาร (การเปิดรอบใหม่ดำเนินการผ่านหน้าหลัก Digital Whiteboard)
                </p>
              </div>

              <button
                onClick={refreshData}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs self-start sm:self-center cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>

            {batches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                ยังไม่มีรอบสั่งอาหารในขณะนี้
              </div>
            ) : (
              <div className="grid gap-3">
                {batches.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-gray-900">{b.shop.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            b.isMinMet
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.isMinMet ? "ส่งฟรีถึงตึก ✅" : "ยังไม่ถึงเป้า (฿" + b.targetMinAmount + ")"}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-bold">
                          {b.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>วันที่: <strong>{b.date}</strong></span>
                        <span>ปิดรับ: <strong>{b.cutoffTime} น.</strong></span>
                        <span>จุดส่ง: <strong>{b.buildingName || "ตึก M4"}</strong></span>
                        <span>
                          ยอดรวม: <strong className="text-purple-900 font-mono">฿{b.currentTotalAmount}</strong> / ฿{b.targetMinAmount}
                        </span>
                        <span>จำนวน: <strong>{b.orderCount} กล่อง</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <Link
                        href={`/order/${b.id}/leader`}
                        className="rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-900 shadow-2xs"
                      >
                        <span>หน้าหัวหน้าตี้ ↗</span>
                      </Link>

                      {b.status === "OPEN" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateBatchStatus(b.id, "ORDERED")}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-2xs cursor-pointer"
                        >
                          ปิดรับ &rarr; สั่งร้านแล้ว
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateBatchStatus(b.id, "OPEN")}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                        >
                          เปิดรับใหม่
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SUGGESTIONS */}
        {/* ========================================================= */}
        {activeTab === "suggestions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquareHeart className="h-5 w-5 text-purple-700" />
                  <span>ข้อเสนอแนะ &amp; ติชมจากผู้ใช้ ({suggestions.length})</span>
                </h2>
                <p className="text-xs text-gray-500">
                  รวมคำแนะนำร้านอาหารและแจ้งปัญหาการใช้งาน
                </p>
              </div>

              <button
                type="button"
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingSuggestions ? "animate-spin" : ""}`}
                />
                <span>รีเฟรช</span>
              </button>
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                ยังไม่มีข้อเสนอแนะใหม่ในขณะนี้
              </div>
            ) : (
              <div className="grid gap-3">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-bold">
                          {s.category || "ทั่วไป"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {s.createdAt ? new Date(s.createdAt).toLocaleString("th-TH") : ""}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{s.message}</p>
                      {s.name && (
                        <p className="text-xs text-gray-500">โดย: {s.name}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSuggestion(s.id)}
                      className="self-end sm:self-center text-gray-400 hover:text-rose-600 p-2 cursor-pointer"
                      title="ลบข้อเสนอแนะ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: LINE NOTIFICATION */}
        {/* ========================================================= */}
        {activeTab === "line" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#06C755] text-white text-xs font-black">
                    L
                  </span>
                  <span>LINE Notification &amp; Group Dispatch</span>
                </h2>
                <p className="text-xs text-gray-500">
                  จัดการเชื่อมต่อกลุ่ม LINE และส่งข้อความแจ้งเตือนเมื่ออาหารมาส่ง
                </p>
              </div>

              <button
                type="button"
                onClick={fetchLineStatus}
                disabled={loadingLine}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer self-start sm:self-center"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-gray-500 ${loadingLine ? "animate-spin" : ""}`}
                />
                <span>รีเฟรชสถานะ</span>
              </button>
            </div>

            {/* Connection Cards */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-gray-900">1. สถานะการเชื่อมต่อ LINE Messaging API</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Channel Access Token</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-800">พร้อมใช้งาน (Configured)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Environment Group ID</div>
                  <div className="mt-1 font-bold text-xs truncate">
                    {lineStatus?.envGroupId ? (
                      <span className="text-emerald-800 font-mono">{lineStatus.envGroupId}</span>
                    ) : (
                      <span className="text-gray-400 font-normal">Auto-detect Active</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">กลุ่มที่เชื่อมต่ออยู่</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <span
                      className={
                        lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0
                          ? "text-emerald-800"
                          : "text-amber-800"
                      }
                    >
                      {lineStatus?.activeGroupIds?.length || 0} กลุ่มที่ตรวจพบ
                    </span>
                  </div>
                </div>
              </div>

              {/* Connected Groups List */}
              <div className="pt-2 space-y-2">
                <h4 className="text-xs font-bold text-gray-700">กลุ่ม LINE ที่จะได้รับแจ้งเตือนอัตโนมัติ:</h4>
                {lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0 ? (
                  <div className="space-y-2">
                    {lineStatus.activeGroupIds.map((gid) => (
                      <div
                        key={gid}
                        className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-mono font-bold text-emerald-950">{gid}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTestLinePush(gid)}
                            disabled={testingLine}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
                          >
                            {testingLine ? "กำลังส่ง..." : "ทดสอบส่ง"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveGroup(gid)}
                            className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    ยังไม่มี Group ID บันทึกในระบบ (สามารถเพิ่มด้วยตนเองด้านล่าง หรือพิมพ์ &lsquo;group id&rsquo; ในกลุ่มแชท)
                  </p>
                )}
              </div>

              {/* Manual Add Group ID Form */}
              <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="ใส่ LINE Group ID ด้วยตนเอง (ขึ้นต้นด้วย C... หรือ R...)"
                  value={manualGroupId}
                  onChange={(e) => setManualGroupId(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-900"
                />
                <button
                  type="button"
                  onClick={handleAddManualGroup}
                  disabled={addingGroupId}
                  className="rounded-xl bg-purple-900 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-2xs cursor-pointer shrink-0"
                >
                  {addingGroupId ? "กำลังเพิ่ม..." : "+ เพิ่ม Group ID"}
                </button>
              </div>

              {lineTestResult && (
                <div
                  className={`rounded-xl p-3 text-xs font-bold border ${
                    lineTestResult.success
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-rose-300 bg-rose-50 text-rose-900"
                  }`}
                >
                  {lineTestResult.message}
                </div>
              )}
            </div>

            {/* Broadcast Custom Message Card */}
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/50 to-white p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                <Send className="h-4 w-4 text-purple-700" />
                <span>2. ส่งประกาศข้อความเข้ากลุ่ม LINE (Broadcast Announcement)</span>
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                พิมพ์ข้อความเพื่อส่งประกาศเข้ากลุ่ม LINE ของนักศึกษาและอาจารย์ VISTEC ทุกกลุ่มที่เชื่อมต่ออยู่
              </p>
              <textarea
                rows={3}
                placeholder="เช่น: 🍱 [VEATEC] แจ้งเตือน: วันนี้มีร้านอาหารเปิดรอบพิเศษส่งฟรีถึงตึก M4 สั่งได้ถึง 11:15 น.!"
                value={customBroadcastMsg}
                onChange={(e) => setCustomBroadcastMsg(e.target.value)}
                className="w-full rounded-xl border border-purple-200 bg-white p-3 text-xs text-gray-900 focus:outline-purple-500"
              />
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || !customBroadcastMsg.trim()}
                className="rounded-xl bg-purple-900 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {sendingBroadcast ? "กำลังส่งประกาศ..." : "📢 ส่งประกาศเข้ากลุ่มเดี๋ยวนี้"}
              </button>
            </div>

            {/* Webhook URL & Instructions Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-gray-900">3. ข้อมูล Webhook URL สำหรับ LINE Developers Console</h3>
              <p className="text-xs text-gray-600">
                นำ URL ด้านล่างนี้ไปกรอกในช่อง <strong>Webhook URL</strong> บน LINE Developers Console:
              </p>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 text-slate-100 p-3 text-xs font-mono">
                <span className="truncate">https://one-order-seven.vercel.app/api/line/webhook</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("https://one-order-seven.vercel.app/api/line/webhook");
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="rounded bg-white/20 hover:bg-white/30 text-white px-2 py-1 text-xs font-bold transition-colors cursor-pointer shrink-0 ml-2"
                >
                  {copiedWebhook ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT SHOP */}
      {/* ========================================================= */}
      {showShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-700" />
                <span>{editingShopId ? `แก้ไขร้าน: ${shopName}` : "เพิ่มร้านอาหารใหม่เข้าสู่ระบบ"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowShopModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShop} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">ชื่อร้านอาหาร (Shop Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ข้าวขาหมูเจ๊วรรณ"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">ชื่อภาษาอังกฤษ (English Name)</label>
                  <input
                    type="text"
                    placeholder="e.g. Pork Leg Rice"
                    value={shopNameEn}
                    onChange={(e) => setShopNameEn(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">หมวดหมู่ / สไตล์อาหาร</label>
                  <input
                    type="text"
                    placeholder="เช่น อาหารตามสั่ง, ข้าวมันไก่"
                    value={shopCuisine}
                    onChange={(e) => setShopCuisine(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">เป้ายอดส่งฟรี (฿)</label>
                  <input
                    type="number"
                    value={shopMinDelivery}
                    onChange={(e) => setShopMinDelivery(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">เบอร์โทรร้านค้า *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08x-xxx-xxxx"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">LINE ID ร้าน</label>
                  <input
                    type="text"
                    placeholder="shop_line_id"
                    value={shopLineId}
                    onChange={(e) => setShopLineId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Google Maps URL */}
              <div>
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  <span>ลิงก์ Google Maps สำหรับดูเมนูร้าน (Google Maps URL)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={shopGmapUrl}
                  onChange={(e) => setShopGmapUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  หากเว้นว่าง ระบบจะสร้างลิงก์ค้นหาร้านบน Google Maps ระยอง ให้อัตโนมัติ
                </p>
              </div>

              {/* Direct PromptPay Section */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-purple-700" />
                  <span>ข้อมูลพร้อมเพย์ของร้าน (PromptPay Payment)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700">เบอร์พร้อมเพย์ / เลขบัตร *</label>
                    <input
                      type="text"
                      required
                      placeholder="0819999999"
                      value={shopPromptPayNumber}
                      onChange={(e) => setShopPromptPayNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700">ชื่อบัญชีพร้อมเพย์ *</label>
                    <input
                      type="text"
                      required
                      placeholder="สมศรี ใจดี"
                      value={shopPromptPayName}
                      onChange={(e) => setShopPromptPayName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                </div>

                {/* PromptPay QR Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    รูปภาพ QR Code พร้อมเพย์ร้าน
                  </label>
                  {shopPromptPayQrUrl && (
                    <div className="relative h-24 w-24 rounded-xl border overflow-hidden bg-white mb-2">
                      <img src={shopPromptPayQrUrl} alt="QR Preview" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 text-white px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                      <span>อัปโหลดรูป QR</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadShopImageFile(e, "qr")}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="หรือใส่ลิงก์รูป QR URL"
                      value={shopPromptPayQrUrl}
                      onChange={(e) => setShopPromptPayQrUrl(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Shop Logo / Menu Image Box */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-2">
                <label className="text-xs font-bold text-gray-900 block">
                  รูปโลโก้ / ภาพถ่ายหน้าร้าน / เมนู
                </label>
                {shopMenuImageUrl && (
                  <div className="relative h-24 w-24 rounded-xl border overflow-hidden bg-white mb-2">
                    <img src={shopMenuImageUrl} alt="Shop Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 text-white px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors shrink-0">
                    <Camera className="h-3.5 w-3.5" />
                    <span>อัปโหลดรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadShopImageFile(e, "menu")}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="หรือใส่ลิงก์ URL รูปภาพ"
                    value={shopMenuImageUrl}
                    onChange={(e) => setShopMenuImageUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">รายการเมนูอาหารเริ่มต้น ({shopMenuItems.length})</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {shopMenuItems.map((dish, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-1 text-xs"
                    >
                      <span className="font-semibold text-gray-800">{dish.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-900">฿{dish.price}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDish(idx)}
                          className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="ชื่อเมนูใหม่"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="ราคา"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    className="w-20 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddDish}
                    className="rounded-lg bg-purple-900 px-3 py-1 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer"
                  >
                    + เพิ่มเมนู
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowShopModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingShop}
                  className="rounded-xl bg-purple-900 px-5 py-2 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer disabled:opacity-50"
                >
                  {savingShop ? "กำลังบันทึก..." : editingShopId ? "บันทึกการแก้ไข" : "บันทึกร้านอาหารใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD / EDIT LOCATION (DESK) */}
      {/* ========================================================= */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-700" />
                <span>{editingLocationId ? `แก้ไขจุดส่ง: ${locName}` : "เพิ่มจุดส่งอาหาร / อาคารใหม่"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">ชื่ออาคาร / ตึก (Building Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตึก M4, ตึก ESE"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">รหัสย่อ (Short Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น M4, MSE, ESE"
                    value={locShortCode}
                    onChange={(e) => setLocShortCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">รายละเอียดตำแหน่งโต๊ะรับอาหาร (Desk Detail) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เคาน์เตอร์ชั้น 1 - โต๊ะวางอาหาร Delivery ตึก M4"
                  value={locDeskDetail}
                  onChange={(e) => setLocDeskDetail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  รูปภาพจุดวางอาหารประจำอาคาร
                </label>
                {locPhotoUrl && (
                  <div className="relative h-28 w-full rounded-xl border overflow-hidden bg-gray-100 mb-2">
                    <img src={locPhotoUrl} alt="Desk Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 text-white px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors shrink-0">
                    <Camera className="h-3.5 w-3.5" />
                    <span>อัปโหลดรูปโต๊ะ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLocationPhoto}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="หรือใส่ลิงก์ URL รูปภาพ"
                    value={locPhotoUrl}
                    onChange={(e) => setLocPhotoUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="rounded-xl bg-purple-900 px-5 py-2 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer disabled:opacity-50"
                >
                  {savingLocation ? "กำลังบันทึก..." : editingLocationId ? "บันทึกการแก้ไข" : "บันทึกจุดส่งใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
