// Rule 2 keyword detection + stand-down (calming) detection.
//
// Matching is case-insensitive and token-aware (word boundaries) so that values
// like "503ms" or "500MB" do not collide with status-code keywords, and counts
// like "500 requests" do not false-trigger (numeric HTTP codes are anchored).

/** Plain incident keywords matched as whole tokens / phrases. Single source of truth. */
export const BAD_KEYWORDS: readonly string[] = [
  // spec starter list
  "timeout",
  "503",
  "OOM",
  "panic",
  // HTTP (standalone-safe codes)
  "5xx",
  "429",
  // crashes
  "crash",
  "crashed",
  "fatal",
  "segfault",
  "core dumped",
  "unhandled exception",
  "stacktrace",
  "traceback",
  "NPE",
  "CrashLoopBackOff",
  "OOMKilled",
  // stuck / saturated
  "deadlock",
  "throttled",
  "rate limited",
  "circuit breaker",
  "circuit open",
  "deadline exceeded",
  "timed out",
  // infra
  "ECONNREFUSED",
  "connection refused",
  "connection reset",
  "unreachable",
  "ENOSPC",
  "no space left",
  "disk full",
  "outage",
  "unavailable",
  "degraded",
];

/** HTTP codes too collision-prone to match bare; require nearby HTTP/status context. */
const HTTP_ANCHORED_CODES = ["500", "502", "504"];

/** Calming phrases that may cap a P1's colour intensity. */
export const STAND_DOWN_KEYWORDS: readonly string[] = [
  "auto-recovered",
  "auto recovered",
  "autorecovered",
  "self-healed",
  "self healed",
  "recovered",
  "mitigated",
  "resolved",
  "no customer impact",
  "no impact",
  "false alarm",
  "transient",
  "back to normal",
  "under control",
  "non-issue",
  "no action needed",
];

const NEGATORS = /\b(?:not|no|never|without|n't|isn't|wasn't|hasn't|aren't|haven't)\b/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a whole-token matcher; internal spaces become flexible whitespace. */
function tokenRegex(keyword: string): RegExp {
  const body = escapeRegExp(keyword).replace(/\\?\s+/g, "\\s+");
  return new RegExp(`\\b${body}\\b`, "i");
}

const BAD_REGEXES = BAD_KEYWORDS.map((k) => ({ keyword: k, re: tokenRegex(k) }));

// Anchored HTTP codes: code preceded by http/status/code/response, or followed by
// error/response/status/returned.
const HTTP_CODE_REGEXES = HTTP_ANCHORED_CODES.map((code) => ({
  keyword: code,
  re: new RegExp(
    `(?:\\b(?:https?|status(?:\\s*code)?|code|response)\\b[\\s:=]*${code}\\b)` +
      `|(?:\\b${code}\\b\\s+(?:error|errors|response|responses|status|returned))`,
    "i",
  ),
}));

const STAND_DOWN_REGEXES = STAND_DOWN_KEYWORDS.map((k) => ({
  keyword: k,
  re: new RegExp(tokenRegex(k).source, "gi"),
}));

/** Returns the first bad keyword found (for the reason string), or null. */
export function findBadKeyword(message: string): string | null {
  for (const { keyword, re } of BAD_REGEXES) {
    if (re.test(message)) return keyword;
  }
  for (const { keyword, re } of HTTP_CODE_REGEXES) {
    if (re.test(message)) return keyword;
  }
  return null;
}

export function hasBadKeyword(message: string): boolean {
  return findBadKeyword(message) !== null;
}

/**
 * Returns the first calming keyword that is NOT negated, or null.
 * Negation guard: a calm term preceded (within ~22 chars) by a negator is ignored,
 * so "has not recovered" does not soften a live P1.
 */
export function findStandDown(message: string): string | null {
  for (const { keyword, re } of STAND_DOWN_REGEXES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(message)) !== null) {
      const start = m.index;
      const lookback = message.slice(Math.max(0, start - 22), start);
      if (!NEGATORS.test(lookback)) return keyword;
    }
  }
  return null;
}
