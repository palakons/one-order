import { NextResponse } from "next/server";
import { getBatches } from "@/lib/store";

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
            text: `👋 สวัสดีครับ! บอท VEATEC (VISTEC Eats) เข้าร่วมกลุ่มเรียบร้อยแล้ว ✨\n\n` +
              `🆔 LINE Group ID ของกลุ่มนี้คือ:\n${groupId}\n\n` +
              `📌 บอทจะบรอดแคสต์แจ้งเตือนเฉพาะตอนอาหารมาส่งถึงโต๊ะตึก M4 เท่านั้น (ไม่รบกวนเวลาอื่น)\n` +
              `💡 สามารถพิมพ์ "สถานะ" เพื่อเช็คสถานะอาหารวันนี้ได้ฟรีตลอดเวลาครับ`,
          },
        ]);
        continue;
      }

      // Process text messages
      if (event.type === "message" && event.message?.type === "text" && replyToken && token) {
        const rawText = event.message.text.trim();
        const text = rawText.toLowerCase();

        // 1. Group ID query
        if (text === "group id" || text === "groupid" || text === "/id" || text === "รหัสกลุ่ม") {
          const idToShow = groupId || source.userId || "ไม่พบ Group ID";
          await replyMessage(token, replyToken, [
            {
              type: "text",
              text: `🆔 ID ของห้องนี้คือ:\n${idToShow}`,
            },
          ]);
          continue;
        }

        // 2. Status Query
        const isStatusQuery = [
          "status",
          "/status",
          "สถานะ",
          "เช็คสถานะ",
          "ข้าว",
          "ถึงไหนแล้ว",
          "ออเดอร์",
          "order",
          "อาหาร",
        ].some((keyword) => text.includes(keyword));

        // 3. Phone Query (e.g. 0812345678 or 081-234-5678)
        const cleanDigits = rawText.replace(/[-\s]/g, "");
        const isPhoneQuery = /^0\d{8,9}$/.test(cleanDigits);

        if (isStatusQuery || isPhoneQuery) {
          const batches = await getBatches();
          const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "one-order.vercel.app";
          const proto = request.headers.get("x-forwarded-proto") || "https";
          const appUrl = `${proto}://${host}`;

          if (isPhoneQuery) {
            const userOrders: Array<{
              shopName: string;
              boxLabel: string;
              status: string;
              totalAmount: number;
            }> = [];

            for (const b of batches) {
              const matched = b.orders.filter(
                (o) => o.customerPhone.replace(/[-\s]/g, "") === cleanDigits
              );
              for (const mo of matched) {
                userOrders.push({
                  shopName: b.shop.name,
                  boxLabel: mo.boxLabel,
                  status: b.status,
                  totalAmount: mo.totalAmount,
                });
              }
            }

            if (userOrders.length > 0) {
              const lines = userOrders.map((uo, idx) => {
                const statusEmoji =
                  uo.status === "COMPLETED"
                    ? "✨ นำส่งถึงโต๊ะตึก M4 แล้ว"
                    : uo.status === "DELIVERING"
                    ? "🛵 กำลังนำส่งมาตึก M4"
                    : uo.status === "LOCKED"
                    ? "🍳 ร้านกำลังปรุง (Cooking)"
                    : "🟢 กำลังเปิดรับออเดอร์";
                return (
                  `${idx + 1}. ร้าน ${uo.shopName}\n` +
                  `   📦 กล่อง: ${uo.boxLabel}\n` +
                  `   ⚡ สถานะ: ${statusEmoji}\n` +
                  `   💰 ยอดรวม: ฿${uo.totalAmount}`
                );
              });

              await replyMessage(token, replyToken, [
                {
                  type: "text",
                  text:
                    `🍱 ข้อมูลออเดอร์ของเบอร์ ${rawText}:\n\n` +
                    lines.join("\n\n") +
                    `\n\n📍 จุดรับของ: ชั้น 1 โต๊ะวางอาหาร Delivery ตึก M4\n` +
                    `👉 ตรวจสอบในเว็บ: ${appUrl}/orders?phone=${cleanDigits}`,
                },
              ]);
              continue;
            } else {
              await replyMessage(token, replyToken, [
                {
                  type: "text",
                  text:
                    `🔍 ไม่พบรายการสั่งอาหารของเบอร์ ${rawText} ในรอบวันนี้ครับ\n\n` +
                    `👉 สั่งอาหารหรือตรวจสอบรายการทั้งหมดได้ที่:\n${appUrl}`,
                },
              ]);
              continue;
            }
          }

          // General status summary across batches
          const statusLines = batches.map((b) => {
            let statusText = "";
            switch (b.status) {
              case "OPEN":
                statusText = `🟢 เปิดรับออเดอร์ (ปิด ${b.cutoffTime} น.) - ฿${b.currentTotalAmount}/${b.targetMinAmount}`;
                break;
              case "LOCKED":
                statusText = `🍳 ร้านกำลังปรุง (${b.orders.length} กล่อง)`;
                break;
              case "DELIVERING":
                statusText = `🛵 กำลังมาส่งที่ตึก M4 (${b.orders.length} กล่อง)`;
                break;
              case "COMPLETED":
                statusText = `✨ ส่งถึงโต๊ะตึก M4 แล้ว (${b.orders.length} กล่อง) 📸`;
                break;
              default:
                statusText = b.status;
            }
            return `• ${b.shop.name}: ${statusText}`;
          });

          const replyText =
            `🍱 สถานะรวมร้านอาหารวันนี้ (VEATEC @ VISTEC):\n\n` +
            statusLines.join("\n") +
            `\n\n📍 จุดรับอาหาร: โต๊ะส่งอาหาร ชั้น 1 ตึก M4\n` +
            `👉 ตรวจสอบกล่องของคุณ & ดูรูปถ่ายส่งของ:\n${appUrl}/orders`;

          await replyMessage(token, replyToken, [
            {
              type: "text",
              text: replyText,
            },
          ]);
          continue;
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
