# Adversarial Review Pass 2 — Brief Decomposition × HITL/Safety

**Reviewer:** cursor-grok-4.5-high (Grok family) — ADVERSARIAL  
**Targets:** GPT-authored `/workspace/_lab/research/brief_decomposition.md`; Claude-authored `/workspace/_lab/research/_hitl_safety.md`  
**Attack lenses:** `/workspace/Project.md`; this reviewer’s `/workspace/_lab/research/_independent_brief_eval.md` cut lines; `/workspace/_lab/research/non_viable.md`  
**Date:** 2026-08-16  
**Status:** Cross-review for synthesizer — **not a PRD**  
**Disagreements preserved:** Yes. Where GPT, Claude, and independent diverge, all three positions are named.

---

## 0. Verdict (one screen)

| Artifact | Overall adversarial grade | Worst failure mode if synthesizer trusts it blindly |
|---|---|---|
| **brief_decomposition.md** | Strong requirements map; **over-indexes on classification theater and human-gate sprawl**; softens §3.3 demo bar with “when present / representative subset” language that can excuse happy-path-only evidence. | Ship a complete prose matrix, then a thin demo that never proves business-outcome ≠ failure. |
| **_hitl_safety.md** | Strong on taxonomy precedents, allowlist/redaction, ownership enum; **oversells CDP + “click the headed window” as the default real handoff** and under-discusses grader/headless runnability. Never engages sibling `browser.bind()` research. | “Same live session” works on the author’s laptop DISPLAY and **fails §6.1 / §7 for graders with no GUI**, while still claiming §3.6 is satisfied. |

Independent cut lines that both papers must survive (from `_independent_brief_eval.md` §10):

1. Schema + deterministic replay/error taxonomy + real discovery + real HITL session handoff ≫ scale theater (§7).  
2. One surface, full §3 vertical slice; stub operator UI; design-only §3.7.  
3. Business outcomes ≠ hard failures — first-class in the result contract (§§3.3, 10).  
4. Fake LLM discovery = fail (§4).  
5. Always-on LLM replay = fail (§§2, 3.3).

---

## 1. Did the Brief Analyst miss binding requirements or over-weight design-only work?

### 1.1 What GPT got right (do not discard)

- Correct through-line quote and separation of discovery vs production invocation.  
- Correct §3.7 classification: surface/multi-tenant/drift = **Design in `REPORT.md` only**; multi-tenant plumbing = non-rewarded (§7).  
- Correct stub rule for §3.6: mock operator *chrome*; do not mock pause/cede/resume.  
- Correct hard fails: fake discovery, transcript-as-artifact, always-on LLM replay, secrets in repo.  
- Useful: exact `/REPORT.md` heading contract and §7 non-reward quote.

### 1.2 Binding requirements GPT under-weights or buries

| Binding text (Project.md) | Attack on brief_decomposition |
|---|---|
| §5 through-line: *“a human-escalation path that can take over the live session → evidence for both runs.”* | §6.3 / deliverable table emphasizes discovery + replay logs + “ideal” exceptional replay. **HITL evidence** (intervention request + ownership transitions + human-action record) is required by the §5 thread and §3.6 (“Preserve context and evidence across the handoff, and record what the human did”) but is not elevated to the same “grader-visible proof” tier as discovery/replay logs. Independent §6.1 packed HITL evidence as **minimum**. GPT misses this as a deliverable risk. |
| §3.6: *“Let the human operate the **same live session** … not a fresh one.”* | Correctly marked non-viable as new session, but the cut guidance still allows “bare same-session view/control endpoint **or** headed-session handoff” without forcing a **headless-safe** proof path. That ambiguity lets Claude’s headed-only default sneak through. |
| §3.3 result contract: success / known business outcome / failure with step, expected, observed | GPT correctly lists the three-way split, then dilutes demo duty: many named conditions are *“Must implement as an explicit detectable category when present; demonstration may use a representative subset.”* That sentence is **legally careful and strategically dangerous** — a synthesizer can “represent” permission denial and expiry only in schema comments and still claim compliance. Independent cut: treat **at least one business-outcome replay + one recoverable + one hard failure** as near-must for robustness score (§7 rank 3). GPT’s normative protocol *says* this, then the classification table softens it. **Preserve disagreement:** GPT = category coverage in schema + subset demos; Independent = exceptional **evidence** is near-must even though §6.3 says “ideally.” |
| §3.4: *“The agent must not act outside it.”* | Enforcement is correctly required. GPT does not stress enough that allowlist must gate **both** discovery tool calls and replay steps (Claude §2.1 layering is stronger here). |
| §4: discovery reality is non-negotiable | Covered well. |
| §6.1: *“how to run without live services if applicable”* + easy demo commands | Under-weighted vs HITL/environment reality. Graders need a path that does not require a visible desktop for every seam — especially HITL. |

### 1.3 Over-weight / design-creep in the Brief Analyst memo

1. **Human-gate sprawl.** Section 10 marks target, model keys, risky-action scenario, operator surface, and final email as gates. Independent also has G1–G13 — **agree gates exist** — but GPT’s narrative treats too many §4 candidate calls as blocking “implementation lock,” which can stall a take-home that §9 wants time-boxed. Attack: gates are for *risk* (ToS, keys, unsafe targets), not for every schema micro-decision.  
2. **Schema bloat via “consider compatibility/migration and review status even if approval workflow is not built.”** Approval is a §8 stretch. Baking review-lifecycle into the *must* artifact bar over-weights design-adjacent product. Independent: versioned + reviewable contract is must; draft→approved workflow is optional.  
3. **Normative “member servicing” proxy in §11** reads like a soft PRD. Fine as interview-shaped guidance; synthesizer must keep it labeled **recommendation (not lock)** — GPT does label it, but the concreteness will dominate weaker agents.  
4. **§3.7 “core abstractions avoid a dead end” as Must implement (thin-but-real), cross-cutting** — Independent agrees this is real, not prose-only. **No disagreement.** Attack is the opposite of over-weight: GPT is correct to refuse empty interfaces.  
5. **Design-only correctly classified, but the §3.3 example matrix consumes more analyst attention than HITL grader-runnability.** Relative weighting error: robustness examples ≫ environment-feasible handoff.

### 1.4 Independent cut-line scorecard vs GPT

| Independent cut | GPT alignment | Adversarial note |
|---|---|---|
| Build cut: one surface, full §3, stub operator UI, design-only §3.7 | Aligned | Keep. |
| Outcome cut: business ≠ failure | Aligned in prose; **weak in demo bar** | Force exceptional evidence into must-fix. |
| Discovery / replay cuts | Aligned | Keep. |
| HITL same-session | Aligned in words | Environment feasibility gap (see §2, §5). |

**Section 1 finding:** GPT did **not** miss whole Section 3 capabilities. The miss is **operational**: HITL evidence pack, headless-safe handoff, and a firm exceptional-replay bar. The over-weight is **gate/process and schema-adjacent lifecycle**, not multi-tenant plumbing (which GPT correctly keeps design-only).

---

## 2. HITL recommendation: headed Chromium + CDP port + human clicks the same window — same live session? Grader-runnable? Failure modes?

Claude §1.2 recommendation (paraphrase of claim): launch one headed Chromium with `--remote-debugging-port`; automation pauses issuing commands; human clicks the visible OS window; resume via CLI/button; mark remote/noVNC as design-only.

### 2.1 Is it “same live session”?

**Partial yes — process/session identity.** Project.md §3.6:

> Let the human operate the **same live session** the automation was using — **not a fresh one**.

If the browser process, user profile/cookies, tab, and DOM remain alive while only the *input issuer* changes, that satisfies the brief’s session identity. Independent and GPT agree: new browser/context = fail.

**But CDP is not what makes the Claude default path “same session.”** In the recommended local path, the human drives the OS window with native mouse/keyboard. Cookies and DOM continuity come from **not tearing down the page**, not from CDP. CDP/`connectOverCDP` is orthogonal to OS-level clicking. Claude elevates CDP as *“the primary real mechanism”* then recommends a handoff that **does not use CDP for human input**. That is a conceptual sleight of hand.

### 2.2 Is it grader-runnable?

**Often no.** Failure modes:

| Failure mode | Why it breaks grading / §6.1 |
|---|---|
| **No DISPLAY / SSH / CI / cloud agent / Docker without X11** | Headed Chromium never appears; “click the window” is impossible. Claude marks the remote channel design-only — i.e. **the recommended path has no fallback that is still in scope**. |
| **Headless Playwright default** | Common grader setups launch headless; headed must be explicit and may be blocked. |
| **Human-in-the-loop as a person** | Graders will not babysit a GUI. A submission that requires a live human click to prove §3.6 is not “easy to run” (§7 Code quality). Need a **scripted operator** (second client or injected input) *or* a recorded evidence pack plus a reproducible dry-run that flips ownership and injects actions without a person. |
| **Action capture gap** | OS clicks are not automatically “recorded what the human did” (§3.6). Without page instrumentation, CDP Input sniffing, or a second client that issues actions, the audit log is a resume button + hope. Claude §6 proposes action-type logging — **not implemented by “just click the window.”** |
| **Dual-control race** | If the actuator guard fails, automation and human fight the same page. Ownership enum without enforced `act()` gate = theater. |
| **Open debugging port** | Fixed `9222` on a shared machine is a security footgun; also invites “attach a *new* tool that creates a new context” mistakes sold as same session. |
| **Resume without re-observe** | Claude §6 correctly requires re-observation. If synthesizer ships pause/resume flags only, checkpoint lies. |
| **Evidence during credential entry** | Claude cites OpenAI Takeover Mode (no screenshots during sensitive input). If capture continues, §3.4 redaction fails in the exact HITL window. |

### 2.3 Disagreement matrix (preserve)

| Position | Claim |
|---|---|
| **Claude** | Headed same-window + CDP attach story is the cheapest *fully real* default; remote relay is design-only. |
| **Independent (this review)** | Same-window is valid **developer** demo of session identity, but **insufficient as the sole graded path**. Control-transfer must be demonstrable without a physical display: ownership lease + paused actuators + same `BrowserContext`/`Page` + recorded human-interval actions (scripted or second client). |
| **GPT brief** | Correctly flags operator control in headless/cloud as a **human gate** — then fails to mark headed-only as a submission risk in the fail table. |
| **Sibling tech_stack.md** (context, not under review) | Prefers `browser.bind()` as first-class multi-client transfer — Claude never mentions it. |

**Section 2 finding:** Claude’s default is **session-real on a laptop** and **grader-fragile**. Treating “human clicks headed Chromium” as the *definition* of §3.6 compliance will fail the take-home’s runnability bar even if the cookies stayed warm.

---

## 3. `browser.bind()` vs `page.pause()` vs CDP port — thinnest REAL control-transfer?

Project.md §3.6 seam:

> automation must be able to **pause, cede control, and resume on the same session**, and there must be a way to know **who is (or should be) in control**.

Scope note:

> Mock the operator UI if needed, but make the **handoff mechanism and the control-transfer model real**.

### 3.1 Layered answer (do not collapse these)

| Layer | What it is | Thinnest real piece |
|---|---|---|
| **A. Control model (required)** | Ownership state + actuator refuse-while-human + audit transitions + resume/re-observe | Enum/lease + guard on every `act()` — **independent of Playwright API**. Without this, every transport is fake. |
| **B. Session continuity (required)** | Same browser context/page/process across pause | Do not close context; do not `newPage()` for the operator. |
| **C. Human input channel (pick one)** | How the human (or scripted operator) actually changes the UI | See comparison below. |
| **D. Operator chrome (stub-ok)** | CLI / JSON file / mock page / Inspector | Mock freely per §3.6. |

### 3.2 Transport comparison

| Mechanism | Same live session? | Explicit “who has control”? | Records human actions? | Headless/grader friendly? | Thinness | Verdict for this take-home |
|---|---|---|---|---|---|---|
| **Ownership lease + headed OS click** (Claude default; CDP optional) | Yes if context kept | Only if you build A | **No** unless extra instrumentation | **Poor** | Thinnest *local demo* of session identity | Viable **demo**, not sole proof |
| **`page.pause()`** | Yes (Inspector pause on headed page) | Weak — Playwright Inspector owns UX; your state machine is secondary | Weak / opaque | Poor (headed + Inspector) | Thinnest *built-in* pause | Viable crude fallback; **weak** as the designed control-transfer model graders defend in interview |
| **CDP `--remote-debugging-port` + `connectOverCDP`** | Yes if attaching to existing target/context | Possible (multi-client) | Possible if operator client dispatches `Input.*` and you log those | Medium — works headless if second client injects input; still need a non-GUI operator client | Lower-level, more footguns | Viable when you need attach/inject; **not required** for OS-click path; Claude oversold as “primary” |
| **`browser.bind()` / `unbind()` (Playwright ≥1.59)** | Yes — named multi-client on one live browser | Strongest first-party “cede to another client” | Strong if second client is the operator path you log | Good — second client can be CLI/script in CI | Thinnest *structured product* multi-client seam in Playwright | Best match to “control-transfer model real” **if** version-pinned and smoke-tested (tech_stack already warns 1.59 novelty) |

### 3.3 Adversarial ranking (this reviewer)

1. **Required core:** Layer A + B (lease + same context). Non-negotiable.  
2. **Thinnest REAL control-transfer for a graded submission:** **`browser.bind()` (or equivalent second-client attach) + lease + scripted/mock operator client** that issues a few actions and signals resume — proves cede/resume without a human eyeball.  
3. **Thinnest local authenticity demo:** headed window + lease (CDP unnecessary). Keep as *supplementary* evidence/screen recording, not as the only path.  
4. **`page.pause()`:** acceptable emergency fallback; do **not** let it replace ownership audit + action capture.  
5. **Raw CDP port alone:** not a control-transfer model — only a pipe. Claiming CDP proves §3.6 without lease + recorded operator channel is **non-viable theater**.

**Claude miss:** zero engagement with `browser.bind()` despite it being the strongest “multiple clients on one live browser” primitive called out in parallel stack research.  
**GPT miss:** names “headed-session handoff” as an acceptable minimum without ranking transports against grader constraints.

**Preserve disagreement with Claude:** CDP is useful infrastructure, not the definition of handoff.  
**Preserve disagreement with tech_stack enthusiasm:** `browser.bind()` is promising but must not be locked without a version pin + smoke test; lease+same-context remains the brief-facing model even if bind is unavailable.

---

## 4. Error taxonomy — conflation of business outcome vs failure still lurking?

Glossary §10 (Project.md):

> **Business outcome vs. failure** — "no such member" is a legitimate answer the caller needs, not a crash. **Conflating the two is the most common design mistake here.**

§3.3 requires distinguishing:

1. expected business outcomes  
2. recoverable conditions  
3. hard failures  

…and a structured result: success (with outputs), known business outcome, or failure with step/expected/observed.

### 4.1 Claude — mostly strong, two lurking conflations

**Good:** UiPath precedent for business vs system exception; explicit “Access Denied” ambiguity; indeterminate post-write halt; typed `ReplayResult` discriminant.

**Lurking conflation A — recoverable as a terminal peer kind.** Claude §3.4:

```text
| { kind: "recovered"; recoveredVia: string; then: ReplayResult }
```

Recoverable conditions are **mid-flight handling**, not a third terminal outcome peer to “no such member.” Folding `recovered` into the *caller-facing* result union invites APIs that treat “we dismissed a cookie banner” like a business answer. Brief’s caller contract is success | business outcome | failure. Recovered events belong in **run log / evidence**, with the terminal result still one of the three. Independent cut agrees: three-way in the **result contract**; recovery is deliberate handling inside the executor.

**Lurking conflation B — RPA naming.** Mapping “Business Exception” → “Business outcome” while UiPath still treats business exceptions as failed queue items is pedagogically useful and **nomenclaturally hazardous**. If the schema ships `business_exception` or HTTP 500 for not-found, graders will score a glossary fail. Force names like `business_outcome` / `MEMBER_NOT_FOUND` on the **success-shaped information** path.

**Lurking conflation C — policy/allowlist abort vs HITL.** Claude routes some allowlist violations to “flag for artifact review” and only sometimes to live control. Fine as design judgment — but do not encode policy violations as `business_outcome`. They are hard failures (or blocked pre-dispatch), not member-not-found.

**Lurking conflation D — stretch approval gate.** Tying irreversible replay to “approved for unattended replay” (§8 Confidence & approval) risks making a stretch goal load-bearing for §3.4. Core can block/confirm without a draft→approved product.

### 4.2 GPT brief — soft doors left open

- Validation errors: *“classify it as a business outcome or failure according to the capability contract.”* True, but without a **worked not-found example as near-must evidence**, authors will dump validation into `failure`.  
- Permission denial row similarly hedges. Claude’s ambiguity callout is better; GPT should have marked not-found as the **canonical** business-outcome demo (GPT actually does call not-found “clearest business-outcome case” — **keep that**, and elevate it above the “subset” weasel words elsewhere).

### 4.3 Independent rule (reaffirmed)

If replay returns undifferentiated `error: true` / thrown strings for not-found, the submission fails robustness even with a pretty happy path. **No disagreement** with either paper’s intent; disagreement is with Claude’s 4-kind terminal union and GPT’s demo-optional wording.

---

## 5. Operator UI mock vs making graders click a headed browser they may not have

§3.6 scope note (Project.md):

> A full real-time co-browsing operator console is **out of scope**. A minimal but real handoff — pause automation, expose the live session for manual control (**even a bare/mock operator surface**), signal resume, and capture the human's actions — … **Mock the operator UI if needed**, but make the handoff mechanism and the control-transfer model real.

### 5.1 Attack on Claude G9

Claude G9 recommends **CLI/API pause + literal same headed browser window** *rather than* a mock operator console, arguing it is “more genuinely the same live session.”

**Adversarial rebuttal:** The brief already separates **session identity** from **operator chrome**. Mocking the UI does **not** make the session fresh. Claude optimizes for authenticity-of-input-device (OS mouse) at the expense of:

- grader machines without GUIs  
- reproducible demo commands (§6.1)  
- deterministic evidence generation in CI  

That inverts the stub-ok table Claude themselves wrote (§10: “Operator console UI — Mocked OK”).

### 5.2 Attack on GPT

GPT correctly human-gates headless/cloud operator control, then lists both “view/control endpoint **or** headed-session handoff” as analyst defaults — **without saying headed-only fails cloud graders**. Independent G7 left HITL surface open precisely because of this.

### 5.3 Synthesizer-safe shape (recommendation, not PRD)

- **Real:** same context, lease, pause, resume, re-observe, human-interval action log (redacted).  
- **Stub-ok:** operator chrome = CLI + JSON intervention file + optional tiny mock page.  
- **Optional authenticity:** headed OS-click path for local recording / optional screen capture.  
- **Required for “easy to run”:** scripted operator path that graders can execute headlessly.

**Preserve disagreement:** Claude prioritizes OS-window authenticity; this review prioritizes **mechanism real + demo runnable**. GPT is between them and under-specified.

---

## 6. Cuts that would FAIL §5 (thin-but-real every §3 item)

§5 (Project.md):

> Prefer a **thin-but-real version of every core requirement** over a polished subset.  
> **Cut depth, not whole capabilities.**

### 6.1 Cuts that fail even if code is pretty

| Cut | Why it fails §5 / §7 |
|---|---|
| Drop HITL to design-only / TODO / “operator approved” flag | §3.6 + §7 HITL criterion; §5 through-line |
| Happy-path-only replay; taxonomy only in REPORT | §3.3 + §10 + §7 robustness |
| Allowlist in YAML with no deny path | §3.4 enforce |
| No richer failure signal | §3.5 |
| Fake/scripted discovery | §4 |
| LLM decides replay steps | §§2, 3.3 |
| New browser for “handoff” | §3.6 same live session |
| Build queues/tenant registry; stub artifact I/O or HITL | §7 non-reward + §5 wrong cut direction |
| Mock ownership transition; polish co-browsing UI | Inverts §3.6 scope note |
| Skip recording human actions | §3.6 “record what the human did” |
| Represent all §3.3 error classes in schema but **demonstrate zero** exceptional replays | Fails robustness evidence; GPT’s “subset” language enables this trap |
| **Headed-only HITL with remote marked design-only**, when the run environment is headless | Effectively cuts §3.6 for graders — Claude-shaped trap |
| `page.pause()` only, no lease/audit/action capture | Looks like debugging, not a control-transfer model |
| Treat §3.7 multi-tenant as must-build | Wrong depth; starves load-bearing seams |
| Substitute §8 stretches (catalog, approval, codegen) for missing core | §8 + §5 |

### 6.2 Cuts that are allowed (do not fail §5)

- Operator UI polish / co-browsing  
- Desktop adapter implementation  
- Multi-tenant plumbing / drift service  
- Network egress firewall / VM sandbox  
- Every named runtime error as its own fixture (representative subset OK **if** the three-way contract is evidenced)  
- Screen recording  
- Stretch goals (zero is fine)

---

## 7. Cross-attacks: GPT brief ↔ Claude HITL

| Topic | GPT | Claude | Independent adversarial call |
|---|---|---|---|
| HITL minimum | Endpoint or headed handoff; gated | Headed window + CDP; remote design-only | **Lease + same context + scripted/mock operator**; headed optional |
| CDP | Barely discussed | Oversold as primary | Pipe, not model |
| `browser.bind()` | Absent | Absent | Strong candidate; version-risk |
| Taxonomy | Three-way; soft demo bar | Three-way + `recovered` terminal kind | Three terminal kinds; recovery = log events |
| Allowlist | Enforce both paths (lighter) | Strong layered design | Prefer Claude’s enforcement seriousness; keep network layer design-only |
| Risky actions | Human gate on scenario | Step-tagged risk; stretch approval creep | Tag on steps; confirmation without full approval product |
| §3.7 | Correctly design-only | Correctly design-only + cheap `overrides` field | Agree; optional `overrides` shape is fine, not required plumbing |
| Evidence | Discovery+replay; exceptional “ideal” | Strong redaction rules | Add **HITL evidence** to minimum pack; exceptional replay near-must |

---

## 8. Corrections to `non_viable.md`

Independent `non_viable.md` Top 8 still stand. Append these traps surfaced by Claude HITL + GPT brief + sibling stack notes (missed or under-specified in the first draft):

### 8.1 Add to non-viable list

29. **Headed-only HITL** that requires a human to click a GUI window, with **no headless/scripted operator path** — fails grader runnability (§§3.6, 6.1, 7) while claiming same-session success.  
30. **CDP debugging port / `connectOverCDP` cargo-culted as “control transfer”** without ownership lease, without stopping automation inputs, and/or without recording operator actions — pipe theater, not §3.6.  
31. **`page.pause()`-only HITL** with no explicit control-ownership model and no human-action audit — debugger UX ≠ handoff mechanism.  
32. **Terminal result union that makes `recovered` (or “business exception” failures) peer-confused with business outcomes** — glossary conflation in type clothing (§§3.3, 10).  
33. **Making §8 draft→approved (or full approval workflow) load-bearing for core risky-action policy** — stretch leaking into must-have (§§3.4, 8).  
34. **Continuing screenshot/DOM evidence capture while a human types credentials during takeover** — §3.4 + Claude’s own OpenAI Takeover precedent; still easy to miss in implementation.  
35. **Relying on the LLM to self-gate risky actions** without a deterministic pre-dispatch policy check — Claude cites Operator recall &lt; 100%; treat model volunteering as non-sufficient (§3.4).  
36. **`connectOverCDP` / second launch that creates a new context/page** sold as handoff — fresh session in disguise (#8 refinement).  
37. **Compliance-program / egress-firewall / PCI-cert theater** built instead of a small enforced allowlist+redaction module — overbuild adjacent to #5/#6.  
38. **Schema represents every §3.3 error class but evidence shows zero exceptional replays** — GPT “representative subset” weasel enabling happy-path-only scoring failure (#7 refinement).

### 8.2 Merge notes

- Keep: mock operator UI = viable; skip control-transfer = non-viable.  
- Add explicit: **mock UI + real lease/session** ≫ **real OS mouse + unreproducible headed-only demo**.  
- Refine #8: “email an operator” **and** “click this window on my laptop” are both insufficient if the control model is not demonstrable in the grader’s run path.

---

## 9. Must-fix list for synthesizer

Priority order — resolve these before locking architecture:

1. **HITL runnability:** Do **not** lock Claude’s headed-window-only default as the sole §3.6 proof. Require same `BrowserContext`/`Page`, ownership lease, pause/resume/re-observe, human-interval action log, **and** a headless-safe scripted/mock operator path for graders. Headed OS-click may be extra evidence only.  
2. **Control-transfer primitive:** Treat **lease + same session** as the brief-facing model. Rank transports: `browser.bind()` (version-pin + smoke) ≥ second-client CDP inject ≫ `page.pause()` fallback ≫ raw CDP port alone. Reject “CDP port = handoff.”  
3. **HITL evidence pack:** Intervention request payload + ownership transition log + redacted human actions must land in `/evidence/` alongside discovery/replay — not optional prose.  
4. **Error taxonomy shape:** Caller-facing result = `success | business_outcome | hard_failure` (names flexible; meanings not). Recoverable = bounded executor handling + log events — **not** a confused terminal peer. Ship one **not-found (or equivalent) business-outcome replay** in evidence.  
5. **Do not let GPT’s “category when present / subset” language excuse zero exceptional demos.** Near-must: one business outcome, one recoverable, one hard failure (injection OK).  
6. **Allowlist:** Enforce on discovery and replay pre-dispatch; network egress firewall remains design-only; no model self-gating as primary.  
7. **Risky actions:** Step-level risk tags + block/confirm without requiring §8 approval product.  
8. **Operator UI:** Prefer stub/mock chrome; do not spend depth on co-browsing; do not force graders to click a headed browser.  
9. **Keep §3.7 design-only;** optional schema `overrides` field is fine; no tenant plumbing.  
10. **Preserve disagreements in REPORT Cuts/Escalation:** document why headed authenticity was or wasn’t the graded path.  
11. **Update `non_viable.md`** with items 29–38 above (or merge equivalents).  
12. **Human gates that remain real:** G1 target/ToS, G4 LLM keys/secrets, G7 HITL surface **reinterpreted as** “scripted operator vs headed extra,” not “headed vs mock.” Final email/submission identity stays human (§11).  
13. **No PRD from this review** — cut lines and fix list only; stack/target remain §4 candidate calls pending gates.

---

## 10. Quote bank (Project.md anchors used above)

- §2 through-line: *“The model discovers. The artifact becomes a reusable capability. Deterministic replay is how the AI agent invokes it in production.”*  
- §3.6 same session: *“not a fresh one”*; mock UI OK; handoff mechanism real.  
- §5: *“thin-but-real version of every core requirement”*; *“Cut depth, not whole capabilities.”*  
- §7: *“We do not reward feature breadth, framework name-dropping, or building scaling infrastructure (queues, clusters, multi-tenant plumbing).”*  
- §10: conflating business outcome vs failure is *“the most common design mistake here.”*  
- §4: discovery run *“isn’t your call”* — must be genuine with `/evidence/`.

---

*End of adversarial pass 2. Synthesizer should treat §9 as the actionable checklist; §§1–6 as the argument record.*
