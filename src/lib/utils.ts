export function getTimeRemaining(
  cutoffTimeStr: string,
  batchDate?: string
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
      return { isExpired: true, text: "closed", remainingMs: 0 };
    }

    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    let text = "";
    if (hours > 0) {
      text = minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
    } else if (minutes > 0) {
      text = seconds > 0 ? `${minutes} นาที ${seconds} วิ` : `${minutes} นาที`;
    } else {
      text = `${seconds} วิ`;
    }

    return { isExpired: false, text: `อีก ${text}`, remainingMs: diffMs };
  } catch {
    return { isExpired: false, text: `ปิด ${cutoffTimeStr} น.`, remainingMs: 0 };
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
