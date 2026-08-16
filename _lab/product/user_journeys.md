# User journeys

**Scope:** local MemberDesk vertical slice under the locked stack and `ORCHESTRATOR_DEFAULT` gates. Use PRD IDs as the implementation contract. [Project.md §§3–5; ADR-001–ADR-005]

## Shared actors and rules

- **Capability author:** supplies a goal and target for discovery.
- **Calling agent:** invokes a saved capability with typed inputs and consumes its discriminated result.
- **Automation:** owns the live session only while the `SessionLease` owner is `automation`.
- **Operator:** receives an intervention, temporarily owns and acts in the same live session, then resumes or completes the run.
- **Reviewer:** inspects the capability, journals, screenshots, report, and cuts.

For every journey:

1. Validate target, action, artifact, and inputs before acting.
2. Route every actuator call through policy, risk, and lease checks.
3. Correlate events by run, capability/version, and step.
4. Redact before persistence.
5. Never use an LLM to choose replay steps.
6. Never open a fresh session for operator handoff.

[Project.md §§3.3–3.6; ADR-004; ADR-005]

## J1 — Discovery

**Goal:** author a reusable member lookup/balance capability from one genuine model-guided UI run.  
**Requirements:** CU-31-01–04, CU-32-01–07, CU-34-01–03, CU-35-01, CU-35-03.

**Preconditions**

- Start the local MemberDesk HTTP fixture with synthetic data.
- Configure its domain/routes/actions in the allowlist.
- Set `OPENAI_API_KEY`; use `DISCOVERY_MODEL` or its locked default.
- Start with lease owner `automation`.

**Flow**

1. The capability author invokes `discover` with a natural-language goal and MemberDesk target.
2. The system rejects a disallowed target before navigation; otherwise it opens the rendered MemberDesk entry point.
3. The system observes AI-mode ARIA YAML. On ambiguity, it may capture a screenshot. It sends the sanitized observation and constrained custom tools to the model.
4. The model chooses a UI action. The system validates policy, risk, and lease ownership before applying it through `WebSurface`.
5. The loop journals the sanitized observation/action reason and repeats through search → member detail/balance → confirmation/review.
6. The loop stops only when an observable goal checkpoint succeeds or a configured stop condition occurs.
7. On success, the compiler converts recorded tool actions into stable step IDs, parameter references, ranked semantic locators, typed outputs, expected outcomes/recoveries, and a terminal checkpoint.
8. Zod validates the JSON capability. Only then does the system publish it and link it to the discovery evidence.

**Postconditions**

- The saved artifact is decoupled from the transcript and contains no ephemeral ARIA refs, raw sensitive values, or baked-in replay model.
- The journal proves that a model chose real UI actions.
- A failed/partial discovery emits diagnostics or an intervention but does not publish an executable capability.

**Do not**

- Do not substitute the `--mock` run for genuine discovery evidence.
- Do not call MemberDesk state APIs to accomplish the goal.
- Do not hand-author a replacement artifact after the run.
- Do not claim ARIA is independent of the DOM; it is the chosen web observation, not native desktop proof.

[Project.md §§3.1–3.2, §4; brief decomposition §§2 “Section 3.1”, “Section 3.2”; ADR-002; ADR-003]

## J2 — Replay: happy path

**Goal:** invoke the saved capability for an existing synthetic member and return the declared balance/detail output.  
**Requirements:** CU-33-01–04, CU-34-01–03, CU-35-01, CU-37-01.

**Preconditions**

- Use a schema-valid approved sample capability and valid `fixtures/replay-found.json`.
- Remove or omit model credentials to prove replay independence.
- Start a permitted MemberDesk session with lease owner `automation`.

**Flow**

1. The calling agent invokes `replay` with the artifact and typed input.
2. The system validates artifact version, input shape, policy scope, and capability/target compatibility before UI action.
3. Replay binds parameter references without writing the raw value to the artifact or journal.
4. For each step, replay resolves frame path and ranked role/label/text candidates, verifies an unambiguous expected control/state, and applies condition-based waits.
5. Replay sends the declared action through policy and the lease-gated `WebSurface`.
6. Replay verifies intermediate conditions and the terminal success checkpoint.
7. Replay extracts only declared outputs, validates their types, redacts as required, and returns `{ kind: "success", outputs: ... }`.

**Postconditions**

- No LLM decision call occurred.
- The terminal checkpoint passed before output extraction.
- The result and journal are correlated, structured, and sanitized.

**Do not**

- Do not replay a transcript, snapshot-local ref, raw coordinate, or arbitrary Playwright script.
- Do not return success because the final click merely avoided an exception.
- Do not return undeclared page content.

[Project.md §3.3; brief decomposition §§2 “Section 3.3”, 4; ADR-002; ADR-005]

## J3 — Replay: `business_outcome` (`member_not_found`)

**Goal:** tell the calling agent that a syntactically valid member lookup found no member without misreporting a system failure.  
**Requirements:** CU-33-01–05, CU-35-01.

**Preconditions**

- Use the saved capability and `fixtures/replay-not-found.json`.
- Declare `member_not_found` as an expected business outcome at the relevant step.

**Flow**

1. Replay validates inputs and performs the deterministic search steps.
2. The outcome detector observes the declared MemberDesk “not found” state.
3. Replay confirms the state matches the artifact’s expected outcome descriptor.
4. Replay stops the flow without attempting detail or output-extraction steps.
5. Replay returns `{ kind: "business_outcome", code: "member_not_found", ... }` and journals the matching step and sanitized observation.

**Postconditions**

- The calling agent can branch on `kind` and `code` without exception parsing.
- No success outputs are fabricated.
- The system does not create a hard-failure screenshot solely for a legitimate negative result.

**Do not**

- Do not throw, return `success` with an empty value, or map not-found to `hard_failure`.
- Do not retry a legitimate not-found result.

[Project.md §3.3 and §10 “Business outcome vs. failure”; brief decomposition §§2 “Section 3.3”, 5; ADR-005]

## J4 — Replay: recoverable interstitial

**Goal:** dismiss one known safe interstitial or tolerate one injected transient load through a predefined bounded rule, then continue replay.  
**Requirements:** CU-33-02, CU-33-04, CU-33-06–07, CU-34-01, CU-35-01.

**Preconditions**

- Configure MemberDesk fault injection to show the known interstitial or transient delay.
- Declare its detector, permitted recovery action, retry/wait bound, and post-recovery condition in the capability.

**Flow**

1. Replay reaches a step whose expected control is temporarily blocked or delayed.
2. The deterministic detector matches the declared known recoverable condition.
3. Replay checks policy and lease ownership, then performs only the declared dismiss/wait/retry action.
4. Replay journals `dismissed_dialog` or `retry_wait`, attempt count, and sanitized rule reason.
5. Replay re-observes and revalidates the expected step state.
6. If the condition clears within bounds, replay continues and eventually returns its normal terminal kind.
7. If the condition persists beyond bounds or differs from the declaration, replay stops with a debuggable `hard_failure` or escalates according to policy.

**Postconditions**

- Recovery is visible in the journal but is never returned as `{ kind: "recoverable" }`.
- The number of attempts is finite and testable.

**Do not**

- Do not ask an LLM how to recover.
- Do not blindly dismiss unknown dialogs or retry indefinitely.
- Do not treat a recovery event as a terminal result peer.

[Project.md §3.3; brief decomposition §§2 “Section 3.3”, 4; ADR-005]

## J5 — Replay: hard failure

**Goal:** stop safely and return enough sanitized detail to debug an unexpected or exhausted condition.  
**Requirements:** CU-33-04, CU-33-07, CU-34-01–03, CU-35-01–03.

**Representative triggers**

- Ambiguous or missing target after bounded wait.
- Unknown dialog or application error.
- Permission denial not declared as a business outcome.
- Expired session without an approved recovery.
- Policy denial, invalid checkpoint, output type mismatch, timeout, or crash.

**Flow**

1. Replay detects that the current state cannot match a declared success step, business outcome, or bounded recovery.
2. The system stops before any speculative next action.
3. The evidence writer captures a sanitized screenshot and links it to the current run/step; it may add a sanitized snapshot or trace.
4. Replay returns `{ kind: "hard_failure", code, stepId, expected, observed, evidenceRefs }`.
5. If policy says the condition is human-actionable and the context remains safe/live, the system may instead create an intervention and return `escalated`.

**Postconditions**

- The result identifies what step failed, what was expected, what was observed, and where richer evidence resides.
- Sensitive values and credentials are absent from the result and evidence.
- No later capability step executes.

**Do not**

- Do not continue after an unclassified app state.
- Do not expose raw DOM/page dumps or unredacted screenshots by default.
- Do not collapse policy denial, not-found, and crash into one boolean.

[Project.md §§3.3–3.5; brief decomposition §§2 “Section 3.3”–“Section 3.5”, 4; ADR-005]

## J6 — HITL pause, same-session control, and resume

**Goal:** let an operator resolve a stuck or risky state in the exact live session, preserve control ownership and evidence, then safely return control.  
**Requirements:** CU-36-01–05, CU-34-02–03, CU-35-01–03.

**Preconditions**

- A discovery/replay run owns a live `BrowserContext`.
- A stuck detector, risky action, or unrecoverable but human-actionable state triggers escalation.
- The lease owner is `automation`.

**Flow**

1. Automation stops issuing actions and creates a sanitized intervention with goal/capability, current step, stop reason, state/screenshot reference, and stable request ID.
2. The lease transitions `automation → transitioning_to_human`. The original browser/context remains open.
3. After handoff validation, the lease becomes `human`. Every automation actuator call is rejected while human-owned.
4. The operator uses the minimal CLI/JSON/mock operator path to manipulate the same session. Each manual action is policy-checked where applicable and journaled with actor identity.
5. The operator signals resume or completion. The lease transitions `human → transitioning_to_automation`.
6. Automation re-observes the current UI and validates a declared resume/checkpoint state; it does not trust stale pre-handoff observations.
7. If valid, ownership returns to `automation` and replay resumes or verifies completion. If invalid, the system remains safely stopped with a clear intervention/failure update.

**Postconditions**

- Browser context/session identity is unchanged across the handoff.
- One correlated run history contains escalation, ownership transitions, operator actions, re-observation, and terminal result.
- The result while paused is `{ kind: "escalated", interventionId, ... }`.

**Do not**

- Do not open a fresh browser or tab as a substitute for handoff.
- Do not use an “approved” flag without actual same-session manual control.
- Do not allow human and automation actuators concurrently.
- Do not make `browser.bind()` or a headed window the ownership model.
- Do not resume from stale state.

[Project.md §3.6; brief decomposition §§2 “Section 3.6”, 4; ADR-004; model council D2/D9]
