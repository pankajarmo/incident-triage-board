// Colour gradients for the card background, with WCAG-safe text chosen per colour.
//
// Note: with adaptive black/white text, the worst-case contrast across ALL
// backgrounds is ~4.58:1 (the point where black and white tie), so every colour
// here clears AA 4.5:1. The contrast spec asserts this rather than trusting it.

import type { ColorChoice } from "./types";
import { hexToRgb, rgbToHex, pickText } from "./contrast";
import { clamp01 } from "./intensity";
import { URGENCY_ELEVATED, URGENCY_URGENT } from "./constants";
import type { Urgency } from "./types";

interface Stop {
  at: number;
  hex: string;
}

/** Rule 1: amber (barely over) → deep red (way over). */
export const RULE1_STOPS: Stop[] = [
  { at: 0.0, hex: "#f59e0b" }, // amber
  { at: 0.25, hex: "#f97316" }, // orange
  { at: 0.5, hex: "#dc2626" }, // red
  { at: 0.75, hex: "#b91c1c" }, // dark red
  { at: 1.0, hex: "#7f1d1d" }, // deep red
];

/** Rule 3: urgent red → orange → calm green. */
export const RULE3_STOPS: Stop[] = [
  { at: 0.0, hex: "#16a34a" }, // calm green
  { at: 0.5, hex: "#f59e0b" }, // amber
  { at: 1.0, hex: "#dc2626" }, // urgent red
];

const KEYWORD_AMBER = "#f59e0b";
const NEUTRAL_SLATE = "#475569";

function lerpStops(stops: Stop[], t: number): string {
  const x = clamp01(t);
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (x >= stops[i].at && x <= stops[i + 1].at) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi.at - lo.at || 1;
  const f = (x - lo.at) / span;
  const a = hexToRgb(lo.hex);
  const b = hexToRgb(hi.hex);
  return rgbToHex({
    r: a.r + (b.r - a.r) * f,
    g: a.g + (b.g - a.g) * f,
    b: a.b + (b.b - a.b) * f,
  });
}

function choice(background: string): ColorChoice {
  const { text, contrastRatio } = pickText(background);
  return { background, text, contrastRatio };
}

export function rule1Color(intensity: number): ColorChoice {
  return choice(lerpStops(RULE1_STOPS, intensity));
}

export function rule3Color(urgency: number): ColorChoice {
  return choice(lerpStops(RULE3_STOPS, urgency));
}

export function keywordColor(): ColorChoice {
  return choice(KEYWORD_AMBER);
}

export function neutralColor(): ColorChoice {
  return choice(NEUTRAL_SLATE);
}

/** Map a 0..1 urgency score to a label. */
export function urgencyLabel(score: number): Urgency {
  if (score >= URGENCY_URGENT) return "Urgent";
  if (score >= URGENCY_ELEVATED) return "Elevated";
  return "Calm";
}
