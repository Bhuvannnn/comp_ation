# Independent Brief & Evaluation (Question Set A)

**Reviewer:** cursor-grok-4.5-high (Independent Reviewer)  
**Source of truth:** `/workspace/Project.md` only  
**Date:** 2026-08-16  
**Status:** Independent cut lines — not locks; synthesizer may merge later  
**Not in scope for this memo:** PRD, architecture lock, implementation plan

---

## 0. One-line verdict

Graders reward a **thin-but-real vertical slice** through discovery → artifact → deterministic replay (with business-outcome taxonomy) → live-session HITL → evidence/guardrails, plus a **credible design story** for heterogeneity/multi-tenant — and they **explicitly do not reward** feature breadth, framework theater, or premature scale plumbing (Section 7).

---

## 1. Full decomposition of what graders weigh (Section 7) — and what they do NOT reward

### 1.1 Weighed criteria (quoted order from Section 7)

Section 7: *"We'll weigh these roughly in this order."*

| Rank | Criterion | What it actually tests (independent reading) | Anchors elsewhere |
|------|-----------|-----------------------------------------------|-------------------|
| 1 | **System design** | *"Clear boundaries, sensible data models, good trade-offs, appropriate simplicity. The artifact schema and replay contract are central."* | §§3.2, 3.3, 5 (load-bearing pieces) |
| 2 | **Correctness of the core loop** | *"The agent actually completes a real goal; the artifact replays deterministically and verifies success."* | §§2, 3.1–3.3, 4 (real discovery), 6.3 |
| 3 | **Robustness & error handling** | *"How your replay detects and responds to runtime errors and exceptional states; how cleanly it separates expected business outcomes from recoverable conditions and hard failures; sound locator, wait, and checkpoint strategy."* | §§1 (stable UIs, real runtime errors), 3.3, Glossary §10 |
| 4 | **Human-in-the-loop escalation** | *"A real, well-reasoned mechanism to detect 'stuck,' route an intervention request with context, transfer control of the live session to a human, and resume afterward — not just a TODO."* | §3.6 (mock UI OK; handoff mechanism must be real) |
| 5 | **Generalization to the real environment** | *"A credible design story for heterogeneous surfaces and for reusing artifacts across many tenants running the same app, without brittle assumptions or per-tenant rebuilds."* | §§1, 3.7 (**design, not necessarily build**) |
| 6 | **Safety & data handling** | *"Allowlist enforcement, treatment of risky and irreversible actions, redaction of regulated financial data."* | §§3.4, 9 |
| 7 | **Code quality** | *"Readable, reasonably typed and tested where it counts, easy to run."* | §§5, 6.1 |
| 8 | **Communication** | *"The write-up makes your reasoning, trade-offs, and cut lines clear."* | §§5, 6.2 (exact REPORT headings) |

### 1.2 What graders do NOT reward (quote)

Section 7, closing paragraph:

> We do not reward feature breadth, framework name-dropping, or building scaling infrastructure (queues, clusters, multi-tenant plumbing). Designing your core abstractions so they could scale to the real environment is valuable; prematurely building that infrastructure is not. A small, correct, well-argued system is the goal.

Cross-check with Section 5:

> Prefer a thin-but-real version of every core requirement over a polished subset.

Cross-check with Section 8: stretch goals are *"Only if you have time and a solid core. Pick at most one or two — depth over breadth."*

### 1.3 Independent emphasis map (what “central” means in practice)

From §7 + §5 together, the **load-bearing evaluation surface** is:

1. Artifact schema + replay contract (design + implementation)
2. Deterministic replay with explicit error/outcome taxonomy
3. Safety + escalation/control-transfer model
4. Real LLM discovery run with evidence (non-negotiable per §4)
5. Design-only answers for heterogeneity & multi-tenant (§3.7)
6. Clear Cuts / mock seams in REPORT.md

Everything else is support or stretch.

---

## 2. Must-have vs design-only vs stub-ok — independent cut line

### 2.1 MUST-HAVE (implement end-to-end; graders will try the thread)

Aligned to Section 3 + the Section 5 through-line:

> a goal → an LLM-driven run that completes it → a saved capability artifact → a deterministic replay with input params, outputs, and error/outcome handling → a human-escalation path that can take over the live session → evidence for both runs.

| Seam | Must be real | Minimum bar |
|------|--------------|-------------|
| **3.1 Goal-driven agent loop** | Yes | Live UI observe→decide→act; real interactions; stop conditions |
| **3.2 Structured artifact** | Yes | Typed, versioned, serializable; steps; locator IDs; typed I/O; checkpoint; reviewable contract |
| **3.3 Deterministic replay** | Yes | No LLM in decision loop; stable targeting; checkpoint; structured result including business outcomes vs failures |
| **3.4 Safety & policy** | Yes | Configurable allowlist; risky vs reversible handling; no secrets/PII in artifacts/logs |
| **3.5 Evidence / observability** | Yes | Structured logs + at least one richer failure signal |
| **3.6 HITL escalation & handoff** | **Mechanism real** | Detect stuck → intervention request with context → **same live session** pause/cede/resume → record human actions |
| **§4 Discovery authenticity** | Yes | *"At least one genuine LLM-driven run against a live surface, with the evidence in `/evidence/`"* |
| **§6 Deliverables shape** | Yes | Public repo, README demo path, REPORT.md seven headings, `/evidence/` |

### 2.2 DESIGN-ONLY (write-up / abstractions; do not build plumbing)

| Seam | Section | Cut line |
|------|---------|----------|
| Surface abstraction to legacy web + desktop | §3.7 | Credible seam between perceive/act adapter and recorded flow; do **not** implement desktop |
| Multi-tenant reuse / override / drift | §3.7 | Schema + specialization story; do **not** build tenant registries, fleet orchestration, or per-tenant infra |
| Scaling topology | §§4, 7 | May *describe* sync vs queued; must **not** ship queues/clusters as “proof of seriousness” |
| Full operator console / co-browsing | §3.6 | Design the rest; implement minimal handoff |

### 2.3 STUB-OK (mock deliberately; document in Cuts)

| Seam | Section | Allowed stub | What must remain real |
|------|---------|--------------|------------------------|
| Operator UI | §3.6 | Bare/mock operator surface | Control-transfer model + same-session handoff |
| Desktop / second surface | §§3.7, 4 | Not implemented | Abstraction seam in schema/engine design |
| Multi-tenant runtime | §3.7 | Not implemented | Artifact representation for reuse/override |
| “Without live services” path | §6.1 | Document how to run offline/demo | Does not replace the one real LLM discovery run in evidence |
| Stretch goals (§8) | §8 | Entirely optional | None required |

### 2.4 Independent cut-line statement

**Ship one concrete surface + one real discovery + one deterministic replay path (incl. at least one exceptional/business-outcome demo) + a real same-session HITL control-transfer seam + allowlist/redaction + evidence pack.**  
**Argue** heterogeneity and multi-tenant in REPORT.  
**Mock** operator chrome and non-chosen surfaces.  
**Refuse** queues, clusters, multi-tenant plumbing, and fake discovery.

---

## 3. Glossary terms applied to designs (Section 10) — especially business outcome vs failure

### 3.1 Term → design implication

| Term (§10) | Design implication for this take-home |
|------------|----------------------------------------|
| **Computer use** | Discovery path must be LLM driving UI (observe/act), not API integration. API path is explicitly out of scope (§1). |
| **DOM / clean DOM** | Prefer mechanisms that survive dirty markup; do not assume test IDs (§1, §3.1 bias). |
| **Accessibility tree** | Strong candidate for cross-surface story (web → desktop) in §3.7 design. |
| **Locator / selector** | Artifact must store *how* controls are identified with robustness reasoning (§3.2); replay hangs on this (§3.3). |
| **Test ID** | Treat as unavailable in the “real environment” narrative; OK if proxy has them, but design must not depend on them as the only strategy. |
| **Deterministic replay** | Production path: *"no model deciding anything. Same inputs, same steps, same outputs."* Always-on LLM in prod replay fails the brief’s through-line (§2). |
| **Checkpoint** | Success is asserted, not assumed after click; required in artifact + replay (§§3.2–3.3). |
| **Business outcome vs. failure** | **Most common design mistake** (quoted below). Result contract must distinguish outcomes callers need from crashes. |
| **Tenant** | Design-time reuse/override/drift story only (§3.7); not a build target. |

### 3.2 Business outcome vs failure — the critical cut

Glossary §10:

> **Business outcome vs. failure** — "no such member" is a legitimate answer the caller needs, not a crash. Conflating the two is the most common design mistake here.

Section 3.3 requires the result contract to distinguish:

1. **Expected business outcomes** (e.g. no such member) — success-shaped *information* for the caller  
2. **Recoverable conditions** (known interstitial, transient load) — deliberate recovery  
3. **Hard failures** — stop with debuggable detail (step, expected, observed)

**Independent design rule:** If replay treats “not found / validation rejected / permission denied” as undifferentiated `error: true` with a stack trace, the submission fails the *robustness* criterion even if the happy path is pretty. Model these as first-class typed outcomes in the artifact/result schema, not as afterthought string matching in logs.

### 3.3 Environment properties that constrain design (§1)

- Stable UIs → record-once/replay-many is viable; **do not** over-invest in constant-drift frameworks.  
- Real runtime errors → invest in taxonomy, waits, checkpoints, dialogs/timeouts.  
- Heterogeneous surfaces → adapter seam > one-browser-only ontology baked into the artifact forever.  
- Multi-tenant same-vendor variants → parameterization + override hooks in schema, not N recordings as the only story.

---

## 4. Attacks on typical overbuild

These are anti-goals relative to §§5, 7, 8.

### 4.1 Queues / job systems

**Attack:** “Production-grade” Redis/SQS workers for discovery and replay.  
**Why it fails the brief’s incentives:** Section 7 explicitly lists queues as non-rewarded scaling infrastructure. A sync (or simple in-process) path that completes the vertical slice scores higher than an idle message bus.  
**Acceptable residual:** One sentence in Architecture justifying *why* you stayed single-process (or why a tiny queue exists for HITL pause) — not a platform.

### 4.2 Clusters / orchestration

**Attack:** K8s, multi-node session farms, service meshes.  
**Why non-viable as scope:** Time-box + “appropriate simplicity” (§7); hundreds-of-tenants is a *design* constraint (§1, §3.7), not an implementation SLA for the take-home.

### 4.3 Multi-tenant plumbing

**Attack:** Tenant tables, SSO per institution, config service, artifact registry with tenancy ACLs, “base vs override” runtime fully implemented.  
**Brief position:** §3.7 is *"design, not necessarily build"*; §7 says designing abstractions that *could* scale is valuable, building the plumbing is not.  
**Minimum credible design:** parameterized artifact + explicit override/specialization fields + drift detection *concept* in REPORT — without shipping the fleet.

### 4.4 Fake discovery without a real LLM run

**Attack:** Hand-authored artifacts, recorded Playwright codegen sold as “agent,” scripted mock LLM, or transcript-only demos.  
**Hard rule (§4):**

> One thing that isn't your call: the discovery run has to be real. At least one genuine LLM-driven run against a live surface, with the evidence in `/evidence/` to show it happened.

Without that, graders *"can't assess a description of it."* This is a disqualifying gap, not a Cuts item.

### 4.5 Always-on LLM in production replay

**Attack:** Replay re-prompts the model each step “for robustness,” or unbounded assisted recovery as the default path.  
**Through-line (§2):**

> The model discovers. The artifact becomes a reusable capability. Deterministic replay is how the AI agent invokes it in production.

§3.3: replay *"without invoking the LLM for decisions."*  
§8 Assisted fallback is optional, **bounded**, policy-checked, single-step, never open-ended — and only after a solid core. Defaulting prod replay to LLM re-reasoning inverts the product economics the brief describes (§1: reliably and cheaply, without re-reasoning).

### 4.6 Adjacent overbuilds (same failure mode)

- Polished co-browsing operator console (§3.6 out of scope)  
- Multiple stretch goals (§8: at most one or two)  
- Framework name-dropping without a working thread (§7)  
- Automating real bank systems or real PII/credentials (§§4, 9)

---

## 5. What would FAIL the take-home even if code is pretty

Independent fail conditions (any one can sink a polished repo):

1. **No genuine LLM discovery evidence** in `/evidence/` (§4, §6.3).  
2. **Replay still uses the LLM for decisions** as the primary production path (§§2, 3.3).  
3. **Missing vertical slice** — e.g. beautiful agent loop but no artifact contract, or artifact without deterministic replay, or replay without HITL same-session handoff (§5 through-line).  
4. **Happy-path-only replay** with no deliberate handling of runtime/business exceptions (§§1, 3.3) — especially conflating business outcomes with hard failures (§10).  
5. **HITL as TODO / new session** — operator must take *the same live session*; mock UI is fine, fake control model is not (§3.6, §7).  
6. **No allowlist / no redaction story with enforcement** for secrets & sensitive data (§3.4).  
7. **Wrong problem solved:** API integration instead of computer-use UI automation (§1).  
8. **Unsafe/illegal target:** real bank systems, real credentials, ToS-violating automation (§§4, 9).  
9. **Deliverable shape failure:** missing REPORT headings, no demo commands, evidence incomplete (§6).  
10. **Breadth instead of depth:** queues/clusters/multi-tenant infra + shallow schema/error model (§§5, 7).  
11. **Cannot defend decisions** — AI-assisted is fine, but §9 requires ownership/explanation of every part.

Pretty code that fails (1)–(5) is still a fail on the criteria that are weighed highest.

---

## 6. Minimum evidence pack that satisfies Section 6.3

Section 6.3 (paraphrase + requirements):

> A demonstration of the end-to-end flow in `/evidence/` — a saved example artifact plus logs from both a discovery run and a replay run. Ideally include one replay that hits an error or exceptional state … A short screen recording is welcome but optional.

### 6.1 Independent minimum pack (sufficient)

| Artifact | Purpose | Maps to |
|----------|---------|---------|
| **Saved capability artifact** (versioned JSON/YAML/etc.) | Proves §3.2 emission from a real run | §6.3 “saved example artifact” |
| **Discovery run log** (structured) | Shows observe→decide→act + why | §§3.1, 3.5, 6.3 |
| **Discovery richer signal** (at least on failure path; ideally also success snapshot) | Screenshot / DOM / a11y / trace | §3.5 |
| **Replay run log** (deterministic, no LLM decisions) | Proves §3.3 production path | §6.3 |
| **Replay exceptional/business-outcome run** (strongly expected) | Bad input / not-found / injected failure → typed result | §§3.3, 6.3 “ideally” → treat as **near-must** for robustness score |
| **HITL evidence** (minimal) | Intervention request payload + pause/resume + human action record on same session | §§3.6, 5 through-line |
| **README demo commands** pointing at these | Reproducibility | §6.1 |

### 6.2 Optional (nice, not required)

- Screen recording (§6.3)  
- Multi-run stability (§8)  
- Second-tenant variant demo (§8 canonicalization)

### 6.3 Evidence integrity rules

- Discovery must be **real LLM** (§4).  
- No secrets/PII in committed evidence (§§3.4, 9).  
- Prefer sandbox/demo/local target (§§4, 9).

---

## 7. Independent recommendations (NOT locks)

Labeled recommendations for synthesizer / human gate — defendable defaults, not prescriptions. Section 4 leaves these as the candidate’s call.

### 7.1 Target surface class — **RECOMMENDATION (not lock)**

**Recommend: Local (or fully controlled) multi-step web app with intentional legacy-ish friction**  
(search → detail → action, or multi-field form → confirmation), plus at least one injectable business outcome (not-found / validation).

**Why this class:**

- Exercises §§2–3 without ToS/rate-limit risk (§§4, 9).  
- Can add hostile traits (iframes, tables, weak semantics) to match §1 / §4 “legacy/no-clean-DOM” bias.  
- Makes exceptional-state demos deterministic for evidence (§6.3).

**Acceptable alternatives (still recommendations):** public demo/sandbox with permissive automation norms; simple desktop app if leaning hard into §3.7 story — higher mechanism cost.

**Avoid as primary:** real bank/CU systems; anything needing real customer PII/credentials.

### 7.2 Computer-use mechanism class — **RECOMMENDATION (not lock)**

**Recommend: Browser automation with a perception adapter biased to accessibility-tree (and/or role/name) locators, with screenshot as failure evidence — not as the only happy-path actuator unless chosen deliberately.**

**Why this class:**

- §3.1: bias toward approaches that work without clean DOM.  
- Accessibility tree supports the §3.7 desktop generalization narrative (§10).  
- Screenshot+coordinates alone is fair (§2) but harder for deterministic replay/checkpoints; treat as optional stretch or secondary signal unless the candidate strongly prefers CUA-style control.

**Avoid locking to:** “Playwright-only CSS/test-ID locators forever” as the artifact ontology.

### 7.3 Language / runtime class — **RECOMMENDATION (not lock)**

**Recommend: TypeScript (Node) or Python** — whichever yields fastest typed schema + one solid browser/automation ecosystem for the chosen mechanism.

**Why either class is fine:** §4 explicitly does not prescribe language; graders weigh schema/replay/HITL/safety over stack novelty (§7).

**Avoid:** polyglot microservices “for realism,” or exotic runtimes that obscure the vertical slice.

### 7.4 Architecture class — **RECOMMENDATION (not lock)**

**Recommend: Single-process (or two clear modules: discover vs replay) with explicit session/control-ownership state machine for HITL.**  
Justify simplicity per §7. Do not introduce queues/clusters unless a human gate forces a specific constraint.

---

## 8. Human-gate questions G1–G13 (refuse to silently assume)

These are decisions the brief leaves open (§4) or that carry legal/product risk (§§4, 9). Independent reviewer will **not** silently lock them.

| ID | Question | Why it must be human-gated |
|----|----------|----------------------------|
| **G1** | Which **proxy target** (local app vs public sandbox vs desktop) is approved? | ToS, rate limits, credentials, reproducibility (§§4, 9) |
| **G2** | Which **computer-use mechanism** class is preferred (DOM, a11y, screenshot+coords, OS automation, CUA SDK)? | §3.1 bias vs implementation risk; shapes artifact schema |
| **G3** | Which **language/runtime** is preferred for the submission? | §4 open; affects maintainability and grader runnability |
| **G4** | Which **LLM provider/model** and who pays/owns API keys for the mandatory discovery run? | §4 requires candidate API access; secrets must stay out of repo (§9) |
| **G5** | What is the **canonical demo goal** (happy path) and the **canonical business-outcome goal** (e.g. not-found)? | Drives artifact I/O types and §6.3 evidence |
| **G6** | How aggressive should **risky/irreversible action** policy be (block vs confirm vs flag)? | §3.4 says “your call, justify it” — product stance, not silent default |
| **G7** | What is the **minimum HITL operator surface** acceptable (CLI signal vs mock web page vs attached browser)? | §3.6 allows mock UI but control model must be real |
| **G8** | Is **any** §8 stretch goal desired (and which one), or core-only? | §8: at most one or two; depth over breadth |
| **G9** | Storage format for artifacts (file-backed vs light DB) and **versioning policy**? | Focal evaluation point (§3.2) but format is §4 open |
| **G10** | Public GitHub org/visibility and **secret-scanning** expectations before push? | §11 submission + §9 keep secrets out |
| **G11** | Are we allowed to **depend on third-party hosted** demo sites long-term, or must the target be vendored locally for grader offline runs? | §6.1 “run without live services if applicable” vs flaky public sites |
| **G12** | Redaction policy details: what counts as **regulated financial / PII** in the proxy world (synthetic IDs vs real-looking data)? | §§3.4, 1 context |
| **G13** | Time-box / depth ceiling: stop after vertical slice, or authorize one stretch (e.g. cross-tenant override demo)? | §§5, 8, 9 judgment-not-endurance |

Until G1–G4 and G7 are answered, implementation should not pretend those seams are locked.

---

## 9. Cross-links for synthesizer

- Anti-pattern draft: `/workspace/_lab/research/non_viable.md`  
- Do not treat this memo as a PRD.  
- Quotes from Project.md Sections **1, 2, 3.1–3.7, 4, 5, 6, 7, 8, 9, 10, 11** as cited above.

---

## 10. Independent cut lines (summary for parent agent)

1. **Evaluation cut:** Schema + deterministic replay/error taxonomy + real discovery + real HITL session handoff outweigh all scale theater (§7).  
2. **Build cut:** One surface, full §3 vertical slice; stub operator UI; design-only for §3.7.  
3. **Outcome cut:** Business outcomes ≠ hard failures — first-class in result contract (§§3.3, 10).  
4. **Discovery cut:** Fake LLM discovery = fail (§4).  
5. **Replay cut:** Always-on LLM replay = fails product through-line (§§2, 3.3).  
6. **Recommendation cut (not locks):** controlled multi-step web target; a11y-biased browser automation; TS or Python; single-process + control state machine.  
7. **Human cut:** G1–G13 above — especially target, mechanism, language, LLM keys, HITL surface, stretch authorization.
