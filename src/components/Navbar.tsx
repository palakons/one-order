"use client";

import Link from "next/link";
import { useState } from "react";
import { Utensils, MapPin, ChefHat, Sparkles } from "lucide-react";
import CampusDesksModal from "./CampusDesksModal";

export default function Navbar() {
  const [showDesks, setShowDesks] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  One<span className="text-orange-600">Order</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  Campus Pool
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Uni Shared Food Delivery</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowDesks(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MapPin className="h-4 w-4 text-orange-600" />
              <span>Campus Desks</span>
              <span className="hidden sm:inline text-xs text-gray-600 font-bold">(V, M1-M4, K...)</span>
            </button>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-gray-900 px-3 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-gray-800 transition-colors shadow-sm"
            >
              <ChefHat className="h-4 w-4 text-orange-400" />
              <span>BD / Shop Hub</span>
            </Link>
          </div>
        </div>
      </header>

      {showDesks && <CampusDesksModal onClose={() => setShowDesks(false)} />}
    </>
  );
}
