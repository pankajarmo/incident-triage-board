import { describe, it, expect, vi } from "vitest";

// server-only throws if imported outside a server context; stub it for the unit test.
vi.mock("server-only", () => ({}));

import { parseUrgencyScore } from "../openai-urgency";

describe("parseUrgencyScore", () => {
  it("reads a valid score", () => {
    expect(parseUrgencyScore('{"score": 0.8}')).toBe(0.8);
  });

  it("clamps above 1", () => {
    expect(parseUrgencyScore('{"score": 1.7}')).toBe(1);
  });

  it("clamps below 0", () => {
    expect(parseUrgencyScore('{"score": -0.4}')).toBe(0);
  });

  it("throws on empty content", () => {
    expect(() => parseUrgencyScore("")).toThrow();
    expect(() => parseUrgencyScore(null)).toThrow();
  });

  it("throws on non-JSON", () => {
    expect(() => parseUrgencyScore("not json")).toThrow();
  });

  it("throws when score is missing or non-numeric", () => {
    expect(() => parseUrgencyScore('{"foo": 1}')).toThrow();
    expect(() => parseUrgencyScore('{"score": "high"}')).toThrow();
    expect(() => parseUrgencyScore('{"score": null}')).toThrow();
  });
});
