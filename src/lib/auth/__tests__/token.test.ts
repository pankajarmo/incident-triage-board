import { describe, it, expect } from "vitest";
import { createToken, verifyToken } from "../token";

const SECRET = "test-secret";

describe("session token", () => {
  it("round-trips a valid payload", () => {
    const exp = Date.now() + 60_000;
    const token = createToken({ email: "alice@company.com", exp }, SECRET);
    expect(verifyToken(token, SECRET)).toEqual({ email: "alice@company.com", exp });
  });

  it("rejects a token signed with a different secret", () => {
    const token = createToken({ email: "a@company.com", exp: Date.now() + 60_000 }, SECRET);
    expect(verifyToken(token, "other-secret")).toBe(null);
  });

  it("rejects a tampered payload", () => {
    const token = createToken({ email: "a@company.com", exp: Date.now() + 60_000 }, SECRET);
    const forged = Buffer.from(
      JSON.stringify({ email: "attacker@evil.com", exp: Date.now() + 60_000 }),
      "utf8",
    ).toString("base64url");
    const tampered = `${forged}.${token.slice(token.indexOf(".") + 1)}`;
    expect(verifyToken(tampered, SECRET)).toBe(null);
  });

  it("rejects an expired token", () => {
    const token = createToken({ email: "a@company.com", exp: Date.now() - 1 }, SECRET);
    expect(verifyToken(token, SECRET)).toBe(null);
  });

  it("rejects missing or malformed tokens", () => {
    expect(verifyToken(undefined, SECRET)).toBe(null);
    expect(verifyToken("", SECRET)).toBe(null);
    expect(verifyToken("no-dot", SECRET)).toBe(null);
    expect(verifyToken("a.b.c", SECRET)).toBe(null);
    expect(verifyToken(".sig", SECRET)).toBe(null);
    expect(verifyToken("body.", SECRET)).toBe(null);
  });
});
