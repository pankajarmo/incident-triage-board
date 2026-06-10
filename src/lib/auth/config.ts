// Auth configuration sourced from the environment. Kept free of `server-only` and
// `next/headers` so the proxy gate can import it too (the proxy needs the cookie
// name and signing secret to validate sessions before a route renders).

export const SESSION_COOKIE = "triage_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Dev fallback so a fresh clone runs without setup. Production MUST set a real
// secret (rotating it invalidates every existing session).
const DEV_SECRET = "dev-insecure-secret-change-me";

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length > 0) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return DEV_SECRET;
}

/** The single email domain allowed to sign in. Defaults to the spec's company.com. */
export function getAllowedDomain(): string {
  return process.env.ALLOWED_EMAIL_DOMAIN?.trim() || "company.com";
}
