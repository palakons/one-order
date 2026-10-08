"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DeliveryProgressBar from "@/components/DeliveryProgressBar";
import PromptPayQR from "@/components/PromptPayQR";
import SlipUpload from "@/components/SlipUpload";
import CampusDesksModal from "@/components/CampusDesksModal";
import { CAMPUS_LOCATIONS, getLocationById } from "@/lib/locations";
import { BatchWithDetails, OrderItem, Order } from "@/lib/types";
import { placeOrder } from "@/lib/services";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Plus,
  Minus,
  Utensils,
  MapPin,
  Clock,
  Phone,
  User,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";

import { Suspense } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

export default function OrderPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading order...</div>}>
      <OrderPageContent params={params} />
    </Suspense>
  );
}

function OrderPageContent({ params }: Props) {
  const resolvedParams = use(params);
  const batchId = resolvedParams.id;
  const router = useRouter();

  const [batch, setBatch] = useState<BatchWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [selectedLocationId, setSelectedLocationId] = useState("loc-v");
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

  const fetchBatch = async () => {
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const data = await res.json();
      if (data.success) {
        setBatch(data.batch);
      } else {
        setError(data.error || "Batch not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load batch");
    } finally {
      setLoading(false);
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
  const totalAmount = cartItemsList.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!customerPhone.trim()) {
      alert("Please enter your phone number");
      return;
    }
    if (cartItemsList.length === 0) {
      alert("Please add at least one item to your order");
      return;
    }
    if (!slipFile) {
      alert("Please upload your PromptPay transfer slip before submitting");
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
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setCompletedOrder(result.order);
      setBatch(result.batch);
    } catch (err: any) {
      alert(err.message || "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-3xl p-8 text-center text-gray-500">
          Loading order pool details...
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-xl p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Order Pool Not Found</h2>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Success view if order was submitted
  if (completedOrder) {
    const selectedLocation = getLocationById(completedOrder.locationId);

    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-gray-50">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-lg text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Payment Slip Recorded ✅
              </div>
              <h1 className="mt-2 text-2xl font-black text-gray-900">Order Successfully Placed!</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Your order is added to the batch for <strong>{batch.shop.name}</strong>.
              </p>
            </div>

            {/* Box Label Card */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left space-y-2">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                Your Box Label (ติดหน้ากล่อง)
              </div>
              <div className="rounded-xl bg-white border border-gray-200 p-3 font-mono text-xs font-bold text-gray-900">
                {completedOrder.boxLabel}
              </div>
              <div className="text-xs text-gray-600 space-y-1 pt-1">
                <div>
                  <strong>Drop-off Desk:</strong> {selectedLocation?.name} ({selectedLocation?.deskDetail})
                </div>
                <div>
                  <strong>Recipient:</strong> {completedOrder.customerName} ({completedOrder.customerPhone})
                </div>
                <div>
                  <strong>Total Paid:</strong> ฿{completedOrder.totalAmount}
                </div>
              </div>
            </div>

            {/* Live Threshold Status */}
            <div>
              <DeliveryProgressBar
                currentAmount={batch.currentTotalAmount}
                targetAmount={batch.targetMinAmount}
                cutoffTime={batch.cutoffTime}
                orderCount={batch.orderCount}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/shop/${batch.id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-800 hover:bg-gray-50"
              >
                <span>View Kitchen Manifest</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-orange-700"
              >
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedLoc = getLocationById(selectedLocationId);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-orange-600 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Pools</span>
        </Link>

        {/* Shop Header Banner */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md">
                {batch.shop.cuisine}
              </span>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-gray-900">
                {batch.shop.name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">{batch.shop.description}</p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Cutoff Time</span>
              <span className="text-xl font-black text-orange-600">{batch.cutoffTime}</span>
            </div>
          </div>

          <div className="mt-6">
            <DeliveryProgressBar
              currentAmount={batch.currentTotalAmount}
              targetAmount={batch.targetMinAmount}
              cutoffTime={batch.cutoffTime}
              orderCount={batch.orderCount}
            />
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmitOrder} className="grid gap-6 md:grid-cols-12">
          {/* Left Column: Menu Items & Cart (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            {/* Step 1: Select Dishes */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700 text-xs font-black">
                    1
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Select Dishes (เลือกเมนู)</h2>
                </div>
                <span className="text-xs text-gray-500">Pick or customize</span>
              </div>

              {/* Menu items list */}
              <div className="divide-y divide-gray-100">
                {batch.shop.menuItems.map((item) => {
                  const inCart = cart[item.id];
                  const qty = inCart ? inCart.quantity : 0;

                  return (
                    <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{item.name}</span>
                            {item.popular && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                Popular
                              </span>
                            )}
                          </div>
                          {item.nameEn && (
                            <p className="text-xs text-gray-500">{item.nameEn}</p>
                          )}
                          <div className="mt-0.5 text-xs font-bold text-orange-600">฿{item.price}</div>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2">
                          {qty > 0 && (
                            <button
                              type="button"
                              onClick={() => updateQuantity(item, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {qty > 0 && (
                            <span className="w-5 text-center text-sm font-bold text-gray-900">
                              {qty}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => updateQuantity(item, 1)}
                            className={`flex h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-bold transition-colors ${
                              qty > 0
                                ? "bg-orange-600 text-white hover:bg-orange-700"
                                : "border border-gray-200 bg-gray-50 text-gray-800 hover:bg-orange-50 hover:border-orange-300"
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {qty === 0 && <span>Add</span>}
                          </button>
                        </div>
                      </div>

                      {/* Custom note for item if added */}
                      {qty > 0 && (
                        <div className="mt-2 pl-2 border-l-2 border-orange-300">
                          <input
                            type="text"
                            placeholder="Custom notes (e.g. เผ็ดน้อย, ไข่ดาวไม่สุก)"
                            value={inCart.note}
                            onChange={(e) => updateItemNote(item.id, e.target.value)}
                            className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-800 focus:border-orange-500 focus:bg-white focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Custom / Off-menu Item Button */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                {!showCustomItem ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomItem(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Dish not in list? Add custom order item</span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-950">Add Custom Dish</span>
                      <button
                        type="button"
                        onClick={() => setShowCustomItem(false)}
                        className="text-[11px] text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Item name (ชื่อเมนู)"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="col-span-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-orange-500"
                      />
                      <input
                        type="number"
                        placeholder="Price (฿)"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-orange-500"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Special instructions (optional)"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="w-full rounded-lg bg-orange-600 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                    >
                      Add Custom Dish to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Customer Contact & Delivery Desk */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700 text-xs font-black">
                  2
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  Recipient Details (ผู้สั่ง & จุดรับอาหาร)
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Name / ชื่อเล่น
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. สมชาย (Somchai)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Mobile Phone / เบอร์โทร
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
                      Campus Drop-off Desk (จุดวางส่งอาหาร)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDeskModal(true)}
                      className="text-xs font-semibold text-orange-600 hover:underline flex items-center gap-0.5"
                    >
                      <Info className="h-3 w-3" /> View Desk Photos
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
                    <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-2.5">
                      <img
                        src={selectedLoc.photoUrl}
                        alt={selectedLoc.name}
                        className="h-12 w-14 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-bold text-gray-900">{selectedLoc.name}</div>
                        <div className="text-gray-500 line-clamp-1">{selectedLoc.deskDetail}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary, PromptPay & Slip (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            {/* Cart Summary Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-orange-600" />
                  <span>Your Order ({cartItemsList.length})</span>
                </h3>
                <span className="text-xs font-bold text-orange-600">Total: ฿{totalAmount}</span>
              </div>

              {cartItemsList.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">
                  Select dishes from the menu on the left to start.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 text-xs mb-3">
                  {cartItemsList.map(({ item, quantity, note }) => (
                    <div key={item.id} className="py-2 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800">
                          {quantity}x {item.name}
                        </div>
                        {note && <div className="text-[11px] text-gray-500 italic pl-1">↳ &quot;{note}&quot;</div>}
                      </div>
                      <span className="font-bold text-gray-900">฿{item.price * quantity}</span>
                    </div>
                  ))}

                  <div className="pt-2 flex justify-between font-black text-sm text-gray-900">
                    <span>Payable Total:</span>
                    <span className="text-orange-600">฿{totalAmount}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: PromptPay Transfer */}
            {totalAmount > 0 && (
              <div className="space-y-4">
                <PromptPayQR
                  shopName={batch.shop.name}
                  accountName={batch.shop.promptpayAccountName}
                  promptpayNumber={batch.shop.promptpayNumber}
                  amount={totalAmount}
                  qrUrl={batch.shop.promptpayQrUrl}
                />

                {/* Step 4: Upload Slip */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                  <SlipUpload
                    onFileSelect={(file) => setSlipFile(file)}
                    selectedFile={slipFile}
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || cartItemsList.length === 0 || !slipFile}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-sm font-bold text-white shadow-md hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? "Submitting Order..." : `Confirm & Submit Order (฿${totalAmount})`}
                  </button>

                  <p className="mt-2 text-center text-[11px] text-gray-400">
                    Payment is made directly to the shop. All slips are compiled in the manifest.
                  </p>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

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
