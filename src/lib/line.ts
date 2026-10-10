/**
 * LINE Messaging API Integration for VEATEC
 */
import { getActiveLineGroupIds, getBatches, updateBatch, getBatchById } from "./store";
import { BatchWithDetails } from "./types";
import { getDropOffMapUrl } from "./locations";
import { getTimeRemaining } from "./utils";

export async function pushLineMessage(
  text: string,
  imageUrl?: string,
  customTargetId?: string
): Promise<boolean> {
  const token =
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    "tDuAIqGSY0EjLJ6JX5+xeNtfEWtlOtXdMggAuhMTDSYxB+d8LJI45ksz7qUlSIJUE7wVfOTM/BGYtHEfYLuP2FKrBCzZOa7pnWZCwJWb6m4Fjy98UQDZKFY9w2RcxBOF/4NZTJotAskvnDHAz0pxLAdB04t89/1O/w1cDnyilFU=";

  let targets: string[] = [];

  if (customTargetId) {
    targets = [customTargetId];
  } else {
    // 1. Priority: Explicit LINE_GROUP_ID in environment
    if (process.env.LINE_GROUP_ID) {
      targets.push(process.env.LINE_GROUP_ID.trim());
    }

    // 2. Auto-discovered / registered Group IDs from Firestore
    try {
      const savedGroupIds = await getActiveLineGroupIds();
      savedGroupIds.forEach((id) => {
        if (!targets.includes(id)) targets.push(id);
      });
    } catch (err) {
      console.warn("Could not retrieve active group IDs:", err);
    }

    // 3. Fallback to LINE_USER_ID if no groups found
    if (targets.length === 0 && process.env.LINE_USER_ID) {
      targets.push(process.env.LINE_USER_ID.trim());
    }
  }

  if (!token || targets.length === 0) {
    console.warn(
      "LINE notification skipped: LINE_CHANNEL_ACCESS_TOKEN or target group/user not found. " +
      "Invite bot to LINE group and type 'group id' to auto-register, or set LINE_GROUP_ID in Vercel."
    );
    return false;
  }

  const messages: any[] = [{ type: "text", text }];

  if (imageUrl && imageUrl.startsWith("https://")) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }

  let anySuccess = false;

  for (const targetId of targets) {
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: targetId,
          messages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(`LINE Push Error for target ${targetId}:`, data);

        // If push with image failed (e.g. image URL unreachable by LINE), retry text only
        if (messages.length > 1) {
          const retryRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              to: targetId,
              messages: [{ type: "text", text }],
            }),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok) {
            console.log(`LINE Push text-only fallback succeeded for ${targetId}`);
            anySuccess = true;
          } else {
            console.error(`LINE Push fallback error for ${targetId}:`, retryData);
          }
        }
      } else {
        console.log(`LINE Push succeeded for target ${targetId}`);
        anySuccess = true;
      }
    } catch (err) {
      console.error(`Error pushing LINE message to ${targetId}:`, err);
    }
  }

  return anySuccess;
}

export function formatBatchOrderSummaryText(batch: BatchWithDetails, appUrl: string): string {
  const orders = (batch.orders || []).filter((o) => !o.deletedAt);
  const locName = batch.buildingName || "ตึก M4";
  const mapUrl = batch.isSelfPickup ? batch.shop.gmapUrl : getDropOffMapUrl(batch);
  const leaderName = batch.hostName || batch.hostLineId || "หัวหน้าตี้";
  const leaderContact = [
    batch.hostLineId ? `LINE: @${batch.hostLineId}` : "",
    batch.hostPhone ? `โทร: ${batch.hostPhone}` : "",
  ].filter(Boolean).join(" • ");

  let txt = `🔔 [VEATEC @ VISTEC] สรุปออเดอร์ร้าน ${batch.shop.name}\n`;
  if (batch.isSelfPickup) {
    txt += `🚶 รูปแบบ: รับเองหน้าร้าน (Self-Pickup)\n`;
    if (mapUrl) txt += `🗺️ แผนที่ร้าน: ${mapUrl}\n`;
  } else {
    txt += `📍 จุดส่ง: ${locName} ชั้น 1\n`;
    if (mapUrl) txt += `🗺️ แผนที่จุดส่ง: ${mapUrl}\n`;
  }
  txt += `👑 หัวหน้าตี้: ${leaderName}${leaderContact ? ` (${leaderContact})` : ""}\n`;
  txt += `💰 ยอดรวม: ฿${batch.currentTotalAmount} (${orders.length} กล่อง) • สลิปโอนครบ 100% ✅\n`;
  txt += `------------------------------------\n`;

  if (orders.length === 0) {
    txt += `(ยังไม่มีรายการสั่งอาหารในกระดานนี้)\n`;
  } else {
    orders.forEach((o) => {
      const lineTag = o.customerLineId ? `@${o.customerLineId}` : o.customerName;
      const phoneTag = o.customerPhone ? ` (${o.customerPhone})` : "";
      const itemsStr = o.items
        .map((it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}${it.customNote ? ` [${it.customNote}]` : ""}`)
        .join(", ");
      txt += `#${o.orderNumber} ${lineTag}${phoneTag} — ${itemsStr} (฿${o.totalAmount})\n`;
    });
  }

  txt += `------------------------------------\n`;
  txt += `🧾 รูปใบสรุปสั่งอาหาร (One Long Manifest) & สลิปทั้งหมด:\n`;
  txt += `${appUrl}/api/batches/${batch.id}/photo?type=manifest\n\n`;
  txt += `👉 หน้าจัดการตี้: ${appUrl}/order/${batch.id}/leader`;
  return txt;
}

export async function sendBatchReminderToLine(
  batchId: string,
  appUrl: string
): Promise<{ success: boolean; message: string; targetUsed?: string }> {
  const batch = await getBatchById(batchId, false, true);
  if (!batch) {
    return { success: false, message: "ไม่พบกระดานที่ระบุ" };
  }

  const summaryText = formatBatchOrderSummaryText(batch, appUrl);
  const manifestPhotoUrl = `${appUrl}/api/batches/${batch.id}/photo?type=manifest`;

  // 1. If leader connected 1-to-1 LINE
  if (batch.hostLineUserId) {
    const ok = await pushLineMessage(summaryText, manifestPhotoUrl, batch.hostLineUserId);
    if (ok) {
      await updateBatch(batch.id, {
        cutoffReminderSent: true,
        cutoffReminderSentAt: new Date().toISOString(),
      });
      return { success: true, message: "ส่งสรุปออเดอร์ให้หัวหน้าตี้ทาง LINE เรียบร้อยแล้ว 🎉", targetUsed: "leader" };
    }
  }

  // 2. Fallback to active LINE groups or default target
  const ok = await pushLineMessage(summaryText, manifestPhotoUrl);
  if (ok) {
    await updateBatch(batch.id, {
      cutoffReminderSent: true,
      cutoffReminderSentAt: new Date().toISOString(),
    });
    return { success: true, message: "ส่งสรุปออเดอร์เข้ากลุ่ม LINE เรียบร้อยแล้ว 🎉", targetUsed: "group" };
  }

  return {
    success: false,
    message: "ไม่สามารถส่งข้อความได้ กรุณาเชื่อมต่อ LINE Bot หรือเชิญบอทเข้ากลุ่มก่อน",
  };
}

export async function checkAndDispatchCutoffReminders(appUrl: string): Promise<number> {
  try {
    const batches = await getBatches(false, true);
    const nowBangkok = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    let dispatchedCount = 0;
    for (const batch of batches) {
      if (batch.status !== "OPEN" || batch.cutoffReminderSent) continue;
      // Only process batches scheduled for today
      if (batch.date && batch.date !== nowBangkok) continue;

      const { isExpired } = getTimeRemaining(batch.cutoffTime, batch.date);
      if (!isExpired) continue;

      // Cutoff time lapsed! Push reminder to leader (or group)
      const summaryText = formatBatchOrderSummaryText(batch, appUrl);
      const manifestPhotoUrl = `${appUrl}/api/batches/${batch.id}/photo?type=manifest`;

      let anySent = false;
      if (batch.hostLineUserId) {
        anySent = await pushLineMessage(summaryText, manifestPhotoUrl, batch.hostLineUserId);
      } else {
        // If leader didn't link their 1-to-1 line, broadcast reminder to registered group
        anySent = await pushLineMessage(summaryText, manifestPhotoUrl);
      }

      await updateBatch(batch.id, {
        cutoffReminderSent: true,
        cutoffReminderSentAt: new Date().toISOString(),
      });

      if (anySent) dispatchedCount++;
    }

    return dispatchedCount;
  } catch (err) {
    console.warn("Cutoff reminder dispatch error:", err);
    return 0;
  }
}
