// Shared types for the incident triage engine.

export type Rule = 1 | 2 | 3;

export type Severity = "P1" | "P2";
export type Urgency = "Urgent" | "Elevated" | "Calm" | "Undetermined";

/** A resolved card colour plus the WCAG contrast ratio of its text on its background. */
export interface ColorChoice {
  background: string; // hex, e.g. "#b91c1c"
  text: string; // hex, "#000000" or "#ffffff"
  contrastRatio: number; // measured WCAG ratio of text on background
}

interface BaseResult {
  /** Human label shown big on the card, e.g. "P1", "P2", "Urgent". */
  label: string;
  color: ColorChoice;
  /** 0..1 — how far over the line / how urgent. Drives the colour. */
  intensity: number;
  /** Plain-language explanation of why this verdict was reached. */
  reason: string;
  /** Conflicting signals detected (rule 1 number + calming language). */
  mixedSignal?: boolean;
  /** Extra context lines for the card. */
  notes?: string[];
}

/** Empty / whitespace-only input — nothing to triage. */
export interface NeutralResult {
  kind: "neutral";
}

/** Rule 1 (threshold math) or rule 2 (keyword) — deterministic. */
export interface DeterministicResult extends BaseResult {
  kind: "verdict";
  rule: 1 | 2;
  severity: Severity;
}

/** Rule 3 — LLM urgency (or Undetermined when the model is unavailable). */
export interface LlmResult extends BaseResult {
  kind: "verdict";
  rule: 3;
  urgency: Urgency;
}

export type TriageResult = NeutralResult | DeterministicResult | LlmResult;

/** Async hook for rule 3. Returns urgency in 0..1 (1 = most urgent). */
export type RateUrgency = (message: string) => Promise<number>;
