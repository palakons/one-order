"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, ShoppingBag } from "lucide-react";
import CampusDesksModal from "./CampusDesksModal";
import VeatecLogo from "./VeatecLogo";

export default function Navbar() {
  const [showDesks, setShowDesks] = useState(false);

  return (
    <>
      <header className="w-full border-b border-purple-100/80 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-6">
          <Link href="/" className="flex items-center group py-1">
            <VeatecLogo size="sm" showSubtitle={true} />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 px-2.5 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-purple-700" />
              <span>ออเดอร์ของฉัน</span>
            </Link>

            <button
              onClick={() => setShowDesks(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-orange-600" />
              <span className="hidden sm:inline">จุดรับข้าว (ตึก M4)</span>
              <span className="sm:hidden">ตึก M4</span>
            </button>
          </div>
        </div>
      </header>

      {showDesks && <CampusDesksModal onClose={() => setShowDesks(false)} />}
    </>
  );
}
