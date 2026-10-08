import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = body.events || [];
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    for (const event of events) {
      const replyToken = event.replyToken;
      const source = event.source || {};
      const groupId = source.groupId;

      // When bot is invited to a group
      if (event.type === "join" && groupId && replyToken && token) {
        await replyMessage(token, replyToken, [
          {
            type: "text",
            text: `👋 สวัสดีครับ! บอท VEATEC เข้าร่วมกลุ่มเรียบร้อยแล้ว\n\n🆔 LINE Group ID ของกลุ่มนี้คือ:\n${groupId}\n\n(นำ ID นี้ไปใส่ใน LINE_GROUP_ID ได้เลยครับ)`,
          },
        ]);
      }

      // When someone asks for group id in chat
      if (event.type === "message" && event.message?.type === "text" && replyToken && token) {
        const text = event.message.text.trim().toLowerCase();
        if (text === "group id" || text === "groupid" || text === "/id" || text === "รหัสกลุ่ม") {
          const idToShow = groupId || source.userId || "ไม่พบ Group ID";
          await replyMessage(token, replyToken, [
            {
              type: "text",
              text: `🆔 ID ของห้องนี้คือ:\n${idToShow}`,
            },
          ]);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("LINE Webhook error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function replyMessage(token: string, replyToken: string, messages: any[]) {
  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
  } catch (e) {
    console.error("Failed to reply:", e);
  }
}
