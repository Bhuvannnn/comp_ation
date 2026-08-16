# Brief decomposition — computer-use take-home

Primary source: `/workspace/Project.md`, Sections 1–11. This document maps the assignment rather than selecting a stack or locking an architecture. No external sources were consulted.

## Status vocabulary

| Mark | Meaning |
|---|---|
| **Must implement (thin-but-real)** | A grader needs to be able to run or inspect a real implementation and evidence. A prose-only claim is insufficient. |
| **Design in `REPORT.md` only** | The brief expressly accepts a credible design treatment without building the production-scale feature. Implemented abstractions must not contradict the design. |
| **Stub/mock OK if seam is real** | The presentation layer or unavailable external component may be mocked, but the state transition, contract, or control seam being evaluated must work. |
| **Viable for this take-home** | A mechanism can support the required vertical slice within the brief. This is not a stack endorsement. |
| **Viable only as design story** | Discuss it and preserve an extension seam; implementing it would displace core work. |
| **Not viable / avoid** | It conflicts with a binding requirement or is a poor grading trade-off. |

## 1. Executive read of the assignment

| Question | Requirements read |
|---|---|
| What is the system? | A backend integration layer that gives an agent controlled “hands” inside legacy applications that lack an API. An LLM completes a goal through a real UI during discovery; the system converts the successful run into a typed, versioned, reviewable capability; later invocations execute that capability deterministically without model decisions (§1, §2). |
| Who decides what? | The upstream agent/product decides **what** business task to perform. This system decides **how** to execute an already-selected capability safely and reliably inside the target UI (§1). |
| What is the production path? | Parameterized artifact invocation → policy check → deterministic UI actions → checkpoints → typed outputs or a classified outcome/failure. Discovery is capability authoring, not the normal production execution path (§2, §3.2–§3.4). |
| What environment shapes the design? | Stable but heterogeneous legacy surfaces, legitimate runtime exceptions, regulated data, and hundreds of tenants with differently configured/versioned instances of shared vendor products (§1). |
| What must be real? | At least one genuine LLM-driven discovery run against a live UI; artifact emission; model-free deterministic replay; runtime outcome/error handling; allowlist and redaction; structured evidence; and a minimal same-session pause/human-control/resume path (§3, §4, §5). |
| What may be narrow? | One concrete target surface, one end-to-end capability, a bare/mock operator UI, and limited examples of exceptions—provided every Section 3 capability is touched and the underlying seams are real (§3.6, §3.7, §5). |
| What is design-only? | Actual desktop support, full multi-tenant infrastructure, and production scale machinery. The report must still explain surface abstraction, artifact reuse/specialization, and drift management credibly (§3.7, §7). |
| What is it not? | It is not an API integration project, a general autonomous agent product, a transcript recorder, an LLM-driven production runner, a happy-path browser script, a polished operator console, or a queue/cluster/multi-tenant infrastructure exercise (§1, §2, §3, §7). |
| Central grader question | Do the discovery loop, artifact contract, deterministic replay, error taxonomy, safety boundary, handoff model, and evidence form one coherent, defensible system (§5, §7)? |

The non-negotiable through-line is: “The model discovers. The artifact becomes a reusable capability. Deterministic replay is how the AI agent invokes it in production” (§2).

## 2. Section-by-section decomposition

### Section 1 — Context

| Ref | Binding requirement / fact to honor | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §1 ¶1–2 | Build for legacy back-office applications only when no API is available; API integration is preferred but out of scope. Discovery uses an LLM once, then produces deterministic reusable automation. | Do not hide UI automation behind a fake API. Separate discovery/authoring from production invocation. | Internal boundaries and representation of the discovery-to-capability transition. |
| §1 “Stable UIs…” | Design primarily for real runtime conditions: validation, not-found, permission denial, unexpected dialogs, expiry, slowness, and app errors. Happy path alone is not production-useful. | Error handling deserves more implementation depth than speculative layout-drift machinery. | Which representative conditions to implement and how to recover/classify each. |
| §1 “Heterogeneous…” | Do not assume a clean DOM, stable selectors, test IDs, or even a browser. | Artifact actions and targets should not be inseparable from one browser library’s selector syntax. | Concrete surface and perception/action mechanism. |
| §1 “Multi-tenant…” | Design for hundreds of tenants and shared vendor products with configuration/branding/version variation. | Separate vendor/product capability identity from tenant-specific bindings or overrides; provide a drift/version story. | Exact inheritance, overlay, compatibility, and drift strategy in the report. |
| §1 closing note | Implement one small, real end-to-end version against one surface; make decisions where under-specified and explain why. | A narrow coherent slice is acceptable; unexplained defaults are not. | All unspecified choices, with rationale. |

### Section 2 — The problem

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §2.1 | Accept a natural-language goal for a target application. | Goal and target are first-class run inputs and should appear in evidence/context. | Input format and chosen example goal/target. |
| §2.2 | Use an LLM to observe, decide, and act on a real application surface. | A scripted run dressed up as discovery fails the assignment. UI interaction—not an application API—must cause state changes. | Browser, accessibility, screenshot/coordinates, OS automation, or hybrid mechanism. |
| §2.3 | Record a successful run as a typed, versioned, structured reusable artifact, decoupled from the raw transcript. | Transcript events may inform compilation but cannot be the replay contract. | Artifact schema and compilation/extraction approach. |
| §2.4 | Replay without the LLM decision loop, with stable targeting and a success/failure report. | Determinism concerns decisions and contracts, not a guarantee that an external UI never varies. Runtime observations can drive predefined branches/recovery. | Locator strategy, waits, predefined branches, storage, and executor design. |
| §2.5 | Escalate when stuck, let a human control the live session, then return control. | Same-session identity, pause/resume state, ownership, and audit evidence are required. A fresh browser/session is not handoff. | Minimal operator surface and signaling mechanism. |
| §2.6 | Enforce allowlisted actions/targets and avoid leaking/persisting sensitive data. | Policy must gate actions before execution; redaction must cover artifacts, logs, screenshots/traces as applicable. | Policy shape, risky-action treatment, and redaction implementation. |
| §2 through-line | Discovery and production replay are different execution modes connected by the artifact. | Shared surface/action interfaces are useful, but model decisions must not leak into replay. | Process/service boundaries. |

### Section 3 — Core requirements

#### Section 3.1 — Goal-driven agent loop

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §3.1 bullet 1 | Accept goal plus target/app/URL/entry point. | Validate target through policy before opening or acting. | CLI/API/function input contract. |
| §3.1 bullet 2 | Run an LLM-driven observe → decide → act loop on a live surface until success or a stopping condition: max steps, timeout, or dead-end. | Loop must have explicit termination and cannot retry indefinitely; decisions and stopping reasons should be logged. | Model/provider, prompt, state representation, tool schema, limits, and dead-end heuristic. |
| §3.1 bullet 3 | Actually click, type, navigate, and read real UI state. Browser is only one case; bias toward operation without a clean DOM. | Direct application API calls do not demonstrate the requirement. A clean-DOM-only architecture weakens generalization. | DOM, accessibility tree, screenshot/coordinates, OS control, or hybrid. |

#### Section 3.2 — Structured artifact

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §3.2 opening | Emit an artifact after a successful run; it must be typed, serializable, reusable, and agent-invocable with a clear contract. | Failed/incomplete discovery must not silently publish an executable capability. Validate artifacts before replay. | Serialization format, schema library, storage, publication lifecycle. |
| §3.2 bullet 1 | Capture ordered steps/actions. | Each step needs stable identity for logs, failures, resume, and review. | Action vocabulary and whether predefined branches are represented as a graph or ordered steps with conditions. |
| §3.2 bullet 2 | Capture how each target is identified and explain robustness. | Raw coordinates or a single brittle selector need a justified fallback/validation strategy. | Target descriptor and resolution strategy. |
| §3.2 bullet 3 | Declare typed per-invocation input parameters. | Runtime values must be parameter references, not copied sensitive example values. Validate before execution. | Supported types, constraints, defaults, and interpolation syntax. |
| §3.2 bullet 4 | Declare typed outputs/data extraction and shape. | Replay result must conform to the declared output contract and avoid leaking undeclared/raw data. | Output type system and extraction assertions. |
| §3.2 bullet 5 | Declare a checkpoint or success condition. | “No exception thrown” is not success; executor must assert observable postconditions. | Checkpoint vocabulary and granularity. |
| §3.2 final ¶ | Version and make the artifact understandable/reviewable by a human and a calling agent. Schema quality is a focal evaluation point. | Include capability purpose/contract and schema version; consider compatibility/migration and review status even if approval workflow is not built. | Version semantics, metadata, documentation fields, and review format. |

#### Section 3.3 — Deterministic replay

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §3.3 bullet 1 | Given an artifact and typed inputs, replay without invoking an LLM for decisions. | Replay should fail validation before acting when artifact/input is invalid. Model fallback is not core replay. | Executor interface and parameter binding. |
| §3.3 bullet 2 | Use stable targeting, verify checkpoint/success, and return declared outputs. | Resolution should confirm it found the intended control before acting; output extraction is part of success. | Locator candidates, target scoring without model decisions, waits, and checkpoint implementation. |
| §3.3 bullet 3 opening | Explicitly detect and respond to validation errors, not-found, permission denial, unexpected dialogs, expiry, slowness/failed load, and app errors rather than proceeding blindly. | The schema/executor need observable conditions, bounded recovery, stop behavior, and evidence capture. The brief names a required class of conditions, not necessarily a demand for six separate demos. | Which conditions are implemented versus represented/tested; exact detectors and recovery policies. |
| §3.3 bullet 3a | Distinguish expected business outcomes from failures. | Result type must make a legitimate negative result machine-readable and non-exceptional. | Outcome codes and payloads. |
| §3.3 bullet 3b | Distinguish recoverable conditions. | Recovery must be known, bounded, and deterministic, such as retry/wait/dismiss—not model improvisation. | Retry counts, backoff, allowed recovery actions. |
| §3.3 bullet 3c | Distinguish hard failures. | Stop safely and expose a debuggable cause. | Failure codes, escalation trigger, and redaction. |
| §3.3 bullet 4 | Return structured success with outputs, known business outcome, or failure including step, expected state, and observed state. | A boolean or unstructured exception is insufficient; observed state must be sanitized. | Result envelope and diagnostic evidence references. |

#### Section 3.4 — Safety and policy

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §3.4 bullet 1 | Enforce an explicit configurable allowlist for targets such as domains/routes and permitted action types. Never act outside it. | Enforcement belongs in the action execution boundary for model-proposed discovery actions and artifact replay actions; configuration without denial behavior is insufficient. | Policy representation and scope. |
| §3.4 bullet 2 | Classify reversible/safe versus risky/irreversible actions and treat the latter conservatively. | Risk should be metadata/policy, not inferred ad hoc from button text at replay time. | Block, confirmation, human approval, or flag strategy—with justification. |
| §3.4 bullet 3 | Never persist credentials, tokens, full PII, or other raw sensitive data in artifacts or logs; redact appropriately. | Parameter placeholders should replace values in artifacts. Evidence capture must also have a sanitation strategy. | Redaction rules, sensitive field annotations, and evidence retention policy. |

#### Section 3.5 — Evidence and observability

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §3.5 | Produce structured logs of actions and reasons plus at least one richer failure signal such as screenshot, DOM snapshot, or trace. | Correlate run/step/evidence while sanitizing sensitive values. Discovery “why” and deterministic replay’s rule/reason should both be intelligible. | Log schema, richer signal, storage, and redaction. |

#### Section 3.6 — Human-in-the-loop escalation and handoff

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §3.6 opening | Escalation covers discovery stuck states, unrecoverable replay conditions, and risky decisions. | Escalation is cross-cutting, not a replay-only afterthought. | Implemented trigger(s) for the demonstration. |
| §3.6 “Detect and route” | Raise an intervention request with capability/goal, step, current state or screenshot, and stop reason. | Request needs stable ID/status and sanitized context; automation must stop before unsafe continuation. | Routing mechanism and request schema. |
| §3.6 “Take control” | Human must operate the same live session, perform manual steps, hand back control, preserve evidence/context, and record human actions. | A new tab/session or textual “operator approved” flag alone is insufficient. Session lifetime must span the pause. | Bare operator UI, remote-view/control method, and action-capture method. |
| §3.6 “Think about the seam” | Automation must pause, cede, and resume; system must know who is or should be in control. | Implement an explicit ownership/state model and reject automation actions while the human owns control. | State machine shape, ownership identity, timeout/cancellation rules. |
| §3.6 scope note | Full real-time co-browsing console is out of scope. Minimal real handoff may use a bare/mock operator surface, but pause/expose/resume/action capture and control transfer must be real and reasoned. | Mocking appearance is allowed; mocking the ownership/session transition is not. | Operator presentation layer and how much remote-control polish to build. |

#### Section 3.7 — Heterogeneity and scale

| Ref | Binding requirement | Implied constraint | Explicitly the candidate’s call |
|---|---|---|---|
| §3.7 opening | Implement one surface but address the Section 1 environment credibly in the write-up. | Do not build production scale, but avoid schemas tightly coupled to one page/library. | Chosen concrete surface and extension narrative. |
| §3.7 “Surface abstraction” | Explain extension from the chosen surface to legacy web and/or desktop, including the seam between perception/action and recorded flow. | Prefer a surface-neutral action/target contract with adapter-specific bindings; report limitations honestly. | Adapter boundary, control model, and target descriptor. |
| §3.7 “Multi-tenant reuse” | Explain reuse or safe specialization/overrides across tenants on the same vendor app and detection/management of tenant/version drift. | Artifact identity/version and tenant bindings should not require copying the whole capability per institution. Compatibility must be checked before acting. | Base/overlay model, matching, validation, rollout, and drift response. |
| §3.7 final ¶ | Desktop and multi-tenant support need not be implemented; core abstractions must not paint the system into a corner. | Building either is lower value than making the implemented artifact/executor boundaries extensible. | Whether to include any small illustrative stub beyond the report. |

### Section 4 — Explicitly the candidate’s call

| Ref | Binding boundary | Candidate-owned decision |
|---|---|---|
| §4 bullets 1–2 | No mandated language, runtime, framework, LLM provider/model, prompt, or loop structure. | Select and defend them. Own model access and reproducibility. |
| §4 bullet 3 | Any computer-use mechanism is permitted; real UI interaction remains mandatory and no-clean-DOM relevance matters. | Select and defend browser/DOM, accessibility, visual, OS-level, SDK, or hybrid control. |
| §4 bullet 4 | Do not seek a real bank system. Target must support a non-trivial multi-step flow. Public targets require ToS/rate-limit compliance and no real credentials/PII. Local samples/mocks are expressly allowed. | Choose public sandbox, local proxy, hostile legacy-like web surface, or simple desktop app. |
| §4 bullets 5–7 | No prescribed artifact format, determinism mechanism, or service architecture. Simplicity is acceptable when justified. | Choose schema/storage, locator/fallback/wait strategy, and process boundaries. |
| §4 “One thing…” | At least one genuine LLM-driven discovery run against a live surface and evidence under `/evidence/` is not optional. Candidate supplies model API access. | Provider/model are choices; reality of the run is not. |
| §4 final ¶ | Clean seams may substitute for non-core polish; mock deliberate stubs and document them. | Decide which operator UI/desktop/external components to mock without mocking required behavior. |

### Section 5 — Scope and expectations

| Ref | Binding requirement | Implied constraint | Candidate’s call |
|---|---|---|---|
| §5 ¶1 | Deliver a complete end-to-end vertical slice touching every Section 3 requirement. AI-assisted development is assumed. | Scaffolding volume is not evidence of quality. Integration and judgment are the differentiators. | Degree of implementation depth per seam. |
| §5 quoted thread | Demonstrate goal → LLM discovery → artifact → parameterized deterministic replay with outputs and error/outcome handling → same-session human takeover → evidence for both runs. | Demo/evidence should make this causal thread easy to follow. | Exact scenario and commands. |
| §5 ¶3 | Be ready to defend schema, targeting robustness, error taxonomy, control transfer, and coherence. | These deserve tests and report rationale. | Specific design choices. |
| §5 bullets | Go deep on artifact, replay/error handling, and safety/escalation; cut depth rather than capabilities; document cuts and next steps. | A polished discovery agent with TODO handoff fails the intended cut line. | What is minimal, mocked, or postponed. |

### Section 6 — Deliverables

| Ref | Binding requirement | Implied constraint | Candidate’s call |
|---|---|---|---|
| §6.1 | Public repository with `/README.md` containing setup/run instructions, keys/config, offline/no-live-service mode if applicable, and exact discovery then replay demo commands. | A grader should not reverse-engineer invocation. Secrets must not be committed. | README organization and tooling. |
| §6.2 | `/REPORT.md`, approximately 1–3 pages, using exactly seven named headings. | Concision is evaluated; required reasoning cannot be displaced to an undocumented location. | Content under each exact heading. |
| §6.3 | `/evidence/` with example artifact and logs from discovery and replay. One exceptional replay is ideal; recording is optional. | Committed evidence must be sanitized and prove the discovery was genuinely model-driven. | Evidence formats and whether to include recording. |

### Section 7 — Evaluation criteria

| Rank | Criterion | Grader evidence implied by §7 |
|---:|---|---|
| 1 | System design | Clear boundaries, data models, simplicity/trade-offs; especially artifact schema and replay contract. |
| 2 | Correctness of core loop | Genuine completion of a real goal, deterministic replay, verified success. |
| 3 | Robustness and error handling | Runtime exception handling, three-way taxonomy, targeting, waits, checkpoints. |
| 4 | Human-in-the-loop escalation | Working stuck detection, contextual request, same-session control transfer, and resume—not a TODO. |
| 5 | Generalization | Credible heterogeneous-surface and cross-tenant reuse design without brittle assumptions. |
| 6 | Safety and data handling | Enforced allowlist, conservative risky-action handling, and regulated-data redaction. |
| 7 | Code quality | Readability, reasonable typing/testing, ease of execution. |
| 8 | Communication | Clear rationale, trade-offs, and cuts. |

The order is explicitly approximate, but it is still a prioritization signal (§7).

What graders explicitly do **not** reward, quoted from the final paragraph of §7:

> We do not reward feature breadth, framework name-dropping, or building scaling infrastructure (queues, clusters, multi-tenant plumbing). Designing your core abstractions so they could scale to the real environment is valuable; prematurely building that infrastructure is not. A small, correct, well-argued system is the goal.

The explicit non-reward list is therefore:

| Not rewarded | Scope clarification from §7 |
|---|---|
| Feature breadth | A small integrated vertical slice outranks many partial features. |
| Framework name-dropping | Framework choice has value only through justified boundaries and working behavior. |
| Scaling infrastructure | Queues, clusters, and multi-tenant plumbing are named examples of premature work. Scalable **core abstractions** are rewarded; deployed scale machinery is not. |

### Section 8 — Optional stretch goals

| Ref | Binding scope rule | Optional choices |
|---|---|---|
| §8 opening | Attempt stretch only after a solid core; at most one or two; depth over breadth. | Candidate may choose none. |
| §8 bullets | All are optional: agent-facing catalog/interface, code generation, confidence/approval lifecycle, bounded policy-checked one-step LLM recovery, canonicalization/cross-tenant variant, or multi-run stability. | Select only where it reinforces an already strong core and can be demonstrated. |

### Section 9 — Ground rules

| Ref | Binding rule | Submission risk |
|---|---|---|
| §9 bullet 1 | AI assistance is allowed and expected, but the candidate owns and must explain every submitted part. | Unexplainable generated complexity can fail interview defense. |
| §9 bullet 2 | Do not automate sites contrary to terms, harm services, or use improper real credentials; prefer demos/sandboxes/local for sensitive flows. | A technically successful run can still be unacceptable on ethics/compliance grounds. |
| §9 bullet 3 | Keep secrets out of the repository. | Committed model keys, credentials, cookies, or tokens are submission-critical failures. |
| §9 bullet 4 | Self-time-box; document unfinished work as next steps. | Excessive breadth or hidden incompleteness demonstrates poor judgment. |

### Section 10 — Glossary

Section 10 terms and their direct architectural implications are mapped in [Section 5 of this document](#5-glossary-applied-to-design-implications). The glossary does not loosen any requirements.

### Section 11 — Submission

| Ref | Binding requirement | Implied constraint | Candidate’s call |
|---|---|---|---|
| §11 | Push a public GitHub repository; email its URL to `assignments@interface.ai`; URL must be on its own line; use the application email; do not send a zip. | Local completion is not submission. The candidate—not an automated implementation assumption—must use the correct applicant identity. | Repository URL and timing of final send. |

## 3. Evaluation weights — ranked

| Priority | What to optimize | What loses points |
|---:|---|---|
| 1 | Artifact/replay-centered system design | Accidental framework-shaped boundaries, opaque schema, overbuilt services. |
| 2 | Real discovery and correct deterministic replay | Simulated model decisions, transcript replay, missing checkpoint/output verification. |
| 3 | Deliberate runtime exception behavior | Happy-path-only script, boolean result, blind retries. |
| 4 | Real same-session human handoff | TODO, new session, approval flag without manual control/action capture. |
| 5 | Credible extension/reuse design | DOM-only assumptions, artifact copy-per-tenant, production infrastructure theater. |
| 6 | Enforced policy and sanitized data | Policy described but bypassable; sensitive values in artifact/log/evidence. |
| 7 | Focused, typed, tested implementation | Generated bulk, brittle setup, tests only for trivial utilities. |
| 8 | Concise defensible communication | Framework name-dropping, hidden cuts, unsupported claims. |

The exact non-reward statement is preserved above under Section 7. It makes queues, clusters, and multi-tenant plumbing actively poor priorities unless needed for the small demonstration (§7).

## 4. Must-have vs design-only vs stub-ok seams

Every item in §3.1–§3.7 is classified below. “Stub/mock OK” never overrides an expressly real behavior.

| Ref / item | Classification | Minimum grader-visible proof | Seam / boundary note |
|---|---|---|---|
| §3.1 goal + target input | **Must implement (thin-but-real)** | Runnable input accepts both values. | CLI, API, or function is candidate-owned. |
| §3.1 observe → decide → act | **Must implement (thin-but-real)** | Genuine model decisions and UI actions in discovery logs. | Hard stop on success/max steps/timeout/dead-end. |
| §3.1 live real UI interaction | **Must implement (thin-but-real)** | Evidence of click/type/navigation/read against a rendered live surface. | DOM-only control: **Viable for this take-home** but weaker if architecture requires clean markup. Hybrid/a11y/visual observation: **Viable for this take-home**. Fake tool results: **Not viable / avoid**. |
| §3.2 emit typed serializable artifact after success | **Must implement (thin-but-real)** | Saved schema-valid example produced by discovery. | Raw transcript as artifact: **Not viable / avoid**. |
| §3.2 ordered actions | **Must implement (thin-but-real)** | Artifact steps replay in defined order/branches. | Step IDs support logs and failures. |
| §3.2 target/control identification + robustness reasoning | **Must implement (thin-but-real)** | Targets represented in artifact and resolved on replay; rationale in report. | Single test ID or fixed coordinate only: **Not viable / avoid** as the general strategy. |
| §3.2 typed inputs | **Must implement (thin-but-real)** | At least one validated invocation parameter used in replay. | Example sensitive values must not be baked into artifact. |
| §3.2 typed outputs | **Must implement (thin-but-real)** | At least one declared output returned in the documented shape. | Output declaration and result must agree. |
| §3.2 checkpoint/success condition | **Must implement (thin-but-real)** | Replay asserts an observable expected state. | “Last click completed” alone is insufficient. |
| §3.2 versioned/reviewable contract | **Must implement (thin-but-real)** | Schema/artifact version and readable capability metadata. | Full registry/migration service: **Viable only as design story**. |
| §3.3 artifact + inputs, no LLM decisions | **Must implement (thin-but-real)** | Replay runs with model access absent/disabled and still completes. | Open-ended recovery model in core replay: **Not viable / avoid**. |
| §3.3 stable targeting | **Must implement (thin-but-real)** | Resolver uses deliberate target evidence and validates matches. | Multiple deterministic candidates: **Viable for this take-home**. |
| §3.3 checkpoint verification + declared outputs | **Must implement (thin-but-real)** | Structured successful result includes outputs only after checks pass. | — |
| §3.3 runtime-condition detection | **Must implement (thin-but-real)** | At least one representative condition is exercised; schema/executor deliberately represents the named classes. | Implementing every named UI state is not explicitly required, but claiming only future handling is too weak. |
| §3.3 validation error example | **Must implement as an explicit detectable category when present; demonstration may use a representative subset** | A validation response cannot be mistaken for successful navigation; classify it as a business outcome or failure according to the capability contract. | The list is introduced as examples, so a bespoke demo for every example is not mandated. |
| §3.3 “record not found” example | **Must implement (thin-but-real) as the clearest business-outcome case** | A typed non-failure outcome reaches the caller. | Especially high-value because §3.3 and §10 both emphasize it. |
| §3.3 permission denial example | **Must implement as an explicit detectable category when present; demonstration may use a representative subset** | Stop rather than continue blindly; return a clear failure/outcome or escalate according to the contract. | Do not attempt to bypass permissions. |
| §3.3 unexpected dialog example | **Must implement as an explicit detectable category when present; demonstration may use a representative subset** | A known dialog may have bounded deterministic handling; an unknown/risky dialog stops or escalates. | Known dismiss/retry: **Viable for this take-home**. Blind dismissal: **Not viable / avoid**. |
| §3.3 session/timeout expiry example | **Must implement as an explicit detectable category when present; demonstration may use a representative subset** | Do not type persisted credentials or continue in an invalid session; recover only through an approved bounded path, otherwise stop/escalate. | Production re-authentication service: **Viable only as design story**. |
| §3.3 transient slowness or failed load example | **Must implement as an explicit detectable category when present; demonstration may use a representative subset** | Use condition-based bounded waits/retries, then convert exhaustion to a hard failure. | Fixed sleeps as the only wait strategy: **Not viable / avoid**. |
| §3.3 outright app error example | **Must implement as an explicit detectable category when present; demonstration may use a representative subset** | Capture sanitized observed state and stop or return a declared business outcome if the app response is known. | Continuing after an unclassified app error: **Not viable / avoid**. |
| §3.3 business outcome | **Must implement (thin-but-real)** | Example such as not-found returns a typed non-failure result. | — |
| §3.3 recoverable condition | **Must implement (thin-but-real)** | Bounded known recovery is implemented/tested, even via controlled fault injection. | Blind or unlimited retry: **Not viable / avoid**. |
| §3.3 hard failure | **Must implement (thin-but-real)** | Safe stop with step, expected, observed, and evidence reference. | — |
| §3.3 structured result union | **Must implement (thin-but-real)** | Success / business outcome / failure are machine-distinguishable. | A thrown string or boolean: **Not viable / avoid**. |
| §3.4 configurable target/action allowlist | **Must implement (thin-but-real)** | A disallowed target/action is denied before execution. | Config-only without enforcement: **Not viable / avoid**. |
| §3.4 safe vs risky actions | **Must implement (thin-but-real)** | Action risk is classified and risky path blocks/confirms/escalates. | Exact policy is candidate-owned. |
| §3.4 no persisted secrets/raw sensitive data | **Must implement (thin-but-real)** | Artifacts/logs/evidence use placeholders or redacted values; tests cover redaction where it counts. | “Use fake data” helps but does not replace a redaction mechanism. |
| §3.5 structured action/reason logs | **Must implement (thin-but-real)** | Discovery and replay evidence is correlated by run/step. | — |
| §3.5 richer failure signal | **Must implement (thin-but-real)** | Sanitized screenshot, DOM snapshot, or trace is captured on failure. | Any one named signal: **Viable for this take-home**. |
| §3.6 detect and route | **Must implement (thin-but-real)** | A real trigger creates a contextual intervention request. | Routing can be local/in-process; production queue: **Viable only as design story**. |
| §3.6 same live session manual control | **Must implement (thin-but-real)** | Automation pauses; a person can manipulate the existing session; evidence shows it. | New-session workaround: **Not viable / avoid**. |
| §3.6 hand control back/resume or complete | **Must implement (thin-but-real)** | Explicit resume returns ownership and continues safely or validates completion. | — |
| §3.6 preserve context/evidence and record human actions | **Must implement (thin-but-real)** | Intervention and operator actions appear in the same run history. | Capture can be minimal but cannot be omitted. |
| §3.6 control ownership model | **Must implement (thin-but-real)** | State/owner prevents concurrent automation and human actions. | Explicit state machine/lease: **Viable for this take-home**. Distributed coordination: **Viable only as design story**. |
| §3.6 polished real-time operator console | **Stub/mock OK if seam is real** | Bare/mock surface can display context, expose the live session, and signal resume. | Mock visual polish: allowed. Mock pause/control/resume: **Not viable / avoid**. |
| §3.7 one concrete surface implementation | **Must implement (thin-but-real)** | Core slice works on one selected surface. | Multiple surfaces are not required. |
| §3.7 surface abstraction and legacy/desktop extension | **Design in `REPORT.md` only** | Required report explains seam; implemented artifact/actions do not make the story impossible. | Desktop adapter implementation: **Viable only as design story** unless it is the one chosen surface. |
| §3.7 multi-tenant reuse/specialization | **Design in `REPORT.md` only** | Required report explains base identity plus safe tenant/version variation. | Multi-tenant service/plumbing: **Not viable / avoid** for core scope. |
| §3.7 tenant/version drift detection/management | **Design in `REPORT.md` only** | Required report explains compatibility checks, telemetry/validation, and override/re-record decisions. | Full fleet rollout system: **Viable only as design story**. |
| §3.7 core abstractions avoid a dead end | **Must implement (thin-but-real), cross-cutting** | Artifact is not merely raw Playwright/Selenium commands with tenant-specific values; surface-specific details have a boundary. | An empty interface with no exercised adapter is too superficial. |

## 5. Glossary applied to design implications

Only the nine terms defined in §10 are included.

| §10 term | Definition consequence | Constraint on the proposed design |
|---|---|---|
| Computer use | The LLM reads a screen/page and clicks/types as a person would rather than calling an API. | Discovery evidence must show actual UI observation/action. Browser or OS UI control is **Viable for this take-home**; replacing the target interaction with direct API calls is **Not viable / avoid**. |
| DOM | Browser structure may be meaningful and stable, but legacy DOMs often are not. | DOM can provide observations/evidence, but the capability contract should not require clean semantic markup. DOM-assisted execution is **Viable for this take-home**; clean-DOM dependence is **Not viable / avoid** for the claimed architecture. |
| Accessibility tree | Browsers and operating systems expose a screen-reader-oriented representation that may be more stable and spans web/desktop. | It is a credible surface-adapter observation/target source and a bridge in the heterogeneity story. Accessibility-first or hybrid targeting is **Viable for this take-home**, subject to the chosen target exposing useful nodes. |
| Locator / selector | Target choice determines replay longevity. | The artifact needs deliberate, reviewable target descriptors and deterministic resolution/validation, not unexplained generated selectors. |
| Test ID | Legacy enterprise applications rarely provide automation-specific attributes. | A demo may incidentally contain test IDs, but relying on them as the only locator evidence undermines the real-environment claim. Test-ID-only design is **Not viable / avoid**. |
| Deterministic replay | The same recorded flow runs with no model deciding steps. | The replay engine may evaluate predefined conditions and bounded recoveries, but cannot ask an LLM what to do next. |
| Checkpoint | An assertion proves the expected state was reached. | Every successful capability needs a declared observable postcondition; important intermediate/risky transitions also benefit from checks. |
| Business outcome vs. failure | A legitimate negative answer such as “no such member” is not a crash. | Encode a result union with machine-readable business outcomes separate from recovery events and hard failures. |
| Tenant | One institution among hundreds, often sharing configured variants of vendor software. | Capability identity should support reusable vendor-level definitions plus bounded tenant/version bindings or overrides; do not hard-code one institution’s routes, branding, or values into the logical flow. |

## 6. Cut-line guidance from Section 5

| Keep deep and real | Keep thin but real | Design or mock deliberately | Cut/avoid |
|---|---|---|---|
| Artifact schema and invocation/result contract (§5) | One genuine goal-driven discovery loop (§3.1, §4) | Bare operator presentation layer around real handoff (§3.6) | Second/third target apps before the core is complete (§5, §7) |
| Deterministic target resolution, waits, checkpoints, output extraction (§3.3, §5) | One successful parameterized replay and at least one exceptional path (§3.3, §6) | Desktop adapter beyond its interface (§3.7) | Queues, clusters, production orchestration (§7) |
| Three-way outcome/error taxonomy and diagnostics (§3.3, §5) | Enforced allowlist and risky-action gate (§3.4) | Multi-tenant inheritance/drift machinery (§3.7) | Polished co-browsing UI (§3.6) |
| Pause/ownership/resume model and same-session handoff (§3.6, §5) | Structured logs plus one richer failure signal (§3.5) | External operator routing/notification service (§3.6) | Open-ended LLM fallback during replay (§3.3; optional bounded fallback only under §8) |
| Redaction boundaries across artifact/log/evidence (§3.4) | One local/demo target with synthetic data (§4, §9) | Production artifact registry, approvals, and migrations unless chosen as stretch (§3.2, §8) | Feature breadth and framework exhibition (§7) |

Cut-line rule: never remove an entire Section 3 capability to polish another. Reduce UI polish, supported action types, exception examples, adapters, and infrastructure while retaining a demonstrably real thread through every core requirement. In `REPORT.md` heading **Cuts**, name each deliberate omission, why it was lower value, and the next concrete extension (§5, §6).

## 7. Deliverable path contract

| Exact path / action | Exact required content |
|---|---|
| Public repository source tree | Source code is required in the public repository, but §6 does not prescribe an exact source-directory name. |
| `/README.md` | Setup and run instructions; all keys/config needed; how to run without live services if applicable; exact commands for discovery on a goal and deterministic replay of the artifact (§6.1). |
| `/REPORT.md` | Approximately 1–3 pages and the seven headings below, using the stated names (§6.2). |
| `/evidence/` | Saved example artifact; discovery-run logs; replay-run logs. An exceptional replay is ideal. Screen recording optional (§6.3). |
| Public GitHub repository | Source and deliverables publicly accessible (§6, §11). |
| Email | Send repository URL on its own line to `assignments@interface.ai`, from the application email; no zip (§11). |

The exact `/REPORT.md` headings, in order:

| # | Exact heading | Required coverage |
|---:|---|---|
| 1 | `Architecture` | Architecture, key decisions, and trade-offs. |
| 2 | `Artifact schema` | Schema and rationale. |
| 3 | `Determinism & error handling` | Deterministic replay; runtime errors/exceptional states; secondarily UI drift. |
| 4 | `Heterogeneity & multi-tenant` | Legacy web/desktop extension and artifact reuse across institutions on the same app. |
| 5 | `Escalation & handoff` | Stuck detection, same-session human control, and return of control. |
| 6 | `Safety` | Guardrail model and limits. |
| 7 | `Cuts` | Deliberate omissions and what comes next. |

Do not substitute synonymous heading names. Additional subheadings may improve readability, but must not obscure these seven required top-level sections.

## 8. Ground rules that can fail a submission

| Failure mode | Why it is submission-threatening | Source |
|---|---|---|
| Fake/scripted “discovery” or no genuine model-run evidence | The one explicitly non-candidate choice is a real LLM-driven run against a live surface. | §4 |
| LLM makes production replay decisions | Violates the central discover-once/replay-deterministically model. | §2, §3.3 |
| Human gets a fresh session or cannot actually control/resume | Violates same-live-session handoff; a TODO/mock state transition is insufficient. | §3.6, §7 |
| Secrets, tokens, credentials, full PII, or sensitive raw screenshots/logs are committed | Violates both core safety and repository ground rules. | §3.4, §9 |
| Unauthorized/harmful automation or use of real bank credentials/data | Violates target and compliance ground rules regardless of technical merit. | §4, §9 |
| Allowlist exists only in prose/config and is bypassable | Requirement says enforce; the agent must not act outside it. | §3.4 |
| Happy-path-only replay or conflated not-found/crash result | Directly misses core robustness and a highly weighted criterion. | §1, §3.3, §7 |
| Raw transcript or generated script is the only artifact contract | Misses typed, versioned, reviewable, agent-invocable schema decoupled from transcript. | §2, §3.2 |
| Missing exact paths/headings or irreproducible commands | Violates grader side-by-side deliverable contract. | §6 |
| Candidate cannot explain generated code/design | AI assistance is allowed, but ownership and detailed defense are required. | §9 |
| Private repository, zip submission, wrong email identity/format | Violates explicit final submission instructions. | §11 |
| Broad infrastructure with missing core seams | The brief explicitly does not reward scaling infrastructure and requires every core capability. | §5, §7 |

## 9. Stretch goals

Rule: zero is acceptable; one is preferable to two; two is the maximum; none starts until the complete core/evidence thread is solid (§8).

| Stretch | When it is allowed / useful | Guardrail |
|---|---|---|
| Agent-facing capability interface | After artifact input/output contract and replay are stable; reinforces “agent-invocable.” | Keep it a thin catalog/tool endpoint, not a platform. |
| Code generation | Only if it proves the artifact is a useful intermediate representation. | Generated code must not replace artifact replay. |
| Confidence and approval | If multi-run evidence already exists and approval state strengthens conservative execution. | Do not substitute an approval label for observed reliability. |
| Assisted fallback | If deterministic failure behavior and policy enforcement are already complete. | Exactly bounded, policy-checked single-step recovery; record evidence; never open-ended. |
| Canonicalization/cross-tenant reuse | If the base artifact and one variant can be demonstrated without building tenant infrastructure. | Prefer one safe override example, not fleet plumbing. |
| Multi-run stability | If runs are inexpensive/reliable and the signal can identify flakiness. | Do not spend core effort chasing a vanity pass count. |

Best alignment with the stated evaluation, if core quality is already high, is likely either one small agent-facing invocation surface or one cross-tenant/canonicalization demonstration. That is guidance, not a stack or scope lock.

## 10. Ambiguities and human-gate questions

These questions are not excuses to defer binding work. They are gates only where a silent assumption could materially alter the demonstration or grader interpretation.

| Source | Question requiring an explicit decision | Why silent assumption is risky | Analyst default pending human choice | Human gate? |
|---|---|---|---|---|
| §4 target application; “live surface” | Is a locally hosted, rendered proxy application accepted as the live surface for genuine discovery evidence? | §4 expressly permits a local app/mock, but an overly scripted toy can look like fake discovery. | Use a local, non-trivial, legacy-like rendered app with real state transitions and synthetic data; document that only the business system is mocked, not UI operation or model discovery. | **Yes**—confirm target before implementation lock. |
| §3.1, §4 model access | Which model/provider can perform the genuine run and be reproduced by the candidate? | The discovery run cannot be faked; unavailable keys/provider-specific APIs can invalidate evidence. | Keep the model adapter narrow and select an actually accessible computer-use-capable model. | **Yes**—credential availability is external. |
| §4 computer-use bias | Must the implemented mechanism be visual/OS-level, or is accessibility/DOM-assisted control acceptable? | All are explicitly allowed, but a clean-DOM-only demo may underperform the heterogeneity criterion. | Use a surface boundary and at least accessibility or visual state in discovery/target evidence; do not depend exclusively on test IDs. | No—candidate call, but rationale required. |
| §3.2 artifact generation | How much automatic compilation from discovery is required versus a reviewed intermediate conversion? | “After a successful run, emit” implies a system-produced artifact; hand-authoring it afterward weakens the causal proof. | Automatically derive the saved artifact from recorded actions/model tool calls, validate it, and permit explicit review—not manual replacement. | No. |
| §3.3 named runtime errors | Must every listed example be implemented and demonstrated? | The text says handle errors explicitly, while evidence says one exceptional replay is “ideal.” Treating all as optional is too weak; implementing six UI fixtures may waste scope. | Implement and demonstrate one business outcome, one bounded recovery, and one hard failure; represent additional named classes in the schema/report and test detectors where cheap. | No—defensible cut required. |
| §3.4 risky action | Should the demo submit a state-changing transaction or stop at review/confirmation? | A fake bank-like final submit increases safety complexity; stopping too early may avoid proving risky-action handling. | Reach confirmation, classify final commit as risky, and force human confirmation/escalation; use synthetic/local state if completing it. | **Yes**—scenario/safety policy affects the vertical slice. |
| §3.6 operator control | What minimum operator surface proves “take control” in a headless/cloud environment? | A resume button alone is insufficient; a full console is out of scope. | A bare same-session view/control endpoint or headed-session handoff that logs manual actions and ownership transitions. | **Yes**—execution environment determines feasible control. |
| §3.6 identity/control | Is a single local operator identity acceptable? | Hundreds of users/roles are not requested, but control ownership must be known. | One explicit synthetic operator identity plus ownership/audit state; describe production auth only. | No. |
| §3.7 reuse | Must code include tenant overlays, or is report design enough? | Section title says design, not necessarily build, and explicitly says multi-tenant implementation is not expected. | Keep artifact identity/bindings extensible; explain overlays/drift in report; do not build tenant plumbing. | No. |
| §6 evidence | How can model authenticity be shown without exposing private prompts, keys, cookies, or PII? | Weak evidence looks scripted; excessive evidence leaks data. | Commit sanitized model decision/tool-call events, timestamps/run IDs, artifact provenance, and redacted richer signals. | No. |
| §6 exceptional replay | “Ideally” makes the evidence example optional, but §3.3 error handling is mandatory. | Omitting exceptional evidence makes a high-weight claim difficult to assess. | Include at least one exceptional replay despite “ideally.” | No. |
| §6 report headings | Can the report contain content beyond the seven headings? | Side-by-side grading asks for exact headings. | Use exactly the seven as top-level headings; only concise subheadings if needed. | No. |
| §11 submission | Who makes the final public-repo/email submission? | Correct applicant email identity is required and should not be guessed by an automation agent. | Candidate performs final email after repository sanitation and verification. | **Yes**—human-owned external submission. |

## 11. Thinking protocol — recommended interview-shaped vertical slice

| Protocol field | Analyst read |
|---|---|
| **Normative option** | Build one local, synthetic “member servicing” proxy with an intentionally legacy-like multi-step UI: search → member detail → prepare a reversible change or reach a confirmation/review screen. A genuine LLM discovery run observes and acts through the rendered UI, then emits a typed capability with a synthetic member-ID input, a typed detail/confirmation output, target descriptors, and checkpoints. Deterministic replay demonstrates success plus not-found; a controlled slow/interstitial or injected app error demonstrates bounded recovery/hard failure. A risky final action triggers an intervention request; automation pauses, a human operates the same live session, then explicitly resumes/completes. Commit sanitized evidence for discovery, successful replay, and exceptional replay. Local hostile web proxy plus a surface adapter: **Viable for this take-home**. |
| **Contrarian option** | Use a public sandbox and a strongly visual screenshot/coordinate computer-use path to maximize external realism and reduce DOM assumptions. Deterministic replay could use fixed visual anchors/template matching rather than model decisions. This can better signal legacy-surface intent, but public ToS/network variability, evidence reproducibility, deterministic visual targeting effort, and same-session handoff complexity can crowd out the higher-weight artifact/error/control work. Public compliant sandbox with hybrid visual targeting: **Viable for this take-home** if access is stable. Pure fixed coordinates: **Not viable / avoid** as the only robustness strategy. |
| **Rejected options** | (1) Script discovery and fabricate model logs—violates §4. (2) Replay the raw transcript—violates §2/§3.2. (3) Ask an LLM to decide every replay step—violates §3.3. (4) Use only test IDs on a clean toy form—poor evidence for §1/§3.7. (5) Build queues, clusters, tenant provisioning, or a polished co-browsing console before the core—explicitly unrewarded by §7. (6) Claim handoff by opening a fresh browser or merely toggling an approval flag—violates §3.6. All: **Not viable / avoid**. |
| **Frontier reference** | High-level only: current computer-use systems commonly combine multimodal or structured UI observation with constrained action tools, but this assignment’s distinctive requirement is to compile one successful model-guided run into a reviewable intermediate capability and remove model decisions from routine execution (§2, §10). A provider-specific autonomous CUA demo alone therefore does not solve the artifact/replay, policy, taxonomy, or ownership problems. No external frontier claims or sources are relied upon here. |
| **Interview grader lens** | The slice should provoke defensible questions about why target evidence survives legacy markup, how artifact versions and parameter/output contracts work, how a not-found result differs from a crash, where retries stop, how policy gates every action, who owns the session during handoff, what operator action was audited, and how one vendor-level capability could be specialized safely. Those questions align with the top six §7 criteria. |
| **Recommendation (not a stack lock)** | Prefer the normative local legacy-like browser slice because it controls data, failure injection, reproducibility, and same-session handoff while leaving enough depth for the load-bearing contracts. Make the model discovery undeniably real and avoid test-ID dependence so “local” does not become “scripted toy.” Keep surface control behind an exercised boundary and describe accessibility/desktop and tenant overlays in the report. This is requirements guidance; the stack and exact control mechanism remain candidate calls under §4. |
| **Human gate?** | **Yes.** Before implementation lock, a human should confirm (a) local proxy versus compliant public target, (b) available model/API access, and (c) whether the risky final action is blocked, human-confirmed, or executed only against synthetic local state. These choices materially shape evidence and grading; they should not be silently assumed. |

## Final completeness check

| Brief area | Covered here |
|---|---|
| Sections 1–11 decomposed | Section 2 |
| Ranked evaluation and explicit non-reward quote | Section 3 and §7 decomposition |
| Every §3.1–§3.7 item classified | Section 4 |
| Only §10 glossary terms applied | Section 5 |
| Depth/breadth cut line | Section 6 |
| Exact deliverable paths/headings | Section 7 |
| Submission-failing ground rules | Section 8 |
| Stretch cap and ordering | Section 9 |
| Grading-sensitive ambiguities/gates | Section 10 |
| Interview-shaped thinking protocol | Section 11 |
