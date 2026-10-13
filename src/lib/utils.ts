/**
 * Formats cutoff display string:
 * - If cutoff date is today: just mention the time, e.g. "11:15 น." (or "11:15")
 * - If cutoff date is not today: add "in xx days", e.g. "11:15 น. (in 2 days)"
 * - If includeLabel = true: prefix with "สั่งอาหารได้ถึง..." / "Order until..."
 */
export function formatCutoffDisplay(
  cutoffTime: string,
  batchDate?: string,
  lang: "th" | "en" | "cn" = "th",
  includeLabel = false
): string {
  const today = getBangkokDate();
  const timeStr = lang === "th" ? `${cutoffTime} น.` : cutoffTime;

  let labelPrefix = "";
  if (includeLabel) {
    if (lang === "en") labelPrefix = "Order until ";
    else if (lang === "cn") labelPrefix = "点餐截止至 ";
    else labelPrefix = "สั่งอาหารได้ถึง ";
  }

  // If no date or date is today: just mention the time!
  if (!batchDate || batchDate === today) {
    return `${labelPrefix}${timeStr}`;
  }

  // Calculate day difference (positive = future date)
  const diffDays = -getDaysDifference(batchDate, today);

  if (diffDays <= 0) {
    // Today or past date
    return `${labelPrefix}${timeStr}`;
  }

  // Future date: add "in xx days"
  const daysSuffix = ` (in ${diffDays} ${diffDays === 1 ? "day" : "days"})`;

  return `${labelPrefix}${timeStr}${daysSuffix}`;
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
