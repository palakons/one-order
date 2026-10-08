"use client";

import { useState } from "react";
import { QrCode, Copy, Check, Smartphone, ShieldCheck } from "lucide-react";

interface Props {
  shopName: string;
  accountName: string;
  promptpayNumber: string;
  amount: number;
  qrUrl?: string;
}

export default function PromptPayQR({
  shopName,
  accountName,
  promptpayNumber,
  amount,
  qrUrl,
}: Props) {
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${promptpayNumber}`;
  const displayQr = qrUrl || fallbackQr;

  const copyToClipboard = (text: string, type: "number" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "number") {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/60 to-white p-5 shadow-sm">
      {/* Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
            PP
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
            PromptPay Direct to Shop
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <ShieldCheck className="h-3 w-3" />
          Direct Shop Transfer
        </span>
      </div>

      <p className="text-xs text-gray-600 mb-4">
        Transfer directly to the shop. Please transfer the <strong>exact amount</strong> and upload your slip below as confirmation.
      </p>

      {/* QR Code Card */}
      <div className="flex flex-col sm:flex-row items-center gap-5 bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
        <div className="relative flex flex-col items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 shrink-0">
          <img
            src={displayQr}
            alt="PromptPay QR Code"
            className="h-44 w-44 object-contain rounded"
          />
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-gray-500">
            <QrCode className="h-3 w-3" />
            <span>Scan with any Thai Banking App</span>
          </div>
        </div>

        {/* Transfer Details */}
        <div className="flex-1 w-full space-y-3">
          {/* Amount to pay */}
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-orange-900">Exact Amount to Pay:</span>
              <button
                type="button"
                onClick={() => copyToClipboard(String(amount), "amount")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 hover:text-orange-900"
              >
                {copiedAmount ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedAmount ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="text-2xl font-black text-orange-600">฿{amount}</div>
          </div>

          {/* Account name */}
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide">Account Name (ชื่อบัญชี)</div>
            <div className="font-bold text-gray-900 text-sm">{accountName}</div>
            <div className="text-xs text-gray-600">{shopName}</div>
          </div>

          {/* PromptPay Number */}
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide">PromptPay ID / เบอร์พร้อมเพย์</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono text-sm font-bold text-gray-900">{promptpayNumber}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(promptpayNumber, "number")}
                className="inline-flex items-center gap-1 rounded bg-gray-100 hover:bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 transition-colors"
              >
                {copiedNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedNumber ? "Copied" : "Copy ID"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
