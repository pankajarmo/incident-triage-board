// Rule 1 — identity-anchored parsing.
//
// A number only counts when we can tell WHAT it measures:
//  - error rate: an explicit % near an error/failure cue
//  - latency:    a time-unit number near a latency cue
// Anything ambiguous (bare "40%", "CPU 40%", bare "1500ms") yields no reading,
// so rule 1 abstains and the message flows on to rules 2/3.

export interface MetricReading {
  kind: "error" | "latency";
  value: number; // error => percent; latency => milliseconds
  display: string; // e.g. "40%" or "1500ms"
}

const ERROR_CUE =
  /\b(?:error[\s_-]?rate|errored|errors?|err|failing|failures?|failed|fail|rejected|5xx)\b/i;

const LATENCY_CUE =
  /\b(?:latency|laten\w*|p(?:50|75|90|95|99)|response(?:\s*time)?|took|duration|elapsed|rtt|ping|responded|lag)\b/i;

const PERCENT_RE = /(\d+(?:\.\d+)?)\s*(?:%|percent\b)/gi;
const LATENCY_RE =
  /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(ms|msecs?|milliseconds?|millis|µs|us|microseconds?|minutes?|mins?|seconds?|secs?|s|m)\b/gi;

const WINDOW = 30; // chars of context to inspect on each side of a number

function isNegated(message: string, start: number): boolean {
  return message[start - 1] === "-";
}

function contextHasCue(message: string, start: number, end: number, cue: RegExp): boolean {
  // Stay within the current clause so a cue from a neighbouring clause
  // (e.g. "...errors, cache hit 95%") can't anchor an unrelated number.
  const before = (message.slice(Math.max(0, start - WINDOW), start).split(/[,;.\n]/).pop() ?? "");
  const after = message.slice(end, end + WINDOW).split(/[,;.\n]/)[0] ?? "";
  return cue.test(before) || cue.test(after);
}

function unitToMs(unitRaw: string): number {
  const u = unitRaw.toLowerCase();
  if (u === "ms" || u.startsWith("msec") || u.startsWith("millis")) return 1;
  if (u === "µs" || u === "us" || u.startsWith("micro")) return 0.001;
  if (u === "m" || u.startsWith("min")) return 60000;
  // seconds (s / sec / second(s))
  return 1000;
}

/** Extract all identified error-rate and latency readings (any magnitude). */
export function parseMetrics(message: string): MetricReading[] {
  const readings: MetricReading[] = [];

  for (const m of message.matchAll(PERCENT_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (isNegated(message, start)) continue;
    if (!contextHasCue(message, start, end, ERROR_CUE)) continue;
    const value = parseFloat(m[1]);
    if (Number.isNaN(value)) continue;
    readings.push({ kind: "error", value, display: `${m[1]}%` });
  }

  for (const m of message.matchAll(LATENCY_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (isNegated(message, start)) continue;
    if (!contextHasCue(message, start, end, LATENCY_CUE)) continue;
    const value = parseFloat(m[1].replace(/,/g, "")) * unitToMs(m[2]);
    if (Number.isNaN(value)) continue;
    readings.push({ kind: "latency", value, display: m[0].trim() });
  }

  return readings;
}
