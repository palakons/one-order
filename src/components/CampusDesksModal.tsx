"use client";

import { useState, useEffect } from "react";
import { CAMPUS_LOCATIONS, DeliveryLocation, getLocalizedLocation, getRuntimeLocations, setRuntimeLocations } from "@/lib/locations";
import { X, Building2, CheckCircle2, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Props {
  onClose: () => void;
  selectedId?: string;
  onSelect?: (locationId: string) => void;
}

export default function CampusDesksModal({ onClose, selectedId, onSelect }: Props) {
  const { t, lang } = useLanguage();
  const [locations, setLocations] = useState<DeliveryLocation[]>(() => getRuntimeLocations());

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.locations) && data.locations.length > 0) {
          setLocations(data.locations);
          setRuntimeLocations(data.locations);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">{t.desksTitle}</h2>
              <p className="text-xs text-gray-500">
                {t.desksSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="bg-amber-50 px-4 sm:px-6 py-2 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-900">
          <Info className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            {t.desksNotice}
          </span>
        </div>

        {/* Desks Grid */}
        <div className="overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {locations.map((loc) => {
            const isSelected = selectedId === loc.id;
            const locInfo = getLocalizedLocation(loc, lang);

            return (
              <div
                key={loc.id}
                onClick={() => {
                  if (onSelect) {
                    onSelect(loc.id);
                    onClose();
                  }
                }}
                className={`group relative rounded-xl border p-3.5 transition-all overflow-hidden ${
                  onSelect ? "cursor-pointer hover:border-orange-500 hover:shadow-md" : ""
                } ${
                  isSelected
                    ? "border-orange-500 bg-orange-50/40 ring-2 ring-orange-500"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Desk Photo */}
                <div className="relative mb-2.5 h-32 w-full overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={loc.photoUrl}
                    alt={locInfo.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                    {loc.shortCode}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 rounded-full bg-orange-600 p-1 text-white shadow">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                      {locInfo.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        loc.isActive !== false
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {loc.isActive !== false ? (lang === "en" ? "Active" : lang === "cn" ? "开启" : "เปิดรับ") : (lang === "en" ? "Disabled" : lang === "cn" ? "暂未开放" : "ปิดชั่วคราว")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    <strong className="text-gray-800">{lang === "en" ? "Location:" : lang === "cn" ? "取餐位置：" : "ตำแหน่งโต๊ะ:"}</strong> {locInfo.deskDetail}
                  </p>
                </div>

                {onSelect && (
                  <button
                    type="button"
                    className="mt-2.5 w-full rounded-lg bg-gray-100 py-1.5 text-xs font-semibold text-gray-800 group-hover:bg-orange-600 group-hover:text-white transition-colors"
                  >
                    {isSelected
                      ? (lang === "en" ? "✓ Selected" : lang === "cn" ? "✓ 已选择" : "✓ เลือกจุดส่งนี้แล้ว")
                      : (lang === "en" ? "Select this pickup desk" : lang === "cn" ? "选择此取餐点" : "เลือกจุดรับอาหารนี้")}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 sm:px-6 py-2.5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            {t.closeWindow}
          </button>
        </div>
      </div>
    </div>
  );
}
