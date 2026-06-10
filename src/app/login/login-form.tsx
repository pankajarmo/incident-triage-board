"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label
        htmlFor="email"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Work email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        placeholder="you@company.com"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "email-error" : undefined}
        className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      {state.error && (
        <p
          id="email-error"
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
