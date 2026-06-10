// Stateless session token: a base64url JSON payload signed with HMAC-SHA256.
// Pure (the secret is passed in) so it can be unit-tested and shared by both the
// proxy gate and the server-side session helpers. Uses node:crypto — fine because
// in Next 16 the proxy and route handlers run on the Node.js runtime.
import crypto from "node:crypto";

export interface SessionPayload {
  /** The verified-domain email the user signed in with. */
  email: string;
  /** Expiry as epoch milliseconds. */
  exp: number;
}

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

/** Build a `<payload>.<signature>` token. */
export function createToken(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/**
 * Verify a token's signature and expiry. Returns the payload, or null for any
 * failure (missing, malformed, bad signature, or expired). Never throws.
 */
export function verifyToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body, secret);

  // Constant-time compare; timingSafeEqual requires equal-length buffers.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (now >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
