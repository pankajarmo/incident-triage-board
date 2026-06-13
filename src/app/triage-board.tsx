"use client";

import { useRef, useState } from "react";
import type { TriageResult } from "@/lib/triage/types";

type Status = "idle" | "loading" | "done" | "error";

const EXAMPLES = [
  "error rate 40% but auto-recovered, no customer impact",
  "p99 latency 1500ms on checkout",
  "upstream returned 503 repeatedly",
  "users say the dashboard feels sluggish today",
];

export default function TriageBoard() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const canSubmit = input.trim().length > 0 && status !== "loading";

  async function triage() {
    if (!canSubmit) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      if (res.status === 401) {
        // Session expired or missing — send the user back to sign in.
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status}).`);
      }
      const data: TriageResult = await res.json();
      setResult(data);
      setStatus("done");
      // Move focus to the card so keyboard/screen-reader users land on the verdict.
      requestAnimationFrame(() => cardRef.current?.focus());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    triage();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter submits; plain Enter stays a newline for multi-line logs.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      triage();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="alert" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Paste an alert or log line
        </label>
        <textarea
          id="alert"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={4}
          placeholder={`e.g. "${EXAMPLES[0]}"`}
          aria-describedby="hint"
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-zinc-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p id="hint" className="text-xs text-zinc-500 dark:text-zinc-400">
          Press <kbd className="rounded border px-1">⌘/Ctrl</kbd> +{" "}
          <kbd className="rounded border px-1">Enter</kbd> to triage.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={status === "loading"}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950"
          >
            {status === "loading" ? "Triaging…" : "Triage"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="min-h-[2rem]">
        {status === "loading" && (
          <p className="text-sm text-zinc-500">Triaging the message…</p>
        )}
        {status === "error" && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {errorMsg}
          </p>
        )}
        {status === "done" && result && result.kind === "verdict" && (
          <ResultCard ref={cardRef} result={result} />
        )}
        {status === "done" && result && result.kind === "neutral" && (
          <p className="text-sm text-zinc-500">Nothing to triage — paste a message above.</p>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  ref,
}: {
  result: Extract<TriageResult, { kind: "verdict" }>;
  ref: React.Ref<HTMLDivElement>;
}) {
  const { color, label, reason, mixedSignal, notes } = result;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rounded-xl p-5 shadow-md outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
      style={{ backgroundColor: color.background, color: color.text }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-bold tracking-tight">{label}</span>
        {mixedSignal && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: color.text, color: color.background }}
          >
            mixed signal
          </span>
        )}
      </div>
      <p className="mt-2 text-sm">{reason}</p>
      {notes?.map((n) => (
        <p key={n} className="mt-2 text-xs opacity-90">
          {n}
        </p>
      ))}
      <p className="mt-4 text-[11px] opacity-80">
        text contrast {color.contrastRatio.toFixed(2)}:1 (WCAG AA ≥ 4.5:1) · bg {color.background}
      </p>
    </div>
  );
}
