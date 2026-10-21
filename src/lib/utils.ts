/**
 * Add or subtract minutes from HH:mm time string
 */
export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  if (!timeStr || !timeStr.includes(":")) return "11:30";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr || "11", 10);
  let m = parseInt(mStr || "30", 10);
  if (isNaN(h)) h = 11;
  if (isNaN(m)) m = 30;
  const totalM = (h * 60 + m + minutesToAdd + 1440) % 1440;
  const newH = String(Math.floor(totalM / 60)).padStart(2, "0");
  const newM = String(totalM % 60).padStart(2, "0");
  return `${newH}:${newM}`;
}

/**
 * Clean and shorten shop name for compact tab headers (e.g. "ครัวป้าต่าย ป่ายุบใน" -> "ป้าต่าย")
 */
export function getShortShopName(fullName?: string): string {
  if (!fullName) return "ร้าน";
  const cleaned = fullName
    .replace(/^(ครัว|ร้านอาหาร|ร้าน|ก๋วยเตี๋ยว|ข้าวมันไก่|ข้าวแกง)\s*/, "")
    .trim();
  return cleaned.split(" ")[0] || fullName.split(" ")[0] || fullName;
}

/**
 * Format tab header for multiple opening boards: e.g. "ป้าต่าย - M4 - 11:15 (+1)"
 */
export function formatTabHeader(
  shopName: string,
  buildingName?: string,
  cutoffTime?: string,
  batchDate?: string,
  lang: "th" | "en" | "cn" = "th"
): string {
  const shortShop = getShortShopName(shopName);
  const bldgCode = (buildingName || "M4")
    .replace(/^(Bldg\s*|ตึก\s*)/i, "")
    .replace(/\s*栋/i, "")
    .trim() || "M4";
  const time = cutoffTime || "11:15";
  const today = getBangkokDate();
  const diffDays = batchDate ? -getDaysDifference(batchDate, today) : 0;
  const futureTag = diffDays > 0 ? ` (+${diffDays})` : "";
  return `${shortShop} - ${bldgCode} - ${time}${futureTag}`;
}

/**
 * Formats cutoff display string:
 * - Option 1: "เวลาสั่งอาหาร 10.00น (ปิดรับออเดอร์ล่วงหน้า 15 นาที)"
 * - If cutoff date is not today: add (+xx) or (in xx days)
 */
export function formatCutoffDisplay(
  cutoffTime: string,
  batchDate?: string,
  lang: "th" | "en" | "cn" = "th",
  includeLabel = false
): string {
  const today = getBangkokDate();
  const orderTime = addMinutesToTimeString(cutoffTime, 15);
  const diffDays = batchDate ? -getDaysDifference(batchDate, today) : 0;
  const futureTag = diffDays > 0 ? ` (+${diffDays})` : "";

  if (includeLabel) {
    if (lang === "en") {
      return `Order until ${cutoffTime}${futureTag} (Shop batch ${orderTime})`;
    }
    if (lang === "cn") {
      return `点餐截止至 ${cutoffTime}${futureTag} (送店批次 ${orderTime})`;
    }
    // Thai: "สั่งได้ถึง 09:45 น. (ส่งร้านรอบ 10:00 น.)"
    return `สั่งได้ถึง ${cutoffTime} น.${futureTag} (ส่งร้านรอบ ${orderTime} น.)`;
  }

  // Without label: return short cutoff time with future tag
  return lang === "th" ? `${cutoffTime} น.${futureTag}` : `${cutoffTime}${futureTag}`;
}

export function getTimeRemaining(
  cutoffTimeStr: string,
  batchDate?: string,
  lang: "th" | "en" | "cn" = "th"
): { isExpired: boolean; text: string; remainingMs: number } {
  try {
    let cutoffEpoch: number;
    if (batchDate && /^\d{4}-\d{2}-\d{2}$/.test(batchDate)) {
      cutoffEpoch = new Date(`${batchDate}T${cutoffTimeStr}:00+07:00`).getTime();
    } else {
      const bkkDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      cutoffEpoch = new Date(`${bkkDateStr}T${cutoffTimeStr}:00+07:00`).getTime();
    }

    const diffMs = cutoffEpoch - Date.now();
    if (isNaN(diffMs) || diffMs <= 0) {
      const closedText = lang === "en" ? "Closed" : lang === "cn" ? "已截止" : "ปิดรอบแล้ว";
      return { isExpired: true, text: closedText, remainingMs: 0 };
    }

    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    let text = "";
    if (lang === "en") {
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remH = hours % 24;
        text = remH > 0 ? `${days}d ${remH}h` : `${days}d`;
      } else if (hours > 0) {
        text = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      } else if (minutes > 0) {
        text = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
      } else {
        text = `${seconds}s`;
      }
      return { isExpired: false, text: `${text} left`, remainingMs: diffMs };
    } else if (lang === "cn") {
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remH = hours % 24;
        text = remH > 0 ? `${days}天${remH}小时` : `${days}天`;
      } else if (hours > 0) {
        text = minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`;
      } else if (minutes > 0) {
        text = seconds > 0 ? `${minutes}分${seconds}秒` : `${minutes}分`;
      } else {
        text = `${seconds}秒`;
      }
      return { isExpired: false, text: `还剩 ${text}`, remainingMs: diffMs };
    } else {
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remH = hours % 24;
        text = remH > 0 ? `${days} วัน ${remH} ชม.` : `${days} วัน`;
      } else if (hours > 0) {
        text = minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
      } else if (minutes > 0) {
        text = seconds > 0 ? `${minutes} นาที ${seconds} วิ` : `${minutes} นาที`;
      } else {
        text = `${seconds} วิ`;
      }
      return { isExpired: false, text: `อีก ${text}`, remainingMs: diffMs };
    }
  } catch {
    const fallback = formatCutoffDisplay(cutoffTimeStr, batchDate, lang, true);
    return { isExpired: false, text: fallback, remainingMs: 0 };
  }
}

export function maskPhoneNumber(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 9) {
    return `${digits.slice(0, 3)}-***-${digits.slice(-4)}`;
  }
  return "***";
}

export function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString()}`;
}

export function getBangkokDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getDaysDifference(dateStr: string, todayStr?: string): number {
  const today = todayStr || getBangkokDate();
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = dateStr.split("-").map(Number);
  if (isNaN(y1) || isNaN(y2) || isNaN(d1) || isNaN(d2)) return 0;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

/**
 * Returns a lightweight thumbnail version URL of an image if supported.
 * Keeps QR codes, data URLs, and external services intact.
 */
export function getThumbnailUrl(url?: string, width = 350): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.includes("_qr") || url.includes("promptpay") || url.includes("line_qr")) {
    return url;
  }
  if (url.startsWith("/api/images/")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}w=${width}`;
  }
  // Unsplash images support dynamic w query param
  if (url.includes("images.unsplash.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}w=${width}&fit=crop`;
  }
  return url;
}

