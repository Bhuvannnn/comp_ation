# Cross-review: `alternatives_matrix.md` (adversarial) + `frontier_computer_use.md` (supporting)

**Reviewer:** `claude-opus-5-thinking-high` (Claude family)
**Review date:** 2026-08-16
**Source of truth:** `/workspace/Project.md` §§3, 5, 7 (read in full), plus §1 for the environment premises.

| Reviewed file | Author family | My stance | Council plan says |
|---|---|---|---|
| `research/alternatives_matrix.md` | GPT (`gpt-5.6-sol-xhigh`) | **Adversarial** | Adversarial = Claude (`claude-opus-5-thinking-high`) — matches |
| `research/frontier_computer_use.md` | Grok (`cursor-grok-4.6-high-fast`) | **Supporting** | Plan lists Claude as *adversarial* here and GPT as supporting — **deviation, disclosed** |

Two disclosures that affect how much weight to give this review:

1. **Family-independence caveat.** `research/tech_stack.md` was written by the same model as this review (`claude-opus-5-thinking-high`). Where my conclusions coincide with that file — the LangGraph rejection, the three-part versioning model, the target-app recommendation — that is *not* independent corroboration. I have re-derived each of those from the brief and from primary sources rather than citing the sibling file as authority, and I flag every coincidence explicitly below.
2. **No PRD, no lock.** This file argues and ranks. It does not close G1/G2/G3/G7/G8/G12. Recommendations are inputs to those gates.

---

## Verdict up front

**Does DOM-first `A` survive as #1 after adversarial pressure? In substance yes; as written and as labelled, no.**

The architecture that ends at #1 is not the one in the matrix's row 1. It is `A` with three amendments that the matrix's own G2 recommendation already half-concedes: a11y-first *targeting* (not DOM-derived targeting), hybrid *observation* (a11y projection plus a bounded interactable-DOM overlay, screenshot secondary), and B's `semanticFingerprint` and backend-neutral control target folded into the schema. Call it **A′**. The label "DOM-first" does not survive contact with §3.1's "bias toward an approach that would still work when the surface has no clean DOM" — but the engineering underneath it (TypeScript, Playwright, hand-rolled reducer, one process, filesystem artifacts) survives every attack I could mount.

The ranking that survives is not a re-ordering of six peers. It is a **collapse of the option set from six to three**, because two of the six are not architectures at all: `B` is `A` plus a framework bundle, and `F` is `C` with the compiler deleted.

| Matrix rank | Architecture | Rank after pressure | What changed |
|---:|---|---:|---|
| 1 | A. Thin TS/Playwright DOM slice | **1, as `A′`** | Survives the *stack* attack, loses the *perception* framing and the schema as sketched. Absorbs B's semantic target + fingerprint. |
| 2 | B. A11y-first capability graph | **merged into `A′`; the framework bundle → rejected** | The a11y-first thesis wins and is promoted into #1. LangGraph + OPA/Rego + SQLite checkpointer is separately rejected on a verified resume-semantics hazard, not on taste. |
| 3 | C. Screenshot CUA → compiled replay | **2, but demoted from "architecture" to "channel"** | Correct as a *bounded fallback perceive channel inside `A′`*, and as a design-story answer for bitmap surfaces. As a standalone architecture it is a second targeting system for one demo. |
| 4 | D. Local Electron proxy | **3, unchanged and still conditional** | No new attack. Still gated on a pre-existing target. |
| 5 | E. Native Windows UIA | **4, unchanged, design-only** | No new attack. Environment gate is decisive, not the design. |
| 6 | F. Raw visual macro tape | **killed — and reclassified** | Kill agreed. But F is a strawman, it pads the option count, and the wholesale kill needs a carve-out for VDI/Citrix bitmap surfaces or it damages the §3.7 honesty story. |

The matrix's headline claim — "A is #1 from an explicit grader-weighted expected-value judgment" — **holds**. My attacks land on the perception framing, the scoring method, and the schema sketch. None of them land on the choice of a single-process TypeScript/Playwright slice, and I tried.

---

# Part I — Adversarial review: `alternatives_matrix.md`

## A1. Is `A` (DOM-first) vs `B` (a11y-first) a false dichotomy?

**Largely yes, and the document convicts itself.**

Three separate axes are bundled into one A/B choice:

| Axis | `A` as written | `B` as written | Actually coupled? |
|---|---|---|---|
| Discovery observation format | "DOM-derived interactable summary" | `page.ariaSnapshot({mode:'ai'})` | **No.** One Playwright call apart. Nothing else in either design depends on it. |
| Artifact target model | Playwright-locator-shaped `SemanticLocator` | Backend-neutral `ControlTarget` with `backendHints.windowsUia` | **No.** A type definition plus a resolver function. Costs a page of code. |
| Orchestration + policy machinery | Hand-rolled reducer, no policy engine | LangGraph + SQLite checkpointer + OPA/Rego Wasm | **No.** Wholly independent of the first two. |

The ranking treats these as one dimension, so choosing `A` silently rejects a free win (backend-neutral targets) and choosing `B` silently buys an expensive one (the framework bundle). That is the definition of a false dichotomy: the option set does not contain the best point in the space.

**The document already knows this.** Its own G2 answer is "hybrid observation with A as the action/replay core: DOM plus ARIA summary during discovery, screenshots as secondary evidence; semantic locators on replay," and its G3 answer is "Stack A. Add one B idea — the backend-neutral semantic target — without adopting B's frameworks." That combination is not row 1 and it is not row 2. It is `A′`, and it is unranked and unnamed in a document whose purpose is to rank architectures. The comparison table should have contained it.

**Now the harder question: does `A`-as-written actually fail §3.1's no-clean-DOM bias?**

Partly, and the matrix's defence is a dodge. Row 1's residual risk reads: "A clean browser adapter *can look less representative* of hostile/native systems" (emphasis mine). That frames a design objection as a presentation problem. The design objection is real:

- On a frameset/nested-table/no-test-ID surface, a *DOM-derived* interactable summary is a summary of exactly the markup the brief says you cannot trust. Wrapper churn, `<div onclick>`, and positional `nth-child` paths are what a DOM-derived observation surfaces to the model, and the model will then propose targets in those terms — which the compiler must reverse-engineer into semantics after the fact.
- The a11y tree is not magic and is not DOM-independent (it is a browser-computed projection *of* the DOM, with implicit-role and label-association heuristics). Its actual advantage is narrower and better than "it survives dirty DOM": it is keyed on **what a human operator perceives** — role plus accessible name — which is (i) the thing the brief says is the only reliable surface, (ii) stable across the cosmetic re-skinning that distinguishes tenants running the same vendor product, and (iii) **the same abstraction that exists on Windows UIA, macOS AX, and AT-SPI**, which is the §3.7 seam.

Point (iii) is the argument that decides it, and it is a §3.7 argument, not a §3.1 one. If the artifact names controls the way UIA names controls, the desktop adapter is a resolver swap. If the artifact names controls the way CSS names elements, the desktop adapter is a rewrite. That is the whole ballgame for "the core abstractions must not paint you into a corner."

**Where `A` is right and `B` is wrong on this axis** — and the matrix does not say it, so I will:

`page.ariaSnapshot()` is **lossy in precisely the hostile case the brief names**. Layout tables get genericised or pruned, `<div onclick>` handlers have no role, unlabeled inputs have no accessible name, and presentational markup is filtered out by design. A pure a11y observation can *hide the actionable element* on a legacy page. So "a11y-first" must never mean "a11y-only." The correct observation is a **merge**: the a11y projection as the spine, plus a bounded overlay of nodes that are clickable/focusable but role-less or name-less, plus explicit frame ancestry on every node. That is `frontier_computer_use.md`'s contrarian option 3, and it belongs in the default, not in a list of alternatives.

**Finding A1.** False dichotomy on the two axes that matter (observation format, target model); genuine and non-false on the third (framework bundle). Merge `A` and `B`'s targeting thesis into `A′`; keep the framework rejection as a separate, argued decision (A2). The matrix should be amended to rank `A′` at #1 and to state `B`'s frameworks as a rejected sub-option rather than as a rival architecture.

---

## A2. Is LangGraph in `B` overbuild under §7?

**Yes — and on a verified mechanism, not on framework aesthetics.** This is the strongest single attack in this review.

### The mechanism

LangChain's official LangGraph JS docs (accessed 2026-08-16) state:

> "The node restarts from the beginning of the node where the `interrupt` was called when resumed, so any code before the `interrupt` runs again."

and, under *"Side effects called before `interrupt` must be idempotent"*:

> "As an example, you might have an API call to update a record inside of a node. If `interrupt` is called after that call is made, it will be re-run multiple times when the node is resumed, potentially overwriting the initial update or creating duplicate records."
> — <https://docs.langchain.com/oss/javascript/langgraph/interrupts>

Now apply that to this system. The natural HITL pattern for §3.4's risky-action class is *"reach the confirmation screen, then interrupt for human approval."* If the interrupt sits in the same node as the actions that reached that screen, resume re-executes those actions against a **live banking UI**. LangGraph's own mitigations are "use idempotent operations before `interrupt`," "place side effects after `interrupt`," and "separate side effects into separate nodes." Every one of those is a constraint you must now hold in your head while designing a graph whose nodes are, by construction, side effects on a stateful UI.

`B` as written places `interrupt()` after a lease mutation, which is idempotent and therefore safe. That is fine — but it is safe by accident of that one node's contents, and nothing in `B`'s design *enforces* the discipline. In a system where "re-run the node" means "re-click the button," a framework whose documented resume semantics are "re-run the node" is a hazard you are choosing to import.

### What the framework actually buys, and whether it applies

LangGraph's differentiating feature over a hand-rolled reducer is **durable checkpointing across process boundaries**. `B` concedes, in its own words, that this does not apply here:

> "SQLite checkpoints aid inspection and orchestration resume, but do not by themselves preserve a live browser; the browser process/handle remains owned by the run."

and

> "The lease is essential: a graph checkpoint alone is not same-session control transfer."

So: the durability feature does not cover the resource the brief's HITL requirement is about, and the mechanism that *does* cover it — the actuator lease — is hand-rolled in both `A` and `B`. The live browser session dies with the process; the durability boundary is therefore the process, and a process-durable checkpointer is solving a problem this system does not have. `B` pays the dependency cost, the resume-semantics hazard, and the reviewer's-attention cost, and receives a feature it explicitly says is insufficient.

For a *replay* graph, LangGraph provides node registry, edge routing, state reducers, and streaming. Against an artifact that is already a declarative step list with declared transitions, that is an interpreter loop — a few hundred lines with better error messages, no version churn, and no startup assertion needed to prove the LLM is absent. `B` has to add exactly such an assertion ("a startup assertion rejects graphs containing discovery-only node types") to convince a reader that "LangGraph" does not imply "model in the loop." A hand-rolled replay binary that never imports an LLM client needs no assertion; the absence is structural and visible in the import list. **The framework creates the doubt that the assertion then has to dispel.** That is a net negative for §7's "correctness of the core loop" and for the write-up.

### OPA / Rego — a separate and in some ways worse problem

Policy-as-code is a *good instinct* and genuinely how a bank would do this at scale: one evaluator for discovery and replay, decision IDs in evidence, policy digests in results. `B` gets all of that right conceptually and I want it preserved. But compiling Rego to Wasm and evaluating it in-process, for this deliverable, has a specific defect:

**it makes the safety model less reviewable by the only audience that matters.** §3.4 and §7 are asking a grader to assess your guardrail model. If that model is expressed in Rego, the grader must read Rego to audit it. The allowlist the brief actually describes — permitted origins/routes, permitted action kinds, a risk class ladder, an irreversible-action gate — is a closed, small, statically-typed decision function. Written as ~40 lines of TypeScript with a discriminated-union input and an exhaustive switch, it is auditable at a glance, unit-testable branch by branch, and impossible to drift from the types the rest of the system uses. The "same evaluator on both paths" property comes from calling the same function, not from adopting a policy engine.

Keep from `B`: `policyRef: { id, digest }` in the artifact, policy decision IDs in evidence, and one sentence in `REPORT.md` §6 naming OPA/Rego as the swap-in when policy authorship must move outside the codebase. That is the credit without the cost.

### Scoring implication

`B`'s **8/10** is inflated because the score is applied to a bundle whose two halves point in opposite directions. Unbundled: the semantic `ControlTarget` + `semanticFingerprint` + explicit recovery edges are worth **+1 over `A`** and should be promoted into `A′`. The LangGraph + SQLite + OPA/Rego layer is worth **−1.5** against §7's explicit "we do not reward … framework name-dropping" and against the resume hazard above. `B`-as-bundled is a 6.5, not an 8, and `B`-unbundled is just `A′`.

**Finding A2.** LangGraph is overbuild here on a documented mechanism — resume re-executes the node, and the nodes are UI mutations — and its one differentiating feature is one `B` itself declares insufficient for the live-session requirement. Reject the framework bundle; promote `B`'s type-level ideas; name LangGraph and a durable-execution engine in one `REPORT.md` §5 sentence as the swap-in for approvals that must outlive the process. *(This conclusion coincides with `tech_stack.md` §6.3, written by the same model as this review — treat the coincidence as one opinion, not two. The primary-source verification above is the part that is independent.)*

---

## A3. Is MemberDesk a good proxy, versus a public demo site and its ToS?

**Right as the primary target. Wrong as the only target. And the matrix argues against the public-site category without ever naming a candidate in it, which is not an argument.**

### Where the matrix is correct

The case for a controlled local target is strong and I will not undercut it: §3.3 requires the replay to detect and respond to validation errors, not-found results, permission denials, unexpected dialogs, session timeout, and slow loads; §6.3 asks for evidence of at least one replay that hits an error state. **You cannot make a third-party site produce those on demand, reproducibly, in a specific order, in front of a grader.** Deterministic fault injection is not a convenience here, it is the only way the highest-weighted robustness criterion becomes demonstrable rather than described. Add zero ToS exposure, zero network dependency, and the two-tenant-variant trick that turns §3.7's multi-tenant claim into a running demo, and the choice is close to forced.

### Four attacks

**(1) A self-authored target is a self-graded exam, and the matrix offers no mitigation.** The candidate controls both the lock and the key. The natural grader suspicion — that the fixture was tuned until the agent succeeded — is exactly the suspicion `A`'s own kill criterion gestures at ("if the LLM is merely being handed selectors rather than discovering the task"), but the document names the risk and then stops. Mitigations are cheap and should be *requirements*, not residual risks:

- **Freeze before discovery.** Commit and tag the fixture before the first real discovery run; never touch it afterwards to make replay pass. The git history is the proof, and it costs nothing.
- **Run against one surface you did not author.** See (3).
- **Keep fixture-specific vocabulary out of the agent prompt.** If the system prompt names MemberDesk's labels, discovery is theatre.
- **Ship the fixture's source in the repo** so a grader can read how hostile it actually is.

**(2) The complexity scores are accounted inconsistently, and `A` is the beneficiary.** `D` is penalised for "creating/packaging a credible target," `E` for "a target fixture," `C` for needing a "visually clear but semantically hostile" variant. `A` is scored **Medium** — "one process, one browser, one schema, and one replay engine" — with the MemberDesk build cost outside the boundary, even though `A`'s own row depends on a "locally served hostile-ish MemberDesk: server-rendered tables, one iframe, no test IDs, synthetic data, and deterministic fault injection," and the shared preamble adds fault switches for five distinct runtime states plus a confirmation screen. Building a *convincingly* legacy-shaped app — frameset, postback page reloads so element identity is genuinely rebuilt, duplicate/empty accessible names, a scheduled interstitial, a deterministic session timeout, two branded variants — is a real subsystem competing directly with the schema/replay/HITL budget. Either price it in every row or price it in none; pricing it in `C`/`D`/`E` and not in `A` flatters the winner.

**(3) The "public site" option is dismissed as a category, with no candidate evaluated.** The matrix's G1 says only "less fixture code, but weaker control of exceptional states, availability, ToS, and repeatability." Two specific facts defeat the framing that local-vs-public is binary:

- **`the-internet` (Sauce Labs) is Apache-2.0 and self-hostable** (`docker run -p … gprestes/the-internet`). Self-hosting **eliminates the ToS question and the availability question entirely** while preserving the one property MemberDesk can never have: *someone else authored it*. It ships nested frames, JS alerts, dynamic loading, broken images, and status codes — exactly the perception pathologies at issue.
- **SauceDemo's broken personas** (`locked_out_user` → rejected login, `problem_user` → wrong images and broken sorting, `performance_glitch_user` → deliberate slowness) are a ready-made runtime-error taxonomy the candidate did not design, which is worth more as evidence than the same taxonomy self-authored. Hosted-only, so availability risk is real, but as a *second* evidence run that risk is acceptable.

A document that ranks six architectures should not resolve its single most consequential target question with an unnamed category. **Requirement: one cross-surface discovery+replay run against a self-hosted third-party surface, in `/evidence/`.** Two surfaces, one engine, is the §3.7 surface-abstraction claim proven for the cost of one extra run — and it is the direct answer to (1).

**(4) Synthetic data makes the redaction story unfalsifiable, and the matrix files this as a residual risk rather than fixing it.** "Local synthetic data makes redaction less adversarial" is true and the fix is trivial: seed the fixture with realistically *shaped* synthetic data — SSN-shaped and account-number-shaped strings, card-like digit runs, a free-text notes field with a pasted token — so the redactor has something to catch and the evidence shows it catching it. A redaction pipeline that has never had a positive hit is untested code in the highest-consequence path.

**Finding A3.** Keep MemberDesk as primary; add a self-hosted third-party surface as a mandatory second evidence run; make freeze-before-discovery, realistic-shaped synthetic data, and in-repo fixture source *requirements*; and re-score `A`'s complexity with the fixture inside its boundary.

---

## A4. Kill architecture `F` (raw coords) — do I agree?

**Agreed on the verdict. Three objections to how it is done.**

The verdict is correct and the reasoning for it contains the best sentence in the document: *"per-action policy is weak because a point has no stable semantic identity. A late modal or shifted window can turn an allowed point into an irreversible control."* That single observation kills coordinate replay on §3.4 grounds alone, independent of the §3.2 and §3.3 arguments. Coordinates as the replay contract fail "stable element/control targeting" (§3.3), fail "how each target element/control is identified, with your reasoning about robustness" (§3.2 — a point has no reasoning), and make the artifact unreviewable by the human reviewer §3.2 requires.

**Objection 1 — `F` is a strawman, and including it inflates the apparent breadth of the option set.** `F` bundles coordinates with `pyautogui`, a different language, fixed sleeps as synchronisation, and a *single-pixel colour check* as the success condition. Nobody defending coordinate replay would defend that stack. The steelman — image-template matching, OCR-validated extraction, a modal classifier, calibration, and a semantic post-hit-test — is what the document's own complexity note says it becomes: "reconstructs C or E poorly." So `F` is not the sixth architecture; **`F` is the degenerate limit of `C` when the compile step fails**, which is precisely `C`'s stated kill criterion. Presenting it as a peer row and scoring it 2/10 pads a "≥4 architectures" deliverable with a option that was never live. Reclassify it as a named failure mode of `C`, not a row.

**Objection 2 — the kill needs a carve-out, or it damages the §3.7 honesty story.** RDP, Citrix, and VDI surfaces are a real and non-trivial fraction of bank back-office access, and inside them there is *no DOM and often degraded or absent a11y* — you are looking at a bitmap of someone else's UI. `frontier_computer_use.md` makes this point (C.3) and the matrix does not engage with it. A grader who knows this environment will ask, and "we rejected pixel automation" is the wrong answer. The right answer, which the matrix has the material for but does not assemble:

> Pixels are a **perceive channel of last resort**, never a **replay contract**. On a surface where no semantic handle exists for a step, that step is not compiled into a capability — it is declared unsupported and routed to HITL, and the capability cannot reach `approved` with an uncompilable step in it.

That is a stronger position than a wholesale kill, it is consistent with `C`'s "classify that surface as unsupported or route it to E," and it converts a rejection into a policy.

**Objection 3 — `F`'s best content is a cross-cutting invariant misfiled as an architecture.** "Kill immediately when … replay uses sleeps as state synchronisation" is a rule that should govern **every** architecture, not just the rejected one. Fixed sleeps are the single most likely way `A′` itself degrades under time pressure — they are what a tired implementer reaches for when an auto-wait is flaky. Promote it, with two siblings, into a global set of replay invariants stated once:

1. No fixed sleep is ever a synchronisation primitive; every wait is a state-based condition with a timeout that produces a *typed* timeout outcome.
2. Every action targets a control the artifact can name independently of its position.
3. Every step's success is verified by an explicit checkpoint before the next step runs — never inferred from "the click did not throw."

**Finding A4.** Kill `F`, reclassify it as `C`'s failure mode rather than a peer architecture, add the bitmap-surface carve-out ("perceive channel of last resort, never a replay contract; uncompilable step ⇒ unsupported + HITL"), and promote its three good rules into global replay invariants.

---

## A5. Schema sketch quality against §3.2's must-haves

§3.2 is where the brief says "Design the schema deliberately; it's a focal point of the evaluation," and §7 puts "the artifact schema and replay contract are central" in the first-weighted criterion. So this section carries more weight than the other four combined. **`CapabilityV1` as sketched does not yet meet the bar.** It is the best of the six sketches, and it has five gaps that a schema-focused grader will find.

### Scorecard against the five stated must-haves

| §3.2 must-have | `CapabilityV1` | Assessment |
|---|---|---|
| Ordered steps / actions | `steps: Array<{id, action, …}>` | **Met.** |
| How each target is identified, *with reasoning about robustness* | `target: {primary, alternates[], framePath?}`; prose says `SemanticLocator` "records the reason for the choice and uniqueness evidence" | **Partially met.** The reasoning is asserted in prose and absent from the sketched type. `SemanticLocator` is never defined — the load-bearing type in the whole schema appears only as an inline example. |
| Typed input parameters | `contract: { input: JsonSchema }` | **Weakly met.** See gap 2. |
| Typed outputs and their shape | `contract: { output: JsonSchema }` + per-step `extract[]` | **Weakly met.** See gaps 2 and 3. |
| A checkpoint or success condition | per-step `preconditions` + `checkpoint: Assertion[]` | **Met at step level, missing at capability level.** See gap 4. |
| Versioned | `schemaVersion: "1.0"` + `revision: number` | **Not met.** See gap 1. |
| Reviewable by a human *and* a calling agent | `status`, `policyRef: string` | **Not met for the calling agent.** See gaps 1 and 3. |

### The five gaps, in descending order of how much they will cost

**Gap 1 — versioning is a monotone counter, which cannot express compatibility.** `schemaVersion: "1.0"` plus `revision: number` conflates and omits three genuinely different things:

| Concept | What it versions | Who consumes it | Present? |
|---|---|---|---|
| Artifact-shape version | the file format | the replay engine (refuse unknown majors; migrate known older ones) | partially — `schemaVersion` exists but no stated migration/refusal rule |
| Capability semantic version | the recorded flow | a human reviewing a diff | no — `revision` is an opaque counter |
| **Contract hash** | *only* the callable surface: name + input schema + output schema + success condition | **the calling agent** | **no** |

§3.2's "a calling agent should be able to understand what the capability does, what it needs, and what it returns" implies the agent must also be able to detect *"the contract I bound to has changed incompatibly."* `revision: 7 → 8` cannot express that; it is equally consistent with a typo fix and a renamed required parameter. A derived `contractHash` over the callable surface lets a caller pin a contract and fail loudly on breakage without diffing the artifact — and it costs one hash function. This is the highest-value single addition available to the schema. *(The same three-part model appears in `tech_stack.md` §7.3, same model family as this review — one opinion, not two. The derivation above is from §3.2's calling-agent clause.)*

**Gap 2 — `contract.input: JsonSchema` is an opaque blob, which strands three things §3.4 and §3.7 need.** All of `A`, `B`, and `C` punt identically here. Typing the contract as raw JSON Schema means the artifact cannot express, at the type level:

- **Sensitivity classification per parameter.** §3.4 requires never persisting secrets or raw sensitive data. The distinction that matters is three-way and is not expressible in a JSON Schema blob: a parameter is *placeholdered* (`memberId` — never captured into the artifact, supplied per invocation), a secret is *masked* (never in logs), and an extracted output is *classified* (a balance is returned to the caller and never written to disk). `B`'s prose claims "artifact parameter bindings carry sensitivity labels" but `SemanticCapabilityV1` has no field for them either. This is a §3.4 requirement with no schema slot in any of the six sketches.
- **Referential integrity.** `value?: { fromInput: string }` is a string reference into a blob. Nothing validates at compile time that every `fromInput` resolves to a declared parameter, or that every declared parameter is consumed. That is a two-line check that turns a class of silent replay failures into a load-time error, and it requires the parameters to be first-class in the schema rather than nested inside a JSON Schema document.
- **Provider constraints.** If the model is ever asked to emit part of this, OpenAI strict structured outputs forbid root-level `anyOf` and optional fields — which is an argument for the model emitting a *narrow flat proposal* and the compiler synthesising the artifact. That is also what §3.2 wants ("decoupled from the raw model transcript"), so the constraint and the design agree; the schema should make it structurally impossible for the model to author its own provenance.

**Fix:** declare parameters as a first-class typed array (`name`, `type`, `required`, `sensitivity`, `description`, `example`) and *derive* the JSON Schema for the caller from it. Same for outputs. The JSON Schema stays in the artifact as the machine-facing contract; it stops being the source of truth.

**Gap 3 — the caller-visible result union is implicit, scattered across steps.** Business outcomes live in `steps[].transitions.businessOutcomes: OutcomeRule[]`. So the closed set of things a capability can return — `Success(payload) | MEMBER_NOT_FOUND | PERMISSION_DENIED | …` — can only be discovered by walking every step and unioning its outcome rules. A calling agent cannot branch on a result set it has to derive by traversal, and a human reviewer cannot answer "what can this thing tell me?" without reading the whole flow. This is a direct miss against §3.2's "it needs a clear contract, not just a step list" and against §3.3's requirement to *distinguish, in your result contract*, the three classes.

**Fix:** declare `results: { success: {...}, businessOutcomes: [{code, description, payload}], }` at the capability level; steps *reference* outcome codes rather than defining them. A load-time check asserts every step-level outcome code is declared. This is the difference between a step list with error handling and a capability with a contract.

**Gap 4 — no capability-level success condition.** §3.2 asks for "a checkpoint or success condition" for the capability. `A` has per-step `checkpoint: Assertion[]` (genuinely good — better than one global assertion, because it verifies each transition rather than only the destination) and an implicit success via `transitions.success: "return"`. But a reviewer asking "how do I know this capability did what it claims?" must reconstruct the answer from the last step's transitions. Add an explicit capability-level `successCondition` — it is redundant with the final checkpoint by design, and that redundancy is the point: it is the one assertion a reviewer reads first.

**Gap 5 — extraction is under-typed, and multi-tenant overlays are the wrong shape.**

- `extract?: [{outputPath, from, as: ScalarType}]` has no parse rule and no missing-value policy. A savings balance rendered as `$1,234.56` is not a `number`, and whether a missing balance is a hard failure or the business outcome "account has no savings sub-account" is a *decision the artifact must record*, not one the executor should improvise. Add `parse: {kind: 'currency'|'date'|'integer'|'text', pattern?, locale?}` and `onMissing: 'hardFailure' | {businessOutcome: code}`. Currency and date parsing is exactly the detail a reviewer from a banking-integration company notices.
- `tenantOverrides?: Record<string, LocatorOverride>` has three defects. It is keyed on tenant alone, when drift is `{tenant, appVersion}`. It is an open record, so unless `LocatorOverride` is a *closed* union of override kinds it is an arbitrary merge — and an arbitrary merge is unreviewable, which defeats §3.2's review requirement at the exact point where §3.7 needs review most. And it nests every tenant's deltas inside the shared base artifact, so one tenant's label change bumps the revision of an artifact all tenants depend on, and the approval state of the base becomes meaningless. **Fix:** base artifact + separate overlay documents keyed `{appFamily, variant, tenantId}`, each independently reviewable and approvable, applied as a typed patch over a closed set of override kinds.
- **`A` is missing `B`'s single best schema idea.** `B` has `appCompatibility.semanticFingerprint`; `A` has only `compatibleVariants: string[]`. §3.7 asks explicitly "how do you detect and manage per-tenant/version drift?" A fingerprint — a digest over the observed surface's title, key landmark roles/names, and route pattern, recorded at record time and re-checked at replay — turns that question into a *typed drift outcome* instead of a mystery failure three steps later. It costs almost nothing and it is the most concrete answer to a question §3.7 asks in so many words. Promote it into `A′`.

### Smaller items worth fixing

- `policyRef: string` should be `{id, digest}` (`B` is right). `A`'s prose says results hash the policy file; the artifact should carry the digest so the binding is visible at review time, not only at run time.
- **No provenance block.** `C` has one (`discoveryRunId`, `compilerVersion`, `sourceEvidenceDigest`) and it is the right idea: reviewability requires knowing which run and which compiler produced this. Copy it into `A′` and add `recordedAt` and the model identifier. Note the model *alias* is configuration, as `A` correctly says — but "which model produced this artifact" is provenance a bank reviewer will want.
- `status: 'draft'|'approved'|'retired'` has no `approvedBy` / `approvedAt` / `approvedContractHash`. In a regulated context, an approval that does not record who approved what is not an approval.
- `risk: 'read'|'reversible-write'|'irreversible'` on each action is a genuine strength — it puts §3.4's risky-action distinction in the data model rather than in the executor, which means policy can be evaluated against the artifact *before* a run starts. Keep it, and make the pre-run evaluation an explicit feature: a capability's risk profile is statically inspectable.
- The per-step `transitions: {success, businessOutcomes, recoverable, hardFailure}` shape is the **best part of the sketch** and maps one-to-one onto §3.3's three-way distinction. It is more directly responsive to the brief than anything in the other five sketches. Keep it exactly as-is, with outcome *codes* hoisted per Gap 3.

**Finding A5.** `CapabilityV1` is the strongest of the six on outcome branching and risk classification, and materially incomplete on versioning, the caller-visible result union, parameter typing and sensitivity, extraction parsing, drift fingerprinting, and overlay shape. Since §3.2 + §7 make this the single most-graded object in the submission, these are not nits — closing them is a prerequisite to the ranking in Part III holding.

---

## A6. Method-level defects in the matrix itself

Four things that are not about any single architecture.

**(a) The scores are decoration, and the document contradicts itself about what they mean.** "Scores are integers as requested. They are not probabilities and are not additive feature scores." Then, seventy lines later: "A is #1 from an explicit grader-weighted expected-value judgment: **probability** of a complete, defensible … implementation **multiplied by** the importance order in Section 7." You cannot disclaim probability semantics and then justify the ranking as an expected-value product of a probability and a weight. Either show the computation or drop the numbers and keep the argued ordering, which is the part that actually persuades. A 9-vs-8 with no computation behind it invites a reader to think the ordering was intuited and the numbers back-filled.

**(b) An alternatives matrix that holds the LLM provider constant in all six alternatives is not exploring that axis.** Every architecture `A`–`F` specifies `@anthropic-ai/sdk` with `claude-sonnet-5` (or the Python `anthropic` client). No architecture justifies the provider, none varies it, and the choice is not surfaced as a gate in the document's own G-list even though it is G6 elsewhere. This is a hidden lock inside a document whose title promises alternatives. It also conflicts silently with `tech_stack.md`'s OpenAI default — a cross-document inconsistency that a reader assembling the gate answers will hit.

**(c) The discovery-run cost and API-key gate is absent from the comparison, and it discriminates between the options.** §4 makes one real LLM-driven discovery run non-negotiable, and `decisions/open_questions.md` records that *no API keys exist in this environment*. Architecture choice interacts with that gate: `C` and `F` send images every step and cost materially more per run than `A′`'s text a11y snapshots, and `C`'s compile-validation pass implies repeated runs. A comparison that omits the axis where one option is an order of magnitude more expensive than another is incomplete, and the omission favours `C`.

**(d) A live environmental gate is unaddressed in every row: this is a headless Linux cloud runner with no display.** Four of the six architectures depend on **headed** operation for their HITL story (`A`: "the browser is launched headed with a persistent context"; `B`, `C`: same lease and headed window; `D`: "leave the same Electron process and windows visible"; `E` needs an interactive Windows desktop). `A`'s kill criteria do name this ("if headed same-session handoff cannot be demonstrated in the intended runner") but no row states what the runner actually is or what the mitigation would be. This is decision-relevant *now*, not at implementation time, because it bears on G1 and G9: the options are Xvfb plus a VNC/CDP-exposed view, a Playwright multi-client session binding primitive, or an honest downgrade to a locally-recorded demonstration plus a documented mechanism. Silently discovering this later is the failure mode.

---

# Part II — Supporting review: `frontier_computer_use.md`

My stance is supporting. That does not mean uncritical: the qualifications below are offered to make the document's positions harder to attack, not to displace them. Three of its four core moves are, in my judgement, the most valuable analytical contributions in the research set.

## S1. Is "labs are always-on CUA; the brief wants record-replay" the correct split?

**Yes. This is the single most useful framing produced by any of the research files, and it should survive into `REPORT.md` §1 essentially intact.** Four qualifications sharpen it.

### Why it is right

The split is *descriptively accurate about the products, not just rhetorically convenient*. Anthropic's computer-use tool, OpenAI's built-in `computer` tool, and Gemini's Computer Use all define the same contract: screenshot in, UI action out, harness executes, repeat. None of the three emits a serialised, re-executable target. There is no artifact to review, no parameter to bind, no checkpoint to assert. "Replay" in all three means *run the loop again and hope for the same trajectory.* Against §3.3 — "replay it **without invoking the LLM for decisions**" — that is not a near-miss, it is the complement.

The document's strongest evidentiary move is leaning on **Microsoft's own RPA-vs-CUA guidance** rather than on its own reasoning: "use RPA when the UI is stable, rules are clear, and speed/volume matter; use CUA when UIs shift, decisions are fuzzy, or you need it fast." §1 of the brief describes "stable UIs, but real runtime errors" and says explicitly that the hard part "is not constant drift." Applying a vendor's own decision rule to the brief's own environment description lands in the RPA column for the production path. That is a first-party citation doing real argumentative work, and it makes the position very hard to attack — a reviewer would have to argue against Microsoft's guidance, not against a candidate's preference.

The derived instruction — **"copy their perception/action primitives, then compile"** — is the correct operational conclusion, and it is what elevates the compiler from an implementation detail to the thesis of the submission.

### Qualification 1: it is a spectrum, and the document's own table proves it — so state the precise claim

The prose sometimes flattens to "labs are always-on," but the B.7 table shows Stagehand's cached selector, Nova Act's Python-plus-`act()` islands, and OpenAI's option-3 code harness as "halfway." That is the accurate reading, and the flattened version is attackable by anyone who names Stagehand caching. The precise, falsifiable claim — which I would put in the document and in `REPORT.md` — is:

> **No lab or major OSS project ships a typed, versioned, human-reviewable capability artifact with a declared input/output contract and an outcome taxonomy. Several ship partial compilation: a cached selector with a TTL, a natural-language plan, a generated script.** The gap between "partial compilation" and §3.2 is the deliverable.

That version survives the counter-example, and it is strictly stronger because it says exactly what is missing.

### Qualification 2: the split is about the production *decision* path, not about the LLM's total absence — and the doc should say what happens on breakage

§3.3 forbids the model from the replay decision loop. It does not forbid the model from re-compilation, drift triage, or §8's bounded single-step repair. The document gets this right in anti-pattern #7 but the top-line "zero LLM decisions" framing risks an implementer reading it as *"the LLM never touches a capability after recording."* That leaves the most obvious follow-up question unanswered: **what happens when a capability breaks?**

The answer completes the thesis rather than complicating it: a fingerprint mismatch or a hard failure produces a *typed drift outcome*, which routes back to **discovery**, which produces **vN+1**, which goes through **review and approval** before it can be invoked unattended. Record-replay is a maintenance cycle, and versioning plus the approval state is what makes the cycle safe. Adding that closes the loop and pre-empts the strongest question a grader can ask about the whole approach.

### Qualification 3: the lead argument should be auditability, not cost or determinism

The document argues compile-then-replay on cost, determinism, and reliability, and mentions audit in passing. For **this domain** the ordering should invert. Cost and latency are engineering preferences a reviewer can trade against; "the model adapts, which is worth the tokens" is an argument someone can genuinely make. But a bank cannot review, approve, and re-review a model's future decisions. It can review an artifact. When the question is *"why did this system move this money,"* the answerable form is `capability@version + contractHash + policy digest + run journal`, not a model transcript. That is also why `draft → approved` is not a §8 stretch goal in this domain but a core property — which is a genuinely load-bearing claim the document leaves as an optional nicety.

### Qualification 4: "CUA is the right discovery mechanism" sits awkwardly next to the doc's own recommendation

The framing says lab CUA is the right *discovery* mechanism; the recommendation is a11y-snapshot-first with a custom loop and lab CUA only as an optional fallback channel. Both are right, but together they read as a tension. Cleaner: **labs contribute perception/action primitives and safety practice (allowlists, credential injection the model never sees, confirmation on irreversible actions, injection classifiers, isolated environments). The discovery brain here is a custom loop; the lab CUA tool is one optional perceive/act channel among three.**

## S2. Is the Playwright aria snapshot the right steal?

**Yes, primarily — with one substantial qualification that changes the recommendation's shape.**

### Why it is right, including a reason the document under-weights

The document's stated reasons are correct: cheap (kilobytes of YAML rather than vision tokens), deterministic targeting, no VLM required for the happy path, and Playwright MCP's own first-party rationale — LLMs drive pages through structured accessibility snapshots, "bypassing the need for screenshots or visually-tuned models."

Two reasons deserve more prominence than they get:

1. **It is the same abstraction as the desktop trees.** Role, name, state on the web maps onto UIA ControlType/Name/patterns, AX roles, and AT-SPI roles. The document says this (C.2, "the desktop twin") but files it under desktop rather than under *why a11y wins on the web*. It is the decisive §3.7 argument: an artifact that names controls the way UIA names controls makes the desktop adapter a resolver swap instead of a rewrite.
2. **It minimises the discovery→artifact impedance mismatch.** If the model selects a target described as role + accessible name, the compiler's promotion to `getByRole(role, {name})` is nearly the identity function. If the model selects a CSS path, the compiler must *invent* a semantic identity post hoc — a step that can fail, and whose failure is `C`'s central risk. Choosing the observation format to make the compiler trivial is the highest-leverage decision in the discovery loop, and that is the sharpest way to argue for aria snapshots.

The document's loudest caveat is also its most important and I want to underline it: **refs are session-ephemeral.** `[ref=e17]` is valid until the next page mutation. Persisting one produces an artifact that cannot replay, and — worse — one that *appears* valid until it silently targets the wrong element. Anti-pattern #4 is correctly stated and correctly emphatic.

### The substantial qualification: a11y-first must not become a11y-only

`ariaSnapshot` is a *filtered* projection. It is designed to surface semantic content, which means it discards or genericises exactly what the brief's hostile surfaces are made of: layout tables, `<div onclick>` pseudo-buttons, unlabeled inputs, icon-only anchors with no accessible name, presentational markup. On a genuinely legacy page a pure aria snapshot can be simultaneously *large* (table soup as a wall of `cell` nodes) and *incomplete* (the actual control the operator clicks has no role and no name). Recommending a11y-first without this qualification is the one place in the document where a reviewer could land a clean hit, because it recommends the channel that is weakest precisely where §3.1 says the difficulty lies.

**The fix is already in the document, filed as "contrarian alternative 3": own the merge.** The observation should be a11y projection as the spine + a bounded overlay of clickable/focusable nodes that have no role or no accessible name (with a short structural descriptor and a nearby-text hint) + explicit frame identity on every node. That should be promoted from an alternative into the default recommendation for a hostile target. It costs one observer module, it is entirely behind `WebObserver`, and it resolves the `A`-vs-`B` dispute in the sibling document at the same time: **hybrid observation, a11y-first targeting.**

### Three smaller qualifications

1. **API-surface caution.** The specific option shapes (`mode: 'ai'`, `boxes: true`) referenced across the research files should be verified against the pinned Playwright version at implementation time, not assumed. The aria-snapshot YAML format was introduced primarily for assertion matching (`toMatchAriaSnapshot`); using it as an agent observation format is adjacent to, but not identical to, its documented purpose, and option names in that neighbourhood have moved before.
2. **Frames must be tagged in the *observation*, not only in the locator.** The document is right that "a locator that does not name the frame is wrong." The corollary it does not state: each frame is a separate document with a separate tree, so the observer must walk frames explicitly and stamp frame identity onto every observed node. Otherwise the model proposes "the Search button" when there are three, in three frames, and the compiler cannot tell which one was acted upon. For framesets, frame identity should be `name` or a URL pattern — **never a positional index** (see S3 on `@puppeteer/replay`, which uses index paths and is a good example of what not to copy).
3. **One steal the document names but does not exploit: `toMatchAriaSnapshot` as a checkpoint primitive.** An expected aria-snapshot subtree is a readable, partially-fuzzy, reviewable assertion — better than a raw text match, far cheaper and more stable than a screenshot diff, and it renders legibly inside the artifact for a human reviewer. That is a direct, concrete answer to §3.2's checkpoint field and it deserves a line in the recommendation table.

### One tension in the document worth resolving explicitly

The document cites WebVoyager's finding that a **text-only accessibility-tree ablation underperformed multimodal**, and separately recommends a11y-first. Left unreconciled, a reviewer will read that as the document citing evidence against its own recommendation. The reconciliation is straightforward and strengthens the position: WebVoyager measured *open-web task success for an always-on agent* on 15 unfamiliar consumer sites. That objective rewards visual understanding of novel, unfamiliar layouts. This system's objective is *durable target identification on a known, stable, semantically impoverished enterprise surface*, with a screenshot retained as a secondary channel and a human available on escalation. The ablation penalty is real and it is about a different task. Say so in the document; an unaddressed contrary citation is a liability, and an addressed one is a credibility marker.

## S3. Any missed serious OSS?

The survey is broad — Playwright, Playwright MCP, Stagehand, browser-use, Skyvern, AgentQL, Magentic-UI, Nova Act, WebVoyager, OSWorld, xa11y, pywinauto/FlaUI/atomacos/dogtail. Four gaps, ranked by value, and the first two are significant.

### Miss 1 (significant): `@puppeteer/replay` and the Chrome DevTools Recorder — the closest existing schema to the one being designed

The document surveys *agents* thoroughly and under-surveys ***recorders***, even though the brief is asking for a recorder. This is the highest-value gap because it is direct, first-party prior art for the artifact schema itself.

The Chrome DevTools Recorder records a user flow and exports it in the `@puppeteer/replay` schema. From the schema source (<https://github.com/puppeteer/replay/blob/main/src/Schema.ts>, accessed 2026-08-16):

```ts
export type Selector = string | string[];
export enum SelectorType { CSS='css', ARIA='aria', Text='text', XPath='xpath', Pierce='pierce' }

export interface StepWithSelectors extends StepWithFrame {
  /** A list of alternative selectors that lead to selection of a single element…
      If it's an array, the last element is the selector for the target element and
      the preceding selectors point to the ancestor elements…
      During the execution, it's recommended that the implementation tries out all of
      the alternative selectors to improve reliability of the replay as some selectors
      might get outdated over time. */
  selectors: Selector[];
}
```

A recorded step looks like this (Chrome DevTools Recorder export):

```json
{
  "type": "click",
  "target": "main",
  "selectors": [
    ["aria/Proceed to checkout"],
    ["[data-test=checkout]"],
    ["xpath///*[@data-test=\"checkout\"]"],
    ["text/Total: $0.00"]
  ]
}
```

Why this matters, concretely:

- **It is `primary` + `alternates` as shipping first-party prior art**, with the documented replay semantics the artifact needs ("try out all of the alternative selectors… as some selectors might get outdated"). Both sibling research files propose that design; neither cites the implementation that already does it.
- **`aria/` is first in the recorder's default selector priority** — the recorder prefers an ARIA selector when one is found, before test attributes and CSS. That is Chrome's own team independently arriving at the a11y-first targeting conclusion, in a production tool, which is a genuinely useful corroboration for S2.
- **The `Flow`/`Step` shape maps onto the artifact's spine**: ordered steps, per-step `timeout`, `assertedEvents`, ancestor-chained selectors, and a configurable `selectorAttribute`.
- **It also demonstrates what *not* to copy**, which is nearly as useful. Frames are identified by `frame: number[]` — a positional index path. On a legacy frameset where frames can be reordered or conditionally rendered, an index path is exactly the brittleness the artifact must avoid; use frame `name` or URL pattern. Similarly, `xpath/` and raw CSS sit in the same undifferentiated `selectors` array as `aria/`, with no recorded *reason* and no risk ranking — which is the gap §3.2's "with your reasoning about robustness" is pointing at.
- **The delta is the deliverable, and it is a ready-made `REPORT.md` §2 paragraph.** `@puppeteer/replay` has ordered steps, ranked alternate selectors, frame paths, timeouts, and asserted events. It has **no typed input parameters, no typed outputs, no business-outcome taxonomy, no risk classification, no versioning, no approval state, no policy binding, and no tenant overlay model.** "Here is the closest thing that exists; here is precisely what a *capability* requires beyond a *recording*" is the most efficient way to justify the schema, and it demonstrates that the design was informed by prior art rather than invented in a vacuum.

### Miss 2 (significant): the RPA lineage — object repositories and the business-vs-system exception taxonomy

The document leans on Microsoft's RPA column conceptually but cites no RPA system, OSS or otherwise. Two patterns from that world map one-to-one onto the hardest parts of §3.3 and §3.7, and using their established names is a credibility marker with any reviewer who has seen enterprise automation:

- **Object repository** (UiPath's Object Repository; Blue Prism's Application Modeller; the page-object/resource-file pattern in Robot Framework and `rpaframework`, Apache-2.0). Element locators live in a **named, shared, separately versioned registry**, decoupled from the flows that use them, so one UI change is fixed once and inherited by every process that references it. That is *exactly* the base/overlay multi-tenant answer §3.7 asks for — with roughly fifteen years of production evidence behind it — and it is a strong argument for hoisting locators out of inline step definitions into a referenced target registry, which neither `A` nor `B` does.
- **Business exception vs system/application exception** (UiPath's REFramework terminology, mirrored across the RPA world). This is the industry-standard name for the distinction the brief's glossary calls out as "the most common design mistake here." Calling it by its established name, and noting that the brief's three-way split (business outcome / recoverable / hard failure) refines the classical two-way split by separating *recoverable* from *hard*, shows the taxonomy was designed against prior art rather than improvised.

### Miss 3 (moderate, and it is the strongest counter-argument to the document's own thesis): Midscene.js

**Midscene.js** (<https://github.com/web-infra-dev/midscene>, MIT, TypeScript, ~14k stars, active through mid-2026) is absent, and it is the most relevant omission because it argues the *opposite* of the document's central recommendation, from a serious project. Its README states directly:

> "Most UI automation — including AI tools that read the DOM or the accessibility tree — depends on page structure. That structure is fragile and incomplete: selectors break on every refactor, elements without semantic markup (icon-only buttons, custom controls) are invisible to it, native apps and cross-origin iframes are out of reach… Midscene works from the screenshot alone."

That is the S2 qualification above, stated by someone who bet a project on it. A supporting reviewer should surface it rather than let it be found later.

But engaging with it **strengthens** the document's position, because of what Midscene does next. Its caching feature "saves AI planning steps and element localization (**XPath**)" into `.cache.yaml`, with `read-only`/`read-write`/`write-only` strategies, and — critically — *"if a cached action fails, Midscene automatically falls back to AI model execution to maintain stability."* So the most committed vision-first tool in the ecosystem, when it needs a durable target for replay, **cannot store pixels — it stores XPath**, the very locator strategy both research files reject as brittle, and then needs an always-available LLM to rescue it when the XPath breaks.

That is a near-perfect empirical confirmation of the document's core claim: *pure vision cannot produce a durable locator, so any vision-first system that wants to skip the model on replay ends up caching a brittle structural selector plus a model fallback.* It is also anti-pattern #7 ("self-healing replay that silently calls the model") instantiated in a popular real tool — which makes that anti-pattern concrete rather than hypothetical. Both are worth a short subsection.

Midscene is also worth naming for a second reason: it is the clearest available example of the surface-agnostic claim (web, Android, iOS, HarmonyOS, desktop through one screenshot-based API), which is the honest steelman for "pixels are the only universal channel" in §3.7 — and it belongs next to the Citrix/VDI carve-out from A4.

### Miss 4 (minor but cheap and useful)

- **Appium (Windows Driver / Mac2 Driver).** The document names FlaUI, pywinauto, and xa11y for desktop but not Appium, which is the one desktop option that drives UIA and AX behind a **W3C WebDriver** protocol — the same client-protocol shape as the web adapter. For a one-sentence `REPORT.md` §4 desktop-seam answer, "UIA via the Appium Windows Driver or FlaUI" is more credible to an enterprise reader than FlaUI alone.
- **`axe-core` and `dom-accessibility-api` as compile-time diagnostics.** This one is a mechanism, not just a citation. Running `axe-core` against a target during the probe gives a *machine-checkable* answer to "does this surface have accessible names on its controls?" — which converts "the a11y tree might be bad" from a hand-waved risk into a **measured gate** that can drive the perception strategy and the kill criteria in Part III. `dom-accessibility-api` computes accessible names independently of Playwright, which is useful for scoring locator uniqueness at compile time (does this role+name resolve to exactly one node?). Both are small, MIT-family, and directly serve the compiler.
- **Selenium IDE** — one line, same lineage as Miss 1 (record-then-replay with a fallback-locator list); historically important, no reason to use it.
- Correctly omitted and I would keep them omitted: Steel/Kernel/Browserbase (hosted infra, key + bill for no credit), stealth forks (anti-bot is not the problem), WebArena/Mind2Web (benchmarks; OSWorld and WebVoyager already carry that argument).

---

# Part III — The hybrid, with kill criteria

A hybrid is warranted, and it is not a compromise: it is what both reviewed documents already recommend at gate level while ranking something else.

## `A′` — hybrid observation, a11y-first targeting, hand-rolled everything else

| Layer | Choice | Provenance |
|---|---|---|
| Language / runtime / automation | TypeScript, Node LTS, Playwright, single process, filesystem artifacts | `A`, unchanged — survived every attack |
| **Discovery observation** | **a11y projection as spine + bounded overlay of role-less/name-less interactables + frame identity on every node; screenshot secondary (evidence, HITL context, ambiguity)** | merges `A`'s DOM summary and `B`'s aria snapshot; = frontier doc's contrarian option 3 |
| **Discovery action** | Playwright actions on resolved elements. One bounded coordinate click permitted **only** when resolution fails, immediately followed by hit-test promotion to a semantic target; if promotion fails, the step is uncompilable → HITL | `C`, reduced from architecture to bounded channel |
| **Artifact target model** | Backend-neutral `ControlTarget` (role, name matcher, landmark path, states) + `backendHints.web` / `backendHints.windowsUia`; recorded reason and uniqueness evidence per target; **hoisted into a referenced target registry, not inlined per step** | `B` + RPA object-repository pattern (S3 Miss 2) |
| Orchestration | Hand-rolled reducer + explicit replay interpreter. No graph framework, no checkpointer | `A`; `B`'s frameworks rejected per A2 |
| Policy | One typed `assertAllowed` chokepoint called by discovery and replay; `policyRef {id, digest}` in artifact; decision IDs in evidence | `B`'s concept, `A`'s implementation weight |
| Schema | `CapabilityV1` + the five A5 fixes: three-part versioning with `contractHash`; first-class typed params with sensitivity labels; capability-level result union + `successCondition`; typed extraction with parse rules and `onMissing`; `semanticFingerprint`; overlays as separate keyed documents; provenance block | A5 |
| HITL | Headed persistent context + actuator lease + CLI intervention bundle + redacted human-action recording + resume-at-checkpoint | `A`/`B` agree; lease is the real mechanism in both |
| Target | MemberDesk (frozen and tagged before discovery, source in repo, realistically-shaped synthetic data, two tenant variants) **+ one self-hosted third-party surface run** | A3 |
| Desktop | Schema seam only; `REPORT.md` §4 names UIA via Appium Windows Driver or FlaUI | both docs agree |

Two things to notice about this table. First, **every row is drawn from a document already in the research set** — the hybrid is an assembly, not an invention, which is why I am comfortable recommending it adversarially. Second, the only rows that *change* `A`'s implementation cost are the observation merge (one observer module) and the schema fixes (type-level work on the object the brief says is graded first). Neither adds a dependency.

## Kill criteria

Falsifiable, checkable early, each with a stated action. `KC-1` and `KC-4` are the two that should be evaluated before significant code exists.

**KC-1 — The a11y-first targeting premise (probe before committing; use `axe-core` per S3 Miss 4).**
On the frozen target's critical path, every step must have a target resolvable to a *unique* semantic handle: role+accessible name, or label, or visible text, scoped within a named frame and, where necessary, a named landmark or table row.
- 0–1 steps fail → proceed; those steps use the bounded coordinate-click-plus-hit-test channel.
- 2–3 steps fail → the perception strategy is not falsified but the fixture is too hostile to be representative; adjust the fixture *before* the discovery run (never after), or re-scope the flow.
- More than 3, or the *checkpoint/output* state is unreachable semantically → the premise is falsified. Re-open G2. The successor is not `B` (same premise) but `C` with a mandatory compile-validation pass.

**KC-2 — Schema completeness gates feature work.**
Before the second replay path is written, the artifact must express: the closed caller-visible result union, typed parameters with sensitivity labels, `contractHash`, `successCondition`, and `semanticFingerprint`. If it does not, stop feature work and fix the schema. §7 grades the schema first; a broader feature set on a weak schema scores worse than the reverse.

**KC-3 — Same-session handoff must be real in the actual runner (see A6(d)).**
The handoff must be demonstrated on the same live session in whatever environment produces the evidence — headless cloud Linux included. If it can only be *described*, the fallback is a locally-recorded demonstration plus a fully documented control-transfer model and an explicit statement of what was not run in CI. **Do not fake it, and do not open a fresh session and call it a handoff** — §3.6 names "not a fresh one" specifically, and a reviewer will check.

**KC-4 — A real discovery run exists before the system is "finished."**
§4 makes exactly one thing non-negotiable. There are currently no API keys in this environment. If a real LLM-driven run against the live surface has not happened by the time the replay engine works, stop building and resolve the key/spend gate (G6). Everything else in the submission is defensible as a deliberate cut; this is not.

**KC-5 — Target integrity.**
If the fixture is edited after the discovery run in order to make replay pass, that evidence is void and the run must be redone against the amended fixture. Enforce by tagging the fixture commit and recording the tag in the artifact's provenance block.

**KC-6 — Framework creep.**
If LangGraph, OPA, SQLite, a queue, or a service boundary enters the implementation, each must be justified by a capability the hand-rolled version demonstrably cannot provide *in this deliverable*. "It is what production would use" is a `REPORT.md` sentence, not a dependency.

**KC-7 — Replay invariants (promoted out of `F`, per A4).**
Violation of any of these means the replay engine is wrong, regardless of whether tests pass: (i) no fixed sleep is ever a synchronisation primitive; (ii) no action targets a control the artifact cannot name independently of position; (iii) no step's success is inferred from the absence of an exception.

---

# Preserved disagreements

Unresolved on purpose. Each is a real fork where a competent reviewer could take the other side, and none should be silently closed by whoever writes the gate answers.

| # | Disagreement | Position A | Position B | My lean | What would settle it |
|---|---|---|---|---|---|
| D1 | Is the a11y tree adequate on genuinely legacy surfaces? | Both research docs: yes, a11y-first + ranked fallbacks | **Midscene.js, explicitly**: no — DOM and a11y both depend on page structure, which is "fragile and incomplete"; work from the screenshot | a11y-first *targeting*, hybrid *observation* — and note that Midscene itself caches XPath, not pixels | KC-1 probe with `axe-core` on the real target |
| D2 | Is `C` (screenshot CUA → compiled locators) an architecture or a channel? | Matrix: a ranked architecture at #3, promotable to #1 after a spike | This review: a bounded fallback channel inside `A′`; a second targeting system for one demo otherwise | Channel | Whether a compile spike resolves *every* critical step, not most |
| D3 | Does a policy engine belong in the take-home? | `B`: Rego/OPA, one evaluator, decision logs — how a bank would really do it | This review: Rego makes the safety model *less* reviewable by the grader; a typed function with an exhaustive switch is more auditable at this size | Typed function; name OPA in `REPORT.md` §6 | Whether policy authorship must live outside the codebase |
| D4 | Self-authored fixture vs third-party surface | Matrix: local hostile MemberDesk, controlled failure modes | This review: MemberDesk primary **and** one self-hosted third-party run, or the fixture grades itself | Both, mandatory | Nothing — this is a judgement call about grader trust |
| D5 | Does implementing a second surface (Electron) pay? | `D` and `tech_stack.md` §17: converts §3.7 from designed to demonstrated at low cost | Frontier doc: "desktop for theatre"; web errors/HITL are the scarce resource | Only after every §3.1–3.6 requirement is green; it is the first cut | Whether the core thread finishes with margin |
| D6 | LLM provider | Matrix: Anthropic in all six architectures, unargued | `tech_stack.md`: OpenAI `gpt-5.6-terra` default | Neither — this is G6, and the real tiebreaker is which key exists | G6 |
| D7 | Are numeric interview-fit scores useful? | Matrix: 9/10, 8/10, … as a ranking aid | This review: decoration, and self-contradictory about whether they are probabilities (A6(a)) | Drop the numbers, keep the argued ordering | — |
| D8 | Coordinates: total kill, or last-resort perceive channel? | Matrix `F`: avoid, full stop | This review + frontier doc C.3: never a replay contract, but the only channel on Citrix/VDI bitmaps; such steps are unsupported and HITL-routed | Carve-out | — |

---

# Gate impact (inputs only — nothing is locked here)

- **G1 (target):** local hostile MemberDesk **plus** one self-hosted third-party surface (e.g. `the-internet`, Apache-2.0, Docker). Freeze-before-discovery and in-repo fixture source are conditions, not suggestions.
- **G2 (mechanism):** hybrid observation (a11y spine + interactable overlay + frame identity; screenshot secondary), a11y-first targeting, Playwright actions, one bounded coordinate-click-plus-hit-test escape hatch. Replay: ranked semantic locators only; never an LLM in the decision path.
- **G3 (stack):** Stack `A` shape, amended per the `A′` table. Provider remains G6 and should stop being implicitly assumed by the architecture documents.
- **G7 (orchestration):** hand-rolled reducer + replay interpreter. Reject LangGraph on the verified resume-semantics hazard, and say so in one `REPORT.md` §5 sentence rather than omitting it.
- **G8 (schema philosophy):** hybrid pipeline confirmed — append-only redacted discovery journal as evidence; compiler emits the declarative versioned JSON capability as the only replay input. Add the A5 fixes before implementation starts.
- **G9 (HITL depth):** blocked on the headless-runner question in A6(d). Raise it now; it is decision-relevant, not an implementation detail.
- **G12 (cuts):** web adapter end to end first; desktop as a typed seam; Electron only after every §3.1–3.6 requirement is green, and it is the first thing cut.

---

# Primary sources verified for this review (accessed 2026-08-16)

| Claim | Source |
|---|---|
| LangGraph resumes by re-running the interrupted node from its first line; side effects before `interrupt()` must be idempotent; "place side effects after `interrupt`"; "separate side effects into separate nodes" | <https://docs.langchain.com/oss/javascript/langgraph/interrupts> |
| `@puppeteer/replay` step schema: `selectors: Selector[]` as ranked alternatives, ancestor chaining, `frame: number[]`, per-step `timeout`, `assertedEvents`, `selectorAttribute` | <https://github.com/puppeteer/replay/blob/main/src/Schema.ts> |
| Chrome DevTools Recorder selector priority (ARIA selector first when no custom attribute is configured); recorded step JSON shape | <https://developer.chrome.com/docs/devtools/recorder/reference> |
| Midscene.js: MIT, vision-first, explicit argument that DOM *and* a11y depend on fragile page structure; cache stores AI planning + element localisation as XPath in `.cache.yaml` with read/write strategies; automatic fallback to the AI model when a cached action fails | <https://github.com/web-infra-dev/midscene>, <https://github.com/web-infra-dev/midscene/blob/main/apps/site/docs/en/automate-with-scripts-in-yaml.mdx> |

Claims taken from the reviewed documents' own citations (Playwright locators/frames/aria-snapshots, Microsoft RPA-vs-CUA guidance, Playwright MCP rationale, Anthropic/OpenAI/Gemini computer-use tool shapes, OSWorld/WebVoyager) were **not** independently re-verified in this pass; they are consistent with each other across three research files by three different model families, which is weak but non-zero corroboration. The `mode: 'ai'` / `boxes: true` aria-snapshot option shapes are flagged in S2 as **unverified against a pinned Playwright version** and should be confirmed before they appear in any locked stack.

*End of review. Ranking and hybrid above are inputs to G1/G2/G3/G7/G8/G12, not locks. No PRD content is included, per the phase order in `_lab/00_index.md`.*
