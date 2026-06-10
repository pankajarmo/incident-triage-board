"use server";

import { redirect } from "next/navigation";
import { isAllowedEmail, isValidEmail } from "@/lib/auth/domain";
import { getAllowedDomain } from "@/lib/auth/config";
import { createSession, destroySession } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
  /** Echoed back so the field keeps its value after a failed submit. */
  email?: string;
}

export async function login(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const domain = getAllowedDomain();

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address.", email };
  }
  // The whole gate: only the company domain gets a session — nobody else.
  if (!isAllowedEmail(email, domain)) {
    return { error: `Access is limited to @${domain} addresses.`, email };
  }

  await createSession(email.toLowerCase());
  // redirect() throws NEXT_REDIRECT — must stay outside any try/catch.
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
