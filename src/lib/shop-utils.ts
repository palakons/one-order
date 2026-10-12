import { Shop } from "./types";

export interface DayConfig {
  day: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  label: string; // "จันทร์"
  short: string; // "จ."
  en: string; // "Mon"
  cn: string; // "周一"
}

export const DAYS_OF_WEEK: DayConfig[] = [
  { day: 1, label: "จันทร์", short: "จ.", en: "Mon", cn: "周一" },
  { day: 2, label: "อังคาร", short: "อ.", en: "Tue", cn: "周二" },
  { day: 3, label: "พุธ", short: "พ.", en: "Wed", cn: "周三" },
  { day: 4, label: "พฤหัสบดี", short: "พฤ.", en: "Thu", cn: "周四" },
  { day: 5, label: "ศุกร์", short: "ศ.", en: "Fri", cn: "周五" },
  { day: 6, label: "เสาร์", short: "ส.", en: "Sat", cn: "周六" },
  { day: 0, label: "อาทิตย์", short: "อา.", en: "Sun", cn: "周日" },
];

export function getBangkokDayOfWeek(): number {
  try {
    const now = new Date();
    const bkkStr = now.toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", weekday: "short" });
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[bkkStr] ?? now.getDay();
  } catch {
    return new Date().getDay();
  }
}

export function formatOpenDaysText(days?: number[], lang: "th" | "en" | "cn" = "th"): string {
  if (!days || days.length === 0) {
    return lang === "en" ? "Closed every day" : lang === "cn" ? "每日休息" : "ปิดทุกวัน";
  }
  if (days.length === 7) {
    return lang === "en" ? "Everyday (Mon-Sun)" : lang === "cn" ? "每日营业 (周一至周日)" : "เปิดทุกวัน (จันทร์ - อาทิตย์)";
  }
  const isMonToFri =
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d));
  if (isMonToFri) {
    return lang === "en" ? "Mon - Fri" : lang === "cn" ? "周一至周五" : "จันทร์ - ศุกร์";
  }
  const isMonToSat =
    days.length === 6 &&
    [1, 2, 3, 4, 5, 6].every((d) => days.includes(d));
  if (isMonToSat) {
    return lang === "en" ? "Mon - Sat" : lang === "cn" ? "周一至周六" : "จันทร์ - เสาร์";
  }
  const isWeekendOnly =
    days.length === 2 && days.includes(0) && days.includes(6);
  if (isWeekendOnly) {
    return lang === "en" ? "Sat - Sun" : lang === "cn" ? "周六至周日" : "เสาร์ - อาทิตย์";
  }

  // Otherwise list short names in Mon -> Sun order
  const sorted = DAYS_OF_WEEK.filter((d) => days.includes(d.day));
  if (lang === "en") return sorted.map((d) => d.en).join(", ");
  if (lang === "cn") return sorted.map((d) => d.cn).join(", ");
  return sorted.map((d) => d.short).join(", ");
}

export function isShopOpenOnDay(shop: Shop, bkkDay: number = getBangkokDayOfWeek()): boolean {
  if (shop.isActive === false) return false;
  // If openDays is empty or undefined, default to Monday-Friday (workday defaults)
  const openDays = Array.isArray(shop.openDays) && shop.openDays.length > 0 ? shop.openDays : [1, 2, 3, 4, 5];
  return openDays.includes(bkkDay);
}
