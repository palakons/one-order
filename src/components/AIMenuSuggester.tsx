"use client";

import { useState } from "react";
import { Sparkles, X, Send, Bot, Check, Flame, AlertCircle } from "lucide-react";
import { DishRecommendation } from "@/lib/thaillm";

interface AIMenuSuggesterProps {
  shopId: string;
  shopName: string;
  onSelectDish: (dishName: string, price: number) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  hideTrigger?: boolean;
}

const PRESET_PHRASES = [
  { label: "🌶️ แซ่บๆ เผ็ดสะใจ", prompt: "อยากได้ แซ่บๆ เผ็ดๆ จัดจ้าน ถึงเครื่อง" },
  { label: "💸 ประหยัด งบจำกัด", prompt: "งบประหยัด ราคาไม่แพง คุ้มค่าเงิน" },
  { label: "🥦 คลีนๆ มีผัก", prompt: "อยากได้ มีผักด้วย เฮลตี้ คลีนๆ รสไม่จัดเกินไป" },
  { label: "🍳 โปรตีนแน่นๆ อิ่มจุก", prompt: "หิวมาก ขออิ่มๆ จุกๆ โปรตีนเน้นๆ มีไข่หรือเนื้อสัตว์เยอะๆ" },
  { label: "⚡ จานด่วน ทานง่าย", prompt: "เมนูง่ายๆ ทานคล่องคอ ไม่เลี่ยน จานเดียวอิ่มเร็ว" },
];

export default function AIMenuSuggester({
  shopId,
  shopName,
  onSelectDish,
  className = "",
  isExpanded: externalIsExpanded,
  onToggleExpand,
  hideTrigger = false,
}: AIMenuSuggesterProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalExpanded;
  const setIsExpanded = (val: boolean) => {
    if (onToggleExpand) {
      onToggleExpand(val);
    } else {
      setInternalExpanded(val);
    }
  };
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<DishRecommendation[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [justSelectedDish, setJustSelectedDish] = useState<string | null>(null);

  const handleAskAI = async (queryText?: string) => {
    const textToSubmit = (queryText !== undefined ? queryText : prompt).trim();
    if (!textToSubmit) return;

    setIsLoading(true);
    setErrorMsg(null);
    setIsRateLimited(false);

    try {
      const res = await fetch("/api/thaillm/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSubmit,
          shopId,
          shopName,
        }),
      });

      const data = await res.json();
      if (data.rateLimited) {
        setIsRateLimited(true);
        setErrorMsg(data.error || "ชน Rate Limit ของระบบ AI ชั่วคราว รบกวนรอ 3-5 วินาทีแล้วลองใหม่ครับ");
      } else if (!data.success) {
        setErrorMsg(data.error || "ขออภัย ป้า AI สับสนเล็กน้อย ลองถามใหม่อีกครั้งนะ");
      } else {
        setRecommendations(data.recommendations || []);
      }
    } catch (err: any) {
      setErrorMsg("ไม่สามารถติดต่อเซิร์ฟเวอร์ AI ได้ในขณะนี้");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickDish = (rec: DishRecommendation) => {
    setJustSelectedDish(rec.name);
    onSelectDish(rec.name, rec.price);
    setTimeout(() => {
      setIsExpanded(false);
      setJustSelectedDish(null);
    }, 450);
  };

  if (!isExpanded) {
    if (hideTrigger) return null;
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50 border border-purple-200/90 text-purple-950 text-[11px] font-bold shadow-2xs hover:shadow-xs hover:border-purple-400 hover:from-purple-100/80 transition-all cursor-pointer group active:scale-95"
          title="ให้ AI วิเคราะห์เมนูตามอารมณ์หรือความต้องการของคุณ"
        >
          <Sparkles className="h-3 w-3 text-purple-600 animate-pulse group-hover:scale-125 transition-transform shrink-0" />
          <span className="bg-gradient-to-r from-purple-900 to-indigo-900 bg-clip-text text-transparent font-black">
            คิดไม่ออกบอก AI
          </span>
          <span className="text-[10px] text-purple-600/70 font-normal hidden sm:inline">
            (สั่งตามอารมณ์ ✨)
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50/70 via-white to-white p-3 space-y-2.5 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-150 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-100 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-700 text-white shrink-0">
            <Bot className="h-3 w-3" />
          </div>
          <span className="font-bold text-xs text-purple-950 truncate">
            AI ช่วยเลือกเมนู &bull; <span className="font-normal text-purple-700">{shopName}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="ย่อเก็บ"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preset Quick Chips */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-500 block">
          แตะอารมณ์วันนี้ หรือพิมพ์ความต้องการ:
        </span>
        <div className="flex flex-wrap gap-1">
          {PRESET_PHRASES.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setPrompt(chip.prompt);
                handleAskAI(chip.prompt);
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 bg-white text-purple-900 hover:bg-purple-100 hover:border-purple-300 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAskAI();
            }
          }}
          disabled={isLoading}
          placeholder="เช่น อยากได้ แซ่บๆ ถูกๆ มีผักด้วย หรือ งบ 60"
          className="flex-1 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1.5 focus:ring-purple-700 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={isLoading || !prompt.trim()}
          onClick={() => handleAskAI()}
          className="inline-flex items-center gap-1 rounded-lg bg-purple-900 hover:bg-purple-800 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-40 shrink-0"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>คิดอยู่...</span>
            </span>
          ) : (
            <>
              <span>ถาม AI</span>
              <Send className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {/* Rate Limited Warning */}
      {isRateLimited && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && !isRateLimited && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-900 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Recommendations Result Card */}
      {recommendations.length > 0 && !isLoading && (
        <div className="space-y-1.5 pt-1 border-t border-purple-100">
          <div className="flex items-center justify-between text-[10px] font-bold text-purple-900">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-600" />
              <span>ป้า AI ขอแนะนำเมนูนี้เลย:</span>
            </span>
            <span className="text-slate-400 font-normal">แตะเพื่อใส่ชื่อและราคา</span>
          </div>

          <div className="space-y-1.5">
            {recommendations.map((rec, idx) => {
              const isSelected = justSelectedDish === rec.name;

              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-2 flex items-center justify-between gap-2 transition-all ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-50 text-emerald-950 scale-98"
                      : "border-purple-200/80 bg-white hover:border-purple-400 hover:shadow-2xs"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {rec.name}
                      </span>
                      {rec.price > 0 && (
                        <span className="font-mono font-bold text-xs text-orange-700 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200/60 shrink-0">
                          ฿{rec.price}
                        </span>
                      )}
                    </div>
                    {rec.reason && (
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        &ldquo;{rec.reason}&rdquo;
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePickDish(rec)}
                    className="inline-flex items-center gap-1 shrink-0 rounded-md bg-purple-900 hover:bg-purple-800 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs active:scale-95 cursor-pointer"
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-300" />
                        <span>เลือกแล้ว!</span>
                      </>
                    ) : (
                      <span>สั่งจานนี้ ↗</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
