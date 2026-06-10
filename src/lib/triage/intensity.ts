// Rule 1 — turn over-threshold readings into a 0..1 colour intensity.

import {
  ERROR_RATE_THRESHOLD,
  ERROR_RATE_CEILING,
  LATENCY_THRESHOLD_MS,
  LATENCY_CEILING_MS,
} from "./constants";
import type { MetricReading } from "./parse";

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function readingIntensity(r: MetricReading): number | null {
  if (r.kind === "error") {
    if (r.value <= ERROR_RATE_THRESHOLD) return null; // strict > threshold
    return clamp01((r.value - ERROR_RATE_THRESHOLD) / (ERROR_RATE_CEILING - ERROR_RATE_THRESHOLD));
  }
  if (r.value <= LATENCY_THRESHOLD_MS) return null;
  return clamp01((r.value - LATENCY_THRESHOLD_MS) / (LATENCY_CEILING_MS - LATENCY_THRESHOLD_MS));
}

export interface Rule1Hit {
  intensity: number; // base intensity, before any stand-down cap
  driver: MetricReading; // the worst reading (drives colour + reason)
}

/** The most severe over-threshold reading, or null if none cross the line. */
export function rule1Hit(readings: MetricReading[]): Rule1Hit | null {
  let best: Rule1Hit | null = null;
  for (const r of readings) {
    const t = readingIntensity(r);
    if (t === null) continue;
    if (!best || t > best.intensity) best = { intensity: t, driver: r };
  }
  return best;
}
