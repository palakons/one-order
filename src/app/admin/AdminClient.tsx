"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BatchWithDetails,
  Shop,
  Suggestion,
  SystemStatus,
  QuotaMetrics,
  StorageMetrics,
  SanitizedMenuItem,
} from "@/lib/types";
import { formatCutoffDisplay } from "@/lib/utils";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  ChefHat,
  Plus,
  ArrowRight,
  Store,
  Clock,
  Phone,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  MapPin,
  Building2,
  Copy,
  Check,
  Camera,
  Lock,
  LogOut,
  ArrowLeft,
  MessageSquareHeart,
  RefreshCw,
  AlertTriangle,
  Database,
  Edit,
  Send,
  X,
  Upload,
  HardDrive,
  FileJson,
  Download,
  Activity,
  Server,
  ChevronDown,
  Maximize2,
  ShoppingBag,
  Info,
  Package,
  Search,
  Filter,
  Calendar,
  DollarSign,
  ListOrdered,
  Eye,
  Bot,
} from "lucide-react";
import { CAMPUS_LOCATIONS, DeliveryLocation } from "@/lib/locations";
import { compressImage } from "@/lib/services";
import { DAYS_OF_WEEK, formatOpenDaysText } from "@/lib/shop-utils";

interface Props {
  initialBatches: BatchWithDetails[];
  initialShops: Shop[];
  initialLocations?: DeliveryLocation[];
  initialSystemStatus?: SystemStatus;
}

function getDeterministicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

function useAverageColor(imageUrl?: string, fallbackSeed?: string, explicitColor?: string) {
  const [color, setColor] = useState<string | null>(explicitColor || null);

  useEffect(() => {
    if (explicitColor) {
      setColor(explicitColor);
      return;
    }
    if (!imageUrl) {
      setColor(fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          if (isMounted) {
            setColor(`rgb(${r}, ${g}, ${b})`);
          }
        }
      } catch {
        if (isMounted) {
          setColor(fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
        }
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setColor(fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallbackSeed, explicitColor]);

  return color || (fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
}

interface ShopAdminCardProps {
  shop: Shop;
  onEdit: (shop: Shop) => void;
  onDelete: (id: string, name: string) => void;
  onZoomQr: (data: { url: string; title: string; number?: string; accountName?: string }) => void;
}

function ShopAdminCard({ shop, onEdit, onDelete, onZoomQr }: ShopAdminCardProps) {
  const accentColor = useAverageColor(shop.menuImageUrl, shop.name + shop.cuisine, shop.accentColor);
  const qrUrl =
    shop.promptpayQrUrl ||
    (shop.promptpayNumber ? `https://promptpay.io/${shop.promptpayNumber.replace(/\D/g, "")}.png` : null);
  const isActive = shop.isActive !== false;
  const daysText = formatOpenDaysText(shop.openDays);

  return (
    <div
      className="relative rounded-2xl bg-white p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 border overflow-hidden"
      style={{
        borderColor: accentColor ? `${accentColor}35` : "#e2e8f0",
      }}
    >
      {/* Top accent ribbon using average logo color */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: accentColor }}
      />

      <div className="space-y-3 pt-1">
        {/* Shop Image & Header */}
        <div className="flex items-start gap-3">
          <div
            className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 border"
            style={{
              backgroundColor: `${accentColor}12`,
              borderColor: `${accentColor}30`,
            }}
          >
            {shop.menuImageUrl ? (
              <img
                src={shop.menuImageUrl}
                alt={shop.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ color: accentColor }}
              >
                <Store className="h-7 w-7" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-black text-sm text-gray-900 truncate" title={shop.name}>
              {shop.name}
            </h3>
            {shop.nameEn && (
              <p className="text-[11px] text-gray-500 truncate">{shop.nameEn}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span
                className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold border"
                style={{
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                  borderColor: `${accentColor}35`,
                }}
              >
                {shop.cuisine || "อาหารจานเดียว"}
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>เปิดใช้งาน (Active)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 text-[10px] font-bold">
                  <span>ปิดชั่วคราว (Inactive)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info details */}
        <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50/70 rounded-xl p-2.5 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">โทร:</span>
            <a
              href={`tel:${shop.phone}`}
              className="font-bold hover:underline font-mono"
              style={{ color: accentColor }}
            >
              {shop.phone}
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">วันเปิดทำการ:</span>
            <span className="font-semibold text-gray-800">
              📅 {daysText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">เป้าส่งฟรี:</span>
            <span className="font-bold text-emerald-700">
              ฿{shop.minDeliveryAmount || 200}
            </span>
          </div>
        </div>

        {/* PromptPay QR Code Thumbnail */}
        {qrUrl ? (
          <div
            className="flex items-center gap-2.5 p-2 rounded-xl border transition-colors"
            style={{
              backgroundColor: `${accentColor}08`,
              borderColor: `${accentColor}25`,
            }}
          >
            <button
              type="button"
              onClick={() =>
                onZoomQr({
                  url: qrUrl,
                  title: `${shop.name} — พร้อมเพย์ QR`,
                })
              }
              className="relative h-12 w-12 rounded-lg bg-white p-1 border border-gray-200 shrink-0 shadow-2xs cursor-zoom-in hover:scale-105 transition-transform group"
              title="คลิกเพื่อขยายดู QR Code ขนาดใหญ่"
            >
              <img
                src={qrUrl}
                alt={`PromptPay QR ${shop.name}`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                <Maximize2 className="h-3.5 w-3.5 text-gray-900 bg-white/90 rounded p-0.5" />
              </div>
            </button>
            <div className="min-w-0 flex-1 text-xs">
              <div className="flex items-center gap-1 font-bold text-gray-800">
                <QrCode className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
                <span className="truncate">PromptPay QR</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onZoomQr({
                    url: qrUrl,
                    title: `${shop.name} — พร้อมเพย์ QR`,
                  })
                }
                className="text-[10px] font-bold hover:underline flex items-center gap-0.5 cursor-pointer mt-1"
                style={{ color: accentColor }}
              >
                <span>คลิกดูรูป QR เต็ม</span>
                <Maximize2 className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 text-center text-xs text-gray-500">
            <span className="text-[11px]">⚠️ ยังไม่มีรูป QR พร้อมเพย์ (กดแก้ไขเพื่ออัปโหลด)</span>
          </div>
        )}

        {/* Google Maps link badge */}
        {shop.gmapUrl && (
          <div className="pt-0.5">
            <a
              href={shop.gmapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline"
            >
              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
              <span className="truncate">ดูเมนูจาก Google Maps ↗</span>
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(shop)}
          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
        >
          <Edit className="h-3 w-3" />
          <span>แก้ไขร้าน</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(shop.id, shop.name)}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
          <span>ลบร้าน</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminClient({
  initialBatches,
  initialShops,
  initialLocations,
  initialSystemStatus,
}: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "orders" | "shops" | "desks" | "batches" | "suggestions" | "frequently_ordered" | "ai_sanitizer"
  >("orders");
  const [orderShopFilter, setOrderShopFilter] = useState<string>("all");
  const [orderLocationFilter, setOrderLocationFilter] = useState<string>("all");
  const [orderDateFilter, setOrderDateFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [selectedSlipPhoto, setSelectedSlipPhoto] = useState<{ url: string; title: string } | null>(null);
  const [copiedOrderSummary, setCopiedOrderSummary] = useState(false);

  // ThaiLLM Menu Sanitizer State
  const [sanitizedRecords, setSanitizedRecords] = useState<Record<string, SanitizedMenuItem>>({});
  const [loadingSanitizer, setLoadingSanitizer] = useState(false);
  const [isSanitizingAll, setIsSanitizingAll] = useState(false);
  const [sanitizingSingleKey, setSanitizingSingleKey] = useState<string | null>(null);
  const [sanitizerSearch, setSanitizerSearch] = useState("");
  const [sanitizerShopFilter, setSanitizerShopFilter] = useState("all");
  const [sanitizerStatusFilter, setSanitizerStatusFilter] = useState<"all" | "typo" | "correct" | "pending">("all");
  const [editingSanitizedItem, setEditingSanitizedItem] = useState<{
    id: string;
    originalName: string;
    sanitizedName: string;
    shopName: string;
    amount: number;
  } | null>(null);
  const [sanitizerMessage, setSanitizerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [frequentShopFilter, setFrequentShopFilter] = useState<string>("all");
  const [addingMenuItemShopId, setAddingMenuItemShopId] = useState<string | null>(null);


  const [copiedDesk, setCopiedDesk] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [locations, setLocations] = useState<DeliveryLocation[]>(
    initialLocations && initialLocations.length > 0 ? initialLocations : CAMPUS_LOCATIONS
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // LINE Notification Status State
  const [lineStatus, setLineStatus] = useState<{
    hasToken: boolean;
    envGroupId: string | null;
    envUserId: string | null;
    activeGroupIds: string[];
    quota?: {
      limit: number;
      totalUsage: number;
      remaining: number;
      type: string;
    };
  } | null>(null);
  const [loadingLine, setLoadingLine] = useState(false);
  const [testingLine, setTestingLine] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customBroadcastMsg, setCustomBroadcastMsg] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [manualGroupId, setManualGroupId] = useState("");
  const [addingGroupId, setAddingGroupId] = useState(false);

  // Collapsible toggle for Firebase and Datastore Monitor Pane (Default: Collapsed)
  const [isSystemPaneOpen, setIsSystemPaneOpen] = useState(false);

  // Collapsible toggle for LINE Notification Pane (Default: Collapsed)
  const [isLinePaneOpen, setIsLinePaneOpen] = useState(false);

  // Collapsible toggle for ThaiLLM Monitor Pane (Default: Collapsed)
  const [isLlmPaneOpen, setIsLlmPaneOpen] = useState(false);
  const [llmStatus, setLlmStatus] = useState<{
    online: boolean;
    latencyMs: number | null;
    error: string | null;
    telemetry?: {
      totalCalls: number;
      successCalls: number;
      rateLimitHits: number;
      lastRateLimitIso?: string;
    };
    config: {
      model: string;
      apiUrl: string;
      consumerId: string;
      rateLimit: string;
      hasKey: boolean;
      maskedKey: string;
      temperature: number;
      maxTokens: number;
      reasoningMode: string;
    };
    testedAt: string;
  } | null>(null);
  const [loadingLlmStatus, setLoadingLlmStatus] = useState(false);
  const [interactiveTestInput, setInteractiveTestInput] = useState("จิ่มจุ่ม");
  const [interactiveTestResult, setInteractiveTestResult] = useState<{
    original: string;
    sanitized: string;
    hasTypo: boolean;
    latencyMs: number;
  } | null>(null);
  const [testingInteractiveLlm, setTestingInteractiveLlm] = useState(false);

  // System, Firebase & Cloud Storage State
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(
    initialSystemStatus || {
      firebaseConfigured: isFirebaseConfigured,
      severity: "normal",
      quotaExhausted: false,
      fallbackMode: false,
      activeStorageEngine: "firestore",
      lastError: undefined,
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
      storageMetrics: {
        totalBatches: initialBatches.length,
        totalOrders: initialBatches.reduce((acc, b) => acc + (b.orders?.length || 0), 0),
        totalShops: initialShops.length,
        totalSuggestions: 0,
        slipsCount: initialBatches.reduce(
          (acc, b) => acc + (b.orders?.filter((o) => o.slipImageUrl && o.slipImageUrl.length > 50).length || 0),
          0
        ),
        deliveryPhotosCount: initialBatches.filter((b) => b.deliveryPhotoUrl && b.deliveryPhotoUrl.length > 50).length,
        estimatedImageStorageBytes: 0,
        estimatedImageStorageFormatted: "0 B",
        retentionPolicyDays: 30,
        firestoreFreeLimitBytes: 1024 * 1024 * 1024,
        storageUsagePercentage: 0,
      },
    }
  );
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [cleaningStorage, setCleaningStorage] = useState(false);

  // Shop Add/Edit Modal State
  const [showShopModal, setShowShopModal] = useState(false);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopNameEn, setShopNameEn] = useState("");
  const [shopCuisine, setShopCuisine] = useState("อาหารตามสั่ง");
  const [shopDescription, setShopDescription] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopLineId, setShopLineId] = useState("");
  const [shopGmapUrl, setShopGmapUrl] = useState("");
  const [shopPromptPayQrUrl, setShopPromptPayQrUrl] = useState("");
  const [shopMenuImageUrl, setShopMenuImageUrl] = useState("");
  const [shopMinDelivery, setShopMinDelivery] = useState("200");
  const [shopDefaultCutoff, setShopDefaultCutoff] = useState("11:15");
  const [shopIsActive, setShopIsActive] = useState(true);
  const [shopOpenDays, setShopOpenDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [shopMenuItems, setShopMenuItems] = useState<Array<{ name: string; price: number; popular: boolean; isAvailable?: boolean }>>([
    { name: "ข้าวกะเพราหมูกรอบ", price: 60, popular: true, isAvailable: true },
    { name: "ข้าวหมูกระเทียม", price: 55, popular: false, isAvailable: true },
  ]);
  const [newDishName, setNewDishName] = useState("");
  const [newDishPrice, setNewDishPrice] = useState("");
  const [savingShop, setSavingShop] = useState(false);
  const [zoomedQr, setZoomedQr] = useState<{
    url: string;
    title: string;
    number?: string;
    accountName?: string;
  } | null>(null);

  // Drop-off Point (Desk) Add/Edit Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locName, setLocName] = useState("");
  const [locNameEn, setLocNameEn] = useState("");
  const [locNameCn, setLocNameCn] = useState("");
  const [locShortCode, setLocShortCode] = useState("");
  const [locDeskDetail, setLocDeskDetail] = useState("");
  const [locDeskDetailEn, setLocDeskDetailEn] = useState("");
  const [locDeskDetailCn, setLocDeskDetailCn] = useState("");
  const [locPhotoUrl, setLocPhotoUrl] = useState("");
  const [locMapUrl, setLocMapUrl] = useState("");
  const [locColor, setLocColor] = useState("bg-purple-900");
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    fetchSystemStatus();
    try {
      const isAuth = sessionStorage.getItem("veatec_admin_auth");
      if (isAuth === "true") {
        setIsAuthenticated(true);
        fetchSuggestions();
        fetchLocations();
        fetchLineStatus();
        fetchSanitizedMenus();
        fetchLlmStatus();
      }
    } catch (e) {
      console.warn("sessionStorage check failed", e);
    }
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setRefreshingStatus(true);
      const res = await fetch("/api/system/status");
      const data = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
      }
    } catch (e) {
      console.warn("fetchSystemStatus error", e);
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleProbeFirebase = async () => {
    try {
      setRefreshingStatus(true);
      const res = await fetch("/api/system/status", { method: "POST" });
      const data = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
        if (!data.status.quotaExhausted) {
          alert("✅ ตรวจสอบสำเร็จ: โควตา Google Cloud Firestore ใช้งานได้ปกติและเชื่อมต่อสมบูรณ์!");
        } else {
          alert("⚠️ โควตารายวันยังถูกจำกัด ระบบเปิดใช้งาน Local High-Availability Fallback อัตโนมัติ");
        }
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการทดสอบ: " + (e.message || "Unknown error"));
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleResetMetrics = async () => {
    if (!confirm("ต้องการรีเซ็ตตัวนับการเรียกใช้งาน Firestore ประจำวันนี้หรือไม่?")) return;
    try {
      setRefreshingStatus(true);
      const res = await fetch("/api/system/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_metrics" }),
      });
      const data = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
        alert("✅ รีเซ็ตตัวนับ Request รายวันเรียบร้อยแล้ว");
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + (e.message || "Unknown error"));
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleCleanupStorage = async () => {
    if (
      !confirm(
        "ยืนยันการล้างสลิปโอนเงินและรูปถ่ายจัดส่งที่เก่าเกิน 1 เดือน (30 วัน) หรือไม่?\n\n• ข้อมูลออเดอร์และยอดเงินจะยังคงอยู่ครบถ้วน\n• เฉพาะภาพถ่ายและรูปสลิปเก่าจะถูกเคลียร์เพื่อประหยัดพื้นที่จัดเก็บ"
      )
    ) {
      return;
    }

    try {
      setCleaningStorage(true);
      const res = await fetch("/api/system/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup_storage", retentionDays: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.status) setSystemStatus(data.status);
        alert(
          `✅ ล้างข้อมูลและไฟล์ภาพเก่าสำเร็จ!\n` +
          `• สลิปที่ลบออก: ${data.result?.slipsPurged ?? 0} รายการ\n` +
          `• ภาพถ่ายจัดส่งที่ลบออก: ${data.result?.photosPurged ?? 0} รายการ\n` +
          `• รอบสั่งอาหารที่อาร์ไคฟ์: ${data.result?.batchesArchived ?? 0} รอบ\n` +
          `• คืนพื้นที่จัดเก็บประมาณ: ~${((data.result?.estimatedBytesFreed ?? 0) / 1024).toFixed(1)} KB`
        );
      } else {
        alert("⚠️ การล้างไฟล์ไม่สำเร็จ: " + (data.message || data.error || "Unknown error"));
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการล้างไฟล์: " + (e.message || "Unknown error"));
    } finally {
      setCleaningStorage(false);
    }
  };

  const handleRefreshStorage = async () => {
    try {
      setRefreshingStatus(true);
      const res = await fetch("/api/system/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_storage" }),
      });
      const data = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการตรวจสอบพื้นที่: " + (e.message || "Unknown error"));
    } finally {
      setRefreshingStatus(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const res = await fetch("/api/suggestions");
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error("Error fetching suggestions:", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (data.success && data.locations) {
        setLocations(data.locations);
      }
    } catch (e) {
      console.warn("Error fetching locations:", e);
    }
  };

  const fetchLineStatus = async () => {
    try {
      setLoadingLine(true);
      const res = await fetch("/api/line/status");
      const data = await res.json();
      if (data.success) {
        setLineStatus(data);
      }
    } catch (e) {
      console.error("Error fetching LINE status:", e);
    } finally {
      setLoadingLine(false);
    }
  };

  const handleTestLinePush = async (targetId?: string) => {
    try {
      setTestingLine(true);
      setLineTestResult(null);
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json();
      if (data.success) {
        setLineTestResult({ success: true, message: data.message });
      } else {
        setLineTestResult({ success: false, message: data.error || "ส่งข้อความไม่สำเร็จ" });
      }
    } catch (e: any) {
      setLineTestResult({ success: false, message: e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setTestingLine(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!customBroadcastMsg.trim()) return;
    try {
      setSendingBroadcast(true);
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          message: customBroadcastMsg.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("📢 ส่งข้อความประกาศเข้า LINE เรียบร้อยแล้ว!");
        setCustomBroadcastMsg("");
      } else {
        alert("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถส่งประกาศได้"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleAddManualGroup = async () => {
    const cleanId = manualGroupId.trim();
    if (!cleanId) return;
    try {
      setAddingGroupId(true);
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", groupId: cleanId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("เพิ่ม Group ID เรียบร้อยแล้ว!");
        setManualGroupId("");
        fetchLineStatus();
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setAddingGroupId(false);
    }
  };

  const handleRemoveGroup = async (gid: string) => {
    if (!confirm(`ต้องการลบ Group ID ${gid} ออกจากระบบใช่หรือไม่?`)) return;
    try {
      const res = await fetch("/api/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", groupId: gid }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLineStatus();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm("ต้องการลบข้อเสนอแนะนี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/suggestions?id=${id}`, { method: "DELETE" });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to delete suggestion", e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim().toLowerCase();
    const validPasswords = [
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.toLowerCase(),
      "m4-admin",
      "veatec",
      "veatec-admin",
      "vistec",
      "admin",
    ].filter(Boolean);

    if (validPasswords.includes(clean)) {
      try {
        sessionStorage.setItem("veatec_admin_auth", "true");
      } catch (err) {}
      setIsAuthenticated(true);
      setPassError(false);
      fetchSuggestions();
      fetchLocations();
      fetchLineStatus();
    } else {
      setPassError(true);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("veatec_admin_auth");
    } catch (err) {}
    setIsAuthenticated(false);
    setPasscode("");
  };

  const refreshData = async () => {
    try {
      const [batchesRes, shopsRes, locsRes] = await Promise.all([
        fetch("/api/batches?role=host&fresh=true"),
        fetch("/api/shops"),
        fetch("/api/locations"),
      ]);
      const batchesData = await batchesRes.json();
      const shopsData = await shopsRes.json();
      const locsData = await locsRes.json();

      if (batchesData.success) setBatches(batchesData.batches);
      if (shopsData.success) setShops(shopsData.shops);
      if (locsData.success && locsData.locations) setLocations(locsData.locations);
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        refreshData();
      } else {
        alert(data.error || "ไม่สามารถเปลี่ยนสถานะได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    }
  };

  // -------------------------------------------------------------
  // Shop CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenAddShop = () => {
    setEditingShopId(null);
    setShopName("");
    setShopNameEn("");
    setShopCuisine("อาหารตามสั่ง");
    setShopDescription("");
    setShopPhone("");
    setShopLineId("");
    setShopGmapUrl("");
    setShopPromptPayQrUrl("");
    setShopMenuImageUrl("");
    setShopMinDelivery("200");
    setShopDefaultCutoff("11:15");
    setShopIsActive(true);
    setShopOpenDays([1, 2, 3, 4, 5]);
    setShopMenuItems([
      { name: "ข้าวกะเพราหมูกรอบ", price: 60, popular: true },
      { name: "ข้าวหมูกระเทียม", price: 55, popular: false },
    ]);
    setShowShopModal(true);
  };

  const handleOpenEditShop = (shop: Shop) => {
    setEditingShopId(shop.id);
    setShopName(shop.name);
    setShopNameEn(shop.nameEn || "");
    setShopCuisine(shop.cuisine || "");
    setShopDescription(shop.description || "");
    setShopPhone(shop.phone || "");
    setShopLineId(shop.lineId || "");
    setShopGmapUrl(shop.gmapUrl || "");
    setShopPromptPayQrUrl(shop.promptpayQrUrl || "");
    setShopMenuImageUrl(shop.menuImageUrl || "");
    setShopMinDelivery(String(shop.minDeliveryAmount || 200));
    setShopDefaultCutoff(shop.defaultCutoffTime || "11:15");
    setShopIsActive(shop.isActive !== false);
    setShopOpenDays(
      Array.isArray(shop.openDays) && shop.openDays.length > 0
        ? shop.openDays
        : [1, 2, 3, 4, 5]
    );
    setShopMenuItems(
      (shop.menuItems || []).map((m) => ({
        name: m.name,
        price: m.price,
        popular: Boolean(m.popular),
        isAvailable: m.isAvailable !== false,
      }))
    );
    setShowShopModal(true);
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบร้าน "${name}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/shops?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setShops((prev) => prev.filter((s) => s.id !== id));
        alert(`ลบร้าน "${name}" เรียบร้อยแล้ว`);
      } else {
        alert(data.error || "Failed to delete shop");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleAddDish = () => {
    if (!newDishName.trim() || !newDishPrice) return;
    setShopMenuItems((prev) => [
      ...prev,
      { name: newDishName.trim(), price: Number(newDishPrice), popular: false, isAvailable: true },
    ]);
    setNewDishName("");
    setNewDishPrice("");
  };

  const handleToggleDishAvailable = (idx: number) => {
    setShopMenuItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, isAvailable: it.isAvailable === false ? true : false } : it))
    );
  };

  const handleRemoveDish = (idx: number) => {
    setShopMenuItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopPhone.trim()) {
      alert("กรุณากรอกชื่อร้านและเบอร์โทรศัพท์");
      return;
    }

    setSavingShop(true);
    try {
      const payload = {
        id: editingShopId || undefined,
        name: shopName.trim(),
        nameEn: shopNameEn.trim(),
        cuisine: shopCuisine.trim(),
        description: shopDescription.trim(),
        phone: shopPhone.trim(),
        lineId: shopLineId.trim(),
        gmapUrl: shopGmapUrl.trim() || `https://maps.google.com/?q=${encodeURIComponent(shopName.trim() + " ระยอง")}`,
        promptpayQrUrl: shopPromptPayQrUrl.trim() || undefined,
        menuImageUrl: shopMenuImageUrl.trim() || undefined,
        minDeliveryAmount: Number(shopMinDelivery) || 200,
        defaultCutoffTime: shopDefaultCutoff.trim() || "11:15",
        isActive: shopIsActive,
        openDays: shopOpenDays,
        menuItems: shopMenuItems.map((it, idx) => ({
          id: `dish-${Date.now()}-${idx}`,
          name: it.name,
          price: it.price,
          popular: it.popular,
          isAvailable: it.isAvailable !== false,
        })),
      };

      const res = await fetch("/api/shops", {
        method: editingShopId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert(editingShopId ? `แก้ไขร้าน "${shopName}" สำเร็จ!` : `เพิ่มร้าน "${shopName}" เข้าสู่ระบบสำเร็จ!`);
      setShowShopModal(false);
      refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to save shop");
    } finally {
      setSavingShop(false);
    }
  };

  const handleUploadShopImageFile = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "menu" | "qr") => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.75);
        if (targetField === "menu") setShopMenuImageUrl(compressed);
        if (targetField === "qr") setShopPromptPayQrUrl(compressed);
      } catch (err) {
        console.error("Image upload compression error:", err);
      }
    }
  };

  // -------------------------------------------------------------
  // Crowdsourced All Orders Master Analytics & Filtering
  // -------------------------------------------------------------
  const allOrders = useMemo(() => {
    const list: Array<{
      id: string;
      orderNumber: number;
      batchId: string;
      batchDate: string;
      batchStatus: string;
      shopId: string;
      shopName: string;
      customerName: string;
      customerLineId?: string;
      customerPhone?: string;
      locationId: string;
      locationName: string;
      items: Array<{ name: string; price: number; quantity: number; customNote?: string }>;
      totalAmount: number;
      slipImageUrl?: string;
      isSlipVerified?: boolean;
      createdAt: string;
      boxLabel?: string;
    }> = [];

    batches.forEach((b) => {
      const shop = shops.find((s) => s.id === b.shopId) || b.shop;
      const shopName = shop?.name || "ร้านอาหาร";

      (b.orders || []).forEach((ord) => {
        if (ord.deletedAt) return;
        const loc = locations.find((l) => l.id === ord.locationId);
        list.push({
          id: ord.id,
          orderNumber: ord.orderNumber,
          batchId: b.id,
          batchDate: b.date,
          batchStatus: b.status,
          shopId: b.shopId,
          shopName,
          customerName: ord.customerName,
          customerLineId: ord.customerLineId,
          customerPhone: ord.customerPhone,
          locationId: ord.locationId,
          locationName: loc ? loc.name : ord.locationId,
          items: ord.items || [],
          totalAmount: ord.totalAmount,
          slipImageUrl: ord.slipImageUrl,
          isSlipVerified: ord.isSlipVerified,
          createdAt: ord.createdAt || "",
          boxLabel: ord.boxLabel,
        });
      });
    });

    return list.sort((a, b) => {
      const tA = new Date(a.createdAt || a.batchDate).getTime() || 0;
      const tB = new Date(b.createdAt || b.batchDate).getTime() || 0;
      return tB - tA;
    });
  }, [batches, shops, locations]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter((ord) => {
      // 1. Shop filter
      if (orderShopFilter !== "all" && ord.shopId !== orderShopFilter) return false;

      // 2. Building / Location filter
      if (orderLocationFilter !== "all" && ord.locationId !== orderLocationFilter) return false;

      // 3. Date filter
      if (orderDateFilter === "today") {
        const todayStr = new Date().toISOString().split("T")[0];
        if (ord.batchDate !== todayStr) return false;
      }

      // 4. Search query
      if (orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        const matchCustomer = (ord.customerName || "").toLowerCase().includes(q);
        const matchLine = (ord.customerLineId || "").toLowerCase().includes(q);
        const matchPhone = (ord.customerPhone || "").includes(q);
        const matchLoc = (ord.locationName || "").toLowerCase().includes(q);
        const matchShop = (ord.shopName || "").toLowerCase().includes(q);
        const matchDish = (ord.items || []).some((it) => (it.name || "").toLowerCase().includes(q));
        if (!matchCustomer && !matchLine && !matchPhone && !matchLoc && !matchShop && !matchDish) {
          return false;
        }
      }

      return true;
    });
  }, [allOrders, orderShopFilter, orderLocationFilter, orderDateFilter, orderSearch]);

  const ordersMetrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalBoxes = filteredOrders.reduce((sum, o) => {
      const boxCount = (o.items || []).reduce((bSum, it) => bSum + (it.quantity || 1), 0);
      return sum + (boxCount || 1);
    }, 0);
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Top crowd-sourced dish in current selection
    const dishCounts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const name = (it.name || "").trim();
        if (name) dishCounts[name] = (dishCounts[name] || 0) + (it.quantity || 1);
      });
    });
    const sortedDishes = Object.entries(dishCounts).sort((a, b) => b[1] - a[1]);
    const topDish = sortedDishes[0] ? `${sortedDishes[0][0]} (${sortedDishes[0][1]} กล่อง)` : "-";

    return { totalOrders, totalBoxes, totalRevenue, topDish, topDishesList: sortedDishes.slice(0, 5) };
  }, [filteredOrders]);

  const handleCopyFilteredOrdersSummary = async () => {
    if (filteredOrders.length === 0) return;
    let txt = `📋 [VEATEC] สรุปรายการออเดอร์ทั้งหมด (${filteredOrders.length} ออเดอร์ • ${ordersMetrics.totalBoxes} กล่อง)\n`;
    txt += `💰 ยอดรวม: ฿${ordersMetrics.totalRevenue.toLocaleString()}\n`;
    txt += `------------------------------------\n`;
    filteredOrders.forEach((ord, i) => {
      const lineTag = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
      const phoneTag = ord.customerPhone ? ` (${ord.customerPhone})` : "";
      const itemsStr = ord.items.map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}${it.customNote ? ` [${it.customNote}]` : ""}`).join(", ");
      txt += `${i + 1}. #${ord.orderNumber} ${ord.shopName} [${ord.locationName}] — ${itemsStr} (฿${ord.totalAmount}) — ${lineTag}${phoneTag}\n`;
    });
    txt += `------------------------------------\n`;
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedOrderSummary(true);
      setTimeout(() => setCopiedOrderSummary(false), 2500);
    } catch (e) {}
  };

  // -------------------------------------------------------------
  // Frequently Ordered Dishes Analytics & Shop Menu Quick-Add
  // -------------------------------------------------------------
  const frequentlyOrderedDishes = useMemo(() => {
    const map = new Map<
      string,
      {
        shopId: string;
        shopName: string;
        dishName: string;
        orderCount: number;
        totalQuantity: number;
        totalRevenue: number;
        latestPrice: number;
      }
    >();

    batches.forEach((b) => {
      const shop = shops.find((s) => s.id === b.shopId) || b.shop;
      const shopId = shop?.id || b.shopId || "unknown";
      const shopName = shop?.name || "ร้านอาหาร";

      (b.orders || []).forEach((ord) => {
        if (ord.deletedAt) return;
        (ord.items || []).forEach((it) => {
          const rawName = (it.name || "").trim();
          if (!rawName) return;
          const key = `${shopId}:::${rawName.toLowerCase()}`;
          const existing = map.get(key);
          const qty = it.quantity || 1;
          const price = it.price || 0;

          if (existing) {
            existing.orderCount += 1;
            existing.totalQuantity += qty;
            existing.totalRevenue += price * qty;
            if (price > 0) existing.latestPrice = price;
          } else {
            map.set(key, {
              shopId,
              shopName,
              dishName: rawName,
              orderCount: 1,
              totalQuantity: qty,
              totalRevenue: price * qty,
              latestPrice: price,
            });
          }
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [batches, shops]);

  const filteredFrequentDishes = useMemo(() => {
    if (frequentShopFilter === "all") return frequentlyOrderedDishes;
    return frequentlyOrderedDishes.filter((d) => d.shopId === frequentShopFilter);
  }, [frequentlyOrderedDishes, frequentShopFilter]);

  const handleAddDishToShopMenu = async (dish: {
    name: string;
    price: number;
    shopId: string;
    shopName: string;
  }) => {
    const targetShop = shops.find((s) => s.id === dish.shopId);
    if (!targetShop) return;

    if (
      targetShop.menuItems?.some(
        (m) => m.name.trim().toLowerCase() === dish.name.trim().toLowerCase()
      )
    ) {
      alert(`เมนู "${dish.name}" มีอยู่ในร้าน "${targetShop.name}" อยู่แล้ว`);
      return;
    }

    const updatedMenuItems = [
      ...(targetShop.menuItems || []),
      {
        id: `dish-${Date.now()}`,
        name: dish.name,
        price: dish.price,
        popular: true,
      },
    ];

    setAddingMenuItemShopId(dish.shopId + dish.name);
    try {
      const res = await fetch("/api/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetShop,
          menuItems: updatedMenuItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShops((prev) =>
          prev.map((s) => (s.id === dish.shopId ? { ...s, menuItems: updatedMenuItems } : s))
        );
        alert(
          `เพิ่มเมนู "${dish.name}" เข้าเป็นเมนูแนะนำของร้าน "${targetShop.name}" เรียบร้อยแล้ว!\nเมนูนี้จะขึ้นใน "แตะเลือกเมนูแนะนำของร้าน" บนหน้ากระดานให้ลูกค้ากดเลือกได้ทันที`
        );
      } else {
        alert(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setAddingMenuItemShopId(null);
    }
  };

  // -------------------------------------------------------------
  // ThaiLLM Status, Ping & Diagnostics Functions
  // -------------------------------------------------------------
  const fetchLlmStatus = async () => {
    setLoadingLlmStatus(true);
    try {
      const res = await fetch("/api/thaillm/status");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLlmStatus(data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch ThaiLLM status:", e);
    } finally {
      setLoadingLlmStatus(false);
    }
  };

  const handleTestInteractiveLlm = async () => {
    if (!interactiveTestInput.trim() || testingInteractiveLlm) return;
    setTestingInteractiveLlm(true);
    try {
      const res = await fetch("/api/thaillm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishName: interactiveTestInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInteractiveTestResult(data);
        }
      }
    } catch (e) {
      console.warn("Interactive LLM test error:", e);
    } finally {
      setTestingInteractiveLlm(false);
    }
  };

  // -------------------------------------------------------------
  // ThaiLLM Menu Sanitizer Functions
  // -------------------------------------------------------------
  const fetchSanitizedMenus = async () => {
    setLoadingSanitizer(true);
    try {
      const res = await fetch("/api/menu-sanitizer");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          const map: Record<string, SanitizedMenuItem> = {};
          data.items.forEach((it: SanitizedMenuItem) => {
            map[`${it.shopId}___${it.originalName.trim()}`] = it;
          });
          setSanitizedRecords(map);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch sanitized menus:", e);
    } finally {
      setLoadingSanitizer(false);
    }
  };

  const handleSanitizeAllMenus = async () => {
    if (isSanitizingAll) return;
    setIsSanitizingAll(true);
    setSanitizerMessage(null);

    try {
      const itemsToSanitize = frequentlyOrderedDishes.map((dish) => ({
        shopId: dish.shopId,
        shopName: dish.shopName,
        originalName: dish.dishName,
        amount: dish.totalQuantity,
      }));

      const res = await fetch("/api/menu-sanitizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sanitize", items: itemsToSanitize }),
      });

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setSanitizedRecords((prev) => {
          const updated = { ...prev };
          data.items.forEach((it: SanitizedMenuItem) => {
            updated[`${it.shopId}___${it.originalName.trim()}`] = it;
          });
          return updated;
        });

        setSanitizerMessage({
          type: "success",
          text: `สแกนด้วย ThaiLLM เรียบร้อยแล้ว (${data.totalProcessed} เมนู, พบและแก้ไขคำผิด ${data.typosCount} เมนู)`,
        });
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      setSanitizerMessage({
        type: "error",
        text: `เกิดข้อผิดพลาดในการเรียก ThaiLLM: ${err.message}`,
      });
    } finally {
      setIsSanitizingAll(false);
    }
  };

  const handleSanitizeSingleDish = async (dish: {
    shopId: string;
    shopName: string;
    dishName: string;
    totalQuantity: number;
  }) => {
    const key = `${dish.shopId}___${dish.dishName.trim()}`;
    setSanitizingSingleKey(key);
    try {
      const res = await fetch("/api/menu-sanitizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sanitize_single",
          shopId: dish.shopId,
          shopName: dish.shopName,
          originalName: dish.dishName,
          amount: dish.totalQuantity,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setSanitizedRecords((prev) => ({
          ...prev,
          [key]: data.item,
        }));
      }
    } catch (err) {
      console.warn("Single sanitize error:", err);
    } finally {
      setSanitizingSingleKey(null);
    }
  };

  const handleSaveManualSanitized = async (
    recordId: string,
    originalName: string,
    newSanitizedName: string
  ) => {
    if (!newSanitizedName.trim()) return;
    try {
      const res = await fetch("/api/menu-sanitizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_manual",
          id: recordId,
          originalName,
          sanitizedName: newSanitizedName.trim(),
        }),
      });

      if (res.ok) {
        setSanitizedRecords((prev) => {
          const updated = { ...prev };
          for (const k in updated) {
            if (updated[k].id === recordId) {
              updated[k] = {
                ...updated[k],
                sanitizedName: newSanitizedName.trim(),
                hasTypo: originalName.trim() !== newSanitizedName.trim(),
                source: "manual",
                updatedAt: new Date().toISOString(),
              };
            }
          }
          return updated;
        });
        setEditingSanitizedItem(null);
      }
    } catch (err) {
      console.warn("Manual save error:", err);
    }
  };

  const sanitizerRows = useMemo(() => {
    return frequentlyOrderedDishes
      .map((dish) => {
        const key = `${dish.shopId}___${dish.dishName.trim()}`;
        const record = sanitizedRecords[key];
        return {
          key,
          dish,
          record,
          shopId: dish.shopId,
          shopName: dish.shopName,
          menu: dish.dishName,
          amount: dish.totalQuantity,
          sanitizedName: record?.sanitizedName || null,
          hasTypo: record ? record.hasTypo : null,
          isScanned: Boolean(record),
        };
      })
      .filter((row) => {
        if (sanitizerShopFilter !== "all" && row.shopId !== sanitizerShopFilter) return false;
        if (sanitizerSearch.trim()) {
          const q = sanitizerSearch.toLowerCase();
          const matchMenu = row.menu.toLowerCase().includes(q);
          const matchSanitized = row.sanitizedName?.toLowerCase().includes(q);
          const matchShop = row.shopName.toLowerCase().includes(q);
          if (!matchMenu && !matchSanitized && !matchShop) return false;
        }
        if (sanitizerStatusFilter === "typo" && row.hasTypo !== true) return false;
        if (sanitizerStatusFilter === "correct" && (row.hasTypo !== false || !row.isScanned)) return false;
        if (sanitizerStatusFilter === "pending" && row.isScanned) return false;
        return true;
      });
  }, [frequentlyOrderedDishes, sanitizedRecords, sanitizerShopFilter, sanitizerSearch, sanitizerStatusFilter]);

  const handleOpenAddLocation = () => {
    setEditingLocationId(null);
    setLocName("");
    setLocNameEn("");
    setLocNameCn("");
    setLocShortCode("");
    setLocDeskDetail("");
    setLocDeskDetailEn("");
    setLocDeskDetailCn("");
    setLocPhotoUrl("");
    setLocMapUrl("");
    setLocColor("bg-purple-900");
    setShowLocationModal(true);
  };

  const handleOpenEditLocation = (loc: DeliveryLocation) => {
    setEditingLocationId(loc.id);
    setLocName(loc.name);
    setLocNameEn(loc.nameEn || "");
    setLocNameCn(loc.nameCn || "");
    setLocShortCode(loc.shortCode);
    setLocDeskDetail(loc.deskDetail);
    setLocDeskDetailEn(loc.deskDetailEn || "");
    setLocDeskDetailCn(loc.deskDetailCn || "");
    setLocPhotoUrl(loc.photoUrl);
    setLocMapUrl(loc.mapUrl || "");
    setLocColor(loc.color || "bg-purple-900");
    setShowLocationModal(true);
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบจุดส่ง "${name}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
        alert(`ลบจุดส่ง "${name}" สำเร็จ`);
      } else {
        alert(data.error || "Failed to delete location");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locShortCode.trim() || !locDeskDetail.trim()) {
      alert("กรุณากรอกชื่ออาคาร รหัสย่อ (เช่น M4) และรายละเอียดโต๊ะส่งอาหาร");
      return;
    }

    setSavingLocation(true);
    try {
      const payload = {
        id: editingLocationId || undefined,
        name: locName.trim(),
        nameEn: locNameEn.trim() || locName.trim(),
        nameCn: locNameCn.trim() || locName.trim(),
        shortCode: locShortCode.trim().toUpperCase(),
        deskDetail: locDeskDetail.trim(),
        deskDetailEn: locDeskDetailEn.trim() || locDeskDetail.trim(),
        deskDetailCn: locDeskDetailCn.trim() || locDeskDetail.trim(),
        photoUrl: locPhotoUrl.trim() || undefined,
        color: locColor || "bg-purple-900",
        mapUrl: locMapUrl.trim() || undefined,
      };

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert(editingLocationId ? `แก้ไขจุดส่ง "${locName}" สำเร็จ!` : `เพิ่มจุดส่ง "${locName}" สำเร็จ!`);
      setShowLocationModal(false);
      fetchLocations();
    } catch (err: any) {
      alert(err.message || "Failed to save location");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleUploadLocationPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.75);
        setLocPhotoUrl(compressed);
      } catch (err) {
        console.error("Location image compression error:", err);
      }
    }
  };

  // -------------------------------------------------------------
  // Authentication Screen
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-white to-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-purple-200/80 bg-white p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-900 shadow-xs">
            <Lock className="h-8 w-8 text-purple-900" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              VEATEC Portal Admin
            </h1>
            <p className="mt-1.5 text-xs text-gray-500">
              ระบบจัดการร้านค้า จุดส่งอาหาร และการแจ้งเตือน
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="กรอกรหัสผ่านผู้ดูแลระบบ (Admin PIN)"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPassError(false);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-center font-bold tracking-widest text-gray-900 transition-all ${
                  passError
                    ? "border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-400"
                    : "border-gray-200 bg-gray-50/50 focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-200"
                }`}
              />
              {passError && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-purple-900 py-3 text-sm font-bold text-white shadow-md hover:bg-purple-800 transition-colors"
            >
              เข้าสู่ระบบ Admin Portal
            </button>
          </form>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-purple-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับไปหน้าหลัก (Digital Whiteboard)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Admin Main Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md px-4 py-3 shadow-2xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 transition-colors"
              title="กลับไปกระดานสั่งข้าวหน้าแรก"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-purple-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  M4 ADMIN
                </span>
                <h1 className="text-sm sm:text-base font-black text-gray-900">
                  VEATEC Hub &mdash; จัดการระบบ
                </h1>
              </div>
              <p className="text-[11px] text-gray-500">
                จัดการร้านค้า • จุดส่งอาหาร • ตรวจสอบฐานข้อมูล • LINE แจ้งเตือน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs"
            >
              <span>กระดานหลัก ↗</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-3.5 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
        {/* Collapsible Firebase & Fallback Datastore Monitor Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all">
          {/* Header Bar / Collapsed Summary Bar */}
          <div
            onClick={() => setIsSystemPaneOpen((prev) => !prev)}
            className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                  systemStatus.severity === "interrupted"
                    ? "bg-amber-100 text-amber-800"
                    : systemStatus.severity === "warning"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      systemStatus.severity === "interrupted"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    {systemStatus.severity === "interrupted" ? "Quota Limited" : "Cloud Healthy"}
                  </span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-bold border flex items-center gap-1 bg-emerald-50 text-emerald-900 border-emerald-200"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Firestore Active
                  </span>
                  <span className="text-xs font-black text-slate-900 ml-1">
                    Firebase &amp; Datastore Architecture
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                  <span>Reads: <strong>{systemStatus.metrics?.readsToday ?? 0}</strong>/50k</span>
                  <span>•</span>
                  <span>Writes: <strong>{systemStatus.metrics?.writesToday ?? 0}</strong>/20k</span>
                  <span>•</span>
                  <span>
                    ภาพจัดเก็บ: <strong>{systemStatus.storageMetrics?.estimatedImageStorageFormatted ?? "0 B"}</strong> ({systemStatus.storageMetrics?.slipsCount ?? 0} สลิป)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors flex items-center gap-1">
                <span>{isSystemPaneOpen ? "ย่อเก็บ" : "ขยายดูรายละเอียด"}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isSystemPaneOpen ? "rotate-180" : ""}`} />
              </span>
            </div>
          </div>

          {/* Expanded Content */}
          {isSystemPaneOpen && (
            <div className="border-t border-slate-200 p-4 sm:p-5 space-y-5 bg-slate-50/40">
              {/* Firebase Health & Quota Diagnostics Card */}
              <div
                className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                  systemStatus.severity === "interrupted"
                    ? "border-amber-300 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30"
                    : systemStatus.severity === "warning"
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-emerald-200 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/30"
                }`}
              >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                  systemStatus.severity === "interrupted"
                    ? "bg-amber-100 text-amber-800"
                    : systemStatus.severity === "warning"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <Database className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      systemStatus.severity === "interrupted"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : systemStatus.severity === "warning"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    {systemStatus.severity === "interrupted"
                      ? "โควตารายวันถูกจำกัด (Spark Plan)"
                      : "Cloud Firestore Healthy"}
                  </span>
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold border flex items-center gap-1 bg-emerald-100 text-emerald-900 border-emerald-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Engine: Google Cloud Firestore + Cloud Storage
                  </span>
                  <span className="rounded-md bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                    Spark Free Tier
                  </span>
                  <span className="rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                    🎯 Dead Reckoning Telemetry
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900">
                  {systemStatus.severity === "interrupted"
                    ? "สถานะโควตา Cloud Firestore รายวัน — ระบบทำงานต่อเนื่องผ่าน Local Architecture"
                    : "สถานะการเรียกใช้งาน Google Cloud Firestore & โควตารายวัน"}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <p>
                    รอบรีเซ็ตโควตา: <strong>{systemStatus.resetTimeInfo}</strong>
                  </p>
                  {systemStatus.metrics?.timeUntilReset && (
                    <p className="font-semibold text-purple-900 bg-purple-100/60 px-2 py-0.5 rounded-md">
                      ⏳ เริ่มรอบใหม่ใน: {systemStatus.metrics.timeUntilReset}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-start">
              <button
                type="button"
                onClick={handleProbeFirebase}
                disabled={refreshingStatus}
                className="rounded-xl border border-purple-300 bg-purple-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="ทดสอบอ่าน Firestore ทันที"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshingStatus ? "animate-spin" : ""}`}
                />
                <span>{refreshingStatus ? "กำลังทดสอบ..." : "🔄 ทดสอบ Quota เดี๋ยวนี้"}</span>
              </button>
              <button
                type="button"
                onClick={handleResetMetrics}
                disabled={refreshingStatus}
                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                title="รีเซ็ตตัวนับการเรียกใช้งานประจำวัน"
              >
                <RefreshCw className="h-3 w-3 text-slate-400" />
                <span>รีเซ็ตตัวนับ</span>
              </button>
              <a
                href="https://console.firebase.google.com/project/one-order-af750/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1"
              >
                <span>Console ↗</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Firestore Operations vs Quota Usage Bars */}
          <div className="mt-4 pt-4 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Reads */}
            <div className="bg-white/80 rounded-xl border border-slate-200 p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  อ่านข้อมูล (Reads)
                </span>
                <span className="font-mono font-black text-slate-900">
                  {(systemStatus.metrics?.readsToday || 0).toLocaleString()} / 50,000
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (systemStatus.metrics?.readsPercentage || 0) > 85
                      ? "bg-rose-500"
                      : (systemStatus.metrics?.readsPercentage || 0) > 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.max(1, Math.min(100, systemStatus.metrics?.readsPercentage || 0))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>ใช้ไป {systemStatus.metrics?.readsPercentage || 0}%</span>
                <span>
                  เหลือ {Math.max(0, 50000 - (systemStatus.metrics?.readsToday || 0)).toLocaleString()} ครั้ง
                </span>
              </div>
            </div>

            {/* Writes */}
            <div className="bg-white/80 rounded-xl border border-slate-200 p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  เขียนข้อมูล (Writes)
                </span>
                <span className="font-mono font-black text-slate-900">
                  {(systemStatus.metrics?.writesToday || 0).toLocaleString()} / 20,000
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (systemStatus.metrics?.writesPercentage || 0) > 85
                      ? "bg-rose-500"
                      : (systemStatus.metrics?.writesPercentage || 0) > 60
                      ? "bg-amber-500"
                      : "bg-purple-600"
                  }`}
                  style={{
                    width: `${Math.max(1, Math.min(100, systemStatus.metrics?.writesPercentage || 0))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>ใช้ไป {systemStatus.metrics?.writesPercentage || 0}%</span>
                <span>
                  เหลือ {Math.max(0, 20000 - (systemStatus.metrics?.writesToday || 0)).toLocaleString()} ครั้ง
                </span>
              </div>
            </div>

            {/* Deletes */}
            <div className="bg-white/80 rounded-xl border border-slate-200 p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  ลบข้อมูล (Deletes)
                </span>
                <span className="font-mono font-black text-slate-900">
                  {(systemStatus.metrics?.deletesToday || 0).toLocaleString()} / 20,000
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (systemStatus.metrics?.deletesPercentage || 0) > 85
                      ? "bg-rose-500"
                      : (systemStatus.metrics?.deletesPercentage || 0) > 60
                      ? "bg-amber-500"
                      : "bg-blue-600"
                  }`}
                  style={{
                    width: `${Math.max(1, Math.min(100, systemStatus.metrics?.deletesPercentage || 0))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>ใช้ไป {systemStatus.metrics?.deletesPercentage || 0}%</span>
                <span>
                  เหลือ {Math.max(0, 20000 - (systemStatus.metrics?.deletesToday || 0)).toLocaleString()} ครั้ง
                </span>
              </div>
            </div>
          </div>

          {/* Explanation note for Dead Reckoning Telemetry & Probe Rationale */}
          <div className="mt-3 p-3.5 rounded-xl bg-purple-50/80 border border-purple-200/90 text-xs text-purple-950 space-y-2">
            <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
              <Info className="h-4 w-4 shrink-0 text-purple-700" />
              <span>ทำความเข้าใจระบบนับโควตา &amp; ทำไมไม่ Probe ตลอดเวลา?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] leading-relaxed text-purple-900/90">
              <div className="p-2.5 rounded-lg bg-white/70 border border-purple-100">
                <p className="font-bold text-purple-950 mb-0.5">🎯 การนับแบบ "Dead Reckoning" (In-Memory Telemetry):</p>
                <p>
                  เนื่องจาก Firebase Spark Free Tier ไม่มี Client SDK ส่งตัวเลขโควตาแบบ Real-time กลับมาให้แอป ระบบจึงใช้การดักนับสะสมในระดับ Application Memory ทุกครั้งที่มีการอ่าน/เขียนจริง เพื่อหลีกเลี่ยงการเสียโควตา Write ไปกับการบันทึกสถิติ ตัวเลขจะรีเซ็ตเริ่มต้นใหม่เมื่อ Server Restart / Build หรือเมื่อข้ามรอบวันใหม่เวลา 14:00 - 15:00 น. ICT (00:00 US Pacific Time)
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 border border-purple-100">
                <p className="font-bold text-purple-950 mb-0.5">⚠️ ทำไมระบบไม่ Probe อัตโนมัติตลอดเวลา? (Observer Effect):</p>
                <p>
                  ทุกครั้งที่มีการ Probe คือการยิงคำสั่งอ่าน Firestore จริง หากเราตั้ง Polling Probe ตลอดเวลา (เช่น ทุก 10-30 วินาที) โควตา 50,000 Reads ต่อวันจะถูกเผาผลาญจนหมดไปกับ "การตรวจสอบตัวเอง" เสียเอง! ระบบจึงใช้ Dead Reckoning ในการทำงานปกติ และเปิดให้กดปุ่ม <strong>"🔄 ทดสอบ Quota เดี๋ยวนี้"</strong> แบบ On-Demand เมื่อต้องการทดสอบเท่านั้น
                </p>
              </div>
            </div>
          </div>

          {systemStatus.lastError && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
              <span>
                <strong>แจ้งเตือนล่าสุด:</strong> {systemStatus.lastError} &mdash; ระบบเปิดใช้งาน Fallback ป้องกันการหยุดชะงัก
              </span>
            </div>
          )}
        </div>

        {/* Firebase Cloud Storage & 30-Day Auto Retention Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-900 shrink-0">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    Cloud Storage &mdash; การจัดเก็บภาพ &amp; นโยบาย 30 วัน (1 เดือน)
                  </h3>
                  <span className="rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    Firestore + Cloud Storage
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  ควบคุมขนาดภาพถ่าย &lt; 80 KB อัตโนมัติ • ล้างสลิปและรูปเก่าเกิน 1 เดือนทุกวันเพื่อป้องกันพื้นที่เต็ม
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCleanupStorage}
                disabled={cleaningStorage}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                title="ล้างรูปสลิปและภาพจัดส่งที่เก่าเกิน 30 วันทันที"
              >
                <Trash2 className={`h-3.5 w-3.5 ${cleaningStorage ? "animate-spin" : ""}`} />
                <span>{cleaningStorage ? "กำลังล้างไฟล์..." : "🧹 ล้างไฟล์เก่าเกิน 1 เดือนทันที"}</span>
              </button>
              <button
                type="button"
                onClick={handleRefreshStorage}
                disabled={refreshingStatus}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="ตรวจสอบขนาดพื้นที่จัดเก็บล่าสุด"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingStatus ? "animate-spin" : ""}`} />
                <span>คำนวณพื้นที่จัดเก็บ</span>
              </button>
            </div>
          </div>

          {/* Cloud Storage Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">พื้นที่รูปภาพใช้งาน</span>
              <span className="text-xs font-black text-slate-800">
                {systemStatus.storageMetrics?.estimatedImageStorageFormatted || "0 B"}
              </span>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${Math.max(1, Math.min(100, systemStatus.storageMetrics?.storageUsagePercentage || 0))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block">
                จาก 1,024 MB Free Tier ({systemStatus.storageMetrics?.storageUsagePercentage || 0}%)
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">สลิปโอนเงิน PromptPay</span>
              <span className="text-xs font-black text-slate-800">
                {systemStatus.storageMetrics?.slipsCount || 0} สลิป
              </span>
              <span className="text-[10px] text-slate-500 block">
                ย่อขนาด &lt; 80 KB อัตโนมัติ
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">ภาพถ่ายการจัดส่ง</span>
              <span className="text-xs font-black text-emerald-700">
                {systemStatus.storageMetrics?.deliveryPhotosCount || 0} ภาพ
              </span>
              <span className="text-[10px] text-slate-500 block">
                ภาพจุดวางส่งถึงโต๊ะ
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">นโยบายจัดเก็บ (Retention)</span>
              <span className="text-xs font-black text-purple-900">
                {systemStatus.storageMetrics?.retentionPolicyDays || 30} วัน (1 เดือน)
              </span>
              <span className="text-[10px] text-slate-500 block">
                ล้างสลิป/รูปเก่าอัตโนมัติทุกวัน
              </span>
            </div>
          </div>

          {/* Retention Log / Last Run Banner */}
          {systemStatus.storageMetrics?.lastCleanupIso ? (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-2.5 text-xs text-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>การล้างไฟล์ล่าสุด:</strong> {systemStatus.storageMetrics.lastCleanupSummary}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-mono shrink-0">
                {new Date(systemStatus.storageMetrics.lastCleanupIso).toLocaleString("th-TH")}
              </span>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-2.5 text-xs text-slate-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                <strong>การตรวจเช็คอัตโนมัติ:</strong> ระบบจะตรวจสอบอายุไฟล์ภาพทุกวันเมื่อมีการเปิดหน้าเว็บ หากพบรูปสลิปหรือภาพจัดส่งเก่าเกิน 30 วัน จะลบออกอัตโนมัติ
              </span>
            </div>
          )}

          {/* Firestore Collections Inventory */}
          <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-3">
            <span className="text-[11px] font-bold text-slate-500 block mb-2">
              จำนวนข้อมูลทั้งหมดใน Google Cloud Firestore:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs">
                <Store className="h-3.5 w-3.5 text-purple-600" />
                ร้านค้า: <strong className="text-purple-900">{systemStatus.storageMetrics?.totalShops || initialShops.length}</strong> ร้าน
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                รอบสั่งอาหาร: <strong className="text-indigo-900">{systemStatus.storageMetrics?.totalBatches || initialBatches.length}</strong> รอบ
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ออเดอร์สะสม: <strong className="text-emerald-900">{systemStatus.storageMetrics?.totalOrders || 0}</strong> รายการ
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs">
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                จุดส่งอาหาร: <strong className="text-amber-900">{CAMPUS_LOCATIONS.length}</strong> จุด
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs">
                <MessageSquareHeart className="h-3.5 w-3.5 text-pink-600" />
                ข้อเสนอแนะ: <strong className="text-pink-900">{systemStatus.storageMetrics?.totalSuggestions || 0}</strong> เรื่อง
              </span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Collapsible LINE Notification & Group Dispatch Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all">
          {/* Header Bar / Collapsed Summary Bar */}
          <div
            onClick={() => {
              setIsLinePaneOpen((prev) => !prev);
              if (!lineStatus) fetchLineStatus();
            }}
            className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C755] text-white shrink-0 font-black text-sm shadow-xs">
                L
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      lineStatus?.hasToken
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {lineStatus?.hasToken ? "Messaging API Ready" : "Messaging API"}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border flex items-center gap-1 ${
                      lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-amber-500"
                      }`}
                    />
                    {lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0
                      ? `${lineStatus.activeGroupIds.length} กลุ่มเชื่อมต่ออยู่`
                      : "ยังไม่มีกลุ่มเชื่อมต่อ"}
                  </span>
                  <span className="rounded-md bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                    Free Plan (300 ข้อความ/ด.)
                  </span>
                  <span className="text-xs font-black text-slate-900 ml-1">
                    LINE Notification &amp; Group Dispatch
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                  <span>
                    โควตาฟรี:{" "}
                    <strong className="text-purple-700 font-bold">
                      {lineStatus?.quota?.remaining ?? 300}/{lineStatus?.quota?.limit ?? 300}
                    </strong>{" "}
                    ข้อความคงเหลือ
                  </span>
                  <span>•</span>
                  <span>
                    ส่งไปแล้วเดือนนี้: <strong>{lineStatus?.quota?.totalUsage ?? 0}</strong> ข้อความ
                  </span>
                  <span>•</span>
                  <span>
                    Webhook: <strong>/api/line/webhook</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchLineStatus();
                }}
                disabled={loadingLine}
                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-1 cursor-pointer"
                title="รีเฟรชข้อมูล LINE"
              >
                <RefreshCw
                  className={`h-3 w-3 text-emerald-600 ${loadingLine ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">รีเฟรช</span>
              </button>
              <span className="text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1">
                <span>{isLinePaneOpen ? "ย่อเก็บ" : "ขยายดูรายละเอียด"}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isLinePaneOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </div>
          </div>

          {/* Expanded Content */}
          {isLinePaneOpen && (
            <div className="border-t border-slate-200 p-4 sm:p-5 space-y-5 bg-slate-50/40">
              {/* Connection Cards */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">1. สถานะการเชื่อมต่อ LINE Messaging API</h3>
                  <button
                    type="button"
                    onClick={fetchLineStatus}
                    disabled={loadingLine}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loadingLine ? "animate-spin" : ""}`} />
                    <span>รีเฟรชสถานะ</span>
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="text-[11px] font-bold text-gray-500 uppercase">Channel Access Token</div>
                    <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-800">พร้อมใช้งาน (Configured)</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="text-[11px] font-bold text-gray-500 uppercase">Environment Group ID</div>
                    <div className="mt-1 font-bold text-xs truncate">
                      {lineStatus?.envGroupId ? (
                        <span className="text-emerald-800 font-mono">{lineStatus.envGroupId}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">Auto-detect Active</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="text-[11px] font-bold text-gray-500 uppercase">กลุ่มที่เชื่อมต่ออยู่</div>
                    <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <span
                        className={
                          lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0
                            ? "text-emerald-800"
                            : "text-amber-800"
                        }
                      >
                        {lineStatus?.activeGroupIds?.length || 0} กลุ่มที่ตรวจพบ
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-purple-900 uppercase flex items-center justify-between">
                        <span>โควตาข้อความฟรี / เดือน</span>
                        <span className="font-mono text-[9px] bg-purple-200 text-purple-800 px-1 py-0.2 rounded font-bold">Free Plan</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5 font-bold text-xs">
                        <span className="text-base font-black text-purple-950 font-mono">
                          {lineStatus?.quota?.remaining ?? 300}
                        </span>
                        <span className="text-gray-500 text-[11px]">
                          / {lineStatus?.quota?.limit ?? 300} คงเหลือ
                        </span>
                      </div>
                      <div className="mt-1.5 w-full bg-purple-200/70 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-700 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, ((lineStatus?.quota?.remaining ?? 300) / (lineStatus?.quota?.limit ?? 300)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-purple-800 mt-2 font-medium">
                      ส่งไปแล้วเดือนนี้: <strong>{lineStatus?.quota?.totalUsage ?? 0}</strong> ข้อความ
                    </p>
                  </div>
                </div>

                {/* Connected Groups List */}
                <div className="pt-2 space-y-2">
                  <h4 className="text-xs font-bold text-gray-700">กลุ่ม LINE ที่จะได้รับแจ้งเตือนอัตโนมัติ:</h4>
                  {lineStatus?.activeGroupIds && lineStatus.activeGroupIds.length > 0 ? (
                    <div className="space-y-2">
                      {lineStatus.activeGroupIds.map((gid) => (
                        <div
                          key={gid}
                          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-mono font-bold text-emerald-950">{gid}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTestLinePush(gid)}
                              disabled={testingLine}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
                            >
                              {testingLine ? "กำลังส่ง..." : "ทดสอบส่ง"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGroup(gid)}
                              className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      ยังไม่มี Group ID บันทึกในระบบ (สามารถเพิ่มด้วยตนเองด้านล่าง หรือพิมพ์ &lsquo;group id&rsquo; ในกลุ่มแชท)
                    </p>
                  )}
                </div>

                {/* Manual Add Group ID Form */}
                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="ใส่ LINE Group ID ด้วยตนเอง (ขึ้นต้นด้วย C... หรือ R...)"
                    value={manualGroupId}
                    onChange={(e) => setManualGroupId(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualGroup}
                    disabled={addingGroupId}
                    className="rounded-xl bg-purple-900 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    {addingGroupId ? "กำลังเพิ่ม..." : "+ เพิ่ม Group ID"}
                  </button>
                </div>

                {lineTestResult && (
                  <div
                    className={`rounded-xl p-3 text-xs font-bold border ${
                      lineTestResult.success
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-rose-300 bg-rose-50 text-rose-900"
                    }`}
                  >
                    {lineTestResult.message}
                  </div>
                )}
              </div>

              {/* Broadcast Custom Message Card */}
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/50 to-white p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                  <Send className="h-4 w-4 text-purple-700" />
                  <span>2. ส่งประกาศข้อความเข้ากลุ่ม LINE (Broadcast Announcement)</span>
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  พิมพ์ข้อความเพื่อส่งประกาศเข้ากลุ่ม LINE ของนักศึกษาและอาจารย์ VISTEC ทุกกลุ่มที่เชื่อมต่ออยู่
                </p>
                <textarea
                  rows={3}
                  placeholder="เช่น: 🍱 [VEATEC] แจ้งเตือน: วันนี้มีร้านอาหารเปิดรอบพิเศษส่งฟรีถึงตึก M4 สั่งได้ถึง 11:15 น.!"
                  value={customBroadcastMsg}
                  onChange={(e) => setCustomBroadcastMsg(e.target.value)}
                  className="w-full rounded-xl border border-purple-200 bg-white p-3 text-xs text-gray-900 focus:outline-purple-500"
                />
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={sendingBroadcast || !customBroadcastMsg.trim()}
                  className="rounded-xl bg-purple-900 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {sendingBroadcast ? "กำลังส่งประกาศ..." : "📢 ส่งประกาศเข้ากลุ่มเดี๋ยวนี้"}
                </button>
              </div>

              {/* Webhook URL & Instructions Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-sm text-gray-900">3. ข้อมูล Webhook URL สำหรับ LINE Developers Console</h3>
                <p className="text-xs text-gray-600">
                  นำ URL ด้านล่างนี้ไปกรอกในช่อง <strong>Webhook URL</strong> บน LINE Developers Console:
                </p>
                <div className="flex items-center justify-between rounded-xl bg-slate-900 text-slate-100 p-3 text-xs font-mono">
                  <span className="truncate">https://one-order-seven.vercel.app/api/line/webhook</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("https://one-order-seven.vercel.app/api/line/webhook");
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="rounded bg-white/20 hover:bg-white/30 text-white px-2 py-1 text-xs font-bold transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    {copiedWebhook ? "คัดลอกแล้ว!" : "คัดลอก"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* THAILLM (OPENTHAIGPT) STATUS & PING MONITOR PANE */}
        {/* ========================================================= */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-purple-300 transition-colors">
          {/* Collapsible Header */}
          <div
            onClick={() => setIsLlmPaneOpen((prev) => !prev)}
            className="p-3.5 sm:p-4.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-linear-to-r from-purple-50/50 to-transparent hover:from-purple-50/90 transition-all select-none"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="rounded-xl sm:rounded-2xl bg-purple-100/90 text-purple-800 p-2 sm:p-2.5 shrink-0 shadow-2xs">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                      llmStatus?.online
                        ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300"
                        : llmStatus?.online === false
                        ? "bg-rose-100/80 text-rose-800 border border-rose-300"
                        : "bg-slate-100 text-slate-700 border border-slate-300"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        llmStatus?.online
                          ? "bg-emerald-500 animate-pulse"
                          : llmStatus?.online === false
                          ? "bg-rose-500"
                          : "bg-slate-400"
                      }`}
                    />
                    <span>
                      {llmStatus?.online
                        ? `Online (${llmStatus.latencyMs} ms)`
                        : llmStatus?.online === false
                        ? "Offline / Error"
                        : "Checking..."}
                    </span>
                  </span>

                  <span className="rounded-md bg-purple-100/80 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                    OpenThaiGPT 8B
                  </span>

                  <span className="rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold hidden sm:inline">
                    5 req/s (200 req/min)
                  </span>

                  <span className="text-xs font-black text-slate-900 ml-1">
                    ThaiLLM Service &amp; Typo Sanitizer
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                  <span>
                    Model: <strong className="text-purple-700 font-bold">{llmStatus?.config.model || "openthaigpt-thaillm-8b-instruct-v7.2"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Endpoint: <span className="font-mono">{llmStatus?.config.apiUrl || "http://thaillm.or.th/api/v1/chat/completions"}</span>
                  </span>
                  <span>•</span>
                  <span>
                    API Key: <span className="font-mono font-bold text-slate-700">{llmStatus?.config.maskedKey || "K25Cnc...2pQe"}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchLlmStatus();
                }}
                disabled={loadingLlmStatus}
                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="ทดสอบ Ping ThaiLLM"
              >
                <RefreshCw
                  className={`h-3 w-3 text-purple-600 ${loadingLlmStatus ? "animate-spin" : ""}`}
                />
                <span>{loadingLlmStatus ? "กำลัง Ping..." : "⚡ ทดสอบ Ping"}</span>
              </button>

              <span className="text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors flex items-center gap-1">
                <span>{isLlmPaneOpen ? "ย่อเก็บ" : "ขยายดูรายละเอียด"}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isLlmPaneOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </div>
          </div>

          {/* Expanded Content */}
          {isLlmPaneOpen && (
            <div className="border-t border-slate-200 p-4 sm:p-5 space-y-5 bg-slate-50/40">
              {/* 1. Ping & Diagnostics Section */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-600" />
                      <span>1. สถานะการเชื่อมต่อ &amp; ค่า Latency (Live Ping)</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      ตรวจวัดความเร็วการตอบสนองจริงของเซิร์ฟเวอร์ ThaiLLM API
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fetchLlmStatus}
                    disabled={loadingLlmStatus}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingLlmStatus ? "animate-spin" : ""}`} />
                    <span>{loadingLlmStatus ? "กำลังทดสอบ..." : "⚡ ส่ง Ping ทดสอบเดี๋ยวนี้"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 block">สถานะเซิร์ฟเวอร์</span>
                    <span className="text-base font-black flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${llmStatus?.online ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className={llmStatus?.online ? "text-emerald-700" : "text-rose-700"}>
                        {llmStatus?.online ? "พร้อมใช้งาน (Online)" : "ขัดข้อง (Offline)"}
                      </span>
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {llmStatus?.error ? `Error: ${llmStatus.error}` : "HTTP 200 OK"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 block">ความเร็ว Ping (Latency)</span>
                    <span className="text-base font-black font-mono text-purple-900">
                      {llmStatus?.latencyMs !== null && llmStatus?.latencyMs !== undefined
                        ? `${llmStatus.latencyMs} ms`
                        : "ยังไม่ได้วัด"}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold block">
                      {llmStatus?.latencyMs && llmStatus.latencyMs < 500 ? "⚡ ตอบสนองเร็วมาก" : "ปกติ"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 block">Rate Limit Hits (429)</span>
                    <span className="text-base font-black font-mono flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          (llmStatus?.telemetry?.rateLimitHits || 0) > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                        }`}
                      />
                      <span className={(llmStatus?.telemetry?.rateLimitHits || 0) > 0 ? "text-amber-700" : "text-emerald-700"}>
                        {llmStatus?.telemetry?.rateLimitHits || 0} ครั้ง
                      </span>
                    </span>
                    <span className="text-[10px] text-gray-400 block truncate">
                      {llmStatus?.telemetry?.lastRateLimitIso
                        ? `ล่าสุด: ${new Date(llmStatus.telemetry.lastRateLimitIso).toLocaleTimeString("th-TH")} น.`
                        : "ไม่เคยชนลิมิต (5 req/s)"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 block">ตรวจสอบล่าสุด</span>
                    <span className="text-xs font-bold text-gray-800 block truncate">
                      {llmStatus?.testedAt
                        ? new Date(llmStatus.testedAt).toLocaleTimeString("th-TH") + " น."
                        : "-"}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      {llmStatus?.testedAt ? llmStatus.testedAt.split("T")[0] : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Configuration Parameters Section */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <Server className="h-4 w-4 text-purple-600" />
                    <span>2. พารามิเตอร์การตั้งค่าโมเดล (Configuration Parameters)</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    ค่าคอนฟิกที่ระบบใช้เรียกใช้งาน ThaiLLM เพื่อตรวจจับคำพิมพ์ผิด
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100">
                    <span className="text-[10px] font-bold text-gray-500 block">Model ID</span>
                    <span className="font-mono font-bold text-purple-950 text-xs block truncate mt-0.5" title="openthaigpt-thaillm-8b-instruct-v7.2">
                      openthaigpt-thaillm-8b-instruct-v7.2
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100">
                    <span className="text-[10px] font-bold text-gray-500 block">Rate Limits</span>
                    <span className="font-bold text-gray-900 block mt-0.5">
                      5 req/s (200 req/min)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100">
                    <span className="text-[10px] font-bold text-gray-500 block">Temperature</span>
                    <span className="font-mono font-bold text-gray-900 block mt-0.5">
                      0.1 (เน้นความแม่นยำสูง)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100">
                    <span className="text-[10px] font-bold text-gray-500 block">Max Tokens</span>
                    <span className="font-mono font-bold text-gray-900 block mt-0.5">
                      1,500 tokens
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-gray-500 block">API Endpoint URL:</span>
                      <span className="font-mono text-gray-900 font-bold break-all">
                        http://thaillm.or.th/api/v1/chat/completions
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold self-start sm:self-auto shrink-0 bg-white px-2 py-0.5 rounded border border-gray-200">
                      OpenAI Compatible
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-gray-500 block">Consumer ID:</span>
                      <span className="font-mono text-gray-900 font-bold">
                        278dcd0f-eb68-4494-9387-e635c99cbb68
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500">API Key:</span>
                      <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {llmStatus?.config.maskedKey || "K25Cnc...2pQe"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Interactive Quick Test Sandbox */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>3. ทดสอบตรวจแก้คำผิดสด (Live Prompt Sandbox)</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    พิมพ์ชื่อเมนูอาหารที่มีคำสะกดผิด เพื่อทดสอบการประมวลผลของ ThaiLLM ได้ทันที
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={interactiveTestInput}
                      onChange={(e) => setInteractiveTestInput(e.target.value)}
                      placeholder="เช่น จิ่มจุ่ม, ข้าวบรอคคอลี่, ผัดซีอิ้ว"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={testingInteractiveLlm || !interactiveTestInput.trim()}
                    onClick={handleTestInteractiveLlm}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {testingInteractiveLlm ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>กำลังถาม AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        <span>ส่งทดสอบ AI</span>
                      </>
                    )}
                  </button>
                </div>

                {interactiveTestResult && (
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 flex items-center gap-1.5">
                        {interactiveTestResult.hasTypo ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold text-[11px] border border-amber-300">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            พบคำผิดและแก้ไขแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            สะกดถูกต้องแล้ว
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-gray-500 text-[11px]">
                        Latency: {interactiveTestResult.latencyMs} ms
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-mono line-through">
                        {interactiveTestResult.original}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                        {interactiveTestResult.sanitized}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "orders"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Package className="h-4 w-4" />
            <span>ออเดอร์ทั้งหมด ({allOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("shops")}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "shops"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Store className="h-4 w-4" />
            <span>ร้านอาหาร ({shops.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("desks");
              fetchLocations();
            }}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "desks"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>จุดส่ง ({locations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("batches")}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "batches"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>กระดาน ({batches.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("suggestions");
              fetchSuggestions();
            }}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "suggestions"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MessageSquareHeart className="h-4 w-4" />
            <span>ข้อเสนอแนะ ({suggestions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("frequently_ordered")}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "frequently_ordered"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>เมนูสั่งบ่อย ({frequentlyOrderedDishes.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("ai_sanitizer");
              if (Object.keys(sanitizedRecords).length === 0) {
                fetchSanitizedMenus();
              }
            }}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "ai_sanitizer"
                ? "border-purple-800 text-purple-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Bot className="h-4 w-4 text-purple-600" />
            <span>คลีนเมนู AI (ThaiLLM)</span>
            {Object.values(sanitizedRecords).some((r) => r.hasTypo) && (
              <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                {Object.values(sanitizedRecords).filter((r) => r.hasTypo).length} แก้แล้ว
              </span>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 0: CROWDSOURCED ORDERS MASTER & FILTER */}
        {/* ========================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-700" />
                  <span>บันทึกออเดอร์รวมจากผู้ใช้ ({allOrders.length} ออเดอร์)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  ฐานข้อมูลคำสั่งซื้อจริง (Crowdsourced Order Records) แยกดูตามร้านค้าและจุดส่ง/ตึกได้อย่างอิสระ
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyFilteredOrdersSummary}
                  disabled={filteredOrders.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-purple-900 shadow-2xs transition-colors cursor-pointer"
                  title="คัดลอกสรุปรายการที่กรองไว้ทั้งหมด"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedOrderSummary ? "✓ คัดลอกแล้ว!" : "คัดลอกสรุปรายการ"}</span>
                </button>

                <button
                  type="button"
                  onClick={refreshData}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>รีเฟรช</span>
                </button>
              </div>
            </div>

            {/* Metrics KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-purple-600" />
                  <span>ออเดอร์ในตัวกรอง</span>
                </span>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {filteredOrders.length} <span className="text-xs text-gray-500 font-normal">/ {allOrders.length}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
                  <span>จำนวนกล่องรวม</span>
                </span>
                <p className="text-xl font-black text-amber-900 font-mono">
                  {ordersMetrics.totalBoxes} <span className="text-xs text-gray-500 font-normal">กล่อง</span>
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <span>ยอดเงินรวม</span>
                </span>
                <p className="text-xl font-black text-emerald-700 font-mono">
                  ฿{ordersMetrics.totalRevenue.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  <span>เมนูยอดนิยม</span>
                </span>
                <p className="text-xs font-bold text-purple-950 truncate" title={ordersMetrics.topDish}>
                  {ordersMetrics.topDish}
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="ค้นหาชื่อผู้สั่ง, LINE, เบอร์โทร, หรือชื่อเมนู..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-600 focus:outline-hidden"
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter: Shop */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Store className="h-3.5 w-3.5 text-gray-500" />
                  <select
                    value={orderShopFilter}
                    onChange={(e) => setOrderShopFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-800 shadow-2xs focus:border-purple-500"
                  >
                    <option value="all">ทุกร้านค้า ({shops.length})</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter: Building / Location */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-gray-500" />
                  <select
                    value={orderLocationFilter}
                    onChange={(e) => setOrderLocationFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-800 shadow-2xs focus:border-purple-500"
                  >
                    <option value="all">ทุกจุดส่ง/ตึก ({locations.length})</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter: Date */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  <select
                    value={orderDateFilter}
                    onChange={(e) => setOrderDateFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-800 shadow-2xs focus:border-purple-500"
                  >
                    <option value="all">ทุกวันที่</option>
                    <option value="today">เฉพาะวันนี้</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 space-y-2">
                <Package className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm font-bold">ไม่พบรายการออเดอร์ตามเงื่อนไขที่เลือก</p>
                <p className="text-xs text-gray-400">ลองล้างตัวกรองหรือคำค้นหาเพื่อดูออเดอร์ทั้งหมด</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((ord) => {
                  const lineTag = ord.customerLineId ? `@${ord.customerLineId.replace(/^@/, "")}` : ord.customerName;
                  return (
                    <div
                      key={ord.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-purple-300 transition-all space-y-2.5"
                    >
                      {/* Top Bar: Box #, Shop, Building, Date, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center justify-center rounded-lg bg-purple-900 text-white font-mono font-black text-xs px-2 py-0.5">
                            #{ord.orderNumber}
                          </span>
                          <span className="font-bold text-xs text-gray-900">
                            {ord.shopName}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 text-[11px] font-bold">
                            <MapPin className="h-3 w-3 text-purple-600" />
                            <span>{ord.locationName}</span>
                          </span>
                          <span className="text-[11px] text-gray-500">
                            วันที่ {ord.batchDate} {ord.createdAt ? `• ${ord.createdAt.slice(11, 16)} น.` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 font-bold uppercase">
                            {ord.batchStatus}
                          </span>
                          {ord.isSlipVerified ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>ตรวจสลิปแล้ว</span>
                            </span>
                          ) : ord.slipImageUrl ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-bold">
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span>มีสลิปแนบ</span>
                            </span>
                          ) : (
                            <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[11px] font-bold">
                              ยังไม่มีสลิป
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Customer Info & Dishes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0.5">
                        {/* Customer */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            ข้อมูลผู้สั่ง
                          </span>
                          <p className="text-xs font-bold text-gray-900">
                            {ord.customerName}
                          </p>
                          <p className="text-xs text-purple-800 font-mono">
                            LINE: {lineTag}
                          </p>
                          {ord.customerPhone && (
                            <p className="text-xs text-gray-600 font-mono">
                              📞 {ord.customerPhone}
                            </p>
                          )}
                        </div>

                        {/* Dishes */}
                        <div className="md:col-span-2 space-y-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            รายการอาหารที่สั่ง
                          </span>
                          <div className="space-y-1">
                            {ord.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between text-xs text-gray-800 bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-100"
                              >
                                <div>
                                  <span className="font-bold">
                                    {it.quantity > 1 ? `${it.quantity}x ` : ""}
                                    {it.name}
                                  </span>
                                  {it.customNote && (
                                    <span className="text-gray-500 text-[11px] ml-1.5 italic">
                                      ({it.customNote})
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-purple-950 ml-2 shrink-0">
                                  ฿{it.price * (it.quantity || 1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer: Total Amount & Slip Preview Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span>รหัสออเดอร์:</span>
                          <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px]">
                            {ord.id}
                          </code>
                        </div>

                        <div className="flex items-center gap-3">
                          {ord.slipImageUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedSlipPhoto({
                                  url: ord.slipImageUrl!,
                                  title: `สลิปโอนเงิน #${ord.orderNumber} (${ord.customerName} - ฿${ord.totalAmount})`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>ดูรูปสลิป</span>
                            </button>
                          ) : null}

                          <div className="flex items-center gap-1 text-xs font-bold text-gray-900">
                            <span>ยอดรวม:</span>
                            <span className="font-mono text-base font-black text-purple-950">
                              ฿{ord.totalAmount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: SHOPS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === "shops" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-purple-700" />
                  <span>ร้านอาหาร ({shops.length})</span>
                </h2>
                <p className="text-xs text-gray-500">
                  จัดการข้อมูลร้าน เบอร์โทร และ QR พร้อมเพย์
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddShop}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 transition-colors cursor-pointer self-start sm:self-center"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มร้านอาหาร</span>
              </button>
            </div>

            {shops.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 space-y-2">
                <Store className="h-8 w-8 mx-auto text-gray-400" />
                <p className="font-bold text-sm">ยังไม่มีร้านอาหารในระบบ</p>
                <button
                  onClick={handleOpenAddShop}
                  className="rounded-xl bg-purple-900 px-3 py-1.5 text-xs font-bold text-white"
                >
                  เพิ่มร้านแรก
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.map((s) => (
                  <ShopAdminCard
                    key={s.id}
                    shop={s}
                    onEdit={handleOpenEditShop}
                    onDelete={handleDeleteShop}
                    onZoomQr={setZoomedQr}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DROP-OFF POINTS (DESKS) */}
        {/* ========================================================= */}
        {activeTab === "desks" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-700" />
                  <span>จุดส่งอาหาร ({locations.length})</span>
                </h2>
                <p className="text-xs text-gray-500">
                  จัดการโต๊ะวางอาหารประจำตึกและรูปถ่าย
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleOpenAddLocation}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มจุดส่ง</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const guideText =
                      `📍 [VEATEC] จุดส่งอาหาร VISTEC:\n` +
                      locations
                        .map(
                          (l) =>
                            `• [${l.shortCode}] ${l.name}: ${l.deskDetail}${
                              l.mapUrl ? `\n  🗺️ แผนที่: ${l.mapUrl}` : ""
                            }`
                        )
                        .join("\n\n") +
                      `\n\n⚠️ คำแนะนำไรเดอร์: นำกล่องอาหารวางที่โต๊ะประจำตึกตามป้าย และถ่ายรูปส่งเข้า LINE หลังส่งครบ`;
                    navigator.clipboard.writeText(guideText);
                    setCopiedDesk("ALL");
                    setTimeout(() => setCopiedDesk(null), 2000);
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedDesk === "ALL" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                      <span>คัดลอกคู่มือส่ง</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Locations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white shadow-xs ${loc.color || "bg-purple-900"}`}
                        >
                          {loc.shortCode}
                        </span>
                        <div>
                          <h3 className="font-black text-sm text-gray-900">{loc.name}</h3>
                          {loc.nameEn && (
                            <p className="text-[11px] text-gray-500">{loc.nameEn}</p>
                          )}
                        </div>
                      </div>

                      <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-mono font-bold">
                        {loc.shortCode}
                      </span>
                    </div>

                    {/* Desk details */}
                    <div className="rounded-xl bg-purple-50/60 border border-purple-100 p-2.5 space-y-1.5">
                      <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                        ตำแหน่งโต๊ะวางอาหาร:
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-relaxed">
                        {loc.deskDetail}
                      </p>
                      {loc.mapUrl ? (
                        <div className="pt-1 border-t border-purple-100/80 flex items-center justify-between">
                          <a
                            href={loc.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline"
                          >
                            <MapPin className="h-3 w-3 text-purple-600" />
                            <span>พิกัด Google Maps</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                            มีลิงก์ QR
                          </span>
                        </div>
                      ) : (
                        <div className="pt-1 border-t border-purple-100/80 text-[11px] text-gray-400 italic">
                          ยังไม่ได้ใส่ลิงก์แผนที่
                        </div>
                      )}
                    </div>

                    {/* Photo preview */}
                    <div className="relative h-32 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      {loc.photoUrl ? (
                        <img
                          src={loc.photoUrl}
                          alt={loc.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Building2 className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                        [{loc.shortCode}]
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLocation(loc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit className="h-3 w-3" />
                      <span>แก้ไขจุดส่ง</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BATCH MONITORING */}
        {/* ========================================================= */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">กระดานออเดอร์ ({batches.length})</h2>
                <p className="text-xs text-gray-500">
                  ติดตามสถานะรอบสั่งอาหาร
                </p>
              </div>

              <button
                onClick={refreshData}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs self-start sm:self-center cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>รีเฟรช</span>
              </button>
            </div>

            {batches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                ยังไม่มีรอบสั่งอาหารในขณะนี้
              </div>
            ) : (
              <div className="grid gap-3">
                {batches.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-gray-900">{b.shop.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            b.isMinMet
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.isMinMet ? "ส่งฟรีถึงตึก ✅" : "ยังไม่ถึงเป้า (฿" + b.targetMinAmount + ")"}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-bold">
                          {b.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>วันที่: <strong>{b.date}</strong></span>
                        <span>{formatCutoffDisplay(b.cutoffTime, b.date, "th", true)}</span>
                        <span>จุดส่ง: <strong>{b.buildingName || "ตึก M4"}</strong></span>
                        <span>
                          ยอดรวม: <strong className="text-purple-900 font-mono">฿{b.currentTotalAmount}</strong> / ฿{b.targetMinAmount}
                        </span>
                        <span>จำนวน: <strong>{b.orderCount} กล่อง</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <Link
                        href={`/order/${b.id}/leader`}
                        className="rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-900 shadow-2xs"
                      >
                        <span>หน้าหัวหน้าตี้ ↗</span>
                      </Link>

                      {b.status === "OPEN" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateBatchStatus(b.id, "ORDERED")}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-2xs cursor-pointer"
                        >
                          ปิดรับ &rarr; สั่งร้านแล้ว
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateBatchStatus(b.id, "OPEN")}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                        >
                          เปิดรับใหม่
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SUGGESTIONS */}
        {/* ========================================================= */}
        {activeTab === "suggestions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquareHeart className="h-5 w-5 text-purple-700" />
                  <span>ข้อเสนอแนะ &amp; ติชมจากผู้ใช้ ({suggestions.length})</span>
                </h2>
                <p className="text-xs text-gray-500">
                  รวมคำแนะนำร้านอาหารและแจ้งปัญหาการใช้งาน
                </p>
              </div>

              <button
                type="button"
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingSuggestions ? "animate-spin" : ""}`}
                />
                <span>รีเฟรช</span>
              </button>
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                ยังไม่มีข้อเสนอแนะใหม่ในขณะนี้
              </div>
            ) : (
              <div className="grid gap-3">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-bold">
                          {s.category || "ทั่วไป"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {s.createdAt ? new Date(s.createdAt).toLocaleString("th-TH") : ""}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{s.message}</p>
                      {s.name && (
                        <p className="text-xs text-gray-500">โดย: {s.name}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSuggestion(s.id)}
                      className="self-end sm:self-center text-gray-400 hover:text-rose-600 p-2 cursor-pointer"
                      title="ลบข้อเสนอแนะ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: FREQUENTLY ORDERED DISHES */}
        {/* ========================================================= */}
        {activeTab === "frequently_ordered" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-700" />
                  <span>เมนูสั่งบ่อย ({filteredFrequentDishes.length})</span>
                </h2>
                <p className="text-xs text-gray-500">
                  เมนูยอดฮิตจากประวัติสั่งจริง เพิ่มเป็นเมนูแนะนำร้านได้ทันที
                </p>
              </div>

              {/* Shop Filter Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 shrink-0">เลือกร้าน:</span>
                <select
                  value={frequentShopFilter}
                  onChange={(e) => setFrequentShopFilter(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs focus:border-purple-500"
                >
                  <option value="all">ทุกร้านค้า (รวมทั้งหมด)</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick explanation banner */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 text-xs text-purple-950 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  💡 เมนูแนะนำของร้าน:
                </p>
                <p className="text-slate-600 leading-relaxed">
                  แถบปุ่มด่วนบนหน้ากระดานดึงมาจาก <strong>menuItems</strong> ในข้อมูลร้านค้า โดยระบบจะนำเมนูที่ตั้งไว้มาแสดงให้ลูกค้ากดเพื่อกรอกชื่อและราคาอัตโนมัติ คุณสามารถดูเมนูที่คนสั่งบ่อยที่สุดด้านล่าง และกดปุ่ม <strong>&ldquo;➕ เพิ่มเป็นเมนูแนะนำ&rdquo;</strong> เพื่อเพิ่มเข้าหน้าร้านได้ทันทีโดยไม่ต้องพิมพ์เอง!
                </p>
              </div>
            </div>

            {/* Dishes Table (Compact Table / No Cards) */}
            {filteredFrequentDishes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500 space-y-2">
                <ShoppingBag className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm font-bold">ยังไม่มีประวัติการสั่งอาหารสำหรับร้านที่เลือก</p>
                <p className="text-xs text-gray-400">เมื่อมีคำสั่งซื้อเข้ามาในระบบ รายการเมนูและจำนวนกล่องจะปรากฏที่นี่</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-3">ร้านค้า</th>
                      <th className="py-3 px-3">ชื่อเมนู</th>
                      <th className="py-3 px-3 text-right">ราคา</th>
                      <th className="py-3 px-3 text-center">จำนวนสั่งสะสม</th>
                      <th className="py-3 px-3 text-right">ยอดรวม</th>
                      <th className="py-3 px-3 text-center">เมนูแนะนำของร้าน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFrequentDishes.map((dish, idx) => {
                      const targetShop = shops.find((s) => s.id === dish.shopId);
                      const isAlreadyInMenu = targetShop?.menuItems?.some(
                        (m) => m.name.trim().toLowerCase() === dish.dishName.trim().toLowerCase()
                      );
                      const isAdding = addingMenuItemShopId === dish.shopId + dish.dishName;

                      return (
                        <tr
                          key={`${dish.shopId}-${dish.dishName}-${idx}`}
                          className="hover:bg-purple-50/30 transition-colors"
                        >
                          {/* Rank */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-black ${
                                idx === 0
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : idx === 1
                                  ? "bg-slate-200 text-slate-800"
                                  : idx === 2
                                  ? "bg-orange-100 text-orange-900"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>

                          {/* Shop */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-block bg-purple-50 text-purple-900 px-2 py-0.5 rounded-lg border border-purple-100 font-bold text-[11px]">
                              {dish.shopName}
                            </span>
                          </td>

                          {/* Dish Name */}
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-gray-900 text-sm">
                              {dish.dishName}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="font-mono font-bold text-orange-600 text-xs">
                              ฿{dish.latestPrice}
                            </span>
                          </td>

                          {/* Total Quantity */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-gray-100 text-gray-800">
                              {dish.totalQuantity} กล่อง
                            </span>
                          </td>

                          {/* Total Revenue */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="font-mono font-bold text-emerald-700 text-xs">
                              ฿{dish.totalRevenue.toLocaleString()}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isAlreadyInMenu ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>ในเมนูแนะนำแล้ว</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isAdding}
                                onClick={() =>
                                  handleAddDishToShopMenu({
                                    name: dish.dishName,
                                    price: dish.latestPrice,
                                    shopId: dish.shopId,
                                    shopName: dish.shopName,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-900 hover:bg-purple-800 text-white px-2.5 py-1 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                              >
                                <Plus className="h-3 w-3" />
                                <span>{isAdding ? "กำลังบันทึก..." : "➕ เพิ่มเป็นเมนูแนะนำ"}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: AI MENU SANITIZER (THAILLM) */}
        {/* ========================================================= */}
        {activeTab === "ai_sanitizer" && (
          <div className="space-y-4">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-700" />
                  <span>คลีนคำผิดชื่อเมนูด้วย AI (ThaiLLM OpenThaiGPT)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  ตรวจจับและแก้คำสะกดผิด วรรณยุกต์ และการทับศัพท์จากออเดอร์จริงของลูกค้าอัตโนมัติ พร้อมบันทึกผลลงระบบ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSanitizedMenus}
                  disabled={loadingSanitizer}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingSanitizer ? "animate-spin" : ""}`} />
                  <span>รีเฟรช</span>
                </button>

                <button
                  type="button"
                  disabled={isSanitizingAll || frequentlyOrderedDishes.length === 0}
                  onClick={handleSanitizeAllMenus}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isSanitizingAll ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังประมวลผลด้วย ThaiLLM...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>✨ สแกนคำผิดทั้งหมดด้วย AI ({frequentlyOrderedDishes.length} เมนู)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notification message */}
            {sanitizerMessage && (
              <div
                className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between border ${
                  sanitizerMessage.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {sanitizerMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{sanitizerMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSanitizerMessage(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-400 block">เมนูออเดอร์ทั้งหมด</span>
                <span className="text-xl font-black text-gray-900 font-mono">
                  {frequentlyOrderedDishes.length}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">รายการจากชุมชน</span>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 block">พบคำผิด & แก้ไขแล้ว</span>
                <span className="text-xl font-black text-amber-900 font-mono">
                  {sanitizerRows.filter((r) => r.hasTypo === true).length}
                </span>
                <span className="text-[10px] text-amber-600 block mt-0.5">วรรณยุกต์/ทับศัพท์</span>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 block">สะกดถูกต้องแล้ว</span>
                <span className="text-xl font-black text-emerald-900 font-mono">
                  {sanitizerRows.filter((r) => r.hasTypo === false && r.isScanned).length}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">ตามพจนานุกรม</span>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-purple-700 block">AI Engine</span>
                <span className="text-sm font-black text-purple-950 truncate block mt-1">
                  OpenThaiGPT 8B
                </span>
                <span className="text-[10px] text-purple-600 block">ThaiLLM (200 req/min)</span>
              </div>
            </div>

            {/* Filters Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเมนูเดิม, ชื่อที่แก้ไขแล้ว, หรือชื่อร้าน..."
                  value={sanitizerSearch}
                  onChange={(e) => setSanitizerSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sanitizerShopFilter}
                  onChange={(e) => setSanitizerShopFilter(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                >
                  <option value="all">ทุกร้านค้า ({shops.length})</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={sanitizerStatusFilter}
                  onChange={(e) => setSanitizerStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-1.5 focus:ring-purple-600"
                >
                  <option value="all">สถานะทั้งหมด</option>
                  <option value="typo">⚠️ พบคำผิด & แก้ไขแล้ว</option>
                  <option value="correct">✅ สะกดถูกต้อง</option>
                  <option value="pending">⏳ ยังไม่ได้สแกน</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {sanitizerRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                ไม่พบรายการเมนูที่ตรงกับเงื่อนไขการค้นหา
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">ร้านค้า (Shop)</th>
                      <th className="py-3 px-4">ชื่อเมนูเดิม (Menu)</th>
                      <th className="py-3 px-4 text-center">จำนวนที่สั่ง (Amount)</th>
                      <th className="py-3 px-4">ชื่อที่คลีนคำผิดแล้ว (Sanitized Menu)</th>
                      <th className="py-3 px-4 text-right">การจัดการ (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sanitizerRows.map((row) => (
                      <tr key={row.key} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                          <span className="inline-block bg-purple-50 text-purple-900 px-2.5 py-0.5 rounded-lg border border-purple-100 font-semibold">
                            {row.shopName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 text-sm block">{row.menu}</span>
                          <span className="text-[10px] text-gray-400 font-mono">฿{row.dish.latestPrice}</span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-gray-100 text-gray-800">
                            {row.amount} กล่อง
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {row.isScanned ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-black ${
                                    row.hasTypo
                                      ? "text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200"
                                      : "text-emerald-900"
                                  }`}
                                >
                                  {row.sanitizedName}
                                </span>
                                {row.hasTypo ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>แก้ไขคำผิดแล้ว</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>สะกดถูกต้อง</span>
                                  </span>
                                )}
                              </div>
                              {row.hasTypo && (
                                <p className="text-[11px] text-gray-500">
                                  เดิม: <del className="text-rose-500">{row.menu}</del> ➔ แก้เป็น:{" "}
                                  <strong className="text-emerald-700 font-bold">{row.sanitizedName}</strong>
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                              <Clock className="h-3.5 w-3.5" />
                              <span>ยังไม่เคยสแกน AI</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={sanitizingSingleKey === row.key || isSanitizingAll}
                              onClick={() => handleSanitizeSingleDish(row.dish)}
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors cursor-pointer disabled:opacity-50"
                              title="สแกนคำผิดด้วย ThaiLLM สำหรับเมนูนี้"
                            >
                              {sanitizingSingleKey === row.key ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3 text-purple-700" />
                              )}
                              <span>{row.isScanned ? "สแกนซ้ำ" : "สแกน AI"}</span>
                            </button>

                            {row.isScanned && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingSanitizedItem({
                                    id: row.record?.id || "",
                                    originalName: row.menu,
                                    sanitizedName: row.sanitizedName || row.menu,
                                    shopName: row.shopName,
                                    amount: row.amount,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                                title="แก้ไขชื่อเมนูนี้ด้วยตนเอง"
                              >
                                <Edit className="h-3 w-3" />
                                <span>แก้ไข</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* MODAL 6: EDIT SANITIZED MENU NAME */}
      {/* ========================================================= */}
      {editingSanitizedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-700" />
                <span>แก้ไขชื่อเมนูมาตรฐาน (Sanitized)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSanitizedItem(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400 block font-bold">ร้านค้า:</span>
                <span className="font-bold text-gray-900 text-sm">{editingSanitizedItem.shopName}</span>
              </div>

              <div>
                <span className="text-gray-400 block font-bold">ชื่อเมนูเดิมจากลูกค้า:</span>
                <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg block font-mono">
                  {editingSanitizedItem.originalName} ({editingSanitizedItem.amount} กล่อง)
                </span>
              </div>

              <div>
                <label className="text-gray-700 block font-bold mb-1">
                  ชื่อเมนูหลังตรวจแก้คำผิด (Sanitized Name):
                </label>
                <input
                  type="text"
                  value={editingSanitizedItem.sanitizedName}
                  onChange={(e) =>
                    setEditingSanitizedItem({
                      ...editingSanitizedItem,
                      sanitizedName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  placeholder="พิมพ์ชื่อเมนูที่ถูกต้อง..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingSanitizedItem(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSaveManualSanitized(
                    editingSanitizedItem.id,
                    editingSanitizedItem.originalName,
                    editingSanitizedItem.sanitizedName
                  )
                }
                className="rounded-xl bg-purple-900 hover:bg-purple-800 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer active:scale-98"
              >
                💾 บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT SHOP */}
      {/* ========================================================= */}
      {showShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-700" />
                <span>{editingShopId ? `แก้ไขร้าน: ${shopName}` : "เพิ่มร้านอาหารใหม่เข้าสู่ระบบ"}</span>

              </h3>
              <button
                type="button"
                onClick={() => setShowShopModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShop} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">ชื่อร้านอาหาร (Shop Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ข้าวขาหมูเจ๊วรรณ"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">ชื่อภาษาอังกฤษ (English Name)</label>
                  <input
                    type="text"
                    placeholder="e.g. Pork Leg Rice"
                    value={shopNameEn}
                    onChange={(e) => setShopNameEn(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">หมวดหมู่ / สไตล์อาหาร</label>
                  <input
                    type="text"
                    placeholder="เช่น อาหารตามสั่ง, ข้าวมันไก่"
                    value={shopCuisine}
                    onChange={(e) => setShopCuisine(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">เป้ายอดส่งฟรี (฿)</label>
                  <input
                    type="number"
                    value={shopMinDelivery}
                    onChange={(e) => setShopMinDelivery(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">เบอร์โทรร้านค้า *</label>
                <input
                  type="tel"
                  required
                  placeholder="08x-xxx-xxxx"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                />
                <p className="text-[10px] text-gray-500 mt-1">ใช้สำหรับติดต่อร้านค้าและแสดงปุ่มโทรออกในระบบ (ระบบไม่ใช้ LINE ID ร้านค้าแล้ว)</p>
              </div>

              {/* Google Maps URL */}
              <div>
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  <span>ลิงก์ Google Maps สำหรับดูเมนูร้าน (Google Maps URL)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={shopGmapUrl}
                  onChange={(e) => setShopGmapUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  หากเว้นว่าง ระบบจะสร้างลิงก์ค้นหาร้านบน Google Maps ระยอง ให้อัตโนมัติ
                </p>
              </div>

              {/* Shop Active Status & Open Days (Mon - Sun) */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/70 pb-3">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">สถานะเปิด/ปิดร้าน (Shop Active Status)</span>
                    <span className="text-[11px] text-gray-500">
                      {shopIsActive ? "เปิดรับออเดอร์ในระบบปกติ" : "ปิดรับออเดอร์ชั่วคราว (หัวหน้าตี้จะไม่สามารถเปิดตี้ร้านนี้ได้)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShopIsActive(!shopIsActive)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      shopIsActive
                        ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${shopIsActive ? "bg-white animate-pulse" : "bg-gray-500"}`} />
                    <span>{shopIsActive ? "🟢 เปิดใช้งาน (Active)" : "⚪ ปิดร้านชั่วคราว (Inactive)"}</span>
                  </button>
                </div>

                {/* Day of Week Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-900">
                      วันเปิดทำการ (Open Days Mon - Sun)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShopOpenDays([1, 2, 3, 4, 5])}
                        className="text-[10px] font-bold text-purple-700 hover:underline px-1.5 py-0.5 rounded bg-purple-50"
                      >
                        จ.-ศ.
                      </button>
                      <button
                        type="button"
                        onClick={() => setShopOpenDays([1, 2, 3, 4, 5, 6, 0])}
                        className="text-[10px] font-bold text-purple-700 hover:underline px-1.5 py-0.5 rounded bg-purple-50"
                      >
                        ทุกวัน
                      </button>
                      <button
                        type="button"
                        onClick={() => setShopOpenDays([6, 0])}
                        className="text-[10px] font-bold text-purple-700 hover:underline px-1.5 py-0.5 rounded bg-purple-50"
                      >
                        ส.-อา.
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = shopOpenDays.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setShopOpenDays(shopOpenDays.filter((x) => x !== d.day));
                            } else {
                              setShopOpenDays([...shopOpenDays, d.day]);
                            }
                          }}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-900 text-white border-purple-900 shadow-xs scale-102"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="text-[11px] font-bold">{d.short}</span>
                          <span className={`text-[9px] ${isSelected ? "text-purple-200" : "text-gray-400"}`}>{d.en}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    สรุปวันทำการ: <strong className="text-gray-800">{formatOpenDaysText(shopOpenDays)}</strong>
                  </div>
                </div>
              </div>

              {/* Direct PromptPay Section - Only QR Image */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-purple-700" />
                  <span>รูปภาพ QR Code พร้อมเพย์ร้าน (PromptPay QR Image)</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  อัปโหลดรูปภาพ QR Code พร้อมเพย์ของร้านสำหรับให้สมาชิกลงขันโอนเงิน (ระบบเรียบง่าย ไม่ต้องระบุเบอร์หรือชื่อบัญชี)
                </p>

                {shopPromptPayQrUrl && (
                  <div className="relative h-28 w-28 rounded-xl border border-purple-200 overflow-hidden bg-white shadow-2xs">
                    <img src={shopPromptPayQrUrl} alt="QR Preview" className="h-full w-full object-contain p-1" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 text-white px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors shrink-0 shadow-2xs">
                    <Upload className="h-3.5 w-3.5" />
                    <span>อัปโหลดรูป QR ร้าน</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadShopImageFile(e, "qr")}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="หรือวางลิงก์รูป QR Image URL"
                    value={shopPromptPayQrUrl}
                    onChange={(e) => setShopPromptPayQrUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Shop Logo / Menu Image Box */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-2">
                <label className="text-xs font-bold text-gray-900 block">
                  รูปโลโก้ / ภาพถ่ายหน้าร้าน / เมนู
                </label>
                {shopMenuImageUrl && (
                  <div className="relative h-24 w-24 rounded-xl border overflow-hidden bg-white mb-2">
                    <img src={shopMenuImageUrl} alt="Shop Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 text-white px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors shrink-0">
                    <Camera className="h-3.5 w-3.5" />
                    <span>อัปโหลดรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadShopImageFile(e, "menu")}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="หรือใส่ลิงก์ URL รูปภาพ"
                    value={shopMenuImageUrl}
                    onChange={(e) => setShopMenuImageUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900">
                    รายการเมนูอาหาร ({shopMenuItems.length}) — <span className="text-purple-700">สามารถกดปุ่ม [พร้อมขาย / ปิดเมนู] ได้ที่นี่</span>
                  </label>
                  <span className="text-[10px] text-gray-400">เมนูที่ปิดจะไม่ขึ้นให้ลูกค้ากดสั่งหรือ AI แนะนำ</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {shopMenuItems.map((dish, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                        dish.isAvailable !== false
                          ? "bg-gray-50 border-gray-200"
                          : "bg-rose-50/60 border-rose-200 text-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleDishAvailable(idx)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                            dish.isAvailable !== false
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                          }`}
                          title="กดเพื่อเปิด/ปิดเมนูนี้"
                        >
                          {dish.isAvailable !== false ? "✓ พร้อมขาย" : "✕ ปิดเมนู"}
                        </button>
                        <span className={`font-semibold truncate ${dish.isAvailable !== false ? "text-gray-800" : "text-gray-400 line-through"}`}>
                          {dish.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-bold ${dish.isAvailable !== false ? "text-purple-900" : "text-gray-400"}`}>
                          ฿{dish.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDish(idx)}
                          className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="ลบเมนูนี้"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="ชื่อเมนูใหม่"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="ราคา"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    className="w-20 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddDish}
                    className="rounded-lg bg-purple-900 px-3 py-1 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer"
                  >
                    + เพิ่มเมนู
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowShopModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingShop}
                  className="rounded-xl bg-purple-900 px-5 py-2 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer disabled:opacity-50"
                >
                  {savingShop ? "กำลังบันทึก..." : editingShopId ? "บันทึกการแก้ไข" : "บันทึกร้านอาหารใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD / EDIT LOCATION (DESK) */}
      {/* ========================================================= */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-700" />
                <span>{editingLocationId ? `แก้ไขจุดส่ง: ${locName}` : "เพิ่มจุดส่งอาหาร / อาคารใหม่"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">ชื่ออาคาร / ตึก (Building Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตึก M4, ตึก ESE"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">รหัสย่อ (Short Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น M4, MSE, ESE"
                    value={locShortCode}
                    onChange={(e) => setLocShortCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">รายละเอียดตำแหน่งโต๊ะรับอาหาร (Desk Detail) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เคาน์เตอร์ชั้น 1 - โต๊ะวางอาหาร Delivery ตึก M4"
                  value={locDeskDetail}
                  onChange={(e) => setLocDeskDetail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">
                    ลิงก์ Google Maps จุดส่งอาหาร (Map Link)
                  </label>
                  {locMapUrl && (
                    <a
                      href={locMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>เปิดดูแผนที่</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="เช่น https://maps.app.goo.gl/... หรือ https://maps.google.com/?q=..."
                  value={locMapUrl}
                  onChange={(e) => setLocMapUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  ระบบจะนำลิงก์นี้ไปสร้างเป็น QR Code บนภาพใบสรุปยาว และใส่ในข้อความแชร์ออเดอร์เข้า LINE
                </p>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  รูปภาพจุดวางอาหารประจำอาคาร
                </label>
                {locPhotoUrl && (
                  <div className="relative h-28 w-full rounded-xl border overflow-hidden bg-gray-100 mb-2">
                    <img src={locPhotoUrl} alt="Desk Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 text-white px-3 py-1.5 text-xs font-bold cursor-pointer hover:bg-purple-800 transition-colors shrink-0">
                    <Camera className="h-3.5 w-3.5" />
                    <span>อัปโหลดรูปโต๊ะ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLocationPhoto}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="หรือใส่ลิงก์ URL รูปภาพ"
                    value={locPhotoUrl}
                    onChange={(e) => setLocPhotoUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="rounded-xl bg-purple-900 px-5 py-2 text-xs font-bold text-white hover:bg-purple-800 cursor-pointer disabled:opacity-50"
                >
                  {savingLocation ? "กำลังบันทึก..." : editingLocationId ? "บันทึกการแก้ไข" : "บันทึกจุดส่งใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoom QR Modal */}
      {zoomedQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setZoomedQr(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedQr(null)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-purple-50 text-purple-900 mb-1">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-gray-900">{zoomedQr.title}</h3>
              {zoomedQr.accountName && (
                <p className="text-xs text-gray-600">ชื่อบัญชี: <strong>{zoomedQr.accountName}</strong></p>
              )}
              {zoomedQr.number && (
                <p className="text-xs font-mono text-purple-900 bg-purple-50 inline-block px-2.5 py-0.5 rounded-lg font-bold">
                  {zoomedQr.number}
                </p>
              )}
            </div>

            <div className="relative mx-auto w-64 h-64 rounded-2xl border-2 border-dashed border-purple-200 bg-white p-3 shadow-inner flex items-center justify-center">
              <img
                src={zoomedQr.url}
                alt={zoomedQr.title}
                className="h-full w-full object-contain rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              {zoomedQr.number ? (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(zoomedQr.number?.replace(/\D/g, "") || "");
                    alert(`คัดลอกเลขพร้อมเพย์ ${zoomedQr.number} แล้ว`);
                  }}
                  className="flex-1 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 py-2 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                >
                  คัดลอกเลขพร้อมเพย์
                </button>
              ) : (
                <a
                  href={zoomedQr.url}
                  download="promptpay-qr.png"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 py-2 text-xs font-bold text-purple-900 transition-colors cursor-pointer"
                >
                  เปิดดูภาพเต็ม / บันทึกรูป
                </a>
              )}
              <button
                type="button"
                onClick={() => setZoomedQr(null)}
                className="flex-1 rounded-xl bg-purple-900 hover:bg-purple-800 text-white py-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Slip Photo Full View */}
      {selectedSlipPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-w-md w-full rounded-2xl bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-gray-800 truncate pr-2">
                {selectedSlipPhoto.title}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedSlipPhoto(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-950 max-h-[70vh] flex items-center justify-center border border-gray-200">
              <img
                src={selectedSlipPhoto.url}
                alt={selectedSlipPhoto.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={selectedSlipPhoto.url}
                download="slip-transfer.jpg"
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 py-2 text-xs font-bold text-purple-900 transition-colors cursor-pointer"
              >
                เปิดรูปเต็ม / บันทึกรูป
              </a>
              <button
                type="button"
                onClick={() => setSelectedSlipPhoto(null)}
                className="flex-1 rounded-xl bg-purple-900 hover:bg-purple-800 text-white py-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
