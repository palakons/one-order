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
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-3.5 sm:p-5 shadow-xs">
      {/* Badge */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white font-black text-[10px]">
            PP
          </span>
          <span className="text-xs font-bold text-blue-900">
            โอนจ่ายตรงเข้าร้านค้า (PromptPay)
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <ShieldCheck className="h-3 w-3" />
          ไม่ผ่านคนกลาง
        </span>
      </div>

      {/* QR Code and Transfer details card */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
        {/* QR image */}
        <div className="relative flex flex-col items-center bg-gray-50 p-2 rounded-lg border border-gray-100 shrink-0">
          <img
            src={displayQr}
            alt="PromptPay QR Code"
            className="h-36 w-36 object-contain rounded"
          />
          <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-gray-500">
            <QrCode className="h-3 w-3" />
            <span>สแกนผ่านแอปธนาคาร</span>
          </div>
        </div>

        {/* Transfer Details */}
        <div className="flex-1 w-full space-y-2.5">
          {/* Amount to pay */}
          <div className="rounded-lg bg-orange-50 border border-orange-200/90 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-orange-950">ยอดที่ต้องโอนชำระ:</span>
              <button
                type="button"
                onClick={() => copyToClipboard(String(amount), "amount")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 hover:text-orange-900 bg-white px-2 py-0.5 rounded border border-orange-200"
              >
                {copiedAmount ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedAmount ? "คัดลอกแล้ว" : "คัดลอกยอด"}</span>
              </button>
            </div>
            <div className="text-2xl font-black text-orange-600">฿{amount}</div>
          </div>

          {/* Account name */}
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">ชื่อบัญชีร้านค้า:</div>
            <div className="font-bold text-gray-900 text-xs sm:text-sm">{accountName}</div>
            <div className="text-[11px] text-gray-500">{shopName}</div>
          </div>

          {/* PromptPay Number */}
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">เบอร์พร้อมเพย์:</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono text-xs sm:text-sm font-bold text-gray-900">{promptpayNumber}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(promptpayNumber, "number")}
                className="inline-flex items-center gap-1 rounded bg-white hover:bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-700 transition-colors"
              >
                {copiedNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedNumber ? "คัดลอกแล้ว" : "คัดลอกเบอร์"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
