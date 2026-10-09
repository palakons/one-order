"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DeliveryProgressBar from "@/components/DeliveryProgressBar";
import PromptPayQR from "@/components/PromptPayQR";
import SlipUpload from "@/components/SlipUpload";
import CampusDesksModal from "@/components/CampusDesksModal";
import { CAMPUS_LOCATIONS, getLocationById } from "@/lib/locations";
import { BatchWithDetails, Order } from "@/lib/types";
import { placeOrder } from "@/lib/services";
import confetti from "canvas-confetti";
import { useLanguage, getShopLocalizedInfo, getMenuItemLocalizedName } from "@/lib/i18n";
import {
  ArrowLeft,
  Plus,
  Minus,
  MapPin,
  Clock,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info,
  ZoomIn,
  Eye,
  X,
  Image as ImageIcon,
  Check,
  CreditCard,
  FileCheck2,
} from "lucide-react";

interface Props {
  batchId: string;
  initialBatch: BatchWithDetails | null;
}

export default function OrderPageClient({ batchId, initialBatch }: Props) {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [batch, setBatch] = useState<BatchWithDetails | null>(initialBatch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenuPhotoModal, setShowMenuPhotoModal] = useState(false);

  // 1-2-3 Step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Cart state: item ID -> quantity
  const [cart, setCart] = useState<Record<string, { item: any; quantity: number; note: string }>>({});

  // Custom item state
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customNote, setCustomNote] = useState("");

  // Customer state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("loc-m4");
  const [showDeskModal, setShowDeskModal] = useState(false);

  // Slip file
  const [slipFile, setSlipFile] = useState<File | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchBatch();
    const interval = setInterval(fetchBatch, 4000);
    return () => clearInterval(interval);
  }, [batchId]);

  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("veatec_user_phone");
      const savedName = localStorage.getItem("veatec_user_name");
      if (savedPhone) setCustomerPhone(savedPhone);
      if (savedName) setCustomerName(savedName);
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchBatch = async () => {
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const data = await res.json();
      if (data.success) {
        setBatch(data.batch);
      } else {
        if (!batch) setError(data.error || "ไม่พบข้อมูลรอบสั่งอาหาร");
      }
    } catch (err: any) {
      if (!batch) setError(err.message || "ไม่สามารถโหลดข้อมูลรอบสั่งอาหารได้");
    }
  };

  const updateQuantity = (item: any, delta: number) => {
    setCart((prev) => {
      const current = prev[item.id] || { item, quantity: 0, note: "" };
      const newQty = Math.max(0, current.quantity + delta);
      if (newQty === 0) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return {
        ...prev,
        [item.id]: { ...current, quantity: newQty },
      };
    });
  };

  const updateItemNote = (itemId: string, note: string) => {
    setCart((prev) => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: { ...prev[itemId], note },
      };
    });
  };

  const handleAddCustomItem = () => {
    if (!customName.trim() || !customPrice || Number(customPrice) <= 0) return;
    const customId = `custom-${Date.now()}`;
    const customItemObj = {
      id: customId,
      name: customName.trim(),
      price: Number(customPrice),
    };
    setCart((prev) => ({
      ...prev,
      [customId]: {
        item: customItemObj,
        quantity: 1,
        note: customNote.trim(),
      },
    }));
    setCustomName("");
    setCustomPrice("");
    setCustomNote("");
    setShowCustomItem(false);
  };

  // Calculate Cart Total
  const cartItemsList = Object.values(cart);
  const totalQuantity = cartItemsList.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalAmount = cartItemsList.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("กรุณากรอกชื่อผู้รับอาหาร (เช่น ชื่อเล่น หรือ นศ.)");
      setCurrentStep(3);
      return;
    }
    if (!customerPhone.trim()) {
      alert("กรุณากรอกเบอร์โทรติดต่อ");
      setCurrentStep(3);
      return;
    }
    if (cartItemsList.length === 0) {
      alert("กรุณาเลือกอาหารอย่างน้อย 1 รายการ");
      setCurrentStep(1);
      return;
    }
    if (!slipFile) {
      alert("กรุณาแนบรูปสลิปโอนเงิน PromptPay เพื่อยืนยันออเดอร์");
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const formattedItems = cartItemsList.map((entry) => ({
        name: entry.item.name,
        price: entry.item.price,
        quantity: entry.quantity,
        customNote: entry.note || undefined,
      }));

      const result = await placeOrder({
        batchId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        locationId: selectedLocationId,
        items: formattedItems,
        totalAmount,
        slipFile,
      });

      // Confetti burst!
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });

      // Save order to localStorage for zero-login tracking
      try {
        const savedOrders = JSON.parse(localStorage.getItem("veatec_user_orders") || "[]");
        savedOrders.unshift({
          orderId: result.order.id,
          batchId: result.batch.id,
          shopName: result.batch.shop.name,
          date: result.batch.date,
          orderNumber: result.order.orderNumber,
          customerName: result.order.customerName,
          customerPhone: result.order.customerPhone,
          locationId: result.order.locationId,
          totalAmount: result.order.totalAmount,
          boxLabel: result.order.boxLabel,
          slipImageUrl: result.order.slipImageUrl,
          items: result.order.items,
          createdAt: result.order.createdAt,
        });
        localStorage.setItem("veatec_user_orders", JSON.stringify(savedOrders.slice(0, 30)));
        localStorage.setItem("veatec_user_phone", customerPhone.trim());
        localStorage.setItem("veatec_user_name", customerName.trim());
      } catch (e) {
        console.warn("Could not save to localStorage", e);
      }

      setCompletedOrder(result.order);
      setBatch(result.batch);
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการส่งออเดอร์");
    } finally {
      setSubmitting(false);
    }
  };

  if (!batch) {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="mx-auto max-w-xl p-8 text-center text-gray-500">
            กำลังโหลดข้อมูลรอบสั่งอาหาร...
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-xl p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
          <h2 className="text-xl font-bold text-gray-900">ไม่พบรอบสั่งอาหารนี้</h2>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Order Success Screen (เมื่อสั่งสำเร็จ)
  // -------------------------------------------------------------
  if (completedOrder) {
    const selectedLocation = getLocationById(completedOrder.locationId);

    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-gray-50">
        <Navbar />
        <div className="mx-auto max-w-lg px-3 py-8 sm:px-6">
          <div className="rounded-3xl border border-emerald-200 bg-white p-5 sm:p-7 shadow-lg text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                แนบสลิป & บันทึกออเดอร์แล้ว ✓
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black text-gray-900">
                สั่งอาหารเรียบร้อยแล้ว! 🎉
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                ออเดอร์ของคุณถูกส่งไปยังร้าน <strong>{batch.shop.name}</strong> แล้ว
              </p>
            </div>

            {/* Box Label Card */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-left space-y-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                ป้ายติดหน้ากล่องอาหาร (Box Label):
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-2.5 font-mono text-xs font-bold text-gray-900">
                {completedOrder.boxLabel}
              </div>
              <div className="text-xs text-gray-700 space-y-1 pt-1">
                <div>
                  <strong>โต๊ะจุดรับข้าว:</strong> {selectedLocation?.name} ({selectedLocation?.deskDetail})
                </div>
                <div>
                  <strong>ผู้สั่ง:</strong> {completedOrder.customerName} ({completedOrder.customerPhone})
                </div>
                <div>
                  <strong>ยอดที่โอน:</strong> <span className="text-orange-600 font-bold">฿{completedOrder.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Threshold Progress */}
            <div>
              <DeliveryProgressBar
                currentAmount={batch.currentTotalAmount}
                targetAmount={batch.targetMinAmount}
                cutoffTime={batch.cutoffTime}
                orderCount={batch.orderCount}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link
                href="/orders"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>ติดตามใน "ออเดอร์ของฉัน"</span>
              </Link>
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-800 hover:bg-gray-50 shadow-2xs"
              >
                <span>กลับหน้าหลัก</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedLoc = getLocationById(selectedLocationId);
  const shopInfo = getShopLocalizedInfo(batch.shop, lang);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-28 sm:pb-16">
      <Navbar />

      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-orange-600 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t.backToHome}</span>
        </Link>

        {/* Shop Header Banner */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs mb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/80 rounded px-1.5 py-0.5">
                {shopInfo.cuisine}
              </span>
              <h1 className="mt-1 text-lg sm:text-2xl font-black text-gray-900">
                {shopInfo.name}
              </h1>
              <p className="text-xs text-gray-500 line-clamp-1">{shopInfo.description}</p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] text-gray-500 font-semibold">{t.cutoffAt}</div>
              <div className="text-base sm:text-lg font-black text-orange-600">{batch.cutoffTime} น.</div>
            </div>
          </div>

          <div className="mt-3">
            <DeliveryProgressBar
              currentAmount={batch.currentTotalAmount}
              targetAmount={batch.targetMinAmount}
              cutoffTime={batch.cutoffTime}
              orderCount={batch.orderCount}
              compact
            />
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* 1 - 2 - 3 Step Indicator Navigation Tabs */}
        {/* ----------------------------------------------------------- */}
        <div className="sticky top-14 z-30 mb-4 bg-gray-50/95 py-1.5 backdrop-blur-md">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-gray-200 bg-white p-1 shadow-xs">
            {/* Step 1 Tab */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                currentStep === 1
                  ? "bg-[#5D3085] text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-black ${
                currentStep === 1 ? "bg-white text-[#5D3085]" : "bg-gray-200 text-gray-700"
              }`}>
                1
              </span>
              <span>{t.step1}</span>
              {totalQuantity > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  currentStep === 1 ? "bg-[#472266] text-white" : "bg-purple-100 text-[#5D3085]"
                }`}>
                  {totalQuantity}
                </span>
              )}
            </button>

            {/* Step 2 Tab */}
            <button
              type="button"
              onClick={() => {
                if (cartItemsList.length === 0) {
                  alert("กรุณาเลือกอาหารก่อนไปขั้นตอนชำระเงิน");
                  return;
                }
                setCurrentStep(2);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                currentStep === 2
                  ? "bg-[#B4213A] text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-black ${
                currentStep === 2 ? "bg-white text-[#B4213A]" : "bg-gray-200 text-gray-700"
              }`}>
                2
              </span>
              <span>สแกนจ่าย</span>
              {totalAmount > 0 && (
                <span className="text-[10px] font-bold opacity-90 hidden xs:inline">
                  (฿{totalAmount})
                </span>
              )}
            </button>

            {/* Step 3 Tab */}
            <button
              type="button"
              onClick={() => {
                if (cartItemsList.length === 0) {
                  alert("กรุณาเลือกอาหารก่อนไปขั้นตอนแนบสลิป");
                  return;
                }
                setCurrentStep(3);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                currentStep === 3
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-black ${
                currentStep === 3 ? "bg-white text-emerald-600" : "bg-gray-200 text-gray-700"
              }`}>
                3
              </span>
              <span>จุดส่ง & สลิป</span>
              {slipFile && (
                <Check className={`h-3 w-3 ${currentStep === 3 ? "text-white" : "text-emerald-600"}`} />
              )}
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* Form Container */}
        {/* ----------------------------------------------------------- */}
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {/* ========================================================= */}
          {/* STEP 1: เลือกร้าน & เมนูอาหาร */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Menu Photo Quick Trigger */}
              {batch.shop.menuImageUrl && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-orange-600 shrink-0" />
                    <span className="text-xs font-bold text-orange-950">
                      มีภาพใบเมนูทางการของร้าน
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMenuPhotoModal(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-orange-300 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-100/50 shadow-2xs shrink-0"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                    <span>ดูรูปใบเมนูร้าน</span>
                  </button>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  💡 เมนูด้านล่างสรุปเพื่อความสะดวกในการกดสั่ง อ้างอิงรายการและราคาตามรูปป้ายเมนูจริงของร้าน
                </span>
              </div>

              {/* Menu items card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                    <span>รายการอาหารแนะนำ</span>
                  </h2>
                  <span className="text-xs font-semibold text-gray-500">
                    เลือกกดบวก [+] เพิ่มลงตะกร้า
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {batch.shop.menuItems.map((item) => {
                    const inCart = cart[item.id];
                    const qty = inCart ? inCart.quantity : 0;

                    return (
                      <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-gray-900">
                                {getMenuItemLocalizedName(item, lang)}
                              </span>
                              {item.popular && (
                                <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 shrink-0">
                                  {lang === "en" ? "Popular" : lang === "cn" ? "热销" : "นิยม"}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-orange-600 mt-0.5">
                              ฿{item.price}
                            </div>
                          </div>

                          {/* Plus / Minus Counter Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {qty > 0 && (
                              <button
                                type="button"
                                onClick={() => updateQuantity(item, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                            )}
                            {qty > 0 && (
                              <span className="w-5 text-center text-xs font-bold text-gray-900">
                                {qty}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => updateQuantity(item, 1)}
                              className={`flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold transition-all active:scale-95 ${
                                qty > 0
                                  ? "bg-orange-600 text-white hover:bg-orange-700"
                                  : "border border-gray-200 bg-gray-50 text-gray-800 hover:bg-orange-50 hover:border-orange-300"
                              }`}
                            >
                              <Plus className="h-3 w-3" />
                              {qty === 0 && <span>สั่ง</span>}
                            </button>
                          </div>
                        </div>

                        {/* Note field if in cart */}
                        {qty > 0 && (
                          <div className="mt-1.5 pl-2 border-l-2 border-orange-400">
                            <input
                              type="text"
                              placeholder="ระบุเพิ่มเติม (เช่น เผ็ดน้อย, ไม่ใส่ผัก, ไข่ดาวไม่สุก)"
                              value={inCart.note}
                              onChange={(e) => updateItemNote(item.id, e.target.value)}
                              className="w-full rounded-md border border-gray-200 bg-gray-50/80 px-2 py-1 text-xs text-gray-800 focus:border-orange-500 focus:bg-white focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom Item Trigger */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  {!showCustomItem ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomItem(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>สั่งเมนูอื่นนอกรายการ (ตามรูปใบเมนู)</span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-950">ระบุเมนูพิเศษนอกรายการ:</span>
                        <button
                          type="button"
                          onClick={() => setShowCustomItem(false)}
                          className="text-[11px] text-gray-500 hover:text-gray-700"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="ชื่อเมนู"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="col-span-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-orange-500"
                        />
                        <input
                          type="number"
                          placeholder="ราคา (฿)"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-orange-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-orange-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="w-full rounded-lg bg-orange-600 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                      >
                        เพิ่มเมนูพิเศษลงตะกร้า
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 1 Next Button */}
              {cartItemsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full rounded-xl bg-gradient-to-r from-[#5D3085] to-[#B4213A] py-3 text-sm font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <span>ไปขั้นตอนที่ 2: สแกนจ่ายเงิน (฿{totalAmount})</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: สแกนจ่ายเงิน PromptPay */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Order summary pill */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-2">
                  <span>รายการที่เลือก ({totalQuantity} กล่อง)</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-orange-600 hover:underline"
                  >
                    แก้ไขเมนู
                  </button>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  {cartItemsList.map(({ item, quantity, note }) => (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        {quantity}x {getMenuItemLocalizedName(item, lang)}
                        {note && <span className="text-gray-500 text-[11px] ml-1">({note})</span>}
                      </div>
                      <div className="font-bold">฿{item.price * quantity}</div>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-gray-100 flex justify-between font-black text-sm text-gray-900">
                    <span>ยอดที่ต้องชำระ:</span>
                    <span className="text-orange-600 font-black text-base">฿{totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* PromptPay QR Component */}
              <PromptPayQR
                shopName={batch.shop.name}
                accountName={batch.shop.promptpayAccountName}
                promptpayNumber={batch.shop.promptpayNumber}
                amount={totalAmount}
                qrUrl={batch.shop.promptpayQrUrl}
                phone={batch.shop.phone}
              />

              {/* Next Step Button */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  ← กลับไปแก้เมนู
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  <span>โอนแล้ว ไปขั้นตอนที่ 3: แนบสลิป & เลือกจุดส่ง</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: จุดรับอาหาร & แนบสลิปยืนยัน */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Recipient Details */}
              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <User className="h-4 w-4 text-orange-600" />
                  <span>ข้อมูลผู้สั่งอาหาร</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <span>ชื่อเล่น / ชื่อผู้สั่ง</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น น้องพลอย, ต้น นศ."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <span>เบอร์โทรศัพท์</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="081-xxx-xxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Building Drop-off Desk Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-orange-600" />
                      <span>เลือกโต๊ะจุดรับข้าวประจำตึก</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDeskModal(true)}
                      className="text-xs font-semibold text-orange-600 hover:underline flex items-center gap-0.5"
                    >
                      <Info className="h-3 w-3" /> ดูรูปโต๊ะตึก M4
                    </button>
                  </div>

                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:border-orange-500 focus:outline-none"
                  >
                    {CAMPUS_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} — {loc.deskDetail}
                      </option>
                    ))}
                  </select>

                  {/* Desk quick preview */}
                  {selectedLoc && (
                    <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50/80 p-2">
                      <img
                        src={selectedLoc.photoUrl}
                        alt={selectedLoc.name}
                        className="h-10 w-12 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-bold text-gray-900">{selectedLoc.name}</div>
                        <div className="text-gray-500 line-clamp-1 text-[11px]">{selectedLoc.deskDetail}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Slip Upload Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-5 shadow-xs">
                <SlipUpload
                  onFileSelect={(file) => setSlipFile(file)}
                  selectedFile={slipFile}
                />

                {/* Final Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || cartItemsList.length === 0 || !slipFile}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm sm:text-base font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {submitting ? "กำลังส่งออเดอร์..." : `✓ ยืนยันสั่งข้าว (ยอดชำระ ฿${totalAmount})`}
                </button>

                <p className="mt-2 text-center text-[11px] text-gray-400">
                  โอนเงินตรงเข้าร้านค้า ไม่ผ่านคนกลาง รายการสลิปจะรวบรวมส่งร้านค้าทันที
                </p>
              </div>

              {/* Back to Step 2 */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
              >
                ← ย้อนกลับไปดู QR Code ชำระเงิน (ขั้นตอนที่ 2)
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Sticky Bottom Action Bar for Mobile */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur-md shadow-lg sm:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-gray-500 font-medium">ยอดชำระรวม:</div>
            <div className="text-lg font-black text-orange-600 leading-tight">
              ฿{totalAmount}
              <span className="text-xs font-normal text-gray-500 ml-1">({totalQuantity} กล่อง)</span>
            </div>
          </div>

          {currentStep === 1 ? (
            <button
              type="button"
              disabled={cartItemsList.length === 0}
              onClick={() => setCurrentStep(2)}
              className="rounded-xl bg-gradient-to-r from-[#5D3085] to-[#B4213A] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 disabled:opacity-40"
            >
              ไปสแกนจ่าย ➔
            </button>
          ) : currentStep === 2 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              ไปแนบสลิป ➔
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !slipFile || !customerName.trim() || !customerPhone.trim()}
              onClick={handleSubmitOrder}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40"
            >
              {submitting ? "กำลังส่ง..." : "ยืนยันสั่งข้าว ✓"}
            </button>
          )}
        </div>
      </div>

      {/* High-Res Full Menu Photo Lightbox Modal */}
      {showMenuPhotoModal && batch.shop.menuImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[92vh] max-w-3xl w-full rounded-2xl bg-white p-3 sm:p-4 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900">
                    {batch.shop.name} — ภาพใบเมนูทางการของร้าน
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    ยึดรายการและราคาจริงตามภาพนี้เป็นหลัก
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMenuPhotoModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 overflow-y-auto max-h-[75vh] flex items-center justify-center bg-gray-900/5 rounded-xl p-2">
              <img
                src={batch.shop.menuImageUrl}
                alt="Full Shop Menu"
                className="max-h-[72vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>สามารถซูมดูรายละเอียดบนมือถือได้</span>
              <button
                type="button"
                onClick={() => setShowMenuPhotoModal(false)}
                className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-bold text-white hover:bg-gray-800"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeskModal && (
        <CampusDesksModal
          selectedId={selectedLocationId}
          onSelect={(id) => setSelectedLocationId(id)}
          onClose={() => setShowDeskModal(false)}
        />
      )}
    </div>
  );
}
