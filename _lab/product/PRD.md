# Product requirements document — computer-use automation vertical slice

**Status:** implementation-ready  
**Decision state:** use `ORCHESTRATOR_DEFAULT` gates unless a human explicitly overrides them.  
**Primary sources:** `/workspace/Project.md` §§1–7; `_lab/research/brief_decomposition.md` §§1–7; `_lab/decisions/ADR-001-stack.md` through `ADR-005-taxonomy.md`; `_lab/decisions/open_questions.md` G1–G12.

## Product statement

Build one narrow, real backend automation thread for a synthetic legacy-like member-servicing application. Let an LLM discover a flow by observing and operating the rendered UI, compile the successful trajectory into a typed and reviewable JSON capability, and invoke that capability later through model-free deterministic replay. Enforce policy at the actuator boundary, classify runtime results precisely, preserve sanitized evidence, and support a real same-session human control transfer. [Project.md §§1–3, §5; brief decomposition §§1, 6]

The production path is capability invocation, not open-ended model control:

> The model discovers. The artifact becomes a reusable capability. Deterministic replay is how the AI agent invokes it in production.

[Project.md §2; brief decomposition §1]

## Goals

1. Deliver one end-to-end vertical slice: goal and target → genuine LLM discovery on a live local UI → emitted capability artifact → successful deterministic replay → exceptional replay → same-session escalation and resume → committed sanitized evidence. [Project.md §§3–6; brief decomposition §5]
2. Make the artifact and replay result contracts the center of the design: typed, versioned, reviewable, parameterized, and machine-invocable. [Project.md §§3.2–3.3, §7]
3. Demonstrate all three runtime classes: a legitimate business outcome, a bounded recoverable event, and a hard failure; expose escalation as its own terminal state. [Project.md §3.3; ADR-005]
4. Make every UI action pass through configurable target/action policy, risk handling, lease ownership, and redaction boundaries. [Project.md §§3.4–3.6; ADR-004]
5. Keep one exercised `Surface` seam so the report can credibly explain legacy-web, Electron/desktop, and tenant specialization without building those systems. [Project.md §3.7; ADR-001; open questions G4/G12]
6. Make setup, mock/offline testing, and the grader demo reproducible from documented commands. [Project.md §6; locked stack “Commands graders run”]

## Non-goals

- Do not call a target application API in place of real UI operation. [Project.md §§1–2]
- Do not use an LLM to choose steps during replay, including open-ended recovery. [Project.md §3.3; ADR-002; open questions G11]
- Do not treat a raw model transcript, ephemeral ARIA `ref=eN`, fixed coordinate macro, or generated script as the capability artifact. [Project.md §3.2; ADR-002]
- Do not build a real bank integration, use real credentials/PII, or depend on a ToS-bound public site. [Project.md §§4, 9; ADR-003]
- Do not build queues, clusters, durable workflow infrastructure, a database, a production registry, a polished co-browsing console, or multi-tenant runtime plumbing. [Project.md §§3.6–3.7, §7; open questions G7/G11/G12]
- Do not implement Electron, native desktop input injection, `xa11y`, `nut.js`, or PyAutoGUI in v1. Preserve only the typed adapter/report seam. [Project.md §3.7; ADR-001; open questions G4/G12]
- Do not add MCP, a capability catalog, code generation, confidence/approval workflows, or other stretch work until all core evidence is green. [Project.md §8; open questions G11]
- Do not scaffold a monorepo or substitute packages/frameworks for the locked stack. [ADR-001; locked stack]

## Requirements

Use the IDs below in implementation issues, tests, evidence metadata, and review notes. “Must” is binding. Do not mark a requirement complete from prose alone when it requires grader-visible behavior. [brief decomposition §4]

### §3.1 Goal-driven agent loop

| ID | Requirement | Implementation direction | Proof |
|---|---|---|---|
| CU-31-01 | The `discover` command must accept a natural-language goal and the MemberDesk target/entry point. | Validate the target against policy before navigation. Keep the goal and target in sanitized run metadata. | CLI test plus discovery journal. |
| CU-31-02 | Discovery must run an LLM-driven observe → decide → act loop against the live rendered MemberDesk UI. | Use the official OpenAI Responses API with custom tools; default `DISCOVERY_MODEL` to `gpt-5.6-terra`. Observe with `page.ariaSnapshot({ mode: "ai", boxes: true })`; permit a screenshot when ambiguous. | Genuine live-run evidence with model decisions and UI tool calls. |
| CU-31-03 | The loop must stop on verified goal completion, maximum steps, timeout, or dead-end. | Make every stopping condition explicit and bounded. Journal the reason. Never retry indefinitely. | Unit tests for every stop reason; live log for completion. |
| CU-31-04 | Discovery must click, type, navigate, and read state through the `Surface` actuator rather than a target API. | Implement `WebSurface`; do not make clean DOM/test IDs architectural requirements. Snapshot-local refs may be used only in the current discovery turn. | Playwright smoke plus discovery evidence. |

[Project.md §3.1; brief decomposition §§2 “Section 3.1”, 4; ADR-001; ADR-002]

### §3.2 Structured artifact

| ID | Requirement | Implementation direction | Proof |
|---|---|---|---|
| CU-32-01 | A successful discovery must automatically emit a Zod-validated, serializable JSON capability; an unsuccessful run must not publish an executable capability. | Compile the trajectory journal into the artifact. Keep transcript/journal data separate. | Compiler tests and saved example in `/evidence/`. |
| CU-32-02 | The artifact must contain stable ordered step IDs and typed actions. | Use surface-neutral action vocabulary interpreted by replay; do not serialize arbitrary Playwright code. | Schema tests and human review of sample. |
| CU-32-03 | Every target-bearing step must contain a ranked `SemanticLocator`. | Store role/name, label, or text candidates, frame path, and an optional CSS fallback compiled at record time. Store robustness/rationale metadata. Never persist `ref=eN`; never use coordinates as artifact identity. | Locator resolver tests and artifact inspection. |
| CU-32-04 | The artifact must declare typed invocation inputs and constraints. | Reference runtime values by parameter, annotate sensitivity, and prevent example member identifiers from being copied into steps/logs. | Valid/invalid input tests. |
| CU-32-05 | The artifact must declare typed outputs and extraction rules. | Return only declared, validated, redacted output fields. | Successful replay contract test. |
| CU-32-06 | The artifact must declare observable checkpoints/success conditions. | Do not equate “last action did not throw” with success. | Checkpoint pass/fail tests. |
| CU-32-07 | The artifact must be versioned and reviewable. | Include `schemaVersion`, `capabilityVersion`, capability identity/purpose, input/output contract, policy/risk metadata, steps, expected business outcomes, known recoverables, success condition, and provenance without embedding the model ID as execution identity. | Schema snapshot and sample review. |

[Project.md §3.2; brief decomposition §§2 “Section 3.2”, 4; ADR-002; open questions G8]

### §3.3 Deterministic replay

| ID | Requirement | Implementation direction | Proof |
|---|---|---|---|
| CU-33-01 | `replay` must validate the artifact and inputs before acting, then execute without any LLM decision call. | Keep replay executable with no model key. Use a custom in-process state machine. | No-key replay test and evidence log. |
| CU-33-02 | Replay must resolve ranked semantic locators deterministically, enforce condition-based bounded waits, and verify the intended control/state before acting. | Use role/label/text, frame path, then optional CSS fallback. Do not use ephemeral refs or coordinate-only replay. | Resolver, frame, ambiguity, and wait tests. |
| CU-33-03 | Replay must verify the declared terminal checkpoint before extracting and returning declared typed outputs. | Treat extraction validation failure as a hard failure. | Happy-path replay and negative checkpoint test. |
| CU-33-04 | Replay must return exactly one terminal discriminant: `success`, `business_outcome`, `hard_failure`, or `escalated`. | Implement the ADR-005 union. Do not add `recoverable` as a terminal kind. | Exhaustive result-contract tests. |
| CU-33-05 | A missing synthetic member must return `business_outcome` with a machine-readable `member_not_found` code, not throw or report a crash. | Declare the expected outcome in the capability. | Required not-found replay evidence. |
| CU-33-06 | A known interstitial or transient load must use a predefined bounded recovery and then continue. | Journal recovery events such as `dismissed_dialog` or `retry_wait`; fail when the bound is exhausted. | Controlled fault-injection test/evidence. |
| CU-33-07 | Validation, permission denial, unknown dialog, expired session, failed load, app error, policy denial, timeout, crash, or unmatched state must stop deliberately when not covered by a declared outcome/recovery. | Return a sanitized `hard_failure` with capability/run/step, expected state, observed state summary, error code, and evidence references; escalate when human action is appropriate. Never proceed blindly. | Detector tests plus one hard-failure evidence case. |

[Project.md §3.3; brief decomposition §§2 “Section 3.3”, 4; ADR-002; ADR-005]

### §3.4 Safety and policy guardrails

| ID | Requirement | Implementation direction | Proof |
|---|---|---|---|
| CU-34-01 | Every discovery and replay action must pass an explicit configurable allowlist before execution. | Gate permitted domains/routes and action types at the shared actuator boundary; deny before side effects. | Allowed and denied target/action tests. |
| CU-34-02 | Every action must carry a safe/reversible or risky/irreversible classification. | Permit safe actions; block or escalate risky actions for human control. The MemberDesk flow stops at confirmation and performs no real money movement. | Risk-policy tests and intervention evidence. |
| CU-34-03 | Artifacts, logs, intervention files, screenshots, snapshots, traces, and errors must not persist credentials, tokens, full PII, or raw sensitive values. | Use parameter placeholders and sensitivity metadata. Redact before writing evidence; keep only synthetic test data. | Redaction tests and repository scan. |

[Project.md §3.4; brief decomposition §§2 “Section 3.4”, 4; ADR-003; ADR-004]

### §3.5 Evidence and observability

| ID | Requirement | Implementation direction | Proof |
|---|---|---|---|
| CU-35-01 | Discovery and replay must write correlated structured JSON/JSONL journals. | Include run ID, capability/version, step ID, actor/lease owner, mode, sanitized action, reason/rule, timestamps, outcome, recovery, and evidence references. | Committed discovery/replay logs and schema tests. |
| CU-35-02 | A hard failure or ambiguity must capture at least one sanitized richer signal. | Capture a screenshot; a sanitized DOM/snapshot or trace may supplement it. | Failure evidence file referenced by journal/result. |
| CU-35-03 | Evidence must make genuine discovery, model-free replay, recovery, and human actions distinguishable. | Record provenance and actor without storing secrets, hidden model reasoning, or raw sensitive UI state. | `/evidence/` review. |

[Project.md §3.5; brief decomposition §§2 “Section 3.5”, 4]

### §3.6 Human-in-the-loop escalation and handoff

| ID | Requirement | Implementation direction | Proof |
|---|---|---|---|
| CU-36-01 | Discovery stuck states, unrecoverable/risky replay states, and policy-defined approvals must be able to create an intervention request. | Write a sanitized `intervention.json` carrying request/run/capability/goal IDs, current step, stop reason, current state or screenshot reference, and status. | Escalation test and evidence. |
| CU-36-02 | Escalation must preserve the same live `BrowserContext`; it must not open a fresh session. | Keep the process/context alive while paused. Expose the same session through the minimal operator path. | Context/session identity assertion. |
| CU-36-03 | Session ownership must follow `automation → transitioning_to_human → human → transitioning_to_automation → automation`. | Implement `SessionLease`. Require every actuator call to validate ownership; reject concurrent/wrong-owner actions. | State-machine and actuator-gate tests. |
| CU-36-04 | A human/mock operator must be able to act in the same session, have those actions journaled, and explicitly resume or complete the run. | Implement CLI + JSON operator control and scripted mock actions for CI. A headed window is optional; `browser.bind()` may only be optional transport. | Required pause/manual-action/resume evidence. |
| CU-36-05 | Resume must re-observe and revalidate state before continuing. | Do not assume the human left the UI at the expected state. Preserve one correlated run history across transfer. | Resume valid/invalid-state tests. |

[Project.md §3.6; brief decomposition §§2 “Section 3.6”, 4; ADR-004; open questions G9]

### §3.7 Heterogeneity and scale

| ID | Requirement | Implementation direction | Proof |
|---|---|---|---|
| CU-37-01 | Implement `WebSurface` behind an exercised `Surface` interface. | Keep observe, act, screenshot, state validation, and session identity at this seam. Keep logical artifact actions separate from Playwright bindings. | Interface/adapter tests and architecture review. |
| CU-37-02 | Define typed `ElectronSurface` and `OsDesktopSurface` extension seams without implementing OS input injection. | Explain in `/REPORT.md` how adapter-specific perception/target bindings map to the same logical artifact. Do not add desktop dependencies. | Types plus required report section. |
| CU-37-03 | Keep capability identity vendor/product-level and leave room for bounded tenant/version bindings or overrides. | Do not copy tenant branding/routes/data into the logical flow. Do not build a multi-tenant runtime. Explain compatibility checks, drift detection, override validation, rollout, and re-record criteria in `/REPORT.md`. | Artifact review plus required report section. |

[Project.md §3.7; brief decomposition §§2 “Section 3.7”, 4; ADR-001; open questions G4/G12]

## Artifact must-haves

The capability schema and every published artifact must visibly include all of the following. These are direct acceptance gates from Project.md §3.2, not optional metadata:

1. Ordered steps/actions.
2. A reviewable description of how every target element/control is identified, including robustness reasoning.
3. Typed input parameters supplied per invocation.
4. Typed outputs/data to extract and their shape.
5. An observable checkpoint or success condition.
6. Schema and capability versions.
7. A human-readable and calling-agent-readable capability purpose/contract.

Implement the locked additions required to make those gates operational: stable step IDs; ranked semantic locators; frame paths; optional compiled CSS fallback; sensitivity/risk annotations; expected business outcomes; known recoverables; and provenance. Do not persist raw transcripts, ephemeral ARIA refs, concrete sensitive invocation values, or baked-in discovery model identity as replay behavior. [Project.md §3.2; brief decomposition §2 “Section 3.2”; ADR-002; open questions G8]

## Acceptance tests

| ID | Acceptance test | Requirements covered |
|---|---|---|
| AT-01 | Run the no-key test suite from a clean install. Assert schema validation, stop conditions, policy denials, redaction, result exhaustiveness, lease transitions, wrong-owner rejection, and fake-surface replay. | CU-31-03; CU-32-01–07; CU-33-01, CU-33-04–07; CU-34-01–03; CU-35-01; CU-36-03, CU-36-05 |
| AT-02 | Run one Playwright smoke against local MemberDesk and prove click/type/navigation/read through `WebSurface`, including iframe/frame-path resolution. | CU-31-04; CU-33-02; CU-37-01 |
| AT-03 | With `OPENAI_API_KEY`, run genuine discovery. Assert model-produced custom-tool decisions operate the rendered UI, the checkpoint is met, and a schema-valid capability is emitted from the trajectory. | CU-31-01–04; CU-32-01–07; CU-35-01, CU-35-03 |
| AT-04 | Remove model access and replay the saved artifact with a known member input. Assert semantic locator resolution, checkpoint verification, and `success` with only declared typed outputs. | CU-33-01–04 |
| AT-05 | Replay with the not-found fixture. Assert terminal `business_outcome`, code `member_not_found`, no exception, and no success output fabrication. | CU-33-04–05 |
| AT-06 | Inject the known interstitial/transient fault. Assert one bounded recovery event is journaled, the recovery action passes policy, and replay continues; assert bound exhaustion becomes `hard_failure`. | CU-33-06–07; CU-34-01; CU-35-01 |
| AT-07 | Inject an unknown/app/policy failure. Assert replay stops at the correct step and returns sanitized expected/observed diagnostics plus a screenshot reference. | CU-33-07; CU-34-03; CU-35-02 |
| AT-08 | Trigger a risky/stuck state. Assert an intervention is created, the original context stays live, lease ownership transfers to the operator, automation actions are denied while human-owned, operator action is journaled, resume transfers ownership back, and state is re-observed before continuation. | CU-36-01–05 |
| AT-09 | Inspect the artifact, logs, result files, interventions, screenshots, snapshots, and traces. Assert no API keys, tokens, credentials, full PII, raw sensitive invocation values, or ephemeral `ref=eN` values persist. | CU-32-03–04; CU-34-03; CU-35-01–03 |
| AT-10 | Review `/REPORT.md` under its seven exact headings. Assert it explains the implemented surface boundary, desktop extension, vendor-level reuse/tenant overrides, drift management, safety limits, handoff, and cuts without claiming unbuilt runtime support. | CU-37-01–03; Project.md §§3.7, 6.2 |

## Demo path

Prepare once:

```bash
npm install
npx playwright install chromium
cp .env.example .env   # optional key
npm test               # no key required
```

Run the required grader path:

```bash
npx tsx src/cli/index.ts discover --goal "..." --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-found.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
```

For submitted discovery evidence, run the same `discover` path without `--mock` after setting `OPENAI_API_KEY`; fail closed if the key is absent. Preserve the resulting sanitized discovery journal and compiled capability. The `--mock` path exists for CI/offline reproducibility and must never be presented as the genuine discovery proof. Then demonstrate the known interstitial recovery, one hard failure with a screenshot, and `escalate` → same-session operator action → `resume`. Document the final exact commands in `/README.md`. [Project.md §§4, 6; locked stack “Commands graders run”; open questions G6/G9]

## Cut list

### G11 — stretch

- Build no stretch goal until all core tests and required evidence are green.
- Do not add MCP in v1. The `replay` CLI is the callable contract.
- Do not add capability catalogs, code generation, confidence/approval lifecycle, assisted model fallback, canonicalization demonstrations, or multi-run stability before the core.
- The schema may reserve an unused `tenantOverrides` field only when it is typed, harmless, and does not trigger runtime plumbing.
- If the human later opens stretch scope, add CLI invoke-by-name first; consider Electron only after the core remains green.

[open questions G11; Project.md §8; model council D8]

### G12 — scope

- Implement web now.
- Preserve desktop/Electron only through `Surface` types and `/REPORT.md`.
- Keep the operator presentation stub/minimal while making the lease, same-session action, evidence, and resume behavior real.
- Do not build queues, a multi-tenant runtime, native accessibility/input injection, or `xa11y`.
- Cut polish and breadth, never an entire Project.md §3 capability.

[open questions G12; Project.md §§3.6–3.7, §7; brief decomposition §6; model council D5/D9]

## Locked stack

The following section is copied verbatim from `_lab/decisions/locked_stack.md`; implementation agents must not reinterpret or substitute it.

# Locked stack (orchestrator default after research)

**Status:** ORCHESTRATOR_DEFAULT — human may override G3/G5/G6/G10.  
**Sources:** `tech_stack.md` Stack A, `reviews/reviewer_pass_1.md` MODIFY verdict, `reviews/dx_and_desktop_review.md`, `research/_RESEARCH_COMPLETE.md`.  
**Date:** 2026-08-16.

## Exact intent (packages)

| Layer | Lock | Version intent | Do not |
|-------|------|----------------|--------|
| Language | TypeScript | `typescript` ~5.x, Node ≥20 | Native type-stripping as a design constraint |
| Package manager | npm | commit `package-lock.json` | pnpm/bun unless human says so |
| Layout | single package | `src/` modules below | monorepo |
| LLM | `openai` official SDK | Responses API + custom tools | built-in `type: computer` as the product; `computer-use-preview` |
| Discovery model | env `DISCOVERY_MODEL` | default `gpt-5.6-terra` | bake model into capability artifact |
| Automation | `playwright` + `@playwright/test` | **pin 1.62.1** | `ariaSnapshotJSON()` (1.63 unreleased as of research); Selenium; Puppeteer |
| Observe | `page.ariaSnapshot({ mode: "ai", boxes: true })` | YAML to model | persist `ref=eN` into artifacts |
| Replay locators | Playwright `getByRole` / `getByLabel` / `getByText` + frame path + optional CSS fallback | compiled at record time | coordinate-only replay |
| Orchestration | custom loop + replay state machine | one process | LangGraph, Temporal, Inngest, queues |
| Schema | `zod` | JSON files | protobuf, YAML-canonical |
| Persistence | filesystem | `capabilities/`, `evidence/` | SQLite/Postgres |
| CLI | `commander` + `tsx` | `discover` `replay` `escalate` `resume` | oclif |
| Logs | structured JSON / JSONL | pino optional; start with JSONL writer | OpenTelemetry as primary evidence |
| Tests | `node --test` + one Playwright smoke | FakeSurface fixtures | coverage theater |
| Target | local MemberDesk HTTP fixture | `fixtures/memberdesk/` | real banks; ToS-bound public sites as required path |
| HITL | `SessionLease` + same context | mock operator in tests | headed-window as the only path |
| Desktop | types + REPORT | — | xa11y, nut.js, PyAutoGUI, OS injection |

## Module seams (implement these paths)

```
src/
  surface/          WebSurface implements Surface; electron.ts / desktop.ts stubs
  discovery/        observe → decide → act loop (LLM or mock)
  artifact/         Zod schema, serialize, compile locators
  replay/           interpreter, waits, taxonomy
  policy/           allowlist, risky actions, redaction
  hitl/             lease, intervention request, resume
  evidence/         journal + screenshots writer
  cli/              commander entry
  target/           MemberDesk static/server (or fixtures/)
```

## Commands graders run

```bash
npm install
npx playwright install chromium
cp .env.example .env   # optional key
npm test               # no key required
npx tsx src/cli/index.ts discover --goal "..." --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-found.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
```
