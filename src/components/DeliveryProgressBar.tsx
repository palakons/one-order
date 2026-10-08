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
            Pool: <strong className="text-orange-600">฿{currentAmount}</strong> / ฿{targetAmount}
          </span>
          <span className={`font-bold ${isUnlocked ? "text-emerald-600" : "text-amber-600"}`}>
            {isUnlocked ? "Delivered to Uni ✅" : `฿${remaining} to unlock`}
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
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all shadow-sm ${
        isUnlocked
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50/70 to-teal-50/40"
          : "border-amber-200 bg-gradient-to-br from-amber-50/70 to-orange-50/40"
      }`}
    >
      {/* Top Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              isUnlocked
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isUnlocked ? (
              <>
                <Truck className="h-3.5 w-3.5" />
                <span>CAMPUS DELIVERY UNLOCKED</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>POOL IN PROGRESS (฿{targetAmount} MIN)</span>
              </>
            )}
          </span>

          <span className="text-xs font-semibold text-gray-600 bg-white/80 border border-gray-200 px-2.5 py-1 rounded-full">
            {orderCount} {orderCount === 1 ? "order" : "orders"} placed
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white/80 border border-gray-200 px-3 py-1 rounded-full shadow-xs">
          <Clock className="h-3.5 w-3.5 text-orange-500" />
          <span>Cutoff: {cutoffTime}</span>
        </div>
      </div>

      {/* Amount and Progress Bar */}
      <div className="mb-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900">฿{currentAmount}</span>
            <span className="text-sm font-semibold text-gray-500">/ ฿{targetAmount} target</span>
          </div>
          <span className="text-sm font-bold text-gray-700">{percentage}%</span>
        </div>

        {/* Progress Bar Line */}
        <div className="relative mt-2 h-3.5 w-full overflow-hidden rounded-full bg-gray-200/80 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isUnlocked
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/50"
                : "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-start gap-2">
        {isUnlocked ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 font-medium">
              <strong>Delivering directly to campus desks!</strong> Order now and your meal will be brought to your building lobby (V, M1-M4, Canteen, K).
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              <strong>฿{remaining} more needed</strong> to trigger free campus delivery. If minimum isn&apos;t reached by {cutoffTime}, meals are prepared for <u>self pick-up at shop</u>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
