# Tickets — do these in order in local Cursor

Human confirmed all recommended approaches (2026-08-16).

**Rule:** One ticket per chat. Finish tests. Stop. Next chat: “Do the next open ticket.”

Status: `[ ]` todo · `[x]` done · `[~]` scaffold exists, still needs real work

---

## T0 — Get the repo running on your machine

**You do this (not the agent).**

1. GitHub Desktop: Fetch → switch to `cursor/full-lab-and-scaffold-d23a`
2. In a terminal in the repo:

```bash
npm install
npm test
npm run typecheck
```

3. Optional mock demo (no API key):

```bash
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
```

**Done when:** `npm test` is green.

---

## T1 — Real AI discovery evidence (you + agent)

**You:** `cp .env.example .env` and paste `OPENAI_API_KEY`. Never commit `.env`.

**Agent prompt:**

> Do ticket T1 in `_lab/agent_ops/TICKETS.md`. Install Chromium if needed. Run live discover with `--live-browser` for goal “Look up member 12345 and read their current savings balance”. Copy redacted journals into `evidence/` in a way README can point at. Do not commit `.env`. Run `npm test` after.

**Done when:** a real (not `--mock`) `run.jsonl` exists and has model tool calls.

---

## T2 — Compile the artifact from the journal, not a handwritten template

**[~] today:** `compile.ts` always emits the same canned capability.

**Agent prompt:**

> Do ticket T2. Discovery must write a journal, then `compile.ts` must turn *that* journal into capability JSON (semantic locators, no `ref=eN`). Keep Zod validation. Add/extend tests. `npm test` must pass.

---

## T3 — Replay against the real browser (not only FakeSurface)

**[~] today:** CLI replay defaults to the in-memory fake page.

**Agent prompt:**

> Do ticket T3. `replay --live-browser` against MemberDesk + Playwright must succeed for `fixtures/replay-happy.json` and return `business_outcome` for `fixtures/replay-not-found.json`. Keep FakeSurface tests. `npm test` must pass.

---

## T4 — Hard-failure replay evidence

**[~] today:** tests cover success, not-found, permission, interstitial. Need a clear `hard_failure` demo.

**Agent prompt:**

> Do ticket T4. Add a deterministic unexpected-state path and a replay that returns `hard_failure` with step + expected + observed. Journal a screenshot or snapshot. Add a FakeSurface test. `npm test` must pass.

---

## T5 — Fill test gaps from the eval plan

**Agent prompt:**

> Do ticket T5. Read `_lab/agent_ops/eval_plan.md`. Add any missing tests it names (`discovery-mock`, `hard_failure`/`escalated` terminals, import guard that `src/replay` does not import openai). `npm test` and `npm run typecheck` must pass.

---

## T6 — Review pass (different model)

**You:** new chat, pick a **different** model than T2–T5 used (e.g. implement with Composer/GPT, review with Grok or Claude).

**Agent prompt:**

> Review-only ticket T6. Do not add features. Read Project.md §3 and §7, then `src/`, `REPORT.md`, `evidence/`. List bugs and brief mismatches. Fix only clear correctness/safety bugs. Re-run `npm test`.

---

## T7 — Polish README + REPORT

**Agent prompt:**

> Do ticket T7 using skill write-report. REPORT.md must keep the seven headings from Project.md §6. README demo commands must match what actually runs. Honest about mock vs live evidence.

---

## T8 — Package evidence / submission check

**Agent prompt:**

> Do ticket T8 using skill package-evidence. Confirm no secrets in git, `_lab/` not required to run the demo, live discovery evidence present if a key was used. Print a remaining-gaps list. Do not rewrite architecture.

---

## How to say “next”

In a **new** Agent chat on this repo:

```
Read AGENTS.md and _lab/agent_ops/TICKETS.md.
Do the first ticket that is not [x].
Only that ticket. Run npm test. Stop and tell me what to check.
```

After it finishes, skim the diff, then either:

- “Mark T# done in TICKETS.md and stop”, or
- new chat: “Review the T# diff, don’t expand scope.”
