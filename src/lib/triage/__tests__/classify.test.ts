import { describe, it, expect } from "vitest";
import { classify } from "../classify";
import type { RateUrgency } from "../types";

// Deterministic rule-3 stubs.
const calm: RateUrgency = async () => 0.1;
const urgent: RateUrgency = async () => 0.95;
const boom: RateUrgency = async () => {
  throw new Error("model down");
};

async function run(msg: string, rateUrgency?: RateUrgency) {
  return classify(msg, rateUrgency ? { rateUrgency } : undefined);
}

describe("rule 1 — threshold math (identified)", () => {
  it("error rate over threshold → P1", async () => {
    const r = await run("error rate 40% on checkout");
    expect(r.kind).toBe("verdict");
    if (r.kind !== "verdict") return;
    expect(r.rule).toBe(1);
    expect(r).toMatchObject({ severity: "P1" });
  });

  it("latency over threshold → P1", async () => {
    const r = await run("p99 latency 1500ms");
    if (r.kind !== "verdict") throw new Error("expected verdict");
    expect(r.rule).toBe(1);
  });

  it("latency in minutes is normalized → P1", async () => {
    const r = await run("request took 2 min");
    if (r.kind !== "verdict") throw new Error("expected verdict");
    expect(r.rule).toBe(1);
  });

  it("exactly at threshold is NOT P1 (strict >)", async () => {
    const r = await run("error rate 5% steady", calm);
    if (r.kind !== "verdict") throw new Error("expected verdict");
    expect(r.rule).not.toBe(1);
  });

  it("below threshold latency abstains", async () => {
    const r = await run("latency 200ms nominal", calm);
    if (r.kind !== "verdict") throw new Error("expected verdict");
    expect(r.rule).not.toBe(1);
  });

  it("further over the line is more intense", async () => {
    const low = await run("error rate 6% errors");
    const high = await run("error rate 50% errors");
    if (low.kind !== "verdict" || high.kind !== "verdict") throw new Error();
    expect(high.intensity).toBeGreaterThan(low.intensity);
  });

  it("multiple identified metrics take the max", async () => {
    const r = await run("error rate 8% errors, p99 latency 4500ms");
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).toBe(1);
    // latency 4500ms (t≈0.875) should dominate error 8% (t≈0.067)
    expect(r.intensity).toBeGreaterThan(0.5);
  });
});

describe("rule 1 — abstains on ambiguous numbers → falls through", () => {
  it("bare 40% (no error cue) → not P1", async () => {
    const r = await run("battery 40%", calm);
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).not.toBe(1);
  });

  it("CPU 40% → not P1", async () => {
    const r = await run("CPU 40% sustained", calm);
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).not.toBe(1);
  });

  it("bare 1500ms (no latency cue) → not P1", async () => {
    const r = await run("cache TTL 1500ms", calm);
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).not.toBe(1);
  });

  it("error_rate=0.4 (no %) → not P1 (fraction/percent ambiguity)", async () => {
    const r = await run("error_rate=0.4 reported", calm);
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).not.toBe(1);
  });

  it("mixed metrics: only error-anchored % counts", async () => {
    // cache hit 95% must not be read as error rate; error 8% drives a modest P1
    const r = await run("error rate 8% errors, cache hit 95%");
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).toBe(1);
    expect(r.intensity).toBeLessThan(0.2); // driven by 8%, not 95%
  });
});

describe("stand-down (conflict) handling", () => {
  it("calming language caps a P1 to mid-orange + note", async () => {
    const full = await run("error rate 40% errors");
    const capped = await run("error rate 40% but auto-recovered, no customer impact");
    if (full.kind !== "verdict" || capped.kind !== "verdict") throw new Error();
    expect(capped.rule).toBe(1);
    expect(capped.mixedSignal).toBe(true);
    expect(capped.intensity).toBeLessThan(full.intensity);
    expect(capped.intensity).toBeLessThanOrEqual(0.45);
  });

  it("negated calm word does NOT cap (full red)", async () => {
    const r = await run("error rate 40% errors, has not recovered");
    if (r.kind !== "verdict") throw new Error();
    expect(r.mixedSignal).toBeFalsy();
    expect(r.intensity).toBeGreaterThan(0.45);
  });

  it("co-occurring bad keyword vetoes the cap (full red)", async () => {
    const r = await run("error rate 40% errors, panic, auto-recovered");
    if (r.kind !== "verdict") throw new Error();
    expect(r.mixedSignal).toBeFalsy();
    expect(r.intensity).toBeGreaterThan(0.45);
  });
});

describe("rule 2 — keywords", () => {
  it("503 → P2", async () => {
    const r = await run("upstream returned 503");
    if (r.kind !== "verdict") throw new Error();
    expect(r).toMatchObject({ rule: 2, severity: "P2" });
  });

  it("expanded keyword (OOMKilled) → P2", async () => {
    const r = await run("pod OOMKilled again");
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).toBe(2);
  });

  it("bare '500 requests' does NOT trigger (no HTTP anchor)", async () => {
    const r = await run("queued 500 requests", calm);
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).not.toBe(2);
  });

  it("anchored 'HTTP 500' DOES trigger", async () => {
    const r = await run("got HTTP 500 from api");
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).toBe(2);
  });

  it("below-threshold number + keyword → P2", async () => {
    const r = await run("timeout after latency 200ms");
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).toBe(2);
  });

  it("generic word 'error' alone does NOT trigger P2", async () => {
    const r = await run("some error happened somewhere", calm);
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).toBe(3);
  });
});

describe("rule 3 — LLM fallback", () => {
  it("plain wording → rule 3 with urgency", async () => {
    const r = await run("the dashboard looks a little slow today", urgent);
    if (r.kind !== "verdict") throw new Error();
    expect(r.rule).toBe(3);
    if (r.rule !== 3) return;
    expect(r.urgency).toBe("Urgent");
  });

  it("calm wording maps to Calm", async () => {
    const r = await run("everything seems fine, just checking in", calm);
    if (r.kind !== "verdict" || r.rule !== 3) throw new Error();
    expect(r.urgency).toBe("Calm");
  });

  it("LLM failure → Undetermined, never throws", async () => {
    const r = await run("ambiguous message with no signals", boom);
    if (r.kind !== "verdict" || r.rule !== 3) throw new Error();
    expect(r.urgency).toBe("Undetermined");
  });
});

describe("neutral", () => {
  it("empty input → neutral, no LLM call", async () => {
    const r = await run("   ");
    expect(r.kind).toBe("neutral");
  });
});
