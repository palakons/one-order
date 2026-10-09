import { NextResponse } from "next/server";
import { getBatches } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = body.events || [];
    const token =
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      "tDuAIqGSY0EjLJ6JX5+xeNtfEWtlOtXdMggAuhMTDSYxB+d8LJI45ksz7qUlSIJUE7wVfOTM/BGYtHEfYLuP2FKrBCzZOa7pnWZCwJWb6m4Fjy98UQDZKFY9w2RcxBOF/4NZTJotAskvnDHAz0pxLAdB04t89/1O/w1cDnyilFU=";

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "one-order.vercel.app";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const appUrl = `${proto}://${host}`;

    for (const event of events) {
      const replyToken = event.replyToken;
      const source = event.source || {};
      const groupId = source.groupId;
      const isDirectUser = source.type === "user";

      // 1. When user adds the bot as a 1-to-1 friend (Follow Event)
      if (event.type === "follow" && replyToken && token) {
        await replyMessage(token, replyToken, [
          {
            type: "text",
            text: `👋 สวัสดีครับ! ยินดีต้อนรับสู่ VEATEC (VISTEC Eats) 🍱✨\n\n` +
              `ระบบรวมสั่งอาหารกลางวันเพื่อชาววิทยสิริเมธี ส่งฟรีถึงโต๊ะวางอาหารชั้น 1 ตึก M4 ทุกวัน!\n\n` +
              `💬 คุณสามารถพิมพ์คุยกับบอทในแชทนี้ได้เลย:\n` +
              `• พิมพ์ "สถานะ" - ดูความคืบหน้าร้านอาหารวันนี้\n` +
              `• พิมพ์ "เบอร์โทรของคุณ" (เช่น 081-xxx-xxxx) - เช็คเลขกล่องข้าวและสถานะออเดอร์\n` +
              `• พิมพ์ "สั่งอาหาร" - เปิดเว็บสั่งข้าว\n\n` +
              `📍 จุดรับอาหาร: โต๊ะส่งอาหาร Delivery ชั้น 1 อาคาร M4`,
            quickReply: {
              items: [
                {
                  type: "action",
                  action: {
                    type: "message",
                    label: "📊 เช็คสถานะวันนี้",
                    text: "สถานะ",
                  },
                },
                {
                  type: "action",
                  action: {
                    type: "uri",
                    label: "🍱 สั่งอาหาร",
                    uri: appUrl,
                  },
                },
                {
                  type: "action",
                  action: {
                    type: "uri",
                    label: "📦 กล่องของฉัน",
                    uri: `${appUrl}/orders`,
                  },
                },
              ],
            },
          },
        ]);
        continue;
      }

      // 2. When bot is invited to a group
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

      // 3. Process text messages
      if (event.type === "message" && event.message?.type === "text" && replyToken && token) {
        const rawText = event.message.text.trim();
        const text = rawText.toLowerCase();

        // 3.1 Group ID query
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

        // 3.2 Ordering / Website query: "สั่งอาหาร", "สั่งข้าว", "เมนู", "ร้าน"
        const isOrderQuery = [
          "สั่งอาหาร",
          "สั่งข้าว",
          "เมนู",
          "ร้านค้า",
          "เว็บ",
          "เปิดกี่โมง",
          "order now",
        ].some((keyword) => text.includes(keyword));

        if (isOrderQuery) {
          await replyMessage(token, replyToken, [
            {
              type: "text",
              text: `🍱 VEATEC (VISTEC Eats) - ระบบรวมสั่งอาหารกลางวัน\n\n` +
                `รวมยอดครบ ฿200 ต่อร้าน ส่งฟรีถึงโต๊ะวางอาหารชั้น 1 ตึก M4!\n\n` +
                `👉 กดเข้าสู่หน้าสั่งอาหารได้ที่นี่ครับ:\n${appUrl}`,
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "🍱 สั่งอาหารทันที",
                      uri: appUrl,
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "message",
                      label: "📊 เช็คสถานะวันนี้",
                      text: "สถานะ",
                    },
                  },
                ],
              },
            },
          ]);
          continue;
        }

        // 3.3 Status Query
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

        // 3.4 Phone Query (e.g. 0812345678 or 081-234-5678)
        const cleanDigits = rawText.replace(/[-\s]/g, "");
        const isPhoneQuery = /^0\d{8,9}$/.test(cleanDigits);

        if (isStatusQuery || isPhoneQuery) {
          const batches = await getBatches();

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
                  quickReply: {
                    items: [
                      {
                        type: "action",
                        action: {
                          type: "uri",
                          label: "📦 ดูในเว็บ",
                          uri: `${appUrl}/orders?phone=${cleanDigits}`,
                        },
                      },
                      {
                        type: "action",
                        action: {
                          type: "message",
                          label: "📊 สถานะรวมทุกร้าน",
                          text: "สถานะ",
                        },
                      },
                    ],
                  },
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
                  quickReply: {
                    items: [
                      {
                        type: "action",
                        action: {
                          type: "uri",
                          label: "🍱 สั่งอาหาร",
                          uri: appUrl,
                        },
                      },
                      {
                        type: "action",
                        action: {
                          type: "message",
                          label: "📊 เช็คสถานะวันนี้",
                          text: "สถานะ",
                        },
                      },
                    ],
                  },
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
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "📦 ตรวจเช็คกล่องข้าว",
                      uri: `${appUrl}/orders`,
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "🍱 สั่งอาหารเพิ่ม",
                      uri: appUrl,
                    },
                  },
                ],
              },
            },
          ]);
          continue;
        }

        // 3.5 In 1-to-1 chat: If message was not recognized, guide the user
        if (isDirectUser) {
          await replyMessage(token, replyToken, [
            {
              type: "text",
              text: `🤖 บอท VEATEC (VISTEC Eats) ยินดีช่วยเหลือครับ!\n\n` +
                `คุณสามารถพิมพ์ถามได้ดังนี้ครับ:\n` +
                `• "สถานะ" - ดูความคืบหน้าร้านอาหารวันนี้\n` +
                `• พิมพ์เบอร์โทรของคุณ (เช่น 081-xxx-xxxx) - เพื่อเช็คหมายเลขกล่องข้าว\n` +
                `• หรือกดปุ่มด้านล่างเพื่อสั่งอาหารได้เลยครับ 👇`,
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "message",
                      label: "📊 เช็คสถานะ",
                      text: "สถานะ",
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "🍱 สั่งอาหาร",
                      uri: appUrl,
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "uri",
                      label: "📦 กล่องของฉัน",
                      uri: `${appUrl}/orders`,
                    },
                  },
                ],
              },
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
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
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

    if (!res.ok) {
      const errData = await res.json();
      console.error("LINE reply error response:", errData);
    }
  } catch (e) {
    console.error("Failed to reply:", e);
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "VEATEC LINE Webhook",
    message: "Endpoint is healthy and ready for LINE webhook POST requests",
  });
}

