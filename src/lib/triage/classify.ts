// Orchestrator: runs rules 1 → 2 → 3 and returns on the first match.

import type { RateUrgency, TriageResult } from "./types";
import { parseMetrics } from "./parse";
import { rule1Hit } from "./intensity";
import { findBadKeyword, findStandDown, hasBadKeyword } from "./keywords";
import {
  rule1Color,
  rule3Color,
  keywordColor,
  neutralColor,
  urgencyLabel,
} from "./color";
import { STAND_DOWN_CAP } from "./constants";
import { clamp01 } from "./intensity";
import { stubRateUrgency, withTimeout } from "./llm";

export interface ClassifyOptions {
  /** Injected rule-3 urgency scorer (0..1). Defaults to the Phase 1 stub. */
  rateUrgency?: RateUrgency;
}

export async function classify(
  rawMessage: string,
  options: ClassifyOptions = {},
): Promise<TriageResult> {
  const message = (rawMessage ?? "").trim();
  if (message.length === 0) return { kind: "neutral" };

  // Rule 1 — identity-anchored threshold math.
  const hit = rule1Hit(parseMetrics(message));
  if (hit) {
    const { driver } = hit;
    let intensity = hit.intensity;
    let mixedSignal = false;
    const notes: string[] = [];

    // Stand-down: calming language caps intensity — unless negated or a bad
    // keyword co-occurs (then the calm claim is untrustworthy; keep full red).
    const standDown = findStandDown(message);
    if (standDown && !hasBadKeyword(message)) {
      mixedSignal = true;
      intensity = clamp01(Math.min(intensity, STAND_DOWN_CAP));
      notes.push(`Mixed signal — calming language detected ("${standDown}"). Verify before standing down.`);
    }

    const metric =
      driver.kind === "error"
        ? `error rate ${driver.display} > 5%`
        : `latency ${driver.display} > 1000ms`;

    return {
      kind: "verdict",
      rule: 1,
      severity: "P1",
      label: "P1",
      color: rule1Color(intensity),
      intensity,
      reason: `Threshold breach: ${metric}.`,
      mixedSignal,
      notes: notes.length ? notes : undefined,
    };
  }

  // Rule 2 — known bad keyword.
  const bad = findBadKeyword(message);
  if (bad) {
    return {
      kind: "verdict",
      rule: 2,
      severity: "P2",
      label: "P2",
      color: keywordColor(),
      intensity: 0.5,
      reason: `Known incident keyword: "${bad}".`,
    };
  }

  // Rule 3 — LLM urgency (fallback). Never throws: fall back to Undetermined.
  const rate = withTimeout(options.rateUrgency ?? stubRateUrgency);
  try {
    const score = clamp01(await rate(message));
    const urgency = urgencyLabel(score);
    return {
      kind: "verdict",
      rule: 3,
      urgency,
      label: urgency,
      color: rule3Color(score),
      intensity: score,
      reason: `No threshold or keyword matched; model rated wording as ${urgency.toLowerCase()}.`,
    };
  } catch {
    return {
      kind: "verdict",
      rule: 3,
      urgency: "Undetermined",
      label: "Undetermined",
      color: neutralColor(),
      intensity: 0.5,
      reason: "No threshold or keyword matched, and the urgency model was unavailable.",
      notes: ["Triage manually — automated urgency rating failed."],
    };
  }
}
