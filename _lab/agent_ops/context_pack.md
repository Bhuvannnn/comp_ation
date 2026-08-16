# Context pack — always load

Short norms for every coding agent turn. Full detail: [`implementation_playbook.md`](./implementation_playbook.md), [`locked_stack.md`](../decisions/locked_stack.md), [`Project.md`](../../Project.md).

---

## What we are building

A **computer-use automation system** for legacy bank UIs: LLM discovers once → **versioned capability artifact** → **deterministic replay** without the model → **HITL** on the same session → **evidence** for graders.

Vertical slice per Project.md §5:

> goal → LLM run → artifact → replay (outputs + errors) → human escalation path → `/evidence/`

---

## Locked stack (do not relitigate)

| Layer | Lock |
|-------|------|
| Language | TypeScript, Node ≥20, npm + `package-lock.json` |
| LLM | OpenAI SDK, Responses API + **custom tools**; `DISCOVERY_MODEL` default `gpt-5.6-terra` |
| Automation | **Playwright 1.62.1** (pinned); `page.ariaSnapshot({ mode: "ai", boxes: true })` |
| Replay locators | `getByRole` / `getByLabel` / `getByText` + frame path + optional CSS fallback |
| Orchestration | Custom in-process loop + replay state machine — **no** LangGraph/Temporal |
| Schema | **Zod** → versioned JSON capabilities |
| Persistence | Filesystem: `capabilities/`, `evidence/` |
| CLI | `commander` + `tsx`: `discover`, `replay`, `escalate`, `resume` |
| Tests | `node --test` + `FakeSurface`; one Playwright smoke |
| Target | **Local MemberDesk** (`fixtures/memberdesk/` or `src/target/`) — synthetic data, fault injection |
| HITL | `SessionLease` on same `BrowserContext`; mock operator OK |
| Desktop | `Surface` stubs only; design in `REPORT.md` |

Source: [`locked_stack.md`](../decisions/locked_stack.md).

---

## Module seams (only write through these)

```
src/surface/     WebSurface + electron/desktop stubs
src/discovery/   observe → decide → act (LLM or --mock)
src/artifact/    schema, compile locators, serialize
src/replay/      interpreter, waits, taxonomy — NO LLM
src/policy/      allowlist, risky actions, redaction
src/hitl/        lease, intervention, resume
src/evidence/    journal, screenshots
src/cli/         commander entry
src/target/      MemberDesk fixture
```

---

## Hard boundaries

| Rule | Why |
|------|-----|
| **Never commit `_lab/`** | Gitignored research; graders read `README.md`, `REPORT.md`, `evidence/`, `src/` |
| **Never persist secrets** | No API keys, tokens, credentials, full PII in artifacts/logs — redact |
| **No LLM in replay** | Production path is deterministic; guard imports and runtime |
| **No `ref=eN` in artifacts** | Ephemeral ARIA refs; compile semantic locators at record time |
| **No coordinate-only replay** | Coords are discovery escape hatch, not artifact identity |
| **No built-in `type: computer`** | Custom tool harness per stack lock |
| **No queues / multi-tenant runtime** | Design in REPORT §4; do not build |

---

## Terminal result kinds (replay contract)

`success` | `business_outcome` | `hard_failure` | `escalated`

Recoverable events (`dismissed_dialog`, `retry_wait`) are **journal-only**, not terminal kinds. ADR-005.

---

## Commands (graders run)

```bash
npm install && npx playwright install chromium
npm test                                    # no API key
npx tsx src/cli/index.ts discover --goal "..." --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json
```

Live discovery requires `OPENAI_API_KEY`; CI must stay green without it.

---

## Submission surfaces (Project.md §6)

| Path | Content |
|------|---------|
| `README.md` | Setup + exact demo commands |
| `REPORT.md` | Seven sections: Architecture, Artifact schema, Determinism & error handling, Heterogeneity & multi-tenant, Escalation & handoff, Safety, Cuts |
| `evidence/` | Discovery artifact + replay logs + at least one error/exception replay |
| `src/` | Production code only |

---

## Read order

1. [`Project.md`](../../Project.md) — brief
2. [`locked_stack.md`](../decisions/locked_stack.md) — stack
3. [`implementation_playbook.md`](./implementation_playbook.md) — current milestone
4. [`eval_plan.md`](./eval_plan.md) — before claiming done
