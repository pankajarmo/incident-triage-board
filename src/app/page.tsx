import TriageBoard from "./triage-board";
import { requireSession } from "@/lib/auth/dal";
import { logout } from "./login/actions";

export default async function Home() {
  // Authoritative gate: unauthenticated visitors are redirected to /login.
  const session = await requireSession();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950">
      <div className="mx-auto mb-8 flex max-w-2xl items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Incident Triage Board
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Paste a raw alert or log line and get a severity and colour. Threshold breach → P1,
            known bad keyword → P2, otherwise the model rates the urgency.
          </p>
        </div>
        <form action={logout} className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400" title={session.email}>
            {session.email}
          </span>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </div>
      <TriageBoard />
    </main>
  );
}
