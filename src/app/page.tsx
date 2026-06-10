import TriageBoard from "./triage-board";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950">
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Incident Triage Board
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Paste a raw alert or log line and get a severity and colour. Threshold breach → P1,
          known bad keyword → P2, otherwise the model rates the urgency.
        </p>
      </div>
      <TriageBoard />
    </main>
  );
}
