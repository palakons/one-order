"use client";

import { useEffect, useState } from "react";
import {
  Flame,
  AlertTriangle,
  Database,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { FirebaseSeverity, SystemStatus } from "@/lib/types";

export default function FirebaseStatusBadge() {
  const [status, setStatus] = useState<SystemStatus>({
    firebaseConfigured: true,
    severity: "normal",
    quotaExhausted: false,
    fallbackMode: false,
    activeStorageEngine: "firestore",
    resetTimeInfo: "ทุกวันเวลา 14:00 - 15:00 น. ICT (00:00 US Pacific Time)",
    metrics: {
      readsToday: 0,
      writesToday: 0,
      deletesToday: 0,
      maxDailyReads: 50000,
      maxDailyWrites: 20000,
      maxDailyDeletes: 20000,
      readsPercentage: 0,
      writesPercentage: 0,
      deletesPercentage: 0,
      lastResetPeriod: "",
      nextResetIso: "",
      timeUntilReset: "",
    },
    fallbackState: {
      storageFile: "src/data/store.json",
      isServerless: false,
      fileExists: true,
      fileSizeBytes: 0,
      fileSizeFormatted: "0 B",
      inMemoryLoaded: true,
      counts: {
        shops: 5,
        batches: 0,
        openBatches: 0,
        orders: 0,
        suggestions: 0,
        locations: 1,
      },
    },
  });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/system/status");
      const data = await res.json();
      if (data.success && data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      // Keep existing status
    }
  };

  // Severity configurations
  const severityConfig = {
    interrupted: {
      buttonClass:
        "border-rose-300 bg-rose-50/90 text-rose-800 hover:bg-rose-100 hover:border-rose-400",
      dotClass: "bg-rose-500",
      pingClass: "bg-rose-400",
      icon: <Flame className="h-3.5 w-3.5 text-rose-600 shrink-0" />,
      labelShort: "Fallback",
      labelFull: "Interrupted (Quota Exhausted)",
      bannerBg: "bg-rose-50 border-rose-200 text-rose-950",
      statusText: "RESOURCE_EXHAUSTED • โควตาฟรีรายวันเต็ม (สลับใช้ระบบสำรองอัตโนมัติ)",
      desc: "โควตา Cloud Firestore ฟรีรายวันเต็มชั่วคราว — ระบบสลับเข้าสู่ High-Availability Local Fallback อัตโนมัติ",
    },
    warning: {
      buttonClass:
        "border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100 hover:border-amber-400",
      dotClass: "bg-amber-500",
      pingClass: "bg-amber-400",
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />,
      labelShort: "Warning",
      labelFull: "Warning (High Load)",
      bannerBg: "bg-amber-50 border-amber-200 text-amber-950",
      statusText: "WARNING • ตรวจพบความหน่วงหรือโควตาใกล้เต็ม",
      desc: "Cloud Firestore ตอบสนองช้า หรือกำลังเข้าใกล้ขีดจำกัดโควตาประจำวัน",
    },
    normal: {
      buttonClass:
        "border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300",
      dotClass: "bg-emerald-500",
      pingClass: "bg-emerald-400",
      icon: <Database className="h-3.5 w-3.5 text-emerald-600 shrink-0" />,
      labelShort: "Cloud OK",
      labelFull: "Normal (Connected)",
      bannerBg: "bg-emerald-50 border-emerald-200 text-emerald-950",
      statusText: "ONLINE • ระบบ Cloud Firestore เชื่อมต่อสมบูรณ์",
      desc: "เชื่อมต่อฐานข้อมูล Google Cloud Firestore สำเร็จตามปกติ",
    },
  }[status.severity];

  return (
    <>
      {/* Small Icon Button next to Language Switcher */}
      <button
        type="button"
        onClick={() => {
          fetchStatus();
          setShowModal(true);
        }}
        className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border px-1.5 sm:px-2 py-1 text-xs font-bold transition-all shadow-2xs ${severityConfig.buttonClass}`}
        title={`สถานะระบบ Firebase: ${severityConfig.labelFull} (คลิกเพื่อดูรายละเอียด)`}
        aria-label="Firebase status and quota diagnostics"
      >
        <span className="relative flex h-2 w-2">
          {status.severity === "interrupted" && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${severityConfig.pingClass}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${severityConfig.dotClass}`}
          />
        </span>
        {severityConfig.icon}
        <span className="text-[11px] font-bold leading-none hidden xs:inline sm:inline">
          {severityConfig.labelShort}
        </span>
      </button>

      {/* Expanded Diagnostics Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-900 text-white font-bold">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900">
                    รายงานสถานะ Firebase & โควตาระบบ
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Google Cloud Firestore: <code className="font-mono text-purple-900 font-bold">one-order-af750</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-3.5 space-y-3.5 overflow-y-auto pr-1 text-xs text-slate-700">
              {/* Severity Status Box */}
              <div className={`rounded-xl border p-3 space-y-2 ${severityConfig.bannerBg}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">สถานะความพร้อม (Severity):</span>
                  <span className="font-mono font-black text-[11px] uppercase px-2 py-0.5 rounded border bg-white/80">
                    {status.severity === "interrupted" ? "🔴 Interrupted" : status.severity === "warning" ? "🟡 Warning" : "🟢 Normal"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-xs">{severityConfig.statusText}</span>
                  <span className="text-[11px] opacity-80">{severityConfig.desc}</span>
                </div>
              </div>

              {/* Explanations Grid */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-900">
                    1. โควตาที่เต็มคืออะไร? (What is exhausted?)
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    Google Cloud Firestore ในแพ็กเกจฟรี (Spark Tier) กำหนดโควตาสูงสุดไว้ที่:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 font-mono text-[11px]">
                    <li>Document Writes: <strong>20,000 ครั้ง/วัน</strong> (โควตานี้เต็มชั่วคราว)</li>
                    <li>Document Reads: <strong>50,000 ครั้ง/วัน</strong></li>
                    <li>Document Deletes: <strong>20,000 ครั้ง/วัน</strong></li>
                  </ul>
                  <p className="text-slate-500 text-[11px] pt-1">
                    สาเหตุเกิดจากการที่ระบบเวอร์ชันก่อนหน้ามีคำสั่ง auto-seed ข้อมูลร้านค้าและรอบสั่งซ้ำในทุกครั้งที่มีผู้เปิดหน้าเว็บ (10 writes ต่อ 1 pageview) ทำให้โควตาเขียนหมดลงชั่วคราว
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-900">
                    2. จะกลับมาใช้งานได้เมื่อไหร่? (When will it come back?)
                  </h4>
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 text-purple-950 space-y-1">
                    <p className="font-bold text-xs">
                      ⏱ เวลาการรีเซ็ตโควตาของ Google: <strong>15:00 น. (บ่ายสามโมงตรง) ทุกวัน</strong>
                    </p>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Google Cloud Firestore รีเซ็ตโควตารายวันตามเวลาเที่ยงคืนฝั่ง Pacific Time (00:00 PST / 08:00 UTC) ซึ่งตรงกับ 15:00 น. ตามเวลาประเทศไทย (ICT) เมื่อถึงเวลาดังกล่าว ระบบจะกลับมาเชื่อมต่อ Firestore โดยอัตโนมัติทันที
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-900">
                    3. การสั่งอาหารได้รับผลกระทบหรือไม่? (Current Impact)
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    <strong>ไม่ได้รับผลกระทบเลยครับ!</strong> ระบบมี Fallback Architecture อัตโนมัติ:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 text-[11px]">
                    <li>ร้านค้าทั้ง 5 ร้าน ข้อมูล และราคา อาหารยังคงแสดงครบถ้วน</li>
                    <li>สั่งอาหาร ลงชื่อ LINE ID และตรวจสลิปโอนเงิน BOT QR ได้ตามปกติ</li>
                    <li>สร้างภาพใบสรุปยาว "The One Long Manifest Image" และแชร์เข้า LINE ได้ 100%</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-900">
                    4. แนวทางแก้ไขถาวร (Permanent Solution)
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    1) <strong>ทางโค้ด:</strong> เราได้ถอดคำสั่ง Auto-seed ออกจากคำสั่งอ่านทั้งหมด และใส่ Timeout 2.0s ป้องกันการค้างเรียบร้อยแล้ว<br />
                    2) <strong>ทางบัญชี (ตัวเลือก):</strong> แอดมินสามารถเปิด{" "}
                    <a
                      href="https://console.firebase.google.com/project/one-order-af750/usage"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-700 font-bold underline inline-flex items-center gap-0.5"
                    >
                      <span>Firebase Console</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    แล้วสลับแพ็กเกจเป็น <strong>Blaze Plan (Pay as you go)</strong> ซึ่งยังคงได้รับโควตาฟรีเท่าเดิมทุกวัน แต่จะไม่ถูกตัดการเชื่อมต่อหากมีการใช้งานเกินโควตา
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0 mt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition-colors"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
