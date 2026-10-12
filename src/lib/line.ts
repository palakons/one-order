/**
 * LINE Messaging API Integration for VEATEC
 */
import { getActiveLineGroupIds, getBatches, updateBatch, getBatchById } from "./store";
import { BatchWithDetails } from "./types";
import { getDropOffMapUrl } from "./locations";
import { getTimeRemaining } from "./utils";
async function resolveTargetIds(customTargetId?: string): Promise<string[]> {
  if (customTargetId) return [customTargetId];

  const targets: string[] = [];
  if (process.env.LINE_GROUP_ID) {
    targets.push(process.env.LINE_GROUP_ID.trim());
  }

  try {
    const savedGroupIds = await getActiveLineGroupIds();
    savedGroupIds.forEach((id) => {
      if (!targets.includes(id)) targets.push(id);
    });
  } catch (err) {
    console.warn("Could not retrieve active group IDs:", err);
  }

  // Known default group if none found
  if (targets.length === 0) {
    targets.push("Cde4a9c739118f0c8414bbd2ecdf6ab01");
  }

  // Fallback to LINE_USER_ID if no groups found
  if (targets.length === 0 && process.env.LINE_USER_ID) {
    targets.push(process.env.LINE_USER_ID.trim());
  }

  return Array.from(new Set(targets.filter((t) => Boolean(t && typeof t === "string" && t.trim()))));
}

export async function pushLineFlexOrText(
  altText: string,
  flexBubble: any,
  fallbackText: string,
  customTargetId?: string,
  extraImageUrl?: string
): Promise<boolean> {
  const token =
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    "tDuAIqGSY0EjLJ6JX5+xeNtfEWtlOtXdMggAuhMTDSYxB+d8LJI45ksz7qUlSIJUE7wVfOTM/BGYtHEfYLuP2FKrBCzZOa7pnWZCwJWb6m4Fjy98UQDZKFY9w2RcxBOF/4NZTJotAskvnDHAz0pxLAdB04t89/1O/w1cDnyilFU=";

  const targets = await resolveTargetIds(customTargetId);

  if (!token || targets.length === 0) {
    console.warn("LINE notification skipped: missing token or target group");
    return false;
  }

  // Exactly 1 message bubble in LINE chat!
  const flexMessage = {
    type: "flex",
    altText,
    contents: flexBubble,
  };

  let anySuccess = false;

  for (const targetId of targets) {
    try {
      // 1. Try sending the Flex Message
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: targetId,
          messages: [flexMessage],
        }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`LINE Push Flex succeeded for target ${targetId}`);
        anySuccess = true;
      } else {
        console.warn(`LINE Push Flex failed for ${targetId}, falling back to message with image/text:`, data);
        // 2. Fallback: If extraImageUrl is available and valid HTTPS, send image message + text message
        const fallbackMessages: any[] = [];
        if (extraImageUrl && extraImageUrl.startsWith("https://")) {
          fallbackMessages.push({
            type: "image",
            originalContentUrl: extraImageUrl,
            previewImageUrl: extraImageUrl,
          });
        }
        fallbackMessages.push({ type: "text", text: fallbackText });

        const fallbackRes = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: targetId,
            messages: fallbackMessages,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok) {
          console.log(`LINE Push fallback succeeded for ${targetId}`);
          anySuccess = true;
        } else {
          console.error(`LINE Push fallback error for ${targetId}:`, fallbackData);
          // If image message caused fallback to fail, retry with text only
          if (fallbackMessages.length > 1) {
            const textOnlyRes = await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                to: targetId,
                messages: [{ type: "text", text: fallbackText }],
              }),
              signal: AbortSignal.timeout(8000),
            });
            if (textOnlyRes.ok) {
              console.log(`LINE Push text-only emergency fallback succeeded for ${targetId}`);
              anySuccess = true;
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error pushing LINE message to ${targetId}:`, err);
    }
  }

  return anySuccess;
}

export async function sendNewBoardAnnouncement(
  batch: BatchWithDetails,
  appUrl: string
): Promise<boolean> {
  const shopName = batch.shop.name;
  const cutoff = batch.cutoffTime;
  const locName = batch.isSelfPickup ? "รับเองที่หน้าร้าน" : `${batch.buildingName || "ตึก M4"} ชั้น 1`;
  const leaderName = batch.hostName || (batch.hostLineId ? `@${batch.hostLineId}` : "เพื่อนในตี้");
  const orderUrl = `${appUrl}/order/${batch.id}`;

  const altText = `📢 [VEATEC] เปิดตี้ใหม่แล้ว! ร้าน ${shopName} (ปิดรับ ${cutoff} น.) 🍱✨`;

  const fallbackText =
    `📢 [VEATEC @ VISTEC] เปิดตี้ใหม่แล้วครับ! 🍱✨\n` +
    `ร้าน: ${shopName}\n` +
    `⏰ ปิดรับออเดอร์: ${cutoff} น.\n` +
    `📍 จุดส่งอาหาร: ${locName}\n` +
    `👑 หัวหน้าตี้: ${leaderName}\n` +
    `💰 ขั้นต่ำร้าน: ฿${batch.targetMinAmount}\n\n` +
    `👉 เข้าร่วมสั่งอาหารร่วมตี้:\n${orderUrl}`;

  const flexBubble = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#3b0764",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: "🍱 เปิดตี้ใหม่แล้ว! ชวนสั่งข้าวกลางวัน",
          weight: "bold",
          color: "#ffffff",
          size: "sm",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: shopName,
          weight: "bold",
          size: "xl",
          color: "#1e1b4b",
          wrap: true,
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "⏰ ปิดรับ:", size: "xs", color: "#64748b", flex: 3 },
                { type: "text", text: `${cutoff} น.`, size: "xs", color: "#b91c1c", weight: "bold", flex: 7 },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "📍 จุดส่ง:", size: "xs", color: "#64748b", flex: 3 },
                { type: "text", text: locName, size: "xs", color: "#334155", flex: 7, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "👑 หัวหน้าตี้:", size: "xs", color: "#64748b", flex: 3 },
                { type: "text", text: leaderName, size: "xs", color: "#334155", flex: 7 },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "💰 ขั้นต่ำ:", size: "xs", color: "#64748b", flex: 3 },
                { type: "text", text: `฿${batch.targetMinAmount}`, size: "xs", color: "#334155", flex: 7 },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#581c87",
          action: {
            type: "uri",
            label: "👉 เข้าร่วมตี้ สั่งอาหารทันที",
            uri: orderUrl,
          },
        },
      ],
    },
  };

  return pushLineFlexOrText(altText, flexBubble, fallbackText);
}

export async function sendDeliveryAnnouncement(
  batch: BatchWithDetails,
  appUrl: string,
  photoUrl?: string
): Promise<boolean> {
  const shopName = batch.shop.name;
  const bldgName = batch.buildingName || "ตึก M4";
  const dropOffMap = getDropOffMapUrl(batch);
  const activeOrders = (batch.orders || []).filter((o) => !o.deletedAt);
  const orderCount = activeOrders.length;
  const deliveryUrl = `${appUrl}/delivery/${batch.id}`;

  const altText = `🛵 [VEATEC] อาหารมาส่งถึงโต๊ะ${bldgName} แล้วครับ! (${shopName} ${orderCount} กล่อง) ✨`;

  // Format list of orders for text and flex
  const orderListText = activeOrders
    .map((ord, idx) => {
      const num = ord.orderNumber || idx + 1;
      const userTag = ord.customerLineId ? `@${ord.customerLineId.replace(/^@/, "")}` : ord.customerName;
      const itemsSummary = (ord.items || [])
        .map((it) => `${it.name}${it.quantity > 1 ? ` x${it.quantity}` : ""}`)
        .join(", ");
      return `#${String(num).padStart(2, "0")} ${userTag}: ${itemsSummary}`;
    })
    .join("\n");

  const fallbackText =
    `🛵 [VEATEC @ VISTEC] อาหารมาส่งถึงโต๊ะ${bldgName} แล้วครับ! ✨\n` +
    `ร้าน: ${shopName} (${orderCount} กล่อง)\n` +
    `📍 วางไว้ที่โต๊ะรับอาหารชั้น 1 ${bldgName} เรียบร้อยแล้ว\n` +
    (dropOffMap ? `🗺️ แผนที่จุดส่ง: ${dropOffMap}\n` : "") +
    (orderListText ? `\n📋 รายชื่อกล่องที่มาส่ง:\n${orderListText}\n` : "") +
    `\n📸 ดูรูปถ่ายหลักฐาน & รับอาหารของคุณ:\n${deliveryUrl}\n\n` +
    `ขอให้อร่อยกับมื้ออาหารครับ/ค่ะ 🙏`;

  // Build flex contents for orders list (limit up to 12 items to stay well within Flex message limits)
  const orderFlexItems: any[] = [];
  const displayLimit = 12;
  const slicedOrders = activeOrders.slice(0, displayLimit);
  slicedOrders.forEach((ord, idx) => {
    const num = ord.orderNumber || idx + 1;
    const userTag = ord.customerLineId ? `@${ord.customerLineId.replace(/^@/, "")}` : ord.customerName;
    const itemsSummary = (ord.items || [])
      .map((it) => `${it.name}${it.quantity > 1 ? ` x${it.quantity}` : ""}`)
      .join(", ");
    orderFlexItems.push({
      type: "box",
      layout: "baseline",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: `#${String(num).padStart(2, "0")}`,
          color: "#7c3aed",
          weight: "bold",
          size: "xxs",
          flex: 1,
        },
        {
          type: "text",
          text: `${userTag}: ${itemsSummary}`,
          color: "#334155",
          size: "xxs",
          flex: 8,
          wrap: true,
        },
      ],
    });
  });

  if (activeOrders.length > displayLimit) {
    orderFlexItems.push({
      type: "text",
      text: `... และอีก ${activeOrders.length - displayLimit} รายการ (แตะปุ่มด้านล่างเพื่อดูทั้งหมด)`,
      size: "xxs",
      color: "#94a3b8",
      wrap: true,
    });
  }

  const flexBubble: any = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: `🛵 อาหารมาส่งถึงโต๊ะ${bldgName} แล้วครับ! ✨`,
          weight: "bold",
          size: "md",
          color: "#1e1b4b",
          wrap: true,
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: `ร้าน: ${shopName} (${orderCount} กล่อง)`,
              size: "sm",
              weight: "bold",
              color: "#334155",
            },
            {
              type: "text",
              text: `📍 วางไว้ที่โต๊ะรับอาหารชั้น 1 ${bldgName} เรียบร้อยแล้ว`,
              size: "xs",
              color: "#64748b",
              wrap: true,
            },
          ],
        },
        ...(orderFlexItems.length > 0
          ? [
              {
                type: "separator",
                margin: "md",
              },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  {
                    type: "text",
                    text: "📋 รายการกล่องที่มาส่ง:",
                    size: "xs",
                    weight: "bold",
                    color: "#1e1b4b",
                  },
                  ...orderFlexItems,
                ],
              },
            ]
          : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#059669",
          action: {
            type: "uri",
            label: "📸 ดูรูปหลักฐาน & รายชื่อกล่อง",
            uri: deliveryUrl,
          },
        },
      ],
    },
  };

  // If photo is available and valid HTTPS, attach it as the hero image inside the single card!
  if (photoUrl && photoUrl.startsWith("https://")) {
    flexBubble.hero = {
      type: "image",
      url: photoUrl,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
      action: {
        type: "uri",
        uri: deliveryUrl,
      },
    };
  }

  return pushLineFlexOrText(altText, flexBubble, fallbackText, undefined, photoUrl);
}

export async function pushLineMessage(
  text: string,
  imageUrl?: string,
  customTargetId?: string
): Promise<boolean> {
  const token =
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    "tDuAIqGSY0EjLJ6JX5+xeNtfEWtlOtXdMggAuhMTDSYxB+d8LJI45ksz7qUlSIJUE7wVfOTM/BGYtHEfYLuP2FKrBCzZOa7pnWZCwJWb6m4Fjy98UQDZKFY9w2RcxBOF/4NZTJotAskvnDHAz0pxLAdB04t89/1O/w1cDnyilFU=";

  const targets = await resolveTargetIds(customTargetId);

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
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json().catch(() => ({}));
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
            signal: AbortSignal.timeout(8000),
          });
          const retryData = await retryRes.json().catch(() => ({}));
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
  txt += `👉 ดูกระดานสั่งอาหาร (Order Pane): ${appUrl}/order/${batch.id}`;
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

  // 1. Send strictly 1-to-1 to the leader if connected
  if (batch.hostLineUserId) {
    const ok = await pushLineMessage(summaryText, manifestPhotoUrl, batch.hostLineUserId);
    if (ok) {
      await updateBatch(batch.id, {
        cutoffReminderSent: true,
        cutoffReminderSentAt: new Date().toISOString(),
      });
      return { success: true, message: "ส่งสรุปออเดอร์ให้หัวหน้าตี้ทาง LINE ส่วนตัวเรียบร้อยแล้ว 🎉", targetUsed: "leader" };
    }
    return { success: false, message: "ไม่สามารถส่งข้อความถึง LINE ของหัวหน้าตี้ได้ กรุณาลองใหม่อีกครั้ง" };
  }

  // 2. NEVER broadcast order manifests/reminders into public groups!
  // Public groups are strictly reserved for "Order Delivered" notifications.
  return {
    success: false,
    message: "ยังไม่ได้เชื่อมต่อ LINE ส่วนตัวของหัวหน้าตี้ (ระบบจะส่งสรุปออเดอร์เฉพาะแชทส่วนตัวของหัวหน้า เพื่อไม่รบกวนสมาชิกในกลุ่ม)",
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

      // CRITICAL GUARD: Only send 1-to-1 to the leader. NEVER broadcast reminders to public groups!
      if (!batch.hostLineUserId) {
        // Mark as sent so we don't repeatedly check
        await updateBatch(batch.id, {
          cutoffReminderSent: true,
          cutoffReminderSentAt: new Date().toISOString(),
        });
        continue;
      }

      // Cutoff time lapsed! Push reminder strictly to leader's 1-to-1 chat
      const summaryText = formatBatchOrderSummaryText(batch, appUrl);
      const manifestPhotoUrl = `${appUrl}/api/batches/${batch.id}/photo?type=manifest`;

      const anySent = await pushLineMessage(summaryText, manifestPhotoUrl, batch.hostLineUserId);

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
