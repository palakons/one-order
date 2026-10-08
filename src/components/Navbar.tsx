"use client";

import Link from "next/link";
import { useState } from "react";
import { Utensils, MapPin, ChefHat, Sparkles } from "lucide-react";
import CampusDesksModal from "./CampusDesksModal";

export default function Navbar() {
  const [showDesks, setShowDesks] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-orange-100 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Utensils className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-gray-900">
                  One<span className="text-orange-600">Order</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                  รวมสั่งข้าว
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium hidden xs:block">ส่งถึงโต๊ะตึกเรียน</p>
            </div>
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
