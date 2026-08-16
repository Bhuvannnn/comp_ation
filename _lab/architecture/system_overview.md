# Architecture — system overview (boxes and seams)

**Status:** implementation contract for coding agents. Derived from locked decisions; not a re-litigation of them.
**Locked inputs:** [`locked_stack.md`](../decisions/locked_stack.md), [`ADR-001-stack.md`](../decisions/ADR-001-stack.md), [`ADR-002-perception.md`](../decisions/ADR-002-perception.md), [`ADR-003-target.md`](../decisions/ADR-003-target.md), [`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md), [`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md), [`PRD.md`](../product/PRD.md).
**Research cited:** [`tech_stack.md`](../research/tech_stack.md) §§6–12, [`frontier_computer_use.md`](../research/frontier_computer_use.md) §B.6–B.8, [`_hitl_safety.md`](../research/_hitl_safety.md) §§1, 4, 7, [`alternatives_matrix.md`](../research/alternatives_matrix.md) A, [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) Parts I–III, [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md), [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §9, [`non_viable.md`](../research/non_viable.md).
**Date:** 2026-08-16.

> Do not write `src/` code from this document. It defines boxes, seams, interfaces, and prohibitions. Milestone sequencing lives in [`implementation_playbook.md`](../agent_ops/implementation_playbook.md).

---

## 1. One-paragraph shape

One Node process, one Chromium `BrowserContext`, one filesystem. Two engines share that context and one actuator boundary: a **discovery engine** (LLM in the loop, writes a journal) and a **replay engine** (no LLM anywhere in its import graph, reads a compiled capability). Between them sits a **compiler** that turns a successful discovery trajectory into a typed, versioned capability artifact. Around both sits a **policy chokepoint** every action passes through, an **evidence writer** every persisted byte passes through, and a **session lease** every actuator call checks. The `Surface` interface is the only place that knows what a browser is.

---

## 2. Box diagram

```
                              ┌───────────────────────────────────────────────┐
   npx tsx src/cli/index.ts   │  CLI  (commander)   src/cli/                   │
   discover | replay |        │  parses args → builds RunContext → picks engine│
   escalate | resume |        └───────────────┬───────────────────────────────┘
   inspect                                    │
                    ┌────────────────────────┴─────────────────────────┐
                    │                                                   │
      ┌─────────────▼──────────────┐                    ┌───────────────▼───────────────┐
      │ DISCOVERY ENGINE           │                    │ REPLAY ENGINE                 │
      │ src/discovery/             │                    │ src/replay/                   │
      │  loop.ts observe.ts        │                    │  interpreter.ts resolve.ts    │
      │  decide.ts tools.ts mock.ts│                    │  waits.ts checkpoint.ts       │
      │  graph.ts                  │                    │  taxonomy.ts result.ts graph.ts│
      │  ── may import `openai` ── │                    │  ── MUST NOT import `openai` ─│
      └────────┬──────────┬────────┘                    └─────────┬─────────────────────┘
               │          │ trajectory journal                    │
               │          ▼                                       │
               │  ┌──────────────────────────┐                    │
               │  │ COMPILER  src/artifact/  │                    │
               │  │ compile.ts locator.ts    │──── capability ───►│
               │  │ schema.ts contract.ts    │     JSON (Zod)     │
               │  │ overlay.ts migrate.ts    │◄─── overlay JSON ──┤
               │  └──────────────────────────┘                    │
               │                                                  │
               └──────────────┬───────────────────────────────────┘
                              │  every action request
                     ┌────────▼─────────┐        ┌──────────────────────────┐
                     │ POLICY           │        │ HITL                     │
                     │ src/policy/      │        │ src/hitl/                │
                     │ engine.ts        │◄──────►│ lease.ts intervention.ts │
                     │ allowlist.ts     │  risky │ resume.ts mock-operator  │
                     │ risky.ts redact.ts│  →HITL│                          │
                     └────────┬─────────┘        └───────────┬──────────────┘
                              │ allow                        │ lease check
                     ┌────────▼──────────────────────────────▼──────────────┐
                     │ SURFACE  src/surface/                                 │
                     │ types.ts (interface) · web.ts (WebSurface, Playwright)│
                     │ fake.ts (tests) · electron.ts / desktop.ts (stubs)    │
                     └────────┬──────────────────────────────────────────────┘
                              │ CDP / Playwright
                     ┌────────▼──────────────┐        ┌──────────────────────────┐
                     │ TARGET  src/target/   │        │ EVIDENCE  src/evidence/  │
                     │ MemberDesk HTTP fixture│───────►│ journal.ts screenshot.ts │
                     │ faults.ts (injection) │ signals│ manifest.ts              │
                     └───────────────────────┘        └──────────────────────────┘
                                                        writes only via redact()
```

---

## 3. The eight boxes, with ownership

| # | Box | Path | Owns | Explicitly does not own |
|---|-----|------|------|-------------------------|
| 1 | **CLI** | `src/cli/` | Argument parsing, `RunContext` construction, exit codes, stdout rendering | Any UI logic, any Playwright call, any policy decision |
| 2 | **Surface** | `src/surface/` | Perceive + act + control-transfer primitives for one surface family; frame walking; locator resolution against a live page | Goal reasoning, step ordering, outcome classification, evidence formatting |
| 3 | **Discovery engine** | `src/discovery/` | Bounded observe → decide → act loop; LLM tool-call harness; mock transcript path; trajectory journal emission | Writing the capability file (that is the compiler), acting without policy + lease approval |
| 4 | **Compiler / artifact** | `src/artifact/` | Zod schema; trajectory → capability compilation; locator ranking + promotion; `contractHash`; JSON Schema derivation; overlays; schema migrations | Executing anything; importing Playwright; importing `openai` |
| 5 | **Replay engine** | `src/replay/` | Deterministic interpretation of a capability; waits; checkpoints; result taxonomy; drift detection | Deciding *what* the flow is; any model call; any locator invention |
| 6 | **Policy** | `src/policy/` | `assertAllowed` chokepoint; allowlist; risk classification; redaction rules | Deciding when to escalate (it *reports* `escalate`; HITL executes it) |
| 7 | **HITL** | `src/hitl/` | `SessionLease` state machine; intervention request write/read; operator channel; resume + re-observation trigger | Closing the browser, acting on behalf of the human, judging checkpoints |
| 8 | **Evidence** | `src/evidence/` | JSONL journal, screenshots, snapshots, `result.json`, run manifest; retention and layout | Deciding outcomes; it records what it is told, after redaction |

Plus the **target** (`src/target/memberdesk/`), which is a fixture, not a component of the system under test — see [`ADR-003-target.md`](../decisions/ADR-003-target.md).

`src/graph/` is a **documented addition** to the eight seams in [`locked_stack.md`](../decisions/locked_stack.md): three files (`machine.ts`, `nodes.ts`, `state.ts`) holding the shared reducer that both engines drive. It adds no dependency and no framework — see [`agent_graph.md`](./agent_graph.md).

### 3.1 Reconciliation with the build playbook

[`implementation_playbook.md`](../agent_ops/implementation_playbook.md) was written before this set and names some files differently. **These architecture docs are authoritative for file layout**; the playbook remains authoritative for milestone order. The differences are decompositions, not disagreements:

| Playbook | Here | Relationship |
|---|---|---|
| `src/policy/allowlist.ts`, `risky.ts`, `config.ts` | `src/policy/engine.ts` | `engine.ts` exports the single `assertAllowed` chokepoint and composes the other three as internals; the split is fine, the second entry point is not |
| `src/policy/redact.ts` | `src/policy/redact.ts` (rules) + `src/evidence/journal.ts` (application) | rules stay in policy, the write-side chokepoint is in evidence ([`safety_and_policy.md`](./safety_and_policy.md) §5) |
| `src/discovery/loop.ts` | `src/discovery/graph.ts` | renamed: the driver is `src/graph/machine.ts`, so what remains is the edge table |
| `src/replay/checkpoint.ts`, `taxonomy.ts` | `src/replay/result.ts` | checkpoint evaluation and outcome mapping may stay in their own files; `result.ts` owns the envelope and the terminal union |
| — | `src/replay/resolve.ts`, `src/artifact/{contract,overlay,migrate}.ts`, `src/surface/fake.ts`, `src/graph/**` | additive; no playbook equivalent existed |

`src/discovery/{observe,tools,mock}.ts` and `src/hitl/{resume,mock-operator}.ts` are unchanged from the playbook.

---

## 4. Seams (the interfaces that matter)

A seam is load-bearing when swapping one side does not force edits on the other. There are exactly five.

### Seam A — `Surface` (perceive / act / transfer control)

`src/surface/types.ts`. The only seam that knows what a browser is. Full definition and the desktop/Electron extension argument live in [`heterogeneity_multitenant.md`](./heterogeneity_multitenant.md) §2.

```ts
export interface Surface {
  readonly kind: SurfaceKind;              // "web" | "electron" | "os_desktop"
  readonly sessionId: string;              // stable for the life of the session; asserted across HITL

  observe(opts?: ObserveOptions): Promise<Observation>;
  act(request: ActionRequest): Promise<ActionResult>;   // gated: policy + lease, see §5
  resolve(target: TargetSpec): Promise<Resolution>;     // locator union → 0..n live handles
  capture(kind: "screenshot" | "snapshot"): Promise<CaptureRef>;
  controlTransfer: ControlTransfer;        // pauseActuation / describeSession / resumeActuation
  close(): Promise<void>;                  // never called by escalation paths (ADR-004)
}
```

**Rule:** the replay engine and the discovery engine both program against `Surface`. Neither imports `playwright`. `FakeSurface` (`src/surface/fake.ts`) is a first-class implementation used by the taxonomy tests — [`tech_stack.md`](../research/tech_stack.md) §10.2 calls that suite the highest-value tests in the project.

### Seam B — the capability artifact (compiler → replay)

A JSON file validated by Zod. It is the *only* input replay accepts. No transcripts, no cached selectors, no generated scripts. Full schema in [`artifact_schema.md`](./artifact_schema.md).

**Rule:** discovery writes a journal; the compiler writes the artifact; replay reads the artifact. There is no path where replay reads the journal. Cited: [`alternatives_matrix.md`](../research/alternatives_matrix.md) G8; [`non_viable.md`](../research/non_viable.md) #14.

### Seam C — the policy decision (`assertAllowed`)

`src/policy/engine.ts`. One function, called by the actuator before every dispatch on both paths.

```ts
export type PolicyDecision =
  | { verdict: "allow"; decisionId: string; ruleId: string }
  | { verdict: "deny";  decisionId: string; ruleId: string; code: PolicyDenyCode; reason: string }
  | { verdict: "escalate"; decisionId: string; ruleId: string; risk: RiskClass; reason: string };

export function assertAllowed(action: ActionRequest, ctx: PolicyContext): PolicyDecision;
```

**Rule:** the enforcement point is provably total because it lives inside `WebSurface.act()`, not at call sites. Details in [`safety_and_policy.md`](./safety_and_policy.md).

### Seam D — the session lease (who may issue input)

`src/hitl/lease.ts`. A four-state enum plus a guard, per [`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md) and [`_hitl_safety.md`](../research/_hitl_safety.md) §7.

```ts
export type LeaseOwner = "automation" | "transitioning_to_human" | "human" | "transitioning_to_automation";
export interface SessionLease {
  owner(): LeaseOwner;
  assertAutomationMayAct(): void;        // throws LeaseViolation unless owner === "automation"
  request(to: LeaseOwner, reason: TransitionReason): LeaseTransition;  // appended to journal
}
```

**Rule:** ownership is enforced, not documented. Every `act()` calls `assertAutomationMayAct()` first. Details in [`hitl_control_transfer.md`](./hitl_control_transfer.md).

### Seam E — the evidence sink (redaction chokepoint)

`src/evidence/journal.ts`. Everything persisted — journal lines, artifacts, results, intervention files, screenshots, snapshots — passes `redact()` first.

```ts
export interface EvidenceSink {
  event(e: JournalEvent): void;                       // redacted, then appended as one JSONL line
  attach(kind: AttachmentKind, bytes: Buffer, meta: AttachmentMeta): CaptureRef; // redacted before write
  finalize(result: ReplayResult | DiscoveryResult): void;
}
```

**Rule:** no module writes to `evidence/` with `fs` directly. Grep-checkable invariant; see [`eval_plan.md`](../agent_ops/eval_plan.md).

---

## 5. Call order for a single action (both engines)

This ordering is normative. Any implementation that reorders it is wrong.

```
1. engine proposes       ActionRequest { intent, target: TargetSpec, kind, valueRef, risk }
2. lease.assertAutomationMayAct()      → LeaseViolation ⇒ hard_failure (never silently queued)
3. policy.assertAllowed(action, ctx)   → deny ⇒ hard_failure | escalate ⇒ HITL | allow ⇒ continue
4. surface.resolve(target)             → 0 matches ⇒ recover/outcome path; >1 ⇒ ambiguity (hard_failure)
5. surface.act(resolved)               → Playwright action with an explicit, bounded, state-based wait
6. checkpoint evaluation               → success is *asserted*, never inferred from "no exception"
7. evidence.event(...)                 → redacted journal line with decisionId + actor + outcome
```

Steps 2 and 3 are inside `WebSurface.act()` so no caller can skip them. Step 6 is the caller's job (interpreter or discovery loop) because only the caller knows which checkpoint applies.

---

## 6. Data flow — the three runs a grader executes

### Discovery (LLM in the loop, `--mock` for CI)

```
goal + target URL
  → policy: entrypoint allowed?
  → Surface.observe()  ariaSnapshot({mode:"ai", boxes:true})  [ADR-002]
  → decide(): OpenAI Responses API, custom tools, model returns {intent, ref, semantic descriptor, rationale}
  → policy + lease + act
  → checkpoint / stop condition
  → journal (JSONL, redacted, refs allowed here and nowhere else)
  → compiler: journal → capability.json  (refs stripped, locators promoted, contractHash computed)
```

### Replay (no LLM, no key)

```
capability.json + input params (+ optional overlay)
  → schema validate, schemaVersion gate, contractHash echo
  → input validation against declared params
  → fingerprint check → drift event (not a crash)
  → per step: resolve → policy → act → wait → checkpoint → classify
  → terminal: success | business_outcome | hard_failure | escalated   [ADR-005]
  → result.json + journal + failure evidence
```

### Escalation and resume (same session)

```
trigger (risky action | unknown state | budget exhausted | policy escalate)
  → lease: automation → transitioning_to_human
  → write intervention.json (redacted, carries capability/goal/step/state/reason)
  → automation stops issuing input; BrowserContext stays open  [ADR-004]
  → operator (CLI or scripted mock) acts in the same session; actions journaled by type/target, never by value
  → resume: lease → transitioning_to_automation → re-observe → re-verify checkpoint
  → continue, or terminal `escalated` with the session still alive
```

---

## 7. Dependency rules (enforceable, not stylistic)

| Rule | Enforced by |
|---|---|
| `src/replay/**` must not import `openai`, and must not transitively reach it | import-graph test in `test/boundaries.test.ts`; also a runtime guard that fails replay if a model client is constructed |
| `src/artifact/**` must not import `playwright` or `openai` | same boundary test — the schema must be usable in a browserless, keyless context |
| `src/discovery/**` and `src/replay/**` must not import `playwright` | they hold `Surface`, not a `Page` |
| Only `src/surface/web.ts` imports `playwright` | grep check |
| Only `src/evidence/**` writes under `evidence/`; only `src/artifact/serialize.ts` writes under `capabilities/` | grep check for `fs.write*` outside those modules |
| `src/policy/**` imports nothing from `src/discovery/**` or `src/replay/**` | policy is a leaf; both engines depend on it, never the reverse |
| No module imports `src/surface/fake.ts` outside `test/**` | grep check |

These rules are what make "the model is absent from replay" a *structural* property rather than an assertion — the point [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2 makes against frameworks that need a startup assertion to prove the same thing.

---

## 8. Process, concurrency, and lifetime

- **One process.** Custom loop plus replay state machine; no queue, no worker, no durable engine ([`ADR-001-stack.md`](../decisions/ADR-001-stack.md); [`tech_stack.md`](../research/tech_stack.md) §6.1; G7).
- **One `BrowserContext` per run.** Created by `WebSurface.open()`, closed only by normal termination — never by an escalation path.
- **Single actuator.** No concurrency inside a run. The lease is the mutual-exclusion mechanism between automation and human, not a thread lock.
- **The live session dies with the process.** This is a stated limitation, and it is exactly why a durable checkpointer buys nothing here ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2). If the process dies mid-escalation, the run is `hard_failure` on restart, and `intervention.json` remains on disk as the record.
- **Headless by default, headed opt-in.** `--headed` is a demo aid. The graded HITL path must work headless with a scripted operator ([`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §9.1).

---

## 9. On-disk layout (the deliverable is a directory)

```
capabilities/
  <capabilityId>/
    v<capabilityVersion>.json              # base artifact (pooled across tenants)
    overlays/
      <appFamily>__<variant>__<tenantId>.json   # separate, separately approved (never a silent merge)
policy.json                                 # committed, typed, reviewed
fixtures/
  memberdesk/                               # frozen HTML snapshots for offline tests
  replay-found.json  replay-not-found.json  # invocation inputs
  operator-actions.json                     # scripted mock operator
evidence/
  README.md                                 # 10-line index of what each run proves
  discovery/<runId>/   journal.jsonl  capability.json  snapshots/  screenshots/  result.json
  replay/<runId>/      journal.jsonl  result.json  screenshots/  trace.zip (on failure)
  hitl/<runId>/        intervention.json  lease-transitions.jsonl  operator-actions.jsonl
```

Rationale for filesystem over a database: the grader browses the deliverable ([`tech_stack.md`](../research/tech_stack.md) §8.1). `CapabilityStore` is an interface with a filesystem implementation so a registry is a swap, not a redesign.

---

## 10. Invariants (violating any one is a defect, regardless of green tests)

1. Replay makes no model call and holds no model client. ([`Project.md`](../../Project.md) §3.3)
2. No ephemeral ARIA `ref=eN` and no coordinate ever appears in a capability artifact as an executable target. Refs live in the discovery journal only. ([`ADR-002-perception.md`](../decisions/ADR-002-perception.md); [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §3)
3. No fixed sleep is a synchronisation primitive. Every wait is a state condition with a bounded timeout producing a typed timeout outcome. ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A4/KC-7)
4. No step's success is inferred from the absence of an exception. ([`Project.md`](../../Project.md) §10 "Checkpoint")
5. Escalation never closes or re-creates the browser context. ([`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md))
6. `recovered` is never a terminal result kind. ([`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md); [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4.1)
7. Every persisted byte passes `redact()`. ([`_hitl_safety.md`](../research/_hitl_safety.md) §9)
8. Every action passes `assertAllowed` and `assertAutomationMayAct` before dispatch, on both paths. ([`Project.md`](../../Project.md) §3.4; [`_hitl_safety.md`](../research/_hitl_safety.md) §7)
9. A tenant overlay is a separate reviewed file applied explicitly, never an inline merge into the base artifact. ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 5)
10. The artifact declares its caller-visible result set once, at capability level; steps reference codes rather than inventing them. ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 3)

---

## 11. Do / don't for the coding agent

**Do**

- Program the engines against `Surface`, and write taxonomy tests against `FakeSurface` before touching a browser.
- Put policy and lease checks inside the actuator, so they cannot be forgotten at a call site.
- Keep `contractHash`, provenance, approval, and versions **synthesised in code** — the model proposes a flat step list, never its own provenance ([`tech_stack.md`](../research/tech_stack.md) §7.2).
- Name test cases after taxonomy branches so the file listing reads as a specification.
- Write the `evidence/README.md` index as you generate runs, not at the end.

**Don't**

- Don't add LangGraph, Temporal, a queue, OPA/Rego, SQLite, or a second process. Each is a named reject with a recorded reason (G7; [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2; [`tech_stack.md`](../research/tech_stack.md) §§6.3–6.5).
- Don't let `Page`, `Locator`, or `Frame` types leak out of `src/surface/web.ts` into engine signatures.
- Don't implement `ElectronSurface` or `OsDesktopSurface` beyond typed stubs that throw `NotImplemented` (G4/G12).
- Don't build a capability catalog, MCP server, codegen, or approval workflow before all core evidence is green (G11).
- Don't use `page.pause()` as the handoff mechanism; it is a demo aid ([`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md)).
- Don't treat `browser.bind()` as the control model. It is optional attachment transport, allowed only after a smoke test, bound to loopback ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §1).

---

## 12. Where each `Project.md` requirement lands

| Brief | Boxes | Doc |
|---|---|---|
| §3.1 goal-driven loop | Discovery, Surface, Policy | [`agent_graph.md`](./agent_graph.md) |
| §3.2 structured artifact | Compiler | [`artifact_schema.md`](./artifact_schema.md) |
| §3.3 deterministic replay + taxonomy | Replay | [`replay_and_errors.md`](./replay_and_errors.md) |
| §3.4 safety | Policy, Evidence | [`safety_and_policy.md`](./safety_and_policy.md) |
| §3.5 evidence | Evidence | [`replay_and_errors.md`](./replay_and_errors.md) §8, [`safety_and_policy.md`](./safety_and_policy.md) §6 |
| §3.6 HITL | HITL, Surface, Lease | [`hitl_control_transfer.md`](./hitl_control_transfer.md) |
| §3.7 heterogeneity + multi-tenant | Surface seam, overlay files | [`heterogeneity_multitenant.md`](./heterogeneity_multitenant.md) |
