# Tech stack research — computer-use take-home

**Agent:** Tech Stack Researcher (claude-opus-5-thinking-high)
**Independent context.** Online research performed 2026-08-16. All version numbers, prices, and API shapes below were verified against live sources on that date; citations with URLs are in §15.
**Source of truth for requirements:** `/workspace/Project.md` (read fully; §§3–7 and §4 "explicitly your call" drive everything here).

> **This is not a lock.** Nothing here is decided. §16 gives three complete candidate stacks, §17 the recommended default, §18 the rejects, §19 the questions that must go to the human at gates G3/G5/G6/G7/G10 before anything is locked.
> No PRD. No scaffolding. No `product/`, no `architecture/` beyond this file.

## Legend

Every option is marked with exactly one of:

- **Viable for this take-home** — can be in the shipped implementation and defended.
- **Viable only as design story** — belongs in `REPORT.md` §4 (heterogeneity) as a designed-but-not-built seam. Naming it earns credit; building it costs more than it earns.
- **Not viable / avoid** — do not put in the repo. Reasons given.

## Ranking axes (used consistently, scored 1–5, 5 = best)

| Axis | What it means here |
|---|---|
| **IF** Interview-fit | Does it make the grader's job easier? Does it match §7 evaluation weights (system design > core loop > robustness > HITL > generalization > safety > code quality > communication)? Does it avoid "framework name-dropping" (explicitly penalised in §7)? |
| **SPD** Speed-to-vertical-slice | Time from zero to *goal → discovery → artifact → replay → HITL → evidence* all touching real code (§5 demands the whole thread, thin). |
| **DIRT** Robustness on dirty UI | Framesets, iframes, table layouts, no test IDs, non-semantic markup, server-rendered legacy (§1, §3.1). |
| **HITL** Human-in-the-loop friendliness | Can automation pause, cede the *same live session* to a human, observe what they did, and resume (§3.6)? |
| **RPT** REPORT.md story quality | Especially §3.7 / REPORT heading 4 — surface abstraction seam + multi-tenant reuse. Does the choice give me something true and specific to say? |
| **MAINT** Maintenance burden | Deps, native builds, CI fragility, breakage risk over the life of the submission. |
| **PERM** OS permission friction | Accessibility grants, screen recording grants, admin rights, headless/CI viability, grader-machine friction. |

Scores are relative *for this take-home*, not absolute quality judgements. A 2 on `IF` is not "bad software".

---

## 0. What the brief actually constrains (drives every choice below)

Reading §§3–7 as engineering constraints rather than prose:

1. **One real LLM discovery run against a live surface, with evidence** (§4, non-negotiable). Everything else can be mocked at a clean seam. ⇒ The LLM path must be *cheap, reproducible, and screenshot-able*, not maximally capable.
2. **Replay must run with no LLM in the decision loop** (§3.3). ⇒ The artifact must be an *executable contract*, not a transcript. This is the single highest-leverage design decision and it is language-agnostic. The stack must not make the artifact schema the tail wagging the dog.
3. **"Bias toward an approach that would still work when the surface has no clean DOM"** (§3.1). ⇒ Pure CSS-selector automation is explicitly disfavoured in the brief's own words. The perception layer must be *pluggable* and must have at least one non-DOM mode that actually runs.
4. **Error taxonomy is graded**: business outcome vs recoverable vs hard failure (§3.3, §7). ⇒ Needs a real result-type discipline. Typed unions matter. This is a *typing* argument, not a framework argument.
5. **HITL must transfer control of the same live session** (§3.6). ⇒ The automation driver must support a long-lived, externally-observable, human-drivable session. This rules out "spawn browser, do work, kill browser" architectures and it is a hard filter on the automation library.
6. **Never persist secrets or raw sensitive data** (§3.4). ⇒ Redaction must sit on the *write path* for artifacts, logs, and screenshots — a cross-cutting concern that wants one chokepoint, which is easier in a single-process design.
7. **"We do not reward feature breadth, framework name-dropping, or building scaling infrastructure (queues, clusters, multi-tenant plumbing)"** (§7). ⇒ This is an explicit anti-signal against Temporal/LangGraph/microservices. Treat every added framework as a debt you must defend in the write-up.
8. **AI-assisted development is assumed** (§5, §9). ⇒ Agent-coding quality of the language/ecosystem is a legitimate selection criterion, and "the scaffolding comes together fast" means the bar is a *complete* slice, so SPD is weighted high.

**Derived rule of thumb used throughout:** prefer the option that produces the shortest honest sentence in `REPORT.md`. If defending a choice takes a paragraph of hedging, it is the wrong choice for a graded take-home.

---

## 1. Language / runtime

### 1.1 TypeScript on Node — **Viable for this take-home**

Current state (verified 2026-08-16): Node 24 is the active line with Node 22 the LTS floor; `node:test` has been Stability 2 (stable) since Node 20 and is feature-complete in 24; `node:sqlite` is Stability 1.2 (release candidate) as of Node 24.15/25.7; native TypeScript execution (type-stripping) is stable in 24, so `node app.ts` runs without `ts-node`/`tsx`; `--env-file` replaces `dotenv`.

| Axis | Score | Note |
|---|---|---|
| IF | 5 | Playwright is a first-class TS citizen; the grader can read it without a Python/TS context switch since Playwright's canonical docs are JS. |
| SPD | 5 | Zero-build dev loop, Zod → JSON Schema in one call, no venv. |
| DIRT | 4 | Inherits Playwright's frame/ARIA handling; no language-level advantage. |
| HITL | 5 | Playwright's `browser.bind()` (1.59+), `page.pause()`, and CDP are all Node-first. |
| RPT | 4 | Discriminated unions + `zod.discriminatedUnion` make the error taxonomy legible in the write-up. |
| MAINT | 4 | ESM/CJS friction is the main tax; native TS strip-types has edge cases with decorators/enums. |
| PERM | 5 | Nothing OS-level required for the web path. |

**Typing:** structural typing + discriminated unions is a genuinely good fit for the §3.3 result contract (`{kind: 'success'} | {kind: 'business_outcome'} | {kind: 'recoverable'} | {kind: 'hard_failure'}`) with exhaustiveness checking at compile time. That is a defensible sentence in REPORT §3.

**Agent-coding quality:** highest-density training signal of any option here for Playwright + Zod + LLM SDK combinations. Practical consequence: fewer hallucinated APIs during AI-assisted build.

**Against:** the desktop/OS-automation ecosystem is markedly weaker than Python's (see §4). If the human later wants a real OS-level surface, TS is the harder road — `@crowecawcaw/xa11y` exists (v0.13.0, npm, 50 weekly downloads) but is young; nut.js prebuilt binaries are a paid subscription (§4.3).

### 1.2 Python — **Viable for this take-home**

| Axis | Score | Note |
|---|---|---|
| IF | 4 | Fine, but Playwright-Python is the second-class binding (sync + async, docs derived from JS). |
| SPD | 4 | Pydantic v2 is excellent; venv/uv adds a step; sync API keeps the agent loop readable. |
| DIRT | 4 | Same Playwright engine. |
| HITL | 3 | `page.pause()` exists; `browser.bind()` interop story is JS-centred (`playwright-cli`, `@playwright/mcp`). |
| RPT | 4 | Pydantic discriminated unions + `model_json_schema()` are clean. |
| MAINT | 4 | Mature. `uv` has made env management a non-issue. |
| PERM | 5 | Web path: none. |

**The real Python argument** is §3.7: if the design story wants a *demonstrated* second surface, Python owns desktop a11y (`pywinauto` BSD-3 Windows, `dogtail` GPL-2.0 Linux, `atomacos` GPL-3.0 macOS, and `xa11y` cross-platform MIT with mature Python wheels). If the human wants a real native-desktop adapter rather than a designed one, Python is the answer and this changes the whole stack. That is gate G5's crux.

**Against:** async/sync duality in Playwright-Python is a small but real source of AI-assisted-coding mistakes; and the take-home's *headline* surface will almost certainly be web, where Python buys nothing.

### 1.3 Go — **Viable only as design story**

Strong static typing, single-binary distribution, trivial for a grader to run. But: no first-party Playwright binding (community `playwright-go` only), no first-party LLM SDK parity for the newest tool shapes, weaker JSON-Schema-from-struct ergonomics, and no desktop-a11y story worth having. `SPD` 2, `IF` 3. Mention only if the human specifically values single-binary distribution.

### 1.4 Rust / C# / Java — **Not viable / avoid**

Rust: `xa11y`'s core is Rust and it is genuinely the best cross-platform a11y crate available, but writing the whole system in Rust triples the vertical-slice time for zero grading credit. C#: FlaUI (MIT, 5.0.0, Feb 2025) is the best Windows-only UIA library in existence, but Windows-only is a bad bet for an unknown grader machine. Java: Selenium heritage only; nothing here recommends it.

### 1.5 Language verdict

TypeScript by a nose, *conditional on the target surface being web or Electron*. Python if the human wants a real native-desktop second adapter. Do not mix languages in one repo for a take-home — a polyglot repo reads as indecision, not as breadth.

---

## 2. LLM provider + SDK + model for discovery

### 2.0 Two orthogonal decisions

Conflating these is the classic mistake. They are separate:

- **(A) Harness shape** — does the *model* emit pixel coordinates (`click(x,y)`), or does it call *my* tools (`click(ref)`, `type(ref, text)`) against a semantic snapshot I built?
- **(B) Provider/model/SDK** — who serves the tokens.

OpenAI's own current guidance (verified 2026-08-16) names three harness shapes and explicitly blesses (A2):

- **Option 1** — built-in Responses `computer` tool: model returns a batched `actions[]` array of clicks/typing/scrolls; you screenshot and return `computer_call_output`.
- **Option 2** — *custom tool or harness*: "If you already have a Playwright, Selenium, VNC, or MCP-based automation harness, you do not need to rebuild it around the built-in `computer` tool… This path works well when you already have mature action execution, observability, retries, or domain-specific guardrails."
- **Option 3** — code-execution harness: model writes short scripts against exposed helpers.

Note the GA migration: `computer-use-preview` + `tools:[{type:"computer_use_preview"}]` is **deprecated**; the GA shape is `tools:[{type:"computer"}]` with a general model (`gpt-5.4`/`gpt-5.5`/`gpt-5.6`), one batched `actions[]` per `computer_call`, and no `truncation:"auto"` requirement. Anything in the repo referencing `computer-use-preview` will read as stale on 2026-08-16.

Anthropic's equivalent: `computer_20251124` tool type behind the `computer-use-2025-11-24` beta header, supported on `claude-opus-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-opus-4-5-20251101`. New in this version: a `zoom` action gated on `enable_zoom: true`. Older models need the `computer-use-2025-01-24` header. Notable for §3.4: Anthropic runs **prompt-injection classifiers on screenshots** by default and steers the model to ask for user confirmation when they fire — that is a free, citable safety story, and also a source of nondeterminism worth knowing about.

**Recommendation on (A): harness shape = Option 2 (custom tool harness), with a coordinate fallback.** Reasons specific to this brief:

- §3.3 requires replay *without the model*. If the model emits `click(x, y)`, the recorded artifact's locator is a pixel coordinate, which is the least stable, least reviewable, least parameterizable target imaginable. The artifact schema is "a focal point of the evaluation" (§3.2) and coordinate-based targeting makes it unreviewable.
- §3.2 requires "how each target element/control is identified (with your reasoning about robustness)". A semantic ref (role + accessible name + scoping ancestors) is a *thing you can reason about*. `(742, 318)` is not.
- Option 2 keeps allowlist and risk-classification enforcement *inside my own tool implementations*, which is the only place §3.4 enforcement can be real. With Option 1 the model returns actions and my only lever is refusing to execute them — workable, but the guardrail lives further from the action.

**But keep a screenshot+coordinate action in the tool set.** Two reasons: (i) it is the honest answer for a canvas/Flash-like/opaque region, which is exactly the §1 "native desktop / no clean DOM" case; (ii) it lets me say in REPORT §4 that the surface adapter interface has a pixel-level escape hatch, and *demonstrate* it, rather than asserting it. Playwright 1.60 added `boxes: true` on `ariaSnapshot()`/`ariaSnapshotJSON()`, emitting `[box=x,y,width,height]` per node — so semantic refs and coordinates come from the *same* observation. That is a strong, cheap design point: one snapshot, two targeting modes, chosen per step.

### 2.1 Provider / model options

Verified prices, 2026-08-16, USD per 1M tokens:

| Provider | Model | Input | Cached input | Output | Context | Computer-use tool support |
|---|---|---|---|---|---|---|
| OpenAI | `gpt-5.6-sol` | $5.00 | $0.50 | $30.00 | 1.05M | Yes (GA `computer`) |
| OpenAI | `gpt-5.6-terra` | $2.00 | $0.20 | $12.00 | 1.05M | Yes |
| OpenAI | `gpt-5.6-luna` | $0.20 | $0.02 | $1.20 | 1.05M | Yes |
| OpenAI | `gpt-5.5` | $5.00 | $0.50 | $30.00 | 1M | Yes (named in GA migration table) |
| OpenAI | `computer-use-preview` | — | — | — | — | **Deprecated** |
| Anthropic | `claude-opus-5` | $5.00 | $0.50 | $25.00 | 1M | Yes (`computer_20251124`) |
| Anthropic | `claude-sonnet-5` | $2.00* | $0.20 | $10.00* | 1M | Yes |
| Anthropic | `claude-haiku-4-5` | $1.00 | $0.10 | $5.00 | 200K | Only via `computer-use-2025-01-24` |
| Anthropic | `claude-fable-5` | $10.00 | $1.00 | $50.00 | 1M | (flagship; overkill) |

\* Sonnet 5 introductory pricing through 2026-08-31; standard $3/$15 from 2026-09-01. **This matters for reproducibility of a cost claim in the README** — a price quoted today changes in two weeks.

Also worth knowing: OpenAI cut Terra/Luna standard rates on 2026-07-30; cache *writes* on GPT-5.6 bill at 1.25× input, cache *reads* at 10%. Anthropic Batch API is 50% off both directions but is irrelevant for an interactive discovery loop.

### 2.2 Cost for ONE discovery run — worked estimate

Assumptions: goal of 8–15 real UI steps, hard cap of 25 model turns, observation = ARIA snapshot (~2.5k tokens for a moderate page) + one 1280×720 screenshot (~1.1k image tokens), stable system+tool prefix ~1.8k tokens (cacheable), history compacted to last 2 observations verbatim plus an action log (~0.8k). ⇒ ~10k input tokens/turn, ~400 output tokens/turn.

**Per run: ~250k input, ~10k output.**

| Model | Input cost | Output cost | **Total / run** |
|---|---|---|---|
| `gpt-5.6-luna` | $0.05 | $0.01 | **~$0.06** |
| `claude-haiku-4-5` | $0.25 | $0.05 | **~$0.30** |
| `claude-sonnet-5` (intro) | $0.50 | $0.10 | **~$0.60** |
| `gpt-5.6-terra` | $0.50 | $0.12 | **~$0.62** |
| `claude-opus-5` | $1.25 | $0.25 | **~$1.50** |
| `gpt-5.6-sol` | $1.25 | $0.30 | **~$1.55** |

Naive full-history (no compaction) grows input roughly quadratically: ~1.17M input tokens over 25 turns ⇒ ~$5.85 on Sol. So the honest range is **$0.06–$6 per run**, and **$15–50 for the whole project** including failed attempts and iteration. The brief's claim that "a single successful run is not an expensive thing to produce" is correct. **Do not let cost drive model selection here** — let capability-per-flake-rate drive it, and put a hard turn cap + a hard USD cap in config for the safety story.

**Concrete recommendation:** develop the loop against a cheap model (`gpt-5.6-luna` / `claude-haiku-4-5`) to iterate on prompts and tool schemas, then produce the *evidence run* on a mid/flagship model (`gpt-5.6-terra` or `claude-sonnet-5`) and record the exact model ID + date + token counts + cost in `/evidence/`. That is a stronger artifact than a bigger model.

### 2.3 SDK options

**Provider-native SDK (`openai` / `@anthropic-ai/sdk`) — Viable for this take-home.** IF 5, SPD 5, MAINT 5. Direct, no abstraction to explain, exact access to `computer` tool shape, beta headers, and cache controls. For a system whose whole point is "the model is only in the loop during discovery", a thin native SDK call is the honest dependency. **Default.**

**Vercel AI SDK (`ai`) — Viable for this take-home.** Provider-agnostic; v6 deprecated `generateObject`/`streamObject` in favour of `generateText`/`streamText` with an `output: Output.object({schema})` setting, and turned on `strictJsonSchema` by default. Genuine benefit here: switching providers to compare flake rates costs one line, and I can say in REPORT that provider choice is not load-bearing. Cost: one more abstraction whose migration churn (v5→v6) I would have to keep straight. IF 4, SPD 4, MAINT 3. Reasonable if the human wants a provider comparison in the write-up.

**OpenAI Agents SDK (`openai-agents` / `@openai/agents`) — Viable only as design story.** Real primitives (agents, handoffs, guardrails, tracing, MCP, `output_type` validation, sandbox agents). But: it wants to own the loop, and the loop *is* the deliverable being graded (§7 "correctness of the core loop"). Handing the graded artifact to a framework is the wrong trade. Its tracing goes to platform.openai.com, while §3.5 wants evidence in `/evidence/` in the repo. Mention it in REPORT §7 (Cuts) as "what I'd adopt if this were production and I wanted hosted tracing + guardrail primitives".

**Claude Agent SDK (`@anthropic-ai/claude-agent-sdk` / `claude-agent-sdk`) — Not viable for the discovery loop.** It bundles a native Claude Code binary and runs Claude Code's own agent loop with 20+ built-in file/bash tools. That is a coding-agent runtime, not a UI-driving runtime; the built-in tool surface is wrong, the permission model is designed for filesystem safety, and shipping a bundled binary in a take-home is a strange dependency to defend. Fine as an internal dev tool for *building* the project. Not the product's LLM layer.

**LiteLLM / OpenRouter — Viable only as design story.** Nice for "swap providers", but adds a proxy hop and a failure mode for zero grading credit on a single-run project.

### 2.4 Local models — **Not viable / avoid** (for the evidence run)

§4 says "the discovery run has to be real. At least one genuine LLM-driven run against a live surface." A local model *is* real, but: reproducibility on the grader's machine is worse, quality on multi-step UI grounding is materially worse, and the setup instructions in README balloon. Zero upside. If cost were the objection, `gpt-5.6-luna` at ~$0.06/run answers it.

### 2.5 Provider verdict

`gpt-5.6-terra` (OpenAI, Responses API, native SDK, Option-2 custom tool harness, structured outputs strict mode for the artifact emission step) is the default. `claude-sonnet-5` is the equally-defensible alternative and has one distinctive safety story worth stealing regardless of choice: **treat all on-screen content as untrusted input and never treat on-screen text as permission.** Both vendors now say this in their own docs; quoting it in REPORT §6 costs nothing and shows I read the primary sources.

---

## 3. Automation library — WEB

### 3.1 Playwright — **Viable for this take-home** (and the clear winner)

Current: **v1.62.0, released 2026-07-24**, Node and Python (`pip install playwright`, Python ≥3.10) at parity on version number. Features that matter *specifically* for this brief:

| Feature | Version | Why this brief cares |
|---|---|---|
| `locator.ariaSnapshot()` / `page.ariaSnapshot()` | 1.49+ | YAML accessibility tree — the non-DOM perception mode §3.1 asks for, without leaving the browser. |
| `ariaSnapshot({ mode: 'ai' })` with `[ref=e2]` | current | AI-optimised snapshot: stable element refs, includes iframe contents, does not wait/throws when absent. This is *the* observation format for the discovery loop. |
| `ariaSnapshotJSON()` | 1.63 | Same tree as JSON instead of YAML: `role`, `name`, `text`, `children`, state flags (`checked`/`disabled`/`expanded`/`selected`/`invalid`/`level`/`pressed`), `url`/`placeholder`, `ref`, `cursor`, `box`. Directly serialisable into the artifact. |
| `ariaSnapshot({ boxes: true })` | 1.60 | `[box=x,y,width,height]` per node — semantic ref *and* pixel coordinate from one observation. Enables the coordinate fallback in §2.0 with no second mechanism. |
| `expect(locator).toMatchAriaSnapshot()` | 1.49+ | A ready-made **checkpoint primitive** for §3.2's success condition — assert the a11y shape of a region, not a CSS selector. |
| `browser.bind(name, {workspaceDir \| host,port})` / `browser.unbind()` | 1.59 | **Multiple clients on one live browser.** This is the HITL control-transfer mechanism (§3.6) and it is first-class, not a hack. |
| `page.screencast` + `showActions()` / `showChapter()` / `showOverlay()` / `onFrame` | 1.59 | Annotated video "receipts" with chapter markers — an evidence format that reads well in `/evidence/`. |
| `tracing.startHar()` / `stopHar()` | 1.60 | HAR as first-class tracing API; traces now include WebSocket traffic. |
| `trace: 'retain-on-failure-and-retries'` | 1.57 | Keeps every attempt's trace when any fails — the flakiness-signal stretch goal (§8 multi-run stability) for free. |
| `npx playwright trace` (CLI) | 1.59/1.60 | Trace analysis from a terminal, no GUI. A grader (or a coding agent) can inspect evidence without opening a browser. |
| Bundled MCP + `playwright-cli` | 1.62 | `npx playwright mcp` and `npx playwright cli` ship in the box. |
| `locator.describe()` | 1.53 | Human labels on locators, surfaced in traces/reports — makes evidence self-documenting. |
| `page.pause()` | 1.9 | Headed-mode manual takeover with Inspector Resume. Crude but real HITL. |
| `frameLocator` / `getByRole` scoping | — | Framesets and nested iframes, which is exactly §1's "legacy web app". |

Breaking change to watch (1.60): `Locator.ariaRef()` was **removed**; use the `ariaSnapshot()` pipeline. Also removed: `handle` on `exposeBinding`, `logger` on `connect`, `videosPath`/`videoSize` (use `recordVideo` or the new screencast).

| Axis | Score |
|---|---|
| IF 5 · SPD 5 · DIRT 5 · HITL 5 · RPT 5 · MAINT 4 · PERM 5 | |

**The dirty-UI argument, concretely.** The a11y tree is a *projection* of the DOM: it collapses presentational wrappers, resolves accessible names from `aria-label`/label/text/`alt`, and surfaces roles and states. A table-based 2003 layout with no test IDs still produces `row` / `cell` / `link "Edit"` / `textbox "Member ID"` nodes, because the browser computes the tree for screen readers whether or not the developer cooperated. That is the honest reason a11y-first beats CSS-first on legacy surfaces, and it is a *true* sentence I can defend, unlike "ARIA is more stable" hand-waving. The failure mode to be honest about in REPORT §3: legacy apps often have *duplicate or empty* accessible names (`link ""` × 12 in a nav table), so the locator strategy needs role + name + **scoping ancestor + ordinal** as a documented fallback chain, not name alone.

### 3.2 Playwright MCP — **Viable for this take-home, but probably as a comparison, not the spine**

Now bundled with Playwright 1.62 (`npx playwright mcp`). Tool surface: `browser_navigate`, `browser_snapshot` (with `target`/`filename`/`depth`/`boxes`), `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, `browser_check`/`uncheck`, `browser_press_key`, `browser_hover`, `browser_drag`, `browser_tabs`, `browser_handle_dialog`, `browser_file_upload`, `browser_wait_for`, `browser_take_screenshot`, `browser_resize`, `browser_close`. Refs are `e<N>`, unique within a snapshot, invalidated by the next page change.

**Why not the spine:** the ref lifetime model (`valid until the next page change`) is exactly wrong for a record-once/replay-many system — a ref is a *session-scoped handle*, not a durable locator. Recording `ref=e14` into an artifact would produce an artifact that cannot replay tomorrow. I would have to resolve every ref back to a semantic descriptor at record time anyway, at which point I have written the interesting half of my own harness and gained an out-of-process dependency. Also: MCP's `browser_click` takes an `element` human-description parameter used for permission prompts, which is a nice pattern to *steal* for my own tool schemas (it forces the model to state intent, which is great evidence).

**Where it earns its place:** as a one-paragraph REPORT §7 note — "the observation format I built is deliberately the same shape as Playwright MCP's snapshot, so the discovery loop could be re-hosted on any MCP client" — and possibly as the stretch-goal capability catalog transport (§8, see §12.3 below).

### 3.3 Puppeteer — **Viable only as design story**

v25, Chrome-focused, now speaks WebDriver BiDi in addition to CDP, headless by default, thinner dependency, raw CDP via `page._client`. No first-party test runner, no ARIA-snapshot equivalent, no `browser.bind()`, no trace viewer. Everything Puppeteer does here, Playwright does with better ergonomics. Choose it only if something demands minimal deps and Chromium-only — nothing in this brief does.

### 3.4 Selenium 4 + WebDriver BiDi — **Not viable / avoid** (for this project)

Genuinely improved: BiDi brings bidirectional events, network logging, and standardised cross-browser semantics; Selenium Manager removed driver-binary pain. But: no auto-waiting (manual `WebDriverWait` everywhere), no ARIA snapshot, no trace viewer, no session-sharing primitive. The universal 2026 advice is "keep Selenium for existing enterprise suites; do not start greenfield with it." For a take-home graded on robustness and evidence, choosing Selenium costs a paragraph of justification I cannot win.

### 3.5 DOM vs a11y snapshot vs screenshot+coordinates — the actual decision

| Perception mode | DIRT | Artifact reviewability | Token cost/step | Verdict |
|---|---|---|---|---|
| Raw DOM / `outerHTML` | 2 | 1 (unreadable) | Very high (10–100k) | **Not viable / avoid** as the model's observation. Fine as a *failure-time evidence artifact*. |
| CSS/XPath selectors as locators | 2 | 3 | n/a | **Viable only as design story** — the last fallback in the chain, documented as such. §3.1 explicitly biases against it. |
| **ARIA snapshot (role+name+state, refs, boxes)** | **5** | **5** | ~2–4k | **Viable for this take-home. Primary.** |
| Screenshot + coordinates (VLM grounding) | 4 | 1 | ~1.1k image | **Viable for this take-home as a secondary action**, and mandatory as the design answer for opaque surfaces. |
| Hybrid: ARIA snapshot + screenshot each turn, model picks | 5 | 5 | ~3.6k | **Viable for this take-home. Recommended.** |

The hybrid is the recommendation and it is cheap (§2.2 math already assumes it). The model gets semantics *and* pixels; the artifact records whichever targeting mode the step actually used, with the mode as a typed field. That single schema field — `target: {kind: 'semantic', role, name, scope, ordinal} | {kind: 'point', x, y, basis}` — is a big chunk of the §3.7 surface-abstraction answer, because a desktop a11y adapter emits the first shape and a pure-vision adapter emits the second, and replay dispatches on `kind`.

### 3.6 CUA / agent SDKs over the browser

- **Stagehand** (Browserbase, MIT, v4.0.0 released 2026-08-10, TS/Python/Go, ~23.9k stars) — **Viable only as design story.** `act()`/`extract()`/`observe()` with Zod-validated extraction, and — importantly — **action caching**: first run calls the LLM, subsequent runs replay the cached mapping with zero inference, self-healing back to the LLM when the DOM shifts. That is *conceptually the same idea as this take-home*, which cuts both ways: it validates the design, and using it would mean the graded core (record → replay) is Stagehand's, not mine. v3 dropped Playwright for a native CDP layer, which also removes the `browser.bind()`/trace ecosystem I want. **Cite it in REPORT §1 as prior art and state why I built the loop myself** — that is a strong move, not a weak one.
- **browser-use** (MIT, v0.13.7, ~109k stars, Python, Rust-core rebuild) — **Viable only as design story.** Autonomous `Agent(task=..., llm=...)`. Maximum convenience, minimum control; produces no reusable typed artifact. Wrong shape.
- **Skyvern** (**AGPL-3.0**, v1.0.48, ~22.7k stars) — **Not viable / avoid.** Vision-first planner/actor/validator, genuinely good at form-heavy legacy portals, and its 2.0 architecture is worth one sentence in REPORT §4. But AGPL-3.0 in a *public GitHub repo* submitted as a work sample is a licence conversation I should not start. Flag the licence explicitly if anyone proposes it.
- **Browserbase / Steel** (managed or self-hostable browser infra) — **Not viable / avoid.** §7: "we do not reward … building scaling infrastructure". A hosted browser adds a key, a bill, and a dependency for zero credit.

---

## 4. Automation — OS-level & desktop

Ranked for this take-home. The honest headline: **none of these should be the primary surface**, and exactly one of them is worth a small real demo if the human wants a second adapter.

### 4.1 `xa11y` — **Viable for this take-home** (as an *optional* second adapter only)

MIT, Rust core with Python (`pip install xa11y`, ≥3.9, prebuilt wheels) and Node (`@crowecawcaw/xa11y`, ≥18, prebuilt native binaries for Linux/macOS/Windows x64+arm64) bindings, plus a CLI for exploring a11y trees. **v0.13.0, published 2026-08-07** (npm) / 2026-08-07 (PyPI). Repo created 2026-03-15, 17 releases, 46 stars, 5 contributors.

One API over macOS `AXUIElement`, Windows UI Automation, Linux AT-SPI2. CSS-like selectors (`button[name='Submit']`, `textfield[name^='Search']`, `group > button`). Locators that re-resolve and auto-wait before acting — i.e. **the same mental model as Playwright locators**, which is exactly what makes it interesting here: the surface-adapter seam in REPORT §4 becomes *demonstrably* the same shape on web and desktop, not a hand-wave. Action verbs: `press`, `focus`/`blur`, `toggle`, `expand`/`collapse`, `select`, `set_value`, `type_text`, `increment`/`decrement`, `show_menu`.

| Axis | Score | Note |
|---|---|---|
| IF | 4 | Novel enough to be interesting; young enough to need a caveat. |
| SPD | 3 | A second adapter is a second adapter. |
| DIRT | 4 | Only as good as the app's a11y implementation — the standard AT-SPI/UIA caveat. |
| HITL | 3 | Human takeover of a desktop app is trivially "the human uses the app", but *observing* what they did is much harder than in a browser. |
| RPT | **5** | Best §3.7 story available. Same locator algebra, different backend. |
| MAINT | 2 | v0.13.0, 46 stars, one primary maintainer, 50 weekly npm downloads. Pre-1.0. |
| PERM | 2 | macOS needs **Accessibility** *and* (macOS 26+) **Screen & System Audio Recording**, granted to the terminal, with a terminal restart. Linux needs AT-SPI2 running (default on GNOME). Windows needs nothing. |

**Risk to state plainly:** pinning a pre-1.0, 46-star dependency into a submitted repo is a judgement call. If used, pin the exact version, isolate it behind the adapter interface, and say in README that the desktop adapter is optional and skipped if unavailable.

### 4.2 PyAutoGUI — **Viable only as design story**

BSD-3, cross-platform, pixel coordinates and image matching, no a11y reading, requires the target window to be foregrounded. It is the *reference implementation* of the thing this brief warns against: coordinate-only targeting that produces unreviewable artifacts. Its correct role in this project is a named alternative in REPORT §4 explaining why a11y-first beats pixel-first, plus an honest admission that pixel-first is the only option when a11y is absent (Citrix, remote-desktop, canvas-rendered terminals — very real in banking).

### 4.3 nut.js — **Not viable / avoid**

Cross-platform Node desktop automation with mouse/keyboard/screen/window control, plus premium plugins (`nl-matcher` image search, `plugin-ocr`, `element-inspector`, `bolt` input monitoring, `nib` agent CLI). **The core is open source but the prebuilt `@nut-tree/nut-js` packages require a paid subscription — $20/month Core, $75/month Solo** — with "build from source" as the free path. For a public take-home repo whose README must say "how to set up and run it", a dependency that either costs the grader money or requires them to build native addons from source is disqualifying. This is a licensing/DX fact, not a quality judgement — nut.js is good software.

### 4.4 Native per-platform a11y libraries — **Viable only as design story**

| Library | Platform | Licence | Note |
|---|---|---|---|
| `pywinauto` 0.6.x | Windows (`win32` + `uia` backends) | BSD-3 | Mature, but no auto-wait/locator re-resolution; explicitly a hobby-maintained project; Chrome needs `--force-renderer-accessibility`. |
| FlaUI 5.0.0 (Feb 2025) | Windows | MIT | Best-in-class UIA for .NET — wrong language. |
| `dogtail` 1.x | Linux AT-SPI2 (Wayland via `gnome-ponytail-daemon`) | **GPL-2.0** | Copyleft; check before shipping. |
| `atomacos` | macOS AXUIElement | **GPL-3.0** | Copyleft + low recent activity. |
| Appium (Windows / Mac2 drivers) | Win + macOS | Apache-2.0 | Real cross-platform a11y with auto-wait, but a WebDriver server topology to stand up. **Not viable** for a take-home's setup budget. |

All of these are correct to *name* in REPORT §4 as "the concrete backends a `DesktopSurface` adapter would sit on"; none should be a direct dependency.

### 4.5 Screenshot + VLM only (OmniParser-style / raw computer-use tool) — **Viable only as design story**

The right answer for genuinely opaque surfaces, and the thing the built-in `computer` tools are for. Not the right primary because of the artifact-reviewability argument in §2.0. Worth building *one* action (`click_point`) so the escape hatch is real.

### 4.6 Window control / OS injection — **Not viable / avoid** as a project component

`xdotool`, AppleScript/`osascript`, Win32 `SendInput`. Useful glue in a Docker CUA container (OpenAI's own reference Dockerfile installs `xdotool` alongside Xvfb/x11vnc/XFCE), but not something to build the system on.

### 4.7 Ranking (take-home viability, best first)

1. **xa11y** — viable as an optional second adapter; best §3.7 payoff per line of code; pre-1.0 risk.
2. **Playwright `_electron`** (§5) — viable; not really "OS-level" but delivers the "desktop app" narrative at web cost.
3. Screenshot+VLM `click_point` action inside the web harness — viable as one action, not a surface.
4. pywinauto / FlaUI / dogtail / atomacos — design story.
5. PyAutoGUI — design story (and a useful foil).
6. Appium — design story; setup cost too high.
7. nut.js — avoid (paid prebuilts).
8. Raw OS input injection as a primary mechanism — avoid.

### 4.8 The permission/CI reality nobody should skip

Any OS-level path breaks headless CI and adds a manual grant step on the grader's machine (macOS: two separate Privacy & Security grants plus a terminal restart). A browser/Electron path runs headless in CI with zero grants. Given §5 ("we'd rather see a well-designed seam than a stalled project"), **the OS-level path should be a seam, not a build**, unless the human explicitly asks for it at G1/G4.

---

## 5. Electron & hybrid

### 5.1 Playwright `_electron` — **Viable for this take-home**

`const { _electron: electron } = require('playwright'); const app = await electron.launch({ args: ['main.js'] })`. Gives `electronApp.firstWindow()` → a normal Playwright `Page` (so **every** web technique above applies unchanged: ARIA snapshots, refs, boxes, tracing, screencast), plus `electronApp.evaluate()` to run code in the **main** process, `electronApp.windows()`, and `on('window')` / `on('console')` events.

Two facts to state honestly in the write-up:

1. **Playwright's Electron support is officially "experimental."** It has been stable in practice for years, but the docs say experimental and a grader may know that.
2. **Playwright does not intercept native Electron dialogs** (`dialog.showOpenDialog`, `showSaveDialog`, `showMessageBox`) because those cross into OS APIs from the main process. The documented workaround is `electronApp.evaluate()` to replace those methods. Requires the `NodeCliInspect` fuse (`EnableNodeCliInspectArguments`) to be enabled — relevant only for packaged apps.

That second point is *interesting*, not a problem: an unexpected native confirmation dialog is precisely a §3.3 "unexpected dialog" runtime condition, and Electron gives me a way to *inject* one deterministically for the error-path evidence run the brief asks for ("Ideally include one replay that hits an error or exceptional state … or an injected/simulated failure"). Being able to say "I injected a native modal at replay time and my error taxonomy classified it as *recoverable → dismiss known interstitial*, then continued" is a very good paragraph.

| Axis | Score |
|---|---|
| IF 4 · SPD 4 · DIRT 4 · HITL 4 · RPT **5** · MAINT 4 · PERM 4 | |

### 5.2 When Electron is the right legacy-desktop proxy vs when hostile web is enough

**Electron earns its cost when the design story needs a *process* boundary, not just a markup boundary.** Specifically, Electron uniquely buys:

- A genuine **application window** (launch, focus, multi-window) rather than a tab — so `SurfaceAdapter.attach()` has two real implementations with genuinely different lifecycles (launch-a-process vs navigate-a-URL), which is the seam §3.7 asks about.
- **Native OS dialogs** and menus that the DOM cannot express — the real "the automation can't see it" failure class.
- A credible "this is a desktop app" claim in the demo without any OS permission grants, because it is still Chromium under the hood.

**Hostile web is enough when** the interesting difficulty is *perception* (framesets, nested iframes, table layouts, no test IDs, duplicate accessible names, server-rendered postbacks, session timeouts, popup interstitials). All of that is reproducible in a local static/legacy HTML app in a fraction of the time, and it hits §1's "legacy web app" bullet exactly.

**Recommendation:** hostile local web as the *primary* surface (§13), Electron as the **optional** second adapter if there is budget — it costs perhaps a tenth of what a native-desktop adapter costs and delivers most of the §3.7 credit, because `ElectronSurface` and `WebSurface` share the entire perception layer while differing exactly at attach/lifecycle. If forced to choose between an Electron adapter and a *better artifact schema*, choose the schema — §7 ranks system design first.

### 5.3 "Opaque desktop" (an unknown packaged .exe/.app driven only by a11y or pixels) — **Viable only as design story**

Maximum realism, maximum cost, worst permission friction, and nothing to show for it that the Electron path does not already show. Do not.

---

## 6. Orchestration

The brief's §7 is unusually explicit: *"We do not reward feature breadth, framework name-dropping, or building scaling infrastructure."* Read that as pricing every orchestration framework at a negative.

### 6.1 Custom loop + explicit state machine, single process — **Viable for this take-home. Recommended.**

Two distinct execution engines sharing one surface adapter and one artifact type:

- **Discovery engine:** `while (turn < maxTurns && !done)` → observe → model → validate tool call against policy → act → record. Maybe 200 lines.
- **Replay engine:** a `for` over recorded steps with a per-step state machine `{resolve → precondition → act → settle → checkpoint}` and typed outcomes. Maybe 300 lines.

| Axis | Score |
|---|---|
| IF **5** · SPD **5** · DIRT 4 · HITL 4 · RPT 5 · MAINT **5** · PERM 5 | |

**Why this is right, not just cheap:** the replay engine's step state machine *is* the error taxonomy (§3.3). Externalising it into a framework's node graph hides the exact thing being graded. And a hand-written loop lets the pause/resume seam sit exactly where §3.6 wants it: between "settle" and "checkpoint", where a stuck detection can raise an intervention and await a resume signal on the same session.

The one thing to build deliberately rather than ad hoc: a **`RunJournal`** — an append-only JSONL of `{seq, ts, phase, action, observation_digest, outcome}` written on every transition. That gives durability, evidence, and replay-from-step for free, and it is ~40 lines. It is the "poor man's checkpointer" and it is genuinely enough here.

### 6.2 Plain state machine library (XState, `@xstate/fsm`, or a hand-rolled enum) — **Viable for this take-home** (library optional)

A hand-rolled discriminated-union state enum is preferable to a dependency. XState buys visualisation and formal semantics; for ~10 states it buys mostly a learning curve for the reader. IF 4, SPD 4, MAINT 4. Neutral: fine if the human likes it, unnecessary otherwise.

### 6.3 LangGraph — **Viable only as design story**

LangGraph 1.x. The HITL story is genuinely well-matched on paper: `interrupt(payload)` inside a node suspends, persists state via the checkpointer, surfaces the payload under `__interrupt__` / `stream.interrupts`, waits indefinitely, and resumes with `Command(resume=value)` on the same `thread_id`, where the resumed value becomes `interrupt()`'s return value. Requires a checkpointer + `thread_id`; `InMemorySaver` for local, `PostgresSaver`/`RedisSaver` for durability.

**Why it still loses here:**

1. **The resume semantics are a trap for this specific system.** On resume, LangGraph **re-runs the interrupted node from its first line**, so every side effect above `interrupt()` executes again. In an *agent that clicks buttons in a banking UI*, "re-run the node from the top" means re-clicking. Making every node idempotent around live UI mutations is real work that buys nothing the brief asked for. (The docs' own guidance — wrap non-deterministic/side-effecting operations in tasks — is exactly this tax.)
2. It solves *process-crash* durability. The brief's HITL is a human taking over a **live browser session in the same process**; if that process dies, the browser session dies too, so cross-process durability is moot.
3. §7's anti-framework line means I'd be defending a dependency, not a decision.

Correct treatment: one sentence in REPORT §5 — "for multi-hour approvals across process restarts, the pause/resume seam maps onto a durable checkpointer (LangGraph `interrupt()`/`Command(resume=)`, or a durable-execution engine); I kept it in-process because the live browser session is the durability boundary anyway."

### 6.4 Temporal / Inngest / Restate / DBOS — **Viable only as design story**

Verified positioning (2026): **Temporal** — mature, polyglot, MIT, server+worker topology, Nexus and multi-region GA in early 2026, but large LLM payloads saturate workflow history and force payload codecs. **Inngest** — TS/serverless, `step.run()`, *no replay model* so no determinism wall, SSPL, step-based pricing. **Restate** — single self-contained Rust binary, journaled invocations, virtual objects, BSL server / MIT SDKs, demonstrates durable loops over Vercel AI SDK / OpenAI Agents SDK / Pydantic AI. **DBOS** — durability as a *library*, checkpoints into your existing Postgres, no orchestration cluster.

All four are the correct answer to a real production question ("survive a redeploy while a human is at lunch") and the wrong answer to this take-home. **DBOS and Restate are the two to name in REPORT §5** because they are the ones whose footprint is small enough that the reader will believe I actually considered them rather than pattern-matched a buzzword list.

### 6.5 Queues, workers, services, microservices — **Not viable / avoid**

§7 names this explicitly. Single process, single CLI. §4 even pre-approves it: "Simpler is fine if justified."

### 6.6 What is overkill — the one-line summary for the write-up

> Durable-execution engines solve *process* durability. My durability boundary is a live browser session that dies with the process, so an append-only run journal plus a resumable session handle is the correct-sized mechanism; the seam is designed so a checkpointer could be swapped in without touching the replay engine.

---

## 7. Schema / validation + artifact serialization + versioning

This is the highest-graded single component (§3.2 "Design the schema deliberately; it's a focal point of the evaluation"; §7 "The artifact schema and replay contract are central"). The *library* choice is easy; the *versioning story* is where the marks are.

### 7.1 Library

**Zod 4 (TypeScript) — Viable for this take-home.** Native `z.toJSONSchema(schema)` since v4.0 (targets `draft-2020-12` default, plus `draft-07`, `draft-04`, `openapi-3.0`; options for `unrepresentable`, `cycles`, `reused`, `io: 'input'|'output'`). Deprecates the third-party `zod-to-json-schema`. `z.discriminatedUnion` compiles to the tagged `anyOf`+`const` shape that constrained decoding handles best. `.describe()` puts field docs into the emitted JSON Schema, which is the cheapest accuracy win available on the model side. One schema → TypeScript type + runtime validator + JSON Schema for the LLM + artifact validator. **IF 5, SPD 5, MAINT 4.**

**Pydantic v2 (Python) — Viable for this take-home.** Rust core, `model_json_schema()`, `Field(discriminator=...)` unions, `json_schema_extra`. Equal in power. Two gotchas worth knowing: nested models become `$defs`+`$ref` (strict modes accept this), and a field with a default becomes *optional with a `default` key*, which is the most common cause of strict-mode rejection.

**Raw JSON Schema by hand — Viable only as design story.** You end up maintaining the schema, the types, and the validator separately, and they drift. The whole argument for Zod/Pydantic is that the schema you send, the validator you run, and the type your editor knows are the *same object*.

**Protobuf / Avro / Cap'n Proto — Not viable / avoid.** The artifact must be "reviewable" by a human *and* a calling agent (§3.2). Binary formats fail the review requirement, add codegen, and buy nothing at this scale. Mention protobuf only if someone asks about wire efficiency at thousands of tenants — and even then, the answer is "the artifact is config, not traffic."

**YAML vs JSON for the artifact:** JSON as the canonical on-disk form (unambiguous, hashable, diffable by tooling, directly `JSON.parse`-able by a calling agent), with an optional `--format yaml` render for human review. Do not make YAML canonical — YAML's implicit typing (Norway problem, sexagesimals, version strings becoming floats) is a real hazard in a file containing account-like identifiers.

### 7.2 Provider constraints that shape the schema (verified 2026-08-16)

**OpenAI structured outputs, strict mode** (`text: { format: { type: 'json_schema', strict: true, schema } }` on Responses; `response_format` on Chat Completions):

- Every object **must** set `additionalProperties: false`.
- Every field **must** be listed in `required` — there are **no optional fields**; anything optional must be typed nullable (`["string","null"]`).
- Unsupported: `allOf`, `not`, `dependentRequired`, `dependentSchemas`, `if`/`then`/`else`, and **root-level `anyOf`** (so no discriminated union at the *top* of the schema).
- Supported (unlike Anthropic): numeric `minimum`/`maximum`/`multipleOf`, array `minItems`/`maxItems`, `pattern`, string `format`, `enum` (max 1,000 values across all properties).
- Limits: ~5,000 properties, 10 levels of nesting (Azure docs say 100 properties / 5 levels for their surface — treat the tighter number as the practical budget), 120,000 characters.
- Unsupported schema + `strict: true` ⇒ 400 error, so this must be tested, not assumed.

**Practical consequence for the artifact schema:** the full `Capability` schema is *not* what I ask the model to emit. Ask the model for a *narrow, flat, strict-safe* proposal (step list with semantic targets, parameter names, output field names) and **synthesise** the full artifact — version, hashes, provenance, checkpoints, policy metadata — in code from the run journal. That is better design anyway: the artifact should be "decoupled from the raw model transcript" (§3.2 says so explicitly), and the model should not be authoring its own provenance.

### 7.3 Versioning story (this is the part that earns marks)

Three *different* versions must not be conflated, and conflating them is the most common mistake:

| Version | What it versions | Format | Who bumps it |
|---|---|---|---|
| `schemaVersion` | the shape of the artifact file itself | integer or semver-major | me, when the schema changes; replay refuses unknown majors and a migration function upgrades known older ones |
| `capabilityVersion` | the recorded flow's semantics | semver | bumped when steps/params/outputs change; **minor** for additive/compatible, **major** when the invocation contract changes |
| `contractHash` | the *callable* surface only (name + input params + output shape + success condition) | content hash | derived, never hand-edited; a calling agent pins this and detects breakage without reading the diff |

Plus, for §3.7 multi-tenant reuse, the split that makes the story credible:

- **`base`** — the vendor-product-level recording (steps, semantic targets, contract).
- **`overlay`** — per-tenant/per-version deltas (base URL, a renamed label, an extra interstitial to dismiss, a disabled step), keyed by `{tenantId, appVersion}`, applied as a typed patch with a *closed* set of override kinds (not arbitrary JSON merge — arbitrary merge is unreviewable, which defeats §3.2).
- **`fingerprint`** — a stable digest of the observed surface (title, key landmark roles/names, route pattern) recorded at record time and re-checked at replay time. Mismatch ⇒ a *typed drift outcome*, not a crash. This is the concrete answer to "how do you detect and manage per-tenant/version drift" and it costs almost nothing to implement.

Also record, per step: `recordedAt`, `surfaceKind`, `targetingMode`, and the *alternative* locators the recorder considered but rejected (with reasons). That last one is directly responsive to §3.2's "with your reasoning about robustness" and turns a schema field into an argument.

---

## 8. Persistence

### 8.1 Filesystem JSON/JSONL — **Viable for this take-home. Recommended.**

```
capabilities/<capability-id>/<version>.json      # the artifact — git-diffable, reviewable
evidence/<run-id>/journal.jsonl                  # append-only structured log
evidence/<run-id>/steps/<seq>-{before,after}.png
evidence/<run-id>/steps/<seq>-snapshot.yaml
evidence/<run-id>/trace.zip                      # Playwright trace
evidence/<run-id>/result.json                    # typed run result
```

| Axis | Score |
|---|---|
| IF **5** · SPD **5** · DIRT n/a · HITL 4 · RPT 4 · MAINT **5** · PERM 5 | |

Decisive advantage for a take-home: **the deliverable is literally a directory the grader browses** (§6.3 asks for `/evidence/` with an example artifact plus logs from both runs). Files *are* the demo. A database hides the deliverable behind a query.

### 8.2 SQLite (`node:sqlite` or `better-sqlite3` / stdlib `sqlite3`) — **Viable only as design story**

`node:sqlite` is built in but Stability 1.2 (release candidate) as of Node 24.15/25.7 — "safe for scripts, CLIs, and internal tooling", with `better-sqlite3` still the conservative call for critical paths. Genuinely useful *if* the system grows a capability registry with queries ("all capabilities for vendor X above confidence Y", "replay history per capability"). For one capability and two runs it is ceremony. **Correct REPORT §7 sentence:** "the store is behind a `CapabilityStore` interface with a filesystem implementation; a registry at thousands of artifacts is a SQLite/Postgres swap, not a redesign."

### 8.3 Nothing extra (in-memory) — **Not viable / avoid**

Fails §6.3's evidence requirement.

### 8.4 Postgres / Redis / any server — **Not viable / avoid**

Adds a service to the README's setup section for zero grading credit. §7 names this anti-pattern.

---

## 9. CLI / DX — how graders run it

§6.1 requires README to cover setup + "a demo path: the exact command(s) to run the agent on a goal, then replay the resulting artifact." Optimise for *the grader's first five minutes*.

### 9.1 Argument parsing

| Option | Verdict | Note |
|---|---|---|
| **Commander.js** (~50M weekly downloads, zero runtime deps, strong TS types since v8) | **Viable for this take-home. Recommended (TS).** | "One binary, a handful of subcommands, small and fast." Exactly the shape here. |
| yargs (~30M/week, 3 deps, richer auto-help + validation) | **Viable for this take-home** | Fine; heavier; no advantage at 4 commands. |
| Clipanion (~30KB, class-based, native TS) | Viable only as design story | Nice, unfamiliar to most graders. |
| oclif (~30 deps, ~135ms cold start vs Commander's ~25ms) | **Not viable / avoid** | A framework for thousand-command CLIs. |
| `node:util.parseArgs` (built-in) | **Viable for this take-home** | Zero deps. Genuinely defensible at 4 commands; costs hand-written help text. |
| **Typer** (Python) | **Viable for this take-home. Recommended (Python).** | Type-hints-to-CLI, auto-help, matches Pydantic idiom. |
| Click (Python) | Viable for this take-home | Typer is built on it; use Typer. |

### 9.2 Task running

`npm run` scripts (or a `Makefile`/`justfile`). **Recommendation: plain `package.json` scripts.** A `justfile` requires the grader to install `just`. A `Makefile` is universal but tab-sensitive and reads as ceremony in a JS repo. Every extra install between the grader and a green run is a real cost.

### 9.3 The command surface (design it now, it shapes everything)

```
<cli> discover --goal "…" --target <url|app> --out capabilities/       # LLM in the loop
<cli> replay <artifact> --param memberId=12345 [--inject <fault>]      # no LLM
<cli> replay <artifact> --param memberId=99999                         # business-outcome demo
<cli> inspect <artifact>                                               # human-readable render + contract hash
<cli> operator                                                         # mock operator console: list/claim/resume interventions
```

`--inject <fault>` is worth building: §6.3 asks for a replay that hits an error state, and a deterministic injector (`not-found`, `slow-load`, `unexpected-dialog`, `session-timeout`, `permission-denied`, `validation-error`) turns that from "hopefully the site misbehaves" into a repeatable demo. It also doubles as the test fixture generator (§10).

### 9.4 Setup friction to eliminate

- `.env.example` with `OPENAI_API_KEY=` and an explicit spend note; `--env-file` (Node 24) or `python-dotenv`.
- `npx playwright install chromium` — one browser, not three.
- **A no-key path.** §6.1 says "how to run without live services if applicable". `replay` must work with zero API keys (it must, by definition — no LLM in the loop), and `discover --dry-run` should replay a canned transcript. This is a strong grader-experience signal, and it is also the §10 replay-fixture mechanism.
- Local target app started by the same command (`npm run target` or a docker one-liner) so nothing depends on an external site being up.

---

## 10. Testing — what "enough" means here

§7 says "reasonably typed and tested **where it counts**". That phrase is the spec. Chasing coverage is a misread.

### 10.1 Runner

- **TS: `node --test`** (Stability 2 since Node 20, feature-complete in 24: assertions, mocks, coverage via `--experimental-test-coverage`, watch, parallel, `--reporter=junit`). Zero dependencies. For a "small, correct, well-argued system", a zero-dep test runner is itself an argument. **Vitest** is equally fine and better if the repo already needs a bundler — it does not.
- **Python: `pytest`.** Uncontested.
- **Playwright Test** — use for a *couple* of end-to-end checks against the local target, not as the main runner; its fixture model is built for testing web apps, not for unit-testing a replay engine.

### 10.2 The four test classes that actually earn marks

1. **Schema/contract tests** (highest value per line). Artifact round-trips; unknown `schemaVersion` is rejected; a v1 artifact migrates to v2; `contractHash` is stable under cosmetic edits and changes under contract edits; strict-mode JSON Schema generation actually validates against the provider's constraints (§7.2) rather than being assumed.
2. **Replay fixture / golden tests.** The core `ReplayEngine` should depend on a `Surface` interface, not on Playwright. Then a `FakeSurface` driven by recorded snapshot fixtures exercises *every* branch of the error taxonomy — success, not-found, validation error, permission denial, unexpected dialog, session timeout, slow load, hard failure — with no browser, in milliseconds, deterministically. **This is the single highest-value test suite in the project** because the error taxonomy is what §7 grades under "Robustness & error handling", and a test per taxonomy branch is direct evidence that the taxonomy is real and not prose.
3. **Policy/guardrail tests.** Allowlist denies off-domain navigation; risky action classification blocks/escalates; redaction removes secrets from artifact, journal, and screenshot metadata. These are cheap, fast, and directly map to §3.4 / §7 "Safety & data handling".
4. **One live smoke test** against the local target app, tagged and skippable, that runs `replay` end-to-end.

### 10.3 Explicitly *not* worth it here

- Unit tests for thin Playwright wrappers (testing Playwright, not me).
- Mocking the LLM provider SDK at the HTTP layer — instead record one real transcript to `fixtures/` and replay it. Same value, less machinery, and doubles as `--dry-run`.
- Coverage thresholds. Nobody grades a percentage; they read the test names. Name tests after taxonomy branches so the file listing reads as a specification.
- Trace-diff tests (asserting a Playwright trace matches a golden trace). Tempting, brittle, low value. **Viable only as design story.**

---

## 11. Observability / evidence format

§3.5 wants "a structured log of what the agent did and why, and at least one richer signal on failure". §6.3 wants `/evidence/` with an example artifact plus logs from both runs, ideally including an error case.

### 11.1 Structured logs

**JSONL, one object per line, written through a redaction chokepoint.** Fields: `{ts, runId, seq, phase, actor: 'agent'|'human'|'system', action, targetSummary, rationale, outcome, durationMs, evidenceRefs[]}`.

Two fields carry disproportionate weight:

- **`rationale`** — §3.5 says "what the agent did **and why**". Capturing the model's stated reason per action (a required field in the tool schema, mirroring Playwright MCP's `element` human-description parameter) makes the log answer "why" instead of just "what". Cheap; high signal.
- **`actor`** — makes the §3.6 handoff legible in a single grep. The log shows control moving `agent → human → agent`, which *is* the control-transfer model, visible as data.

Library: **`pino`** (fast, JSONL-native, has built-in key-path `redact`) or just `JSON.stringify` to a write stream. A hand-rolled writer is defensible at this size and removes a dependency; pino's `redact` is the reason to take the dependency.

### 11.2 Evidence on failure

Layered, cheapest first:

1. **Always:** JSONL journal + typed `result.json`.
2. **Always, per step:** the ARIA snapshot digest (a hash) — full snapshots only on the first step and on any failure.
3. **On failure:** full ARIA snapshot (YAML) + screenshot + last N journal entries + the expected-vs-observed diff for the failed checkpoint. "What step, what was expected, what was observed" is §3.3's literal wording; make `result.json` contain exactly those three fields.
4. **On failure (or always in discovery):** Playwright **trace zip**. `trace: 'retain-on-failure-and-retries'` for the multi-attempt case; `tracing.startHar()`/`stopHar()` (1.60) if network evidence matters; note traces now include WebSocket traffic. `npx playwright trace` lets a grader inspect it from a terminal.
5. **Optional, high polish:** `page.screencast` with `showChapter()` per logical step and `showActions()` — an annotated video "receipt". §6.3 says a screen recording is "welcome but optional"; this makes it nearly free and self-narrating.

### 11.3 Directory layout

`/evidence/` in the repo root (the brief specifies the path), with `discovery-<runId>/` and `replay-<runId>-{success,not-found,injected-failure}/` subdirectories and a short `/evidence/README.md` index explaining what each run demonstrates. That index is a 10-line file that materially improves how the whole submission reads.

### 11.4 What not to do

- OpenTelemetry / a tracing backend — **Not viable / avoid.** Infrastructure for zero credit.
- Hosted tracing (Agents SDK dashboard, LangSmith, Sentry) — **Viable only as design story.** The evidence must be *in the repo*.
- Committing multi-hundred-MB traces/videos. Cap resolution, keep one representative trace per run type, and say so.

---

## 12. Config, allowlist format, redaction

### 12.1 Config

`.env` for **secrets only** (API key), loaded via Node 24 `--env-file` or `python-dotenv`; `.env.example` committed with a spend-cap comment. Everything non-secret in a committed, validated config file. **Validate config with the same schema library as the artifact** (Zod/Pydantic) and fail fast with a readable error — a small thing that signals care.

### 12.2 Allowlist format

**A committed YAML or JSON policy file, parsed into a typed `Policy` object, enforced at one chokepoint in the action executor** (not sprinkled through the code — a single `assertAllowed(action, context)` before every act call, so the enforcement point is provably total).

Shape worth proposing:

```yaml
version: 1
surfaces:
  - id: demo-bank
    kind: web
    origins: ["http://localhost:7080"]        # exact origins, not substrings
    routes:                                    # optional route-pattern narrowing
      allow: ["/", "/login", "/members/*", "/members/*/accounts"]
      deny:  ["/admin/*", "/settings/*"]
actions:
  allow: [navigate, click, type, select, check, read, screenshot, wait]
  deny:  [download, upload, file_chooser, new_tab, execute_script]
risk:
  irreversible_intents: [submit_transfer, delete, approve, send, change_password]
  policy: escalate                             # block | confirm | escalate | flag
limits:
  max_steps: 25
  max_wall_clock_s: 300
  max_usd: 2.00
redaction:
  never_persist: [password, ssn, account_number, card_number, api_key, token, cookie]
```

Design notes worth defending: match **origins exactly** (a substring/`includes` allowlist is a classic bypass — `evil.com/?x=localhost:7080`); allowlist **action types** as well as destinations, because §3.4 asks for both; make the risky-action class an *intent* classification decided at record time and re-checked at replay time, not a regex over button text. And be honest in REPORT §6 about the limit: **an allowlist on *my* actions is not a defence against prompt injection from page content** — both OpenAI and Anthropic now say in their own docs to treat on-screen content as untrusted and never treat it as permission. Anthropic additionally runs screenshot prompt-injection classifiers that steer toward user confirmation. Stating this limit precisely is worth more than pretending the guardrail is complete.

### 12.3 Redaction

Two complementary layers, because each alone is insufficient:

1. **Key-path redaction** for known-sensitive fields — `pino`'s `redact: ['req.headers.authorization', …]` model. Fast, exact, zero false positives. Note pino's redact paths are **case-sensitive**, a real footgun with HTTP headers.
2. **Content-aware value scanning** for the unknown case — the API key someone pasted into a free-text note, the card number in a stack trace. Candidates verified 2026-08-16: **`flare-redact`** (MIT, zero deps, ReDoS-safe bounded patterns, `pinoRedact` adapter, reversible vault, `wrapOpenAI`/`wrapAnthropic` egress guards, checksum-validated national IDs so a random digit run is not misclassified) and **`@claudiu-ceia/pii-mask`** (grammar-based via ts-duckling, ESM-only, Node 20+/Bun 1.3+, pino/winston plugins, and refreshingly honest about false positives/negatives on ambiguous numeric identifiers).

**Recommendation:** implement a small first-party `redact()` on the write path (one chokepoint through which artifacts, journal entries, and result objects all pass), using key-path rules plus a short list of value patterns. Take a dependency only if it saves real time. The reason to keep it first-party: the §3.4 requirement is about *this* domain's sensitive data (member IDs, account numbers, balances), and a generic library will not know that `memberId` is a parameter to be *placeholdered* rather than a secret to be *masked*. That distinction is itself a good REPORT §6 point:

> Parameters are **placeholdered** in the artifact (`{{memberId}}`), never captured; secrets are **masked** in logs; and extracted output values are **classified** — a balance is a business output the caller needs, so it is returned to the caller but never written to disk.

Also worth doing and cheap: **screenshot redaction** — before writing a screenshot to `/evidence/`, black out the bounding boxes of any element whose accessible name or field name matches a sensitive pattern. `ariaSnapshot({boxes: true})` already gives the coordinates. Very few take-homes will do this, it takes ~30 lines, and it is a direct, visible answer to "never leak regulated financial data into evidence".

---

## 13. Target application options

The single highest-leverage decision after the artifact schema, because it determines whether the interesting problems are even *reachable*.

### 13.1 Public sandbox sites

| Site | ToS/legal | Dirty-UI value | Verdict |
|---|---|---|---|
| **`the-internet`** (Sauce Labs) — `the-internet.herokuapp.com`, **Apache-2.0**, self-hostable (`docker run -d -p 7080:5000 gprestes/the-internet:v2.6.5`, or `bundle install && rackup`) | Apache-2.0 source; **self-host and the ToS question disappears entirely** | High: nested frames, dynamic loading, JS alerts, basic/form auth, broken images, infinite scroll, status codes | **Viable for this take-home. Strongest public option — but run it locally.** |
| **SauceDemo** (`saucedemo.com`, Sauce Labs) | Purpose-built for automation practice; widely used; no real PII/credentials | Medium. Its killer feature is the **broken personas**: `locked_out_user` (rejected), `problem_user` (wrong images, broken sorting), `performance_glitch_user` (deliberately slow) — a *ready-made runtime-error taxonomy* matching §3.3 almost line for line | **Viable for this take-home** (hosted only; no self-host) |
| UI Testing Playground | Practice site | High: dynamic IDs, flaky elements, hidden layers, XHR delay | **Viable for this take-home** as a secondary/robustness target |
| ParaBank, OrangeHRM demo, Automation Exercise, DemoQA | Practice sites | Medium–high; ParaBank is banking-shaped, which reads well | **Viable for this take-home**, but shared demo instances have mutable state that other users change under you — bad for a *deterministic replay* demo |

**Hard constraint from §4/§9:** respect ToS and rate limits, never real credentials or real PII. Every site above is purpose-built for automation, so the ToS risk is low — but "low" is not "documented", and a hosted site can be down on the day the grader runs the demo.

### 13.2 Local hostile HTML app (built for this project) — **Viable for this take-home. Recommended as primary.**

A small server-rendered app (Express/Fastify + server-side templates, or Flask + Jinja) deliberately built with the §1 pathologies:

- a **frameset or nested iframes** (nav frame + content frame)
- **table-based layout**, no CSS grid, no test IDs, no `data-*` hooks
- **duplicate/empty accessible names** (`<a href="…"><img src="edit.gif"></a>` × 12)
- **server-rendered postbacks** with full page reloads, so element identity is genuinely rebuilt each step
- a **session timeout** that fires deterministically via a query param or a header
- an **interstitial** ("Your session will expire soon — Continue?") that appears on a schedule
- **business outcomes**: `member not found`, `insufficient permissions`, `validation error: invalid account type`
- a **confirmation step** before an irreversible action (the risky-action class from §3.4)
- optionally, **two branded variants** (`/tenant-a`, `/tenant-b`) with different labels, an extra field, and one reordered step — which makes the §8 canonicalisation stretch goal and the §3.7 multi-tenant story *demonstrable* rather than described

| Axis | Score |
|---|---|
| IF **5** · SPD 4 · DIRT **5** · HITL 5 · RPT **5** · MAINT 5 · PERM 5 | |

**Why this wins despite costing a few hours:** (i) it is the only option where *I control the failure modes*, which is what §3.3 and §6.3 actually require; (ii) zero ToS risk, zero network dependency, deterministic for the grader; (iii) the two-tenant variant turns the hardest-to-fake part of the brief (§3.7 multi-tenant reuse) into a running demo; (iv) it exercises exactly the perception problems the brief names, rather than the ones a modern demo site happens to have. The cost is real and must be budgeted honestly — but §5 explicitly prefers a complete thin thread over a polished subset, and a purpose-built target is what makes the thread completable.

**The trap to avoid:** building the target app so hostile that discovery fails, or so bespoke that the grader suspects the automation was tuned to it. Mitigation: keep it small, make it *legacy-shaped* rather than *adversarial*, ship its source in the repo, and — strong move — **also run the same discovery against one public site** (SauceDemo or a self-hosted `the-internet` page) and put both in `/evidence/`. Two surfaces, one engine, is the §3.7 claim proven cheaply.

### 13.3 Local Electron sample — **Viable for this take-home (optional second adapter)**

See §5. Cheapest credible "desktop app" claim. Wrap the same hostile HTML in an Electron shell and add one native `dialog.showMessageBox` confirmation, and `ElectronSurface` differs from `WebSurface` only at attach/lifecycle + dialog handling. That is a *demonstrated* seam.

### 13.4 Native toy desktop app — **Viable only as design story**

A Tk/Qt/WinForms toy driven by `xa11y`. Maximum §3.7 credit *if it works*, but: pre-1.0 dependency, macOS permission grants, no headless CI, and it competes for time with the artifact schema. Only if the human explicitly prioritises it at G1/G4.

### 13.5 Real bank systems — **Not viable / avoid**

§4: "We are not giving you access to a real bank system, and you should not try to obtain one."

### 13.6 Target verdict

**Local hostile HTML app (primary, with two tenant variants) + one public sandbox run for cross-surface evidence.** Electron shell as an optional third if time allows. This maximises DIRT, RPT, and HITL while eliminating ToS and availability risk.

---

## 14. Thinking protocol — recommended default stack (Stack A)

*("Stack A" is defined in full in §16; this section states the reasoning that produces it, so the conclusion in §17 can be checked against its premises rather than taken on trust.)*

**Claim.** For this brief, the stack that maximises the graded criteria is TypeScript/Node 24 + OpenAI native SDK (`gpt-5.6-terra`, custom tool harness) + Playwright 1.62 with ARIA-snapshot-first perception + a hand-written loop and replay state machine + Zod 4 artifacts on the filesystem + Commander CLI + `node --test` with `FakeSurface` fixtures + JSONL/trace/screenshot evidence, against a purpose-built hostile local web app with two tenant variants.

**Reasoning chain.**

1. §7 orders the criteria, and the top three (system design, core-loop correctness, robustness) are all about *what I build*, not *what I import*. §7 also explicitly penalises framework name-dropping and scaling infrastructure. ⇒ Minimise imported architecture; spend the budget on schema, seam, and taxonomy.
2. §3.3 forbids the LLM from the replay decision path. ⇒ The artifact must be an executable contract with durable locators. ⇒ Whatever the model emits must be *translated* into durable locators at record time, which means I need a semantic observation format, which means ARIA snapshots, which means Playwright.
3. §3.1 biases toward approaches that survive a dirty DOM. The a11y tree is a browser-computed projection that survives table layouts and absent test IDs because it is computed for screen readers regardless of developer cooperation. ⇒ ARIA-first is not a preference, it is the argument the brief asked me to make.
4. §3.6 requires transferring the *same live session* to a human. Playwright 1.59's `browser.bind()` exposes one launched browser to multiple clients under a named session with an explicit `unbind()`. ⇒ The control-transfer model can be real rather than mocked, which is precisely where §3.6's scope note draws the line.
5. §3.2 makes the schema a focal point, and the schema needs to be a TypeScript type, a runtime validator, a JSON Schema for the model, and a human-reviewable file simultaneously. Zod 4's native `z.toJSONSchema()` collapses those four into one definition. ⇒ Zod, and JSON on disk.
6. OpenAI strict structured outputs forbid optional fields, forbid root-level `anyOf`, and require `additionalProperties:false` everywhere. ⇒ Do not ask the model for the full artifact; ask for a flat proposal and synthesise provenance in code. This is *also* what §3.2 wants ("decoupled from the raw model transcript"), so the constraint and the design agree.
7. §6.3 wants an error-path replay in evidence. Public sandboxes do not fail on command. ⇒ I need a target whose failure modes I control, plus a deterministic fault injector. ⇒ Local hostile app + `--inject`.
8. §3.7 wants multi-tenant reuse to be credible. Two branded variants of my own target + a base/overlay/fingerprint artifact model turns the hardest-to-fake section into a runnable demo for a small marginal cost. ⇒ Build the variants.
9. Cost is not a real constraint (~$0.06–$1.55 per run; ~$15–50 total). ⇒ Do not let it distort model or architecture choices; do enforce a cap in config, because the *guardrail* is worth showing even when the *cost* is not a concern.

**Assumptions I am making (each falsifiable at a gate).**

- The grader runs on macOS or Linux with Node available, headless-capable, and no exotic policy against native browser binaries. *(G10 Q2)*
- A web surface is acceptable as the implemented surface, with desktop as a designed seam. §3.7 says "We don't expect you to implement multi-tenant or desktop support," so this is low-risk — but it is an assumption. *(G1/G5 Q1)*
- An API key will exist by evidence time; until then everything must run in `--dry-run`. *(G6)*
- "Thin but real everywhere" beats "deep in two places". §5 states this directly, so I am reading the brief literally rather than second-guessing it.

**What would change my mind.**

- If the human wants a *built* native-desktop adapter → Stack B (Python), and the whole stack moves with it. This is the only answer that flips the language.
- If the human already holds an Anthropic key and no OpenAI key → swap §2 only; nothing else changes. That modularity is itself an argument for the native-SDK choice over a framework.
- If a graded requirement I have misread demands cross-process durable pauses → reconsider a durable checkpointer, and honestly reconsider LangGraph despite its node-replay hazard.
- If building the hostile target app threatens the completeness of the §3 thread → fall back to self-hosted `the-internet` + SauceDemo and accept weaker control over failure modes. The thread completing matters more than the target's quality.

**Known weaknesses of this recommendation, stated so they are not discovered later.**

- The desktop half of §3.7 stays *designed* unless the Electron adapter ships. That is the largest single gap and the human should know it is a deliberate trade.
- ARIA-first has a real failure mode on legacy surfaces — duplicate and empty accessible names — which the locator chain must handle with scoping + ordinal, and which must be *stated* in REPORT §3 rather than glossed.
- `browser.bind()` is a 1.59 API; its multi-client semantics are newer than the rest of Playwright's surface and deserve a smoke test before the HITL design depends on it.
- A purpose-built target invites the "you tuned the automation to your own app" objection. Mitigation is the cross-surface public-site run, and it should be in `/evidence/` for exactly that reason.

---

## 15. Sources (all accessed 2026-08-16)

**LLM / computer use**
- OpenAI, Computer use guide (harness Options 1–3, safety/confirmation policy, GA migration table) — https://developers.openai.com/api/docs/guides/tools-computer-use
- OpenAI, `computer-use-preview` model page (deprecated preview path) — https://developers.openai.com/api/docs/models/computer-use-preview
- OpenAI, Structured model outputs (strict-mode schema subset, limits) — https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI, Pricing (GPT-5.6 Sol/Terra/Luna, cache read/write terms) — https://developers.openai.com/api/docs/pricing
- OpenAI, Advancing the price-performance frontier with GPT-5.6 (2026-07-30 price cut) — https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/
- OpenAI, Orchestration and handoffs (Agents SDK positioning) — https://developers.openai.com/api/docs/guides/agents/orchestration
- OpenAI Agents SDK (Python) — https://github.com/openai/openai-agents-python · (TypeScript) — https://openai.github.io/openai-agents-js/
- Anthropic, Computer use tool (`computer_20251124`, beta headers, supported models, `enable_zoom`, injection classifiers) — https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
- Anthropic, Models overview (Fable 5 / Opus 5 / Sonnet 5 / Haiku 4.5 IDs, context, pricing) — https://platform.claude.com/docs/en/about-claude/models/overview
- AWS Bedrock, Anthropic Claude tool use (beta-header ↔ tool-type pairings) — https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-tool-use.html
- Azure AI Foundry, Computer use — https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/computer-use
- Azure AI Foundry, Structured outputs (nesting/property limits) — https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs
- Claude Agent SDK overview + agent loop — https://code.claude.com/docs/en/agent-sdk/overview · https://code.claude.com/docs/en/agent-sdk/agent-loop.md
- BenchLM, OpenAI API pricing (Aug 2026) — https://benchlm.ai/openai/api-pricing · Claude API pricing (Aug 2026) — https://benchlm.ai/anthropic/api-pricing
- Finout, Anthropic API pricing 2026 — https://www.finout.io/blog/anthropic-api-pricing
- Digital Applied, Structured output in production (cross-vendor strict-mode keyword matrix) — https://www.digitalapplied.com/blog/llm-structured-output-json-reliability-production

**Web automation**
- Playwright, Snapshot testing / ARIA snapshots — https://playwright.dev/docs/aria-snapshots
- Playwright, `Locator` API (`ariaSnapshot`, `ariaSnapshotJSON` v1.63, AI mode refs, `boxes`) — https://playwright.dev/docs/next/api/class-locator
- Playwright, `BrowserType` (`connectOverCDP`, `launchServer`, `connect`) — https://playwright.dev/docs/api/class-browsertype
- Playwright, `Page` (`pause`, `screencast`) — https://playwright.dev/docs/next/api/class-page
- Playwright, `Electron` / `ElectronApplication` (experimental support, dialog interception caveat) — https://playwright.dev/docs/api/class-electron · https://playwright.dev/docs/api/class-electronapplication
- Electron, Automated testing with Playwright — https://electronjs.org/docs/latest/tutorial/automated-testing
- Playwright release notes (1.57 `retain-on-failure-and-retries`, 1.59 screencast + `browser.bind` + trace CLI, 1.60 HAR tracing + `boxes` + removals, 1.62 bundled MCP/CLI) — https://github.com/microsoft/playwright/blob/main/docs/src/release-notes-js.md · https://github.com/microsoft/playwright/releases/tag/v1.59.0 · https://github.com/microsoft/playwright/releases/tag/v1.60.0 · https://github.com/microsoft/playwright/releases/tag/v1.62.0
- Playwright PR #40389, aria-snapshot bounding boxes — https://github.com/microsoft/playwright/pull/40389
- Playwright Python 1.62 (PyPI) — https://pypi.org/project/playwright/1.62.0/ · release notes — https://playwright.dev/python/docs/release-notes
- Playwright MCP (tool list, ref lifetime, snapshot modes) — https://playwright.dev/mcp/introduction · https://playwright.dev/mcp/snapshots · https://github.com/microsoft/playwright-mcp
- Chrome for Developers, WebDriver BiDi — https://developer.chrome.com/blog/webdriver-bidi
- Apify, Playwright vs Puppeteer vs Selenium 2026 — https://use-apify.com/blog/playwright-vs-puppeteer-vs-selenium-2026
- QASkills, Playwright ARIA snapshots guide — https://qaskills.sh/blog/playwright-aria-snapshots-accessibility-tree-guide
- TestDino, Playwright 1.59 and 1.60 release guides; Trace Viewer guide — https://testdino.com/blog/playwright-release-guide · https://testdino.com/blog/playwright-1-60-release · https://testdino.com/blog/playwright-trace-viewer

**Agent frameworks over the browser**
- DevToolLab, AI browser automation tools 2026 (licences + versions: Stagehand MIT v4.0.0 2026-08-10; browser-use MIT v0.13.7; Skyvern AGPL-3.0 v1.0.48; Playwright MCP Apache-2.0) — https://devtoollab.com/blog/best-ai-browser-automation-tools
- AgentsCamp, Browser agents compared 2026 — https://agentscamp.com/guides/comparisons/browser-agents-compared-2026
- BrowserBash, Stagehand vs browser-use vs Skyvern — https://browserbash.com/blog/stagehand-vs-browser-use-vs-skyvern

**Desktop / OS automation**
- xa11y — https://xa11y.dev/ · comparison table with licences — https://xa11y.dev/compare/ · repo — https://github.com/xa11y/xa11y · npm `@crowecawcaw/xa11y` v0.13.0 — https://www.npmjs.com/package/@crowecawcaw/xa11y · PyPI `xa11y` v0.13.0 — https://pypi.org/project/xa11y/
- pywinauto — https://github.com/pywinauto/pywinauto · getting started (backends, Chrome a11y flag) — https://pywinauto.readthedocs.io/en/latest/getting_started.html
- nut.js pricing (paid prebuilt packages) — https://nutjs.dev/pricing · https://nutjs.dev/
- runany.dev, xa11y overview (permissions detail) — https://runany.dev/blog/xa11y-desktop-automation/

**Orchestration**
- LangGraph, Interrupts (checkpointer + `thread_id`, node re-execution on resume) — https://docs.langchain.com/oss/python/langgraph/interrupts
- LangGraph durable execution — https://nightcat.cloudns.asia:9981/sitedoc/langgraph/v0.4.3/concepts/durable_execution/
- AgentNotebook, LangGraph HITL 2026 — https://www.agentnotebook.dev/tutorials/langgraph-human-in-the-loop
- dreaming.press, Temporal vs Inngest vs Restate for durable agents (+ DBOS note) — https://dreaming.press/posts/temporal-vs-inngest-vs-restate-durable-agents.html
- Particula, Durable execution for agents — https://particula.tech/blog/durable-execution-ai-agents-temporal-inngest-restate
- Inngest vs Temporal — https://www.inngest.com/compare-to-temporal

**Schema / runtime / tooling**
- Zod 4 JSON Schema docs (`z.toJSONSchema`, targets, options) — https://github.com/colinhacks/zod/blob/v4.4.3/packages/docs/content/json-schema.mdx
- Multigrid, Pydantic/Zod typed LLM outputs (strict-mode `$defs`, defaults, discriminated unions) — https://multigrid.ai/learn/typed-llm-outputs
- AI/TLDR, Schema validation for LLM output — https://ai-tldr.dev/learn/production-llmops/guardrails-reliability/llm-output-schema-validation/
- Vercel AI SDK, structured data with `Output.object` — https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data · v5→v6 migration (`generateObject` deprecation, `strictJsonSchema` default) — https://ai-sdk.dev/v5/docs/migration-guides/migration-guide-6-0
- Node.js v24 test runner (Stability 2) — https://nodejs.org/docs/latest-v24.x/api/test.html
- Node.js v24 `node:sqlite` (Stability 1.2, release candidate) — https://nodejs.org/dist/latest-v24.x/docs/api/sqlite.html
- Techglock, Node.js mid-2026 (native TS, `--env-file`, built-in runner) — https://techglock.com/blog/nodejs-mid-2026-trends-native-typescript-test-runner
- MCP TypeScript SDK v2 (`@modelcontextprotocol/server` 2.0.0, 2026-07-28 spec) — https://registry.npmjs.org/@modelcontextprotocol/server · https://ts.sdk.modelcontextprotocol.io/v2/ · https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server.html
- PkgPulse, Commander vs yargs 2026 — https://www.pkgpulse.com/guides/commander-vs-yargs-2026
- Nazar Boyko, Building and shipping Node.js CLI tools (oclif cold-start numbers) — https://www.nazarboyko.com/articles/building-cli-tools-with-nodejs
- flare-redact (MIT, zero-dep, pino adapter, reversible vault) — https://github.com/flare-collection/flare-redact · https://flare-collection.github.io/flare-redact/
- `@claudiu-ceia/pii-mask` — https://github.com/ClaudiuCeia/pii-mask
- Pino secret redaction (key paths, case sensitivity) — https://dev.to/francoislp/nodejs-best-practices-redacting-secrets-from-your-pino-logs-1eik

**Target applications**
- `saucelabs/the-internet` (Apache-2.0, self-host via `rackup`) — https://github.com/saucelabs/the-internet
- `gprestes/the-internet-docker` (`docker run -d -p 7080:5000 gprestes/the-internet:v2.6.5`) — https://github.com/gprestes/the-internet-docker · https://hub.docker.com/r/gprestes/the-internet/tags
- Test-Lab, Practice sites for test automation 2026 (SauceDemo personas: `locked_out_user`, `problem_user`, `performance_glitch_user`) — https://www.test-lab.ai/blog/practice-sites-for-test-automation
- BugBug, Best Selenium practice websites (ParaBank, UI Testing Playground) — https://bugbug.io/blog/testing-frameworks/best-selenium-practice-websites/

## 16. (a) Top 3 complete stacks

### Stack A — "Typed web-first, hand-rolled engine" — the default

| Layer | Choice |
|---|---|
| Language/runtime | **TypeScript on Node 24** (native TS strip-types, `--env-file`) |
| LLM SDK + model | **`openai` native SDK, Responses API**; `gpt-5.6-terra` for the evidence run, `gpt-5.6-luna` while iterating; **Option-2 custom tool harness** (my tools, not the built-in `computer` tool); strict structured outputs for the artifact-proposal step |
| Web automation | **Playwright 1.62** — `ariaSnapshot({mode:'ai', boxes:true})` + `ariaSnapshotJSON()` as the observation; `getByRole`/`frameLocator` + scoping + ordinal as the replay locator chain; `click_point` as the pixel escape hatch |
| OS/Electron path | **Designed, not built**: `SurfaceAdapter` interface with `WebSurface` implemented; `ElectronSurface` built *only if* time allows (Playwright `_electron`); `DesktopSurface` (xa11y/pywinauto/UIA) documented in REPORT §4 |
| Orchestration | **Custom loop + explicit replay state machine, single process**, append-only `RunJournal` (JSONL) |
| Schema | **Zod 4** → `z.toJSONSchema()`; JSON canonical on disk; `schemaVersion` + `capabilityVersion` + `contractHash` + base/overlay + surface `fingerprint` |
| Persistence | **Filesystem** — `capabilities/` + `/evidence/`; `CapabilityStore` interface for the SQLite/Postgres design story |
| CLI | **Commander.js**, `npm run` scripts, `discover` / `replay` / `inspect` / `operator`, `--dry-run`, `--inject <fault>` |
| Test | **`node --test`** — schema/contract tests, `FakeSurface` replay-fixture tests one per taxonomy branch, policy/redaction tests, one live smoke |
| Evidence | JSONL journal with `rationale` + `actor`, per-step ARIA digests, full snapshot+screenshot+expected/observed diff on failure, Playwright trace zip, optional annotated `page.screencast`; `/evidence/README.md` index |
| Target | **Local hostile HTML app (two tenant variants)** + one self-hosted `the-internet` or SauceDemo run |
| HITL | `browser.bind()` (1.59) to expose the *same* live browser to a second client + a CLI/JSON mock operator console; `page.pause()` as the crude fallback; human actions captured into the journal with `actor: 'human'` |

**Profile:** IF 5 · SPD 5 · DIRT 5 · HITL 5 · RPT 5 · MAINT 4 · PERM 5.
**Weakness:** weakest path to a *real* native-desktop adapter; the §3.7 desktop claim stays designed unless the Electron adapter ships.

### Stack B — "Python, desktop-credible" — pick if a real second surface matters

| Layer | Choice |
|---|---|
| Language/runtime | **Python 3.12+ with `uv`** |
| LLM SDK + model | **`anthropic` native SDK**; `claude-sonnet-5` for the evidence run (note the 2026-09-01 price change), `claude-haiku-4-5` while iterating; custom tool harness; cite the screenshot prompt-injection classifier in REPORT §6 |
| Web automation | **Playwright-Python 1.62 (sync API)** — same ARIA-snapshot strategy |
| OS/Electron path | **Actually built (small)**: `DesktopSurface` on **`xa11y` (MIT, v0.13.0)** driving a tiny Tk/Qt toy app, *or* `ElectronSurface` via `_electron`; permission caveats documented; adapter skipped gracefully if the platform is unavailable |
| Orchestration | Custom loop + replay state machine, single process, JSONL journal |
| Schema | **Pydantic v2** → `model_json_schema()`; same three-version + overlay + fingerprint model |
| Persistence | Filesystem |
| CLI | **Typer** + `uv run` |
| Test | **pytest** — same four classes; `FakeSurface` fixtures |
| Evidence | Same as Stack A minus the screencast polish |
| Target | Local hostile HTML app + a native/Electron toy for the second adapter |
| HITL | `page.pause()` + headed browser for web; for desktop, "the human uses the app" with a journal-recorded pause/resume handshake and a re-observation diff to capture what changed |

**Profile:** IF 4 · SPD 3 · DIRT 5 · HITL 3 · RPT **5** (best heterogeneity story, because it is *shown*) · MAINT 3 · PERM 2.
**Weakness:** slower to the complete slice; permission friction on the grader's machine; a pre-1.0 dependency; HITL on desktop is materially weaker than `browser.bind()`.

### Stack C — "Lean provider-agnostic, MCP-flavoured" — pick if provider comparison and agent-invocability matter

| Layer | Choice |
|---|---|
| Language/runtime | TypeScript on Node 24 |
| LLM SDK + model | **Vercel AI SDK v6** (`generateText` + `Output.object({schema})`, `strictJsonSchema` default on) over `@ai-sdk/openai` **and** `@ai-sdk/anthropic`, so the same loop runs on both and REPORT can report a flake-rate comparison |
| Web automation | Playwright 1.62, same ARIA strategy; observation format deliberately shaped like Playwright MCP's snapshot |
| OS/Electron path | Designed only |
| Orchestration | Custom loop + replay state machine |
| Schema | Zod 4 (AI SDK is Zod-native) |
| Persistence | Filesystem |
| CLI | Commander.js **plus** an **MCP server** (`@modelcontextprotocol/server` v2.0.0, 2026-07-28 spec, `registerTool` with a Zod `inputSchema`, `serveStdio`) exposing each saved capability as a typed callable tool — this is §8's "agent-facing capability interface" stretch goal, and it is a near-free win because the artifact's typed input/output contract *is* the tool schema |
| Test | `node --test` + a cross-provider replay-fixture suite |
| Evidence | Same as Stack A, plus a transcript of an MCP client invoking a capability by name |
| Target | Local hostile HTML app + public sandbox |
| HITL | `browser.bind()` + mock operator console |

**Profile:** IF 4 · SPD 4 · DIRT 5 · HITL 5 · RPT 4 · MAINT 3 · PERM 5.
**Weakness:** two extra dependencies (AI SDK abstraction + MCP SDK) to defend; §8 says "at most one or two" stretch goals *and only with a solid core*, so the MCP server must not be started until discovery/replay/HITL are all green. Genuine upside: the MCP capability catalog is the most on-thesis stretch goal in §8 — "the artifact *is* a callable capability" stops being a claim and becomes a demo.

---

## 17. (b) Recommended default for THIS take-home

**Stack A**, with two explicitly-scoped additions if and only if the core thread is green first:

1. **`ElectronSurface` via Playwright `_electron`** (a few hours) — converts the §3.7 surface-abstraction claim from designed to demonstrated at the lowest cost of any option here.
2. **The MCP capability server from Stack C** (a few hours) — the single most on-thesis stretch goal, because §2's through-line is literally "the artifact becomes a reusable capability the AI agent invokes".

**Why Stack A over B and C, in the order §7 grades:**

- **System design (weighted first).** Stack A puts the maximum share of effort into the artifact schema, the surface adapter seam, and the error taxonomy — the three things named as central — and the minimum into framework glue. Every dependency in Stack A is either doing perception (Playwright), typing (Zod), or talking to the model (openai). Nothing is doing "architecture", because the architecture is the deliverable.
- **Correctness of the core loop.** Fewest moving parts between goal and evidence; a `--dry-run` transcript replay means the loop is testable without a key.
- **Robustness.** The ARIA-snapshot-first perception with a documented locator fallback chain and a pixel escape hatch is the most defensible answer to "would still work when the surface has no clean DOM", and the `FakeSurface` fixture suite proves the taxonomy branch by branch.
- **HITL.** `browser.bind()` is the strongest control-transfer primitive available in any stack here: multiple clients on one live browser, named session, explicit `unbind()` to stop accepting connections. That is a *real* control-transfer model, not a mock — which is exactly what §3.6's scope note asks for ("mock the operator UI if needed, but make the handoff mechanism and the control-transfer model real").
- **Generalization.** The base/overlay/fingerprint versioning model plus two tenant variants of the local target makes §3.7 concrete on the multi-tenant axis; the Electron adapter (if built) makes it concrete on the surface axis. Between them, REPORT heading 4 stops being aspirational.
- **Safety.** One `assertAllowed` chokepoint, one `redact` write-path chokepoint, exact-origin matching, parameter placeholdering vs secret masking vs output classification, screenshot box redaction, and an honest statement of the prompt-injection limit sourced from both vendors' own docs.
- **Code quality / communication.** TypeScript discriminated unions make the result contract self-documenting; `node --test` + Commander + filesystem storage means the README setup section is four lines.

**The strongest argument for B instead** is if the human weights §3.7's *desktop* half heavily enough to want it built rather than designed. That is a legitimate call and it is gate G1/G4/G5, not mine to make. **The strongest argument for C** is if the human wants the capability-catalog stretch goal as a first-class feature rather than a bonus — but note C's MCP server can be bolted onto A later, whereas A's language choice cannot be bolted onto B.

**What I would explicitly *not* do in any stack:** adopt LangGraph/Temporal/Inngest, host the browser, use Selenium, ship an AGPL dependency, use `computer-use-preview`, make YAML the canonical artifact format, or let the model author the artifact's provenance fields.

---

## 18. (c) Explicit rejects / do-not-use

| Rejected | Reason |
|---|---|
| **`computer-use-preview` model + `computer_use_preview` tool** | Deprecated. GA shape is `tools:[{type:"computer"}]` with a general model and batched `actions[]`. Using the old shape reads as stale research. |
| **Coordinate-only targeting as the primary artifact locator** | Produces unreviewable, unparameterizable artifacts. Directly contradicts §3.2's "how each target element/control is identified (with your reasoning about robustness)". Keep it as a fallback *action*, never as the default target. |
| **Playwright MCP refs (`ref=e14`) persisted into artifacts** | Refs are valid only until the next page change. Persisting one produces an artifact that cannot replay. |
| **Selenium 4** | No auto-wait, no ARIA snapshot, no trace viewer, no session-sharing primitive. Greenfield-in-2026 choice I could not defend. |
| **nut.js** | Prebuilt packages require a paid subscription ($20–75/month); the free path is building native addons from source. Unacceptable in a public repo's setup instructions. |
| **Skyvern** | **AGPL-3.0.** Do not introduce a copyleft licence conversation into a submitted work sample. (Also `dogtail` GPL-2.0, `atomacos` GPL-3.0 — same caution.) |
| **LangGraph as the runtime** | Resume re-runs the interrupted node from its first line, so pre-`interrupt()` side effects repeat — a hazard when side effects are clicks in a banking UI. Solves process durability I do not have (the browser dies with the process). §7 penalises framework name-dropping. Name it in REPORT §5 as the swap-in for durable approvals. |
| **Temporal / Inngest / Restate / DBOS as built infrastructure** | §7: "we do not reward … building scaling infrastructure". Name DBOS and Restate in REPORT §5 as the small-footprint options considered. |
| **Queues, workers, microservices, Docker Compose topologies** | Same. Single process, single CLI. |
| **Postgres / Redis / any server-backed store** | Adds a service to setup for zero credit. Filesystem is the deliverable. |
| **Browserbase / Steel / hosted browser infra** | A key, a bill, and a dependency for zero credit. |
| **Local/self-hosted LLM for the evidence run** | Worse grounding, worse reproducibility, longer README; and `gpt-5.6-luna` at ~$0.06/run removes the cost motivation. |
| **Claude Agent SDK as the product's LLM layer** | It is a coding-agent runtime bundling a Claude Code binary with 20+ file/bash tools. Wrong tool surface, strange dependency to defend. Fine for *building* the project. |
| **Protobuf / Avro / binary artifact formats** | §3.2 requires human-reviewable artifacts. |
| **YAML as the canonical artifact format** | Implicit typing hazards in a file full of identifiers. JSON canonical, YAML render optional. |
| **oclif** | ~30 deps and ~135ms cold start for a 4-command CLI. |
| **`just` / exotic task runners as the documented entry point** | Every install between the grader and a green run is a real cost. `npm run`. |
| **Coverage thresholds / testing Playwright wrappers / trace-diff golden tests** | Effort with no grading return; the last is actively brittle. |
| **OpenTelemetry, hosted tracing as the primary evidence** | §6.3 requires evidence in `/evidence/` in the repo. |
| **Real bank systems or real credentials/PII** | §4 and §9 forbid it explicitly. |
| **A polyglot repo (TS + Python)** | Reads as indecision. Pick one at G5. |

---

## 19. (d) Questions for the human gate — G3 / G5 / G6 / G7 / G10

Each is phrased so a one-word answer unblocks work, with the recorded default if no answer arrives.

### G5 — Language & runtime *(answer first; G3 depends on it)*

1. **Is a *built* (not designed) non-web surface a goal for this submission?** If **no** → TypeScript (Stack A). If **yes**, which kind: (a) Electron shell — TypeScript still wins; (b) native desktop via a11y — Python (Stack B). *Default if unanswered: TypeScript, Electron adapter as optional stretch.*
2. **Any grader-machine constraint I should assume?** (Node version floor, Windows-only reviewer, no-native-modules policy.) *Default: assume Node 24 available, macOS/Linux, allow prebuilt native binaries.*
3. **Do you want the desktop-a11y story shown with a pre-1.0 dependency (`xa11y` v0.13.0, 46 stars) or kept as prose?** *Default: prose; the pre-1.0 pin is a risk I would not take unsupervised.*

### G6 — LLM provider / model + spend ceiling

4. **Provider:** OpenAI (`gpt-5.6-terra`) or Anthropic (`claude-sonnet-5`)? Cost per discovery run is ~$0.60 either way; capability is comparable; **do you have an existing key on one of them?** That is the real tiebreaker. *Default: OpenAI `gpt-5.6-terra`, `gpt-5.6-luna` while iterating.*
5. **Harness shape confirmation:** I plan **Option 2 (my own tools over Playwright)** rather than the built-in `computer` tool, because coordinate actions make artifacts unreviewable (§3.2). Do you want the built-in `computer` tool demonstrated *as well*, as a comparison run? *Default: no — one `click_point` action gives the escape hatch without a second harness.*
6. **Hard spend ceiling for the whole project?** I would set `max_usd` per run in config and stop the loop when exceeded. *Default: $2.00/run, ~$50 total, both enforced in code.*
7. **Is `claude-sonnet-5`'s pricing change on 2026-09-01 ($2/$10 → $3/$15) worth avoiding in a quoted README cost figure?** *Default: quote the model ID, date, measured token counts, and computed cost, so the figure stays auditable regardless.*

### G7 — Orchestration style

8. **Confirm: custom loop + explicit replay state machine, single process, no orchestration framework.** Any objection to this being called out as a deliberate rejection of LangGraph/Temporal in REPORT §1? *Default: yes, custom; reject explicitly and briefly.*
9. **How durable must a paused HITL intervention be?** (a) survives within the process only — a run journal suffices; (b) survives a process restart — needs a checkpointer *and* a re-attachable browser session, which is a materially bigger build. *Default: (a), with (b) designed in REPORT §5.*
10. **Should stuck-detection be heuristic (no progress / repeated observation / step cap / low model confidence) or should the model be given an explicit `escalate_to_human` tool?** *Default: both — the tool gives the model a clean exit, the heuristics catch the cases where it does not know it is stuck; both paths converge on one intervention record.*

### G3 — Full tech stack lock

11. **Stack A, B, or C?** *Default: A.*
12. **Target application:** local hostile HTML app (my recommendation, ~a few hours to build, two tenant variants), a public sandbox only (faster, weaker error-path control), or both? *Default: both — local primary, one public run for cross-surface evidence.*
13. **If time runs short, what gets cut first?** My proposed order: (1) MCP capability server, (2) Electron adapter, (3) annotated screencast, (4) second tenant variant, (5) public-site cross-surface run. **Nothing in §3.1–3.6 gets cut** — §5 says thin-but-real everywhere beats a polished subset. *Default: that order.*
14. **HITL depth (this overlaps G9):** CLI pause + headed browser + JSON intervention file, or a minimal local operator web page? *Default: CLI + JSON intervention record + `browser.bind()` for genuine live-session takeover; the operator UI is the documented mock.*

### G10 — Package / tooling preferences

15. **Package manager:** npm (zero setup for the grader), pnpm, or bun? *Default: npm — lowest friction for a stranger cloning the repo.*
16. **Single package or workspace?** *Default: single package, `src/` with clear module boundaries (`surface/`, `discovery/`, `replay/`, `artifact/`, `policy/`, `evidence/`, `cli/`). A monorepo for one deliverable is ceremony.*
17. **Lint/format:** Biome (one fast tool, one config) or ESLint+Prettier (familiar, heavier)? *Default: Biome; fall back to ESLint+Prettier if you prefer familiarity for the reviewer.*
18. **Test runner:** `node --test` (zero deps) or Vitest (familiar, better watch UX)? *Default: `node --test`.*
19. **Node's native TypeScript type-stripping (no build step) or `tsc`/`tsup` with a build?** Type-stripping is stable in Node 24 but has edge cases (enums, decorators, `namespace`). *Default: type-stripping for dev + `tsc --noEmit` in CI for type checking; no bundler.*
20. **CI:** a GitHub Actions workflow running typecheck + `node --test` + the local-target smoke run? It costs ~20 lines and a green badge is a real code-quality signal. *Default: yes, and it must pass without any API key.*
