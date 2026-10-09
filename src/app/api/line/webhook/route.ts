import { NextResponse } from "next/server";
import { getBatches } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = body.events || [];
    const token =
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      "tDuAIqGSY0EjLJ6JX5+xeNtfEWtlOtXdMggAuhMTDSYxB+d8LJI45ksz7qUlSIJUE7wVfOTM/BGYtHEfYLuP2FKrBCzZOa7pnWZCwJWb6m4Fjy98UQDZKFY9w2RcxBOF/4NZTJotAskvnDHAz0pxLAdB04t89/1O/w1cDnyilFU=";

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "veatec.vercel.app";
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
              currentTotal: number;
              targetMin: number;
              cutoffTime: string;
              date: string;
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
                  currentTotal: b.currentTotalAmount,
                  targetMin: b.targetMinAmount,
                  cutoffTime: b.cutoffTime,
                  date: b.date,
                });
              }
            }

            if (userOrders.length > 0) {
              const lines = userOrders.map((uo, idx) => {
                const timeInfo = getTimeRemaining(uo.cutoffTime, uo.date);
                const statusEmoji =
                  uo.status === "COMPLETED"
                    ? "✨ ถึง M4 แล้ว 📸"
                    : uo.status === "DELIVERING"
                    ? "🛵 ไรเดอร์กำลังมา"
                    : uo.status === "LOCKED"
                    ? "🍳 กำลังปรุง"
                    : timeInfo.isExpired
                    ? "🔴 closed (รอปรุง)"
                    : `🟢 เปิดรับ (${timeInfo.text})`;

                const bar = renderProgressBar(uo.currentTotal, uo.targetMin, 8);
                const isMet = uo.currentTotal >= uo.targetMin;
                const poolText = isMet
                  ? `[${bar}] ฿${uo.currentTotal}/฿${uo.targetMin} (ครบส่งฟรี 🎉)`
                  : `[${bar}] ฿${uo.currentTotal}/฿${uo.targetMin}`;

                return (
                  `${idx + 1}. ${uo.shopName}\n` +
                  `   📦 กล่อง: ${uo.boxLabel}\n` +
                  `   ⚡ สถานะ: ${statusEmoji}\n` +
                  `   📊 รวมรอบ: ${poolText}\n` +
                  `   💰 ยอดของคุณ: ฿${uo.totalAmount}`
                );
              });

              await replyMessage(token, replyToken, [
                {
                  type: "text",
                  text:
                    `🍱 ออเดอร์ของคุณ (${rawText}):\n\n` +
                    lines.join("\n\n") +
                    `\n\n📍 รับที่: M4\n` +
                    `👉 More info:\n${appUrl}/orders?phone=${cleanDigits}`,
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
                    `🔍 ไม่พบออเดอร์ของเบอร์ ${rawText} วันนี้ครับ\n\n` +
                    `👉 สั่งอาหารได้ที่:\n${appUrl}`,
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

          // General status summary across batches with ASCII progress bar
          const statusLines = batches.map((b, idx) => {
            const bar = renderProgressBar(b.currentTotalAmount, b.targetMinAmount, 10);
            const isMet = b.currentTotalAmount >= b.targetMinAmount;
            const countText = b.orders.length > 0 ? `${b.orders.length} กล่อง` : "0 order";

            let details = "";
            switch (b.status) {
              case "OPEN": {
                const goalText = isMet
                  ? `฿${b.currentTotalAmount}/฿${b.targetMinAmount} (ครบส่งฟรี 🎉)`
                  : `฿${b.currentTotalAmount}/฿${b.targetMinAmount}`;
                const timeInfo = getTimeRemaining(b.cutoffTime, b.date);
                const statusDot = timeInfo.isExpired ? "🔴" : "🟢";
                details = `   [${bar}] ${goalText}\n   ${statusDot} ${timeInfo.text} • ${countText}`;
                break;
              }
              case "LOCKED": {
                details = `   [██████████] 🍳 กำลังปรุง • ${countText}`;
                break;
              }
              case "DELIVERING": {
                details = `   [██████████] 🛵 ไรเดอร์กำลังมา • ${countText}`;
                break;
              }
              case "COMPLETED": {
                details = `   [██████████] ✨ ถึง M4 แล้ว 📸 • ${countText}`;
                break;
              }
              default:
                details = `   สถานะ: ${b.status}`;
            }
            return `${idx + 1}. ${b.shop.name}\n${details}`;
          });

          const replyText =
            `🍱 Update:\n\n` +
            statusLines.join("\n\n") +
            `\n\n📍 รับที่: M4\n` +
            `👉 More info:\n${appUrl}/orders`;

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

function renderProgressBar(current: number, target: number, length: number = 10): string {
  const ratio = Math.max(0, Math.min(1, target > 0 ? current / target : 0));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function getTimeRemaining(cutoffTimeStr: string, batchDate?: string): { isExpired: boolean; text: string } {
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
      return { isExpired: true, text: "closed" };
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

    return { isExpired: false, text: `อีก ${text}` };
  } catch {
    return { isExpired: false, text: `ปิด ${cutoffTimeStr} น.` };
  }
}

