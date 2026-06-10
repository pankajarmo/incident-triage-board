import { describe, it, expect } from "vitest";
import { contrastRatio, pickText } from "../contrast";
import { RULE1_STOPS, RULE3_STOPS, rule1Color, rule3Color, keywordColor, neutralColor } from "../color";

const AA = 4.5;

function sample(n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => i / n);
}

describe("WCAG contrast", () => {
  it("known ratios are correct", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("every step of the rule-1 gradient clears AA", () => {
    for (const t of sample(50)) {
      const c = rule1Color(t);
      expect(c.contrastRatio).toBeGreaterThanOrEqual(AA);
    }
  });

  it("every step of the rule-3 gradient clears AA", () => {
    for (const u of sample(50)) {
      const c = rule3Color(u);
      expect(c.contrastRatio).toBeGreaterThanOrEqual(AA);
    }
  });

  it("keyword amber and neutral slate clear AA", () => {
    expect(keywordColor().contrastRatio).toBeGreaterThanOrEqual(AA);
    expect(neutralColor().contrastRatio).toBeGreaterThanOrEqual(AA);
  });

  it("reports measured ratios at the extremes (for the README)", () => {
    const points = {
      "rule1 amber (t=0)": rule1Color(0),
      "rule1 deep red (t=1)": rule1Color(1),
      "rule3 calm green (u=0)": rule3Color(0),
      "rule3 urgent red (u=1)": rule3Color(1),
    };
    for (const [name, c] of Object.entries(points)) {
      // eslint-disable-next-line no-console
      console.log(`${name}: bg=${c.background} text=${c.text} ratio=${c.contrastRatio.toFixed(2)}:1`);
      expect(c.contrastRatio).toBeGreaterThanOrEqual(AA);
    }
  });

  it("stop palette endpoints are AA with adaptive text", () => {
    for (const s of [...RULE1_STOPS, ...RULE3_STOPS]) {
      expect(pickText(s.hex).contrastRatio).toBeGreaterThanOrEqual(AA);
    }
  });
});
