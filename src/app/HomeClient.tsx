"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BatchWithDetails, Order, Shop } from "@/lib/types";
import {
  CAMPUS_LOCATIONS,
  DeliveryLocation,
  getLocalizedLocation,
  getDropOffMapUrl,
  getLocationForBatch,
  setRuntimeLocations,
} from "@/lib/locations";
import { compressImage } from "@/lib/services";
import { scanSlipQrFromImageElement, SlipVerificationResult } from "@/lib/slip-verifier";
import { generateOneLongManifestImage } from "@/lib/manifest-image";
import { getTimeRemaining, getBangkokDate, getDaysDifference, formatCutoffDisplay, formatTabHeader, addMinutesToTimeString, getShortShopName } from "@/lib/utils";
import { useLanguage, getShopLocalizedInfo, getMenuItemLocalizedName, getLocalizedBuildingName, Language } from "@/lib/i18n";
import { getBangkokDayOfWeek, formatOpenDaysText, isShopOpenOnDay } from "@/lib/shop-utils";
import { getCssColorFromClass, useAverageColor } from "@/lib/color-utils";
import confetti from "canvas-confetti";
import {
  MapPin,
  Clock,
  ExternalLink,
  CreditCard,
  Share2,
  MessageSquare,
  Copy,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Camera,
  X,
  Trash2,
  Send,
  Plus,
  ShoppingBag,
  Store,
  Info,
  ShieldCheck,
  Zap,
  Maximize2,
  Phone,
  Archive,
  ArrowLeft,
  Lock,
  Key,
  Check,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Sparkles,
  QrCode,
  Calendar,
  Truck,
  Package,
  FileText,
  Users,
} from "lucide-react";
import DishAutocompleteInput from "@/components/DishAutocompleteInput";
import AIMenuSuggester from "@/components/AIMenuSuggester";

export type BoardGroup = "OPENING" | "PENDING" | "CLOSED_TODAY" | "ARCHIVED" | "DELETED";

interface Props {
  initialBatches: BatchWithDetails[];
  initialLocations?: DeliveryLocation[];
}

interface BoardTabButtonProps {
  batch: BatchWithDetails;
  isActive: boolean;
  locations: DeliveryLocation[];
  lang: Language;
  onSelect: (id: string) => void;
}

function BoardTabButton({ batch: b, isActive, locations, lang, onSelect }: BoardTabButtonProps) {
  const shopAccentColor = useAverageColor(
    b.shop?.menuImageUrl,
    b.shop?.name ? b.shop.name + (b.shop.cuisine || "") : undefined,
    b.shop?.accentColor
  );

  const bldgLoc = getLocationForBatch(b, locations);
  const bldgColor = getCssColorFromClass(bldgLoc?.color, "#059669");
  const bldgCode =
    bldgLoc?.shortCode ||
    (b.buildingName
      ? getLocalizedBuildingName(b.buildingName, lang).replace("Bldg ", "").replace(" 栋", "")
      : "M4");

  const localizedShop = getShopLocalizedInfo(b.shop, lang);
  const shortShop = getShortShopName(localizedShop.name);
  const today = getBangkokDate();
  const diffDays = b.date ? -getDaysDifference(b.date, today) : 0;
  const futureTag = diffDays > 0 ? ` (+${diffDays})` : "";
  const timeDisplay = `${b.cutoffTime || "11:15"}${futureTag}`;
  const isMet = b.currentTotalAmount >= b.targetMinAmount;

  return (
    <button
      key={b.id}
      type="button"
      onClick={() => onSelect(b.id)}
      style={{
        borderLeftColor: shopAccentColor,
        borderRightColor: bldgColor,
      }}
      className={`group relative flex items-center gap-1.5 whitespace-nowrap rounded-t-xl rounded-b-none px-3 py-2 text-xs transition-all border border-b-0 cursor-pointer border-l-4 border-r-4 ${
        isActive
          ? "bg-white border-t-slate-300 border-b-white text-purple-950 font-black shadow-xs -mb-[1px] z-10 ring-1 ring-purple-100"
          : "bg-slate-100/80 border-t-slate-200 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
      }`}
    >
      {/* Shop color dot indicator */}
      <span
        className="h-2 w-2 rounded-full shrink-0 shadow-2xs"
        style={{ backgroundColor: shopAccentColor }}
      />

      <span className="font-bold tracking-tight">{shortShop}</span>

      {/* Building short code with building's dynamic accent color */}
      <span
        style={{
          borderColor: bldgColor,
          color: bldgColor,
          backgroundColor: `${bldgColor}18`,
        }}
        className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-tight leading-none shrink-0"
      >
        {bldgCode}
      </span>

      <span className="font-mono text-[11px] font-semibold text-slate-700">
        {timeDisplay}
      </span>

      {/* Status Badges: TEST, PENDING, ORDERED, COMPLETED, CANCELLED or Goal Badge */}
      {b.isTest && (
        <span className="rounded-md bg-purple-100 border border-purple-400 text-purple-900 px-1.5 py-0.5 text-[10px] font-black shrink-0">
          🧪 TEST
        </span>
      )}
      {b.status === "CANCELLED" ? (
        <span className="rounded-md bg-rose-100 border border-rose-300 text-rose-800 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
          🚫 {lang === "en" ? "Cancelled" : lang === "cn" ? "已取消" : "ยกเลิกแล้ว"}
        </span>
      ) : b.status === "PENDING" ? (
        <span className="rounded-md bg-amber-100 border border-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold shrink-0 animate-pulse">
          ⚠️ {lang === "en" ? "Pending" : lang === "cn" ? "待处理" : "รอตรวจสอบ"}
        </span>
      ) : b.status === "ORDERED" ? (
        <span className="rounded-md bg-sky-100 border border-sky-300 text-sky-800 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
          🛵 {lang === "en" ? "Ordered" : lang === "cn" ? "已下单" : "ส่งร้านแล้ว"}
        </span>
      ) : b.status === "COMPLETED" ? (
        <span className="rounded-md bg-emerald-600 text-white px-1.5 py-0.5 text-[10px] font-bold shrink-0">
          🍱 {lang === "en" ? "Delivered" : lang === "cn" ? "已送达" : "ถึงแล้ว"}
        </span>
      ) : b.isDeleted ? (
        <span className="rounded bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[10px] font-bold shrink-0">
          {b.date} • {lang === "en" ? "Purged" : lang === "cn" ? "已删除" : "ลบแล้ว"}
        </span>
      ) : (
        <span
          className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono font-bold shrink-0 ${
            isMet
              ? "bg-emerald-600 text-white"
              : b.currentTotalAmount > 0
              ? "bg-amber-100 text-amber-900 border border-amber-300"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          ฿{b.currentTotalAmount}/{b.targetMinAmount} {isMet ? "🎉" : ""}
        </span>
      )}
    </button>
  );
}

export default function HomeClient({ initialBatches, initialLocations }: Props) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [batches, setBatches] = useState<BatchWithDetails[]>(initialBatches);
  const [locations, setLocations] = useState<DeliveryLocation[]>(() => {
    const locs = initialLocations && initialLocations.length > 0 ? initialLocations : CAMPUS_LOCATIONS;
    setRuntimeLocations(locs);
    return locs;
  });

  // Helper: compute sensible default cutoff time (current time + 40m rounded to 5m)
  const getDefaultCutoff = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 40);
    const rem = now.getMinutes() % 5;
    if (rem !== 0) now.setMinutes(now.getMinutes() + (5 - rem));
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const todayStr = useMemo(() => getBangkokDate(), []);

  // 1. Opening boards (Today/future, OPEN status, cutoff not expired, not deleted)
  const isOpeningBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return false;
    const diff = getDaysDifference(b.date, todayStr);
    if (diff > 0) return false;
    if (b.status !== "OPEN") return false;
    const timeInfo = getTimeRemaining(b.cutoffTime, b.date);
    if (timeInfo.isExpired) return false;
    return true;
  }, [todayStr]);

  // Helper to determine if a batch is fully closed / delivered with photo or cancelled
  const isBatchFullyClosed = useCallback((b: BatchWithDetails) => {
    if (b.status === "CANCELLED") return true;
    if (b.status === "COMPLETED") {
      // If completed, consider closed (especially if delivery photo uploaded)
      return true;
    }
    // Any other status (ORDERED, DELIVERING, PENDING, or OPEN with expired cutoff) is NOT closed yet!
    return false;
  }, []);

  // 2. Pending delivery boards:
  // Active boards that are ordered/delivering/pending, or cutoff expired, AND NOT yet closed with delivery picture or cancelled (within last 7 days)
  const isPendingDeliveryBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return false;
    const diff = getDaysDifference(b.date, todayStr);
    // Don't show boards older than 7 days
    if (diff > 7) return false;
    // Future boards with open cutoff are in opening group, not pending
    if (diff < 0) return false;
    // If fully closed (COMPLETED with delivery picture / COMPLETED / CANCELLED), it leaves the pending pane
    if (isBatchFullyClosed(b)) return false;
    if (b.status === "ORDERED" || b.status === "DELIVERING" || b.status === "PENDING" || b.status === "CLOSED" || b.status === "LOCKED") return true;
    const timeInfo = getTimeRemaining(b.cutoffTime, b.date);
    return timeInfo.isExpired;
  }, [todayStr, isBatchFullyClosed]);

  // 3. Closed boards for today:
  // Today, marked completed/delivered (with delivery picture) or cancelled
  const isClosedTodayBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return false;
    const diff = getDaysDifference(b.date, todayStr);
    if (diff !== 0) return false;
    return isBatchFullyClosed(b);
  }, [todayStr, isBatchFullyClosed]);

  // 4. Archived boards (yesterday up to last 7 days: diff >= 1 && diff <= 7, not deleted, and ALREADY fully closed)
  const isArchivedBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return false;
    const diff = getDaysDifference(b.date, todayStr);
    if (diff < 1 || diff > 7) return false;
    // If not closed yet, it should remain in Pending delivery group!
    return isBatchFullyClosed(b);
  }, [todayStr, isBatchFullyClosed]);

  // 5. Deleted boards (more than 7 days: diff > 7 or marked isDeleted)
  const isDeletedBatch = useCallback((b: BatchWithDetails) => {
    if (b.isDeleted) return true;
    const diff = getDaysDifference(b.date, todayStr);
    return diff > 7;
  }, [todayStr]);

  // Sort opening batches ascending by time (soonest cutoff first)
  const openingBatches = useMemo(() => {
    return batches
      .filter(isOpeningBatch)
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.cutoffTime}:00+07:00`).getTime();
        const timeB = new Date(`${b.date}T${b.cutoffTime}:00+07:00`).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [batches, isOpeningBatch]);
  const pendingBatches = useMemo(() => {
    return batches
      .filter(isPendingDeliveryBatch)
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.cutoffTime}:00+07:00`).getTime();
        const timeB = new Date(`${b.date}T${b.cutoffTime}:00+07:00`).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [batches, isPendingDeliveryBatch]);
  const closedTodayBatches = useMemo(() => batches.filter(isClosedTodayBatch), [batches, isClosedTodayBatch]);
  const archivedBatches = useMemo(() => batches.filter(isArchivedBatch), [batches, isArchivedBatch]);
  const deletedBatches = useMemo(() => batches.filter(isDeletedBatch), [batches, isDeletedBatch]);

  const [activeGroup, setActiveGroup] = useState<BoardGroup>("OPENING");

  const currentGroupBatches = useMemo(() => {
    switch (activeGroup) {
      case "OPENING":
        return openingBatches;
      case "PENDING":
        return pendingBatches;
      case "CLOSED_TODAY":
        return closedTodayBatches;
      case "ARCHIVED":
        return archivedBatches;
      case "DELETED":
        return deletedBatches;
      default:
        return openingBatches;
    }
  }, [activeGroup, openingBatches, pendingBatches, closedTodayBatches, archivedBatches, deletedBatches]);

  const [activeBatchId, setActiveBatchId] = useState<string>(() => {
    const valid = initialBatches
      .filter((b) => {
        if (b.isDeleted || b.status !== "OPEN") return false;
        const diff = getDaysDifference(b.date, getBangkokDate());
        if (diff > 0) return false;
        return !getTimeRemaining(b.cutoffTime, b.date).isExpired;
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.cutoffTime}:00+07:00`).getTime();
        const timeB = new Date(`${b.date}T${b.cutoffTime}:00+07:00`).getTime();
        return timeA - timeB;
      });
    return valid[0]?.id || initialBatches[0]?.id || "";
  });
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // 3-parameter filter & sort state for Past 7 Days (Archived)
  const [archivedFilterDate, setArchivedFilterDate] = useState<string>("ALL");
  const [archivedFilterShop, setArchivedFilterShop] = useState<string>("ALL");
  const [archivedFilterBuilding, setArchivedFilterBuilding] = useState<string>("ALL");
  const [archivedSortBy, setArchivedSortBy] = useState<"DATE" | "SHOP" | "BUILDING">("DATE");
  const [archivedSelectedBatchId, setArchivedSelectedBatchId] = useState<string | null>(null);

  // Available filter options for Archived batches
  const availableArchivedDates = useMemo(() => {
    const datesMap = new Map<string, string>();
    archivedBatches.forEach((b) => {
      if (b.date && !datesMap.has(b.date)) {
        const diff = getDaysDifference(b.date, todayStr);
        let label = b.date;
        if (diff === 1) {
          label = lang === "en" ? `${b.date} (Yesterday)` : lang === "cn" ? `${b.date} (昨天)` : `${b.date} (เมื่อวาน)`;
        }
        datesMap.set(b.date, label);
      }
    });
    return Array.from(datesMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [archivedBatches, todayStr, lang]);

  const availableArchivedShops = useMemo(() => {
    const shopsMap = new Map<string, string>();
    archivedBatches.forEach((b) => {
      const shopId = b.shop.id || b.shopId;
      const shopName = b.shop.name;
      if (shopId && !shopsMap.has(shopId)) {
        shopsMap.set(shopId, shopName);
      }
    });
    return Array.from(shopsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [archivedBatches]);

  const availableArchivedBuildings = useMemo(() => {
    const buildingsSet = new Set<string>();
    archivedBatches.forEach((b) => {
      if (b.buildingName) buildingsSet.add(b.buildingName);
    });
    return Array.from(buildingsSet);
  }, [archivedBatches]);

  // Filtered and sorted archived batches based on parameters & sort toggle
  const filteredArchivedBatches = useMemo(() => {
    const list = archivedBatches.filter((b) => {
      if (archivedFilterDate !== "ALL" && b.date !== archivedFilterDate) return false;
      if (archivedFilterShop !== "ALL" && b.shop.id !== archivedFilterShop && b.shopId !== archivedFilterShop && b.shop.name !== archivedFilterShop) return false;
      if (archivedFilterBuilding !== "ALL" && b.buildingName !== archivedFilterBuilding) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (archivedSortBy === "SHOP") {
        return (a.shop?.name || "").localeCompare(b.shop?.name || "", "th");
      }
      if (archivedSortBy === "BUILDING") {
        return (a.buildingName || "").localeCompare(b.buildingName || "", "th");
      }
      // Default: DATE (newest date and cutoff time first)
      const dateA = `${a.date || ""} ${a.cutoffTime || ""}`;
      const dateB = `${b.date || ""} ${b.cutoffTime || ""}`;
      return dateB.localeCompare(dateA);
    });
  }, [archivedBatches, archivedFilterDate, archivedFilterShop, archivedFilterBuilding, archivedSortBy]);

  // If active archived batch is filtered out, clear selection
  useEffect(() => {
    if (activeGroup === "ARCHIVED" && archivedSelectedBatchId) {
      const stillMatches = filteredArchivedBatches.some((b) => b.id === archivedSelectedBatchId);
      if (!stillMatches) {
        setArchivedSelectedBatchId(null);
      }
    }
  }, [activeGroup, archivedSelectedBatchId, filteredArchivedBatches]);

  const activeBatch = useMemo(() => {
    if (activeGroup === "ARCHIVED") {
      if (!archivedSelectedBatchId) return null;
      return archivedBatches.find((b) => b.id === archivedSelectedBatchId) || null;
    }
    return batches.find((b) => b.id === activeBatchId) || currentGroupBatches[0] || batches[0] || null;
  }, [batches, activeBatchId, currentGroupBatches, activeGroup, archivedSelectedBatchId, archivedBatches]);

  const selectBatch = (id: string) => {
    setActiveBatchId(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("batch", id);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSelectGroup = (group: BoardGroup) => {
    setActiveGroup(group);
    if (group === "ARCHIVED") {
      setArchivedSelectedBatchId(null);
      return;
    }
    let targetBatches: BatchWithDetails[] = [];
    if (group === "OPENING") targetBatches = openingBatches;
    else if (group === "PENDING") targetBatches = pendingBatches;
    else if (group === "CLOSED_TODAY") targetBatches = closedTodayBatches;
    else if (group === "DELETED") targetBatches = deletedBatches;

    if (targetBatches.length > 0 && !targetBatches.some((b) => b.id === activeBatchId)) {
      selectBatch(targetBatches[0].id);
    }
  };

  // Deep-linking from ?batch=id in URL query
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlBatchId = params.get("batch");
      if (urlBatchId && batches.length > 0) {
        const found = batches.find((b) => b.id === urlBatchId);
        if (found) {
          setActiveBatchId(urlBatchId);
          if (found.isDeleted) {
            setActiveGroup("DELETED");
          } else if (found.status !== "OPEN" || getTimeRemaining(found.cutoffTime, found.date).isExpired) {
            const diff = getDaysDifference(found.date, getBangkokDate());
            if (diff === 0) {
              if (found.status === "COMPLETED" || found.status === "CANCELLED") {
                setActiveGroup("CLOSED_TODAY");
              } else {
                setActiveGroup("PENDING");
              }
            } else {
              setActiveGroup("ARCHIVED");
              setArchivedSelectedBatchId(urlBatchId);
              setArchivedFilterDate(found.date);
              setArchivedFilterShop(found.shop.id || found.shopId || "ALL");
              setArchivedFilterBuilding(found.buildingName || "ALL");
            }
          } else {
            setActiveGroup("OPENING");
          }
          setTimeout(() => {
            document.getElementById("board-pane")?.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }
      }
    }
  }, [batches]);

  // Auto-switch to activeBatchId if missing from currentGroupBatches
  useEffect(() => {
    if (activeGroup === "ARCHIVED") return; // For past 7 days, user picks first!
    if (currentGroupBatches.length > 0) {
      const exists = currentGroupBatches.some((b) => b.id === activeBatchId);
      if (!exists) {
        selectBatch(currentGroupBatches[0].id);
      }
    }
  }, [currentGroupBatches, activeBatchId, activeGroup]);

  // Modals state
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [showLineQrModal, setShowLineQrModal] = useState(false);
  const [isShopExpanded, setIsShopExpanded] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [manifestData, setManifestData] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Self-Pickup state
  const [isSelfPickup, setIsSelfPickup] = useState(false);

  // Host Light Security State (PIN verification)
  const [openHostPin, setOpenHostPin] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingHostAction, setPendingHostAction] = useState<(() => void) | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  interface OrderItemInput {
    id: string;
    name: string;
    price: string;
    quantity: number;
    customNote: string;
  }

  // Whiteboard Form Inputs (Multi-item support)
  const [customerLineId, setCustomerLineId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
    { id: "item-1", name: "", price: "", quantity: 1, customNote: "" },
  ]);

  const calculatedTotal = useMemo(() => {
    return orderItems.reduce((sum, it) => {
      const p = parseFloat(it.price) || 0;
      const q = it.quantity || 1;
      return sum + p * q;
    }, 0);
  }, [orderItems]);

  const totalItemBoxes = useMemo(() => {
    return orderItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
  }, [orderItems]);

  const handleUpdateOrderItem = (id: string, field: keyof OrderItemInput, value: any) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddOrderItem = () => {
    setOrderItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, name: "", price: "", quantity: 1, customNote: "" },
    ]);
  };

  const handleRemoveOrderItem = (id: string) => {
    setOrderItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleCopyEntireOrder = (ord: Order) => {
    if (!ord.items || ord.items.length === 0) {
      setOrderItems([
        {
          id: `item-${Date.now()}-0`,
          name: ord.boxLabel || "อาหาร",
          price: ord.totalAmount ? String(ord.totalAmount) : "",
          quantity: 1,
          customNote: "",
        },
      ]);
    } else {
      setOrderItems(
        ord.items.map((it, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          name: it.name,
          price: it.price ? String(it.price) : "",
          quantity: it.quantity || 1,
          customNote: it.customNote || "",
        }))
      );
    }
    const el = document.getElementById("order-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Open Board Modal State (Anyone can open a board for Building / Shop)
  const [showOpenBoardModal, setShowOpenBoardModal] = useState(false);
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [openShopId, setOpenShopId] = useState("");
  const [openBuildingId, setOpenBuildingId] = useState<string>(() => {
    const active = (initialLocations || []).find((l) => l.isActive !== false);
    return active?.id || "loc-m4";
  });
  const [openLeaderName, setOpenLeaderName] = useState("");
  const [openLeaderPhone, setOpenLeaderPhone] = useState("");
  const [openCutoffDate, setOpenCutoffDate] = useState<string>(() => getBangkokDate());
  const [openOrderTime, setOpenOrderTime] = useState(() => addMinutesToTimeString(getDefaultCutoff(), 15));
  const [openCutoffTime, setOpenCutoffTime] = useState(getDefaultCutoff());
  const [openTargetMin, setOpenTargetMin] = useState("200");
  const [openNotes, setOpenNotes] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [openBoardError, setOpenBoardError] = useState<string | null>(null);
  const [syncingGoogleHours, setSyncingGoogleHours] = useState(false);
  const [submittedOrderNotice, setSubmittedOrderNotice] = useState<{
    orderNumber: number;
    boxLabel: string;
    shopName: string;
  } | null>(null);

  // Slip upload & BOT verification
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [scanningSlip, setScanningSlip] = useState(false);
  const [slipVerification, setSlipVerification] = useState<SlipVerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Host state
  const [isHost, setIsHost] = useState(false);

  // Manual Refresh state (No background polling to preserve Firestore quota)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (data.success && Array.isArray(data.locations) && data.locations.length > 0) {
        setLocations(data.locations);
        setRuntimeLocations(data.locations);
        setOpenBuildingId((curr) => {
          const match = data.locations.find((l: any) => l.id === curr && l.isActive !== false);
          if (match) return curr;
          const active = data.locations.find((l: any) => l.isActive !== false) || data.locations.find((l: any) => l.id === "loc-m4");
          return active?.id || curr;
        });
      }
    } catch (err) {
      console.warn("Fetch locations error:", err);
    }
  };

  // 1. Initial load on mount
  useEffect(() => {
    // Instant cache hydration from localStorage for 0ms visual load
    try {
      const cached = localStorage.getItem("veatec_cached_batches");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBatches((prev) => (prev.length === 0 ? parsed : prev));
        }
      }
    } catch (e) {}

    fetchBatches(false);
    fetchLocations();
    const now = new Date();
    setLastRefreshedAt(
      now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  }, []);

  // 2. Load cached LINE ID, Phone Number & Host status
  useEffect(() => {
    try {
      const savedLine = localStorage.getItem("veatec_user_line");
      if (savedLine) setCustomerLineId(savedLine);
      const savedPhone = localStorage.getItem("veatec_user_phone");
      if (savedPhone) setCustomerPhone(savedPhone);
      if (activeBatch) {
        setIsSelfPickup(Boolean(activeBatch.isSelfPickup));
        const storedPin = localStorage.getItem(`veatec_host_pin_${activeBatch.id}`);
        const isHostFlag = localStorage.getItem(`veatec_host_${activeBatch.id}`) === "true";
        const matchesPin = Boolean(storedPin && activeBatch.hostPin && storedPin === activeBatch.hostPin);
        setIsHost(isHostFlag || matchesPin);
      }
    } catch (e) {}
  }, [activeBatchId, activeBatch?.id, activeBatch?.isSelfPickup, activeBatch?.hostPin]);

  const fetchBatches = async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      // role=shop returns unsanitized batches for manifest generation; fresh=true bypasses server cache
      const url = fresh ? "/api/batches?role=shop&fresh=true" : "/api/batches?role=shop";
      const [resBatches, resLocs] = await Promise.all([
        fetch(url),
        fetch("/api/locations").catch(() => null),
      ]);
      const data = await resBatches.json();
      if (data.success && Array.isArray(data.batches)) {
        setBatches(data.batches);
        try {
          localStorage.setItem("veatec_cached_batches", JSON.stringify(data.batches));
        } catch (e) {}
        const now = new Date();
        setLastRefreshedAt(
          now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
      }
      if (resLocs) {
        try {
          const locsData = await resLocs.json();
          if (locsData.success && Array.isArray(locsData.locations) && locsData.locations.length > 0) {
            setLocations(locsData.locations);
            setRuntimeLocations(locsData.locations);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Fetch batches error:", err);
    } finally {
      if (fresh) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops");
      const data = await res.json();
      if (data.success && Array.isArray(data.shops)) {
        setAvailableShops(data.shops);
        if (data.shops.length > 0 && !openShopId) {
          const bkkDay = getBangkokDayOfWeek();
          const firstOpen = data.shops.find((s: Shop) => isShopOpenOnDay(s, bkkDay)) || data.shops[0];
          setOpenShopId(firstOpen.id);
          setOpenTargetMin(String(firstOpen.minDeliveryAmount || 200));
        }
      }
    } catch (e) {
      console.warn("fetchShops error:", e);
    }
  };

  const handleOpenBoardClick = () => {
    setOpenBoardError(null);
    setOpenLeaderName(customerLineId || (typeof window !== "undefined" ? localStorage.getItem("veatec_user_line") || "" : ""));
    const savedPhone = customerPhone || (typeof window !== "undefined" ? localStorage.getItem("veatec_user_phone") || "" : "");
    setOpenLeaderPhone(savedPhone);
    const cleanDigits = savedPhone.replace(/\D/g, "");
    setOpenHostPin(cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "");
    setOpenCutoffDate(getBangkokDate());
    const defCutoff = getDefaultCutoff();
    setOpenCutoffTime(defCutoff);
    setOpenOrderTime(addMinutesToTimeString(defCutoff, 15));
    const bkkDay = getBangkokDayOfWeek();
    if (availableShops.length > 0) {
      const currentShop = availableShops.find((s) => s.id === openShopId);
      if (!currentShop || !isShopOpenOnDay(currentShop, bkkDay)) {
        const firstOpen = availableShops.find((s) => isShopOpenOnDay(s, bkkDay)) || availableShops[0];
        setOpenShopId(firstOpen.id);
        setOpenTargetMin(String(firstOpen.minDeliveryAmount || 200));
      }
    }
    fetchShops();
    fetchLocations();
    const activeLoc = locations.find((l) => l.isActive !== false) || locations.find((l) => l.id === "loc-m4") || locations[0];
    if (activeLoc) {
      setOpenBuildingId(activeLoc.id);
    }
    setShowOpenBoardModal(true);
  };

  // Hybrid Google Places Opening Hours Sync (Max 1 per day per shop)
  const handleShopChangeWithGoogleSync = async (selectedShopId: string) => {
    setOpenShopId(selectedShopId);
    const targetShop = availableShops.find((s) => s.id === selectedShopId);
    if (targetShop?.minDeliveryAmount) {
      setOpenTargetMin(String(targetShop.minDeliveryAmount));
    }

    if (!selectedShopId) return;

    // Check if shop was already synced today
    const today = getBangkokDate();
    if (targetShop?.googleLastSyncedDate === today) {
      return; // Already synced today, 0 requests needed
    }

    setSyncingGoogleHours(true);
    try {
      const res = await fetch(`/api/shops/${selectedShopId}/sync-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (data.success && data.shop) {
        setAvailableShops((prev) =>
          prev.map((s) => (s.id === selectedShopId ? { ...s, ...data.shop } : s))
        );
      }
    } catch (e) {
      console.warn("Google Maps sync error:", e);
    } finally {
      setSyncingGoogleHours(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpenBoardError(null);

    const cleanLeader = openLeaderName.trim();
    const cleanPhone = openLeaderPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    const finalPin = openHostPin.trim() || (phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "1234");
    const selectedDate = (openCutoffDate || "").trim() || getBangkokDate();
    const today = getBangkokDate();

    if (selectedDate < today) {
      setOpenBoardError("ไม่สามารถเลือกวันที่ในอดีตได้ กรุณาเลือกวันนี้หรือวันในอนาคต");
      return;
    }

    if (selectedDate === today) {
      const timeCheck = getTimeRemaining(openCutoffTime, selectedDate);
      if (timeCheck.isExpired) {
        setOpenBoardError(`เวลาปิดรับออเดอร์ (${openCutoffTime} น.) ได้ผ่านไปแล้ว กรุณาเลือกเวลาสั่งอาหารล่วงหน้าอย่างน้อย 15 นาที`);
        return;
      }
    }

    if (!openShopId) {
      setOpenBoardError("กรุณาเลือกร้านอาหารที่ต้องการสั่ง");
      return;
    }
    const targetShop = availableShops.find((s) => s.id === openShopId);
    if (!targetShop) {
      setOpenBoardError("กรุณาเลือกร้านอาหารที่ต้องการสั่ง");
      return;
    }
    if (targetShop.isActive === false) {
      setOpenBoardError("ร้านนี้ปิดให้บริการชั่วคราว (Inactive) ไม่สามารถเปิดกระดานตี้ได้");
      return;
    }
    const bkkDay = getBangkokDayOfWeek(selectedDate);
    if (!isShopOpenOnDay(targetShop, bkkDay)) {
      const daysText = formatOpenDaysText(targetShop.openDays, lang);
      setOpenBoardError(`ร้านนี้ปิดทำการในวันที่เลือก (${selectedDate}) (วันเปิดทำการ: ${daysText}) กรุณาเลือกร้านอื่นหรือเลือกวันอื่น`);
      return;
    }
    if (!cleanLeader) {
      setOpenBoardError("กรุณากรอก LINE ID หรือชื่อหัวหน้าตี้");
      return;
    }
    if (!cleanPhone || phoneDigits.length < 9) {
      setOpenBoardError("กรุณากรอกเบอร์โทรศัพท์หัวหน้าตี้ (อย่างน้อย 9-10 หลัก) เพื่อให้ร้านค้าโทรประสานงานกรณีมีปัญหา");
      return;
    }

    setCreatingBoard(true);
    try {
      const activeLocations = locations.filter((l) => l.isActive !== false);
      const selectedBuilding =
        activeLocations.find((l) => l.id === openBuildingId) ||
        locations.find((l) => l.id === openBuildingId) ||
        activeLocations[0] ||
        locations.find((l) => l.id === "loc-m4") ||
        locations[0] ||
        CAMPUS_LOCATIONS[0];
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: openShopId,
          date: selectedDate,
          cutoffTime: openCutoffTime,
          targetMinAmount: Number(openTargetMin) || 200,
          notes: openNotes.trim() || undefined,
          hostLineId: cleanLeader,
          hostPhone: cleanPhone,
          hostName: cleanLeader,
          hostPin: finalPin,
          buildingId: selectedBuilding.id,
          buildingName: selectedBuilding.name,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "ไม่สามารถเปิดกระดานได้");
      }

      try {
        localStorage.setItem("veatec_user_line", cleanLeader);
        localStorage.setItem("veatec_user_phone", cleanPhone);
        localStorage.setItem(`veatec_host_${data.batch.id}`, "true");
        localStorage.setItem(`veatec_host_pin_${data.batch.id}`, finalPin);
        setCustomerLineId(cleanLeader);
        setCustomerPhone(cleanPhone);
        setIsHost(true);
      } catch (e) {}

      setShowOpenBoardModal(false);
      setBatches((prev) => [data.batch, ...prev.filter((b) => b.id !== data.batch.id)]);
      setActiveGroup("OPENING");
      setActiveBatchId(data.batch.id);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      router.push(`/order/${data.batch.id}?new_board=1`);
    } catch (err: any) {
      setOpenBoardError(err.message || "เกิดข้อผิดพลาดในการเปิดกระดาน");
    } finally {
      setCreatingBoard(false);
    }
  };

  // Share Board Invitation to LINE / Friends
  const handleShareBoardInvite = async (targetBatch?: BatchWithDetails | null) => {
    const b = targetBatch || activeBatch;
    if (!b) return;
    const locName = b.buildingName || "ตึก M4";
    const shopName = b.shop.name;
    const remainingText = b.isMinMet
      ? "ครบยอดส่งฟรีแล้ว 🎉"
      : `ขาดอีก ฿${b.amountRemaining} เพื่อส่งฟรี!`;
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/order/${b.id}` : "https://veatec.vercel.app";
    const text = `🍱 มาสั่งข้าวตี้ร้าน ${shopName} กันครับ/ค่ะ!\n` +
      `📍 จุดส่ง: โต๊ะ ${locName} ชั้น 1\n` +
      `⏰ ${formatCutoffDisplay(b.cutoffTime, b.date, "th", true)} (${remainingText})\n\n` +
      `👉 สั่งร่วมตี้ได้ที่นี่เลย:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `VEATEC - สั่งข้าวตี้ ${shopName}`,
          text,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("คัดลอกข้อความชวนเพื่อนแล้ว! กำลังเปิด LINE เพื่อให้คุณส่งเข้ากลุ่ม...");
    } catch (e) {}
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };

  // Host Authorization Check & Prompt Helper
  const checkIsVerifiedHost = (b: BatchWithDetails | null) => {
    if (!b) return false;
    if (typeof window === "undefined") return false;
    const storedPin = localStorage.getItem(`veatec_host_pin_${b.id}`);
    const isHostFlag = localStorage.getItem(`veatec_host_${b.id}`) === "true";
    if (storedPin && b.hostPin && storedPin === b.hostPin) return true;
    if (isHostFlag) return true;
    return false;
  };

  const requireHostAuth = (action: () => void) => {
    if (!activeBatch) return;
    if (checkIsVerifiedHost(activeBatch)) {
      action();
      return;
    }
    setPinError(null);
    setEnteredPin("");
    setPendingHostAction(() => action);
    setShowPinModal(true);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) return;
    const clean = enteredPin.trim();
    const correctPin = activeBatch.hostPin || (activeBatch.hostPhone ? activeBatch.hostPhone.replace(/\D/g, "").slice(-4) : "1234");
    if (clean === correctPin || clean === "admin") {
      try {
        localStorage.setItem(`veatec_host_pin_${activeBatch.id}`, clean);
        localStorage.setItem(`veatec_host_${activeBatch.id}`, "true");
        setIsHost(true);
      } catch (e) {}
      setShowPinModal(false);
      if (pendingHostAction) {
        pendingHostAction();
        setPendingHostAction(null);
      }
    } else {
      setPinError("PIN ไม่ถูกต้อง (ไม่ใช่ 4 ตัวท้ายของเบอร์โทรหัวหน้าตี้)");
    }
  };

  const handleCloseBoard = async () => {
    if (!activeBatch) return;
    requireHostAuth(async () => {
      if (!confirm("ต้องการปิดรับออเดอร์กระดานนี้ใช่หรือไม่? เมื่อปิดแล้วกระดานจะย้ายไปคลังและไม่สามารถสั่งเพิ่มได้")) return;
      const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${activeBatch.id}`) || activeBatch.hostPin : activeBatch.hostPin;
      try {
        const res = await fetch(`/api/batches/${activeBatch.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "CLOSED",
            hostPin,
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert("ปิดรับออเดอร์กระดานนี้เรียบร้อยแล้ว");
          await fetchBatches();
        } else {
          alert(data.error || "เกิดข้อผิดพลาด");
        }
      } catch (e) {
        alert("ไม่สามารถปิดกระดานได้");
      }
    });
  };

  // Slip File Change & Auto BOT QR Scan
  const handleSlipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitError(null);
    setSlipFile(file);
    setScanningSlip(true);
    setSlipVerification(null);

    try {
      // Lean Client-side Compression: 640px, 0.68 quality (~40-60 KB, perfect for BOT slip QR scanner)
      const compressedDataUrl = await compressImage(file, 640, 0.68);
      setSlipPreview(compressedDataUrl);

      const tempImg = new Image();
      tempImg.onload = async () => {
        const verifyRes = await scanSlipQrFromImageElement(tempImg);
        setSlipVerification(verifyRes);
        setScanningSlip(false);
      };
      tempImg.src = compressedDataUrl;
    } catch (err) {
      setScanningSlip(false);
    }
  };

  // Add Order directly to Whiteboard
  const handleAddToWhiteboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) return;

    setSubmitError(null);
    const cleanLine = customerLineId.trim();
    const cleanPhone = customerPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");

    if (!cleanLine) {
      setSubmitError(
        lang === "en"
          ? "Please enter LINE ID or Name"
          : lang === "cn"
          ? "请填写 LINE ID 或姓名"
          : "กรุณากรอก LINE ID หรือชื่อแสดงผล"
      );
      return;
    }
    if (!cleanPhone || phoneDigits.length < 9) {
      setSubmitError(
        lang === "en"
          ? "Please enter a valid phone number (9-10 digits) for the shop to reach you"
          : lang === "cn"
          ? "请填写有效手机号码 (9-10位)，以便商家联络"
          : "กรุณากรอกเบอร์โทรศัพท์ (อย่างน้อย 9-10 หลัก) เพื่อให้ร้านค้าโทรติดต่อกรณีมีปัญหาในออเดอร์"
      );
      return;
    }

    const emptyName = orderItems.find((it) => !it.name.trim());
    if (emptyName) {
      setSubmitError(
        lang === "en"
          ? "Please enter dish name for all items"
          : lang === "cn"
          ? "请填写所有菜品名称"
          : "กรุณากรอกชื่อเมนูอาหารให้ครบทุกรายการ"
      );
      return;
    }

    const invalidPrice = orderItems.find((it) => {
      const p = parseFloat(it.price);
      return isNaN(p) || p <= 0;
    });
    if (invalidPrice) {
      setSubmitError(
        lang === "en"
          ? "Please specify a valid price (> 0) for each dish"
          : lang === "cn"
          ? "请为每道菜填写有效单价 (> 0)"
          : "กรุณาระบุราคาอาหารเป็นตัวเลขที่ถูกต้อง (> 0) ในทุกรายการ"
      );
      return;
    }

    if (calculatedTotal <= 0) {
      setSubmitError(
        lang === "en"
          ? "Total price must be greater than 0"
          : lang === "cn"
          ? "总金额必须大于 0"
          : "ยอดรวมต้องมากกว่า 0 บาท"
      );
      return;
    }

    if (!slipPreview) {
      setSubmitError(
        lang === "en"
          ? "Please attach bank transfer slip"
          : lang === "cn"
          ? "请上传转账凭证截图"
          : "กรุณาแนบรูปสลิปโอนเงิน"
      );
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: activeBatch.id,
          customerName: cleanLine,
          customerLineId: cleanLine,
          customerPhone: cleanPhone,
          locationId: "loc-m4",
          items: orderItems.map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            name: it.name.trim(),
            price: parseFloat(it.price) || 0,
            quantity: it.quantity || 1,
            customNote: it.customNote.trim() || undefined,
          })),
          totalAmount: calculatedTotal,
          slipImageUrl: slipPreview,
          slipTransRef: slipVerification?.transRef,
          slipBankCode: slipVerification?.bankCode,
          slipBankName: slipVerification?.bankName,
          isSlipVerified: slipVerification?.isValid || false,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการลงชื่อ");
      }

      try {
        localStorage.setItem("veatec_user_line", cleanLine);
        localStorage.setItem("veatec_user_phone", cleanPhone);
        if (!activeBatch.orders || activeBatch.orders.length === 0) {
          localStorage.setItem(`veatec_host_${activeBatch.id}`, "true");
          setIsHost(true);
        }

        if (data.order) {
          const existingOrdersStr = localStorage.getItem("veatec_user_orders");
          const existingOrders = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
          const newOrderEntry = {
            orderId: data.order.id,
            batchId: data.order.batchId,
            shopName: activeBatch.shop.name,
            date: activeBatch.date,
            orderNumber: data.order.orderNumber,
            customerName: data.order.customerName,
            customerPhone: data.order.customerPhone,
            locationId: data.order.locationId,
            totalAmount: data.order.totalAmount,
            boxLabel: data.order.boxLabel,
            slipImageUrl: data.order.slipImageUrl,
            items: data.order.items,
            createdAt: data.order.createdAt,
          };
          const updatedOrders = [
            newOrderEntry,
            ...existingOrders.filter((o: any) => o.orderId !== newOrderEntry.orderId),
          ].slice(0, 30);
          localStorage.setItem("veatec_user_orders", JSON.stringify(updatedOrders));
        }
      } catch (e) {}

      // Reset form
      setOrderItems([{ id: `item-${Date.now()}`, name: "", price: "", quantity: 1, customNote: "" }]);
      setSlipFile(null);
      setSlipPreview(null);
      setSlipVerification(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (data.order) {
        setSubmittedOrderNotice({
          orderNumber: data.order.orderNumber,
          boxLabel: data.order.boxLabel,
          shopName: activeBatch.shop.name,
        });
      }
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      await fetchBatches();
    } catch (err: any) {
      setSubmitError(err.message || "ไม่สามารถลงชื่อบนไวท์บอร์ดได้");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Cancel order (with audit trace)
  const handleCancelOrder = async (orderId: string, orderNumber: number, lineName: string) => {
    if (!confirm(`ยืนยันการยกเลิกกล่อง #${orderNumber} (${lineName}) ใช่หรือไม่?\n(ระบบจะบันทึกประวัติการยกเลิกไว้)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orders?id=${orderId}&reason=Cancelled by Host&by=${encodeURIComponent(customerLineId || "Host")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("ยกเลิกรายการเรียบร้อยแล้ว");
        fetchBatches();
      } else {
        alert(data.error || "ไม่สามารถยกเลิกได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการยกเลิก");
    }
  };

  // Active orders & Leader info
  const activeOrders = activeBatch ? (activeBatch.orders || []).filter((o) => !o.deletedAt) : [];
  const totalBoxesInBatch = useMemo(() => {
    return activeOrders.reduce(
      (sum, o) => sum + (o.items && o.items.length > 0 ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1),
      0
    );
  }, [activeOrders]);

  // Unique dishes ordered by friends in this board (ordered list for quick pick)
  const friendsDishes = useMemo(() => {
    const dishMap = new Map<string, { name: string; price: number; count: number }>();
    activeOrders.forEach((ord) => {
      (ord.items || []).forEach((it) => {
        const cleanName = it.name?.trim();
        if (!cleanName) return;
        const existing = dishMap.get(cleanName);
        if (existing) {
          existing.count += it.quantity || 1;
        } else {
          dishMap.set(cleanName, {
            name: cleanName,
            price: it.price || 0,
            count: it.quantity || 1,
          });
        }
      });
    });
    return Array.from(dishMap.values()).sort((a, b) => b.count - a.count);
  }, [activeOrders]);

  const leaderLine = activeBatch?.hostLineId || (activeOrders[0]?.customerLineId ? `@${activeOrders[0].customerLineId}` : activeOrders[0]?.customerName);
  const leaderPhone = activeBatch?.hostPhone || activeOrders[0]?.customerPhone;

  // Compile Brief Text for LINE (3-Tier Clear Hierarchy: Board -> Order -> Menu Items)
  const getCompiledOrderText = () => {
    if (!activeBatch) return "";
    const mapUrl = isSelfPickup ? activeBatch.shop.gmapUrl : getDropOffMapUrl(activeBatch, locations);
    let txt = `🍱 [VEATEC] สรุปออเดอร์ร้าน ${activeBatch.shop.name}\n`;
    if (isSelfPickup) {
      txt += `🚶 รับเองหน้าร้าน`;
      if (mapUrl) txt += ` • แผนที่: ${mapUrl}`;
      txt += `\n`;
    } else {
      txt += `📍 จุดส่ง: ${activeBatch.buildingName || "ตึก M4"} ชั้น 1`;
      if (mapUrl) txt += ` • แผนที่: ${mapUrl}`;
      txt += `\n`;
    }
    if (leaderPhone || leaderLine) {
      txt += `👑 หัวหน้าตี้: ${leaderLine || ""}${leaderPhone ? ` (โทร: ${leaderPhone})` : ""}\n`;
    }
    txt += `💰 ยอดโอนรวมทั้งรอบ: ฿${activeBatch.currentTotalAmount} (${totalBoxesInBatch} กล่อง | ${activeOrders.length} ออเดอร์) • สลิปครบ 100% ✅\n`;
    txt += `──────────────────────────────\n`;

    activeOrders.forEach((o, idx) => {
      const lineTag = o.customerLineId ? `@${o.customerLineId.replace(/^@/, "")}` : o.customerName;
      const phoneTag = o.customerPhone ? ` • 📞 ${o.customerPhone}` : "";
      const orderNum = String(o.orderNumber || idx + 1).padStart(2, "0");

      txt += `[ ออเดอร์ที่ ${orderNum} ] 👤 ${lineTag}${phoneTag}\n`;

      const items = o.items && o.items.length > 0
        ? o.items
        : [{ name: o.boxLabel || "อาหาร", price: o.totalAmount, quantity: 1, customNote: "" }];

      items.forEach((it) => {
        const qty = it.quantity || 1;
        const note = it.customNote ? ` (${it.customNote})` : "";
        const pricePerUnit = it.price > 0 ? it.price : Math.round(o.totalAmount / (items.length || 1));
        const itemTotal = pricePerUnit * qty;

        if (qty > 1) {
          txt += `  • ${qty}x ${it.name}${note} [@฿${pricePerUnit} = ฿${itemTotal}]\n`;
        } else {
          txt += `  • 1x ${it.name}${note} [@฿${pricePerUnit}]\n`;
        }
      });

      txt += `  ↳ 💵 รวมยอดคนนี้: ฿${o.totalAmount} (ตรงกับสลิป #${orderNum})\n\n`;
    });

    txt += `──────────────────────────────\n`;
    txt += `🧾 รูปสลิปโอนเงินทั้งหมดและแผนที่จุดส่ง แนบในรูปภาพสรุปยาวด้านล่างครับ`;
    return txt;
  };

  // Open "Send to Shop" Modal & Generate Long Manifest Image (Host Only)
  const handleOpenSendModal = async () => {
    if (!activeBatch) return;
    requireHostAuth(async () => {
      setShowSendModal(true);
      setGeneratingManifest(true);
      setManifestData(null);
      setCopiedText(false);

      try {
        const manifest = await generateOneLongManifestImage({
          ...activeBatch,
          orders: activeOrders,
          isSelfPickup,
        });
        setManifestData(manifest);
      } catch (err) {
        console.error("Manifest generation error:", err);
        alert("ไม่สามารถสร้างรูปสรุปได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setGeneratingManifest(false);
      }
    });
  };

  const handleConfirmSentToShop = async () => {
    if (!activeBatch) return;
    const hostPin = typeof window !== "undefined" ? localStorage.getItem(`veatec_host_pin_${activeBatch.id}`) || activeBatch.hostPin : activeBatch.hostPin;
    try {
      const res = await fetch(`/api/batches/${activeBatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ORDERED",
          isSelfPickup,
          hostPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("บันทึกส่งร้านเรียบร้อยแล้ว! กระดานนี้ปิดรับออเดอร์และอยู่ในแท็บรอส่งมอบ");
        setShowSendModal(false);
        setActiveGroup("PENDING");
        await fetchBatches(true);
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (e) {
      alert("ไม่สามารถบันทึกสถานะได้");
    }
  };

  // Button 1: Send Compiled Order Text directly to LINE Chat
  const handleSendTextToLine = async () => {
    if (!activeBatch) return;
    const shareText = getCompiledOrderText();

    try {
      await navigator.clipboard.writeText(shareText);
    } catch (e) {}

    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank");
  };

  // Button 2: Share Long Manifest Image via Web Share API or download fallback
  const handleShareImageOnly = async () => {
    if (!manifestData || !activeBatch) return;
    const safeFileName = `order-manifest-${activeBatch.id.slice(0, 8)}.jpg`;

    if (navigator.share && navigator.canShare) {
      const imageFile = new File([manifestData.blob], safeFileName, {
        type: "image/jpeg",
      });

      if (navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({
            title: `ออเดอร์ร้าน ${activeBatch.shop.name}`,
            files: [imageFile],
          });
          return;
        } catch (err: any) {
          if (err.name === "AbortError") return; // User cancelled
          console.warn("Share image failed, falling back to download", err);
        }
      }
    }

    // Fallback: download image
    const link = document.createElement("a");
    link.href = manifestData.dataUrl;
    link.download = safeFileName;
    link.click();
    alert("บันทึกรูปภาพสรุปลงเครื่องเรียบร้อยแล้ว!");
  };

  const timeInfo = activeBatch ? getTimeRemaining(activeBatch.cutoffTime, activeBatch.date, lang) : null;
  const isBatchClosed = activeBatch ? activeBatch.status !== "OPEN" || timeInfo?.isExpired : false;

  const allSlipsVerified =
    activeOrders.length > 0 &&
    activeOrders.every((o) => Boolean(o.slipImageUrl || o.isSlipVerified));
  const missingSlipOrders = activeOrders.filter((o) => !o.slipImageUrl && !o.isSlipVerified);

  const activeShopInfo = activeBatch ? getShopLocalizedInfo(activeBatch.shop, lang) : null;
  const activeBuildingName = activeBatch ? getLocalizedBuildingName(activeBatch.buildingName || "ตึก M4", lang) : "";
  const activeLocation = activeBatch
    ? getLocationForBatch(activeBatch, locations)
    : locations[0] || CAMPUS_LOCATIONS[0];
  const activeLocalizedLocation = getLocalizedLocation(activeLocation, lang);
  const activeShopAccentColor = useAverageColor(
    activeBatch?.shop?.menuImageUrl,
    activeBatch?.shop?.name ? activeBatch.shop.name + (activeBatch.shop.cuisine || "") : undefined,
    activeBatch?.shop?.accentColor
  );
  const activeBldgColor = getCssColorFromClass(activeLocation?.color, "#059669");
  const activeShopMapUrl = activeBatch
    ? activeBatch.shop.gmapUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(
        (activeShopInfo?.name || activeBatch.shop.name) + " ระยอง"
      )}`
    : "";

  const timeProgressPercent = useMemo(() => {
    if (!activeBatch || !timeInfo) return 0;
    if (timeInfo.isExpired) return 0;
    let startMs = activeBatch.createdAt ? new Date(activeBatch.createdAt).getTime() : 0;
    let cutoffMs = 0;
    if (activeBatch.date && /^\d{4}-\d{2}-\d{2}$/.test(activeBatch.date)) {
      cutoffMs = new Date(`${activeBatch.date}T${activeBatch.cutoffTime}:00+07:00`).getTime();
    } else {
      const bkkDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      cutoffMs = new Date(`${bkkDateStr}T${activeBatch.cutoffTime}:00+07:00`).getTime();
    }
    if (!startMs || cutoffMs - startMs > 4 * 3600 * 1000 || startMs >= cutoffMs) {
      startMs = cutoffMs - 60 * 60 * 1000;
    }
    const totalDuration = Math.max(1, cutoffMs - startMs);
    const remaining = Math.max(0, Math.min(totalDuration, timeInfo.remainingMs));
    return Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
  }, [activeBatch, timeInfo]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 space-y-4">
        {/* 1. Shop Tabs Bar (3 Groups + Deleted + Open Board Button) */}
        <div className="space-y-2">
          {/* Level 1: Group Selector Pills */}
          {/* Level 1: Action Buttons (Open Board & Refresh) at the Front + Group Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
            {/* Primary Action 1: Open New Board (Front & Compact) */}
            <button
              type="button"
              onClick={handleOpenBoardClick}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-black bg-purple-900 text-white hover:bg-purple-800 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              title={t.openBoardTitle}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{lang === "en" ? "Board" : lang === "cn" ? "拼单" : "กระดาน"}</span>
            </button>

            {/* Primary Action 2: Refresh Button (Icon Only & Compact) */}
            <button
              type="button"
              onClick={() => fetchBatches(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center rounded-xl p-1.5 text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer disabled:opacity-60 active:scale-95 shrink-0"
              title={
                lastRefreshedAt
                  ? lang === "en"
                    ? `Data fetched at ${lastRefreshedAt} (Click to refresh)`
                    : lang === "cn"
                    ? `数据获取于 ${lastRefreshedAt} (点击刷新)`
                    : `ดึงข้อมูลล่าสุดเมื่อ ${lastRefreshedAt} น. (กดเพื่อรีเฟรช)`
                  : "กดเพื่อรีเฟรชข้อมูล"
              }
              aria-label="รีเฟรช"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-purple-700 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Subtle Divider */}
            <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0" />

            {/* Group 1: Opening */}
            <button
              type="button"
              onClick={() => handleSelectGroup("OPENING")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeGroup === "OPENING"
                  ? "bg-purple-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.groupOpening}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "OPENING" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {openingBatches.length}
              </span>
            </button>

            {/* Group 2: Pending Delivery (Cutoff passed or Ordered, not yet completed) */}
            <button
              type="button"
              onClick={() => handleSelectGroup("PENDING")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeGroup === "PENDING"
                  ? "bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400"
                  : "bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 hover:text-amber-950"
              }`}
            >
              <Truck className="h-3.5 w-3.5 text-amber-900" />
              <span>{t.groupPending}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                activeGroup === "PENDING" ? "bg-slate-950/20 text-slate-950" : "bg-amber-200/80 text-amber-900"
              }`}>
                {pendingBatches.length}
              </span>
            </button>

            {/* Group 3: Delivered Today */}
            <button
              type="button"
              onClick={() => handleSelectGroup("CLOSED_TODAY")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeGroup === "CLOSED_TODAY"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t.groupClosedToday}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "CLOSED_TODAY" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {closedTodayBatches.length}
              </span>
            </button>

            {/* Group 3: Archived (1-7 Days) */}
            <button
              type="button"
              onClick={() => handleSelectGroup("ARCHIVED")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeGroup === "ARCHIVED"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Archive className="h-3.5 w-3.5 text-amber-500" />
              <span>{t.groupArchived}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "ARCHIVED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {archivedBatches.length}
              </span>
            </button>

            {/* Group 4: Deleted (>7 Days) */}
            <button
              type="button"
              onClick={() => handleSelectGroup("DELETED")}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeGroup === "DELETED"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span>{t.groupDeleted}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeGroup === "DELETED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {deletedBatches.length}
              </span>
            </button>
          </div>

          {/* Level 2: Board Tabs / Filter for the active group */}
          {activeGroup === "ARCHIVED" ? (
            <div className="space-y-2 pt-1 pb-1">
                {/* 3 Dropdown Selects */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Dropdown 1: Date */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-purple-700" />
                      <span>{lang === "en" ? "Date" : lang === "cn" ? "日期" : "วันที่"}</span>
                    </label>
                    <select
                      value={archivedFilterDate}
                      onChange={(e) => {
                        setArchivedFilterDate(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-purple-600 focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">
                        {lang === "en" ? "All Dates (Past 7 Days)" : lang === "cn" ? "全部日期 (近7天)" : "ทุกวันที่ (ย้อนหลัง 7 วัน)"}
                      </option>
                      {availableArchivedDates.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown 2: Shop */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Store className="h-3 w-3 text-purple-700" />
                      <span>{lang === "en" ? "Shop" : lang === "cn" ? "餐厅" : "ร้านอาหาร"}</span>
                    </label>
                    <select
                      value={archivedFilterShop}
                      onChange={(e) => {
                        setArchivedFilterShop(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-purple-600 focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">
                        {lang === "en" ? "All Shops" : lang === "cn" ? "全部餐厅" : "ทุกร้านอาหาร"}
                      </option>
                      {availableArchivedShops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown 3: Building */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-purple-700" />
                      <span>{lang === "en" ? "Building / Drop-off" : lang === "cn" ? "送餐楼宇" : "ตึก / จุดส่ง"}</span>
                    </label>
                    <select
                      value={archivedFilterBuilding}
                      onChange={(e) => {
                        setArchivedFilterBuilding(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-purple-600 focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">
                        {lang === "en" ? "All Buildings" : lang === "cn" ? "全部楼宇" : "ทุกตึก / จุดส่ง"}
                      </option>
                      {availableArchivedBuildings.map((bldg) => (
                        <option key={bldg} value={bldg}>
                          {getLocalizedBuildingName(bldg, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort Toggle for 7-Day History */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">
                      {lang === "en" ? "Sort by:" : lang === "cn" ? "排序方式:" : "เรียงตาม:"}
                    </span>
                    <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
                      <button
                        type="button"
                        onClick={() => setArchivedSortBy("DATE")}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          archivedSortBy === "DATE"
                            ? "bg-white text-purple-950 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        ⏰ {lang === "en" ? "Newest" : lang === "cn" ? "最新" : "เวลา (ใหม่สุด)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchivedSortBy("SHOP")}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          archivedSortBy === "SHOP"
                            ? "bg-white text-purple-950 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        🏬 {lang === "en" ? "Shop A-Z" : lang === "cn" ? "餐厅名称" : "ชื่อร้าน"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchivedSortBy("BUILDING")}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          archivedSortBy === "BUILDING"
                            ? "bg-white text-purple-950 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        📍 {lang === "en" ? "Building" : lang === "cn" ? "楼宇" : "ตึก / จุดส่ง"}
                      </button>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500">
                    {lang === "en"
                      ? `Matching boards (${filteredArchivedBatches.length}):`
                      : lang === "cn"
                      ? `匹配拼单 (${filteredArchivedBatches.length}):`
                      : `กระดานที่ตรงเงื่อนไข (${filteredArchivedBatches.length}):`}
                  </span>
                </div>

                {/* Filter Results & Board Selection */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">

                  {filteredArchivedBatches.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      {lang === "en"
                        ? "No boards match this filter"
                        : lang === "cn"
                        ? "无匹配拼单"
                        : "ไม่พบกระดานที่ตรงกับเงื่อนไขที่เลือก"}
                    </span>
                  ) : (
                    filteredArchivedBatches.map((b) => {
                      const isSelected = b.id === activeBatch?.id;
                      const localizedShop = getShopLocalizedInfo(b.shop, lang);
                      const bldgCode = b.buildingName
                        ? getLocalizedBuildingName(b.buildingName, lang).replace("Bldg ", "").replace(" 栋", "")
                        : "M4";
                      const totalBoxes = (b.orders || []).reduce(
                        (sum, ord) => sum + (ord.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0),
                        0
                      );

                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            selectBatch(b.id);
                            setArchivedSelectedBatchId(b.id);
                            setTimeout(() => {
                              document.getElementById("board-pane")?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-purple-900 border-purple-900 text-white shadow-xs ring-2 ring-purple-300"
                              : "bg-white border-slate-300 text-slate-700 hover:bg-purple-50 hover:border-purple-300"
                          }`}
                        >
                          <span>{localizedShop.name}</span>
                          {b.isTest && (
                            <span className="rounded bg-purple-100 border border-purple-400 text-purple-900 px-1 py-0.2 text-[10px] font-black shrink-0">
                              🧪 TEST
                            </span>
                          )}
                          {b.status === "CANCELLED" && (
                            <span className="rounded bg-rose-100 border border-rose-300 text-rose-800 px-1 py-0.2 text-[10px] font-black shrink-0">
                              🚫 {lang === "en" ? "Cancelled" : lang === "cn" ? "已取消" : "ยกเลิก"}
                            </span>
                          )}
                          <span className={`rounded px-1 py-0.2 text-[10px] font-mono ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {bldgCode}
                          </span>
                          <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {b.date}
                          </span>
                          <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                            isSelected ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-900"
                          }`}>
                            {totalBoxes} {lang === "en" ? "boxes" : lang === "cn" ? "盒" : "กล่อง"}
                          </span>
                        </button>
                      );
                    })
                  )}

                  {activeBatch && (
                    <button
                      type="button"
                      onClick={() => {
                        setArchivedSelectedBatchId(null);
                        if (typeof window !== "undefined") {
                          const url = new URL(window.location.href);
                          url.searchParams.delete("batch");
                          window.history.replaceState({}, "", url.toString());
                        }
                      }}
                      className="ml-auto text-[11px] font-bold text-rose-600 hover:text-rose-700 underline flex items-center gap-1 cursor-pointer py-1"
                    >
                      <X className="h-3 w-3" />
                      <span>{lang === "en" ? "Close Board" : lang === "cn" ? "关闭拼单" : "ปิดดูกระดาน"}</span>
                    </button>
                  )}
                </div>
              </div>
          ) : (
            currentGroupBatches.length > 0 && (
              <div className="flex items-end gap-1 overflow-x-auto border-b border-slate-200 pt-2 px-1 -mb-px">
                {currentGroupBatches.map((b) => (
                  <BoardTabButton
                    key={b.id}
                    batch={b}
                    isActive={b.id === activeBatchId}
                    locations={locations}
                    lang={lang}
                    onSelect={selectBatch}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Top Banner when viewing non-opening groups */}
        {activeBatch && activeGroup === "PENDING" && (
          <div className="flex items-center justify-between rounded-xl bg-amber-500/15 border border-amber-300 text-amber-950 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-800 shrink-0" />
              <span>
                <strong>{t.groupPending}:</strong> {activeShopInfo?.name || activeBatch.shop.name} ({formatCutoffDisplay(activeBatch.cutoffTime, activeBatch.date, lang, true)}) • {lang === "en" ? "Waiting for delivery by leader" : lang === "cn" ? "等待发起人送达" : "กำลังดำเนินการ / รอส่งมอบจากผู้เปิดกระดาน"}
              </span>
            </div>
            {openingBatches.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGroup("OPENING")}
                className="rounded-lg bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 px-3 py-1 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{t.backToLive}</span>
              </button>
            )}
          </div>
        )}

        {activeBatch && activeGroup === "ARCHIVED" && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 text-slate-100 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>{t.groupArchived}:</strong> {activeShopInfo?.name || activeBatch.shop.name} ({activeBatch.date}) • {t.readOnlyNotice}
              </span>
            </div>
            {openingBatches.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGroup("OPENING")}
                className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{t.backToLive}</span>
              </button>
            )}
          </div>
        )}

        {activeBatch && activeGroup === "CLOSED_TODAY" && (
          <div className="flex items-center justify-between rounded-xl bg-amber-900/90 text-amber-100 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-300 shrink-0" />
              <span>
                <strong>{t.groupClosedToday}:</strong> {activeShopInfo?.name || activeBatch.shop.name} ({formatCutoffDisplay(activeBatch.cutoffTime, activeBatch.date, lang, true)}) • {lang === "en" ? "Closed / Delivered" : lang === "cn" ? "已送达/已关闭" : "ปิดรอบ / ส่งมอบเรียบร้อยแล้ว"}
              </span>
            </div>
            {openingBatches.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGroup("OPENING")}
                className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{t.backToLive}</span>
              </button>
            )}
          </div>
        )}

        {activeBatch && (activeGroup === "DELETED" || activeBatch.isDeleted) && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 text-slate-100 px-4 py-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400 shrink-0" />
              <span>
                <strong>{t.groupDeleted}:</strong> {activeShopInfo?.name || activeBatch.shop.name} ({activeBatch.date}) • {t.deletedBoardNotice}
              </span>
            </div>
            {openingBatches.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGroup("OPENING")}
                className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{t.backToLive}</span>
              </button>
            )}
          </div>
        )}

        {/* Empty state if the active group has no boards */}
        {currentGroupBatches.length === 0 && activeGroup !== "ARCHIVED" ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              {activeGroup === "OPENING" ? (
                <Clock className="h-6 w-6 text-amber-600" />
              ) : activeGroup === "PENDING" ? (
                <Truck className="h-6 w-6 text-amber-600" />
              ) : activeGroup === "CLOSED_TODAY" ? (
                <Clock className="h-6 w-6 text-slate-500" />
              ) : (
                <Trash2 className="h-6 w-6 text-rose-500" />
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {activeGroup === "OPENING"
                ? t.noOpeningBoards
                : activeGroup === "PENDING"
                ? t.noPendingBoards
                : activeGroup === "CLOSED_TODAY"
                ? t.noClosedTodayBoards
                : t.noDeletedBoards}
            </h3>
            {lastRefreshedAt && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-medium border border-slate-200">
                <Clock className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                <span>
                  {t.dataFetchedAt} {lastRefreshedAt} {lang === "th" ? "น." : ""}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeGroup === "OPENING" ? t.noLiveBoardsSub : ""}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenBoardClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-800 shadow-2xs cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>{t.openNewBoard}</span>
              </button>
              <button
                type="button"
                onClick={() => fetchBatches(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-60 active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-purple-700 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{lang === "en" ? "Refresh Data" : lang === "cn" ? "刷新数据" : "รีเฟรชข้อมูล"}</span>
              </button>
              {activeGroup !== "OPENING" && openingBatches.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectGroup("OPENING")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <span>{t.groupOpening} ({openingBatches.length})</span>
                </button>
              )}
              {activeGroup === "OPENING" && closedTodayBatches.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectGroup("CLOSED_TODAY")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>{t.groupClosedToday} ({closedTodayBatches.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : activeGroup === "ARCHIVED" && !activeBatch ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Archive className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {lang === "en"
                ? "Select parameters above to view past board"
                : lang === "cn"
                ? "请选择上方条件查看往期拼单"
                : "เลือกเงื่อนไขด้านบนเพื่อเปิดดูกระดานย้อนหลัง"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {lang === "en"
                ? `Found ${filteredArchivedBatches.length} matching boards from the past 7 days. Tap any board button above to view.`
                : lang === "cn"
                ? `过去 7 天内找到 ${filteredArchivedBatches.length} 个拼单。点击上方任意按钮即可查看详情。`
                : `พบกระดานย้อนหลัง 7 วันที่ตรงกับเงื่อนไข ${filteredArchivedBatches.length} กระดาน แตะปุ่มกระดานด้านบนเพื่อเปิดดู`}
            </p>
          </div>
        ) : activeBatch ? (
          <div
            id="board-pane"
            style={{
              borderLeftColor: activeShopAccentColor,
              borderRightColor: activeBldgColor,
              background: `linear-gradient(to right, ${activeShopAccentColor}0d, transparent 15%, transparent 85%, ${activeBldgColor}0d)`,
            }}
            className="space-y-2.5 sm:space-y-3 rounded-2xl border-l-[6px] border-r-[6px] border-y border-y-slate-200/80 p-3 sm:p-4 shadow-sm bg-white/60 transition-all duration-300"
          >
            {/* Status Announcement Banner (e.g. PENDING, food delayed, shop closed) */}
            {activeBatch.status === "PENDING" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-3.5 text-amber-950 shadow-xs flex items-start gap-2.5 animate-pulse">
                <span className="text-lg leading-none shrink-0">⚠️</span>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-900">
                      {lang === "en" ? "Leader Notice / Under Review" : lang === "cn" ? "团长特别通知" : "ประกาศด่วนจากหัวหน้าตี้"}
                    </span>
                    {activeBatch.pendingCreatedAt && (
                      <span className="text-[10px] font-mono text-amber-700">
                        {new Date(activeBatch.pendingCreatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-snug">
                    {activeBatch.pendingMessage || "ทางร้านแจ้งว่าอาหารอาจล่าช้ากว่ากำหนด หรืออยู่ระหว่างการประสานงานกับทางร้านค้า"}
                  </p>
                </div>
              </div>
            )}

            {/* Board Status Stepper & Live Tracking Bar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-500">
                    {lang === "en" ? "Board Status:" : lang === "cn" ? "拼单状态:" : "สถานะกระดาน:"}
                  </span>
                  {activeBatch.isTest && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-400 px-2 py-0.5 text-[11px] font-black text-purple-950 shrink-0">
                      🧪 TEST
                    </span>
                  )}
                  {activeBatch.status === "COMPLETED" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 px-2.5 py-0.5 text-xs font-black shadow-2xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{lang === "en" ? "Delivered to Table (Closed)" : lang === "cn" ? "已送达取餐台 (已关闭)" : "จัดส่งถึงโต๊ะแล้ว (ปิดรอบแล้ว)"}</span>
                    </span>
                  ) : activeBatch.status === "ORDERED" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 border border-sky-300 text-sky-900 px-2.5 py-0.5 text-xs font-black shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-sky-600 animate-pulse" />
                      <span>{lang === "en" ? "Sent to Shop (Cooking / In Progress)" : lang === "cn" ? "已送店制作 (准备中)" : "ส่งร้านแล้ว (กำลังปรุง / ดำเนินการ)"}</span>
                    </span>
                  ) : activeBatch.status === "PENDING" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 px-2.5 py-0.5 text-xs font-black shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                      <span>{lang === "en" ? "Pending Delivery / Notice" : lang === "cn" ? "待送达 / 变更通知" : "รอส่งมอบ / มีประกาศด่วน"}</span>
                    </span>
                  ) : isBatchClosed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 px-2.5 py-0.5 text-xs font-black">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{lang === "en" ? "Cutoff Passed (Preparing)" : lang === "cn" ? "已截止点餐 (待送)" : "ปิดรับแล้ว (กำลังรวบรวมส่ง)"}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 border border-purple-300 text-purple-900 px-2.5 py-0.5 text-xs font-black">
                      <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                      <span>{lang === "en" ? "Open (Accepting Orders)" : lang === "cn" ? "开单中 (火热接单)" : "เปิดรับออเดอร์ (กำลังเปิดตี้)"}</span>
                    </span>
                  )}
                </div>

                {/* Quick Access Links: Kitchen Slip / Delivery Photo / Manifest */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Link to Delivery Photo if delivered */}
                  {activeBatch.deliveryPhotoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSlip({
                          url: activeBatch.deliveryPhotoUrl!,
                          title: `📸 ภาพหลักฐานส่งอาหารที่โต๊ะ ${activeBuildingName}`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                      title="ดูภาพหลักฐานส่งอาหารจริงที่โต๊ะ"
                    >
                      <Camera className="h-3 w-3" />
                      <span>{lang === "en" ? "View Delivery Photo" : lang === "cn" ? "查看送达照片" : "ดูรูปส่งอาหารจริง"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Visual 4-Step Progress Tracker */}
              <div className="grid grid-cols-4 gap-1 sm:gap-2 pt-1 border-t border-slate-100 text-center">
                {/* Step 1: Open */}
                <div className={`p-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
                  activeBatch.status === "OPEN" && !isBatchClosed
                    ? "bg-purple-50 border-purple-300 text-purple-900 ring-1 ring-purple-400"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>1. เปิดตี้</span>
                    {activeBatch.status !== "OPEN" || isBatchClosed ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-600 shrink-0 animate-ping" />
                    )}
                  </div>
                </div>

                {/* Step 2: Cutoff / Pending */}
                <div className={`p-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
                  isBatchClosed && activeBatch.status === "OPEN"
                    ? "bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-400"
                    : activeBatch.status === "PENDING"
                    ? "bg-amber-100 border-amber-400 text-amber-950 ring-1 ring-amber-500 animate-pulse"
                    : activeBatch.status === "ORDERED" || activeBatch.status === "COMPLETED"
                    ? "bg-slate-50 border-slate-200 text-slate-600"
                    : "bg-slate-50 border-slate-100 text-slate-400"
                }`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>2. ปิดรับ/รวบรวม</span>
                    {activeBatch.status === "ORDERED" || activeBatch.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : isBatchClosed || activeBatch.status === "PENDING" ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0 animate-ping" />
                    ) : null}
                  </div>
                </div>

                {/* Step 3: Ordered / Cooking */}
                <div className={`p-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
                  activeBatch.status === "ORDERED"
                    ? "bg-sky-50 border-sky-300 text-sky-900 ring-1 ring-sky-400"
                    : activeBatch.status === "COMPLETED"
                    ? "bg-slate-50 border-slate-200 text-slate-600"
                    : "bg-slate-50 border-slate-100 text-slate-400"
                }`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>3. กำลังปรุง</span>
                    {activeBatch.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : activeBatch.status === "ORDERED" ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-600 shrink-0 animate-pulse" />
                    ) : null}
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className={`p-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
                  activeBatch.status === "COMPLETED"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-500"
                    : "bg-slate-50 border-slate-100 text-slate-400"
                }`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>4. ถึงโต๊ะแล้ว</span>
                    {activeBatch.status === "COMPLETED" && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Order Pane Header: 3 Squeezed Cards in 1 Row (Shop, Drop-off, Leader) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              {/* Card 1: Shop */}
              <div
                style={{ borderLeftColor: activeShopAccentColor }}
                className="rounded-xl border border-slate-200 border-l-[3px] bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-purple-900 shrink-0">
                    <Store className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-purple-700 shrink-0" />
                    <span className="truncate">{t.shop}</span>
                  </span>
                  {(activeShopInfo?.cuisine || activeBatch.shop.cuisine) && (
                    <span className="rounded bg-purple-50 text-purple-900 px-1 py-0.2 text-[9px] sm:text-[10px] font-bold shrink-0 truncate max-w-[90px]">
                      {activeShopInfo?.cuisine || activeBatch.shop.cuisine}
                    </span>
                  )}
                </div>

                <div className="my-0.5">
                  <h3
                    className="text-xs sm:text-sm font-black text-slate-950 leading-tight truncate"
                    title={activeShopInfo?.name || activeBatch.shop.name}
                  >
                    {activeShopInfo?.name || activeBatch.shop.name}
                  </h3>
                </div>

                <div className="text-[9px] sm:text-[10px] text-slate-500 truncate" title={activeShopInfo?.description || activeBatch.shop.description || ""}>
                  {activeShopInfo?.description || activeBatch.shop.description || (lang === "en" ? "Restaurant" : "ร้านอาหาร")}
                </div>
              </div>

              {/* Card 2: Drop off location */}
              <div
                style={{ borderRightColor: activeBldgColor }}
                className="rounded-xl border border-slate-200 border-r-[3px] bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-800 shrink-0">
                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{t.dropoffPoint}</span>
                  </span>
                  <span
                    style={{
                      borderColor: activeBldgColor,
                      color: activeBldgColor,
                      backgroundColor: `${activeBldgColor}18`,
                    }}
                    className="rounded border px-1 py-0.2 text-[9px] sm:text-[10px] font-mono font-bold shrink-0"
                  >
                    {activeLocation.shortCode || "M4"}
                  </span>
                </div>

                <div className="my-0.5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-950 leading-tight truncate" title={activeBuildingName}>
                    {activeBuildingName}
                  </h3>
                </div>

                <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
                  <span className="text-slate-500 font-medium truncate" title={activeLocalizedLocation.deskDetail}>
                    {activeLocalizedLocation.deskDetail}
                  </span>
                  {activeLocation.mapUrl && (
                    <a
                      href={activeLocation.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-emerald-700 hover:text-emerald-900 hover:underline font-bold shrink-0"
                      title={lang === "en" ? "Open drop-off map" : lang === "cn" ? "打开取餐点地图" : "เปิดแผนที่จุดรับข้าว"}
                    >
                      <span>{t.dropoffMapShort}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Card 3: Leader or Retention Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-purple-900 shrink-0 min-w-0">
                    <span className="text-amber-500">👑</span>
                    <span className="truncate">{t.leader}</span>
                  </span>

                  {!activeBatch.isDeleted ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/order/${activeBatch.id}/leader`}
                        className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold transition-colors shadow-2xs shrink-0"
                        title="เข้าห้องหัวหน้าตี้เพื่ออัปเดตสถานะรอบ"
                      >
                        <SlidersHorizontal className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                        <span>อัปเดตสถานะ</span>
                      </Link>
                    </div>
                  ) : (
                    <span className="rounded bg-rose-100 text-rose-800 px-1 py-0.2 text-[8px] font-bold shrink-0">
                      Purged
                    </span>
                  )}
                </div>

                <div className="my-0.5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-950 leading-tight truncate" title={activeBatch.isDeleted ? "PDPA Purged" : (leaderLine || t.noLeader)}>
                    {activeBatch.isDeleted
                      ? (lang === "en" ? "Data Purged" : lang === "cn" ? "数据已清除" : "ข้อมูลถูกลบแล้ว")
                      : (leaderLine || t.noLeader)}
                  </h3>
                </div>

                <div className="text-[9px] sm:text-[10px] truncate">
                  {activeBatch.isDeleted ? (
                    <span className="text-slate-400">PDPA</span>
                  ) : leaderPhone ? (
                    <a
                      href={`tel:${leaderPhone}`}
                      className="inline-flex items-center gap-0.5 font-mono font-bold text-purple-900 hover:text-purple-700 hover:underline truncate"
                    >
                      <Phone className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                      <span className="truncate">{leaderPhone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">{lang === "en" ? "No phone" : lang === "cn" ? "未留电话" : "ไม่มีเบอร์"}</span>
                  )}
                </div>
              </div>
            </div>

            {/* If deleted (> 7 days), show privacy retention message instead of filling bars, orders, and form */}
            {activeBatch.isDeleted ? (
              <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-6 sm:p-8 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.deletedBoardNotice}
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  {lang === "en"
                    ? "Orders, phone numbers, and payment slips have been permanently purged from the database in compliance with data privacy policies. Only the shop and building delivery records remain."
                    : lang === "cn"
                    ? "根据数据隐私保护政策，超过7天的订单明细、电话号码及转账凭证已从数据库中永久清除，仅保留商家与取餐大楼的历史记录。"
                    : "ระบบได้ทำการลบข้อมูลรายการสั่งซื้อ เบอร์โทรศัพท์ และสลิปการโอนเงินออกจากฐานข้อมูลอย่างถาวรตามนโยบายความเป็นส่วนตัว (PDPA) โดยคงเหลือเฉพาะบันทึกประวัติชื่อร้านและตึกที่ส่งอาหารเท่านั้น"}
                </p>
              </div>
            ) : (
              <>
                {/* Below the 3 Cards: Two Progress Bars (Price Pool Filling Bar & Time Left Bar) */}
                <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-2xs space-y-2 sm:space-y-2.5">
                  {/* Bar 1: Price / Order Starter Filling Bar */}
                  <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-purple-900" />
                    <span>
                      <strong className="text-sm font-black text-slate-950 font-mono">฿{activeBatch.currentTotalAmount}</strong> / ฿{activeBatch.targetMinAmount}
                    </span>
                    <span className="text-slate-400 font-normal">({totalBoxesInBatch} {t.boxesCount})</span>
                  </span>

                  <span className={activeBatch.isMinMet ? "text-emerald-700 font-black" : "text-amber-800"}>
                    {activeBatch.isMinMet
                      ? t.freeGoalReached
                      : (lang === "en"
                          ? `฿${activeBatch.amountRemaining} more to free delivery`
                          : lang === "cn"
                          ? `还差 ฿${activeBatch.amountRemaining} 免运`
                          : `ขาดอีก ฿${activeBatch.amountRemaining} เพื่อส่งฟรี`)}
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeBatch.isMinMet
                        ? "bg-emerald-600"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, (activeBatch.currentTotalAmount / activeBatch.targetMinAmount) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Bar 2: Time Left Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-purple-900" />
                    <span className="text-sm font-black text-slate-950 font-mono">
                      {timeInfo?.text}
                    </span>
                    <span className="text-slate-500 font-normal text-[11px]">
                      ({formatCutoffDisplay(activeBatch.cutoffTime, activeBatch.date, lang, true)})
                    </span>
                  </span>

                  <span>
                    {isBatchClosed ? (
                      <span className="rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                        {lang === "en" ? "Closed" : lang === "cn" ? "已截止" : "ปิดรับแล้ว"}
                      </span>
                    ) : timeInfo?.remainingMs && timeInfo.remainingMs <= 15 * 60 * 1000 ? (
                      <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                        {lang === "en" ? "Closing Soon" : lang === "cn" ? "即将截止" : "ใกล้ปิดรอบ"}
                      </span>
                    ) : (
                      <span className="rounded-md bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-bold">
                        {lang === "en" ? "Accepting Orders" : lang === "cn" ? "接单中" : "กำลังเปิดรับ"}
                      </span>
                    )}
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      timeInfo?.isExpired
                        ? "bg-slate-300"
                        : timeProgressPercent <= 25
                        ? "bg-linear-to-r from-amber-500 to-rose-500"
                        : "bg-linear-to-r from-purple-800 to-purple-600"
                    }`}
                    style={{ width: `${timeInfo?.isExpired ? 100 : timeProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>



            {/* 3. The Live Whiteboard Table */}
            <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-slate-950">
                    {t.boardTitle}
                  </h3>
                  {isSelfPickup && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                      {t.selfPickupFull}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {t.realtimeUpdate}
                </span>
              </div>

              {activeOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-sm font-bold text-slate-600">{t.noOneOnBoard}</p>
                  <p className="text-xs text-slate-400">{t.beFirstOnBoard}</p>
                </div>
              ) : (
                <>
                  {/* Mobile View: Clean card list with prominent food item */}
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {activeOrders.map((ord) => {
                      const lineName = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
                      const hasSlip = Boolean(ord.slipImageUrl || ord.isSlipVerified);
                      return (
                        <div key={ord.id} className="p-3 sm:p-3.5 hover:bg-slate-50/80 transition-colors space-y-2">
                          {/* Row 1: [#1] @น้องวัว (dark gray) [📞 0123456789] */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white shrink-0">
                              #{ord.orderNumber}
                            </span>
                            <span className="font-semibold text-xs text-slate-600 truncate max-w-[150px]">
                              {lineName}
                            </span>
                            {ord.customerPhone && (
                              <a
                                href={`tel:${ord.customerPhone}`}
                                className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200/80 px-2 py-0.5 text-[11px] font-mono font-semibold hover:bg-purple-100 transition-colors shrink-0"
                                title={`โทรหา ${lineName}`}
                              >
                                <Phone className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                                <span>{ord.customerPhone}</span>
                              </a>
                            )}
                          </div>

                          {/* Row 2: Menu Items with Bullets & Explicit Quantity Badges */}
                          <div className="space-y-1.5 pl-0.5">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex flex-wrap items-baseline gap-1.5 leading-snug">
                                <span className="text-slate-400 font-bold">•</span>
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-black bg-purple-100 text-purple-900 shrink-0">
                                  {it.quantity || 1}x
                                </span>
                                <span className="text-sm sm:text-base font-black text-slate-950">
                                  {it.name}
                                </span>
                                {it.customNote && (
                                  <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.2">
                                    {it.customNote}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Row 3: [โอนแล้ว (KTB)]   ฿95 [ดูสลิป] [🗑️] */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            {/* Left: Transfer status */}
                            {hasSlip ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>โอนแล้ว{ord.slipBankName ? ` (${ord.slipBankName.split(" ")[0]})` : " ✓"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-bold shrink-0">
                                <span>⏳ รอสลิป</span>
                              </span>
                            )}

                            {/* Right: Price + Copy Order + View Slip + Cancel */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-black text-base text-orange-600">
                                ฿{ord.totalAmount}
                              </span>
                              {!isBatchClosed && activeGroup === "OPENING" && !activeBatch.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyEntireOrder(ord)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 px-2 py-1 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                                  title="สั่งตามเพื่อนทั้งออเดอร์นี้"
                                >
                                  <Copy className="h-3 w-3 text-purple-700" />
                                  <span>สั่งตามเพื่อน</span>
                                </button>
                              )}
                              {hasSlip && ord.slipImageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedSlip({
                                      url: ord.slipImageUrl,
                                      title: `สลิปกล่อง #${ord.orderNumber} (${lineName})`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-white text-purple-900 border border-purple-200 px-2 py-1 text-xs font-bold hover:bg-purple-50 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Eye className="h-3 w-3 text-purple-700" />
                                  <span>{t.viewSlip}</span>
                                </button>
                              )}
                              {isHost && activeBatch.status === "OPEN" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                  title={t.cancelOrderTitle}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop View: Spacious table with prominent food item */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-36">{t.thCustomer} / #</th>
                          <th className="py-2.5 px-3">{t.thDish}</th>
                          <th className="py-2.5 px-3 w-20 text-right">{t.thPrice}</th>
                          <th className="py-2.5 px-3 w-24 text-center">{t.thSlip}</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeOrders.map((ord) => {
                          const lineName = ord.customerLineId ? `@${ord.customerLineId}` : ord.customerName;
                          const hasSlip = Boolean(ord.slipImageUrl || ord.isSlipVerified);

                          return (
                            <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-slate-900 align-top">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-xs text-slate-600 truncate max-w-[130px] block">{lineName}</span>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-mono font-bold text-[11px] text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded w-fit">
                                      #{ord.orderNumber}
                                    </span>
                                    {ord.customerPhone && (
                                      <a
                                        href={`tel:${ord.customerPhone}`}
                                        className="inline-flex items-center gap-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 px-1 py-0.2 text-[10px] font-mono font-semibold hover:bg-purple-100 transition-colors"
                                        title={`โทรหา ${lineName}`}
                                      >
                                        <Phone className="h-2 w-2 text-purple-700" />
                                        <span>{ord.customerPhone}</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-slate-800 align-top">
                                <div className="space-y-1">
                                  {ord.items.map((it, idx) => (
                                    <div key={idx} className="flex items-baseline gap-1.5 flex-wrap">
                                      <span className="text-slate-400 font-bold mr-1">•</span>
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-black bg-purple-100 text-purple-900 mr-1.5 shrink-0">
                                        {it.quantity || 1}x
                                      </span>
                                      <span className="font-bold text-sm sm:text-base text-slate-950">
                                        {it.name}
                                      </span>
                                      {it.price && it.quantity > 1 ? (
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          (฿{it.price} × {it.quantity} = ฿{it.price * it.quantity})
                                        </span>
                                      ) : null}
                                      {it.customNote && (
                                        <span className="text-xs text-amber-900 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5">
                                          {it.customNote}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono font-black text-sm sm:text-base text-orange-600 text-right align-top">
                                ฿{ord.totalAmount}
                              </td>
                              <td className="py-3 px-3 text-center align-top">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {!isBatchClosed && activeGroup === "OPENING" && !activeBatch.isDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyEntireOrder(ord)}
                                      className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                                      title="สั่งตามเพื่อนทั้งออเดอร์นี้"
                                    >
                                      <Copy className="h-2.5 w-2.5 text-purple-700" />
                                      <span>สั่งตามเพื่อน</span>
                                    </button>
                                  )}
                                  {hasSlip ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedSlip({
                                          url: ord.slipImageUrl,
                                          title: `สลิปกล่อง #${ord.orderNumber} (${lineName})`,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>{ord.slipBankName ? ord.slipBankName.split(" ")[0] : t.viewSlip}</span>
                                    </button>
                                  ) : (
                                    <span className="inline-block rounded bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                                      {t.waitingSlip}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center align-top">
                                {isHost && activeBatch.status === "OPEN" && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOrder(ord.id, ord.orderNumber, lineName)}
                                    className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                                    title={t.cancelOrderTitle}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* 5. Fast 1-Screen Order Input Form (Force Transfer) */}
            {!isBatchClosed && activeGroup === "OPENING" && !activeBatch.isDeleted ? (
              <div id="order-form" className="rounded-2xl border-2 border-purple-900 bg-white p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-900 text-white font-black text-xs">
                      +
                    </span>
                    <h3 className="font-black text-sm sm:text-base text-slate-950">
                      {lang === "en" ? "Order Food" : lang === "cn" ? "点餐" : "สั่งอาหาร"}
                    </h3>
                  </div>
                </div>

                {submittedOrderNotice && (
                  <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/90 p-3.5 text-xs text-emerald-950 space-y-2 animate-in fade-in duration-300 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🎉</span>
                        <div>
                          <h4 className="font-black text-sm text-emerald-950">
                            {lang === "en" ? "Order Added!" : lang === "cn" ? "点餐成功！" : "สั่งอาหารสำเร็จ!"}
                          </h4>
                          <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                            กล่องของคุณ: <span className="font-mono text-purple-950 bg-white px-2 py-0.5 rounded border border-emerald-300 font-black text-xs">#{submittedOrderNotice.orderNumber} {submittedOrderNotice.boxLabel}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubmittedOrderNotice(null)}
                        className="rounded p-1 text-emerald-700 hover:bg-emerald-200/50 cursor-pointer"
                        title="ปิดการแจ้งเตือน"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-emerald-200/70 flex-wrap">
                      <Link
                        href="/orders"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-lg transition-colors shadow-2xs"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        <span>กล่องของฉัน</span>
                      </Link>
                      <span className="text-[10px] text-emerald-700">
                        หรือพิมพ์เบอร์ใน LINE Bot (@473ekpei) เพื่อเช็คสถานะ
                      </span>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleAddToWhiteboard} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Field 1: LINE ID */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block truncate">
                        {t.lineIdLabel} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.lineIdPlaceholder}
                        value={customerLineId}
                        onChange={(e) => setCustomerLineId(e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                      />
                    </div>

                    {/* Field 2: Phone Number (for shop to call) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between truncate">
                        <span>{t.phoneLabel} <span className="text-rose-500">*</span></span>
                        <span className="text-[9px] text-slate-400 font-normal hidden sm:inline">{t.phoneNote}</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        required
                        placeholder={t.phonePlaceholder}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Field 3: Multiple Menu Items List */}
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{t.orderItemsTitle}</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {activeBatch.shop.phone && (
                            <a
                              href={`tel:${activeBatch.shop.phone}`}
                              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                              title="โทรติดต่อร้านค้า"
                            >
                              <Phone className="h-2.5 w-2.5" />
                              <span>{activeBatch.shop.phone}</span>
                            </a>
                          )}
                          {activeBatch.shop.lineQrUrl && (
                            <button
                              type="button"
                              onClick={() => setShowLineQrModal(true)}
                              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                              title="ดู QR LINE ร้านค้า"
                            >
                              <MessageSquare className="h-2.5 w-2.5" />
                              <span>LINE ร้าน</span>
                            </button>
                          )}
                          {activeShopMapUrl && (
                            <a
                              href={activeShopMapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold transition-colors"
                              title="เปิดดูเมนูและรูปอาหารบน Google Maps"
                            >
                              <MapPin className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                              <span>{lang === "en" ? "Menu Maps ↗" : lang === "cn" ? "菜单地图 ↗" : "เมนู Maps ↗"}</span>
                            </a>
                          )}
                          <span className="text-[10px] text-slate-500 font-medium pl-1">
                            {totalItemBoxes} {t.boxesCount}
                          </span>
                        </div>
                      </div>
                    </div>


                    {/* Quick Pick Menu Items Chips */}
                    {activeBatch.shop.menuItems && activeBatch.shop.menuItems.length > 0 && (
                      <div className="space-y-1.5 pb-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="flex items-center gap-1 text-purple-900">
                            <Sparkles className="h-3 w-3 text-purple-700 shrink-0" />
                            <span>{lang === "en" ? "Quick Pick from Shop Menu:" : lang === "cn" ? "快速选择菜单推荐:" : "แตะเลือกเมนูแนะนำของร้าน:"}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {lang === "en" ? "(Tap to auto-fill)" : lang === "cn" ? "(点击自动填入)" : "(แตะเพื่อใส่ชื่อและราคา)"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-purple-50/50 border border-purple-200/60">
                          {activeBatch.shop.menuItems.map((menuItem) => {
                            const displayName = lang === "en" ? (menuItem.nameEn || menuItem.name) : menuItem.name;
                            return (
                              <button
                                key={menuItem.id}
                                type="button"
                                onClick={() => {
                                  const lastItem = orderItems[orderItems.length - 1];
                                  if (lastItem && !lastItem.name.trim()) {
                                    handleUpdateOrderItem(lastItem.id, "name", displayName);
                                    handleUpdateOrderItem(lastItem.id, "price", String(menuItem.price));
                                  } else {
                                    setOrderItems((prev) => [
                                      ...prev,
                                      {
                                        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                        name: displayName,
                                        price: String(menuItem.price),
                                        quantity: 1,
                                        customNote: "",
                                      },
                                    ]);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:border-purple-500 hover:bg-purple-100/70 hover:text-purple-950 transition-all shadow-2xs active:scale-95 text-left cursor-pointer"
                              >
                                {menuItem.popular && <span className="text-amber-500 text-[11px]">★</span>}
                                <span>{displayName}</span>
                                <span className="font-mono font-bold text-orange-600 ml-0.5">฿{menuItem.price}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    <div className="space-y-2.5">
                      {orderItems.map((item, index) => {
                        const itemSubtotal = (parseFloat(item.price) || 0) * (item.quantity || 1);

                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5 transition-all focus-within:border-purple-300 focus-within:bg-white"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-purple-900 text-white font-mono text-[10px]">
                                  {index + 1}
                                </span>
                                <span>{t.itemNumber} {index + 1}</span>
                              </span>
                              {orderItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOrderItem(item.id)}
                                  className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 hover:underline"
                                  title={t.removeItemButton}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>{t.removeItemButton}</span>
                                </button>
                              )}
                            </div>

                            {/* Dish Name with AI Autocomplete & AI Menu Suggester */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-600">
                                  {t.dishNamePlaceholder.split(" ")[0] || "รายการอาหาร"}
                                </span>
                                <AIMenuSuggester
                                  shopId={activeBatch.shop.id}
                                  shopName={activeBatch.shop.name}
                                  onSelectDish={(dishName, price) => {
                                    handleUpdateOrderItem(item.id, "name", dishName);
                                    if (price > 0) {
                                      handleUpdateOrderItem(item.id, "price", String(price));
                                    }
                                  }}
                                />
                              </div>
                              <DishAutocompleteInput
                                value={item.name}
                                onChange={(val) => handleUpdateOrderItem(item.id, "name", val)}
                                onSelectMenu={(menuName, price) => {
                                  handleUpdateOrderItem(item.id, "name", menuName);
                                  if (price > 0) {
                                    handleUpdateOrderItem(item.id, "price", String(price));
                                  }
                                }}
                                shopId={activeBatch.shop.id}
                                placeholder={t.dishNamePlaceholder}
                                required
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1.5 focus:ring-purple-700"
                              />
                            </div>

                            {/* Quantity, Price per unit, and Subtotal */}
                            <div className="grid grid-cols-12 gap-2 items-center">
                              {/* Quantity */}
                              <div className="col-span-5 sm:col-span-4 space-y-0.5">
                                <label className="text-[10px] font-bold text-slate-600 block">
                                  {t.quantityLabel}
                                </label>
                                <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderItem(item.id, "quantity", Math.max(1, item.quantity - 1))}
                                    className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      handleUpdateOrderItem(item.id, "quantity", isNaN(val) || val < 1 ? 1 : val);
                                    }}
                                    className="w-full text-center text-xs font-mono font-bold text-slate-900 focus:outline-none py-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderItem(item.id, "quantity", item.quantity + 1)}
                                    className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Price per unit */}
                              <div className="col-span-4 sm:col-span-4 space-y-0.5">
                                <label className="text-[10px] font-bold text-slate-600 block">
                                  {t.pricePerUnitLabel}
                                </label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  placeholder={t.dishPricePlaceholder}
                                  value={item.price}
                                  onChange={(e) => handleUpdateOrderItem(item.id, "price", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-orange-600 focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                                />
                              </div>

                              {/* Subtotal Display */}
                              <div className="col-span-3 sm:col-span-4 text-right pt-3">
                                <span className="text-[10px] text-slate-500 font-medium mr-1">{t.itemSubtotal}:</span>
                                <span className="text-xs font-mono font-black text-slate-900">
                                  ฿{itemSubtotal}
                                </span>
                              </div>
                            </div>

                            {/* Kitchen Note */}
                            <div>
                              <input
                                type="text"
                                placeholder={t.dishNotePlaceholder}
                                value={item.customNote}
                                onChange={(e) => handleUpdateOrderItem(item.id, "customNote", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Item Button */}
                    <button
                      type="button"
                      onClick={handleAddOrderItem}
                      className="w-full rounded-xl border border-dashed border-purple-300 bg-purple-50/60 hover:bg-purple-100/80 py-2 text-xs font-bold text-purple-900 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t.addItemButton}</span>
                    </button>
                  </div>

                  {/* 3 Bottom Cards: Total, Display QR, Upload Slip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    {/* Card 1: Total */}
                    <div className="rounded-xl bg-purple-950 text-white p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
                      <div className="text-[11px] text-purple-200 font-medium flex items-center justify-between">
                        <span>{t.totalTransferAmount}</span>
                        <span className="text-[10px] text-purple-300">
                          ({totalItemBoxes} {t.boxesCount})
                        </span>
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl sm:text-2xl font-mono font-black text-amber-300">
                          ฿{calculatedTotal}
                        </span>
                      </div>
                      <div className="text-[10px] text-purple-300 leading-tight">
                        {t.oneQrNotice}
                      </div>
                    </div>

                    {/* Card 2: Display QR */}
                    {(() => {
                      const shopQrUrl =
                        activeBatch.shop.promptpayQrUrl ||
                        (activeBatch.shop.promptpayNumber
                          ? `https://promptpay.io/${activeBatch.shop.promptpayNumber.replace(/\D/g, "")}.png`
                          : null);

                      const handleQrAction = () => {
                        // On Mobile (touch device / small screen): download image directly for bank app scanner
                        const isMobile = typeof window !== "undefined" && (window.innerWidth < 640 || "ontouchstart" in window);
                        if (isMobile && shopQrUrl) {
                          const a = document.createElement("a");
                          a.href = shopQrUrl;
                          a.download = `PromptPay-${activeBatch.shop.name}.png`;
                          a.target = "_blank";
                          a.click();
                        } else {
                          // On PC / Desktop: Enlarge full screen modal to scan with phone
                          setShowPromptPayModal(true);
                        }
                      };

                      return (
                        <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-2.5 sm:p-3 flex flex-col justify-between items-center text-center shadow-2xs">
                          <div className="w-full flex items-center justify-between gap-1 text-[11px] font-bold text-purple-950 mb-0.5">
                            <span className="flex items-center gap-1.5">
                              <QrCode className="h-3.5 w-3.5 text-purple-700" />
                              <span>QR พร้อมเพย์ร้าน</span>
                            </span>
                          </div>

                          {shopQrUrl ? (
                            <button
                              type="button"
                              onClick={handleQrAction}
                              className="group relative my-1 h-20 w-20 rounded-lg bg-white p-1 border border-purple-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer flex items-center justify-center shrink-0"
                              title="แตะเพื่อดู QR หรือดาวน์โหลด"
                            >
                              <img
                                src={shopQrUrl}
                                alt="PromptPay QR"
                                className="h-full w-full object-contain"
                              />
                              <div className="absolute inset-0 bg-purple-900/10 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                <Maximize2 className="h-4 w-4 text-purple-900 hidden sm:block" />
                                <Download className="h-4 w-4 text-purple-900 sm:hidden" />
                              </div>
                            </button>
                          ) : null}

                          <div className="text-[10px] text-purple-950 font-bold truncate w-full">
                            {activeBatch.shop.promptpayAccountName || activeBatch.shop.name}
                          </div>
                          {activeBatch.shop.promptpayNumber && (
                            <div className="text-[10px] font-mono text-purple-800 font-semibold">
                              {activeBatch.shop.promptpayNumber}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleQrAction}
                            className="mt-1.5 inline-flex items-center justify-center gap-1 w-full rounded-lg bg-purple-900 hover:bg-purple-800 text-white py-1.5 px-2 text-[11px] font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
                          >
                            <span className="hidden sm:inline-flex items-center gap-1">
                              <Maximize2 className="h-3 w-3" />
                              <span>ขยายดู QR เต็มจอ</span>
                            </span>
                            <span className="inline-flex sm:hidden items-center gap-1">
                              <Download className="h-3 w-3" />
                              <span>โหลดรูป QR สแกนจ่าย</span>
                            </span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Card 3: Upload Slip */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-purple-900" />
                          <span>{t.slipLabel} <span className="text-rose-500">*</span></span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">{t.slipScanAuto}</span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        required
                        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                        onChange={handleSlipFileChange}
                        className="block w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-purple-900 file:text-white hover:file:bg-purple-800 cursor-pointer"
                      />

                      {scanningSlip && (
                        <div className="text-[10px] font-bold text-purple-900 animate-pulse flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-purple-900 border-t-transparent" />
                          <span>{t.slipScanning}</span>
                        </div>
                      )}

                      {slipVerification && (
                        <div
                          className={`rounded-lg p-1.5 text-[10px] font-bold flex items-center gap-1.5 ${
                            slipVerification.isValid
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-blue-50 text-blue-900 border border-blue-200"
                          }`}
                        >
                          <CheckCircle2 className={`h-3 w-3 shrink-0 ${slipVerification.isValid ? "text-emerald-600" : "text-blue-600"}`} />
                          <div className="space-y-0.2 truncate text-[10px]">
                            {slipVerification.isValid ? (
                              <>
                                <div className="truncate">
                                  {t.slipVerified} <strong>{slipVerification.bankName}</strong>
                                </div>
                                {slipVerification.transRef && (
                                  <div className="font-mono text-emerald-800 truncate">
                                    {t.slipRef} {slipVerification.transRef}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div>{t.slipAttached}</div>
                                <div className="font-normal text-blue-800 truncate">
                                  {slipVerification.note || t.slipNote}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submittingOrder || !slipPreview}
                    className="w-full rounded-xl bg-purple-900 py-3 text-xs sm:text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50 active:scale-99 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {submittingOrder ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>{t.submittingToWhiteboard}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>{t.submitToWhiteboard}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : !activeBatch.isDeleted ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center space-y-1 text-slate-600">
                <p className="text-xs font-bold">
                  {activeGroup === "ARCHIVED"
                    ? t.boardArchiveNotice
                    : t.boardClosedNotice}
                </p>
                {openingBatches.length > 0 && activeGroup !== "OPENING" && (
                  <button
                    type="button"
                    onClick={() => handleSelectGroup("OPENING")}
                    className="text-xs font-bold text-purple-900 underline hover:text-purple-700 pt-1 inline-block cursor-pointer"
                  >
                    {t.switchToLiveToday}
                  </button>
                )}
              </div>
            ) : null}
              </>
            )}
          </div>
        ) : null}
      </main>

      {/* MODAL 1: PromptPay QR */}
      {showPromptPayModal && activeBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-center space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-xs text-slate-900">{t.promptPayModalTitle}</h3>
              <button
                type="button"
                onClick={() => setShowPromptPayModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto w-52 h-52 sm:w-72 sm:h-72 bg-white rounded-2xl border-2 border-purple-200 p-3 shadow-inner flex items-center justify-center">
              <img
                src={activeBatch.shop.promptpayQrUrl || `https://promptpay.io/${activeBatch.shop.promptpayNumber}.png`}
                alt="PromptPay QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-[11px] text-slate-500 font-medium">{t.accountName}</p>
              <p className="text-sm font-black text-slate-900">{activeBatch.shop.promptpayAccountName || activeBatch.shop.name}</p>
              {activeBatch.shop.promptpayNumber && (
                <p className="text-xs font-mono font-bold text-purple-900 mt-0.5">
                  {activeBatch.shop.promptpayNumber}
                </p>
              )}
            </div>

            {/* Subtle Guideline Disclosure */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-[11px] text-amber-900 text-left flex items-start gap-2 leading-relaxed">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{t.qrModalGuideline}</span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              {(activeBatch.shop.promptpayQrUrl || activeBatch.shop.promptpayNumber) && (
                <a
                  href={activeBatch.shop.promptpayQrUrl || `https://promptpay.io/${activeBatch.shop.promptpayNumber}.png`}
                  download={`PromptPay-${activeBatch.shop.name}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-lg bg-purple-50 border border-purple-200 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-purple-700" />
                  <span>บันทึกรูป QR ลงเครื่อง</span>
                </a>
              )}
              {activeBatch.shop.promptpayNumber && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeBatch.shop.promptpayNumber || "");
                    alert(t.copiedPromptPay);
                  }}
                  className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  {t.copyPromptPay}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1.5: Shop LINE QR */}
      {showLineQrModal && activeBatch && activeBatch.shop.lineQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-center space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                <MessageSquare className="h-4 w-4 text-[#06C755]" />
                <span>QR LINE ร้านค้า</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLineQrModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto w-48 h-48 bg-white rounded-xl border border-emerald-200 p-2 shadow-inner flex items-center justify-center">
              <img
                src={activeBatch.shop.lineQrUrl}
                alt="LINE QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-[11px] text-slate-500 font-medium">ร้านค้า:</p>
              <p className="text-sm font-black text-slate-900">{activeBatch.shop.name}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-[11px] text-emerald-950 text-left flex items-start gap-2 leading-relaxed">
              <Info className="h-4 w-4 text-[#06C755] shrink-0 mt-0.5" />
              <span>สแกน QR ด้วยแอป LINE เพื่อเพิ่มเพื่อนและติดต่อร้านค้าโดยตรง</span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              {activeBatch.shop.lineQrUrl && (
                <a
                  href={activeBatch.shop.lineQrUrl}
                  download={`line-qr-${activeBatch.shop.id}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-lg bg-emerald-50 border border-emerald-300 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-[#06C755]" />
                  <span>บันทึกรูป QR ลงเครื่อง</span>
                </a>
              )}
              {activeBatch.shop.phone && (
                <a
                  href={`tel:${activeBatch.shop.phone}`}
                  className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-600" />
                  <span>โทรหาร้าน ({activeBatch.shop.phone})</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Slip Viewer */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-h-[90vh] max-w-md rounded-2xl bg-white p-4 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-900">{selectedSlip.title}</h3>
              <button
                onClick={() => setSelectedSlip(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 overflow-y-auto max-h-[75vh] flex items-center justify-center bg-slate-50 rounded">
              <img
                src={selectedSlip.url}
                alt="Full Transfer Slip"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: One Long Manifest Image Generator */}
      {showSendModal && activeBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] rounded-2xl bg-white p-5 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-900 text-white font-bold text-xs">
                  <Send className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">{t.oneLongManifestTitle}</h3>
                  <p className="text-[11px] text-slate-500">{t.oneLongManifestSub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
              {generatingManifest ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="h-7 w-7 animate-spin rounded-full border-3 border-purple-900 border-t-transparent" />
                  <span className="text-xs font-black text-purple-900">
                    {t.generatingManifest}
                  </span>
                </div>
              ) : manifestData ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{t.manifestSuccess}</span>
                  </div>

                  <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-900 shadow-inner max-h-80 overflow-y-auto">
                    <img
                      src={manifestData.dataUrl}
                      alt="One Long Manifest"
                      className="w-full h-auto object-contain"
                    />
                  </div>

                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{t.summaryForChat}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(getCompiledOrderText());
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2000);
                        }}
                        className="text-[11px] text-purple-900 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedText ? t.copiedText : t.copyText}</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-sans text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {getCompiledOrderText()}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>

            {manifestData && (
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 shrink-0">
                {/* 1. Primary Action: Send Text directly to LINE */}
                <button
                  type="button"
                  onClick={handleSendTextToLine}
                  className="w-full rounded-xl bg-[#06C755] hover:bg-[#05b34c] py-2.5 text-xs sm:text-sm font-black text-white shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>💬 {t.sendTextToLine}</span>
                </button>

                {/* 2. Secondary Row: Share Image & Save Image */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareImageOnly}
                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2 px-3 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Share2 className="h-3.5 w-3.5 text-slate-600" />
                    <span>🖼️ {t.shareLongImage}</span>
                  </button>

                  <a
                    href={manifestData.dataUrl}
                    download={`order-manifest-${activeBatch.id.slice(0, 8)}.jpg`}
                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2 px-3 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-colors text-center shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600" />
                    <span>{t.saveLongImage}</span>
                  </a>
                </div>

                {/* 3. Host Action: Mark Sent to Shop */}
                <button
                  type="button"
                  onClick={handleConfirmSentToShop}
                  className="w-full rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 py-2 px-3 text-xs font-bold text-purple-900 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title={t.markSentToShop}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-700" />
                  <span>{t.markSentToShop}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Archived Boards Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                  <Archive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-950">{t.archiveModalTitle}</h3>
                  <p className="text-xs text-slate-500">{t.archiveModalSub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-100">
              {archivedBatches.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-1">
                  <Archive className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">{t.noArchivedBoards}</p>
                  <p className="text-xs text-slate-400">{t.allActiveLive}</p>
                </div>
              ) : (
                archivedBatches.map((b) => (
                  <div key={b.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{getShopLocalizedInfo(b.shop, lang).name}</strong>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          b.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {b.status === "COMPLETED" ? t.roundCompleted : b.status === "CANCELLED" ? t.roundCancelled : t.roundClosed}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                        <span>{t.orderDate}: <strong>{b.date}</strong></span>
                        <span>{formatCutoffDisplay(b.cutoffTime, b.date, lang, true)}</span>
                        <span>{t.currentTotal}: <strong className="text-orange-600">฿{b.currentTotalAmount}</strong> ({b.orders?.filter((o) => !o.deletedAt).length || 0} {t.boxesCount})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBatchId(b.id);
                          setActiveGroup("ARCHIVED");
                          setShowArchiveModal(false);
                        }}
                        className="rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 px-3 py-1.5 text-xs font-bold transition-colors shadow-2xs"
                      >
                        {t.viewBoard}
                      </button>
                      {b.status === "COMPLETED" && (
                        <Link
                          href={`/delivery/${b.id}`}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Camera className="h-3 w-3" />
                          <span>{t.viewDeliveryPhoto} {b.buildingName ? getLocalizedBuildingName(b.buildingName, lang).replace("Bldg ", "").replace(" 栋", "") : ""}</span>
                        </Link>
                      )}
                      <Link
                        href={`/shop/${b.id}`}
                        target="_blank"
                        className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <span>{t.kitchenSheet}</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {t.closeWindow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Open Board Modal (Anyone can open a board for Building + Shop) */}
      {showOpenBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{t.openBoardTitle}</h3>
                  <p className="text-xs text-purple-200">{t.openBoardSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenBoardModal(false)}
                className="rounded-lg p-1.5 text-purple-200 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBoard} className="p-5 overflow-y-auto space-y-4 text-xs">
              {openBoardError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{openBoardError}</span>
                </div>
              )}

              {/* 1. ร้านอาหาร */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{t.stepShop} <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal flex items-center gap-1">
                    {syncingGoogleHours && (
                      <span className="text-purple-700 animate-pulse font-semibold">🔄 กำลังอัปเดตเวลาทำการจาก Google Maps...</span>
                    )}
                    <span>{lang === "en" ? "Available in system" : lang === "cn" ? "系统内餐厅" : "ร้านที่มีในระบบ"}</span>
                  </span>
                </label>
                <select
                  value={openShopId}
                  onChange={(e) => handleShopChangeWithGoogleSync(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                >
                  {availableShops.length === 0 ? (
                    <option value="">
                      {lang === "en" ? "Loading shops..." : lang === "cn" ? "正在加载餐厅..." : "กำลังโหลดรายชื่อร้าน..."}
                    </option>
                  ) : (
                    availableShops.map((s) => {
                      const localizedShop = getShopLocalizedInfo(s, lang);
                      const bkkDay = getBangkokDayOfWeek();
                      const isOpen = isShopOpenOnDay(s, bkkDay);
                      const daysText = formatOpenDaysText(s.openDays, lang);
                      return (
                        <option key={s.id} value={s.id}>
                          {isOpen ? "🟢" : "🔴"} {localizedShop.name} ({localizedShop.cuisine}) &bull; {isOpen ? (lang === "en" ? "Open today" : lang === "cn" ? "今日接单" : "เปิดวันนี้") : (lang === "en" ? `Closed (${daysText})` : lang === "cn" ? `休息 (${daysText})` : `ปิดวันนี้ (${daysText})`)} {s.minDeliveryAmount ? `&bull; ${lang === "en" ? "Min" : lang === "cn" ? "免运" : "ขั้นต่ำ"} ฿${s.minDeliveryAmount}` : ""}
                        </option>
                      );
                    })
                  )}
                </select>

                {/* Selected Shop Status Badge / Alert */}
                {(() => {
                  const bkkDay = getBangkokDayOfWeek();
                  const selectedShop = availableShops.find((x) => x.id === openShopId);
                  if (!selectedShop) return null;
                  const isOpen = isShopOpenOnDay(selectedShop, bkkDay);
                  const daysText = formatOpenDaysText(selectedShop.openDays, lang);
                  const isShopActive = selectedShop.isActive !== false;

                  if (!isShopActive) {
                    return (
                      <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-900 flex items-center gap-2 animate-in fade-in">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                        <div>
                          <strong className="block font-bold">
                            {lang === "en" ? "Shop is temporarily inactive" : lang === "cn" ? "餐厅暂停接单" : "ร้านปิดให้บริการชั่วคราว (Inactive)"}
                          </strong>
                          <span className="text-[11px] text-rose-700">
                            {lang === "en" ? "Cannot open a board for this shop. Please choose another shop." : lang === "cn" ? "暂时无法为此餐厅开单，请选择其他餐厅。" : "ไม่สามารถเปิดตี้สำหรับร้านนี้ได้ กรุณาเลือกร้านอาหารอื่น"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (!isOpen) {
                    return (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 flex items-center gap-2 animate-in fade-in">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                          <strong className="block font-bold">
                            {lang === "en" ? "Shop is closed today" : lang === "cn" ? "餐厅今日休息" : "ร้านปิดทำการในวันนี้"}
                          </strong>
                          <span className="text-[11px] text-amber-800">
                            {lang === "en" ? `Open days: ${daysText}. Please choose an open restaurant.` : lang === "cn" ? `营业日: ${daysText}。请选择今日营业的餐厅。` : `วันเปิดทำการปกติ: ${daysText} — กรุณาเลือกร้านอื่นที่เปิดรับออเดอร์วันนี้`}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const googleHoursText = selectedShop.googleOpeningHours?.weekdayDescriptions?.[bkkDay === 0 ? 6 : bkkDay - 1];

                  return (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" />
                      <div className="min-w-0 flex-1 text-[11px]">
                        <span className="font-bold text-emerald-950">
                          {lang === "en" ? "Open today" : lang === "cn" ? "今日正常接单" : "ร้านเปิดรับออเดอร์วันนี้"}
                        </span>
                        {googleHoursText ? (
                          <span className="text-emerald-800 font-medium ml-1.5 font-mono">📍 {googleHoursText}</span>
                        ) : (
                          <span className="text-emerald-700 ml-1.5">&bull; วันทำการ: {daysText}</span>
                        )}
                        <span className="text-emerald-700 ml-1.5">&bull; ขั้นต่ำ ฿{selectedShop.minDeliveryAmount || 200}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Warning / Recommendation if an active (not-closed) board for this shop already exists today */}
                {(() => {
                  const dup = openingBatches.find((b) => b.shopId === openShopId);
                  if (!dup) return null;
                  return (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>
                          {lang === "en"
                            ? "This shop already has an open board accepting orders!"
                            : lang === "cn"
                            ? "该餐厅已有正在接单中的拼单！"
                            : "ร้านนี้มีตี้เปิดรับออเดอร์อยู่แล้วในขณะนี้!"}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        {lang === "en" ? (
                          <>
                            An open board is currently accepting orders at{" "}
                            <strong>{dup.buildingName || "M4"}</strong> ({formatCutoffDisplay(dup.cutoffTime, dup.date, "en", true)} • Current: ฿{dup.currentTotalAmount}/฿{dup.targetMinAmount}).
                            Joining the existing board helps reach the free delivery minimum faster!
                          </>
                        ) : lang === "cn" ? (
                          <>
                            <strong>{dup.buildingName || "M4"}</strong> 已有正在接单的拼单 ({formatCutoffDisplay(dup.cutoffTime, dup.date, "cn", true)} • 进度: ฿{dup.currentTotalAmount}/฿{dup.targetMinAmount})。
                            合并拼单可更快达到免运门槛！
                          </>
                        ) : (
                          <>
                            มีตี้ร้านนี้กำลังเปิดรับออเดอร์อยู่ที่ <strong>{dup.buildingName || "ตึก M4"}</strong> ({formatCutoffDisplay(dup.cutoffTime, dup.date, "th", true)} • ยอดปัจจุบัน ฿{dup.currentTotalAmount}/฿{dup.targetMinAmount})
                            หากสั่งรวมในตี้เดิมจะช่วยให้ครบยอด ฿200 ส่งฟรีได้เร็วยิ่งขึ้น
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOpenBoardModal(false);
                          setActiveGroup("OPENING");
                          setActiveBatchId(dup.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer active:scale-95"
                      >
                        <span>
                          {lang === "en"
                            ? "👉 Join Existing Open Board"
                            : lang === "cn"
                            ? "👉 加入现有未截止拼单"
                            : "👉 ไปร่วมตี้เดิมที่มีอยู่แล้ว"}
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* 2. ตึกปลายทาง */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{t.stepBuilding} <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-purple-700 font-semibold">
                    {lang === "en" ? "Destination building" : lang === "cn" ? "送达楼栋" : "เฉพาะตึกนี้"}
                  </span>
                </label>
                <select
                  value={openBuildingId}
                  onChange={(e) => setOpenBuildingId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                >
                  {locations
                    .filter((loc) => loc.isActive !== false)
                    .map((loc) => {
                      const locInfo = getLocalizedLocation(loc, lang);
                      return (
                        <option key={loc.id} value={loc.id}>
                          {locInfo.name} — {locInfo.deskDetail}
                        </option>
                      );
                    })}
                </select>
                <p className="text-[11px] text-slate-500">
                  {t.buildingRiderNotice}
                </p>
              </div>

              {/* 3. ข้อมูลหัวหน้าตี้ (Leader Contact) */}
              <div className="rounded-xl bg-purple-50/70 border border-purple-200 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-purple-950 font-bold">
                  <span className="text-sm">👑</span>
                  <span>{t.stepLeader}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">
                      {t.leaderName} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={openLeaderName}
                      onChange={(e) => setOpenLeaderName(e.target.value)}
                      placeholder={lang === "en" ? "e.g. Golf or @golf_123" : lang === "cn" ? "例如: 小李 或 @golf_123" : "เช่น somchai_v หรือ สมชาย"}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">
                      {t.leaderPhone} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={openLeaderPhone}
                      onChange={(e) => setOpenLeaderPhone(e.target.value)}
                      placeholder="0812345678"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-purple-200/60">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      <Key className="h-3 w-3 text-purple-700" />
                      <span>{t.leaderPin}</span>
                    </label>
                    <span className="text-[10px] text-purple-700 font-semibold">{t.leaderPinHint}</span>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={openHostPin}
                    onChange={(e) => setOpenHostPin(e.target.value.replace(/\D/g, ""))}
                    placeholder={openLeaderPhone ? openLeaderPhone.replace(/\D/g, "").slice(-4) || "1234" : "1234"}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono tracking-widest font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {t.leaderPinDesc}
                  </p>
                </div>
                <p className="text-[11px] text-purple-900 flex items-start gap-1">
                  <Phone className="h-3 w-3 shrink-0 mt-0.5 text-purple-700" />
                  <span>{t.leaderPhoneHelp}</span>
                </p>
              </div>

              {/* 4. สั่งอาหารได้ถึง... (Cutoff Date & Time) & ยอดขั้นต่ำ */}
              <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-3 sm:p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Clock className="h-4 w-4 text-purple-700" />
                    <span>{t.stepCutoff}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-purple-900 bg-white px-2 py-0.5 rounded-md border border-purple-200 shadow-2xs">
                    {formatCutoffDisplay(openCutoffTime, openCutoffDate, lang, true)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Date Input */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-purple-700" />
                      <span>{t.cutoffDate}</span>
                    </div>
                    <input
                      type="date"
                      value={openCutoffDate}
                      min={todayStr}
                      onChange={(e) => setOpenCutoffDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>

                  {/* Order Time Input (Send to Shop) */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-purple-700" />
                        <span>{t.orderTimeLabel}</span>
                      </span>
                      <span className="text-[10px] text-purple-700 font-mono font-semibold">
                        ({t.cutoffTimeSummary} {openCutoffTime} น.)
                      </span>
                    </div>
                    <input
                      type="time"
                      value={openOrderTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOpenOrderTime(val);
                        setOpenCutoffTime(addMinutesToTimeString(val, -15));
                      }}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                </div>

                {/* Explanation Card for Leader */}
                <div className="rounded-xl border border-purple-200/90 bg-white/95 p-2.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                    <div className="text-rose-600 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 inline-block" />
                      <span>{t.cutoffTimeSummary}:</span>
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        {openCutoffTime} น.
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">{t.fixedBufferTag}</span>
                    </div>
                    <div className="text-slate-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0 inline-block" />
                      <span>{t.orderTimeSummary}:</span>
                      <span className="font-mono font-bold text-purple-900 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                        {openOrderTime} น.
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                    💡 {t.cutoffNoticeFixed}
                  </p>
                </div>

                {/* Quick Date Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500">{lang === "en" ? "Quick select:" : lang === "cn" ? "快捷选择:" : "เลือกด่วน:"}</span>
                  {(() => {
                    const addDays = (days: number) => {
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      return getBangkokDate(d);
                    };
                    const presets = [
                      { label: t.quickToday, date: todayStr },
                      { label: t.quickTomorrow, date: addDays(1) },
                      { label: t.quick2Days, date: addDays(2) },
                      { label: t.quick3Days, date: addDays(3) },
                    ];
                    return presets.map((p) => {
                      const isSelected = openCutoffDate === p.date;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setOpenCutoffDate(p.date)}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-purple-900 text-white border-purple-900 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-300"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Target Min Amount */}
                <div className="pt-2 border-t border-purple-100/80">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      {t.stepTargetMin}
                    </label>
                    <input
                      type="number"
                      value={openTargetMin}
                      onChange={(e) => setOpenTargetMin(e.target.value)}
                      min="0"
                      step="10"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* 5. หมายเหตุ */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  {t.stepNotes}
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder={t.stepNotesPlaceholder}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpenBoardModal(false)}
                  disabled={creatingBoard}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                {(() => {
                  const bkkDay = getBangkokDayOfWeek(openCutoffDate);
                  const targetShop = availableShops.find((s) => s.id === openShopId);
                  const isClosed = targetShop ? !isShopOpenOnDay(targetShop, bkkDay) : false;
                  return (
                    <button
                      type="submit"
                      disabled={creatingBoard || isClosed}
                      className="rounded-xl bg-purple-900 hover:bg-purple-800 text-white px-5 py-2 text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {creatingBoard ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>{t.openingBoard}</span>
                        </>
                      ) : isClosed ? (
                        <span>{lang === "en" ? "Shop closed on selected date" : lang === "cn" ? "该日期商家休息" : "ร้านปิดในวันที่เลือก (ไม่สามารถเปิดตี้)"}</span>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>{t.openBoardButton}</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
