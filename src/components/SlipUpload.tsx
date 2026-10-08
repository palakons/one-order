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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <span>Upload Transfer Slip (สลิปโอนเงิน)</span>
          <span className="text-rose-500">*</span>
        </label>
        {selectedFile && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <CheckCircle className="h-3.5 w-3.5" />
            Slip Attached
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
        <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500 bg-emerald-50/20 p-3">
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <img
                src={previewUrl}
                alt="Transfer Slip Preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedFile?.name || "Slip uploaded"}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {(selectedFile ? (selectedFile.size / 1024).toFixed(0) : "0")} KB · Ready for verification
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-6 transition-all hover:border-orange-500 hover:bg-orange-50/20"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform">
            <Camera className="h-6 w-6" />
          </div>
          <div className="mt-3 text-center">
            <p className="text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
              Tap to take photo or choose slip
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              PNG, JPG, HEIC from mobile banking app
            </p>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs group-hover:border-orange-300">
            <UploadCloud className="h-3.5 w-3.5 text-orange-600" />
            <span>Select Slip Image</span>
          </div>
        </div>
      )}
    </div>
  );
}
