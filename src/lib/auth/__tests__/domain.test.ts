import { describe, it, expect } from "vitest";
import {
  isAllowedEmail,
  isValidEmail,
  emailDomain,
  normalizeDomain,
} from "../domain";

const DOMAIN = "company.com";

describe("isAllowedEmail — the @company.com gate", () => {
  it("admits an exact-domain address", () => {
    expect(isAllowedEmail("alice@company.com", DOMAIN)).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(isAllowedEmail("  Alice@Company.COM  ", DOMAIN)).toBe(true);
  });

  it("accepts the allowed domain written with a leading @ or padding", () => {
    expect(isAllowedEmail("bob@company.com", " @Company.com ")).toBe(true);
  });

  it("rejects a different domain", () => {
    expect(isAllowedEmail("bob@evil.com", DOMAIN)).toBe(false);
  });

  it("rejects a look-alike domain (no suffix matching)", () => {
    expect(isAllowedEmail("bob@evil-company.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("bob@company.com.evil.com", DOMAIN)).toBe(false);
  });

  it("rejects subdomains — exact match only", () => {
    expect(isAllowedEmail("bob@eng.company.com", DOMAIN)).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isAllowedEmail("", DOMAIN)).toBe(false);
    expect(isAllowedEmail("not-an-email", DOMAIN)).toBe(false);
    expect(isAllowedEmail("@company.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("alice@company", DOMAIN)).toBe(false);
    expect(isAllowedEmail("alice@@company.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("alice company.com", DOMAIN)).toBe(false);
  });
});

describe("helpers", () => {
  it("isValidEmail accepts/rejects sensible shapes", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });

  it("emailDomain extracts the lowercased domain", () => {
    expect(emailDomain("Alice@Company.com")).toBe("company.com");
    expect(emailDomain("no-at-sign")).toBe(null);
  });

  it("normalizeDomain strips @ and whitespace and lowercases", () => {
    expect(normalizeDomain(" @Company.COM ")).toBe("company.com");
  });
});
