/**
 * LINE Messaging API Integration for VEATEC
 */

export async function pushLineMessage(
  text: string,
  imageUrl?: string,
  customTargetId?: string
): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = customTargetId || process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;

  if (!token || !targetId) {
    console.warn("LINE notification skipped: LINE_CHANNEL_ACCESS_TOKEN or LINE_GROUP_ID/LINE_USER_ID not configured.");
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
      console.error("LINE Push Error:", data);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error pushing LINE message:", err);
    return false;
  }
}
