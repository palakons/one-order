"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, ShoppingBag, MessageSquareHeart } from "lucide-react";
import CampusDesksModal from "./CampusDesksModal";
import SuggestionModal from "./SuggestionModal";
import VeatecLogo from "./VeatecLogo";
import { useLanguage, Language } from "@/lib/i18n";

export default function Navbar() {
  const [showDesks, setShowDesks] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const { lang, setLang, t } = useLanguage();

  return (
    <>
      <header className="w-full border-b border-purple-100/80 bg-white sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-2.5 sm:px-6">
          <Link href="/" className="flex items-center group py-1 shrink-0">
            <VeatecLogo size="sm" showSubtitle={true} />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language Toggle: TH | EN | CN */}
            <div className="flex items-center rounded-lg border border-gray-200/90 bg-gray-50/90 p-0.5 text-[11px] font-bold text-gray-600">
              {(["th", "en", "cn"] as Language[]).map((l) => {
                const label = l === "th" ? "TH" : l === "en" ? "EN" : "中文";
                const isActive = lang === l;
                return (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-1.5 py-0.5 rounded-md transition-all ${
                      isActive
                        ? "bg-white text-purple-900 shadow-2xs font-black"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                    title={l === "th" ? "ภาษาไทย" : l === "en" ? "English" : "简体中文"}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Suggestion / Feedback button */}
            <button
              onClick={() => setShowSuggestion(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition-colors"
              title={t.feedbackTitle}
            >
              <MessageSquareHeart className="h-3.5 w-3.5 text-purple-700 shrink-0" />
              <span className="hidden md:inline">{t.suggestion}</span>
              <span className="md:hidden hidden sm:inline">{t.suggestionShort}</span>
            </button>

            {/* My Orders */}
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-purple-700 shrink-0" />
              <span className="hidden sm:inline">{t.myOrders}</span>
            </Link>

            {/* Campus Desks */}
            <button
              onClick={() => setShowDesks(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-orange-600 shrink-0" />
              <span className="hidden sm:inline">{t.dropoffLocation}</span>
              <span className="sm:hidden">{t.dropoffShort}</span>
            </button>
          </div>
        </div>
      </header>

      {showDesks && <CampusDesksModal onClose={() => setShowDesks(false)} />}
      {showSuggestion && <SuggestionModal onClose={() => setShowSuggestion(false)} />}
    </>
  );
}
