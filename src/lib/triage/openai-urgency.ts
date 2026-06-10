import "server-only";
// Rule 3 — real urgency rating via OpenAI. SERVER ONLY.
//
// The `server-only` import above makes any client-component import of this file a
// build error, so OPENAI_API_KEY can never be bundled into the browser. The key is
// read from process.env at call time and never returned to the client.

import OpenAI from "openai";
import type { RateUrgency } from "./types";
import { MAX_MESSAGE_LENGTH } from "./constants";

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are an incident-triage assistant. Rate how URGENT the wording of an alert or log " +
  "line sounds, judging tone and phrasing rather than doing any math. Respond with JSON " +
  'of the exact shape {"score": number} where score is between 0 and 1: 1 = the wording ' +
  "sounds extremely urgent / on fire, 0 = calm and routine. Return only the JSON object.";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

/**
 * Pure, network-free parser for the model's reply. Extracts `score`, validates it
 * is a finite number, and clamps to [0,1]. Throws on anything malformed so the
 * caller (classify) can fall back to the Undetermined card.
 */
export function parseUrgencyScore(content: string | null | undefined): number {
  if (!content) throw new Error("empty model response");
  const data = JSON.parse(content) as unknown;
  const score = (data as { score?: unknown })?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    throw new Error("model response missing a numeric score");
  }
  return Math.max(0, Math.min(1, score));
}

export const openaiRateUrgency: RateUrgency = async (message: string) => {
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const completion = await getClient().chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message.slice(0, MAX_MESSAGE_LENGTH) },
    ],
  });
  return parseUrgencyScore(completion.choices[0]?.message?.content);
};
