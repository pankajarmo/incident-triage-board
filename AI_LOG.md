# AI_LOG

Prompts did the real work, I just had to make claude understand the problem thoroughly and 
add in my understanding along the way if it diverged from the path.

## Tools

- **Claude Code (Anthropic, Opus-class model)** — Totally made with claude code CLI, made my life easier. 
- **OpenAI `gpt-4o-mini`** — not a dev tool, it's rule 3 itself: the live urgency
  scorer (`src/lib/triage/openai-urgency.ts`).

## How I drove it

I built it in phases with claude plan mode, prompt it to correct it's plan with each iteration : 
1. Setup - and choice of framework, described the project claude had the memory of my experience in Next. js.

2. Classifier Logic ( core logic ) - Built the core logic, with my suggestion on how to exaclty match the error prompted with the severity. OpenAI key setup and call on the system prompt.

3. UI - This was mostly driven by claude, suggested the simplest UI and with clean implementation, nothing fancy. Built on top of the Classifier logic.

4. Auth logic - Decided on the custom login logic, as I also wanted to implement this in a custom fashion and learn about new features next 16 offers.


### Prompts that did the heavy lifting

1. My first prompt was to read the given assignment details in plan mode to create a plan of implementation in phases with clear bifurcation of each phase - I deliberately introduced phases so that I am able to read an understand what is being implemented.

2. Reasoning about error-rate vs. severity (50% error rate but low severity → treat just above 5%), I built a prompt around this to build the core logic of the app.


## Where the AI was wrong, and how I caught it


### 1. It wrote `middleware.ts` with a synchronous `cookies()` — wrong for Next 16

The model defaulted to "muscle memory" a root `middleware.ts` and
`const token = cookies().get(...)` used synchronously. Both are wrong for the pinned
version. In this Next, the request gate is **`proxy.ts`** (not `middleware.ts`), and
`cookies()` from `next/headers` is **async** — you must `await cookies()`. Even I was not aware of this,
change as have not used the latest version of Next.

- **How I caught it:** the build/type errors, and then reading the Next versions changes.
- **Fix:** moved the gate to `src/proxy.ts`; every cookie access is `await cookies()`
  (`src/lib/auth/session.ts`). I also stopped trusting the model on any Next API
  surface without it citing the local docs first.

### 2. The domain check was a suffix match — `evil-company.com` would have gotten in

The first auth cut validated emails with the equivalent of
`email.endsWith("@company.com")`. That looks right and passes a naive happy-path test
— but it lets **`attacker@evil-company.com`** straight through, and it also quietly
admits subdomains like `eng.company.com`.

- **How I caught it:** I added adversarial cases to `domain.test.ts` and
  the suffix check failed them — exactly the cases the spec's "nobody else" is about.
- **Fix:** `isAllowedEmail()` now parses the domain after the **last** `@` and
  requires an **exact** equality to the allowed domain
  (`src/lib/auth/domain.ts`).

### 3. Rule 1 fired on any number with a `%` — `CPU 40%` and `cache hit 95%` became P1s

The model's first parser grabbed any percentage and any millisecond number and ran it
through the threshold. So `CPU 40%`, `cache hit 95%`, and `memory 1500ms` all lit up
as P1 error-rate/latency incidents. That's not "error rate above 5%," it's "any big
number," and on a real board it would be a wall of false P1s.

- **How I caught it:** I tested with (`cache hit 95%`, `CPU at 80%`) and they were classified P1, which is not correct.
- **Fix:** rewrote parsing to be **identity-anchored** (`src/lib/triage/parse.ts`): a
  `%` only counts as an error rate if an error/failure cue sits in the same clause; a
  time value only counts as latency near a latency cue; clause boundaries stop a cue
  from leaking across `,`/`;`/`.`. Ambiguous numbers make rule 1 *abstain* so the
  message flows to rules 2/3.

---

## What I leaned on the model for vs. checked myself

- **Trusted with light review:** boilerplate (the contrast/luminance math is textbook
  WCAG, easy to spot-check against known pairs), the gradient stops, the keyword list
  expansion, test scaffolding.
- **Did not trust without a test or the local docs:** anything touching the Next 16
  API surface (corrections #1), anything security-shaped (#2, #4), and the core
  classification logic where a plausible-looking mistake silently produces wrong
  severities (#3). Those are exactly the places a fluent wrong answer is most
  expensive, so each is pinned by a Vitest case.
