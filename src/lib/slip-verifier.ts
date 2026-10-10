import jsQR from "jsqr";

export interface SlipVerificationResult {
  isValid: boolean;
  bankCode?: string;
  bankName?: string;
  transRef?: string;
  rawQr?: string;
  note?: string;
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
 * Parses Bank of Thailand (BOT) standard EMVCo slip verification QR string,
 * or any bank slip verification URL / transaction reference payload.
 */
export function parseThaiSlipQr(raw: string): SlipVerificationResult {
  if (!raw || typeof raw !== "string") {
    return {
      isValid: false,
      note: "แนบรูปสลิปเรียบร้อยแล้ว (ตรวจไม่พบ QR Code อัตโนมัติ — บันทึกออเดอร์ได้ตามปกติ)",
    };
  }

  const trimmed = raw.trim();

  // 1. Standard Bank of Thailand (BOT) EMVCo Mini-QR (starts with 00)
  if (trimmed.startsWith("00")) {
    try {
      // Sub-tag 01 (Sending Bank): '01' + '03' + 3 digits bank code
      const bankMatch = trimmed.match(/0103(\d{3})/);
      const bankCode = bankMatch ? bankMatch[1] : undefined;

      // Sub-tag 02 (TransRef): '02' + 2 digits length + string ref
      const transRefMatch = trimmed.match(/02(\d{2})([A-Za-z0-9_-]+)/);
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
          rawQr: trimmed,
          note: "ตรวจพบสลิปธนาคารมาตรฐาน (BOT Standard)",
        };
      }
    } catch (e) {
      console.warn("BOT slip parse error:", e);
    }
  }

  // 2. URL format (e.g. https://.../verify/... or https://promptpay.io/...)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const ref =
        url.searchParams.get("ref") ||
        url.searchParams.get("transRef") ||
        url.searchParams.get("id") ||
        url.pathname.split("/").filter(Boolean).pop() ||
        "";
      return {
        isValid: true,
        bankName: "สลิปธนาคาร (QR Code)",
        transRef: ref.slice(0, 32) || trimmed.slice(0, 24),
        rawQr: trimmed,
        note: "ตรวจพบ QR Code ยืนยันการโอนเงิน",
      };
    } catch (e) {
      return {
        isValid: true,
        bankName: "สลิปธนาคาร (QR Code)",
        transRef: trimmed.slice(0, 24),
        rawQr: trimmed,
        note: "ตรวจพบ QR Code ยืนยันการโอนเงิน",
      };
    }
  }

  // 3. Any general transaction ID / alphanumeric slip payload
  const cleanRef = trimmed.replace(/[^A-Za-z0-9_-]/g, "");
  if (cleanRef.length >= 6) {
    return {
      isValid: true,
      bankName: "สลิปธนาคาร (QR Code)",
      transRef: cleanRef.slice(0, 32),
      rawQr: trimmed,
      note: "ตรวจพบรหัสสลิปจาก QR Code",
    };
  }

  return {
    isValid: true,
    bankName: "สลิปธนาคาร (QR Code)",
    rawQr: trimmed,
    transRef: trimmed.slice(0, 24),
    note: "ตรวจพบข้อมูลใน QR Code",
  };
}

/**
 * Client-side scanner: Searches for a QR code anywhere on the slip image.
 * Uses multi-region and multi-scale scanning with both normal and inverted polarity.
 */
export async function scanSlipQrFromImageElement(
  imgElement: HTMLImageElement
): Promise<SlipVerificationResult> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      isValid: false,
      note: "แนบรูปสลิปเรียบร้อยแล้ว (สามารถส่งขึ้นกระดานได้ตามปกติ)",
    };
  }

  const { naturalWidth: origW, naturalHeight: origH } = imgElement;
  if (!origW || !origH) {
    return {
      isValid: false,
      note: "แนบรูปสลิปเรียบร้อยแล้ว (สามารถส่งขึ้นกระดานได้ตามปกติ)",
    };
  }

  // Helper to test a canvas image
  const tryScanCanvas = (c: HTMLCanvasElement): string | null => {
    const cCtx = c.getContext("2d");
    if (!cCtx) return null;
    try {
      const imgData = cCtx.getImageData(0, 0, c.width, c.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: "attemptBoth",
      });
      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }
    } catch (e) {}
    return null;
  };

  // 1. Full Image Scan (scaled to 1400px max for optimal sharpness & performance)
  const maxDim = 1400;
  let scaleW = origW;
  let scaleH = origH;
  if (scaleW > maxDim || scaleH > maxDim) {
    const ratio = Math.min(maxDim / scaleW, maxDim / scaleH);
    scaleW = Math.round(scaleW * ratio);
    scaleH = Math.round(scaleH * ratio);
  }

  canvas.width = scaleW;
  canvas.height = scaleH;
  ctx.drawImage(imgElement, 0, 0, scaleW, scaleH);

  let detectedData = tryScanCanvas(canvas);
  if (detectedData) {
    return parseThaiSlipQr(detectedData);
  }

  // 2. High-Res Native Scan if original image is within 2200px
  if ((origW !== scaleW || origH !== scaleH) && origW <= 2200 && origH <= 2200) {
    const nativeCanvas = document.createElement("canvas");
    nativeCanvas.width = origW;
    nativeCanvas.height = origH;
    const nCtx = nativeCanvas.getContext("2d");
    if (nCtx) {
      nCtx.drawImage(imgElement, 0, 0, origW, origH);
      detectedData = tryScanCanvas(nativeCanvas);
      if (detectedData) {
        return parseThaiSlipQr(detectedData);
      }
    }
  }

  // 3. Multi-Region Scanning: QR code can be in different positions across different banks
  // Regions to crop and scan:
  // - Bottom half (common in KBANK, SCB, KTB)
  // - Top half (common in some web slips & receipts)
  // - Bottom-right quadrant (SCB, BBL)
  // - Bottom-left quadrant (PromptPay transfers)
  // - Top-right quadrant
  const regions: Array<{ sx: number; sy: number; sw: number; sh: number }> = [
    // Bottom 55%
    { sx: 0, sy: Math.round(scaleH * 0.45), sw: scaleW, sh: Math.round(scaleH * 0.55) },
    // Top 55%
    { sx: 0, sy: 0, sw: scaleW, sh: Math.round(scaleH * 0.55) },
    // Bottom-right quadrant
    {
      sx: Math.round(scaleW * 0.35),
      sy: Math.round(scaleH * 0.45),
      sw: Math.round(scaleW * 0.65),
      sh: Math.round(scaleH * 0.55),
    },
    // Bottom-left quadrant
    {
      sx: 0,
      sy: Math.round(scaleH * 0.45),
      sw: Math.round(scaleW * 0.65),
      sh: Math.round(scaleH * 0.55),
    },
    // Top-right quadrant
    {
      sx: Math.round(scaleW * 0.35),
      sy: 0,
      sw: Math.round(scaleW * 0.65),
      sh: Math.round(scaleH * 0.55),
    },
    // Center region
    {
      sx: Math.round(scaleW * 0.15),
      sy: Math.round(scaleH * 0.25),
      sw: Math.round(scaleW * 0.7),
      sh: Math.round(scaleH * 0.5),
    },
  ];

  for (const reg of regions) {
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = reg.sw;
    cropCanvas.height = reg.sh;
    const cCtx = cropCanvas.getContext("2d");
    if (cCtx) {
      cCtx.drawImage(imgElement, reg.sx, reg.sy, reg.sw, reg.sh, 0, 0, reg.sw, reg.sh);
      detectedData = tryScanCanvas(cropCanvas);
      if (detectedData) {
        return parseThaiSlipQr(detectedData);
      }
    }
  }

  // 4. If no QR code detected: Still valid to upload! Return a gentle informative note
  return {
    isValid: false,
    note: "แนบรูปสลิปเรียบร้อยแล้ว (ตรวจไม่พบ QR Code อัตโนมัติ — บันทึกออเดอร์ได้ตามปกติ)",
  };
}
