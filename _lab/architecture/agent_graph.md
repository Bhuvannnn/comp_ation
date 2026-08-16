# Architecture — the agent graph (custom state machine, not LangGraph)

**Status:** implementation contract. This document is written so a coding agent can implement both loops **without inventing any control flow**: every node, every outcome tag, every edge, every budget, and every human gate is enumerated. If a situation is not in a table here, the answer is the table's default, not a new branch.
**Locked inputs:** G7 in [`open_questions.md`](../decisions/open_questions.md) (custom in-process state machine), [`ADR-001-stack.md`](../decisions/ADR-001-stack.md), [`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md), [`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md), [`locked_stack.md`](../decisions/locked_stack.md).
**Research cited:** [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2 (LangGraph resume re-runs the node — the hazard when nodes are UI mutations), [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §6 (the fair version of that rejection: scope and explainability), [`tech_stack.md`](../research/tech_stack.md) §6.1, [`_hitl_safety.md`](../research/_hitl_safety.md) §§1.1, 6, 7, [`alternatives_matrix.md`](../research/alternatives_matrix.md) A (reducer shape), [`frontier_computer_use.md`](../research/frontier_computer_use.md) anti-patterns 1, 7.
**Files:** `src/graph/machine.ts`, `src/graph/nodes.ts`, `src/graph/state.ts`, `src/discovery/graph.ts`, `src/replay/graph.ts`.

---

## 1. Shape: a table-driven reducer

```
loop:
  1. guards(state)            → may force the next node (budgets, lease, expiry). Total, checked every tick.
  2. node ← NODES[state.node] → run it; it returns ONE outcome tag (+ a state patch)
  3. next ← EDGES[state.graph][state.node][outcome]   ← a data table; a missing entry is a compile-time error
  4. state ← apply(patch, next); journal the tick
  5. if next is a terminal → finalize and return
```

`src/graph/machine.ts` is ~40 lines and contains no domain logic. All behaviour is in the node functions and the edge tables. That is what makes the graph implementable without invention: **the tables are the control flow**.

Why not LangGraph: its documented resume semantics re-run the interrupted node from its first line, and here "re-run the node" means "re-click the button" on a live banking UI. It can be made safe with careful node boundaries, but the framework's one differentiating feature — durable cross-process checkpointing — does not cover the resource this brief cares about (the live browser session dies with the process), so it buys nothing and adds a hazard plus concepts a reviewer must be talked through ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2; [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §6). A hand-rolled reducer whose replay binary never imports a model client also needs no startup assertion to prove the model is absent — the absence is structural.

---

## 2. Types

```ts
// src/graph/state.ts
export type GraphKind = "discovery" | "replay";

export type NodeId =
  | "observe" | "decide" | "policy_check" | "act" | "checkpoint"
  | "recover" | "escalate" | "redact" | "persist_artifact" | "replay_step";

export type Terminal =
  | { kind: "success";          outputs: Record<string, JsonValue> }
  | { kind: "business_outcome"; code: string; outputs: Record<string, JsonValue> }
  | { kind: "hard_failure";     stepId: string | null; code: HardFailureCode; expected: string; observed: string }
  | { kind: "escalated";        interventionId: string; stepId: string | null; reason: TransitionReason }
  | { kind: "compiled";         capabilityPath: string; status: "draft" | "approved" }        // discovery only
  | { kind: "compiled_incomplete"; capabilityPath: string; unresolved: string[] };            // discovery only

export interface RunState {
  graph: GraphKind;
  node: NodeId;
  runId: string;
  /* budgets & counters — every one of these is read by guards() */
  turn: number;                    // discovery turns / replay ticks
  stepIndex: number;               // replay: index into capability.steps
  startedAtMs: number;
  usdSpent: number;
  recoveriesUsed: number;
  recoverAttempts: Record<string, number>;      // key `${stepId}:${recoverableId}`
  consecutiveSameActionFailures: number;
  lastFailureKey: string | null;                // `${locatorDigest}:${actionKind}` for loop detection
  decideRetries: number;
  modelErrorRetries: number;
  /* payloads carried between nodes — explicit, not ambient */
  observation: Observation | null;
  pendingAction: ActionRequest | null;
  lastActionResult: ActionResult | null;
  pendingCheckpoint: Assertion[] | null;
  resumePending: boolean;
  interventionId: string | null;
  outputs: Record<string, JsonValue>;
  terminal: Terminal | null;
}

// src/graph/nodes.ts
export interface NodeContext {
  surface: Surface; policy: Policy; lease: SessionLease; evidence: EvidenceSink; clock: Clock;
  capability?: Capability;          // replay only
  params?: Record<string, JsonValue>;
  model?: DiscoveryModel;           // discovery only — MUST be undefined in the replay graph
}

export interface NodeResult { outcome: string; patch: Partial<RunState>; }
export type NodeFn = (s: Readonly<RunState>, ctx: NodeContext) => Promise<NodeResult>;

export type EdgeTable = Record<NodeId, Record<string, NodeId | { terminal: TerminalFactory }>>;
```

`EDGES` is typed so that every outcome tag a node can return must appear as a key. Adding an outcome without an edge fails `tsc`. That is the mechanism preventing invented control flow.

---

## 3. The ten nodes

| Node | Graph | Does | Returns one of |
|---|---|---|---|
| `observe` | both | `surface.observe()`; on replay start also computes the fingerprint; on resume compares the observed state against declared checkpoints | `observed` · `observed_resume_ok` · `observed_resume_mismatch` · `observed_fingerprint_mismatch` · `observe_failed` |
| `decide` | discovery | Sends the redacted observation + goal + tool schema to the model; parses one structured tool call (`{intent, ref, semanticDescriptor, rationale, risk}` or `{giveUp, reason}`) | `proposed_action` · `proposed_goal_met` · `gave_up` · `invalid_tool_output` · `model_error` |
| `policy_check` | both | `assertAllowed(pendingAction)`; writes the decision to the journal | `allow` · `deny` · `escalate` |
| `act` | both | Lease guard → resolve ranked target → dispatch → declared wait; converts Playwright errors to typed outcomes | `acted` · `target_not_found` · `target_ambiguous` · `wait_timeout` · `lease_violation` · `surface_error` |
| `checkpoint` | both | Evaluates step checkpoint (and, at the end, `contract.successCondition`); then classification steps 4–8 of [`replay_and_errors.md`](./replay_and_errors.md) §5 | `passed` · `passed_goal_verified` · `outcome_matched` · `recoverable_detected` · `unmatched` |
| `recover` | both | Matches declared recoverables, checks the per-recoverable and per-run budgets, dispatches the handler **through policy** | `recovered` · `no_pattern_matched` · `budget_exhausted` |
| `escalate` | both | Pauses actuation, flips the lease, writes `intervention.json`, waits (or returns immediately in `--no-wait`) | `resumed` · `aborted` · `expired` · `no_wait` |
| `redact` | both | Builds the persistable bundle through the redaction chokepoint; fails closed if a required field cannot be redacted | `ready` · `blocked_sensitive` |
| `persist_artifact` | discovery | Compiles the journal into a capability, validates against Zod, writes canonical JSON | `persisted` · `persisted_draft_incomplete` · `validation_failed` |
| `replay_step` | replay | Loads `steps[stepIndex]`, applies overlay enable/disable, evaluates preconditions, builds the `ActionRequest` | `step_ready` · `preconditions_failed` · `step_disabled` · `no_more_steps` |

Notes that prevent overlap confusion:

- `replay_step` **prepares**; `act` **dispatches**. They never do each other's job.
- `checkpoint` is the only node that classifies. `act` reports mechanics; classification is one place.
- `redact` is a node, not a helper call, because persistence is a graph transition with its own failure edge.
- `escalate` never closes the session ([`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md)).

---

## 4. Guards — checked before every node dispatch

```ts
// src/graph/machine.ts
function guards(s: RunState, ctx: NodeContext): NodeId | { terminal: Terminal } | null
```

| # | Condition | Discovery | Replay |
|---|---|---|---|
| G-1 | `turn >= policy.limits.maxSteps` | → `escalate` (`budget_exhausted`) | → terminal `hard_failure/run_budget_exhausted` |
| G-2 | `now - startedAtMs >= maxWallClockSec` | → `escalate` (`budget_exhausted`) | → terminal `hard_failure/run_budget_exhausted` |
| G-3 | `usdSpent >= maxUsd` | → `escalate` (`budget_exhausted`) | n/a (replay spends nothing) |
| G-4 | `recoveriesUsed >= maxRecoveriesPerRun` | → `escalate` | → terminal `hard_failure/recovery_budget_exhausted` |
| G-5 | `consecutiveSameActionFailures >= maxConsecutiveSameActionFailures` | → `escalate` (`loop_detected`) | → terminal `hard_failure/unmatched_state` |
| G-6 | `lease.owner() !== "automation"` while node ∈ {`act`} | → terminal `hard_failure/lease_violation` | same |
| G-7 | open intervention past `expiresAt` | → terminal `hard_failure/intervention_expired` | same |

Guards are total and centralised so no node has to remember a budget. Every guard firing is journaled with the counter that tripped it.

---

## 5. Discovery graph

Entry node: `observe`. `ctx.model` is present. The model may act on observation-local refs **only within the current turn** ([`ADR-002-perception.md`](../decisions/ADR-002-perception.md)).

### 5.1 Edge table

| From | Outcome | → To | Note |
|---|---|---|---|
| `observe` | `observed` | `decide` | |
| `observe` | `observed_resume_ok` | `decide` | after an operator resume; `resumePending` cleared |
| `observe` | `observed_resume_mismatch` | `escalate` | discovery may re-plan, but only after a human confirms the state ([`_hitl_safety.md`](../research/_hitl_safety.md) §6) |
| `observe` | `observed_fingerprint_mismatch` | `decide` | discovery *records* the fingerprint; it does not gate on it |
| `observe` | `observe_failed` | **terminal** `hard_failure/surface_crashed` | |
| `decide` | `proposed_action` | `policy_check` | |
| `decide` | `proposed_goal_met` | `checkpoint` | the model's claim is verified, never trusted |
| `decide` | `gave_up` | `escalate` (`model_uncertainty`) | |
| `decide` | `invalid_tool_output` | `decide` if `decideRetries < 2`, else `escalate` | one reprompt with the schema error |
| `decide` | `model_error` | `decide` if `modelErrorRetries < 3` (backoff 1s/4s/16s), else **terminal** `hard_failure/run_budget_exhausted` | |
| `policy_check` | `allow` | `act` | |
| `policy_check` | `deny` | `escalate` (`policy_denied_in_discovery`) | hard stop routed to a human, never a silent skip ([`_hitl_safety.md`](../research/_hitl_safety.md) §1.1) |
| `policy_check` | `escalate` | `escalate` (`risky_action_confirmation`) | human gate H-1 |
| `act` | `acted` | `checkpoint` | |
| `act` | `target_not_found` | `observe` (increment `consecutiveSameActionFailures`) | the model gets a fresh observation; G-5 bounds it |
| `act` | `target_ambiguous` | `observe` (increment) | the model must disambiguate; compiler will require uniqueness later |
| `act` | `wait_timeout` | `recover` | |
| `act` | `lease_violation` | **terminal** `hard_failure/lease_violation` | |
| `act` | `surface_error` | **terminal** `hard_failure/surface_crashed` | |
| `checkpoint` | `passed` | `observe` (`turn++`, reset failure counters) | next turn |
| `checkpoint` | `passed_goal_verified` | `redact` | the goal checkpoint held |
| `checkpoint` | `outcome_matched` | `redact` | a legitimate business outcome ends discovery too — it is a recordable flow ending |
| `checkpoint` | `recoverable_detected` | `recover` | |
| `checkpoint` | `unmatched` | `observe` (increment) | the model sees the new state and re-plans; G-5 bounds it |
| `recover` | `recovered` | `checkpoint` | re-evaluate, do not re-dispatch the original action |
| `recover` | `no_pattern_matched` | `escalate` (`unknown_state`) | human gate H-2 |
| `recover` | `budget_exhausted` | `escalate` | |
| `escalate` | `resumed` | `observe` (`resumePending = true`) | |
| `escalate` | `aborted` | **terminal** `escalated` | |
| `escalate` | `expired` | **terminal** `hard_failure/intervention_expired` | |
| `escalate` | `no_wait` | **terminal** `escalated` | CI mode |
| `redact` | `ready` | `persist_artifact` | |
| `redact` | `blocked_sensitive` | **terminal** `hard_failure/redaction_violation` | fail closed; nothing is written |
| `persist_artifact` | `persisted` | **terminal** `compiled` | |
| `persist_artifact` | `persisted_draft_incomplete` | **terminal** `compiled_incomplete` | uncompilable step(s) listed; never patched with a ref or a coordinate |
| `persist_artifact` | `validation_failed` | **terminal** `hard_failure/output_validation_failed` | the compiler produced a non-conforming artifact — a bug, surfaced loudly |

### 5.2 Discovery ASCII

```
        ┌──────────────────────────────────────────────────────────┐
        ▼                                                          │ passed / unmatched / not-found
   ┌─────────┐ observed  ┌────────┐ proposed ┌──────────────┐ allow ┌─────┐ acted ┌────────────┐
   │ observe │──────────►│ decide │─────────►│ policy_check │──────►│ act │──────►│ checkpoint │
   └─────────┘           └────────┘          └──────────────┘       └─────┘       └────────────┘
        ▲ resumed            │ gave_up            │ deny/escalate      │ timeout        │ goal_verified
        │                    ▼                    ▼                    ▼                ▼
        └──────────────┬──────────────────── ┌──────────┐         ┌─────────┐      ┌────────┐   ┌──────────────────┐
                       │  no_pattern         │ escalate │◄────────│ recover │      │ redact │──►│ persist_artifact │
                       └─────────────────────└──────────┘         └─────────┘      └────────┘   └──────────────────┘
                                                   │ aborted/expired/no_wait                          │
                                                   ▼                                                  ▼
                                              terminal                                            terminal
```

---

## 6. Replay graph

Entry node: `observe` (fingerprint pre-check), then `replay_step`. `ctx.model` is **undefined**, and the replay binary does not import a model client.

### 6.1 Edge table

| From | Outcome | → To | Note |
|---|---|---|---|
| `observe` | `observed` | `replay_step` | |
| `observe` | `observed_resume_ok` | `replay_step` | resumed at the step whose checkpoint now matches |
| `observe` | `observed_resume_mismatch` | `escalate` if the step allows it, else **terminal** `hard_failure/unmatched_state` | replay never improvises a new path ([`_hitl_safety.md`](../research/_hitl_safety.md) §6) |
| `observe` | `observed_fingerprint_mismatch` | per `app.onFingerprintMismatch`: `replay_step` (warn) · `escalate` · **terminal** `hard_failure/app_fingerprint_mismatch` | human gate H-3 |
| `observe` | `observe_failed` | **terminal** `hard_failure/surface_crashed` | |
| `replay_step` | `step_ready` | `policy_check` | |
| `replay_step` | `preconditions_failed` | `recover` | a declared recoverable may fix it; otherwise §5 classification applies |
| `replay_step` | `step_disabled` | `replay_step` (`stepIndex++`) | overlay `step_enabled:false`; journaled |
| `replay_step` | `no_more_steps` | `checkpoint` (evaluates `contract.successCondition`) | |
| `policy_check` | `allow` | `act` | |
| `policy_check` | `deny` | **terminal** `hard_failure/policy_denied` | artifact/policy drift, flagged for artifact review |
| `policy_check` | `escalate` | `escalate` (`risky_action_confirmation`) | human gate H-1 |
| `act` | `acted` | `checkpoint` | |
| `act` | `target_not_found` | `recover` | |
| `act` | `target_ambiguous` | **terminal** `hard_failure/locator_ambiguous` | never pick match #1 of N |
| `act` | `wait_timeout` | `recover` | |
| `act` | `lease_violation` | **terminal** `hard_failure/lease_violation` | |
| `act` | `surface_error` | **terminal** `hard_failure/surface_crashed` | |
| `checkpoint` | `passed` | `replay_step` (`stepIndex++`) | |
| `checkpoint` | `passed_goal_verified` | `redact` → **terminal** `success` | outputs validated against `contract.outputs` first |
| `checkpoint` | `outcome_matched` | `redact` → **terminal** `business_outcome` | code must be declared in `contract.results` |
| `checkpoint` | `recoverable_detected` | `recover` | |
| `checkpoint` | `unmatched` | per `steps[].onUnmatched`: **terminal** `hard_failure/unmatched_state` (default) · `escalate` | human gate H-2 |
| `recover` | `recovered` | `checkpoint` | re-evaluate the same step's checkpoint; only a `reload` handler re-dispatches the action |
| `recover` | `no_pattern_matched` | per `steps[].onUnmatched` | |
| `recover` | `budget_exhausted` | **terminal** `hard_failure` with the recoverable's `onExhausted.code` | |
| `escalate` | `resumed` | `observe` (`resumePending = true`) | |
| `escalate` | `aborted` | **terminal** `escalated` | |
| `escalate` | `expired` | **terminal** `hard_failure/intervention_expired` | |
| `escalate` | `no_wait` | **terminal** `escalated` | |
| `redact` | `ready` | **terminal** (carries the finalized envelope) | |
| `redact` | `blocked_sensitive` | **terminal** `hard_failure/redaction_violation` | |

### 6.2 Replay ASCII

```
   ┌─────────┐        ┌─────────────┐ step_ready ┌──────────────┐ allow ┌─────┐ acted ┌────────────┐
   │ observe │───────►│ replay_step │───────────►│ policy_check │──────►│ act │──────►│ checkpoint │
   └─────────┘        └─────────────┘            └──────────────┘       └─────┘       └────────────┘
        ▲                   ▲   │ no_more_steps        │ deny              │ timeout        │ passed (stepIndex++)
        │ resumed           └───┼──────────────────────┼───────────────────┼────────────────┘
        │                       │                      ▼                   ▼
   ┌──────────┐  escalate       │                  terminal            ┌─────────┐ recovered
   │ escalate │◄────────────────┴──────────────────────────────────────│ recover │──────────► checkpoint
   └──────────┘                                                        └─────────┘
        │ aborted/expired/no_wait                    outcome_matched / goal_verified
        ▼                                                        ▼
    terminal                                                 ┌────────┐
                                                             │ redact │──► terminal
                                                             └────────┘
```

---

## 7. Stop conditions (complete list)

| Condition | Where enforced | Terminal |
|---|---|---|
| Max steps / turns | guard G-1 | discovery `escalated`; replay `hard_failure/run_budget_exhausted` |
| Wall-clock timeout | guard G-2 | as above |
| Spend cap (`maxUsd`) | guard G-3, checked after each model call | discovery `escalated` |
| Recovery budget (run) | guard G-4 | `hard_failure/recovery_budget_exhausted` |
| Recovery budget (per recoverable) | `recover` node | `hard_failure` with `onExhausted.code` |
| Loop detection (N identical failures) | guard G-5 | discovery `escalated/loop_detected`; replay `hard_failure/unmatched_state` |
| Goal/checkpoint verified | `checkpoint` | discovery `compiled`; replay `success` |
| Declared business outcome matched | `checkpoint` | `business_outcome` |
| Model gives up | `decide` | `escalated/model_uncertainty` |
| Policy deny | `policy_check` | discovery `escalated`; replay `hard_failure/policy_denied` |
| Unknown/unmatched state | `checkpoint`/`recover` | `hard_failure/unmatched_state` or `escalated` |
| Intervention expiry | guard G-7 | `hard_failure/intervention_expired` |
| Operator abort | `escalate` | `escalated` |
| Surface crash / observe failure | `act`/`observe` | `hard_failure/surface_crashed` |
| Artifact/contract/policy validation failure | pre-loop in `replay()` | `hard_failure` with the specific code |
| Redaction cannot be satisfied | `redact` | `hard_failure/redaction_violation` |

Nothing terminates implicitly. There is no "loop ended because the array ran out" path: `no_more_steps` routes to the success-condition evaluation.

---

## 8. Retry policy (explicit, bounded, never a blind step retry)

| What | Budget | Backoff | Notes |
|---|---|---|---|
| Model returns unparseable tool output | 2 reprompts | none | The reprompt includes the Zod error; the third failure escalates |
| Model API/transport error | 3 attempts | 1s, 4s, 16s | Counts against wall clock; never against `maxSteps` |
| Locator candidate ladder | one bounded attempt per candidate | none | The wait timeout is the bound ([`replay_and_errors.md`](./replay_and_errors.md) §2) |
| Declared recoverable | `maxAttempts` (≤3) per `{stepId, recoverableId}` | none | Each attempt journals a `recovered` event |
| Run-wide recoveries | `maxRecoveriesPerRun` (default 6) | — | Guard G-4 |
| **Step re-execution after a failure** | **zero** | — | Steps are not idempotent. A failed step never auto-repeats; recovery re-evaluates the checkpoint instead |
| **Indeterminate write** | **zero** | — | Never re-submit; `hard_failure/indeterminate_write` and escalate ([`replay_and_errors.md`](./replay_and_errors.md) §5.4) |
| Resume | at most one automatic resume per intervention | — | A second failure after resume goes back to `escalate`, not into a loop |

---

## 9. Human gates

| ID | Trigger | Node | Lease effect | Resume path |
|---|---|---|---|---|
| H-1 | Risky/irreversible action (`policy_check → escalate`) | `escalate` | `automation → transitioning_to_human` | operator confirms → `resumed` → `observe` → re-verify the pending step's checkpoint **before** dispatch |
| H-2 | Unknown/unmatched state, or no recoverable matched | `escalate` | same | operator brings the session to a declared checkpoint, or aborts |
| H-3 | Fingerprint mismatch with `onFingerprintMismatch: "escalate"` | `escalate` | same | operator decides: continue, abort, or re-record |
| H-4 | Budget/loop exhaustion during discovery | `escalate` | same | operator may extend nothing — the honest options are abort or take over manually |
| H-5 | Policy deny during discovery | `escalate` | same | operator judges whether the goal is achievable within policy |

All five write the same `intervention.json` shape and all five preserve the session ([`hitl_control_transfer.md`](./hitl_control_transfer.md) §4).

---

## 10. Walkthroughs (trace these when implementing)

### 10.1 Replay happy path

```
observe(fingerprint ok) → replay_step(s01) → policy_check(allow) → act(fill) → checkpoint(passed)
→ replay_step(s02) → policy_check(allow) → act(click Search) → checkpoint(passed)
→ replay_step(s03) → … → replay_step(no_more_steps) → checkpoint(passed_goal_verified)
→ redact(ready) → terminal success{ savingsBalance: 1234.56 }
```

### 10.2 Business outcome

```
… → act(click Search) → checkpoint(outcome_matched: "No member found for ID 99999" → member_not_found)
→ redact(ready) → terminal business_outcome{ code: "member_not_found" }        # exit code 0, nothing thrown
```

### 10.3 Recovery, then success

```
… → act(click Search) → checkpoint(recoverable_detected: session_warning_interstitial)
→ recover(recovered, attempt 1/2, journal "recovered") → checkpoint(passed) → replay_step(s04) → …
```

### 10.4 Risky action → escalate → operator → resume

```
replay_step(s05: click "Create sub-account", risk=irreversible)
→ policy_check(escalate, rule r-submit-subaccount)
→ escalate: lease automation→transitioning_to_human; write intervention.json; wait
→ operator claim (→human) → operator act (optional) → operator resume
→ escalate(resumed) → observe(resume_ok) → re-verify s05 preconditions and checkpoint state
→ policy_check(allow, one-use confirmation bound to run+step) → act → checkpoint(passed) → …
```

### 10.5 Unknown dialog → hard failure

```
… → act(acted) → checkpoint(unmatched) → [steps[].onUnmatched = "hard_failure"]
→ redact(ready) → terminal hard_failure{ stepId: "s05", code: "unmatched_state",
    expected: "region 'Account summary' visible in frame content",
    observed: "dialog 'Cross-sell offer' visible; 0 matches for role=region name~='Account summary'",
    evidenceRefs: ["…/step_s05_redacted.png", "…/step_s05_region.yaml"] }
```

### 10.6 Discovery completing and compiling

```
observe → decide(proposed_action) → policy_check(allow) → act → checkpoint(passed)   × N turns
→ decide(proposed_goal_met) → checkpoint(passed_goal_verified)
→ redact(ready) → persist_artifact(persisted) → terminal compiled{ capabilities/…/v1.0.0.json, status: "draft" }
```

---

## 11. Tests (`test/graph-*.test.ts`)

| Test | Asserts |
|---|---|
| edge table totality | every outcome tag returned by every node has an edge; `tsc` + a runtime table audit both pass |
| no unreachable node | each `NodeId` is reachable from the entry node in its graph |
| replay graph has no model | `ctx.model === undefined` throughout; constructing one throws |
| guard precedence | budget guards fire before the node runs, not after |
| loop detection | 3 identical `target_not_found` failures → discovery escalates, replay hard-fails |
| no blind step retry | a failed step never re-dispatches its action without a `reload` recovery |
| resume re-verification | after `resumed`, the pending step's checkpoint is evaluated before any dispatch |
| terminal exhaustiveness | every `Terminal` kind is produced by at least one test, and the CLI maps each to its documented exit code |
| journal tick | every transition writes one journal line with `{from, to, outcome}` |

---

## 12. Do / don't

**Do**

- Keep `machine.ts` free of domain knowledge: guards, table lookup, journal, terminal.
- Return exactly one outcome tag per node; put everything else in the state patch.
- Journal every transition — the tick log is how a reviewer follows a run without a debugger.
- Reset `consecutiveSameActionFailures` on any passed checkpoint, and only there.
- Add a new node only by adding a row to both the node table and the edge table in the same commit.

**Don't**

- Don't add `if` branches inside a node that jump to another node. The table is the only transition mechanism.
- Don't let `act` classify outcomes or `checkpoint` dispatch actions.
- Don't add LangGraph, XState, or a workflow engine (G7, KC-6). If a graph library ever becomes necessary, the edge tables port directly — that is the point of keeping them as data.
- Don't auto-retry a step, and never re-dispatch after an indeterminate write.
- Don't introduce a "just continue" edge for an unmatched state. The default is `hard_failure`, and it is deliberate ([`Project.md`](../../Project.md) §3.3).
- Don't call the model from any node reachable in the replay graph — including for a "one-step repair" (that is a §8 stretch that stays unbuilt, G11).
