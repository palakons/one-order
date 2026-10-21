"use client";

import { useState } from "react";
import { X, ZoomIn, Maximize2, Download, Phone, Copy, Check, MessageSquare, QrCode, Info } from "lucide-react";

export type QrModalType = "promptpay" | "line";

export interface ShopQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: QrModalType;
  shop: {
    id: string;
    name: string;
    phone?: string;
    promptpayNumber?: string;
    promptpayAccountName?: string;
    promptpayQrUrl?: string;
    lineQrUrl?: string;
  };
}

export default function ShopQrModal({ isOpen, onClose, type, shop }: ShopQrModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedPromptpay, setCopiedPromptpay] = useState(false);

  if (!isOpen) return null;

  const isLine = type === "line";
  const qrUrl = isLine
    ? shop.lineQrUrl
    : shop.promptpayQrUrl || (shop.promptpayNumber ? `https://promptpay.io/${shop.promptpayNumber}.png` : "");

  if (!qrUrl) return null;

  const title = isLine ? "QR LINE ร้านค้า" : "QR พร้อมเพย์ร้าน";
  const fullScreenTitle = isLine ? `LINE QR: ${shop.name}` : `พร้อมเพย์: ${shop.promptpayAccountName || shop.name}`;
  const themeColor = isLine ? "text-[#06C755]" : "text-purple-700";
  const borderColor = isLine ? "border-emerald-200" : "border-purple-200";
  const bgBadge = isLine ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-purple-50 text-purple-900 border-purple-200";

  const handleCopyPromptpay = () => {
    if (!shop.promptpayNumber) return;
    navigator.clipboard.writeText(shop.promptpayNumber);
    setCopiedPromptpay(true);
    setTimeout(() => setCopiedPromptpay(false), 2000);
  };

  return (
    <>
      {/* 1. Standard QR Preview Modal (z-50) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
        <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl text-center space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
              {isLine ? (
                <MessageSquare className={`h-4 w-4 ${themeColor}`} />
              ) : (
                <QrCode className={`h-4 w-4 ${themeColor}`} />
              )}
              <span>{title}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* QR Image Box with Click to Enlarge */}
          <div className={`relative group mx-auto w-56 h-56 bg-white rounded-2xl border-2 ${borderColor} p-2.5 shadow-inner flex items-center justify-center`}>
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="w-full h-full relative cursor-zoom-in flex items-center justify-center rounded-xl overflow-hidden focus:outline-hidden"
              title="คลิกเพื่อดูรูป QR เต็มจอ"
            >
              <img
                src={qrUrl}
                alt={title}
                className="w-full h-full object-contain transition-transform group-hover:scale-105"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs shadow-md">
                <ZoomIn className="h-3.5 w-3.5 text-emerald-400" />
                <span>คลิกเพื่อขยายเต็มจอ</span>
              </span>
            </button>
          </div>

          {/* Explicit Enlarge Button for Desktop/Accessibility */}
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl border ${bgBadge} py-2 text-xs font-bold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>คลิกเพื่อขยายรูป QR เต็มจอ</span>
          </button>

          {/* Details */}
          <div>
            <p className="text-xs text-gray-500">{isLine ? "ร้านค้า:" : "ชื่อบัญชี:"}</p>
            <p className="text-sm font-black text-gray-900">
              {isLine ? shop.name : shop.promptpayAccountName || shop.name}
            </p>
            {!isLine && shop.promptpayNumber && (
              <p className="text-xs font-mono font-bold text-purple-900 mt-0.5">
                {shop.promptpayNumber}
              </p>
            )}
          </div>

          {/* Guideline Info Note */}
          <div className={`rounded-xl border ${borderColor} ${isLine ? "bg-emerald-50/70 text-emerald-950" : "bg-purple-50/70 text-purple-950"} p-2.5 text-xs text-left flex items-start gap-2 leading-relaxed`}>
            <Info className={`h-4 w-4 shrink-0 mt-0.5 ${themeColor}`} />
            <span>
              {isLine
                ? "สแกน QR เพื่อเพิ่มเพื่อนและติดต่อร้านค้าผ่าน LINE โดยตรง"
                : "สแกน QR เพื่อโอนเงินตรงเข้าร้านค้า ไม่ผ่านคนกลาง"}
            </span>
          </div>

          {/* Action Buttons: Save Image / Call / Copy */}
          <div className="flex flex-col gap-1.5 pt-1">
            <a
              href={qrUrl}
              download={`${isLine ? "line-qr" : "promptpay-qr"}-${shop.id}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full rounded-xl border ${bgBadge} py-2 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>บันทึกรูป QR ลงเครื่อง</span>
            </a>

            {!isLine && shop.promptpayNumber && (
              <button
                type="button"
                onClick={handleCopyPromptpay}
                className="w-full rounded-xl bg-purple-100 py-2 text-xs font-bold text-purple-900 hover:bg-purple-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedPromptpay ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-purple-700" />}
                <span>{copiedPromptpay ? "คัดลอกเลขพร้อมเพย์แล้ว" : "คัดลอกเลขพร้อมเพย์"}</span>
              </button>
            )}

            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="w-full rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="h-3.5 w-3.5 text-gray-600" />
                <span>โทรหาร้าน ({shop.phone})</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. Full-Screen Enlarged View Modal (z-[70]) */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
          <div className="relative max-h-[92vh] w-full max-w-lg rounded-3xl bg-white p-4 sm:p-5 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-sm text-gray-900 truncate max-w-[320px]">{fullScreenTitle}</h3>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 overflow-y-auto max-h-[78vh] flex items-center justify-center bg-gray-50 rounded-2xl p-2 sm:p-4">
              <img
                src={qrUrl}
                alt={fullScreenTitle}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
