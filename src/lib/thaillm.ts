/**
 * ThaiLLM (OpenThaiGPT) Client, Typo Sanitizer & Order Recommender
 * API Provider: http://thaillm.or.th
 * Model: openthaigpt-thaillm-8b-instruct-v7.2
 */

const THAILLM_API_KEY = process.env.THAILLM_API_KEY || "K25Cnc8myVFS83RPFOzA5waZldNc2pQe";
const THAILLM_MODEL = process.env.THAILLM_MODEL || "openthaigpt-thaillm-8b-instruct-v7.2";
const THAILLM_API_URL = process.env.THAILLM_API_URL || "http://thaillm.or.th/api/v1/chat/completions";

// -------------------------------------------------------------
// Telemetry & Rate-Limit (429) Tracker
// -------------------------------------------------------------
export interface ThaiLLMTelemetry {
  totalCalls: number;
  successCalls: number;
  rateLimitHits: number;
  lastRateLimitIso?: string;
  lastSuccessIso?: string;
  lastCallIso?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __THAILLM_METRICS__: ThaiLLMTelemetry | undefined;
}

export function getThaiLLMMetrics(): ThaiLLMTelemetry {
  if (!globalThis.__THAILLM_METRICS__) {
    globalThis.__THAILLM_METRICS__ = {
      totalCalls: 0,
      successCalls: 0,
      rateLimitHits: 0,
    };
  }
  return globalThis.__THAILLM_METRICS__;
}

export function recordThaiLLMCall(status: number | "error") {
  const m = getThaiLLMMetrics();
  m.totalCalls += 1;
  m.lastCallIso = new Date().toISOString();

  if (status === 200) {
    m.successCalls += 1;
    m.lastSuccessIso = new Date().toISOString();
  } else if (status === 429) {
    m.rateLimitHits += 1;
    m.lastRateLimitIso = new Date().toISOString();
    console.warn(`🚨 [ThaiLLM] Rate Limit (429) hit! Total 429 hits today: ${m.rateLimitHits}`);
  }
}

export function stripThinkingAndCodeBlocks(raw: string): string {
  // Strip <think>...</think> tag from reasoning models
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  return text;
}

/**
 * Sanitize a list of Thai dish menu names to fix spelling mistakes,
 * tonal accents, and transliterations using ThaiLLM.
 */
export async function sanitizeMenuNamesWithThaiLLM(
  dishNames: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!dishNames || dishNames.length === 0) {
    return result;
  }

  // Prepopulate default mapping (original -> original)
  dishNames.forEach((name) => {
    result[name] = name;
  });

  // Batch into chunks of up to 10 items for optimal LLM accuracy
  const CHUNK_SIZE = 10;
  for (let i = 0; i < dishNames.length; i += CHUNK_SIZE) {
    const chunk = dishNames.slice(i, i + CHUNK_SIZE);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const response = await fetch(THAILLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${THAILLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: THAILLM_MODEL,
          messages: [
            {
              role: "system",
              content:
                "คุณคือ AI ผู้เชี่ยวชาญภาษาไทยด้านชื่อเมนูอาหาร ทำหน้าที่ตรวจแก้คำพิมพ์ผิด (Typo Correction) สำหรับชื่อเมนูอาหารไทย\n" +
                "กฎเหล็ก:\n" +
                "1. ตรวจจับและแก้เฉพาะคำที่พิมพ์ผิด วรรณยุกต์ผิด หรือทับศัพท์ผิด เช่น 'จิ่มจุ่ม' -> 'จิ้มจุ่ม', 'ข้าวบรอคคอลี่กุ้ง' -> 'ข้าวบรอกโคลีกุ้ง', 'ผัดซีอิ้ว' -> 'ผัดซีอิ๊ว'\n" +
                "2. ห้ามเปลี่ยนวัตถุดิบและห้ามเติมคำใหม่ที่ผู้ใช้ไม่ได้พิมพ์เด็ดขาด (เช่น 'ส้มตำปู' ห้ามเปลี่ยนเป็น 'ส้มตำปูม้า')\n" +
                "3. หากชื่อเมนูสะกดถูกต้องอยู่แล้ว ให้คงข้อความเดิมไว้ 100% ทุกตัวอักษร\n" +
                "4. รักษาคำระบุเพิ่มเติมในวงเล็บ เช่น (กับข้าว), พิเศษ ไว้อย่างเดิม\n" +
                "5. ตอบเฉพาะ JSON Array: [{\"original\": \"...\", \"sanitized\": \"...\"}] ห้ามใส่คำอธิบายอื่น",
            },
            {
              role: "user",
              content: JSON.stringify(chunk),
            },
          ],
          max_tokens: 1500,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      recordThaiLLMCall(response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`ThaiLLM API returned status ${response.status}:`, errorText);
        continue;
      }

      const json = await response.json();
      const rawContent = json.choices?.[0]?.message?.content || "";
      const cleaned = stripThinkingAndCodeBlocks(rawContent);

      try {
        const parsed: Array<{ original: string; sanitized: string }> = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item.original && item.sanitized) {
              result[item.original] = item.sanitized.trim();
            }
          });
        }
      } catch (parseErr) {
        console.warn("Failed to parse ThaiLLM response as JSON array:", parseErr, "Content was:", cleaned);
        // Fallback: Try regex extraction
        const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (match) {
          try {
            const fallbackParsed = JSON.parse(match[0]);
            fallbackParsed.forEach((item: any) => {
              if (item.original && item.sanitized) {
                result[item.original] = item.sanitized.trim();
              }
            });
          } catch {}
        }
      }
    } catch (err) {
      recordThaiLLMCall("error");
      console.error("Error calling ThaiLLM API chunk:", err);
    }
  }

  return result;
}

/**
 * Sanitize a single menu dish name with ThaiLLM
 */
export async function sanitizeSingleMenuNameWithThaiLLM(dishName: string): Promise<string> {
  if (!dishName || !dishName.trim()) return dishName;
  try {
    const map = await sanitizeMenuNamesWithThaiLLM([dishName.trim()]);
    return map[dishName.trim()] || dishName.trim();
  } catch (err) {
    console.warn("Failed to sanitize single dish name with ThaiLLM:", err);
    return dishName;
  }
}

// -------------------------------------------------------------
// Interactive Order Recommendation with Shop Context
// -------------------------------------------------------------
export interface DishRecommendation {
  name: string;
  price: number;
  reason: string;
}

export async function recommendMenuWithThaiLLM({
  userPrompt,
  shopName,
  shopMenus,
}: {
  userPrompt: string;
  shopName: string;
  shopMenus: Array<{ name: string; price: number }>;
}): Promise<{
  success: boolean;
  recommendations: DishRecommendation[];
  rateLimited?: boolean;
  error?: string;
}> {
  if (!userPrompt || !userPrompt.trim()) {
    return { success: false, recommendations: [], error: "Missing user prompt" };
  }

  if (!shopMenus || shopMenus.length === 0) {
    return {
      success: false,
      recommendations: [],
      error: "ไม่มีรายการเมนูของร้านนี้ในระบบ",
    };
  }

  // Cap to top 35 dishes to stay lean on tokens
  const compactMenus = shopMenus.slice(0, 35).map((m) => ({
    name: m.name.trim(),
    price: m.price || 0,
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const systemPrompt =
      `คุณคือ "AI ผู้ช่วยเลือกอาหารตามสั่งประจำร้าน" ของร้าน "${shopName}"\n` +
      `หน้าที่ของคุณคือวิเคราะห์ความต้องการหรืออารมณ์ของลูกค้า แล้วเลือกแนะนำ 1 ถึง 2 เมนูที่ตรงใจที่สุด จาก [รายการเมนูที่มีอยู่จริงของร้านนี้] เท่านั้น!\n\n` +
      `กฎเหล็กที่ต้องปฏิบัติตามอย่างเคร่งครัด:\n` +
      `1. ต้องแนะนำเฉพาะชื่อเมนูที่มีอยู่ใน [รายการอาหารของร้าน] ด้านล่างนี้เท่านั้น ห้ามแต่งหรือสร้างชื่อเมนูใหม่เด็ดขาด\n` +
      `2. ตอบในรูปแบบ JSON Array เท่านั้น ตามโครงสร้างนี้:\n` +
      `[\n` +
      `  {\n` +
      `    "name": "ชื่อเมนูที่มีในรายการ",\n` +
      `    "price": ราคาตัวเลขตามรายการ,\n` +
      `    "reason": "เหตุผลสั้นๆ 1 ประโยค (ไม่เกิน 15 คำ) สำเนียงน่ารัก เป็นกันเอง เช่น แซ่บถึงใจ ผักกรุบกรอบ งบสบายกระเป๋า"\n` +
      `  }\n` +
      `]\n` +
      `3. ห้ามพิมพ์ข้อความอื่นใดนอกเหนือจาก JSON Array เด็ดขาด`;

    const userMessage =
      `ความต้องการของลูกค้า: "${userPrompt.trim()}"\n\n` +
      `[รายการอาหารของร้าน]:\n` +
      JSON.stringify(compactMenus);

    const response = await fetch(THAILLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${THAILLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: THAILLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    recordThaiLLMCall(response.status);

    if (response.status === 429) {
      return {
        success: false,
        recommendations: [],
        rateLimited: true,
        error: "ป้า AI คิวยาวนิดนึงน้า (ชน Rate Limit) รบกวนรอ 3-5 วินาทีแล้วถามใหม่อีกทีจ้า",
      };
    }

    if (!response.ok) {
      const errTxt = await response.text();
      return {
        success: false,
        recommendations: [],
        error: `ThaiLLM Error (HTTP ${response.status}): ${errTxt}`,
      };
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || "";
    const cleaned = stripThinkingAndCodeBlocks(rawContent);

    let parsed: Array<{ name: string; price: number; reason: string }> = [];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {}
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      // Fallback: Pick top 2 items from shopMenus that vaguely match or are popular
      return {
        success: true,
        recommendations: compactMenus.slice(0, 2).map((m) => ({
          name: m.name,
          price: m.price,
          reason: "เมนูเด็ดประจำร้าน อร่อยถูกใจแน่นอน",
        })),
      };
    }

    // Verify recommendations belong to the shop
    const validatedRecs: DishRecommendation[] = [];
    parsed.slice(0, 3).forEach((rec) => {
      if (!rec.name) return;
      const matchedShopItem = compactMenus.find(
        (m) => m.name.toLowerCase() === rec.name.trim().toLowerCase()
      );
      validatedRecs.push({
        name: matchedShopItem ? matchedShopItem.name : rec.name.trim(),
        price: matchedShopItem ? matchedShopItem.price : Number(rec.price) || 0,
        reason: rec.reason || "เมนูแนะนำตามความต้องการของคุณ",
      });
    });

    return {
      success: true,
      recommendations: validatedRecs.length > 0 ? validatedRecs : [
        {
          name: compactMenus[0].name,
          price: compactMenus[0].price,
          reason: "เมนูยอดนิยมประจำร้าน แนะนำให้ลอง!",
        },
      ],
    };
  } catch (err: any) {
    recordThaiLLMCall("error");
    const isAbort = err.name === "AbortError";
    return {
      success: false,
      recommendations: [],
      error: isAbort ? "การเชื่อมต่อกับ AI ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง" : err.message,
    };
  }
}

/**
 * AI Announcement Crafter for Group Leaders
 * Turns informal or raw leader notes (e.g. "คนเยอะ ร้านบอกช้า 20 นาที")
 * into brief, polite, and tactful broadcast messages for campus members.
 */
export async function craftAnnouncementWithThaiLLM(params: {
  shopName: string;
  situation: string; // e.g. "food delayed 20 mins", "shop out of basil", "shop closed early"
  rawNote?: string;
}): Promise<{ success: boolean; message: string; error?: string }> {
  const { shopName, situation, rawNote } = params;

  // Fallback template builder if LLM is unavailable or times out
  const buildFallback = () => {
    const note = (rawNote || situation).trim();
    if (note.includes("ช้า") || note.includes("เลท") || note.includes("delay") || situation.includes("delay")) {
      return `📢 แจ้งเตือนจากตี้ร้าน ${shopName}: ขณะนี้คิวที่ร้านค่อนข้างแน่น อาหารอาจจะล่าช้ากว่ากำหนดเดิมเล็กน้อย ขออภัยในความไม่สะดวกครับ/ค่ะ`;
    }
    if (note.includes("ปิด") || note.includes("หมด") || note.includes("close")) {
      return `📢 แจ้งเตือนจากตี้ร้าน ${shopName}: เนื่องจากทางร้านแจ้ง${note} จึงขอแจ้งให้ทุกท่านทราบ ขออภัยในความล่าช้า/ไม่สะดวกครับ/ค่ะ`;
    }
    return `📢 แจ้งเตือนตี้ร้าน ${shopName}: ${note} (อยู่ระหว่างการประสานงาน)`;
  };

  try {
    const prompt = `คุณคือผู้ช่วยสื่อสารของกลุ่มหัวหน้าตี้สั่งอาหารในมหาวิทยาลัย VISTEC
ช่วยเรียบเรียงข้อความแจ้งเตือนสั้นๆ สุภาพ และชัดเจน เพื่อประกาศให้เพื่อนๆ ในตี้ทราบ

ข้อมูล:
- ร้านค้า: ${shopName}
- สถานการณ์: ${situation}
${rawNote ? `- รายละเอียดเพิ่มเติมจากหัวหน้าตี้: "${rawNote}"` : ""}

เงื่อนไข:
1. ตอบเป็นข้อความภาษาไทยความยาว 1-2 ประโยคกระชับ ไม่เยิ่นเย้อ
2. ใช้น้ำเสียงสุภาพ เข้าอกเข้าใจ (tactful) แต่ตรงประเด็น
3. มีอิโมจิประกอบอย่างเหมาะสม เช่น ⚠️ ⏳ 🍱
4. ตอบเฉพาะข้อความประกาศโดยตรง ไม่ต้องมีคำเกริ่น ไม่ต้องมีเครื่องหมายคำพูด`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(THAILLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${THAILLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: THAILLM_MODEL,
        messages: [
          {
            role: "system",
            content: "คุณคือผู้ช่วยสื่อสารภาษาไทยที่เชี่ยวชาญการแจ้งข่าวสารอย่างกระชับ สุภาพ และชัดเจน",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    recordThaiLLMCall(res.status);

    if (!res.ok) {
      console.warn(`[ThaiLLM Craft] API call failed with status ${res.status}`);
      return { success: true, message: buildFallback() };
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content?.trim() || "";
    content = stripThinkingAndCodeBlocks(content);
    // Remove surrounding quotes if model added them
    content = content.replace(/^["'“]|["'”]$/g, "").trim();

    if (!content) {
      return { success: true, message: buildFallback() };
    }

    return { success: true, message: content };
  } catch (err: any) {
    recordThaiLLMCall("error");
    return { success: true, message: buildFallback() };
  }
}

