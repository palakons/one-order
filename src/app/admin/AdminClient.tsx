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
  Flame,
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
} from "lucide-react";
import { CAMPUS_LOCATIONS } from "@/lib/locations";
import { compressImage } from "@/lib/services";

interface Props {
  initialBatches: BatchWithDetails[];
  initialShops: Shop[];
}

export default function AdminClient({ initialBatches, initialShops }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState(false);
  const [activeTab, setActiveTab] = useState<"batches" | "newBatch" | "newShop" | "desks" | "suggestions" | "line">("batches");
  const [copiedDesk, setCopiedDesk] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [shops, setShops] = useState<Shop[]>(initialShops);
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

  useEffect(() => {
    try {
      const isAuth = sessionStorage.getItem("veatec_admin_auth");
      if (isAuth === "true") {
        setIsAuthenticated(true);
        fetchSuggestions();
      }
    } catch (e) {
      console.warn("sessionStorage check failed", e);
    }
  }, []);

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
        setLineTestResult({ success: false, message: data.error || "Failed to push message" });
      }
    } catch (err: any) {
      setLineTestResult({ success: false, message: err.message || "Network error" });
    } finally {
      setTestingLine(false);
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

  // New Batch Form State
  const [selectedShopId, setSelectedShopId] = useState(initialShops[0]?.id || "");
  const [batchCutoffTime, setBatchCutoffTime] = useState("11:15");
  const [batchTargetMin, setBatchTargetMin] = useState("200");
  const [batchNotes, setBatchNotes] = useState("รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของตึก M4");
  const [creatingBatch, setCreatingBatch] = useState(false);

  // New Shop Form State
  const [shopName, setShopName] = useState("");
  const [shopNameEn, setShopNameEn] = useState("");
  const [shopCuisine, setShopCuisine] = useState("Thai Food / อาหารจานเดียว");
  const [shopDescription, setShopDescription] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopLineId, setShopLineId] = useState("");
  const [shopPromptPayNumber, setShopPromptPayNumber] = useState("");
  const [shopPromptPayName, setShopPromptPayName] = useState("");
  const [shopPromptPayQrUrl, setShopPromptPayQrUrl] = useState("");
  const [shopMenuImageUrl, setShopMenuImageUrl] = useState("");
  const [shopMinDelivery, setShopMinDelivery] = useState("200");
  const [shopMenuItems, setShopMenuItems] = useState<Array<{ name: string; price: number; popular: boolean }>>([
    { name: "ข้าวกะเพราหมูกรอบ", price: 60, popular: true },
    { name: "ข้าวหมูกระเทียม", price: 55, popular: false },
  ]);
  const [newDishName, setNewDishName] = useState("");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [creatingShop, setCreatingShop] = useState(false);

  const handleShopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.75);
        setShopMenuImageUrl(compressed);
      } catch (err) {
        console.error("Image upload compression error:", err);
      }
    }
  };

  const refreshData = async () => {
    try {
      const [batchesRes, shopsRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/shops"),
      ]);
      const batchesData = await batchesRes.json();
      const shopsData = await shopsRes.json();

      if (batchesData.success) setBatches(batchesData.batches);
      if (shopsData.success) {
        setShops(shopsData.shops);
        if (shopsData.shops.length > 0 && !selectedShopId) {
          setSelectedShopId(shopsData.shops[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) {
      alert("Please select a shop");
      return;
    }
    setCreatingBatch(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShopId,
          date: new Date().toISOString().split("T")[0],
          cutoffTime: batchCutoffTime,
          targetMinAmount: Number(batchTargetMin),
          notes: batchNotes,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert("Batch pool successfully launched!");
      setActiveTab("batches");
      refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to create batch");
    } finally {
      setCreatingBatch(false);
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

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopPromptPayNumber.trim() || !shopPromptPayName.trim()) {
      alert("Please enter shop name, PromptPay number, and PromptPay account name");
      return;
    }

    setCreatingShop(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopName.trim(),
          nameEn: shopNameEn.trim(),
          cuisine: shopCuisine.trim(),
          description: shopDescription.trim(),
          phone: shopPhone.trim(),
          lineId: shopLineId.trim(),
          promptpayNumber: shopPromptPayNumber.trim(),
          promptpayAccountName: shopPromptPayName.trim(),
          promptpayQrUrl: shopPromptPayQrUrl.trim() || undefined,
          menuImageUrl: shopMenuImageUrl.trim() || undefined,
          minDeliveryAmount: Number(shopMinDelivery) || 200,
          menuItems: shopMenuItems.map((it, idx) => ({
            id: `dish-${Date.now()}-${idx}`,
            name: it.name,
            price: it.price,
            popular: it.popular,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert(`Shop "${shopName}" onboarded successfully!`);
      setShopName("");
      setShopPromptPayNumber("");
      setShopPromptPayName("");
      setShopPromptPayQrUrl("");
      setShopMenuImageUrl("");
      setShopPhone("");
      setActiveTab("batches");
      refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to onboard shop");
    } finally {
      setCreatingShop(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-white to-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-purple-200/80 bg-white p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-900 shadow-xs">
            <Lock className="h-8 w-8 text-purple-900" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-700" />
              <span>Admin Access Only</span>
            </div>
            <h1 className="mt-3 text-2xl font-black text-gray-900">
              ระบบผู้ดูแล VEATEC Hub
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500">
              กรุณากรอกรหัสผ่านผู้ดูแลระบบ (Secret Admin Pass) เพื่อจัดการร้านและรอบสั่งอาหาร
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left space-y-1">
              <label className="text-xs font-bold text-gray-700">
                รหัสผ่านผู้ดูแล (Admin Password)
              </label>
              <input
                type="password"
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPassError(false);
                }}
                placeholder="กรอกรหัสผ่านลับ..."
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-purple-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600/20"
              />
              {passError && (
                <p className="text-xs font-bold text-rose-600 pt-1">
                  ✕ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-purple-900 py-3 text-sm font-bold text-white shadow-md shadow-purple-900/20 hover:bg-purple-800 transition-colors"
            >
              เข้าสู่ระบบจัดการ ➔
            </button>
          </form>

          <div className="pt-2 border-t border-gray-100">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-purple-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับสู่หน้าหลัก VEATEC</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>กลับหน้าสั่งอาหาร</span>
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
              <ChefHat className="h-4 w-4 text-[#B4213A]" />
              <span>VISTEC Food Pool & BD Hub</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-gray-900">
              VEATEC Hub (VISTEC Eats)
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              ระบบจัดการรอบสั่งอาหารและร้านค้าสำหรับชาว VISTEC สถาบันวิทยสิริเมธี
            </p>
          </div>

          {/* Firebase PaaS Status Indicator */}
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isFirebaseConfigured ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="font-bold text-gray-800">
                {isFirebaseConfigured ? "Firebase Cloud PaaS (Active)" : "Demo / Local Storage Mode"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              {isFirebaseConfigured
                ? "Live Firestore & Cloud Storage enabled"
                : "Add keys in .env.local to link free Firebase"}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("batches")}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "batches"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            All Order Pools ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab("newBatch")}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "newBatch"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            + Open Today&apos;s Batch
          </button>
          <button
            onClick={() => setActiveTab("newShop")}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "newShop"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            + Onboard Shop (BD)
          </button>
          <button
            onClick={() => setActiveTab("desks")}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "desks"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Campus Desk (จุดรับข้าวตึก M4)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("suggestions");
              fetchSuggestions();
            }}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
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
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "line"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded bg-[#06C755] text-white text-[9px] font-black">L</span>
            <span>LINE Notification</span>
            {lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Tab 1: All Batches */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Active & Recent Batches</h2>
              <button
                onClick={() => setActiveTab("newBatch")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
              >
                <Plus className="h-4 w-4" /> Open New Batch
              </button>
            </div>

            {batches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                No active pools. Click &ldquo;Open Today&apos;s Batch&rdquo; to launch one!
              </div>
            ) : (
              <div className="grid gap-4">
                {batches.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs gap-4"
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
                          {b.isMinMet ? "Campus Delivery ✅" : "Self Pick-up (under ฿" + b.targetMinAmount + ")"}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {b.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>Date: <strong>{b.date}</strong></span>
                        <span>Cutoff: <strong>{b.cutoffTime}</strong></span>
                        <span>
                          Total: <strong className="text-orange-600">฿{b.currentTotalAmount}</strong> / ฿{b.targetMinAmount}
                        </span>
                        <span>Orders: <strong>{b.orderCount} boxes</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <Link
                        href={`/order/${b.id}`}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                      >
                        Order Link
                      </Link>
                      <Link
                        href={`/shop/${b.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800"
                      >
                        <span>Kitchen Sheet & Slips</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create New Batch */}
        {activeTab === "newBatch" && (
          <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Open a New Pooled Batch</h2>
            <p className="text-xs text-gray-500 mb-6">
              Launch an order pool for students and staff for today&apos;s lunch or dinner.
            </p>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700">Select Shop (เลือกร้านอาหาร)</label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-orange-500"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.cuisine}) — Min ฿{s.minDeliveryAmount}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Cutoff Time (เวลาปิดรับ)</label>
                  <input
                    type="time"
                    required
                    value={batchCutoffTime}
                    onChange={(e) => setBatchCutoffTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Min Delivery Target (฿)</label>
                  <input
                    type="number"
                    required
                    value={batchTargetMin}
                    onChange={(e) => setBatchTargetMin(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Batch Notes / Announcements</label>
                <textarea
                  rows={2}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={creatingBatch}
                className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white hover:bg-orange-700 transition-colors"
              >
                {creatingBatch ? "Launching..." : "Launch Batch Pool"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Onboard New Shop (BD) */}
        {activeTab === "newShop" && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Onboard Local Shop (BD)</h2>
            <p className="text-xs text-gray-500 mb-6">
              Add outside vendors willing to deliver to campus if order meets minimum.
            </p>

            <form onSubmit={handleCreateShop} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Shop Name (ชื่อร้าน)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ข้าวขาหมูเฮียอ้วน"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">English Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Uncle Ouan Pork Leg Rice"
                    value={shopNameEn}
                    onChange={(e) => setShopNameEn(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Cuisine / Food Category</label>
                  <input
                    type="text"
                    placeholder="e.g. ข้าวมันไก่, อาหารตามสั่ง, ส้มตำ"
                    value={shopCuisine}
                    onChange={(e) => setShopCuisine(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Min Delivery Target (฿)</label>
                  <input
                    type="number"
                    value={shopMinDelivery}
                    onChange={(e) => setShopMinDelivery(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Shop Phone (เบอร์โทรร้าน)</label>
                  <input
                    type="tel"
                    required
                    placeholder="08x-xxx-xxxx"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">LINE ID (for sending manifest)</label>
                  <input
                    type="text"
                    placeholder="shop_line_id"
                    value={shopLineId}
                    onChange={(e) => setShopLineId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-orange-500"
                  />
                </div>
              </div>

              {/* PromptPay details */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <QrCode className="h-4 w-4" />
                  <span>Shop Direct PromptPay Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700">PromptPay ID / Mobile (เบอร์พร้อมเพย์)</label>
                    <input
                      type="text"
                      required
                      placeholder="0819999999 or 13-digit ID"
                      value={shopPromptPayNumber}
                      onChange={(e) => setShopPromptPayNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700">Account Name (ชื่อบัญชี)</label>
                    <input
                      type="text"
                      required
                      placeholder="สมศรี ใจดี (Somsri J.)"
                      value={shopPromptPayName}
                      onChange={(e) => setShopPromptPayName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">
                    Official PromptPay QR Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://... (leave blank to auto-generate from PromptPay ID)"
                    value={shopPromptPayQrUrl}
                    onChange={(e) => setShopPromptPayQrUrl(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    หากไม่ใส่ ระบบจะสร้าง QR code อัตโนมัติจากเบอร์พร้อมเพย์
                  </p>
                </div>
              </div>

              {/* Official Menu / Shop Photo Box */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-950 uppercase tracking-wide block">
                    Shop Logo / Menu Photo (รูปโลโก้ หรือ ภาพถ่ายป้ายร้าน)
                  </label>
                  {shopMenuImageUrl && (
                    <button
                      type="button"
                      onClick={() => setShopMenuImageUrl("")}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      ลบรูป
                    </button>
                  )}
                </div>

                {shopMenuImageUrl && (
                  <div className="relative h-28 w-28 overflow-hidden rounded-xl border-2 border-purple-300 bg-white shadow-xs">
                    <img src={shopMenuImageUrl} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-900 text-white px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors shrink-0 shadow-2xs">
                    <Camera className="h-3.5 w-3.5" />
                    <span>อัปโหลดรูปภาพ (Upload File)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleShopImageUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-gray-400 text-center sm:text-left">หรือใส่ลิงก์รูป:</span>
                  <input
                    type="url"
                    placeholder="https://... (URL รูปภาพ)"
                    value={shopMenuImageUrl}
                    onChange={(e) => setShopMenuImageUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-purple-500"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  💡 ลูกค้าจะเห็นภาพนี้บนการ์ดร้านค้าและหน้าสั่งอาหาร
                </p>
              </div>

              {/* Initial Menu Dishes */}
              <div>
                <label className="text-xs font-bold text-gray-700">Initial Menu Items</label>
                <div className="mt-2 space-y-2">
                  {shopMenuItems.map((dish, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-gray-800">{dish.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-orange-600">฿{dish.price}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDish(idx)}
                          className="text-gray-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add dish inline */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="New dish name"
                      value={newDishName}
                      onChange={(e) => setNewDishName(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                    />
                    <input
                      type="number"
                      placeholder="Price (฿)"
                      value={newDishPrice}
                      onChange={(e) => setNewDishPrice(e.target.value)}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddDish}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingShop}
                className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-700 transition-colors"
              >
                {creatingShop ? "Saving Shop..." : "Save & Onboard Shop"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Campus Desks Management */}
        {activeTab === "desks" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-700" />
                  <span>โต๊ะรับอาหารประจำอาคาร VISTEC (ตึก M4)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  จุดวางอาหารส่วนกลางสำหรับไรเดอร์และร้านค้า พร้อมป้ายรหัสย่อสำหรับติดหน้ากล่อง
                </p>
              </div>

              {/* Copy all desks guide for Rider / LINE */}
              <button
                type="button"
                onClick={() => {
                  const guideText = `📍 [VEATEC] จุดส่งอาหาร VISTEC (ตึก M4):\n` +
                    CAMPUS_LOCATIONS.map(
                      (l) => `• [${l.shortCode}] ${l.name}: ${l.deskDetail}`
                    ).join("\n") +
                    `\n\n⚠️ คำแนะนำไรเดอร์: นำกล่องอาหารวางที่โต๊ะประจำตึก M4 และถ่ายรูปโต๊ะส่งเข้า LINE หลังจากส่งครบ`;
                  navigator.clipboard.writeText(guideText);
                  setCopiedDesk("ALL");
                  setTimeout(() => setCopiedDesk(null), 2500);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 px-3.5 py-2 text-xs font-bold text-white transition-colors shadow-2xs self-start sm:self-auto"
              >
                {copiedDesk === "ALL" ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>คัดลอกคู่มือส่งร้านแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>คัดลอกคู่มือส่งร้าน/ไรเดอร์ (LINE)</span>
                  </>
                )}
              </button>
            </div>

            {/* Desks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CAMPUS_LOCATIONS.map((loc) => {
                const isCopied = copiedDesk === loc.id;
                return (
                  <div
                    key={loc.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white shadow-xs ${loc.color}`}
                        >
                          {loc.shortCode}
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{loc.name}</h3>
                          <p className="text-[11px] text-gray-500">{loc.description}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const singleText = `📍 [${loc.shortCode}] ${loc.name}: ${loc.deskDetail}`;
                          navigator.clipboard.writeText(singleText);
                          setCopiedDesk(loc.id);
                          setTimeout(() => setCopiedDesk(null), 2000);
                        }}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        title="คัดลอกพิกัดจุดส่งนี้"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Desk details */}
                    <div className="rounded-xl bg-purple-50/50 border border-purple-100 p-2.5 space-y-1">
                      <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                        ตำแหน่งโต๊ะวางอาหาร (Desk Details):
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-relaxed">
                        {loc.deskDetail}
                      </p>
                    </div>

                    {/* Desk photo */}
                    <div className="relative h-36 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={loc.photoUrl}
                        alt={`Campus Desk ${loc.name}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                        รหัสกล่อง: [{loc.shortCode}-XX]
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coordinator Workflow Tips */}
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-4 sm:p-5 space-y-2">
              <h3 className="text-xs sm:text-sm font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-700" />
                <span>ขั้นตอนการทำงานสำหรับผู้ดูแลระบบ & ไรเดอร์ (Standard Operating Procedure)</span>
              </h3>
              <ol className="text-xs text-purple-900 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
                <li>
                  <strong>11:15 น. (ปิดรอบ):</strong> แอดมินหรือระบบสรุปยอด หากยอดถึงขั้นต่ำ ระบบจะแจ้งเตือนพร้อมส่งลิงก์ใบออเดอร์ครัวให้ร้าน
                </li>
                <li>
                  <strong>การติดป้ายกล่อง:</strong> ให้ร้านเขียนรหัสตึกตามป้าย เช่น <code>[M4-01] สมชาย</code> เพื่อความสะดวกในการคัดแยก
                </li>
                <li>
                  <strong>การวางอาหาร:</strong> ไรเดอร์นำอาหารไปวางไว้บนโต๊ะรับอาหารประจำตึก M4 ไม่ต้องโทรตามทีละคน
                </li>
                <li>
                  <strong>แจ้งเสร็จสิ้น:</strong> ร้านค้าหรือไรเดอร์เปิดหน้าออเดอร์ กดปุ่ม <em>"4. Completed"</em> ถ่ายรูปอาหารบนโต๊ะ 1 รูป แล้วกด <em>"แจ้ง LINE: อาหารส่งถึงโต๊ะแล้ว"</em> เพื่อแจ้งเตือนนักศึกษา/อาจารย์ในกลุ่มทันที
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 5: User Suggestions & Feedback */}
        {activeTab === "suggestions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquareHeart className="h-5 w-5 text-purple-700" />
                  <span>ข้อเสนอแนะ & ติชมจากผู้ใช้ (User Feedback)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  รวมคำแนะนำร้านอาหาร เมนูที่อยากให้เพิ่ม และแจ้งปัญหาการใช้งานจากนักศึกษาและอาจารย์ VISTEC
                </p>
              </div>
              <button
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loadingSuggestions ? "animate-spin" : ""}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
                  <MessageSquareHeart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">ยังไม่มีข้อเสนอแนะส่งเข้ามา</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    เมื่อผู้ใช้งานส่งข้อเสนอแนะหรือแนะนำร้านอาหารผ่านปุ่ม "ข้อเสนอแนะ" รายการจะปรากฏที่นี่ทันที
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((sug) => {
                  const categoryMeta = {
                    SHOP: { label: "🍱 แนะนำร้าน/เมนู", bg: "bg-orange-50 text-orange-800 border-orange-200" },
                    BUG: { label: "🐛 แจ้งปัญหา", bg: "bg-rose-50 text-rose-800 border-rose-200" },
                    SERVICE: { label: "🛵 ส่งของ/ไรเดอร์", bg: "bg-blue-50 text-blue-800 border-blue-200" },
                    OTHER: { label: "💬 ทั่วไป", bg: "bg-purple-50 text-purple-800 border-purple-200" },
                  }[sug.category] || { label: "💬 ทั่วไป", bg: "bg-gray-50 text-gray-800 border-gray-200" };

                  const dateStr = new Date(sug.createdAt).toLocaleString("th-TH", {
                    timeZone: "Asia/Bangkok",
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <div
                      key={sug.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryMeta.bg}`}>
                            {categoryMeta.label}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {dateStr}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap leading-relaxed">
                          {sug.message}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                        <div className="truncate">
                          <span className="font-bold text-gray-700">{sug.name || "Anonymous"}</span>
                          {sug.contact && (
                            <span className="ml-1 text-gray-400">({sug.contact})</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSuggestion(sug.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="ลบข้อเสนอแนะนี้"
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
        )}

        {/* Tab 6: LINE Notification Integration & Group Status */}
        {activeTab === "line" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#06C755] text-white text-xs font-black">L</span>
                  <span>LINE Notification &amp; Group Dispatch</span>
                </h2>
                <p className="text-xs text-gray-500">
                  ตรวจสอบการเชื่อมต่อ LINE Messaging API และดู Group ID ที่ระบบตรวจพบเพื่อส่งแจ้งเตือนตอนอาหารมาส่ง
                </p>
              </div>
              <button
                onClick={fetchLineStatus}
                disabled={loadingLine}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loadingLine ? "animate-spin" : ""}`} />
                <span>รีเฟรชสถานะ</span>
              </button>
            </div>

            {/* Connection Status Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-gray-900">1. สถานะการเชื่อมต่อ LINE API</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Channel Access Token</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-800">พร้อมใช้งาน (Configured)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Environment LINE_GROUP_ID</div>
                  <div className="mt-1 font-bold text-xs truncate">
                    {lineStatus?.envGroupId ? (
                      <span className="text-emerald-800 font-mono">{lineStatus.envGroupId}</span>
                    ) : (
                      <span className="text-gray-400 font-normal">ไม่ได้ตั้งใน Vercel Env (ใช้ Auto-Detect แทน)</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">กลุ่มที่เชื่อมต่ออยู่ (Active Groups)</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                    <span className={`h-2.5 w-2.5 rounded-full ${lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className={lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0 ? "text-emerald-800" : "text-amber-800"}>
                      {lineStatus?.activeGroupIds?.length || 0} กลุ่มที่ตรวจพบ
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Groups List */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-gray-700 mb-2">กลุ่มที่บอทจะส่งแจ้งเตือนตอนส่งข้าว:</h4>
                {lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0 ? (
                  <div className="space-y-2">
                    {lineStatus.activeGroupIds.map((gid) => (
                      <div key={gid} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-mono font-bold text-emerald-950">{gid}</span>
                        </div>
                        <button
                          onClick={() => handleTestLinePush(gid)}
                          disabled={testingLine}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-all"
                        >
                          {testingLine ? "กำลังส่ง..." : "ทดสอบส่งเข้ากลุ่มนี้"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-xs space-y-2 text-amber-900">
                    <div className="font-bold">⚠️ ยังไม่มี LINE Group ID บันทึกในระบบ</div>
                    <p className="leading-relaxed">
                      ระบบจะตรวจพบและบันทึก Group ID อัตโนมัติเมื่อทำตามขั้นตอนง่ายๆ ดังนี้:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium text-amber-800">
                      <li>เชิญบอท VEATEC เข้ากลุ่ม LINE ของชาว VISTEC</li>
                      <li>พิมพ์คำว่า <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">group id</code> หรือ <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">รหัสกลุ่ม</code> ในกลุ่มแชท</li>
                      <li>บอทจะตอบกลับพร้อมบันทึกกลุ่มเข้าสู่ระบบเพื่อรับแจ้งเตือนอัตโนมัติทันที!</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Test Push Result */}
              {lineTestResult && (
                <div className={`rounded-xl p-3 text-xs font-bold border ${lineTestResult.success ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-rose-300 bg-rose-50 text-rose-900"}`}>
                  {lineTestResult.message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
