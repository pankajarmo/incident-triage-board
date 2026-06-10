// Rule 3 hook. The real model call is injected in Phase 3; this module only
// defines the contract, a clearly-marked stub, and a timeout wrapper.

import type { RateUrgency } from "./types";

export const RULE3_TIMEOUT_MS = 8000;

/**
 * Phase 1 placeholder. NOT a real classifier — it returns a fixed mid score so
 * the pipeline is exercised in tests/dev without a backend. Replaced in Phase 3.
 */
export const stubRateUrgency: RateUrgency = async () => {
  return 0.5;
};

/** Reject if the urgency call takes too long, so classify can fall back safely. */
export function withTimeout(fn: RateUrgency, ms = RULE3_TIMEOUT_MS): RateUrgency {
  return (message: string) =>
    new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("rule3 timeout")), ms);
      fn(message).then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
}
