# Implementation playbook — vertical slice milestones

**Status:** Ready for Phase 2 coding agents  
**Sources:** [`locked_stack.md`](../decisions/locked_stack.md), [`Project.md`](../../Project.md) §5–6, [`agent_native_workflows.md`](../research/agent_native_workflows.md)  
**Date:** 2026-08-16

This playbook turns the locked stack into eight ordered milestones. Each milestone is **thin-but-real** per Project.md §5: every §3 requirement gets a seam, not a polished subset.

**Grader thread (§5):**

> goal → LLM discovery → versioned artifact → deterministic replay (outputs + errors) → HITL same session → evidence in `/evidence/`

**Do not write `src/` from this document alone.** This is the contract coding agents follow after `READY_TO_BUILD.md` handoff.

---

## Agent roles (owner per milestone)

| Role | Typical model family | Owns |
|------|---------------------|------|
| **Surface & target agent** | Composer / GPT | `Surface` adapter, MemberDesk fixture, Playwright smoke |
| **Discovery agent** | GPT / Claude | observe → decide → act loop, LLM harness, mock mode |
| **Artifact agent** | Claude / GPT | Zod schema, locator compiler, serialization |
| **Replay agent** | GPT / Claude | interpreter, waits, ADR-005 taxonomy |
| **Policy agent** | Claude | allowlist, risky actions, redaction |
| **HITL agent** | Claude | `SessionLease`, intervention, resume |
| **Evidence & docs agent** | Composer | `/evidence/`, `README.md`, `REPORT.md` §6 headings |
| **Verifier agent** (readonly) | Grok / different family | Runs eval_plan checks; no feature work |

One coding agent may wear multiple hats; the **owner** column is who signs off the acceptance test.

---

## Milestone 1 — Surface adapter hello-world

**Owner:** Surface & target agent

**Goal:** Prove the `Surface` seam against a live browser and the local MemberDesk fixture. No LLM, no artifact yet.

**Files to touch**

| Path | Action |
|------|--------|
| `package.json`, `package-lock.json` | npm deps: `playwright@1.62.1`, `typescript`, `tsx`, `zod`, `commander` |
| `src/surface/types.ts` | `Surface` interface: observe, act primitives, session handle |
| `src/surface/web.ts` | `WebSurface` — Playwright `BrowserContext` wrapper |
| `src/surface/electron.ts`, `src/surface/desktop.ts` | Typed stubs throwing `NotImplemented` (§3.7 design seam) |
| `src/target/memberdesk/` | Static/server fixture: search → detail → confirmation; synthetic IDs |
| `fixtures/memberdesk/` | Optional frozen HTML snapshots for offline tests |
| `test/surface-smoke.test.ts` | `node --test` against `FakeSurface` or minimal live hook |
| `.env.example` | `OPENAI_API_KEY`, `DISCOVERY_MODEL`, `MEMBERDESK_PORT` — no secrets |

**Acceptance test**

```bash
npm install
npx playwright install chromium
npm test                                    # includes surface smoke
npx tsx src/cli/index.ts surface-smoke      # or equivalent: open MemberDesk, ariaSnapshot once, exit 0
```

Pass when: Chromium launches headless, navigates to MemberDesk, `page.ariaSnapshot({ mode: "ai", boxes: true })` returns YAML, clean exit. No API key required.

**Human gate:** None. Proceed when MemberDesk serves on a documented port and `WebSurface` implements `Surface`.

---

## Milestone 2 — Observe → decide → act discovery with real LLM (one goal)

**Owner:** Discovery agent

**Goal:** One genuine LLM-driven run completes a single MemberDesk goal end-to-end (Project.md §4: discovery must be real). Support `--mock` for CI without a key.

**Files to touch**

| Path | Action |
|------|--------|
| `src/discovery/loop.ts` | Bounded observe → decide → act; max steps / timeout |
| `src/discovery/observe.ts` | ARIA snapshot to model; **do not** persist `ref=eN` into durable storage |
| `src/discovery/tools.ts` | OpenAI Responses API custom tools (not `type: computer`) |
| `src/discovery/mock.ts` | Scripted transcript for `npm test` |
| `src/cli/index.ts` | `discover --goal "..." [--mock]` |
| `src/evidence/journal.ts` | JSONL step log (redaction hooks stub OK) |
| `test/discovery-mock.test.ts` | Mock path completes one canned goal |

**Default goal (locked target):**  
`"Look up member 12345 and read their current savings balance"` (or equivalent MemberDesk flow per ADR-003).

**Acceptance test**

```bash
# CI / no key
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
test -f evidence/discovery/latest/run.jsonl

# Grader evidence (requires OPENAI_API_KEY)
export DISCOVERY_MODEL=gpt-5.6-terra   # default per locked_stack
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance"
```

Pass when: live run exits 0, goal met, `evidence/discovery/<runId>/run.jsonl` shows observe/act steps with timestamps. Mock run passes in `npm test` without key.

**Human gate:** **G6** — confirm `OPENAI_API_KEY` available for the one evidence run; `$2/run spend cap enforced in code.

---

## Milestone 3 — Emit versioned artifact

**Owner:** Artifact agent

**Goal:** Successful discovery compiles to a typed, reviewable capability JSON — not a raw model transcript (Project.md §3.2, G8).

**Files to touch**

| Path | Action |
|------|--------|
| `src/artifact/schema.ts` | Zod: `schemaVersion`, `capabilityVersion`, steps, params, outputs, checkpoint |
| `src/artifact/locator.ts` | `SemanticLocator`: role/label/text + frame path + optional CSS fallback |
| `src/artifact/compile.ts` | Trajectory journal → capability; strip ephemeral refs |
| `src/artifact/serialize.ts` | Write `capabilities/<id>.json` and copy to `evidence/discovery/<runId>/capability.json` |
| `test/artifact-schema.test.ts` | Round-trip parse; reject transcript-only payloads |
| `evidence/sample/capability.json` | Committed sample for replay tests (synthetic, no PII) |

**Acceptance test**

```bash
npx tsx src/cli/index.ts discover --goal "..." --mock
npx tsx -e "import { validateCapability } from './src/artifact/schema.ts'; validateCapability('evidence/discovery/latest/capability.json')"
npm test   # schema + compiler unit tests
```

Pass when: artifact validates, lists ordered steps with compiled locators, declares typed `inputs` / `outputs`, defines checkpoint. `schemaVersion` present. No secrets or full PII in file.

**Human gate:** None unless human overrides **G8** schema shape.

---

## Milestone 4 — Deterministic replay + outputs

**Owner:** Replay agent

**Goal:** Replay runs **without LLM** in the decision loop; returns structured success + typed outputs (Project.md §3.3).

**Files to touch**

| Path | Action |
|------|--------|
| `src/replay/interpreter.ts` | Step executor over `Surface`; no OpenAI import |
| `src/replay/waits.ts` | Load / navigation / element stability |
| `src/replay/checkpoint.ts` | Assert success condition |
| `src/replay/result.ts` | Terminal kinds: `success`, `business_outcome`, `hard_failure`, `escalated` (ADR-005) |
| `src/cli/index.ts` | `replay --artifact <path> --input <json>` |
| `fixtures/replay-happy.json` | Params for happy path |
| `test/replay-happy.test.ts` | `FakeSurface` fixture → `success` + outputs |
| `test/replay-smoke.test.ts` | Optional `@playwright/test` live replay |

**Acceptance test**

```bash
npm test
npx tsx src/cli/index.ts replay \
  --artifact evidence/sample/capability.json \
  --input fixtures/replay-happy.json
test -f evidence/replay/latest/result.json
```

Pass when: exit 0, `result.kind === "success"`, outputs match contract (e.g. balance string), journal proves **no LLM calls** (grep replay log / env guard). Checkpoint verified.

**Human gate:** None.

---

## Milestone 5 — Exceptional-state replay evidence

**Owner:** Replay agent (+ Surface agent for fault switches)

**Goal:** Replay distinguishes business outcomes vs hard failures; at least one committed error-case replay (Project.md §3.3, §6.3).

**Files to touch**

| Path | Action |
|------|--------|
| `src/replay/taxonomy.ts` | Maps observed UI state → `business_outcome` codes |
| `src/target/memberdesk/faults.ts` | Deterministic inject: `not-found`, `permission`, `validation`, `interstitial`, `slow` |
| `fixtures/replay-not-found.json` | Params triggering `member_not_found` (or equivalent) |
| `fixtures/replay-hard-fail.json` | Optional unexpected dialog → `hard_failure` |
| `test/replay-taxonomy.test.ts` | **One `FakeSurface` test per terminal branch** |
| `evidence/replay/not-found/` | Committed result + screenshot/snapshot on failure |

**Acceptance test**

```bash
npm test   # FakeSurface covers success, business_outcome, hard_failure branches
npx tsx src/cli/index.ts replay \
  --artifact evidence/sample/capability.json \
  --input fixtures/replay-not-found.json
# Expect exit 0 with business_outcome OR documented non-zero contract — document in README
```

Pass when: `replay-not-found` yields `business_outcome` (not a crash). Recoverable events (`dismissed_dialog`, `retry_wait`) appear in journal only, not as terminal kind. Richer signal on failure (screenshot or snapshot) under `evidence/replay/`.

**Human gate:** None.

---

## Milestone 6 — Safety allowlist + redaction

**Owner:** Policy agent

**Goal:** Enforce configurable allowlist and redact secrets/PII from artifacts and logs (Project.md §3.4).

**Files to touch**

| Path | Action |
|------|--------|
| `src/policy/allowlist.ts` | Permitted origins/routes; block outbound navigation |
| `src/policy/risky.ts` | Classify actions; block or require HITL for irreversible |
| `src/policy/redact.ts` | Strip API keys, tokens, full account numbers from journal + artifact |
| `src/policy/config.ts` | Load `policy.json` or env defaults |
| `policy.json.example` | Documented allowlist for MemberDesk localhost |
| `test/policy.test.ts` | Disallowed domain blocked; redaction snapshot |
| Wire-in | Discovery + replay call policy before act + before persist |

**Acceptance test**

```bash
npm test
# Disallowed navigation attempt → hard_failure or blocked before act
npx tsx src/cli/index.ts discover --goal "..." --mock
# Inspect: no OPENAI_API_KEY, no raw SSN patterns in evidence/discovery/latest/
```

Pass when: unit tests prove block outside allowlist; redaction removes injected secret fixtures from written JSONL; risky action (e.g. final submit) blocked or escalates per policy.

**Human gate:** None.

---

## Milestone 7 — HITL pause / resume same session

**Owner:** HITL agent

**Goal:** Real control lease on same `BrowserContext`; mock operator for CI (Project.md §3.6, ADR-004).

**Files to touch**

| Path | Action |
|------|--------|
| `src/hitl/lease.ts` | `automation \| transitioning_to_human \| human \| transitioning_to_automation` |
| `src/hitl/intervention.ts` | Write `intervention.json` with context + reason |
| `src/hitl/resume.ts` | Apply operator actions; flip lease; continue loop/replay |
| `src/hitl/mock-operator.ts` | Test double reads fixture, performs scripted clicks |
| `src/cli/index.ts` | `escalate`, `resume` subcommands |
| `src/surface/web.ts` | Gate all acts on lease holder |
| `test/hitl.test.ts` | Pause → mock operator → resume; same `sessionId` |

**Acceptance test**

```bash
npm test   # hitl.test.ts green without display
npx tsx src/cli/index.ts discover --goal "..." --mock --inject interstitial
# Triggers escalate → write intervention.json → resume with fixtures/operator-actions.json
```

Pass when: browser context not closed on escalate; journal records human steps; automation resumes and completes or returns `escalated` terminal kind with session still alive. `page.pause()` not the graded mechanism.

**Human gate:** **G9** locked — mock operator is sufficient; headed demo optional.

---

## Milestone 8 — Evidence pack + REPORT.md + README polish

**Owner:** Evidence & docs agent (Verifier agent readonly review)

**Goal:** Submission surfaces complete per Project.md §6; demo commands copy-paste.

**Files to touch**

| Path | Action |
|------|--------|
| `README.md` | Setup, keys, demo path (discover → replay → error replay) |
| `REPORT.md` | **Seven headings exactly** (§6.2): Architecture, Artifact schema, Determinism & error handling, Heterogeneity & multi-tenant, Escalation & handoff, Safety, Cuts |
| `AGENTS.md` | Commands, seams, never commit `_lab/`, safety norms |
| `evidence/discovery/<runId>/` | Live LLM run: capability + journal + optional screenshot |
| `evidence/replay/happy/` | Success replay log + result |
| `evidence/replay/not-found/` | Business outcome replay |
| `evidence/replay/hitl/` | Optional HITL evidence |
| `.agents/skills/` | Outlined in Phase 2 scaffold — see agent_native_workflows §E.6 |
| `.cursor/rules/*.mdc` | Phase 2 — **outline only here**; do not block M8 on full scaffold |

**Acceptance test**

```bash
# Fresh clone simulation
npm install && npx playwright install chromium
npm test
# README demo block — all commands exit as documented
cat REPORT.md | grep -E '^## [0-9]|^## \*\*|^# '  # seven sections present
test -f evidence/discovery/*/capability.json
test -f evidence/replay/not-found/result.json
```

Pass when: Verifier agent runs [`eval_plan.md`](./eval_plan.md) checklist green; human can follow README without `_lab/` access.

**Human gate:** **Human review** before public push — confirm live discovery evidence is real (not mock), no secrets in git, REPORT cuts are honest.

---

## Cross-milestone rules

1. **Never commit `_lab/`** — gitignored research; norms flow to `AGENTS.md` and rules.
2. **No LLM in replay** — import boundary or runtime guard; eval_plan enforces.
3. **Playwright 1.62.1 pinned** — no `ariaSnapshotJSON()` (1.63+).
4. **Do not persist `ref=eN`** — compile to semantic locators at artifact time ([`locked_stack.md`](../decisions/locked_stack.md)).
5. **Filesystem persistence only** — `capabilities/`, `evidence/`; no SQLite.
6. **Stretch (G11):** none until M8 evidence green.

---

## Phase 2 scaffold (outline — not blocking M1–M3)

Per [`agent_native_workflows.md`](../research/agent_native_workflows.md) §E.6, after M3 or in parallel with M8:

| Artifact | Purpose |
|----------|---------|
| `AGENTS.md` | Cross-tool commands + submission paths |
| `.cursor/rules/00-submission-paths.mdc` | `alwaysApply: true`, short |
| `.cursor/rules/artifact-schema.mdc` | globs: `src/artifact/**`, `evidence/**/*.json` |
| `.cursor/rules/replay-engine.mdc` | globs: `src/replay/**` |
| `.cursor/rules/safety-redaction.mdc` | globs: `src/policy/**` |
| `.cursor/rules/hitl-handoff.mdc` | globs: `src/hitl/**` |
| `.agents/skills/discover-run/SKILL.md` | Workflow: discover → validate → evidence |
| `.agents/skills/replay-run/SKILL.md` | Workflow: replay → taxonomy → evidence |
| `.agents/skills/hitl-handoff/SKILL.md` | escalate / resume |
| `.agents/skills/package-evidence/SKILL.md` | Pre-submission bundle check |
| `.agents/skills/write-report/SKILL.md` | REPORT.md seven sections |

Codex reads `.agents/skills/`; Cursor may mirror under `.cursor/skills/`. Keep rules &lt;100 lines each.

---

## Citations

- Stack lock: [`_lab/decisions/locked_stack.md`](../decisions/locked_stack.md)
- Assignment scope & deliverables: [`Project.md`](../../Project.md) §5–6
- Agent layout: [`_lab/research/agent_native_workflows.md`](../research/agent_native_workflows.md) §E.4–E.6
- Result taxonomy: [`_lab/decisions/ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md)
- HITL lease: [`_lab/decisions/ADR-004-hitl.md`](../decisions/ADR-004-hitl.md)
