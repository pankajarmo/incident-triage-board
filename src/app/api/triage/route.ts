import { NextResponse } from "next/server";
import { classify } from "@/lib/triage/classify";
import { MAX_MESSAGE_LENGTH } from "@/lib/triage/constants";
import { openaiRateUrgency } from "@/lib/triage/openai-urgency";
import { readSession } from "@/lib/auth/session";

// Classification runs server-side so the rule-3 LLM call (Phase 3) and its key
// never reach the browser. Rules 1 & 2 are deterministic but run here too for a
// single, uniform entry point.

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Authoritative auth check at the data source (the proxy gate is optimistic and
  // does not run on /api/*). No valid session → no triage.
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = (body as { message?: unknown })?.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "A non-empty 'message' is required." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 413 },
    );
  }

  // Rule 3 calls OpenAI server-side. On any failure (missing/bad key, timeout,
  // malformed reply) classify falls back to an Undetermined card rather than erroring.
  const result = await classify(message, { rateUrgency: openaiRateUrgency });
  return NextResponse.json(result);
}
