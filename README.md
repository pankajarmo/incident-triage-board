# Incident Triage Board

A tiny full-stack incident triage board. Paste a raw alert or log line, hit triage, and a
card appears with a severity and a color that reflects how bad it is.

## Links

- **Live app (Vercel):** https://project-test-pi-ten.vercel.app
- **Source (GitHub):** https://github.com/pankajarmo/incident-triage-board

> Login is gated to `@company.com` email addresses (passwordless, domain-enforced). Anyone on
> the domain can get in; nobody else.

## How severity is decided

Three rules, checked in order — **first match wins, stop at the first match**:

1. **Threshold (P1).** A parsed number crossing a line: error rate > 5% or latency > 1000 ms.
   The card runs on a scale from amber (barely over) up to deep red (way over).
2. **Bad keyword (P2).** One of `timeout`, `503`, `OOM`, `panic` → amber.
3. **LLM urgency.** Otherwise the message goes to the model (server-side), which rates how
   urgent the wording sounds, mapped from green (calm) → amber → red (urgent).

The deliberate call for mixed-signal messages (e.g. "error rate 40% but auto-recovered") lives
in [`DECISIONS.md`](./DECISIONS.md).

## Contrast ratios (WCAG AA, target ≥ 4.5:1 for normal text)

The card text color is chosen adaptively (black or white, whichever reads better on the
background), so it stays readable across the full gradient. The numbers below are **measured**
with the WCAG relative-luminance formula in `src/lib/triage/contrast.ts` (the same code the app
uses), sampled at the extreme colors of each rule's scale:

| Rule | Card state | Background | Text | Measured ratio | AA (4.5:1) |
|------|-----------|-----------|------|---------------:|:----------:|
| Rule 1 | barely over (amber)  | `#f59e0b` | black | **9.78:1**  | ✅ |
| Rule 1 | way over (deep red)  | `#7f1d1d` | white | **10.02:1** | ✅ |
| Rule 3 | calm (green)         | `#16a34a` | black | **6.37:1**  | ✅ |
| Rule 3 | mid (amber)          | `#f59e0b` | black | **9.78:1**  | ✅ |
| Rule 3 | urgent (red)         | `#dc2626` | white | **4.83:1**  | ✅ |
| Rule 2 | keyword (amber)      | `#f59e0b` | black | **9.78:1**  | ✅ |
| Neutral | no match (slate)    | `#475569` | white | **7.58:1**  | ✅ |

The tightest case is the rule-3 urgent red at **4.83:1**, which still clears AA. Across *all*
generated backgrounds the worst case is ~4.58:1 (the crossover point where black and white text
tie), so every card the app can produce clears 4.5:1. Each rendered card also displays its own
measured ratio.

## Accessibility

Fully keyboard-operable: the paste box, the triage button, and the result card are all reachable
and usable via <kbd>Tab</kbd> / <kbd>Enter</kbd> without a mouse.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm test       # run the test suite (vitest)
npm run build  # production build
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | yes (for rule 3) | LLM urgency call. **Server-side only — never sent to the browser.** |
| `SESSION_SECRET` | yes in production | Signs the session cookie (HMAC-SHA256). Generate with `openssl rand -base64 32`. |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini`. |
| `ALLOWED_EMAIL_DOMAIN` | no | Defaults to `company.com`. |

## Project deliverables

- [`DECISIONS.md`](./DECISIONS.md) — the ambiguous mixed-signal case and the call I made.
- [`AI_LOG.md`](./AI_LOG.md) — tools, the prompts that did the heavy lifting, and where the AI was wrong.
- [`REVIEW.md`](./REVIEW.md) — code review of the planted-bug Python module.

## Tech

Next.js 16 (App Router), TypeScript, server-side OpenAI call, deployed on Vercel.
