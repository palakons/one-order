"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CampusDesksModal from "@/components/CampusDesksModal";
import { BatchWithDetails, BatchStatus } from "@/lib/types";
import { getLocationById } from "@/lib/locations";
import {
  ShoppingBag,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ChefHat,
  Truck,
  MapPin,
  Camera,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  X,
  Phone,
  AlertCircle,
  FileText,
  Building2,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface LocalOrder {
  orderId: string;
  batchId: string;
  shopName: string;
  date: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  locationId: string;
  totalAmount: number;
  boxLabel: string;
  slipImageUrl?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    customNote?: string;
  }>;
  createdAt?: string;
}

export default function MyOrdersClient() {
  const { t, lang } = useLanguage();
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [batches, setBatches] = useState<Record<string, BatchWithDetails>>({});
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);
  const [showDesks, setShowDesks] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load local orders from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("veatec_user_orders");
      if (stored) {
        setLocalOrders(JSON.parse(stored));
      }
      const savedPhone = localStorage.getItem("veatec_user_phone");
      if (savedPhone) {
        setSearchPhone(savedPhone);
      }
    } catch (e) {
      console.warn("Error reading local orders:", e);
    }
  }, []);

  // Poll batches to keep status & delivery photo updated
  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success && Array.isArray(data.batches)) {
        const batchMap: Record<string, BatchWithDetails> = {};
        data.batches.forEach((b: BatchWithDetails) => {
          batchMap[b.id] = b;
        });
        setBatches(batchMap);
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  // Search by phone from server batches (for multi-device access)
  const handlePhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = searchPhone.trim().replace(/\D/g, "");
    if (!cleanPhone) return;

    // Scan all fetched batches for matching customer phone
    const foundOrders: LocalOrder[] = [];
    Object.values(batches).forEach((b) => {
      b.orders.forEach((o) => {
        const orderPhoneClean = o.customerPhone.replace(/\D/g, "");
        if (orderPhoneClean === cleanPhone || orderPhoneClean.endsWith(cleanPhone) || cleanPhone.endsWith(orderPhoneClean)) {
          foundOrders.push({
            orderId: o.id,
            batchId: b.id,
            shopName: b.shop.name,
            date: b.date,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            locationId: o.locationId,
            totalAmount: o.totalAmount,
            boxLabel: o.boxLabel,
            slipImageUrl: o.slipImageUrl,
            items: o.items,
            createdAt: o.createdAt,
          });
        }
      });
    });

    if (foundOrders.length > 0) {
      // Merge with existing local orders without duplicates
      const merged = [...foundOrders];
      localOrders.forEach((lo) => {
        if (!merged.some((m) => m.orderId === lo.orderId)) {
          merged.push(lo);
        }
      });
      // Sort newest first
      merged.sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());
      setLocalOrders(merged);
      try {
        localStorage.setItem("veatec_user_orders", JSON.stringify(merged.slice(0, 30)));
        localStorage.setItem("veatec_user_phone", searchPhone.trim());
      } catch (err) {}
    } else {
      alert(`ไม่พบออเดอร์ที่ตรงกับเบอร์ ${searchPhone} ในรอบที่เปิดอยู่ขณะนี้`);
    }
  };

  // Status mapping helper
  const getStatusInfo = (status: BatchStatus = "OPEN") => {
    switch (status) {
      case "OPEN":
        return {
          step: 1,
          label: "กำลังเปิดรับออเดอร์",
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: Clock,
          subtext: "รอระบบปิดรอบเพื่อส่งครัว",
        };
      case "LOCKED":
        return {
          step: 2,
          label: "ร้านกำลังปรุงอาหาร",
          badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
          icon: ChefHat,
          subtext: "ครัวกำลังทำอาหารตามออเดอร์",
        };
      case "DELIVERING":
        return {
          step: 3,
          label: "ไรเดอร์กำลังนำส่ง",
          badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Truck,
          subtext: "กำลังเดินทางมาส่งที่จุดรับข้าว VISTEC",
        };
      case "COMPLETED":
        return {
          step: 4,
          label: "อาหารวางไว้ที่โต๊ะแล้ว 🎉",
          badgeColor: "bg-purple-100 text-purple-900 border-purple-300 font-black",
          icon: CheckCircle2,
          subtext: "อาหารมาถึงโต๊ะประจำอาคารแล้ว สามารถไปรับได้เลย!",
        };
      case "CANCELLED":
        return {
          step: 0,
          label: "ยกเลิกรอบ",
          badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
          icon: AlertCircle,
          subtext: "รอบการสั่งอาหารนี้ถูกยกเลิก",
        };
      default:
        return {
          step: 1,
          label: "รอการดำเนินการ",
          badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
          icon: Clock,
          subtext: "",
        };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <Navbar />

      <main className="mx-auto max-w-3xl px-3 sm:px-6 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-purple-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t.backToHome}</span>
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-purple-700" />
              <span>{t.myOrders}</span>
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                {localOrders.length}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {t.searchOrdersSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDesks(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
            >
              <MapPin className="h-3.5 w-3.5 text-purple-600" />
              <span>{t.dropoffLocation}</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
              title="รีเฟรชข้อมูลสถานะ"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Search by phone lookup bar */}
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/60 to-white p-3.5 sm:p-4 shadow-2xs">
          <form onSubmit={handlePhoneSearch} className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative w-full flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder={t.searchPhonePlaceholder}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-900 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 transition-colors shrink-0"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{t.searchButton}</span>
            </button>
          </form>
        </div>

        {/* Orders list */}
        {loading && localOrders.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-gray-400 text-sm">
            กำลังโหลดข้อมูลออเดอร์...
          </div>
        ) : localOrders.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 sm:p-14 text-center space-y-4 shadow-2xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">ยังไม่มีประวัติการสั่งอาหาร</h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                เมื่อคุณสั่งอาหารในระบบ VEATEC ออเดอร์ของคุณจะแสดงที่นี่โดยอัตโนมัติ ไม่ต้องสมัครสมาชิก
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-900 to-[#B4213A] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:opacity-95"
              >
                <span>เลือกสั่งอาหารวันนี้ 🍱</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {localOrders.map((ord) => {
              const liveBatch = batches[ord.batchId];
              const currentStatus: BatchStatus = liveBatch ? liveBatch.status : "OPEN";
              const statusInfo = getStatusInfo(currentStatus);
              const loc = getLocationById(ord.locationId);
              const isCompleted = currentStatus === "COMPLETED";
              const deliveryPhoto = liveBatch?.deliveryPhotoUrl;

              return (
                <div
                  key={ord.orderId}
                  className={`rounded-2xl border transition-all overflow-hidden bg-white shadow-2xs ${
                    isCompleted
                      ? "border-purple-300 ring-2 ring-purple-500/10"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Delivery Complete Top Banner */}
                  {isCompleted && (
                    <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-[#B4213A] px-4 py-2.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm font-black leading-tight">
                            อาหารมาส่งถึงโต๊ะแล้ว! กรุณามารับกล่องของคุณ 🎉
                          </p>
                          <p className="text-[11px] text-purple-200">
                            วางไว้ที่จุดรับของ {loc?.name} ({loc?.deskDetail})
                          </p>
                        </div>
                      </div>

                      {deliveryPhoto && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPhoto({
                              url: deliveryPhoto,
                              title: `หลักฐานการวางอาหาร - ร้าน ${ord.shopName}`,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm self-start sm:self-auto shrink-0 transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>ดูรูปถ่ายที่โต๊ะ</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            #{ord.orderNumber}
                          </span>
                          <h2 className="font-bold text-base text-gray-900">{ord.shopName}</h2>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>รอบวันที่: {ord.date}</span>
                          {ord.createdAt && (
                            <>
                              <span>•</span>
                              <span>
                                สั่งเมื่อ {new Date(ord.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${statusInfo.badgeColor}`}
                        >
                          <statusInfo.icon className="h-3.5 w-3.5" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Stepper (1-4) */}
                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                      <div className="grid grid-cols-4 gap-1 text-center">
                        {[
                          { step: 1, label: "1. รับออเดอร์" },
                          { step: 2, label: "2. กำลังปรุง" },
                          { step: 3, label: "3. ไรเดอร์ส่ง" },
                          { step: 4, label: "4. ถึงโต๊ะแล้ว" },
                        ].map((s) => {
                          const isDone = statusInfo.step >= s.step;
                          const isCurrent = statusInfo.step === s.step;
                          return (
                            <div key={s.step} className="flex flex-col items-center">
                              <div
                                className={`h-2 w-full rounded-full transition-colors ${
                                  isDone
                                    ? s.step === 4
                                      ? "bg-purple-700"
                                      : "bg-emerald-500"
                                    : "bg-gray-200"
                                }`}
                              />
                              <span
                                className={`mt-1.5 text-[10px] sm:text-xs font-bold leading-tight ${
                                  isCurrent
                                    ? "text-purple-900"
                                    : isDone
                                    ? "text-gray-700"
                                    : "text-gray-400"
                                }`}
                              >
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-gray-500 text-center mt-2 font-medium">
                        {statusInfo.subtext}
                      </p>
                    </div>

                    {/* Box Label Card & Pickup Desk Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Box Label */}
                      <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 space-y-1">
                        <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>ป้ายติดหน้ากล่อง (Box Label)</span>
                        </div>
                        <div className="font-mono text-xs font-black text-gray-900 bg-white px-2 py-1.5 rounded-lg border border-purple-200 break-all">
                          {ord.boxLabel || `[${loc?.shortCode || "V"}] ${ord.customerName}`}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          ร้านจะเขียนป้ายนี้บนกล่องข้าว มองหาชื่อนี้เมื่อไปรับ
                        </p>
                      </div>

                      {/* Pickup Location */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-1">
                        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-purple-700" />
                          <span>จุดรับอาหาร (Campus Desk)</span>
                        </div>
                        <div className="text-xs font-bold text-gray-900">
                          {loc?.name || ord.locationId}
                        </div>
                        <p className="text-[11px] text-gray-600 leading-tight">
                          {loc?.deskDetail || "โต๊ะวางอาหารประจำอาคาร"}
                        </p>
                      </div>
                    </div>

                    {/* Delivery Photo Thumbnail Card (If completed and has photo) */}
                    {isCompleted && deliveryPhoto && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <Camera className="h-4 w-4 text-emerald-700" />
                            <span>รูปถ่ายจุดวางอาหารจากร้านค้า</span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPhoto({
                                url: deliveryPhoto,
                                title: `หลักฐานการวางอาหาร - ร้าน ${ord.shopName}`,
                              })
                            }
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5"
                          >
                            <span>ดูรูปขยายใหญ่</span>
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                        <div
                          onClick={() =>
                            setSelectedPhoto({
                              url: deliveryPhoto,
                              title: `หลักฐานการวางอาหาร - ร้าน ${ord.shopName}`,
                            })
                          }
                          className="relative h-44 w-full rounded-lg overflow-hidden bg-gray-900 cursor-pointer group shadow-inner"
                        >
                          <img
                            src={deliveryPhoto}
                            alt="Food boxes placed on campus desk"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-95 group-hover:opacity-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                            <span className="text-[11px] text-white font-medium flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" /> แตะเพื่อดูรูปหลักฐานเต็มจอ
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ordered Items List */}
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span>รายการอาหาร ({ord.items.reduce((s, it) => s + it.quantity, 0)} กล่อง)</span>
                        <span className="text-purple-900 font-black">ยอดรวม: ฿{ord.totalAmount}</span>
                      </div>
                      <div className="space-y-1.5 bg-gray-50/60 rounded-xl p-2.5 border border-gray-100">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-start justify-between text-xs">
                            <div className="flex-1 pr-2">
                              <span className="font-semibold text-gray-800">
                                {it.name} <span className="font-bold text-purple-900">x{it.quantity}</span>
                              </span>
                              {it.customNote && (
                                <p className="text-[11px] text-amber-700 italic">
                                  หมายเหตุ: {it.customNote}
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-gray-600 shrink-0">
                              ฿{it.price * it.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>ผู้สั่ง: {ord.customerName}</span>
                        <span>•</span>
                        <span>{ord.customerPhone}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {ord.slipImageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSlip({
                                url: ord.slipImageUrl!,
                                title: `สลิปโอนเงิน - ออเดอร์ #${ord.orderNumber}`,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            <span>ดูสลิปโอนเงิน</span>
                          </button>
                        )}
                        <Link
                          href={`/order/${ord.batchId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <span>หน้าสั่งอาหาร</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox Modal: Delivery Photo Evidence */}
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

      {/* Lightbox Modal: Transfer Slip */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[92vh] max-w-md w-full rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3.5 border-b border-gray-100">
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                {selectedSlip.title}
              </h3>
              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[80vh] flex items-center justify-center bg-gray-50">
              <img
                src={selectedSlip.url}
                alt={selectedSlip.title}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Campus Desks Modal */}
      {showDesks && <CampusDesksModal onClose={() => setShowDesks(false)} />}
    </div>
  );
}
