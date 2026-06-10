import "server-only";
import { cookies } from "next/headers";
import { createToken, verifyToken, type SessionPayload } from "./token";
import { SESSION_COOKIE, SESSION_TTL_MS, getSessionSecret } from "./config";

// Server-only session helpers: turn a verified email into a signed HttpOnly cookie
// and back. The signing secret never leaves the server, and the cookie is not
// readable by client JavaScript.

export async function createSession(email: string): Promise<void> {
  const exp = Date.now() + SESSION_TTL_MS;
  const token = createToken({ email, exp }, getSessionSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifyToken(token, getSessionSecret());
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
