/**
 * LINE Messaging API Integration for VEATEC
 */
import { getActiveLineGroupIds } from "./store";

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
