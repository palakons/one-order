/**
 * ThaiLLM (OpenThaiGPT) Client & Typo Sanitizer
 * API Provider: http://thaillm.or.th
 * Model: openthaigpt-thaillm-8b-instruct-v7.2
 */

const THAILLM_API_KEY = process.env.THAILLM_API_KEY || "K25Cnc8myVFS83RPFOzA5waZldNc2pQe";
const THAILLM_MODEL = process.env.THAILLM_MODEL || "openthaigpt-thaillm-8b-instruct-v7.2";
const THAILLM_API_URL = process.env.THAILLM_API_URL || "http://thaillm.or.th/api/v1/chat/completions";

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
