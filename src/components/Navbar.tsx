"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, ChefHat } from "lucide-react";
import CampusDesksModal from "./CampusDesksModal";
import VeatecLogo from "./VeatecLogo";

export default function Navbar() {
  const [showDesks, setShowDesks] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-purple-100/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-6">
          <Link href="/" className="flex items-center group py-1">
            <VeatecLogo size="sm" showSubtitle={true} />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowDesks(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-orange-600" />
              <span>จุดรับข้าว</span>
              <span className="hidden sm:inline text-gray-400 font-normal">(7 ตึก)</span>
            </button>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              <ChefHat className="h-3.5 w-3.5 text-orange-400" />
              <span className="hidden sm:inline">ระบบร้าน/ผู้ดูแล</span>
              <span className="sm:hidden">ร้านค้า</span>
            </Link>
          </div>
        </div>
      </header>

      {showDesks && <CampusDesksModal onClose={() => setShowDesks(false)} />}
    </>
  );
}
