import { NextResponse } from "next/server";
import {
  sanitizeSingleMenuNameWithThaiLLM,
  getThaiLLMMetrics,
  recordThaiLLMCall,
} from "@/lib/thaillm";

const THAILLM_API_KEY = process.env.THAILLM_API_KEY || "K25Cnc8myVFS83RPFOzA5waZldNc2pQe";
const THAILLM_MODEL = process.env.THAILLM_MODEL || "openthaigpt-thaillm-8b-instruct-v7.2";
const THAILLM_API_URL = process.env.THAILLM_API_URL || "http://thaillm.or.th/api/v1/chat/completions";
const CONSUMER_ID = "278dcd0f-eb68-4494-9387-e635c99cbb68";

function getMaskedKey(key: string): string {
  if (!key || key.length < 8) return "Not set";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export async function GET() {
  const startTime = Date.now();
  let online = false;
  let latencyMs = 0;
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for ping

    const response = await fetch(THAILLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${THAILLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: THAILLM_MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    latencyMs = Date.now() - startTime;
    recordThaiLLMCall(response.status);

    if (response.ok) {
      online = true;
    } else {
      online = false;
      errorMsg = `HTTP ${response.status} ${response.statusText}`;
    }
  } catch (err: any) {
    recordThaiLLMCall("error");
    latencyMs = Date.now() - startTime;
    online = false;
    errorMsg = err.name === "AbortError" ? "Connection timeout (>10s)" : err.message;
  }

  return NextResponse.json({
    success: true,
    online,
    latencyMs: online ? latencyMs : null,
    error: errorMsg,
    telemetry: getThaiLLMMetrics(),
    config: {
      model: THAILLM_MODEL,
      apiUrl: THAILLM_API_URL,
      consumerId: CONSUMER_ID,
      rateLimit: "5 req/s (200 req/min)",
      hasKey: Boolean(THAILLM_API_KEY),
      maskedKey: getMaskedKey(THAILLM_API_KEY),
      temperature: 0.1,
      maxTokens: 1500,
      reasoningMode: "OpenThaiGPT CoT (<think> stripping enabled)",
    },
    testedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const testInput = (body.dishName || body.prompt || "").trim();

    if (!testInput) {
      return NextResponse.json(
        { success: false, error: "Missing dishName or prompt" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const sanitized = await sanitizeSingleMenuNameWithThaiLLM(testInput);
    const latencyMs = Date.now() - startTime;
    const hasTypo = sanitized.trim() !== testInput.trim();

    return NextResponse.json({
      success: true,
      original: testInput,
      sanitized,
      hasTypo,
      latencyMs,
      testedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to test ThaiLLM" },
      { status: 500 }
    );
  }
}
