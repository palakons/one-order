import jsQR from "jsqr";

export interface SlipVerificationResult {
  isValid: boolean;
  bankCode?: string;
  bankName?: string;
  transRef?: string;
  rawQr?: string;
  error?: string;
}

const BANK_NAMES: Record<string, string> = {
  "014": "SCB (ไทยพาณิชย์)",
  "004": "KBANK (กสิกรไทย)",
  "002": "BBL (กรุงเทพ)",
  "006": "KTB (กรุงไทย)",
  "025": "BAY (กรุงศรี)",
  "011": "TTB (ทหารไทยธนชาต)",
  "030": "GSB (ออมสิน)",
  "034": "BAAC (ธ.ก.ส.)",
};

/**
 * Parses Bank of Thailand (BOT) standard EMVCo slip verification QR string.
 * Example payload: 0046000600000101030140225202610091E7bc9Ke2FPDmbGsZ5102TH91045A09
 */
export function parseThaiSlipQr(raw: string): SlipVerificationResult {
  if (!raw || typeof raw !== "string" || !raw.startsWith("00")) {
    return { isValid: false, error: "ไม่พบ QR Code สลิปธนาคารมาตรฐาน (BOT Standard)" };
  }

  try {
    // Sub-tag 01 (Sending Bank): '01' + '03' + 3 digits bank code
    const bankMatch = raw.match(/0103(\d{3})/);
    const bankCode = bankMatch ? bankMatch[1] : undefined;

    // Sub-tag 02 (TransRef): '02' + 2 digits length + string ref
    const transRefMatch = raw.match(/02(\d{2})([A-Za-z0-9]+)/);
    let transRef = "";
    if (transRefMatch) {
      const len = parseInt(transRefMatch[1], 10);
      transRef = transRefMatch[2].slice(0, len);
    }

    if (bankCode || transRef) {
      return {
        isValid: true,
        bankCode,
        bankName: bankCode ? BANK_NAMES[bankCode] || `ธนาคารรหัส ${bankCode}` : "ธนาคารพาณิชย์",
        transRef: transRef || undefined,
        rawQr: raw,
      };
    }
  } catch (err: any) {
    console.warn("parseThaiSlipQr error:", err);
  }

  return { isValid: false, rawQr: raw, error: "ไม่สามารถอ่านข้อมูลรหัสอ้างอิงของสลิปได้" };
}

/**
 * Client-side scanner: Reads an HTML Image / Canvas and scans for slip QR
 */
export async function scanSlipQrFromImageElement(
  imgElement: HTMLImageElement
): Promise<SlipVerificationResult> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { isValid: false, error: "Browser canvas not supported" };
  }

  // Set reasonable canvas dimensions (max 1000px width/height for speed and sharp QR reading)
  const maxDim = 1200;
  let { naturalWidth: w, naturalHeight: h } = imgElement;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(imgElement, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert",
  });

  if (code && code.data) {
    return parseThaiSlipQr(code.data);
  }

  // Secondary attempt: Crop bottom half where slip verification QR codes usually reside
  const bottomHeight = Math.round(h * 0.5);
  const bottomCanvas = document.createElement("canvas");
  bottomCanvas.width = w;
  bottomCanvas.height = bottomHeight;
  const bCtx = bottomCanvas.getContext("2d");
  if (bCtx) {
    bCtx.drawImage(imgElement, 0, h - bottomHeight, w, bottomHeight, 0, 0, w, bottomHeight);
    const bottomImageData = bCtx.getImageData(0, 0, w, bottomHeight);
    const bottomCode = jsQR(bottomImageData.data, bottomImageData.width, bottomImageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (bottomCode && bottomCode.data) {
      return parseThaiSlipQr(bottomCode.data);
    }
  }

  return { isValid: false, error: "ไม่พบ QR Code ตรวจสอบสลิปในรูปภาพนี้ (ตรวจสอบว่าเป็นสลิปที่มี QR ที่มุมล่าง)" };
}
