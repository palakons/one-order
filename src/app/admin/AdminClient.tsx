"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Shop } from "@/lib/types";
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
} from "lucide-react";

interface Props {
  initialBatches: BatchWithDetails[];
  initialShops: Shop[];
}

export default function AdminClient({ initialBatches, initialShops }: Props) {
  const [activeTab, setActiveTab] = useState<"batches" | "newBatch" | "newShop">("batches");
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [loading, setLoading] = useState(false);

  // New Batch Form State
  const [selectedShopId, setSelectedShopId] = useState(initialShops[0]?.id || "");
  const [batchCutoffTime, setBatchCutoffTime] = useState("11:15");
  const [batchTargetMin, setBatchTargetMin] = useState("200");
  const [batchNotes, setBatchNotes] = useState("รอบส่งมื้อเที่ยง ส่งถึงโต๊ะรับของ V, M1-M4, Canteen, K");
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
              <ChefHat className="h-4 w-4" />
              <span>Campus Organizer & BD Hub</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-gray-900">
              One-Order Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Open daily pooled delivery batches, onboard outside local shops, and oversee kitchen manifests.
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
        <div className="flex border-b border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab("batches")}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "batches"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            All Order Pools ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab("newBatch")}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "newBatch"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            + Open Today&apos;s Batch
          </button>
          <button
            onClick={() => setActiveTab("newShop")}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "newShop"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            + Onboard Shop (BD)
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

              {/* Official Menu Photo Box */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-2">
                <label className="text-xs font-bold text-orange-950 uppercase tracking-wide block">
                  Official Shop Menu Photo URL (ภาพถ่ายป้ายเมนูจริงของร้าน)
                </label>
                <input
                  type="url"
                  placeholder="https://... (URL ภาพถ่ายป้ายเมนูจริงของร้าน)"
                  value={shopMenuImageUrl}
                  onChange={(e) => setShopMenuImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-orange-500"
                />
                <p className="text-[11px] text-gray-500">
                  💡 ลูกค้าจะเห็นภาพนี้บนหน้าสั่งอาหาร และสามารถกดขยายดูเมนูจริงและราคาปัจจุบันได้
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
      </div>
    </div>
  );
}
