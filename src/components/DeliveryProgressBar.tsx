"use client";

import { CheckCircle2, Clock, Sparkles, AlertCircle, Truck, ShoppingBag } from "lucide-react";

interface Props {
  currentAmount: number;
  targetAmount: number;
  cutoffTime: string;
  orderCount: number;
  compact?: boolean;
}

export default function DeliveryProgressBar({
  currentAmount,
  targetAmount,
  cutoffTime,
  orderCount,
  compact = false,
}: Props) {
  const percentage = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  const isUnlocked = currentAmount >= targetAmount;
  const remaining = Math.max(0, targetAmount - currentAmount);

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-gray-700">
            ยอดรวม: <strong className="text-orange-600 font-black">฿{currentAmount}</strong> / ฿{targetAmount}
          </span>
          <span className={`font-bold ${isUnlocked ? "text-emerald-600" : "text-amber-600"}`}>
            {isUnlocked ? "ส่งถึงตึกแน่นอน ✅" : `ขาดอีก ฿${remaining}`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full transition-all duration-500 ${
              isUnlocked ? "bg-emerald-500" : "bg-gradient-to-r from-amber-400 to-orange-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 transition-all shadow-xs ${
        isUnlocked
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-teal-50/50"
          : "border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50"
      }`}
    >
      {/* Top Meta */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isUnlocked
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isUnlocked ? (
              <>
                <Truck className="h-3 w-3" />
                <span>ครบยอดแล้ว! ส่งถึงตึกฟรี 🚀</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3 w-3" />
                <span>กำลังรวมออเดอร์ (เป้าหมาย ฿{targetAmount})</span>
              </>
            )}
          </span>

          <span className="text-[11px] font-semibold text-gray-600 bg-white/90 border border-gray-200 px-2 py-0.5 rounded-full">
            {orderCount} ออเดอร์
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-white/90 border border-gray-200 px-2.5 py-0.5 rounded-full">
          <Clock className="h-3 w-3 text-orange-500" />
          <span>ปิดรับ {cutoffTime} น.</span>
        </div>
      </div>

      {/* Amount and Progress Bar */}
      <div>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-gray-900">฿{currentAmount}</span>
            <span className="text-xs font-semibold text-gray-500">/ ฿{targetAmount}</span>
          </div>
          <span className="text-xs font-bold text-gray-700">{percentage}%</span>
        </div>

        {/* Progress Bar Line */}
        <div className="relative mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200/80 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isUnlocked
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs shadow-emerald-500/50"
                : "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="mt-2.5 pt-2 border-t border-gray-200/50 flex items-start gap-1.5">
        {isUnlocked ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 font-medium leading-relaxed">
              <strong>จัดส่งถึงจุดรับข้าวตึก M4!</strong> ข้าวจะนำไปส่งวางที่โต๊ะประจำตึก M4
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              <strong>ขาดอีกเพียง ฿{remaining}</strong> เพื่อส่งฟรีถึงโต๊ะตึกเรียน (ถ้าไม่ถึงยอด ร้านจะทำอาหารไว้ให้ไปรับเองที่หน้าร้าน)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
