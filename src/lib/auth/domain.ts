// Pure email-domain gating — the heart of the "@company.com only" access rule.
// No imports, no I/O: trivially unit-testable and identical on server, proxy, and tests.

/** Strip surrounding whitespace, lowercase, and drop a leading "@" from a domain. */
export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@/, "");
}

// Conservative email shape: a non-empty local part, an "@", and a dotted domain.
// We are deliberately strict — "nobody else" means we reject anything malformed.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** The domain portion (lowercased) of an email, or null if there is no "@". */
export function emailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return null;
  return trimmed.slice(at + 1);
}

/**
 * True iff `email` is a well-formed address whose domain is EXACTLY `allowedDomain`.
 * Exact match (not suffix) is intentional: `bob@evil-company.com` and the subdomain
 * `bob@eng.company.com` are both rejected, so only the company domain gets in.
 */
export function isAllowedEmail(email: string, allowedDomain: string): boolean {
  if (!isValidEmail(email)) return false;
  const domain = emailDomain(email);
  if (!domain) return false;
  return domain === normalizeDomain(allowedDomain);
}
