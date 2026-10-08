"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import DeliveryProgressBar from "@/components/DeliveryProgressBar";
import CampusDesksModal from "@/components/CampusDesksModal";
import { CAMPUS_LOCATIONS } from "@/lib/locations";
import { BatchWithDetails } from "@/lib/types";
import {
  Utensils,
  Truck,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  Phone,
  ChefHat,
  Users,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

interface Props {
  initialBatches: BatchWithDetails[];
}

export default function HomeClient({ initialBatches }: Props) {
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [showDesksModal, setShowDesksModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(fetchBatches, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-gray-50 text-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-orange-100/70 bg-gradient-to-b from-orange-100/30 via-white to-transparent py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 border border-orange-200/80 px-3.5 py-1 text-xs font-bold text-orange-800 shadow-2xs mb-4">
              <Sparkles className="h-3.5 w-3.5 text-orange-600" />
              <span>Overcoming Small Uni Canteen Limits</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900 leading-tight">
              Order together. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500">
                Hit minimums.
              </span>{" "}
              Get delivered to your desk.
            </h1>

            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              No more ฿200 minimum struggle or missing lunch because the canteen is tiny.
              Join a shared order pool, pay the shop directly via PromptPay, and get your meal dropped off at campus tables (<strong>V, M1–M4, Canteen, K</strong>).
            </p>

            {/* Quick Badges */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-700">
              <div className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Direct Shop PromptPay (Evidence compiled)</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 shadow-2xs">
                <Truck className="h-4 w-4 text-orange-600" />
                <span>Delivered to 7 Campus Buildings</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 shadow-2xs">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Zero Login Needed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-12">
        {/* Active Order Pools Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Utensils className="h-6 w-6 text-orange-600" />
                <span>Today&apos;s Active Pools</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Join an open pool before the cutoff to unlock bulk delivery to campus
              </p>
            </div>

            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
            >
              <span>+ Open New Pool</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {batches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-3 text-base font-bold text-gray-900">No pools open right now</h3>
              <p className="mt-1 text-xs text-gray-500">
                Be the first to open a lunch pool for today!
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700"
              >
                + Open a Pool in BD Hub
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div>
                    {/* Header: Shop Name & Status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                          {batch.shop.cuisine}
                        </span>
                        <h3 className="text-lg font-black text-gray-900">
                          {batch.shop.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {batch.shop.description}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${
                          batch.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {batch.status === "OPEN" ? "🟢 OPEN" : batch.status}
                      </span>
                    </div>

                    {/* Progress Bar Component */}
                    <div className="my-4">
                      <DeliveryProgressBar
                        currentAmount={batch.currentTotalAmount}
                        targetAmount={batch.targetMinAmount}
                        cutoffTime={batch.cutoffTime}
                        orderCount={batch.orderCount}
                      />
                    </div>

                    {/* Popular items teaser */}
                    <div className="rounded-xl bg-gray-50 p-3 mb-4 border border-gray-100">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Sample Menu items:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {batch.shop.menuItems.slice(0, 4).map((item) => (
                          <span
                            key={item.id}
                            className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
                          >
                            {item.name} (฿{item.price})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link
                      href={`/order/${batch.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:from-orange-700 hover:to-amber-700 transition-all hover:scale-[1.01]"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Join & Order Food</span>
                    </Link>

                    <Link
                      href={`/shop/${batch.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      title="View Kitchen Manifest & Slips"
                    >
                      <ChefHat className="h-4 w-4 text-orange-600" />
                      <span className="hidden sm:inline">Kitchen View</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Campus Delivery Desks Quick Showcase */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider">
                <Building2 className="h-4 w-4" />
                <span>Designated Campus Drop-off Desks</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                Where food gets delivered (7 Buildings)
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                All food boxes are clearly labeled with your Name, Building, and Order #.
              </p>
            </div>

            <button
              onClick={() => setShowDesksModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 px-4 py-2 text-xs sm:text-sm font-bold text-gray-800 transition-colors self-start sm:self-auto"
            >
              <span>View Desk Photos & Instructions</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {CAMPUS_LOCATIONS.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setShowDesksModal(true)}
                className="group cursor-pointer rounded-xl border border-gray-200 p-2.5 text-center hover:border-orange-500 hover:bg-orange-50/20 transition-all"
              >
                <div className="relative h-16 w-full overflow-hidden rounded-lg bg-gray-100 mb-2">
                  <img
                    src={loc.photoUrl}
                    alt={loc.name}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {loc.shortCode}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-orange-600">
                  {loc.name}
                </div>
                <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                  Lobby Table
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-4">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">
              How One-Order Works
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Frictionless pooled delivery designed for university students & faculty
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-black text-sm mb-3">
                1
              </div>
              <h4 className="font-bold text-gray-900 text-sm">Join Open Pool</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Choose today&apos;s shop, pick your favorite dishes or type custom requests. Zero login or registration required.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-black text-sm mb-3">
                2
              </div>
              <h4 className="font-bold text-gray-900 text-sm">Pay Shop Directly</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Scan the shop&apos;s PromptPay QR code and upload your transfer slip. The system compiles all evidence for the shop.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm mb-3">
                3
              </div>
              <h4 className="font-bold text-gray-900 text-sm">Hit ฿200 Minimum</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Once the pool hits ฿200, campus delivery unlocks! If under ฿200, the food is still cooked and ready for self pick-up.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-black text-sm mb-3">
                4
              </div>
              <h4 className="font-bold text-gray-900 text-sm">Grab Your Box</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Rider delivers to your building desk (V, M1-M4, K). Find your box with your order number (e.g. #03 Somchai).
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            <strong>One-Order Campus Pooling Platform</strong> · Built for university communities
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowDesksModal(true)} className="hover:text-orange-600">
              Desks Guide
            </button>
            <Link href="/admin" className="hover:text-orange-600">
              Coordinator / BD Hub
            </Link>
          </div>
        </div>
      </footer>

      {showDesksModal && <CampusDesksModal onClose={() => setShowDesksModal(false)} />}
    </div>
  );
}
