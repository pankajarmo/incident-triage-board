import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";

// Data Access Layer: the single place server code asks "who is signed in?".
// `cache` dedupes the cookie read within one render pass.

export const getOptionalSession = cache(readSession);

/** Returns the session, or redirects to /login if there isn't a valid one. */
export async function requireSession() {
  const session = await getOptionalSession();
  if (!session) redirect("/login");
  return session;
}
