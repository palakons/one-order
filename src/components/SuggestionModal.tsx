"use client";

import { useState } from "react";
import { X, Send, Sparkles, MessageSquareHeart, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Props {
  onClose: () => void;
}

export default function SuggestionModal({ onClose }: Props) {
  const { t } = useLanguage();
  const [category, setCategory] = useState<"SHOP" | "BUG" | "SERVICE" | "OTHER">("SHOP");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("กรุณากรอกข้อความข้อเสนอแนะ");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          name: name.trim(),
          contact: contact.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งข้อเสนอแนะ");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "ไม่สามารถส่งข้อเสนอแนะได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-purple-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 sm:px-6 py-4 bg-gradient-to-r from-purple-50/60 to-pink-50/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900 shadow-2xs">
              <MessageSquareHeart className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-1.5">
                <span>{t.feedbackTitle}</span>
              </h2>
              <p className="text-xs text-gray-500 line-clamp-1">{t.feedbackSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">{t.feedbackSuccess}</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
                เราได้รับข้อความของคุณแล้ว และจะนำไปพัฒนา VEATEC ให้ตอบโจทย์ทุกคนมากยิ่งขึ้น
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-purple-900 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-purple-900/20 hover:bg-purple-800 transition-colors"
            >
              {t.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-left">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">{t.feedbackCategory}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "SHOP", label: t.categoryShop },
                  { id: "BUG", label: t.categoryBug },
                  { id: "SERVICE", label: t.categoryService },
                  { id: "OTHER", label: t.categoryOther },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={`rounded-xl border p-2.5 text-xs font-bold text-left transition-all ${
                      category === cat.id
                        ? "border-purple-600 bg-purple-50/80 text-purple-900 shadow-2xs"
                        : "border-gray-200 bg-gray-50/50 text-gray-600 hover:border-gray-300 hover:bg-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                {t.feedbackMessage} <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.feedbackPlaceholder}
                className="w-full rounded-xl border border-gray-200 p-3 text-xs sm:text-sm focus:border-purple-600 focus:outline-hidden focus:ring-2 focus:ring-purple-600/20 resize-none"
              />
            </div>

            {/* Optional Name & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">{t.feedbackName}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น Palakon (M4)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">{t.feedbackContact}</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="เบอร์โทร / LINE ID"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-purple-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-900 via-purple-800 to-[#B4213A] py-3 text-sm font-bold text-white shadow-md shadow-purple-900/20 hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {submitting ? (
                  <span>{t.feedbackSubmitting}</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{t.feedbackSubmit}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
