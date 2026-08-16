# Architecture — HITL escalation and same-session control transfer (lease model)

**Status:** implementation contract for `src/hitl/**` plus the lease guard inside `src/surface/web.ts`.
**Locked inputs:** [`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md) (lease, not bind-as-handoff), [`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md) (`escalated` is a terminal kind), G9 in [`open_questions.md`](../decisions/open_questions.md), [`PRD.md`](../product/PRD.md) §3.6 (CU-36-01…05).
**Research cited:** [`_hitl_safety.md`](../research/_hitl_safety.md) §§1, 5, 6, 7, 10 (triggers, intervention payload, resume semantics, ownership enum, real-vs-mocked), [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §§2, 3, 5, 9 (headless runnability, transport ranking, the pipe-vs-model distinction), [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §1 (`browser.bind()` is transport, `unbind()` is not a handback), [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A6(d)/KC-3 (the runner has no display), [`non_viable.md`](../research/non_viable.md) #8 + additions 29–31, 36.
**Brief:** [`Project.md`](../../Project.md) §3.6, §7 "Human-in-the-loop escalation".

---

## 1. The claim this design makes

Control transfer is a **lease over the actuator**, not a browser API. Session continuity comes from *not tearing anything down*; ownership comes from an enforced enum that every actuator call checks; the operator channel is a mockable surface over that model. CDP attach, `browser.bind()`, and a headed window are transports and demo aids layered on top — none of them is the control model, and the graded path must work with none of them ([`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md); [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §3.3).

Four layers, kept separate on purpose:

| Layer | What it is | Status here |
|---|---|---|
| **A. Control model** | Ownership state + actuators refuse while human owns + audited transitions + resume re-observation | **Real, required** |
| **B. Session continuity** | The same `BrowserContext`/`Page`/cookies survive the handoff | **Real, required** |
| **C. Human input channel** | How a human (or scripted operator) actually changes the UI | **Real via scripted operator (headless-safe); headed OS-click optional extra** |
| **D. Operator chrome** | The console the human looks at | **Mocked: CLI + JSON files** ([`Project.md`](../../Project.md) §3.6 scope note) |

---

## 2. Lease model

```ts
// src/hitl/lease.ts
export type LeaseOwner =
  | "automation"                 // the harness is the sole issuer of input
  | "transitioning_to_human"     // harness has stopped issuing; human has not yet taken over; session idle-but-alive
  | "human"                      // human/mock operator is the sole issuer; capture paused
  | "transitioning_to_automation"; // resume signalled; harness is re-observing before it acts again

export type TransitionReason =
  | "risky_action_confirmation" | "unknown_state" | "policy_denied_in_discovery"
  | "budget_exhausted" | "loop_detected" | "fingerprint_mismatch" | "model_uncertainty"
  | "operator_claimed" | "operator_resumed" | "operator_aborted" | "intervention_expired";

export interface LeaseTransition {
  at: string; from: LeaseOwner; to: LeaseOwner;
  reason: TransitionReason; requestedBy: "automation" | "operator" | "system";
  interventionId: string | null;
}

export interface SessionLease {
  owner(): LeaseOwner;
  /** Throws LeaseViolation unless owner === "automation". Called first inside every act(). */
  assertAutomationMayAct(): void;
  /** Throws unless owner === "human". Called by the operator channel before it dispatches. */
  assertHumanMayAct(): void;
  transition(to: LeaseOwner, reason: TransitionReason, by: LeaseTransition["requestedBy"]): LeaseTransition;
  history(): readonly LeaseTransition[];
}
```

### 2.1 Legal transitions (anything else throws)

```
automation ──escalate──────────────► transitioning_to_human
transitioning_to_human ──claim─────► human
transitioning_to_human ──expiry────► (terminal hard_failure: intervention_expired)
human ──resume signalled───────────► transitioning_to_automation
human ──abort──────────────────────► (terminal escalated / hard_failure per operator choice)
transitioning_to_automation ──re-observe OK──► automation
transitioning_to_automation ──re-observe fails──► transitioning_to_human   (back to escalation, never silent)
```

`transitioning_to_automation` is a **real state, not an instant**, because re-observation can itself fail; when it does, the transition aborts back into escalation rather than quietly becoming `automation` ([`_hitl_safety.md`](../research/_hitl_safety.md) §7).

### 2.2 Enforcement, not convention

```ts
// src/surface/web.ts
async act(request: ActionRequest): Promise<ActionResult> {
  this.lease.assertAutomationMayAct();                 // (1) ownership
  const decision = assertAllowed(request, this.policyCtx);  // (2) policy
  if (decision.verdict === "deny")     throw new PolicyDenied(decision);
  if (decision.verdict === "escalate") throw new EscalationRequired(decision);
  …                                                     // (3) resolve, (4) dispatch, (5) journal
}
```

A `LeaseViolation` is a `hard_failure` with code `lease_violation` — never queued, never retried. Ownership is a first-class checkable thing, not an assumption ([`_hitl_safety.md`](../research/_hitl_safety.md) §7).

### 2.3 Audit

Every transition is appended to `evidence/hitl/<runId>/lease-transitions.jsonl` **and** mirrored into the main journal, so `grep '"actor"' journal.jsonl` shows control moving `agent → human → agent`. That log *is* the control-transfer model, visible as data ([`tech_stack.md`](../research/tech_stack.md) §11.1).

---

## 3. Escalation triggers (checkable, not "the model feels stuck")

From [`_hitl_safety.md`](../research/_hitl_safety.md) §1.1, split by path.

### Discovery-time

| Trigger | Detection | Result |
|---|---|---|
| Step budget / wall-clock exceeded | `policy.limits` counters | `escalated`, reason `budget_exhausted` |
| Same (locator + action) fails N times against the same observed state | loop detector, `maxConsecutiveSameActionFailures` | `escalated`, reason `loop_detected` |
| Model reports it cannot determine the next action | a required `giveUp` variant in the tool schema | `escalated`, reason `model_uncertainty` |
| Proposed action outside the allowlist | `assertAllowed` → `deny` | `escalated`, reason `policy_denied_in_discovery` (hard stop routed to a human, not a silent skip) |
| Proposed action is risky/irreversible | `assertAllowed` → `escalate` | `escalated`, reason `risky_action_confirmation` |
| Unrecognised blocking UI matching no declared recoverable | classification step 8 | `escalated`, reason `unknown_state` |

### Replay-time

| Trigger | Result |
|---|---|
| Hard failure per [`replay_and_errors.md`](./replay_and_errors.md) §5 | `hard_failure`; escalate only when live human completion is plausible and safe |
| Allowlist violation mid-replay | `hard_failure` code `policy_denied` — this is artifact/policy drift, flagged for artifact review, not a normal escalation ([`_hitl_safety.md`](../research/_hitl_safety.md) §1.1) |
| Risky step reached and capability not approved for unattended replay | `escalated`, reason `risky_action_confirmation` |
| Fingerprint mismatch with `onFingerprintMismatch: "escalate"` | `escalated`, reason `fingerprint_mismatch` |

---

## 4. The intervention request

`evidence/hitl/<runId>/intervention.json`, schema in `src/hitl/intervention.ts` (Zod). Shape follows [`_hitl_safety.md`](../research/_hitl_safety.md) §5, which covers everything §3.6 requires the escalation to carry.

```jsonc
{
  "requestId": "esc_01J…",
  "runId": "replay_2026-08-16T18-40-00Z_ab12",
  "phase": "replay",                                  // or "discovery"
  "capability": { "id": "memberdesk.savings_balance_lookup", "version": "1.0.0", "contractHash": "sha256:…" },
  "goalText": "Look up member {{memberId}} and read their current savings balance.",
  "trigger": {
    "reasonCode": "unknown_state",                    // CLOSED enum = TransitionReason
    "reasonDetail": "Checkpoint 'Account summary region visible' not met; no declared outcome or recoverable matched.",
    "policyDecisionId": null
  },
  "step": { "id": "s05", "intent": "Read the savings balance from the account summary panel.",
            "expectedNextAction": { "kind": "read", "targetSummary": "text of 'Savings' balance cell in 'Account summary'" } },
  "state": {
    "screenshotRef": "evidence/hitl/<runId>/step_s05_redacted.png",
    "ariaSnapshotRef": "evidence/hitl/<runId>/step_s05_region.yaml",
    "routePattern": "/members/:id/accounts",
    "frameSummary": ["main", "content"],
    "redactionApplied": true                          // part of the contract: an unredacted payload is a defect
  },
  "sessionOwnerBefore": "automation",
  "suggestedActions": ["review the current screen",
                       "navigate manually to the Savings tab",
                       "run: replay resume --run <runId>"],
  "createdAt": "2026-08-16T18:41:02Z",
  "expiresAt": "2026-08-16T18:56:02Z",                // policy.limits.interventionExpirySec
  "status": "open"                                    // open | claimed | resumed | aborted | expired
}
```

Rules:

- `reasonCode` is a closed enum so escalations bucket for metrics, never free text.
- `redactionApplied: true` is part of the contract; the payload never carries an unredacted screenshot or DOM dump ([`_hitl_safety.md`](../research/_hitl_safety.md) §5, §9).
- `expiresAt` bounds the wait. On expiry the run terminates `hard_failure` code `intervention_expired`, with the intervention file left on disk as the record.
- **No parameter values** appear in `goalText`; placeholders stay placeholders.

---

## 5. Operator channel

### 5.1 The graded path: scripted / CLI operator, headless-safe

```
npx tsx src/cli/index.ts operator list                       # show open interventions
npx tsx src/cli/index.ts operator claim   --request <id>     # transitioning_to_human → human
npx tsx src/cli/index.ts operator act     --request <id> --actions fixtures/operator-actions.json
npx tsx src/cli/index.ts operator resume  --request <id>     # human → transitioning_to_automation
npx tsx src/cli/index.ts operator abort   --request <id> --reason "…"
```

`operator act` dispatches through the *same* `Surface` instance on the *same* page, under `assertHumanMayAct()`, with `actor: "human"` on every journal line. `fixtures/operator-actions.json` is a small list of semantic actions (`{kind:"click", target:{role:"link", name:"Savings"}}`), which is what makes the whole handoff reproducible in CI with no display and no person ([`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §§2.2, 5.3, 9.1).

This is the answer to the environment gate in [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A6(d)/KC-3: the runner may be headless Linux, so a design whose only proof is "a human clicks the visible window" cuts §3.6 for the grader.

### 5.2 Optional authenticity extras (never the only path)

| Extra | Status | Constraint |
|---|---|---|
| `--headed` window the operator clicks directly | optional local demo / screen recording | Same context, same lease; OS clicks are *not* automatically recorded, so the journal notes `humanActionCapture: "os_native_uninstrumented"` for that interval |
| `browser.bind()` second client | optional attachment transport only, after a smoke test | Loopback only, never a reachable WebSocket; `unbind()` is not a handback ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §1) |
| `connectOverCDP` from a second client | optional | Must attach to the **existing** target; opening a new context and calling it a handoff is a fresh session in disguise ([`non_viable.md`](../research/non_viable.md) addition 36) |
| `page.pause()` | demo aid only | Never the graded mechanism ([`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md)) |

---

## 6. Recording what the human did

While `owner() === "human"`, every discrete operator action is appended to `evidence/hitl/<runId>/operator-actions.jsonl`:

```jsonc
{ "ts": "…", "actor": "human", "kind": "click",
  "targetSummary": "link 'Savings' in frame content",
  "valuePresent": false, "valueRef": null, "routeAfter": "/members/:id/accounts" }
```

- Action **types and targets**, never raw typed values — `valuePresent: true` is the whole record of a credential entry. This is what makes it safe to keep the log at all ([`_hitl_safety.md`](../research/_hitl_safety.md) §6, §9 item 4).
- Screenshot/DOM capture is **paused** for the human interval ([`safety_and_policy.md`](./safety_and_policy.md) §5.4).
- Where the operator drives a headed window directly (§5.2), the interval is journaled as uninstrumented with start/end timestamps and the route observed before and after — honest, not silent.

---

## 7. Resume semantics

```
operator resume
  → lease: human → transitioning_to_automation
  → surface.observe()                     # FRESH snapshot; pre-handoff state is never trusted
  → recompute fingerprint                 # the operator may have navigated elsewhere
  → evaluate the resume checkpoint:
        · matches the interrupted step's checkpoint         → continue at the NEXT step
        · matches an EARLIER declared checkpoint             → continue from that step (replay only; deterministic)
        · matches the capability successCondition            → finalize success
        · matches a declared businessOutcome                 → finalize that outcome
        · matches nothing declared                           → discovery: re-plan from here
                                                               replay:    back to transitioning_to_human,
                                                                          or terminal hard_failure `unmatched_state`
  → lease: transitioning_to_automation → automation
  → journal resume event with the observed state summary
```

Three rules:

1. **Re-observe before acting.** Never continue on a stale plan ([`_hitl_safety.md`](../research/_hitl_safety.md) §6).
2. **Deterministic replay does not improvise.** If the human left the session in a state the artifact does not declare, replay surfaces `hard_failure`/`escalated` rather than guessing a path. Re-planning after an off-script resume is a discovery-mode behaviour only ([`_hitl_safety.md`](../research/_hitl_safety.md) §6).
3. **Re-verify before any irreversible action.** After resume, the checkpoint for the pending step is re-evaluated before dispatch, so a partially completed handoff cannot cause a double submit. Idempotency key is `{runId, stepId, attempt}` ([`_hitl_safety.md`](../research/_hitl_safety.md) §6).

---

## 8. Terminal `escalated`

Per [`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md), a run may end as `escalated`:

```jsonc
{ "kind": "escalated", "interventionId": "esc_01J…", "stepId": "s05",
  "reason": "unknown_state", "sessionAlive": true }
```

`sessionAlive: true` is literal — the process is still holding the context, waiting within `expiresAt`. CLI exit code 2. If the process must exit (CI, `--no-wait`), the run finalizes `escalated` with `sessionAlive: false` recorded in the envelope and the intervention marked `expired` on the next read; the honest statement is in `REPORT.md` §5: the live session dies with the process, which is why a durable checkpointer would not save it either ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2).

---

## 9. Real vs mocked (state this table in `REPORT.md` §5)

| Component | Status | Why |
|---|---|---|
| Lease + actuator gate + audited transitions | **Real** | The control model itself ([`Project.md`](../../Project.md) §3.6) |
| Same `BrowserContext`/`Page` preserved across handoff | **Real** | "not a fresh one" |
| Intervention request with context, redacted state, expiry | **Real** | §3.6 "carrying enough context to act on it" |
| Operator actions in the same session, journaled by type/target | **Real** (scripted + CLI) | §3.6 "record what the human did", headless-safe |
| Resume with re-observation and checkpoint re-verification | **Real** | §3.6 "hand control back so the run can resume" |
| Operator console UI | **Mocked** (CLI + JSON) | §3.6 scope note explicitly allows this |
| Headed OS-click takeover | **Optional demo** | Authenticity extra; not the graded proof |
| Remote control channel (noVNC/CDP relay) for a containerised browser | **Design-only** | Disproportionate for a local-first build ([`_hitl_safety.md`](../research/_hitl_safety.md) §1.2, §10) |
| Desktop/Electron control transfer (RDP shadowing, UiPath robot session, VNC) | **Design-only** | §3.7 is design, not build ([`_hitl_safety.md`](../research/_hitl_safety.md) §1.3) |

---

## 10. Evidence pack (required, not optional prose)

`evidence/hitl/<runId>/` must contain, per [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §9.3:

```
intervention.json            # the request, redacted
lease-transitions.jsonl      # every ownership change with reason and requester
operator-actions.jsonl       # what the human did: types + targets, no values
resume.json                  # re-observed state summary, checkpoint evaluated, decision taken
journal.jsonl                # the run journal, showing actor agent → human → agent
result.json                  # terminal envelope (success after resume, or escalated)
```

Acceptance (AT-08 in [`PRD.md`](../product/PRD.md)): the browser context is provably the same across the transfer — assert `surface.sessionId` and the `BrowserContext` identity are unchanged before and after, and record both in `resume.json`.

---

## 11. Tests (`test/hitl-*.test.ts`, all headless with a scripted operator)

```
lease rejects automation act while owner is human
lease rejects illegal transition human → automation without re-observation
escalation preserves sessionId and does not close the context
intervention payload is schema-valid, redacted, and carries step + reason + expiry
operator claim → act → resume completes the run and journals actor=human for the interval
operator actions record valuePresent without the value
capture is suppressed while owner is human
resume re-observes and continues at the next step when the checkpoint matches
resume into an undeclared state → replay returns hard_failure unmatched_state (does not improvise)
resume into the success state → finalize success without re-running the irreversible step
intervention expiry → hard_failure intervention_expired, intervention.json marked expired
risky action escalates before dispatch (no click reaches the surface)
```

---

## 12. Do / don't

**Do**

- Make the lease the first line of `act()`, before policy.
- Keep the browser context open on every escalation path, including on process-level errors where you can.
- Give the operator CLI the same `Surface` handle the engine uses — one page, one session, two authorised issuers at different times.
- Journal `actor` on every line, and mirror lease transitions into the main journal.
- Record `sessionId` before and after handoff and assert equality in a test.

**Don't**

- Don't call `browser.close()`, `context.close()`, or `page.close()` in an escalation path ([`non_viable.md`](../research/non_viable.md) #8).
- Don't treat CDP attach, `browser.bind()`, or `page.pause()` as the control model ([`non_viable.md`](../research/non_viable.md) additions 29–31).
- Don't open a new page/context for the operator — that is a fresh session in disguise (addition 36).
- Don't require a human at a keyboard to prove §3.6; the scripted operator path is the graded one.
- Don't capture screenshots while the human owns the session.
- Don't let `escalated` be reported as a hard failure, or a hard failure be reported as `escalated`. They are different states with different caller behaviour.
