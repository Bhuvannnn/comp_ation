# Architecture — deterministic replay, waits, and the error taxonomy

**Status:** implementation contract for `src/replay/**`.
**Locked inputs:** [`ADR-002-perception.md`](../decisions/ADR-002-perception.md), [`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md), [`locked_stack.md`](../decisions/locked_stack.md), [`PRD.md`](../product/PRD.md) §3.3 (CU-33-01…07).
**Research cited:** [`_hitl_safety.md`](../research/_hitl_safety.md) §3 (RPA business-vs-system exception lineage), [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4 (the four lurking conflations), [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A4/KC-7 (replay invariants) and A5 (extraction, drift), [`tech_stack.md`](../research/tech_stack.md) §§10.2, 11, [`frontier_computer_use.md`](../research/frontier_computer_use.md) anti-patterns 1, 5, 7, [`non_viable.md`](../research/non_viable.md) #2, #7, #9, #12.
**Brief:** [`Project.md`](../../Project.md) §3.3, §3.5, §10.

---

## 1. What "deterministic" means here (and what it does not)

Determinism in this system is a property of the **decision path**, not of the wall clock. Same artifact + same inputs + same target state ⇒ same sequence of decisions and the same terminal result kind.

| Guaranteed | Not guaranteed |
|---|---|
| No model is consulted for any decision | Identical timings |
| Step order comes from the artifact, never from runtime inference | Identical screenshots |
| Target identity comes from the artifact's ranked locators | Identical DOM byte-for-byte |
| Every wait is a state condition with an explicit bound | That the target app behaves the same (it may legitimately return a different business outcome) |
| Every step's success is asserted by a checkpoint | That a slow network takes the same number of poll cycles |

### 1.1 The four replay invariants (violating any is a defect)

Promoted from [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A4/KC-7 and [`Project.md`](../../Project.md) §10:

1. **No fixed sleep is ever a synchronisation primitive.** Every wait is a state condition with a timeout that yields a *typed* timeout outcome.
2. **Every action targets a control the artifact can name independently of its position.** No coordinates, no ephemeral refs, no positional frame indices.
3. **No step's success is inferred from the absence of an exception.** A checkpoint runs before the next step.
4. **No LLM is imported, constructed, or called.** Structural, not asserted — see [`system_overview.md`](./system_overview.md) §7.

### 1.2 Runtime guard

```ts
// src/replay/interpreter.ts — first lines of run()
assertNoModelClient();   // throws if process.env.OPENAI_API_KEY was consumed by a client in this process
```

The import-graph test in `test/boundaries.test.ts` is the primary control; this guard is the cheap belt-and-braces one that shows up in the journal (`{"event":"replay_started","llm":"absent"}`).

---

## 2. Locator resolution — the ranked ladder

`src/replay/resolve.ts`. Input: `RankedTarget` from [`artifact_schema.md`](./artifact_schema.md) §8.3. Output: exactly one live handle, or a typed failure.

```
resolve(target, surface, budget):
  frame ← walk target.framePath  (main → named/urlPattern/titleMatch)
        ↳ frame missing after budget.frameTimeoutMs  ⇒ FrameNotFound
  for candidate in target.candidates ordered by rank ascending:
      matches ← surface.countMatches(frame, candidate.locator, budget.resolveTimeoutMs)
      if matches === 1:
          if candidate.rank > 1 → emit DriftEvent{ stepId, failedRanks, usedRank, locatorKind }
          return Resolved{ handle, usedCandidate }
      if matches > 1:
          record Ambiguity{ candidate, matches }   // do NOT pick the first
          continue                                  // a lower-ranked, more specific candidate may disambiguate
      // matches === 0 → try next candidate
  if any Ambiguity recorded → AmbiguousTarget (hard_failure, code `locator_ambiguous`)
  else                      → TargetNotFound   (feeds §5 classification, not an automatic crash)
```

Rules:

- **Never auto-pick match #1 of N.** Ambiguity is a defect in the artifact, and silently picking one is how a replay clicks the wrong row in a table. [`Project.md`](../../Project.md) §1 names duplicate/empty accessible names as the legacy reality.
- **Falling back is a success with a signal.** Using rank ≥ 2 still completes the step but emits a `drift` journal event carrying which ranks failed and which succeeded. Drift is a signal to review, not an outage ([`_hitl_safety.md`](../research/_hitl_safety.md) §4.3).
- **Structural candidates are last and loud.** A successful `css`/`xpath` resolution emits `drift.severity = "structural_fallback_used"`, which the run summary surfaces even on success.
- **No self-healing.** If every candidate fails, the engine does not invent a locator and does not call a model ([`frontier_computer_use.md`](../research/frontier_computer_use.md) anti-pattern 7; [`non_viable.md`](../research/non_viable.md) #9).

### 2.1 Fingerprint / drift pre-check

Before step `s01`, replay recomputes the landmark digest at the entry route and compares to `app.fingerprint.value`.

| Result | Behaviour |
|---|---|
| Match | journal `fingerprint_ok`, continue |
| Mismatch, `onFingerprintMismatch: "warn_and_continue"` | journal `drift{kind:"fingerprint"}`, continue, surface in result summary |
| Mismatch, `"escalate"` | intervention with reason `fingerprint_mismatch` ([`hitl_control_transfer.md`](./hitl_control_transfer.md) §4) |
| Mismatch, `"hard_failure"` | terminal `hard_failure`, code `app_fingerprint_mismatch`, expected/observed digests in the result |

This is the concrete answer to §3.7's "how do you detect and manage per-tenant/version drift" and it costs a hash ([`tech_stack.md`](../research/tech_stack.md) §7.3).

---

## 3. Waits — a closed union, no sleeps

```ts
// Declared in src/artifact/schema.ts (it is artifact data); src/replay/waits.ts imports it
// and owns only the executor. See artifact_schema.md §2.1 for declaration order.
export const WaitSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("elementVisible"), target: RankedTargetSchema, timeoutMs: Bounded }),
  z.object({ kind: z.literal("elementAbsent"),  target: RankedTargetSchema, timeoutMs: Bounded }),
  z.object({ kind: z.literal("elementStable"),  timeoutMs: Bounded }),        // no layout shift for 2 animation frames
  z.object({ kind: z.literal("urlMatches"),     pattern: z.string(), timeoutMs: Bounded }),
  z.object({ kind: z.literal("documentReady"),  timeoutMs: Bounded }),        // full page reload / postback
  z.object({ kind: z.literal("networkQuiet"),   quietMs: z.number().int().max(2000), timeoutMs: Bounded }),
  z.object({ kind: z.literal("assertion"),      until: AssertionSchema, timeoutMs: Bounded }),
]);
// Bounded = z.number().int().min(50).max(30_000)
```

There is deliberately **no `kind: "sleep"`**. If an implementer needs one, the correct move is to name the state they are actually waiting for.

| Situation on MemberDesk | Correct wait |
|---|---|
| Server-rendered postback rebuilds the page | `documentReady` then `elementVisible` on the next step's target |
| Table re-renders after search submit | `elementVisible` on the results region, or `elementAbsent` on the "Searching…" indicator |
| Slow-load fault injected | the step's own `timeoutMs`, which produces a typed timeout (§5), plus an optional `retry_wait` recoverable |
| Interstitial may appear | not a wait — a declared recoverable (§4) |

### 3.1 Timeout semantics

A wait that expires does **not** throw a raw Playwright error into the caller. `waits.ts` converts it to `WaitTimeout{ stepId, waitKind, timeoutMs, observedSummary }`, which enters classification (§5) and typically becomes either a declared recoverable retry or `hard_failure` with code `wait_timeout`.

Budgets come from three places, narrowest wins: step `wait.timeoutMs` → capability defaults → `policy.limits`. An overlay may widen a step budget only via the `wait_budget` op ([`artifact_schema.md`](./artifact_schema.md) §9.1).

---

## 4. Recoverables — bounded, declared, journaled, never terminal

`knownRecoverables[]` is declared once at capability level and referenced per step ([`artifact_schema.md`](./artifact_schema.md) §6.2).

```
after an action or a failed checkpoint, before classifying as failure:
  for rid in step.recoverables:                      # order is artifact order, deterministic
      r ← knownRecoverables[rid]
      if evaluate(r.detect) is true:
          if attempts[stepId][rid] >= r.maxAttempts:
              return HardFailure(code = r.onExhausted.code, …)
          attempts[stepId][rid]++
          policy.assertAllowed(r.handle action)      # recovery actions are actions: they pass the same gate
          execute r.handle
          journal RecoveredEvent{ stepId, recoverableId, attempt, handledBy }
          re-evaluate the step's checkpoint (and re-run the action only if r.handle was a reload)
```

Rules:

- **`recovered` is never a terminal result kind.** It is a journal event, and the run continues ([`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md); [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4.1).
- **Never silently swallowed.** Every recovery writes an event with the recoverable id and attempt number; `result.json` carries `recoveries: [{stepId, recoverableId, attempts}]`.
- **Only declared patterns.** An unrecognised blocking dialog is *not* dismissed by guesswork; it is unmatched state (§5, step 6). This is the line [`_hitl_safety.md`](../research/_hitl_safety.md) §3.1 draws between known-auto-dismissable and unknown-escalate.
- **Global budget too.** `policy.limits.maxRecoveriesPerRun` (default 6) prevents a dialog loop from consuming the wall clock; exhausting it is `hard_failure` code `recovery_budget_exhausted`.

---

## 5. Classification — one ordered decision procedure

This is the heart of §3.3 and the place [`Project.md`](../../Project.md) §10 says most designs fail. It runs after every step's action + wait.

```
1. Lease violation?            → hard_failure  (lease_violation)              [never retried]
2. Policy deny?                → hard_failure  (policy_denied)                [never offered as "confirm to proceed"]
3. Policy escalate?            → escalated     (risky_action_confirmation)    [session stays live]
4. Step checkpoint satisfied?  → continue (or success at the last step, after successCondition)
5. Any step.outcomes[].when satisfied?  → business_outcome(code)   [terminal, typed, NOT an error]
6. Any step.recoverables[] detected?    → §4 recovery loop, then re-evaluate from 4
7. Wait timeout / target not found / ambiguity / extraction failure?
       → declared onMissing / onUnmatched decides: business_outcome | hard_failure | escalate
8. Otherwise                    → hard_failure (unmatched_state)              [capture evidence, do not guess]
```

Order matters and is normative:

- **Outcomes are checked before recoveries** so a "no results found" page is never mistaken for an interstitial to dismiss.
- **Checkpoint is checked before outcomes** so a successful step is not misread as a business outcome when both would match.
- **Unmatched is the default**, never "assume success". [`Project.md`](../../Project.md) §3.3: "detect these and respond deliberately rather than blindly proceeding."

### 5.1 The terminal union (ADR-005)

```ts
// src/replay/result.ts
export type ReplayResult =
  | { kind: "success";          outputs: Record<string, JsonValue>; }
  | { kind: "business_outcome"; code: string; description: string; outputs: Record<string, JsonValue>; }
  | { kind: "hard_failure";     stepId: string; code: HardFailureCode;
                                expected: string; observed: string; evidenceRefs: string[]; }
  | { kind: "escalated";        interventionId: string; stepId: string; reason: EscalationReason;
                                sessionAlive: true; };

export interface ReplayEnvelope {          // what result.json actually contains
  result: ReplayResult;
  runId: string;
  capability: { id: string; version: string; contractHash: string; schemaVersion: number };
  policy:     { id: string; digest: string };
  appliedOverlays: Array<{ overlayId: string; opCount: number; digest: string }>;
  recoveries: Array<{ stepId: string; recoverableId: string; attempts: number }>;
  drift:      Array<{ stepId: string; kind: "locator_fallback" | "structural_fallback_used" | "fingerprint";
                      detail: string }>;
  timings:    { startedAt: string; endedAt: string; perStepMs: Record<string, number> };
  leaseTransitions: Array<{ at: string; from: LeaseOwner; to: LeaseOwner; reason: string }>;
}
```

Four kinds. Not five. `recovered` is not among them, and neither is a generic `error`.

### 5.2 Why the distinctions are shaped this way

| Kind | Meaning | Caller behaviour | Lineage |
|---|---|---|---|
| `success` | Checkpoint met; declared outputs returned | Use the outputs | — |
| `business_outcome` | A legitimate domain answer produced by business rules or data | Branch on `code`; this is information, not an error | RPA "business exception", but renamed because UiPath treats those as *failed* queue items and the brief does not ([`_hitl_safety.md`](../research/_hitl_safety.md) §3.1; [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4.1 conflation B) |
| `hard_failure` | Unexpected/indeterminate state, policy violation, timeout, crash | Debug with `stepId`/`expected`/`observed`/`evidenceRefs`; do not retry blindly | RPA "system/application exception" |
| `escalated` | Stopped for a human; the session is still live | Wait for the operator; the run may still complete | [`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md) |

### 5.3 The ambiguous case must be decided in the artifact, not at runtime

"Access Denied" can legitimately be a business outcome (the *caller's* member genuinely lacks entitlement) or a hard failure (the automation's own service account is misconfigured). The artifact author decides and declares it, because the same UI text is either depending on *whose* permission failed ([`_hitl_safety.md`](../research/_hitl_safety.md) §3.2). The engine never guesses; if no `outcomes[].when` matches, it is unmatched state.

### 5.4 Indeterminate writes are never retried

If a write-class step submits and the confirmation neither appears nor produces a known error banner, the state of a money-adjacent operation is unknown. That is `hard_failure` with code `indeterminate_write`, and it escalates rather than re-submitting ([`_hitl_safety.md`](../research/_hitl_safety.md) §3.2; §6 idempotency). Re-running the capability after an `indeterminate_write` is a human decision, not an automatic one.

---

## 6. Hard-failure codes (closed enum)

```ts
export type HardFailureCode =
  // artifact / contract
  | "unsupported_schema_version" | "contract_hash_mismatch" | "policy_digest_mismatch"
  | "input_validation_failed"    | "capability_not_approved"
  // targeting
  | "frame_not_found" | "locator_not_found" | "locator_ambiguous" | "structural_only_target"
  // timing / state
  | "wait_timeout" | "document_load_failed" | "app_fingerprint_mismatch" | "unmatched_state"
  // outcome/extraction
  | "extraction_failed" | "output_validation_failed" | "checkpoint_failed" | "indeterminate_write"
  // recovery
  | "recovery_budget_exhausted" | "interstitial_not_dismissable"
  // safety / control
  | "policy_denied" | "lease_violation" | "session_expired" | "intervention_expired"
  // process
  | "surface_crashed" | "run_budget_exhausted";
```

Every code appears in at least one `FakeSurface` test. The test names *are* the specification ([`tech_stack.md`](../research/tech_stack.md) §10.2).

---

## 7. Extraction and outputs

1. Resolve the extraction target with the same ranked ladder (§2).
2. Read `text | value | attribute | ariaName`.
3. Apply the declared `parse` rule. `"$1,234.56"` → `currency{locale:"en-US",currency:"USD"}` → `1234.56`. Parsing is declared, never sniffed ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 5).
4. On missing/unparseable: apply the declared `onMissing` (`hardFailure` | `businessOutcome` | `null`). "The savings row is absent" being `no_savings_account` rather than a crash is an artifact decision.
5. Validate the assembled outputs against `contract.outputs` before returning. A mismatch is `output_validation_failed` — never return a shape the contract does not promise.
6. Apply sensitivity: `pii`/`secret` outputs are returned to the caller in memory and **excluded from `result.json` on disk**, replaced by `{"$redacted":"savingsBalance","reason":"sensitivity:pii"}` ([`safety_and_policy.md`](./safety_and_policy.md) §5).

---

## 8. Evidence on failure

[`Project.md`](../../Project.md) §3.3 asks literally for "what step, what was expected, what was observed", and §3.5 for at least one richer signal on failure.

| Always | On hard failure / ambiguity |
|---|---|
| `journal.jsonl` (one redacted JSON object per event) | scoped ARIA snapshot (the failed target's region, not the page) |
| `result.json` (the envelope in §5.1) | redacted screenshot with sensitive boxes blacked out |
| per-step timings and drift events | expected-vs-observed diff for the failed assertion |
| lease transitions | last N journal entries duplicated into the failure bundle for readability |
| — | Playwright `trace.zip` when tracing was enabled for the run |

`expected` and `observed` are **strings a human can read**, produced by an assertion pretty-printer: `expected: "region 'Account summary' visible in frame 'content'"` / `observed: "frame 'content' present; 0 matches for role=region name~='Account summary'; nearest names: ['Account overview']"`. The "nearest names" hint is what makes a drift diagnosable in one look.

---

## 9. Replay execution outline

```ts
// src/replay/interpreter.ts (shape, not implementation)
export async function replay(args: {
  capabilityPath: string; inputs: unknown; overlayPath?: string;
  surface: Surface; policy: Policy; lease: SessionLease; evidence: EvidenceSink;
  requireApproved: boolean;
}): Promise<ReplayEnvelope> {
  const base    = migrate(readJson(args.capabilityPath));      // schemaVersion gate + hash verify
  const cap     = args.overlayPath ? applyOverlay(base, readOverlay(args.overlayPath)) : base;
  assertContractHash(cap);
  if (args.requireApproved && cap.status !== "approved") fail("capability_not_approved");
  const params  = validateInputs(cap.contract.params, args.inputs);   // typed, sensitivity-aware
  assertPolicyDigest(cap.policyRef, args.policy);

  await navigateEntrypoint(cap.entrypoint, params);             // policy-checked like any action
  await fingerprintCheck(cap.app);                              // §2.1

  for (const step of cap.steps) {                               // ordered; the graph in agent_graph.md §6
    const outcome = await runStep(step, ctx);                   // resolve → policy → act → wait → checkpoint → classify
    if (outcome.terminal) return finalize(outcome);
  }
  return finalize(await evaluateSuccessCondition(cap.contract.successCondition, ctx));
}
```

The per-step control flow is fully specified as a node/edge table in [`agent_graph.md`](./agent_graph.md) §6 — implement that table rather than inventing loops here.

---

## 10. Required evidence runs (grader-visible)

Per [`Project.md`](../../Project.md) §6.3 and [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §9.5, three replays minimum, all committed:

| Run | Input | Expected terminal | Proves |
|---|---|---|---|
| `evidence/replay/happy/` | `fixtures/replay-found.json` | `success` + typed outputs | §3.3 core |
| `evidence/replay/not-found/` | `fixtures/replay-not-found.json` | `business_outcome{member_not_found}` | the glossary distinction, with no exception thrown |
| `evidence/replay/hard-failure/` | injected fault (unknown dialog or unmatched state) | `hard_failure` + screenshot + expected/observed | §3.3 debuggability, §3.5 richer signal |

Plus at least one journaled `recovered` event inside a passing run (interstitial or transient slow load), demonstrating that recovery is real and *not* a terminal kind.

Exit codes: `success` → 0; `business_outcome` → 0 (it is a legitimate answer, and the code is in `result.json`); `hard_failure` → 1; `escalated` → 2. Document this in `README.md` — a caller that treats a business outcome as a non-zero failure has re-introduced the conflation at the shell boundary.

---

## 11. Tests (`test/replay-*.test.ts`, all on `FakeSurface`)

One test per branch, named after the branch:

```
replay success returns declared outputs only
replay member_not_found returns business_outcome and throws nothing
replay no_savings_account returns business_outcome from onMissing
replay dismisses known interstitial, journals recovered, then succeeds
replay exhausts interstitial budget → hard_failure interstitial_not_dismissable
replay slow load within budget succeeds; beyond budget → hard_failure wait_timeout
replay unknown dialog → hard_failure unmatched_state with screenshot ref
replay ambiguous locator → hard_failure locator_ambiguous, no element clicked
replay falls back to rank 2 → success plus drift event
replay uses css candidate → success plus structural_fallback_used drift
replay fingerprint mismatch escalate → escalated, session alive
replay policy deny mid-run → hard_failure policy_denied, no action dispatched
replay under human lease → hard_failure lease_violation
replay refuses schemaVersion 2 fixture
replay refuses hand-edited artifact (contract hash mismatch)
replay never constructs a model client   (boundary test)
```

---

## 12. Do / don't

**Do**

- Implement classification as one ordered function with an exhaustive `switch` the compiler can check.
- Convert every Playwright error at the `WebSurface` boundary into a typed surface error; engines never see a raw `TimeoutError`.
- Journal the `decisionId` from the policy engine on every action so a reviewer can join actions to rules.
- Put `expected`/`observed` in human sentences, and include near-miss hints.
- Treat a rank ≥ 2 resolution as a reportable event even when the run passes.

**Don't**

- Don't add `recovered` (or `retry`, or `warning`) as a terminal result kind.
- Don't use `page.waitForTimeout`, `setTimeout`-as-sleep, or a "give it 2 seconds" comment anywhere in `src/replay/**`.
- Don't pick the first of N ambiguous matches.
- Don't let replay call the compiler, the discovery loop, or a model — including for "just one repair step". Bounded single-step LLM repair is a §8 stretch that stays unbuilt (G11).
- Don't return outputs the contract did not declare, or omit ones it promised on `success`.
- Don't retry a non-idempotent write after an indeterminate outcome.
