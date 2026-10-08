"use client";

import { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, Image as ImageIcon, CheckCircle, Trash2, Camera } from "lucide-react";

interface Props {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export default function SlipUpload({ onFileSelect, selectedFile }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1">
          <span>แนบสลิปโอนเงิน PromptPay</span>
          <span className="text-rose-500">*</span>
        </label>
        {selectedFile && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle className="h-3 w-3" />
            แนบสลิปแล้ว
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500 bg-emerald-50/30 p-2.5">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-2xs">
              <img
                src={previewUrl}
                alt="สลิปโอนเงิน"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedFile?.name || "สลิปโอนเงิน"}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">
                {(selectedFile ? (selectedFile.size / 1024).toFixed(0) : "0")} KB · พร้อมส่งตรวจสอบ
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  เปลี่ยนรูป
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3 w-3" />
                  ลบออก
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/70 p-4 transition-all hover:border-orange-500 hover:bg-orange-50/30 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 group-hover:scale-105 transition-transform">
            <Camera className="h-5 w-5" />
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
              กดเพื่อเลือกรูปสลิป หรือ ถ่ายรูป
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              รูปสลิปจากแอปธนาคาร (ย่อขนาดอัตโนมัติ ไม่เปลืองเน็ต)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
