// Tunable thresholds and ceilings — single source of truth.

/** Rule 1 thresholds (strict greater-than). */
export const ERROR_RATE_THRESHOLD = 5; // percent
export const LATENCY_THRESHOLD_MS = 1000; // milliseconds

/** Intensity saturation ceilings — value at which the card hits max red (t = 1). */
export const ERROR_RATE_CEILING = 50; // percent => deep red
export const LATENCY_CEILING_MS = 5000; // 5s => deep red

/** When calming language caps a P1, intensity is held at or below this (mid-orange). */
export const STAND_DOWN_CAP = 0.45;

/** Urgency score cut-points for rule 3 labels. */
export const URGENCY_URGENT = 0.66;
export const URGENCY_ELEVATED = 0.33;

/** Max accepted input length (defensive, also caps any LLM payload). */
export const MAX_MESSAGE_LENGTH = 5000;
