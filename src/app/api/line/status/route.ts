import { NextResponse } from "next/server";
import { getActiveLineGroupIds, saveActiveLineGroupId, removeActiveLineGroupId } from "@/lib/store";
import { pushLineMessage } from "@/lib/line";

export async function GET() {
  try {
    const hasToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
    const envGroupId = process.env.LINE_GROUP_ID || null;
    const envUserId = process.env.LINE_USER_ID || null;
    const activeGroupIds = await getActiveLineGroupIds();

    const token =
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      "tDuAIqGSY0EjLJ6JX5+xeNtfEWtlOtXdMggAuhMTDSYxB+d8LJI45ksz7qUlSIJUE7wVfOTM/BGYtHEfYLuP2FKrBCzZOa7pnWZCwJWb6m4Fjy98UQDZKFY9w2RcxBOF/4NZTJotAskvnDHAz0pxLAdB04t89/1O/w1cDnyilFU=";

    let quota = {
      limit: 300,
      totalUsage: 0,
      remaining: 300,
      type: "limited",
    };

    if (token) {
      try {
        const [quotaRes, usageRes] = await Promise.all([
          fetch("https://api.line.me/v2/bot/message/quota", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://api.line.me/v2/bot/message/quota/consumption", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (quotaRes.ok && usageRes.ok) {
          const quotaData = await quotaRes.json();
          const usageData = await usageRes.json();
          const limit = typeof quotaData.value === "number" ? quotaData.value : 300;
          const totalUsage = typeof usageData.totalUsage === "number" ? usageData.totalUsage : 0;
          quota = {
            limit,
            totalUsage,
            remaining: Math.max(0, limit - totalUsage),
            type: quotaData.type || "limited",
          };
        }
      } catch (err) {
        console.warn("LINE quota fetch error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      hasToken,
      envGroupId,
      envUserId,
      activeGroupIds,
      quota,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, groupId, targetId, message } = body;

    // Action 1: Manually add Group ID
    if (action === "add" && groupId) {
      await saveActiveLineGroupId(groupId);
      const activeGroupIds = await getActiveLineGroupIds();
      return NextResponse.json({
        success: true,
        message: `เพิ่ม Group ID ${groupId} สำเร็จ`,
        activeGroupIds,
      });
    }

    // Action 2: Remove Group ID
    if (action === "remove" && groupId) {
      await removeActiveLineGroupId(groupId);
      const activeGroupIds = await getActiveLineGroupIds();
      return NextResponse.json({
        success: true,
        message: `ลบ Group ID ${groupId} สำเร็จ`,
        activeGroupIds,
      });
    }

    // Action 3: Custom Announcement / Broadcast Message
    if (action === "broadcast" && message) {
      const ok = await pushLineMessage(message, undefined, targetId);
      if (ok) {
        return NextResponse.json({
          success: true,
          message: "ส่งข้อความประกาศเข้า LINE เรียบร้อยแล้ว!",
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "ไม่สามารถส่งข้อความประกาศได้ กรุณาตรวจสอบสถานะ Token และ Group ID",
          },
          { status: 400 }
        );
      }
    }

    // Action 4: Default Test Message
    const testText =
      message ||
      `🧪 [VEATEC Test] ทดสอบระบบแจ้งเตือน LINE สำเร็จแล้วครับ! ✨\n\n` +
      `เวลาที่ทดสอบ: ${new Date().toLocaleTimeString("th-TH")} น.\n` +
      `เมื่อร้านอาหารจัดส่งข้าวถึงโต๊ะตึก M4 ระบบจะแจ้งเตือนพร้อมรูปถ่ายเข้ากลุ่มนี้โดยอัตโนมัติ 🍱`;

    const ok = await pushLineMessage(testText, undefined, targetId);

    if (ok) {
      return NextResponse.json({
        success: true,
        message: "ส่งข้อความทดสอบเข้า LINE เรียบร้อยแล้ว! ตรวจสอบในกลุ่มได้เลยครับ",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            "ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบว่าบอทอยู่ในกลุ่ม และได้รับ Group ID หรือยัง (พิมพ์ 'group id' ในกลุ่มเพื่อเชื่อมต่อ)",
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
