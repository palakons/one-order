"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AutocompleteMenuItem } from "@/lib/types";
import { Sparkles, Utensils, Flame, Check } from "lucide-react";

interface DishAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectMenu: (menuName: string, price: number) => void;
  shopId?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// In-Memory Global Client-Side Cache (survives component re-renders)
const clientCache = new Map<string, { items: AutocompleteMenuItem[]; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export default function DishAutocompleteInput({
  value,
  onChange,
  onSelectMenu,
  shopId = "",
  placeholder = "เช่น ข้าวกะเพราหมูกรอบ ไข่ดาว",
  required = false,
  className = "",
  disabled = false,
  autoFocus = false,
}: DishAutocompleteInputProps) {
  const [catalog, setCatalog] = useState<AutocompleteMenuItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // Zero-Firebase-Read Client Cache Loader
  // -------------------------------------------------------------
  const loadCatalog = useCallback(async () => {
    const cacheKey = shopId || "all_shops";
    const cached = clientCache.get(cacheKey);

    // 1. Check in-memory client cache
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
      setCatalog(cached.items);
      return;
    }

    // 2. Check sessionStorage
    if (typeof window !== "undefined") {
      try {
        const sessionStored = sessionStorage.getItem(`veatec_menu_cache_${cacheKey}`);
        if (sessionStored) {
          const parsed = JSON.parse(sessionStored);
          if (parsed && Date.now() - parsed.timestamp < CLIENT_CACHE_TTL_MS) {
            clientCache.set(cacheKey, parsed);
            setCatalog(parsed.items);
            return;
          }
        }
      } catch (e) {}
    }

    // 3. Fetch from /api/menu-autocomplete once
    setIsLoadingCatalog(true);
    try {
      const url = shopId
        ? `/api/menu-autocomplete?shopId=${encodeURIComponent(shopId)}`
        : "/api/menu-autocomplete";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          const entry = { items: data.items, timestamp: Date.now() };
          clientCache.set(cacheKey, entry);
          setCatalog(data.items);

          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(`veatec_menu_cache_${cacheKey}`, JSON.stringify(entry));
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load autocomplete menu catalog:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [shopId]);

  // Pre-load catalog in background on mount
  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // -------------------------------------------------------------
  // Client-Side Instant Filtering (Triggered only after 3 chars)
  // -------------------------------------------------------------
  const query = value.trim();
  const shouldFilter = query.length >= 3;

  const filteredMatches = useMemo(() => {
    if (!shouldFilter || catalog.length === 0) return [];

    const q = query.toLowerCase();

    // Match against sanitized name or original name (strictly compartmentalized to current shop)
    const matches = catalog.filter((item) => {
      if (shopId && item.shopId !== shopId) return false;
      const nameMatch = item.name.toLowerCase().includes(q);
      const origMatch = item.originalName && item.originalName.toLowerCase().includes(q);
      return nameMatch || origMatch;
    });

    // Sort:
    // 1. Exact prefix matches first
    // 2. Higher popularity (totalQuantity then orderCount)
    matches.sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(q);
      const bPrefix = b.name.toLowerCase().startsWith(q);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      return b.totalQuantity - a.totalQuantity || b.orderCount - a.orderCount;
    });

    return matches.slice(0, 6);
  }, [query, shouldFilter, catalog, shopId]);

  // Close dropdown if query length < 3
  useEffect(() => {
    if (!shouldFilter) {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [shouldFilter]);

  // -------------------------------------------------------------
  // Click Outside Listener
  // -------------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -------------------------------------------------------------
  // Selection Handler
  // -------------------------------------------------------------
  const handleSelect = (item: AutocompleteMenuItem) => {
    onSelectMenu(item.name, item.price);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // -------------------------------------------------------------
  // Keyboard Navigation
  // -------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredMatches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? filteredMatches.length - 1 : prev - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = filteredMatches[highlightedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const nextVal = e.target.value;
            onChange(nextVal);
            // Open dropdown ONLY when user types at least 3 characters
            if (nextVal.trim().length >= 3) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }}
          onFocus={() => {
            // Keep closed on focus unless user is already typing
          }}
          onKeyDown={handleKeyDown}
          className={
            className ||
            "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1.5 focus:ring-purple-700"
          }
        />
      </div>

      {/* Floating Autocomplete Dropdown (Compact, Straight to items) */}
      {isOpen && filteredMatches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-purple-200 bg-white shadow-lg overflow-hidden animate-in fade-in duration-100">
          {/* List of Matches (Straight to the items, compact padding) */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 p-0.5">
            {filteredMatches.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const hasPopularity = item.totalQuantity > 0 || item.orderCount > 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    isHighlighted
                      ? "bg-purple-100/80 text-purple-950"
                      : "hover:bg-purple-50/60 text-slate-800"
                  }`}
                >
                  {/* Left: Dish Name & Clean Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 leading-tight">
                        {item.name}
                      </span>
                      {item.hasTypoCorrected && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <Check className="h-2 w-2" />
                          สะกดเป๊ะ
                        </span>
                      )}
                    </div>
                    {item.originalName && item.originalName !== item.name && (
                      <div className="text-[10px] text-slate-400 truncate">
                        จากคำเดิม: {item.originalName}
                      </div>
                    )}
                  </div>

                  {/* Right: Popularity & Price */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasPopularity && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                        <Flame className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                        <span>สั่ง {item.totalQuantity} ครั้ง</span>
                      </span>
                    )}
                    {item.price > 0 ? (
                      <span className="font-mono font-bold text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/80">
                        ฿{item.price}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">ตามสั่ง</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
