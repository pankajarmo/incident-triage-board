# DECISIONS

Short log of the deliberate calls I made where the spec was fuzzy. The big one is
the conflicting signal case, the rest are the smaller judgement calls that fell out
of building it.

## The ambiguous case: "error rate 40% but auto-recovered, no customer impact"

The number (40%) is eight times over the P1 threshold. The words ("auto-recovered,
no customer impact") say stand down. The spec deliberately doesn't say what to do.

### What I decided

**Severity stays P1. The color is dampened, not removed, and the card carries an
explicit "mixed signal" note.**

Concretely, for that exact message the user sees:

- **Severity: P1** — rule 1 still wins. First-match-wins is preserved; a real
  threshold breach is not downgraded by prose.
- **Color: mid orange-red, not deep red.** Calming language caps the color
  intensity at `STAND_DOWN_CAP = 0.45` (`src/lib/triage/constants.ts`). Without the
  calming phrase, 40% error rate would render at intensity `(40-5)/(50-5) ≈ 0.78`
  (deep red). The cap pulls it back to mid-orange so it reads as "serious, but
  someone says it's contained."
- **A note on the card:** *"Mixed signal — calming language detected
  ("auto-recovered"). Verify before standing down."*

This lives in `classify()` (`src/lib/triage/classify.ts`), via `findStandDown()`
(`src/lib/triage/keywords.ts`).

### Why this, at 3am

The person staring at the board is the one who decides whether to open the dying Mac or not. Our
responsibility is to give them the breach AND the contradiction at one place, and make them do
the thinking and not make the decision for them by hiding one side.

- **Why not downgrade to P2/P3 or suppress it?** Because "auto-recovered" is a
  claim, not a fact. The alert fired. Letting four words of optimistic log text
  silence a genuine 40% error rate is exactly how a flapping incident gets ignored
  until it's a real outage. The math is hard evidence, the supporting sentence is a hint.
- **Why not ignore the supporting text and show deep red?** Because then the operator has to
  re-read the raw text on every card to notice "oh, this one says it recovered." The
  whole point of a triage board is to surface that conflict, not bury it. Solid deep
  red would over-alarm and, over time, train people to distrust the colors.
- **The dampened color + note is the middle path:** it says *"P1 happened, but
  there's a stand-down claim, go verify before you trust it."* That's the honest
  state of the world for that message.

### Guardrails on the stand-down behavior (so it can't be gamed)

The calming cap is intentionally conservative:

- **Negation-aware.** "has **not** recovered" / "**no** longer mitigated" do *not*
  trigger the cap. `findStandDown()` ignores a calming term preceded by a negator
  within ~22 chars, so you can't soften a live P1 by describing what *didn't* happen.
- **Overridden by hard failure keywords.** If a known bad keyword (`OOM`, `panic`,
  `503`, `timeout`, …) co-occurs with the calming phrase, the cap is skipped and the
  card stays full red — a "no customer impact, but OOM" message is not allowed to
  calm itself down. See the `!hasBadKeyword(message)` guard in `classify()`.
- **Caps color only, never severity.** The cap can move deep red → orange. It can
  never turn a P1 into a non-P1.

### What I rejected


1. Downgrade severity when calming words appear. Lets prose override measured fact; an easy way to mute real incidents.
2. Suppress the card entirely ("auto-recovered = fine"). A claim of recovery is not verification, flapping incidents get lost. 
3. Ignore supporting text, always show deep red. Over-alarms, hides the contradiction, erodes trust in the colors.
4. Show two cards (one per signal). Doubles board noise for the exact case where you want less cognitive load.

---

## Smaller deliberate calls

### Rule 1 only fires on an *identified* metric

A bare `40%`, `CPU 40%`, or `memory 1500ms` does **not** trigger P1. Rule 1 only
counts a number when the surrounding clause tells us it's an **error rate** (a `%`
near an error/failure cue) or a **latency** (a time unit near a latency cue). See
`parseMetrics()` (`src/lib/triage/parse.ts`).

**Why:** the spec's rule 1 is "error rate above 5%" and "latency above 1000ms" —
those are specific quantities, not "any number that happens to be big." Treating
`cache hit 95%` or `CPU 40%` as a P1 error rate would be a flood of false P1s. When
the metric is ambiguous, rule 1 abstains and the message flows to rules 2/3 — which
matches "first rule that *matches* wins."

### Strict greater-than at the threshold

`5%` and `1000ms` exactly are **not** P1 (`value <= threshold` returns no hit,
`src/lib/triage/intensity.ts`). The spec says "above 5 percent" / "above 1000 ms," so
the boundary is exclusive.

### Color intensity is a ratio over a saturation ceiling

"Barely over should look different from way over" is implemented as a linear ramp
from the threshold up to a **ceiling** where the card hits max red:
`ERROR_RATE_CEILING = 50%`, `LATENCY_CEILING_MS = 5000`
(`src/lib/triage/constants.ts`). Past the ceiling everything is deep red.

**Why a ceiling:** without one, a `99%` error rate and a `7%` error rate would be
nearly the same color, because the scale would be dominated by theoretical maxima.
Anchoring saturation at "this is clearly catastrophic" (50% errors / 5s latency)
makes the 6%–50% band, where operators actually live use the full visible range.
These two numbers are the most arguable knobs in the app; they're isolated as named
constants on purpose so they're trivial to re-tune.

### Rule 3 (LLM) failure is a visible state, not a silent default

If the model call errors or times out, the card does **not** fall back to "calm
green." It renders a neutral slate **"Undetermined"** card with the note *"Triage
manually automated urgency rating failed."* (`classify()` catch block).

**Why:** silently showing green when we actually have *no* signal is the most
dangerous possible failure mode for a triage tool, it tells an operator "relax"
when the truth is "I don't know." Neutral + "triage manually" is the honest state.
