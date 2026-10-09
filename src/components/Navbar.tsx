"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, ShoppingBag, MessageSquareHeart, Globe, ChevronDown } from "lucide-react";
import CampusDesksModal from "./CampusDesksModal";
import SuggestionModal from "./SuggestionModal";
import VeatecLogo from "./VeatecLogo";
import { useLanguage, Language } from "@/lib/i18n";

const LANG_OPTIONS: { code: Language; label: string; flag: string; short: string }[] = [
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭", short: "TH" },
  { code: "en", label: "English", flag: "🇬🇧", short: "EN" },
  { code: "cn", label: "简体中文", flag: "🇨🇳", short: "中" },
];

export default function Navbar() {
  const [showDesks, setShowDesks] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const currentLang = LANG_OPTIONS.find((l) => l.code === lang) || LANG_OPTIONS[0];

  return (
    <>
      <header className="w-full border-b border-purple-100/80 bg-white sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="mx-auto flex h-11 sm:h-12 max-w-5xl items-center justify-between px-2.5 sm:px-4">
          <Link href="/" className="flex items-center group shrink-0">
            <VeatecLogo size="sm" showSubtitle={false} />
          </Link>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Compact Language Dropdown Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200/90 bg-gray-50/90 px-1.5 sm:px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                title="Change language / เปลี่ยนภาษา"
                aria-expanded={showLangMenu}
              >
                <Globe className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold leading-none">{currentLang.short}</span>
                <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
              </button>

              {showLangMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLangMenu(false)}
                  />
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
                    {LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        onClick={() => {
                          setLang(opt.code);
                          setShowLangMenu(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors ${
                          lang === opt.code
                            ? "bg-purple-50 text-purple-900 font-bold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{opt.flag}</span>
                          <span>{opt.label}</span>
                        </span>
                        {lang === opt.code && (
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Suggestion / Feedback button */}
            <button
              onClick={() => setShowSuggestion(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 p-1.5 sm:px-2.5 sm:py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition-colors"
              title={t.feedbackTitle}
              aria-label={t.feedbackTitle}
            >
              <MessageSquareHeart className="h-3.5 w-3.5 text-purple-700 shrink-0" />
              <span className="hidden sm:inline">{t.suggestionShort}</span>
            </button>

            {/* My Orders */}
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 p-1.5 sm:px-2.5 sm:py-1 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors"
              title={t.myOrders}
              aria-label={t.myOrders}
            >
              <ShoppingBag className="h-3.5 w-3.5 text-purple-700 shrink-0" />
              <span className="hidden sm:inline">{t.myOrders}</span>
            </Link>

            {/* Campus Desks */}
            <button
              onClick={() => setShowDesks(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1.5 sm:px-2 sm:py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              title={t.dropoffLocation}
              aria-label={t.dropoffLocation}
            >
              <MapPin className="h-3.5 w-3.5 text-orange-600 shrink-0" />
              <span className="hidden sm:inline">{t.dropoffShort}</span>
            </button>
          </div>
        </div>
      </header>

      {showDesks && <CampusDesksModal onClose={() => setShowDesks(false)} />}
      {showSuggestion && <SuggestionModal onClose={() => setShowSuggestion(false)} />}
    </>
  );
}
