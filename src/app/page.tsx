export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-8 text-center font-sans dark:bg-zinc-950">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Incident Triage Board
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Phase 0 — deployment pipeline is live. The triage board UI is coming next.
      </p>
    </main>
  );
}
