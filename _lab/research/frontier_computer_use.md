# Frontier computer use — web and desktop (independent research)

**Author:** Contrarian Frontier Computer-Use Researcher (`cursor-grok-4.6-high-fast`)
**Access date for all citations:** 2026-08-16
**Scope:** How frontier labs and serious OSS actually do computer use (web AND desktop), mapped onto `/workspace/Project.md` §§1–4, 3.1, 3.7, glossary.
**This file does not lock a stack.** Recommendations are attackable; G2 stays a human gate.

Viability legend used on every technique and notable stack:

| Tag | Meaning for *this* take-home |
|-----|------------------------------|
| **Viable for this take-home** | Thin-but-real implementation that satisfies a §3 must-have without painting §3.7 into a corner. |
| **Viable only as design story** | Cite in `REPORT.md` / artifact schema; stub the seam; do not build the platform. |
| **Not viable / avoid** | Conflicts with the brief (always-on LLM production path, fake discovery, overbuilt product), ToS, license, or grader incentives. |

---

## Thinking protocol

**Normative (what the brief actually requires).** The model discovers a goal against a live surface (`observe → decide → act`). A successful run compiles into a typed, versioned, reviewable *capability artifact* (steps, locators, typed params/outputs, checkpoint). Production invocation is *deterministic replay with no LLM in the decision loop*. Replay must classify runtime conditions as business outcome vs recoverable vs hard failure. HITL must pause the *same live session*, let a human act, resume. Safety is an allowlist plus redaction. Implementation is one concrete surface; §3.7 is a design story for heterogeneity (legacy web, desktop) and multi-tenant reuse. Discovery must be real and evidenced.

**Contrarian (where labs and GitHub stars diverge from the brief).** Frontier computer-use products are almost all *always-on LLM control*: screenshot → VLM → click coordinates → screenshot. That is the right *discovery* mechanism and the wrong *production* mechanism for this assignment. The brief is closer to “CUA as compiler, RPA as runtime” than to Operator / Claude Computer Use / Gemini Computer Use as a product. Stars measure “can an agent wander the open web,” not “can a bank replay a recorded capability 10,000 times cheaply with an audit trail.” Do not copy the product shape of the labs. Copy their *perception/action primitives*, then compile.

**Rejected (do not smuggle these in).** Always-on LLM clicks as the production path. Shipping Playwright MCP / browser-use / Stagehand `agent()` as the system. Treating a selector cache as a capability artifact. Fake discovery (hardcoded clicks dressed as an agent). Building a multi-tenant platform, Cloud PC fleet, or operator console product. Automating a real bank. Coordinate-only locators as the *replay* contract. AGPL copyleft (Skyvern) without a license review the human never did.

**Frontier reference (what is actually worth stealing).** (1) Microsoft’s explicit RPA-vs-CUA split and Magentic-UI’s plan-learning + same-session co-tasking. (2) Playwright’s accessibility snapshot as the cheap, deterministic observation channel. (3) Stagehand’s *idea* of LLM-once → cached selector — but replace the 48-hour cache with a versioned, reviewable artifact. (4) Anthropic/OpenAI/Gemini screenshot+coords as a *fallback perceive channel* when DOM/a11y lies. (5) Native OS a11y (UIA / AX / AT-SPI) as the desktop twin of the web a11y tree — the §3.7 seam.

**Grader lens.** Graders reward a working discovery run, a schema they can read, replay that does not call the model, an error taxonomy that does not call “member not found” a crash, and a HITL control-transfer model. They do not reward framework name-dropping, OSWorld leaderboard scores, or a Cloud PC. A hostile local HTML app that exercises frames/tables/no-test-IDs plus a `Surface` adapter interface that *could* grow a desktop backend is the high-leverage take-home. Implementing Win32 UIA is not.

**Recommendation (not a lock).** Discovery: custom observe–decide–act loop over Playwright, feeding the model an accessibility snapshot (primary) plus a screenshot (secondary, for evidence and dirty-UI fallback). Compile the successful trajectory into a capability artifact whose locators are role/name/text/frame-aware, not pixel points. Replay: Playwright executor, zero LLM decisions, checkpoints + error taxonomy. HITL: headed session pause / cede / resume (Magentic-UI co-tasking shape, mock operator UI). Desktop: design-only `OsDesktopSurface` that speaks the same artifact actions against UIA/AX/AT-SPI. Do **not** wrap Anthropic/OpenAI/Gemini Computer Use tools as the production runtime.

**Human gate?** **Yes — G2 (computer-use mechanism).** This file recommends a hybrid (a11y-first Playwright + screenshot fallback + compile-to-deterministic-replay) and records the disagreements a reviewer should attack. It does not lock G2.

---

## 0. How to read labs against this brief

The glossary defines computer use as “an LLM operating a computer interface the way a person would.” Section 2 then *splits* that into two phases the labs generally do **not** split:

| Phase | Brief | Typical lab CUA product |
|-------|-------|-------------------------|
| Discovery | LLM in the loop, once (or until the flow is learned) | LLM in the loop, always |
| Artifact | Typed, versioned, reviewable capability | Transcript, plan text, or selector cache |
| Production | Deterministic replay, no model decisions | Another CUA loop (“it adapts when the UI changes”) |
| Errors | Business vs recoverable vs hard | “Self-correct from the next screenshot” |
| HITL | Pause same live session, human acts, resume | Confirm/deny a click, or a research co-browser |

Microsoft is the only major vendor that *documents* the split (RPA = UI tree + script; CUA = vision + LLM) and tells you when to use which. Magentic-UI is the only official research prototype whose “plan learning and retrieval” is in the same neighborhood as discover-then-replay — and even that stores a natural-language plan, not a locator-stable capability.

**Implication:** treat lab CUA as a *perception and discovery* reference. Treat classical automation (Playwright locators, UIA Invoke, AX press) as the *replay* reference. The take-home is the compiler between them.

---

## B. Frontier computer use (web)

### B.1 Anthropic — screenshot + coordinates, always-on agent loop

**What they actually ship.** Claude Computer Use is a beta *tool*: the model requests `screenshot`, `left_click` at `[x, y]`, `type`, `scroll`, `wait`, and (from `computer_20251124`) `zoom` into a region. The application must implement capture and input; Claude cannot drive the OS itself. The documented core is an agent loop: Claude requests an action → your harness executes → you return a screenshot/tool result → repeat. Beta header `computer-use-2025-11-24` / tool type `computer_20251124` for current Opus/Sonnet 5-family models. Reference implementation is a Docker desktop (Xvfb + tools + loop).

**Browser product.** “Claude in Chrome” is a separate Chrome extension pilot (research preview 2025, Max-plan beta later in 2025). It is still always-on LLM browser control, with extra prompt-injection mitigations versus raw computer use. Attack success in their published autonomous-mode numbers dropped from 23.6% to 11.2% with mitigations — i.e. **prompt injection is a first-class production risk**, not a footnote.

**Safety they insist on.** Dedicated VM/container; domain allowlist; no secrets in the environment; human confirmation for consequential actions; classifiers on screenshots that steer the model to ask before proceeding. They explicitly warn the classifier is a poor fit for unattended loops.

**Best-practice details that matter for locators.** Click accuracy is dominated by screenshot scaling. For the 4.6 family, images above 1568 px long-edge or 1.15 MP are internally downscaled, which desynchronizes predicted coordinates from the real display. Anthropic recommends starting at 1280×720, putting instruction text *before* the screenshot in the user turn, and forcing Claude to re-screenshot after each step rather than assuming success. Zoom exists because small chrome (tabs, status bar, dense tables) is illegible at default resolution — exactly the legacy-admin-console problem.

**Map to the brief.** This is an excellent *discovery* prior (observe screenshot → act). It is the opposite of *deterministic replay*. There is no artifact schema, no locator, no parameterized capability. Replaying means running the loop again and hoping.

**Viability:** **Viable for this take-home** as an *optional discovery backend* (or as the screenshot-fallback action channel). **Not viable / avoid** as the production executor. **Viable only as design story** for “when DOM and a11y both lie, the perceive channel is pixels.”

Citations:

- https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool — 2026-08-16
- https://claude.com/blog/best-practices-for-computer-and-browser-use-with-claude — 2026-08-16
- https://www.anthropic.com/news/3-5-models-and-computer-use — 2026-08-16
- https://www.anthropic.com/news/developing-computer-use — 2026-08-16
- https://claude.com/blog/claude-for-chrome — 2026-08-16
- https://docs.aws.amazon.com/bedrock/latest/userguide/computer-use.html — 2026-08-16

---

### B.2 OpenAI — CUA / Operator lineage, then harness pluralism

**What they actually ship.** January 2025: Computer-Using Agent (CUA) in Operator — a model that “combines GPT-4o’s vision with RL,” trained to use GUIs via pixels, no OS/web APIs. Later: `computer-use-preview` in the Responses API (research preview, isolated env, HITL for high-impact actions). By the current docs, `gpt-5.4` is trained for *three harness shapes*:

1. Built-in `computer` tool: screenshots in, structured UI actions (click/type/scroll/screenshot) out. Visual-first.
2. Custom tools on an existing Playwright / Selenium / VNC / MCP harness. The model calls *your* tools.
3. Code-execution harness: the model writes short scripts against a live Playwright (or PyAutoGUI) runtime, mixing visual and DOM interaction. Docs say this is often better for loops, conditionals, and DOM inspection.

Safety: isolated browser/VM, empty env, no extensions, treat page content as untrusted, pause when the next action creates external risk. OSWorld was cited at 38.1% for the CUA preview — OpenAI’s own number that the model is **not** highly reliable for unattended OS automation.

**Map to the brief.** Option 1 is always-on CUA (wrong production path). Option 2 is the shape we want for *discovery* if we own the tools (snapshot, click-by-ref, type). Option 3 is tempting and dangerous: “the model writes Playwright” can look like an artifact but is not reviewable, not parameterized, and not a schema. A grader who sees generated scripts as the capability will correctly ask where the contract is.

**Viability:** **Viable for this take-home** — use a *custom tool harness* (OpenAI option 2) for discovery only; compile to our artifact. **Viable only as design story** — option 3 as “assisted fallback / code generation” stretch (§8), never as the core artifact. **Not viable / avoid** — wrapping `computer-use-preview` / Operator as production replay.

Citations:

- https://openai.com/index/computer-using-agent/ — 2026-08-16
- https://developers.openai.com/api/docs/guides/tools-computer-use — 2026-08-16
- https://developers.openai.com/api/docs/models/computer-use-preview — 2026-08-16
- https://openai.com/index/new-tools-for-building-agents/ — 2026-08-16

---

### B.3 Google — Gemini Computer Use (browser / mobile / desktop), still a loop

**What they actually ship.** Computer Use is a built-in tool. Gemini 2.5 had a standalone `gemini-2.5-computer-use-preview-10-2025` model; Gemini 3.x (docs name 3.5 Flash, 3.6 Flash as recommended) folds it into the main model. The client loop is identical in spirit to Anthropic’s: send screenshot + prompt → model returns a `function_call` UI action (normalized coordinates you scale to the viewport) → execute (they show Playwright) → send a new screenshot. Gemini 3.x adds `ENVIRONMENT_BROWSER | MOBILE | DESKTOP`, an `intent` field explaining the step, configurable safety policies, and opt-in prompt-injection scanning of screenshots. Blog (2026-06-24): confirmation for irreversible actions; auto-stop on detected injection; sandbox + HITL + access controls.

Project Mariner was the Chrome-labs consumer/experimental agent (Gemini-powered, in-browser). Treat Mariner as a product experiment, not an architecture to copy. The API contract is the screenshot loop.

**Map to the brief.** Same as Anthropic: strong discovery prior, including an official desktop environment flag that is useful for the §3.7 write-up. No compile-to-deterministic-replay. Their “enterprise automation / continuous software testing” pitch is still always-on CUA.

**Viability:** **Viable for this take-home** as an alternate discovery VLM (screenshot fallback). **Viable only as design story** for `ENVIRONMENT_DESKTOP` and mobile as sibling environments on the same tool interface — that is a clean §3.7 analogy for `WebSurface` vs `OsDesktopSurface`. **Not viable / avoid** as production replay.

Citations:

- https://ai.google.dev/gemini-api/docs/computer-use — 2026-08-16
- https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/ — 2026-08-16
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/computer-use — 2026-08-16
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-computer-use-preview-10-2025 — 2026-08-16

---

### B.4 Microsoft — the lab that documents the split you need

Microsoft is running **three** computer-use stories at once. Only one of them matches the brief’s production path.

#### B.4.1 Copilot Studio “Computer use” tool — always-on CUA on a Cloud PC

Natural-language instructions; the tool screenshots, reasons, clicks with a virtual mouse/keyboard, repeats until done. Models (as of the 2026-07-03 Learn page): OpenAI CUA (GA), Claude Sonnet 4.5 (GA), Claude Sonnet 4.6 / Opus 4.6 (experimental). Features that *are* worth stealing as design, not as a platform: inputs (typed params per run), machine targeting, stored credentials that the LLM never sees, **access control allowlists** for URLs and desktop process names, HTTPS enforcement, human supervision via email when injection is suspected. Docs are explicit: allowlists stop *actions* on non-listed apps, not *opening* them (search-bar bypass). That is a real guardrail design note for §3.4.

**Viability:** **Viable only as design story** (allowlist, credential injection without LLM visibility, risky-action supervision). **Not viable / avoid** as the implementation (Power Platform, Cloud PC pools, Copilot Studio).

Citation: https://learn.microsoft.com/en-us/microsoft-copilot-studio/computer-use — 2026-08-16

#### B.4.2 Official RPA vs CUA table — closest lab statement to the brief

From Copilot Studio agent-tools guidance:

| Aspect | RPA | CUA |
|--------|-----|-----|
| Automation type | Rule based | LLM driven |
| Interaction method | UI tree | Vision |
| Authoring | Script | Natural language |
| Decision making | Predefined rules | Autonomous visual decisions |
| Flexibility | Limited | High |
| Error handling | Static | Self-correcting from visual feedback |

**Use RPA when the UI is stable, rules are clear, and speed/volume matter.** **Use CUA when UIs shift, decisions are fuzzy, or you need it fast.**

The brief’s environment is “stable UIs, but real runtime errors” — that is the RPA column for *replay*, with CUA reserved for *discovery* and for the exceptional states you have not yet encoded. Microsoft’s own guidance, applied honestly, says: do not run CUA in production on a stable core-banking screen.

Citation: https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/agent-tools — 2026-08-16

Also: https://learn.microsoft.com/en-us/windows-365/agents/when-to-use-w365a — 2026-08-16 (CUA for dynamic/legacy-bound/reasoning; RPA for fixed repeatable workflows).

#### B.4.3 Playwright MCP — accessibility snapshots, not pixels

Official Microsoft Playwright MCP: LLMs drive pages through **structured accessibility snapshots**, “bypassing the need for screenshots or visually-tuned models.” Snapshot YAML includes roles, names, states, and `[ref=eN]` handles. The model clicks by ref, not by coordinate. Screenshots are for humans/debug; docs say you cannot perform actions from a screenshot — take a snapshot to get refs. This is the most important *web perception* prior for the take-home: cheap, text-only, deterministic targeting, works with any LLM (no VLM required for the happy path).

**Caveat:** Playwright MCP is still an *always-on LLM tool server*. The snapshot is the right observation format; the MCP product is the wrong control loop for production replay. Refs are **session-ephemeral** — they are not locators you can serialize into a capability. Discovery must *promote* a ref into a stable locator (`getByRole('button', { name: 'Submit' })`, label, text, frame, table cell, …).

**Viability:** **Viable for this take-home** — steal the snapshot format and ref→action pattern for discovery; promote to durable locators for the artifact. **Not viable / avoid** — shipping `@playwright/mcp` as the system, or storing raw refs as the replay contract.

Citations:

- https://github.com/microsoft/playwright-mcp — 2026-08-16
- https://playwright.dev/docs/getting-started-mcp — 2026-08-16
- https://playwright.dev/docs/aria-snapshots — 2026-08-16

#### B.4.4 Magentic-UI — HITL + plan learning (research prototype, not a product)

Microsoft Research (2025): human-centered web agent. Four features that map onto §3.6 and the artifact idea:

1. **Co-planning** — step-by-step plan, user edits before any action.
2. **Co-tasking** — pause; human takes the *same browser*; hand back. This is the closest official analog to §3.6 “take control of the live session.”
3. **Action guards** — approval for irreversible actions; configurable to “approve every click.”
4. **Plan learning** — after success, save a step-by-step plan to a gallery; retrieve for similar tasks (~3× faster than regenerating a plan in their preliminary eval). Allow-list of websites; Docker-sandboxed browser and code exec.

**Gap vs the brief:** learned plans are natural-language steps, not locator-stable capabilities. Retrieval is “similar task,” not deterministic replay. Magentic-UI is still an LLM team (Orchestrator + WebSurfer + Coder + FileSurfer) at execution time. Steal the HITL *control-transfer model* and the “save a plan after success” product instinct; do not steal AutoGen multi-agent as the architecture (graders do not reward Magentic-One clones).

**Viability:** **Viable for this take-home** for HITL semantics (pause / cede same session / resume / record human actions). **Viable only as design story** for plan gallery / multi-tenant “base plan + override.” **Not viable / avoid** as the agent runtime (Docker+AutoGen platform).

Citations:

- https://www.microsoft.com/en-us/research/blog/magentic-ui-an-experimental-human-centered-web-agent/ — 2026-08-16
- https://github.com/microsoft/magentic-ui — 2026-08-16

#### B.4.5 Windows 365 for Agents MCP — desktop + browser + UIA in one server

`mcp_W365ComputerUse`: mouse/keyboard/screenshot **and** Edge DOM tools **and** “semantic UI inspection via Windows UI Automation.” This is Microsoft admitting the hybrid: pixels for the desktop, DOM for Edge, UIA tree for native controls. Browser DOM tools only work on the managed Edge instance.

**Viability:** **Viable only as design story** for a `Surface` that exposes three perceive channels. **Not viable / avoid** to implement (Cloud PC).

Citation: https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-windows-365-agents — 2026-08-16

---

### B.5 Others (Amazon, research agents)

**Amazon Nova Act.** Official AWS service: mix of `nova.act("natural language")` *and* Python. Terminology: Act (one NL task / agentic loop) → Steps (observe+act cycles) → Session (browser) → Workflow (Python + acts) → Workflow run. HITL escalation is a first-class claim. This is the lab product closest to “engineer writes the skeleton, model fills the brittle steps” — Stagehand-shaped, hosted. Still not a versioned capability artifact; `act()` remains an LLM loop. **Viable only as design story** (workflow = code + NL islands). **Not viable / avoid** as a dependency (AWS-only, US-East-1, spend, not a take-home).

- https://docs.aws.amazon.com/nova-act/latest/userguide/what-is-nova-act.html — 2026-08-16
- https://aws.amazon.com/nova/act/ — 2026-08-16

**WebVoyager (2024, ACL).** LMM web agent: screenshots + text, Selenium, 643 tasks / 15 sites, 59.1% success; text-only accessibility-tree ablation underperformed multimodal. This is a *benchmark and agent recipe*, not a replay system. **Viable only as design story** (multimodal helps when the tree is incomplete). **Not viable / avoid** as a stack.

- https://arxiv.org/abs/2401.13919 — 2026-08-16
- https://github.com/MinorJerry/WebVoyager — 2026-08-16

**OSWorld (2024).** Real desktop+web environment, 369 tasks. Original paper: humans ~72%, best model ~12%, failure mode = GUI grounding. Later CUA numbers improved (OpenAI cited 38.1%) but the qualitative lesson stands: **coordinate grounding is the hard part**, which is why replay must not depend on it.

- https://arxiv.org/abs/2404.07972 — 2026-08-16
- https://os-world.github.io — 2026-08-16

---

### B.6 DOM vs accessibility snapshot vs screenshot+coordinates

This is the load-bearing perception choice for §3.1 and for dirty/legacy UI.

#### The three channels

| Channel | What the model (or replay engine) sees | How it acts | Token / latency | Determinism |
|---------|----------------------------------------|-------------|-----------------|-------------|
| Raw DOM / CSS/XPath | Markup, often wrapper soup | `click('#x > div:nth-child(3)')` | Medium (HTML is huge) | Brittle on legacy |
| Accessibility snapshot | Roles, names, states, hierarchy (what a screen reader gets) | `click(ref)` now; `getByRole` later | Small (KB of YAML) | High if names exist |
| Screenshot + coordinates | Pixels | `click(x, y)` | Large (vision tokens) | Low (DPI, theme, animation, rounding) |

#### Viability on dirty / legacy UI (the actual environment)

The brief names framesets, nested tables, non-semantic markup, no test IDs.

**Frames / framesets / iframes.** Each frame is its own document and its own accessibility tree. Playwright’s official model: a `Page` has a main frame plus `iframe`s; use `page.frameLocator(...)` or `page.frame({ name | url })`. Framesets (HTML4) still appear as named/URL-addressable frames. **A locator that does not name the frame is wrong.** Discovery must record `frame: { name | urlPattern | index }` in the artifact. Screenshot CUA *accidentally* works across frames because it clicks pixels; that is not a reason to use pixels for replay — a dialog in another frame will still steal focus.

Citation: https://playwright.dev/docs/frames — 2026-08-16

**Nested tables, no semantics, no test IDs.** `getByTestId` is out (glossary: legacy enterprise apps essentially never have them). Playwright’s recommended locators are user-facing: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`, `getByAltText`. Tables without `<th>` / `scope` produce a poor a11y tree (generic `cell` / ignored layout tables). Replay strategy that still works: (1) role+name when present; (2) labeled form controls; (3) visible text; (4) structural `getByRole('row', { name: ... }).getByRole('cell').nth(n)` or “cell to the right of this header text”; (5) screenshot fallback *only for the step that has no semantic handle*. Do not XPath into `table/tbody/tr[4]/td[7]` as the primary locator — that is the 2014 RPA failure mode.

Citation: https://playwright.dev/docs/locators — 2026-08-16

**When a11y lies.** Canvas, maps, custom-drawn grids, Flash-era plugins, closed shadow DOM, Chromium accessibility not enabled, remote-desktop-inside-browser. Then screenshot+coords (or OS-level) is the only perceive channel. Playwright MCP itself adds a vision/caps mode for this; it is the exception.

**When DOM is enough.** Modern SPAs with decent roles — but the brief says that is *not* the common case. Designing only for clean DOM fails §3.1’s bias (“still work when the surface has no clean DOM”).

**Hybrid that matches the brief.**

1. Observe: a11y snapshot (primary) + screenshot (evidence + fallback + HITL context).
2. Decide (discovery only): LLM picks a target *described semantically*, harness resolves to a ref, then the compiler records a durable locator recipe (ranked strategies).
3. Act: Playwright action on the resolved element (not a pixel), so the same action is replayable.
4. If resolve fails in discovery: one screenshot-grounded click, then *immediately* try to identify what was clicked (hit-test → element → locator candidates) so the artifact does not store the coordinate as the only strategy.

| Technique | Take-home viability |
|-----------|---------------------|
| Playwright a11y snapshot for discovery | **Viable for this take-home** |
| Ranked locators (role → label → text → table-structure → frame-aware CSS as last resort) | **Viable for this take-home** |
| Screenshot + VLM for discovery fallback and evidence | **Viable for this take-home** |
| Screenshot + coordinates as the *replay* locator | **Not viable / avoid** (fragile; anti the “stable targeting” requirement) |
| Raw CSS/XPath as the only locator | **Not viable / avoid** on the stated legacy surfaces |
| Test IDs as a requirement | **Not viable / avoid** (environment does not have them) |
| Accessibility snapshot as *replay* refs (`e12`) | **Not viable / avoid** (ephemeral); promote to durable locators |
| DOM dump as the model prompt | **Not viable / avoid** (noise, tokens, XSS/prompt-injection surface) |

---

### B.7 Record-once / replay-many vs always-on LLM — how labs differ from the brief

The brief *requires* discover-then-deterministic-replay. Lab default is always-on.

| System | Discovery | What is saved | Production path | Distance from brief |
|--------|-----------|---------------|-----------------|---------------------|
| Anthropic Computer Use | Always-on screenshot loop | Transcript | Run the loop again | Far |
| OpenAI CUA / computer tool | Always-on visual actions | Transcript / reasoning | Run the loop again | Far |
| OpenAI option 3 (code harness) | Model writes scripts | Code snippets | Re-run or re-generate code | Adjacent if you freeze the script — but that is not a typed capability |
| Gemini Computer Use | Always-on screenshot loop | Transcript + intents | Run the loop again | Far |
| Copilot Studio Computer use | Always-on CUA | Instructions + inputs | CUA every run (“adapts when UI changes”) | Explicitly opposite |
| Microsoft RPA / desktop flows | Human or recorder authors script | UI-tree script | Deterministic replay | Close to *replay*, missing LLM discovery |
| Magentic-UI plan learning | LLM + HITL | NL plan gallery | LLM executes the plan again | Halfway (saved plan, still LLM) |
| Stagehand cache | LLM `act`/`observe` | Selector + snapshot fingerprint, ~48h, project-scoped | Cache hit = no LLM; miss = LLM | Halfway (right instinct, wrong artifact: not reviewable, not versioned, TTL) |
| Nova Act workflows | Mix Python + `act()` | Python source | Python + LLM islands | Halfway |
| Playwright tests | Human authors | Locator scripts + aria snapshots | Deterministic | Close to *replay*, missing LLM discovery |
| **This brief** | LLM once | Typed capability | Zero LLM decisions | — |

**Stagehand’s cache is the most honest OSS statement of the production economics:** “in many web automation workloads, the winning move is the opposite [of more human-like agents]: avoid reasoning entirely.” They cache the *resolved selector*, parameterize values (`%email%`), and refuse to force a hit when the snapshot fingerprint drifts (“a wrong cached click is worse than a slow click”). Steal that bias. Do **not** steal a 48-hour server cache as the capability store — §3.2 wants a versioned, human-reviewable contract an agent can invoke.

Citation: https://browserbase.com/blog/stagehand-caching/ — 2026-08-16

**Microsoft’s CUA marketing claims the opposite of the brief:** “when buttons or screens change, the tool continues working without breaking your flow.” The brief’s environment is stable UIs; the hard part is *runtime business errors*, not layout drift. Using CUA-every-time to paper over missing error taxonomy is how you get expensive, non-auditable, non-deterministic production.

**Record-then-compile (recommended shape).**

```
goal → LLM discovery on live surface
     → trajectory (actions + observations + what was targeted)
     → compiler (promote refs/coords → ranked durable locators,
                 lift concrete values → typed params,
                 detect checkpoints / extractors)
     → capability artifact vN (reviewable)
     → replay engine (no LLM) + error taxonomy
     → on hard failure: HITL on same session; optional bounded LLM repair as stretch
```

That is not what any lab ships as a product. It is what you get if you take Magentic-UI’s “save a plan,” Stagehand’s “cache the selector,” and Playwright’s locator/aria-snapshot tooling, then meet §3.2’s schema bar.

---

### B.8 Open-source stacks — copy vs toy (stars are not a source)

Star counts below are order-of-magnitude from public pages as of research; they are **not** a quality signal. License and *who owns the loop* are.

#### Playwright — copy the engine, not a religion

Industry-standard browser automation. Web-first locators, auto-wait, trace viewer, frame locators, aria snapshots, headed mode (HITL), persistent context (session). This is the replay runtime to beat. Discovery can sit *on top* of it without adopting MCP or Stagehand.

**Viability:** **Viable for this take-home** (default web surface).

- https://playwright.dev/docs/locators — 2026-08-16
- https://playwright.dev/docs/frames — 2026-08-16
- https://playwright.dev/docs/aria-snapshots — 2026-08-16

Selenium/WebDriver: older, still fine, worse locator ergonomics and waiting. Puppeteer: Chrome-only, less locator story. **Viable for this take-home** only if there is a strong reason; otherwise Playwright. **Not viable / avoid** as a “we used Selenium because banks use it” cargo cult.

#### Playwright MCP — copy the snapshot, not the server

See B.4.3. Great observation format; ephemeral refs; always-on LLM. Using it as a subprocess for discovery is optional and adds an MCP process you do not need. Prefer calling `page.accessibility.snapshot()` / `locator.ariaSnapshot()` from your own loop.

**Viability:** **Viable for this take-home** as a pattern. **Not viable / avoid** as the product.

#### Stagehand (Browserbase) — copy observe→act→cache *idea*, not the SDK as core

MIT, TypeScript-first (also Python/Go). Primitives: `act`, `extract`, `observe`, `agent`. `observe()` returns candidate actions with selector/method/args; passing an observed action to `act` can skip the LLM. Caching stores selectors; variables parameterize inputs. Self-healing on cache miss *re-invokes the LLM* — that is a production footgun relative to this brief (replay must not silently become CUA). License is friendly; coupling to Browserbase cloud for the good cache is not.

**Viability:** **Viable for this take-home** as a *reference implementation of compile-on-success* and as an optional discovery helper. **Not viable / avoid** as the artifact store or as `agent()` in production. Self-healing LLM on replay = **Not viable / avoid** unless it is the explicit §8 “assisted fallback,” bounded and evidenced.

- https://github.com/browserbase/stagehand — 2026-08-16
- https://docs.stagehand.dev/v3/basics/act — 2026-08-16
- https://www.browserbase.com/stagehand — 2026-08-16
- https://browserbase.com/blog/stagehand-caching/ — 2026-08-16

#### browser-use — high stars, wrong loop for production

Python, MIT, CDP-native. Merges DOM + AX tree + layout snapshot; agent loop until `done`. Community/WebVoyager numbers are marketed aggressively (80k–100k stars depending on the blog). Architecture is *always-on LLM*. Recent “it’s a harness your coding agent edits” direction is even further from a reviewable capability catalog. Use as a *study of CDP AX+DOM merge* (they recursively walk frames — relevant to framesets). Do not depend on it.

**Viability:** **Viable only as design story** (CDP `Accessibility.getFullAXTree` + DOM merge, frame walking). **Not viable / avoid** as the system.

- https://github.com/browser-use/browser-use — 2026-08-16
- https://docs.browser-use.com — 2026-08-16 (library docs as linked from the repo)

#### Skyvern — vision-first enterprise workflows, AGPL

LLM + screenshot + DOM; workflow engine; 2FA/TOTP; credentials never shown to the LLM (strong safety prior). AGPL-3.0 on the OSS core; anti-bot bits are cloud-only. Always-on vision agent with optional workflow graph — closer to a product than a take-home core. **License is a blocker** unless the human accepts AGPL.

**Viability:** **Viable only as design story** (credential vault, TOTP, workflow blocks, vision when DOM fails). **Not viable / avoid** to vendor (AGPL + platform).

- https://github.com/Skyvern-AI/skyvern — 2026-08-16
- https://www.skyvern.com/docs/developers/getting-started/introduction — 2026-08-16
- https://www.skyvern.com/docs/developers/features/authentication-and-2fa — 2026-08-16

#### AgentQL (TinyFish) — NL query locators on Playwright

Query language + `getByPrompt` on a wrapped Playwright page. “Self-healing” NL selectors. Every query is an API call to their service (API key required). That is always-on LLM *targeting*, which can be a locator *strategy* in a ranked list, not the runtime.

**Viability:** **Viable only as design story** (NL → element as one locator strategy). **Not viable / avoid** as a required SaaS locator in the artifact (replay would depend on their API = LLM in the loop).

- https://docs.agentql.com/quick-start — 2026-08-16
- https://github.com/tinyfish-io/agentql — 2026-08-16
- https://www.agentql.com/ — 2026-08-16

#### WebVoyager — benchmark/demo

See B.5. **Not viable / avoid** as a stack. **Viable only as design story** for multimodal observation.

#### Magentic-UI — see B.4.4

Research HITL. **Not viable / avoid** as a dependency. Steal co-tasking.

#### xa11y / pywinauto / FlaUI / atomacos / dogtail — desktop (see C)

Web-irrelevant except as the desktop backend behind the same `Surface` interface.

#### Consumer “AI browsers” (Comet, Atlas, Dia, Neon, Claude in Chrome)

**Not viable / avoid.** Not an automation system, not replayable, not allowlist-controllable in our process.

---

### B.9 Web viability matrix (techniques and stacks)

| Item | Role vs brief | Viable for take-home | Design story only | Avoid |
|------|---------------|----------------------|-------------------|-------|
| Custom Playwright observe–decide–act loop | Discovery §3.1 | **Yes** | | |
| Playwright locators + waits + traces | Replay §3.3, evidence §3.5 | **Yes** | | |
| Aria snapshot as observation | Discovery, cheap | **Yes** | | |
| Ranked durable locators in artifact | §3.2 targeting | **Yes** | | |
| Screenshot as evidence + HITL context | §3.5, §3.6 | **Yes** | | |
| Screenshot+VLM fallback click, then hit-test | Dirty UI discovery | **Yes** (bounded) | | |
| Frame-aware locators | Legacy web | **Yes** | | |
| Anthropic/OpenAI/Gemini CUA tool as discovery backend | Alternate perceive | **Yes** (optional) | | |
| Stagehand observe/act (not agent) | Discovery helper | **Yes** (optional) | | |
| Magentic-UI co-tasking semantics | HITL §3.6 | **Yes** (reimplement thin) | | |
| Capability catalog (tools with typed args) | Stretch §8 | thin version **Yes** | | |
| Playwright MCP server as the app | Always-on LLM | | | **Avoid** |
| browser-use agent loop in production | Always-on LLM | | CDP merge | **Avoid** as runtime |
| Stagehand cache as artifact | Not reviewable / TTL | | instinct | **Avoid** as store |
| Stagehand/Skyvern `agent()` production | Always-on | | | **Avoid** |
| AgentQL in replay | SaaS LLM locator | | strategy | **Avoid** in replay |
| Skyvern OSS as core | AGPL + platform | | 2FA/vault | **Avoid** vendor |
| Nova Act / Copilot Studio / Cloud PC | Overbuilt | | params, HITL | **Avoid** |
| Operator / Claude-in-Chrome | Consumer loop | | | **Avoid** |
| Pixel coordinates as replay locators | Fragile | | | **Avoid** |
| Fake discovery (scripted demo as “agent”) | Violates §4 | | | **Avoid** |

---

## C. OS-level / desktop (independently derived; a dedicated Gemini file covers Electron in more depth)

§3.7 asks for a *credible* extension story, not an implementation. §4 says mock the desktop surface if needed. This section exists so the web recommendation is not “we’ll figure out desktop later” hand-waving.

### C.1 Screenshot + VLM / coordinate grounding

Same loop as Anthropic/Gemini/OpenAI option 1, but the executor is OS input (`xdotool`, `CGEvent`, `SendInput`, or a VNC/Cloud PC). Official Gemini `ENVIRONMENT_DESKTOP` and Anthropic’s Docker desktop reference impl are this. OSWorld shows grounding is the failure mode.

**Fragility unique to desktop:** DPI scaling, multi-monitor, display scaling ≠ screenshot resolution (Anthropic’s downscale warning, worse with OS compositor), animations, overlapping windows, IME, dark mode, cursor-already-over-target hover menus, Secure Desktop (UAC) that agents cannot see.

**Viability:** **Viable for this take-home** as a *discovery fallback* if the chosen proxy is a desktop app — but choosing a desktop proxy is usually worse than hostile web (see C.5). **Viable only as design story** as the universal last-resort channel behind `Surface.act(Click{x,y})`. **Not viable / avoid** as the replay contract.

Citations: Anthropic computer-use tool (B.1); Gemini computer-use environments (B.3); OSWorld (B.5).

### C.2 Native accessibility — the desktop twin of Playwright’s snapshot

This is the §3.7 seam: **the artifact should name controls by role/name/state, not by HWND or pixel.** Each OS already has that tree.

#### Windows UI Automation (UIA)

Microsoft’s accessibility framework: tree rooted at the desktop; elements have control type + control patterns (Invoke, Value, Selection, …); clients can filter raw / control / content views. Designed for screen readers *and* automated test scripts. Inspect.exe (Windows SDK) is the debugging analog of Chrome’s a11y pane. Patterns let you **Invoke a button without synthesizing a mouse click** — more stable than coordinate injection.

**Viability:** **Viable only as design story** for `OsDesktopSurface` on Windows (the realistic bank back-office OS). A take-home that *implements* UIA is out of scope unless G1 explicitly picks native desktop.

- https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview — 2026-08-16
- https://learn.microsoft.com/en-us/windows/win32/winauto/ui-automation-specification — 2026-08-16

Libraries: pywinauto (Win32 + UIA backends), FlaUI (.NET). **Design story.** xa11y (MIT, Rust/Python/JS, Playwright-style locators over UIA/AX/AT-SPI) is the cleanest *cross-platform adapter analog* — **Viable only as design story** (young; do not take a new native driver dependency for a web take-home).

- https://github.com/xa11y/xa11y — 2026-08-16
- https://xa11y.dev/compare/ — 2026-08-16

#### macOS AX (AXUIElement)

`AXUIElement` tree; roles like `AXButton` (conventions, not a closed enum). Requires Accessibility permission (and on newer macOS, Screen Recording to read window contents). Element identity is process+path; paths rot when the UI re-renders — locators must re-resolve by role/title like Playwright locators, not store a path index.

**Viability:** **Viable only as design story.** Banks in the brief are US institutions; Windows is the production desktop. macOS is for developer laptops.

- Apple’s Accessibility Programming Guide / AXUIElement API: https://developer.apple.com/documentation/applicationservices/axuielement — 2026-08-16
- Electron’s documented `AXManualAccessibility` switch: https://www.electronjs.org/docs/latest/tutorial/accessibility — 2026-08-16

#### Linux AT-SPI2

D-Bus accessibility bus; roles are a real enum with custom-role registration; actions are untyped strings (`click`, `press`). Performance is the documented pain: no cheap bulk-read equivalent to UIA’s tree fetch; per-property D-Bus round trips can make a full-tree dump take seconds. Fine for a design story; a poor take-home OS.

**Viability:** **Viable only as design story.** dogtail is the classical Python AT-SPI client.

Independent 2026 engineering write-up of the three APIs (not a lab doc, but the best cross-walk found): https://crowecawcaw.github.io/general/2026/05/30/accessibility-for-computer-use.html — 2026-08-16

#### Electron / Chromium-in-a-shell

Electron apps *are* HTML. Chromium builds an a11y tree only when it thinks assistive tech is present. On macOS, third parties must set `AXManualAccessibility` or the app is a black box to AX; Electron also exposes `app.setAccessibilitySupportEnabled`. **Implication for §3.7:** an Electron core-banking client might be automatable *as web* (CDP into the BrowserWindow) *or* as OS a11y if the tree is enabled. Prefer CDP/Playwright-over-CDP if you control the app; do not assume OS AX works out of the box.

**Viability:** **Viable only as design story** (and a legitimate G1 option: local Electron proxy). Implementing a production Electron driver is not required.

Citation: https://www.electronjs.org/docs/latest/tutorial/accessibility — 2026-08-16

### C.3 OS input injection fragility + HITL

| Mechanism | How | Failure modes | HITL implication |
|-----------|-----|---------------|------------------|
| UIA/AX/AT-SPI *patterns* (Invoke, SetValue) | Semantic action on the element | Missing provider, custom owner-draw, Java/Electron until a11y enabled | Prefer this; human still needed when provider is absent |
| Synthetic mouse/key (SendInput, CGEvent, XTest, xdotool) | OS thinks a human did it | Wrong focused window, DPI, occluded target, UAC secure desktop, remote-desktop double-injection, keyboard layout | Human must own the real desktop or a dedicated VM |
| Coordinate click from screenshot | VLM + injection | All of the above + grounding error | Require headed VM and a big red pause |
| RDP/Citrix/VDI | You see a bitmap of someone else’s UI | **No DOM, often degraded a11y** — pixels only | This is when desktop CUA is justified; still compile what you can |

Copilot Studio notes password fields fail on Electron, Java, Unity, games, CLIs, **Citrix and other virtualized environments**. That is the bank-real-world footnote: a lot of “desktop” is a bitmap. HITL is not optional there.

**Take-home HITL (desktop or web):** Magentic-UI co-tasking is the right *model* — pause automation, human uses the same session (headed browser or VNC), record their actions, resume. A full operator console is out of scope (§3.6). For web, headed Playwright + a “pause” file/CLI is enough. For desktop, you would need a live display; that cost is a reason *not* to pick native desktop as G1.

**Viability:** Semantic a11y actions **Viable only as design story** (desktop). Synthetic injection **Not viable / avoid** as the primary replay path. HITL same-session **Viable for this take-home** on web; **design story** on OS.

### C.4 When desktop strengthens §3.7 vs when hostile web is enough

**Desktop strengthens the write-up when:**

- The `Surface` interface is genuinely perceive/act/session, and the artifact actions are `ClickControl`, `SetValue`, `Select`, `Extract`, `AssertCheckpoint` — not `page.locator(...)`.
- You can say: web backend = Playwright a11y + DOM; desktop backend = UIA/AX/AT-SPI; last resort = screenshot+inject. Same artifact, different resolver.
- Multi-tenant: vendor product on Windows thick client vs browser client is the *same capability* with a `surfaceKind` and per-tenant locator overrides.
- You stub `OsDesktopSurface` with a fake a11y tree fixture to prove the schema, not a real Notepad demo unless it is cheap.

**Hostile web is enough for the take-home when:**

- The proxy has frames/iframes, nested tables, unlabeled inputs, no test IDs, a validation error, a not-found state, and a confirmation step.
- HITL can be demonstrated on a headed browser (the common case).
- Graders can run it without Accessibility TCC prompts, a Windows VM, or DPI fights.
- You still *write* the seam in `REPORT.md` and in the artifact schema (`surface: web`, locators as tagged unions that could add `uia: { automationId, name, controlType }`).

**Recommendation:** hostile web (or a local mock that is hostile) for implementation; desktop as a typed seam + one page in the write-up. Implementing native desktop does **not** increase grader score as much as a real error taxonomy and a real HITL transfer. It *does* increase integration risk.

| Desktop item | Viability |
|--------------|-----------|
| `Surface` adapter + tagged locator union including UIA/AX | **Viable for this take-home** (schema/design; web impl only) |
| Screenshot CUA desktop discovery | **Viable only as design story** (or if G1 picks desktop) |
| Native UIA/AX/AT-SPI replay | **Viable only as design story** |
| Electron CDP automation of a local sample | **Viable for this take-home** if G1 picks it; not required |
| OS injection as replay | **Not viable / avoid** |
| Cloud PC / Windows 365 for Agents | **Not viable / avoid** |
| Citrix/VDI pixel bot | **Viable only as design story** (“when a11y is a bitmap”) |

---

## Contrarian alternatives that are still viable

These are not the default lab demo. They still satisfy the brief.

1. **Accessibility-first (recommended default).** Discovery consumes aria snapshots; replay uses `getByRole` / label / text. Screenshot is evidence and fallback, not the brain. Aligns with Playwright MCP’s stated rationale without taking the MCP dependency. Attack: “legacy tables have no roles.” Response: ranked locators + one visual fallback step, compiled after hit-test.

2. **Screenshot CUA discovery, compiled locators.** Use Anthropic/Gemini/OpenAI computer tool *only* to get through a hostile page once; after each click, hit-test the element and store a locator recipe. Production never calls the VLM. Attack: “grounding errors poison the artifact.” Response: replay must pass checkpoints on a second run before the capability is `approved` (stretch: confidence/approval in §8).

3. **Hybrid DOM + a11y.** browser-use-style merge of DOM + AX + layout boxes, but *you* own the merge (CDP `DOM.getDocument` + `Accessibility.getFullAXTree`) inside a small observer module. Useful for frames and for “this node has a box but no role.” Attack: complexity. Response: keep it behind `WebObserver`; replay still uses Playwright locators.

4. **Record-then-compile (required shape, multiple implementations).** Magentic-UI plan learning, Stagehand cache, Nova Act workflow, Playwright codegen — all incomplete versions of this. The take-home should be the *complete* version: compiler emits the §3.2 schema, not a cache entry or an NL plan.

5. **Capability catalog.** Stretch §8, but it is how the “agent-facing product” in §1 would actually call this system: tools with JSON Schema args, not “run the CUA again.” Even a single `invoke_capability(id, params) -> Result` endpoint is enough. Attack: extra surface. Response: it is the artifact’s public contract; cheap if the schema is already typed.

6. **Desktop-as-schema-only.** Do not automate Notepad to impress anyone. Put `OsDesktopSurface` in the type system. Attack: “you didn’t prove desktop.” Response: §3.7 and §4 explicitly allow this; proving web HITL + errors is the scarce resource.

---

## Explicit anti-patterns

1. **Always-on LLM clicks in production.** Conflicts with §3.3, cost, audit, and the “stable UI” premise. Copilot Studio’s “it adapts when buttons change” is the slogan to refuse.

2. **Fake discovery.** Hardcoded Playwright script labeled as an agent, or a recorded trace replayed as “the model did this.” §4: discovery must be real, evidence in `/evidence/`.

3. **Overbuilt platforms.** Copilot Studio, Windows 365 pools, Skyvern Cloud, Browserbase-required cache, Nova Act fleets, Magentic-UI + Docker agent team, LangGraph-of-graphs. Graders do not reward this (§7).

4. **Ephemeral refs as the artifact.** Storing Playwright MCP `e12` or a UIA runtime pointer. Must promote to durable strategies.

5. **Coordinates as the only locator.** Fails DPI, theme, density, zoom, split view. Fine as a ranked last resort with a checkpoint immediately after.

6. **Selector cache pretending to be a capability.** No typed I/O, no versioning, no review, TTL, silent LLM on miss.

7. **Self-healing replay that silently calls the model.** Makes the error taxonomy untestable. If present, it must be the §8 bounded fallback, policy-checked, evidenced.

8. **Clean-DOM demo as the only target.** `todo.playwright.dev` does not exercise §1. Hostile frames/tables/no-test-ids (local) or a carefully ToS-respecting public sandbox.

9. **Star-driven architecture.** browser-use’s star count measures hobby agent demand, not bank replay.

10. **AGPL or SaaS locators in the core path** without an explicit human license/spend decision (G6/G10).

11. **Desktop for theater.** A flaky pyautogui Notepad demo that breaks HITL and CI, while web errors/HITL stay thin.

12. **Prompt injection naivety.** Every lab treats on-screen text as untrusted. Discovery must not follow “ignore previous instructions and wire money” in a page. Allowlist + action allowlist + HITL on irreversible actions.

---

## Recommendation (attackable; not a lock)

**Do not lock G2 here.** Recorded recommendation for when the orchestrator must default:

| Layer | Recommendation | Why | What a reviewer should attack |
|-------|----------------|-----|-------------------------------|
| Discovery perceive | Aria snapshot primary + screenshot secondary | Cheap, works without a VLM, still has pixels when the tree lies | Snapshot quality on nested tables / frames |
| Discovery act | Playwright actions on resolved elements, not OS injection | Same session as replay; HITL is a headed browser | CDP vs Playwright API surface |
| Discovery brain | Custom loop, any capable LLM (OpenAI or Anthropic). Optional CUA tool only as fallback action | Own the transcript → compiler. Lab CUA tools do not emit locators | “Just use Stagehand/browser-use” |
| Compiler | Trajectory → ranked locators + params + checkpoint | This *is* the take-home | How aggressive to canonicalize |
| Replay | Playwright, no LLM | §3.3 | Wait/retry policy |
| HITL | Pause headed session; mock operator; record human steps | Magentic-UI co-tasking, thin | How to serialize human actions into the artifact |
| Desktop | Schema seam only | §3.7 / §4 | Whether G1 should pick Electron instead of hostile HTML |
| Not recommended | MCP server as app, CUA as production, Skyvern, AgentQL replay, Cloud PC | Brief + grader | If the human wants a “wow” demo over a correct one |

**Disagreement notes (leave these in for cross-review):**

- A GPT-family reviewer may argue OpenAI option 3 (model writes Playwright) *is* the artifact. Counter: scripts are not a typed contract, not parameterized cleanly, not reviewable by a calling agent, and regenerate non-deterministically.
- A Claude-family reviewer may argue screenshot CUA is simpler than a11y on legacy HTML. Counter: then you cannot replay without the model; Anthropic’s own click-accuracy caveats become your production incident rate. Use CUA to *discover*, a11y/DOM to *remember*.
- A Gemini reviewer may argue `ENVIRONMENT_DESKTOP` means we should implement desktop. Counter: Gemini still does not compile; desktop input fragility plus HITL cost fails the time-box; hostile web + seam is the §3.7-compliant cut.
- An infra-minded reviewer may want Browserbase/Stagehand cache. Counter: 48h TTL and opaque cache are not §3.2.

---

## Questions for human gate G2 (computer-use mechanism)

G2 options from `decisions/open_questions.md`: DOM/Playwright vs a11y vs screenshot+coords vs OS injection vs hybrid.

Ask the human (or, if absent, default as above and mark `ORCHESTRATOR_DEFAULT`):

1. **Primary perceive channel for discovery?** (A) Playwright aria snapshot, (B) screenshot+VLM, (C) hybrid A+B, (D) Playwright MCP server as a subprocess. *Recommendation: C, implemented as A with B fallback.*

2. **Primary act channel for discovery?** (A) Playwright element actions, (B) coordinate clicks via CUA tool, (C) OS injection. *Recommendation: A; B only when resolve fails.*

3. **Replay targeting?** (A) Ranked Playwright locators only, (B) locators + coordinate fallback, (C) always CUA. *Recommendation: A, with B stored but gated (checkpoint required). C forbidden.*

4. **May replay call an LLM at all?** (A) Never, (B) §8 bounded single-step repair, (C) Stagehand-style self-heal on miss. *Recommendation: A for core; B only as explicit stretch.*

5. **Lab CUA API as discovery backend?** (A) No, custom tools only, (B) optional Anthropic/OpenAI/Gemini computer tool behind an adapter, (C) that tool *is* the agent. *Recommendation: A or B; never C.*

6. **If a11y tree is empty (canvas/frameset soup), abort or pixel-click?** *Recommendation: one bounded pixel-click + hit-test promotion; then HITL if still unresolved.*

7. **Desktop in G2 or only G1/G4/G12?** *Recommendation: G2 stays web hybrid; desktop is G4/G12 seam.*

8. **Hostile web vs Electron vs native desktop as the *mechanism proving ground*?** (Overlaps G1.) *Recommendation: hostile web proves the mechanism; Electron is the only desktop-ish option that reuses Playwright; native OS is design-only.*

---

## Citation index (full URLs, access date 2026-08-16)

Official / primary (prefer these):

1. https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
2. https://claude.com/blog/best-practices-for-computer-and-browser-use-with-claude
3. https://www.anthropic.com/news/3-5-models-and-computer-use
4. https://www.anthropic.com/news/developing-computer-use
5. https://claude.com/blog/claude-for-chrome
6. https://docs.aws.amazon.com/bedrock/latest/userguide/computer-use.html
7. https://developers.openai.com/api/docs/guides/tools-computer-use
8. https://openai.com/index/computer-using-agent/
9. https://developers.openai.com/api/docs/models/computer-use-preview
10. https://openai.com/index/new-tools-for-building-agents/
11. https://ai.google.dev/gemini-api/docs/computer-use
12. https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/
13. https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/computer-use
14. https://learn.microsoft.com/en-us/microsoft-copilot-studio/computer-use
15. https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/agent-tools
16. https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-windows-365-agents
17. https://learn.microsoft.com/en-us/windows-365/agents/when-to-use-w365a
18. https://www.microsoft.com/en-us/research/blog/magentic-ui-an-experimental-human-centered-web-agent/
19. https://github.com/microsoft/magentic-ui
20. https://github.com/microsoft/playwright-mcp
21. https://playwright.dev/docs/getting-started-mcp
22. https://playwright.dev/docs/aria-snapshots
23. https://playwright.dev/docs/locators
24. https://playwright.dev/docs/frames
25. https://docs.aws.amazon.com/nova-act/latest/userguide/what-is-nova-act.html
26. https://aws.amazon.com/nova/act/
27. https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview
28. https://learn.microsoft.com/en-us/windows/win32/winauto/ui-automation-specification
29. https://www.electronjs.org/docs/latest/tutorial/accessibility
30. https://developer.apple.com/documentation/applicationservices/axuielement
31. https://arxiv.org/abs/2401.13919 (WebVoyager)
32. https://arxiv.org/abs/2404.07972 (OSWorld)
33. https://os-world.github.io
34. https://github.com/browserbase/stagehand
35. https://browserbase.com/blog/stagehand-caching/
36. https://docs.stagehand.dev/v3/basics/act
37. https://github.com/browser-use/browser-use
38. https://github.com/Skyvern-AI/skyvern
39. https://www.skyvern.com/docs/developers/getting-started/introduction
40. https://docs.agentql.com/quick-start
41. https://github.com/xa11y/xa11y
42. https://github.com/MinorJerry/WebVoyager

Secondary (used skeptically, not as authority):

- https://crowecawcaw.github.io/general/2026/05/30/accessibility-for-computer-use.html (cross-platform a11y engineering)
- https://xa11y.dev/compare/
- Various 2026 blog bake-offs of browser-use vs Stagehand vs Skyvern — consulted only to locate official repos; **star counts and WebVoyager leaderboards are not sources for architecture.**

---

*End of independent research. Stack lock is G2/G3/G4, not this file.*
