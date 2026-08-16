# Adversarial review pass 1 — `tech_stack.md`

**Reviewer:** GPT-5.6 Sol xhigh (GPT family)
**Author reviewed:** Claude Opus 5 thinking-high (Claude family)
**Access date for web sources:** 2026-08-16
**Scope:** `/workspace/Project.md`, full `tech_stack.md`, and cross-checks against `frontier_computer_use.md`, `os_desktop_electron.md`, `alternatives_matrix.md`, and `non_viable.md`.

This is a stack review, not a vote. Repeated agreement by research agents is not evidence.

## Verdict on Stack A default: **MODIFY**

Keep the web-first TypeScript core, Playwright, a custom discovery loop, a separate deterministic replay interpreter, Zod, filesystem artifacts/evidence, and a local synthetic target.

Do **not** lock Stack A as written. It combines Playwright 1.62 with an API documented only for 1.63, overstates `browser.bind()` as a complete HITL mechanism, treats a DOM-derived accessibility projection as if it were independent of DOM quality, recommends an unvalidated nano-tier model for discovery iteration, and keeps too many shiny stretches alive. It would invite an implementation that either does not compile or looks sophisticated while missing the control lease and durable locator compilation the grader actually cares about.

The modified default is:

- TypeScript on Node 24 LTS, but use normal TypeScript tooling rather than making native type stripping a design constraint.
- `npm` for the one-package submission unless the human explicitly standardizes on pinned `pnpm`; package-manager choice is orthogonal to test-runner choice.
- Vitest for schema, compiler, policy, redaction, and `FakeSurface` tests; Playwright Test for browser smoke/e2e. `node:test` remains acceptable, not superior by default.
- Exact `playwright` and `@playwright/test` pin at **1.62.1**, not 1.62.0; use `ariaSnapshot({ mode: "ai", boxes: true })`, not `ariaSnapshotJSON()`.
- Hybrid discovery observation: compact ARIA snapshot first, targeted DOM/locator metadata when needed, screenshot only on ambiguity/failure. Replay uses durable, documented Playwright locators and state predicates.
- A model string supplied through configuration. Use `gpt-5.6-terra` only after the holder's API account passes a live image + custom-tool smoke test. Do not assume Luna is competent enough merely because it is cheap.
- Real HITL = run-owned control lease + all actuators gated + same `BrowserContext`/`Page` retained + operator actions logged + re-observation on resume. `browser.bind()` may be the attachment transport after a smoke test; it is not the control model.
- One local hostile-ish MemberDesk target with deterministic faults. No public-site run, Electron adapter, xa11y adapter, provider bake-off, or MCP server until all required evidence is green. Prefer no stretch at all.

## Claim-by-claim verification

### 1. `browser.bind()`

| Claim | Status | Adversarial finding |
|---|---|---|
| Playwright has `browser.bind()` and `browser.unbind()`, added in 1.59. | **CONFIRMED** | Official API docs say it binds a launched browser to a named pipe or WebSocket so other clients can connect. Release notes explicitly support multiple clients. <https://playwright.dev/docs/api/class-browser> · <https://playwright.dev/docs/release-notes> |
| It can return an endpoint and accept `workspaceDir`, or `host`/`port` for WebSocket binding. | **CONFIRMED** | This is the documented API shape. <https://playwright.dev/docs/api/class-browser> |
| "`browser.bind()` is the HITL control-transfer mechanism." | **FALSE** | It is an attachment/RPC primitive. It does not designate an owner, stop the automation client, capture native human clicks, redact operator activity, or force a fresh observation before resume. The official boast that multiple clients are supported proves concurrent control is possible; it does not prove exclusive transfer. A lease checked by every actuator is still required. <https://playwright.dev/docs/release-notes> |
| `unbind()` cleanly hands control back. | **FALSE** | `unbind()` stops accepting new connections. It is not an ownership transition and does not disconnect or audit already attached clients according to the cited contract. Treating it as "hand back" is invented semantics. <https://playwright.dev/docs/api/class-browser> |

`browser.bind()` is useful after a two-client smoke test. Bind only to local transport/loopback. Exposing a live session over a reachable WebSocket without authentication would be an unacceptable banking-session design.

### 2. OpenAI discovery model IDs

| Claim | Status | Adversarial finding |
|---|---|---|
| `gpt-5.6-terra` and `gpt-5.6-luna` are real public API model IDs. | **CONFIRMED** | Both have first-party model pages, image input, Responses API, function calling, structured outputs, and computer-use support. Terra is $2/$12 and Luna $0.20/$1.20 per million input/output tokens on the access date. <https://developers.openai.com/api/docs/models/gpt-5.6-terra> · <https://developers.openai.com/api/docs/models/gpt-5.6-luna> |
| OpenAI supports a custom Playwright/tool harness as "Option 2." | **CONFIRMED** | The official computer-use guide explicitly lists a custom tool/harness over Playwright, Selenium, VNC, or MCP. <https://developers.openai.com/api/docs/guides/tools-computer-use> |
| Luna is a sound development model for this multi-step discovery task. | **UNVERIFIED** | The model page calls Luna the nano-equivalent, cost-sensitive tier. No cited task-specific evaluation shows it reliably follows this ref/locator protocol, handles hostile frames, or emits compilable actions. Price is not capability evidence. <https://developers.openai.com/api/docs/models/gpt-5.6-luna> |
| Terra, Sonnet, and flagship capability are "comparable" for this task. | **UNVERIFIED** | No controlled run set, success definition, or target-specific results support that statement. Provider marketing and token prices do not establish computer-use reliability. |
| A mutable model alias makes the evidence reproducible. | **UNVERIFIED** | The model pages expose aliases, but the retrieved pages do not provide a useful dated snapshot to pin. Record provider, requested model, model reported in the response, date, prompt/tool-schema digest, tokens, and outcome. Keep the model out of the capability contract and in run provenance. |

Safer take-home rule: `DISCOVERY_MODEL` is configuration. Default to Terra only after the actual key/account passes a small live smoke test. Use the **same validated model** while debugging behavior and for final evidence; Luna may exercise plumbing, but model substitution can hide prompt/tool defects.

### 3. Playwright versions and ARIA APIs

| Claim | Status | Adversarial finding |
|---|---|---|
| Playwright 1.62.0 was released 2026-07-24. | **CONFIRMED** | <https://github.com/microsoft/playwright/releases/tag/v1.62.0> |
| 1.62.0 was the current conservative pin on 2026-08-16. | **FALSE** | 1.62.1 shipped on 2026-07-30 and fixed multiple 1.62 regressions, including accessibility-snapshot omissions. Pin 1.62.1 exactly. <https://github.com/microsoft/playwright/releases/tag/v1.62.1> |
| `boxes: true` exists and was added in 1.60. | **CONFIRMED** | Stable Locator/Page docs describe CSS-pixel viewport boxes on ARIA snapshots. <https://playwright.dev/docs/api/class-locator> · <https://playwright.dev/docs/api/class-page> |
| `ariaSnapshotJSON()` exists in Playwright 1.62. | **FALSE** | Stable 1.62 docs do not expose it. The **next** docs label it "Added in: v1.63"; 1.63 was not a released version in the release list on the access date. Stack A's `Playwright 1.62 + ariaSnapshotJSON()` combination is internally impossible. <https://playwright.dev/docs/next/api/class-locator> · <https://github.com/microsoft/playwright/releases> |
| `ariaSnapshotJSON()` will be safe to depend on as 1.63. | **UNVERIFIED** | A next-doc entry is not a released package. Re-evaluate only after a stable release and smoke test. |
| Playwright 1.62 bundles MCP and `playwright-cli`. | **CONFIRMED** | The 1.62.0 release says `npx playwright mcp` and `npx playwright cli` are bundled. This does not require using either in the product. <https://github.com/microsoft/playwright/releases/tag/v1.62.0> |
| AI snapshot refs are stable locators. | **FALSE** if meant beyond one observation | Official MCP docs say refs are unique only within one snapshot and valid only until the next page change. They must never enter a capability artifact. <https://playwright.dev/mcp/snapshots> |
| A custom library client has a clearly documented public `click(ref)` API. | **UNVERIFIED** | Official CLI/MCP docs show clicking refs, but the stable library API describes producing refs without documenting a supported ref-to-action method. Repository tests use `page.locator("aria-ref=e2")`, but relying on an undocumented selector engine needs a pinned smoke test and isolation behind the observer adapter. <https://playwright.dev/agent-cli/snapshots> · <https://github.com/microsoft/playwright/blob/d3d436d3/tests/page/page-aria-snapshot-ai.spec.ts> |

Conservative implementation: pin 1.62.1; send the YAML AI snapshot to the discovery model; make model actions carry both an observation-local ref and a semantic intent/target descriptor; execute refs only through a tested adapter; compile immediately to durable role/label/text/frame/structural recipes. If compilation cannot produce a unique stable target, the capability remains draft or escalates—it does not preserve the point/ref.

### 4. Accessibility-first robustness

| Claim | Status | Adversarial finding |
|---|---|---|
| An accessibility snapshot is a "non-DOM perception mode." | **FALSE** in the claimed heterogeneity sense | The browser accessibility tree is derived from the DOM tree. It is a lower-noise semantic projection, not an independent perception channel for a broken web UI. <https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree> |
| The browser produces useful roles/names "whether or not the developer cooperated." | **FALSE** | Native semantic HTML helps automatically; custom controls need correct semantics/ARIA. Empty image links, owner-drawn widgets, canvas, and semantically abused tables can yield missing or misleading nodes. <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA> |
| ARIA-first deserves DIRT=5 and makes Playwright the necessary conclusion. | **UNVERIFIED** | That score is assertion, not measurement. Probe the chosen target: percentage of actionable controls represented, uniquely nameable, frame-addressable, and capable of exposing output/checkpoint state. |
| `toMatchAriaSnapshot()` is automatically the right runtime checkpoint. | **UNVERIFIED** | It is a useful test assertion, but whole-tree snapshots can be too broad across tenants and runtime data. Runtime capabilities should encode narrow state predicates—URL pattern, visible dialog signature, scoped role/name/state, parsed output—not a golden page dump by default. <https://playwright.dev/docs/aria-snapshots> |
| A typed coordinate target is an adequate replay fallback. | **FALSE** as a general recommendation | Giving `(x,y)` a tagged union does not make it stable. Coordinates may be discovery evidence or a tightly bounded last-resort action followed by a checkpoint; if no stable replay target can be compiled, do not approve the artifact. |

The right default is **hybrid**, not "ARIA is the answer": ARIA summary for token-efficient discovery; documented semantic locators plus narrowly justified structural/CSS fallbacks for replay; screenshot for visual context; coordinates never the only approved replay identity.

### 5. xa11y

| Claim | Status | Adversarial finding |
|---|---|---|
| xa11y is real, MIT, cross-platform, and has Node/Python bindings. | **CONFIRMED** | <https://github.com/xa11y/xa11y> · <https://www.npmjs.com/package/@crowecawcaw/xa11y> · <https://pypi.org/project/xa11y/0.13.0/> |
| v0.13.0 and prebuilt binaries existed on the access date. | **CONFIRMED** | npm reports v0.13.0, about 50 weekly downloads, zero dependents, and prebuilt Linux/macOS/Windows binaries. <https://www.npmjs.com/package/@crowecawcaw/xa11y> |
| xa11y is viable as a take-home dependency/second adapter. | **UNVERIFIED** and strategically rejected | It was months old, pre-1.0, nearly unadopted, native, permission-sensitive, and would need three-platform behavior tests to justify "cross-platform." A tiny toy-app success proves the toy and driver, not the banking abstraction. The author's own maturity numbers defeat the recommendation. |

Keep xa11y as one concrete future `DesktopSurface` backend named in `REPORT.md`. Do not install it. This agrees with `frontier_computer_use.md` and contradicts `tech_stack.md` Stack B's "actually built" suggestion; preserve that disagreement.

### 6. LangGraph rejection

| Claim | Status | Adversarial finding |
|---|---|---|
| A LangGraph node containing `interrupt()` re-runs from the start on resume. | **CONFIRMED** | Official docs say the node is re-run and pre-interrupt side effects should be idempotent, moved after the interrupt, or separated. <https://docs.langchain.com/oss/javascript/langgraph/interrupts> |
| Therefore LangGraph necessarily re-clicks banking controls and is unsafe. | **FALSE** | It re-clicks only if the graph is designed with the click above the interrupt in the same re-executed node. Separate act and interrupt nodes, put approval before actuation, or use checkpointed tasks. The documented semantics are a design constraint, not a framework disqualification. |
| LangGraph is the wrong default for this take-home. | **CONFIRMED as a scope judgment, not for the stated absolute reason** | A custom reducer keeps the graded replay/error logic visible and avoids checkpointer/database concepts. Reject LangGraph because it adds machinery without improving this thin live-session slice—not because safe graphs are impossible. |

The fair sentence is: "LangGraph can implement this safely, but the required node boundaries and checkpointer are extra concepts for no scoring gain; use a custom state machine." The existing "resume means re-click" kill is rhetoric.

### 7. Stack C and MCP

| Claim | Status | Adversarial finding |
|---|---|---|
| `@modelcontextprotocol/server` 2.0.0 and `registerTool`/stdio support exist. | **CONFIRMED** | <https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/%40modelcontextprotocol/server%402.0.0> · <https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server.html> |
| Exposing a capability over MCP is a "near-free win." | **FALSE** | A toy tool wrapper is short. A defensible capability server also needs artifact approval rules, input/output/error mapping, cancellation, evidence correlation, transport-safe logging, client compatibility, and tests. The SDK/spec line was weeks old. The code is not the only cost. |
| Stack C is a reasonable third default candidate. | **UNVERIFIED** | It combines a provider abstraction, a two-provider comparison, and a protocol stretch. None improves the required replay, outcome taxonomy, redaction, or HITL. It is precisely the breadth §7 says not to reward. |

If the core is complete and the human explicitly chooses one stretch, a thin MCP invocation demo is on-theme. Until then, `invoke-capability` through the existing CLI/library proves the typed callable contract with less protocol theater.

### 8. Node 24 native TypeScript, `node:test`, package manager, and Vitest

| Claim | Status | Adversarial finding |
|---|---|---|
| Node 24 native TypeScript type stripping is stable. | **CONFIRMED with a missing floor** | It became stable in Node **24.12.0**, not generically at the beginning of Node 24. It executes erasable syntax only, ignores `tsconfig.json`, does no type checking, rejects `.tsx`, requires explicit file extensions, and does not transform enums/parameter properties/decorators. <https://nodejs.org/docs/latest-v24.x/api/typescript.html> |
| Native stripping gives a zero-build, friction-free TypeScript DX. | **FALSE** | The restrictions become project-wide style/build constraints, while `tsc --noEmit` is still required. Node's own docs recommend a third-party runner such as `tsx` for full TypeScript support. <https://nodejs.org/docs/latest-v24.x/api/typescript.html> |
| `node:test` is stable. | **CONFIRMED** | The runner has Stability 2 and supports watch, mocks, reporters, and coverage. <https://nodejs.org/docs/latest-v24.x/api/test.html> |
| `node:test` is "feature-complete" and therefore the best DX. | **FALSE/UNVERIFIED** | "Feature-complete" has no cited definition; module mocking and some test features still require experimental flags. Stable is not the same as best fit. <https://nodejs.org/learn/test-runner/using-test-runner> |
| Vitest adds no value because there is no bundler. | **FALSE** | Vitest provides out-of-box TS/ESM, familiar expect/mocking, smart affected-test watch mode, isolation, and coverage even for backend projects. Those are concrete DX benefits; whether they justify one dev dependency is a judgment. <https://vitest.dev/guide/features> |
| pnpm is required to get those benefits. | **FALSE** | Vitest works under npm. pnpm's strict dependency layout is useful, but a single-package take-home does not need a workspace, and pnpm adds an installation/version-management step. <https://pnpm.io/installation> |

Recommendation: Node 24 LTS with an explicit minimum if used, TypeScript + `tsx` for commands, Vitest for fast deterministic unit/contract tests, and Playwright Test for browser e2e. Use npm for lowest grader friction. If the human prefers pnpm, pin the package manager and commit its lockfile; do not let this choice create a workspace.

### 9. Other overclaims and weak citations

- **UNVERIFIED:** exact per-run cost. The arithmetic is fine under the stated token assumptions; the assumptions about 25 turns, screenshot tokenization, compaction, retries, and success rate are not measured. Label it a budget envelope, not a verified run cost.
- **FALSE:** screenshot redaction from ARIA boxes alone guarantees no sensitive persistence. Content absent from the accessibility tree, stale boxes, canvas, overlays, and full trace/HAR payloads remain. Synthetic-only demo data plus deny-by-default evidence sinks are the actual safety boundary.
- **UNVERIFIED:** Electron and MCP each take "a few hours." Calendar estimates are unsupported and irrelevant to an autonomous build decision. Both add integration and grader-surface risk.
- **CONFIRMED:** Playwright screencast annotation APIs exist, but they are optional polish and should be cut before any core requirement. <https://playwright.dev/docs/api/class-screencast>
- The source list is padded with SEO/comparison sites where primary sources exist. `nightcat.cloudns.asia:9981` is an unauthenticated, non-canonical LangGraph mirror and is a likely hallucinated or unsafe citation target; delete it. BenchLM, Finout, DigitalApplied, Apify comparison content, QASkills, TestDino, DevToolLab, AgentsCamp, BrowserBash, Techglock, PkgPulse, and runany should not substantiate API/version/license claims. Re-check their underlying primary source or mark the claim **UNVERIFIED**.

The high-profile names attacked in this review—`browser.bind`, Terra, Luna, xa11y—are not hallucinated. Calling them hallucinated despite first-party evidence would be bad reviewing. The hallucination problem is in inferred guarantees and mixed release channels.

## Disagreements with other research files

### `alternatives_matrix.md`: conventional Playwright #1 vs ARIA-first

Preserve the disagreement:

- Alternatives Architect ranks a thin DOM-derived Playwright summary/replay stack #1 because it maximizes the chance of a complete schema/replay/errors/HITL slice. It ranks accessibility-first #2, burdened by LangGraph/OPA and accessibility coverage risk.
- `tech_stack.md` calls ARIA-first Stack A and awards it DIRT=5.
- `frontier_computer_use.md` also recommends ARIA-first, with screenshots as a bounded fallback.

My judgment: Alternatives Architect has the better **ranking rationale**, while its B option unfairly bundles a perception choice with LangGraph/OPA. The correct synthesis is not a majority answer and not pure DOM. Use an early target probe to choose the observation mix, while keeping replay on durable Playwright locators. ARIA summary is a good default input, not an architectural religion.

### `frontier_computer_use.md`

Agreement: custom Playwright discovery, ephemeral refs promoted to durable locators, deterministic replay, screenshot fallback, no MCP product, desktop design-only.

Disagreement: calling accessibility-first the default before probing the target is premature. Its own dirty-table/canvas caveats support a hybrid default. The file is also more disciplined than `tech_stack.md` on xa11y: design story only.

### `os_desktop_electron.md`

Agreement: hostile local web is the primary implementation; OS injection/native automation is design-only.

Disagreement: its claim of effectively perfect reproducibility and "100%" coverage is too strong. A browser fixture cannot prove process attachment, OS-owned dialogs, UIA quirks, or Citrix/bitmap behavior. That limitation belongs in `REPORT.md`; no second adapter is required to admit it.

### `non_viable.md`

Strong agreement on fake discovery, always-on model replay, happy-path-only replay, new-session HITL, secrets in evidence, coordinate-only control, and stretch-before-core.

`tech_stack.md` risks violating that last rule itself by recommending two post-core additions, a public cross-surface run, two tenant variants, annotated video, and a provider comparison. "Only after core" does not make a backlog free. The default should contain zero stretches.

## Required corrections to `tech_stack.md` recommendations

1. Replace every Stack A pin of Playwright 1.62 with exact **1.62.1**, and remove `ariaSnapshotJSON()` until a stable release actually contains it.
2. Rewrite HITL so the control lease, actuator gate, session identity, operator-action evidence, and resume re-observation are primary. Describe `browser.bind()` only as an optional attachment transport.
3. Remove "ARIA is non-DOM" and DIRT=5 language. State that the accessibility tree is DOM-derived and target quality must be measured.
4. Ban refs and executable coordinates in approved artifacts. Discovery refs/points are provenance only; compile to a durable locator or refuse approval.
5. Make the model configurable. Confirm Terra/Luna are real, but remove the unsupported Luna development recommendation unless a target-specific smoke/eval supports it.
6. Move xa11y from "optional implementation" to design-only. Remove it from Stack B's shipped dependency list.
7. Keep the custom reducer recommendation, but correct the LangGraph rationale: node replay is manageable with proper boundaries; the rejection is scope and explainability.
8. Remove MCP, Electron, public-site comparison, and provider bake-off from the recommended default. List at most one as an unselected stretch.
9. Stop making native Node TypeScript stripping load-bearing. Use a conventional `tsx`/typecheck workflow.
10. Prefer Vitest for core contract tests and Playwright Test for e2e. Keep npm unless the human explicitly picks pinned pnpm.
11. Replace broad ARIA golden checkpoints with narrow typed predicates. Keep snapshots as observation/evidence.
12. Replace SEO/secondary citations with official docs; delete the non-canonical LangGraph mirror.

## Interview grader lens: would Stack A actually score?

**As written: 6.5/10, with a real risk of a visible implementation failure.**

It would score on:

- clear discovery/replay separation;
- typed artifact and result unions;
- filesystem evidence;
- local deterministic faults;
- custom loop rather than framework theater;
- credible base/overlay design;
- explicit safety and redaction intent.

It would lose hard on:

- a 1.63-only API in a 1.62 stack;
- selling multi-client attachment as control transfer;
- no demonstrated exclusive lease/action audit unless separately implemented;
- overclaiming accessibility robustness on the exact legacy surfaces named by the brief;
- approving point-based fallback targets;
- spending effort on Electron/MCP/public comparison before exceptional replay and HITL evidence;
- a toolchain optimized for "zero dependencies" rather than ordinary reviewer DX.

**Modified Stack A can score 9/10** if the evidence visibly proves: one real model-driven run; compilation from transient observation to reviewable capability; replay success; not-found as a business outcome; one bounded recovery; one hard failure with expected/observed evidence; allowlist denial; and same-session human/scripted-operator takeover with ownership transitions and re-observation.

The grader will not care that the model was six cents cheaper, that the MCP SDK is current, or that an Electron adapter was theoretically easy. They will ask why a locator is stable, where the model is absent during replay, what happens on a permission dialog, who owns the actuator, and what sensitive data was persisted.

## Human gates this review would refuse to skip

1. **Target gate:** approve the local synthetic target and exact fault scenarios. No real bank, real credentials, or undocumented public target.
2. **Observation probe gate:** inspect the target's ARIA snapshot and record coverage/uniqueness. Decide hybrid behavior from evidence, not the DIRT score.
3. **Playwright gate:** lock 1.62.1 and run smoke tests for `mode: "ai"`, `boxes`, ref execution adapter, frames, tracing, and two-client bind before architecture depends on them.
4. **Model-access gate:** the actual API key/account must pass image input + custom tool calling on the chosen model. Record the model returned by the API. No hardcoded provider assumption.
5. **HITL gate:** choose the operator channel and grader environment. Prove same context/page, enforced lease, logged operator actions, and re-observation. A headed-window-only story is not enough for cloud/headless grading.
6. **Safety gate:** approve action/origin allowlists, irreversible-action policy, model egress, trace/HAR/screenshot retention, and synthetic-data assertion before any real discovery evidence is written.
7. **Artifact gate:** review the schema's parameter bindings, outputs, outcome taxonomy, locator rationale, checkpoint predicates, and explicit prohibition on refs/coordinates as sole executable targets.
8. **Tooling gate:** choose npm vs pinned pnpm and Vitest vs `node:test` once; README, lockfile, CI, and agent instructions must agree.
9. **Scope gate:** no MCP, Electron, xa11y, second provider, or public-site run until discovery, replay, exceptional outcomes, safety, HITL, and evidence all pass. The default answer at this gate is **no stretch**.
10. **Evidence gate:** a genuine LLM-driven live run is non-negotiable. A canned transcript may test the loop but cannot be submitted as discovery evidence.

## FALSE / UNVERIFIED claims returned to the synthesizer

### FALSE

- Playwright 1.62 can use `ariaSnapshotJSON()`.
- Playwright 1.62.0 was the current conservative pin on 2026-08-16.
- `browser.bind()`/`unbind()` by themselves implement control transfer.
- An accessibility snapshot is independent of the DOM in the sense needed for heterogeneous surfaces.
- Useful accessibility semantics appear regardless of developer markup/cooperation.
- Observation refs are durable locators.
- Putting coordinates in a typed union makes them robust replay targets.
- LangGraph resume necessarily re-clicks controls.
- Node native type stripping is a friction-free substitute for a conventional TypeScript execution tool.
- `node:test` is demonstrably "feature-complete."
- Vitest has no material benefit in this backend take-home.
- MCP capability exposure is a near-free win.
- ARIA-box screenshot masking guarantees no sensitive persistence.

### UNVERIFIED

- Playwright 1.63/`ariaSnapshotJSON()` is safe to pin before release.
- The undocumented programmatic `aria-ref` action path is a supported stable public contract.
- Luna is reliable enough for hostile multi-step discovery.
- Terra, Sonnet, and flagship models are task-equivalent.
- Mutable model aliases make evidence reproducible.
- ARIA-first deserves DIRT=5 on the chosen target.
- xa11y is mature enough for a submitted cross-platform adapter.
- Full-page ARIA snapshots are appropriate runtime checkpoints.
- The estimated token/run cost reflects an actual successful run.
- Electron and MCP additions have negligible implementation cost.

## Modified stack recommendation

**TypeScript + Node 24 LTS + npm + `tsx`/`tsc --noEmit` + Vitest + Playwright Test + exact Playwright 1.62.1 + configurable provider-native LLM SDK/model + custom hybrid discovery loop + durable locator compiler + separate deterministic replay interpreter + Zod 4 + canonical JSON/JSONL filesystem evidence + local synthetic MemberDesk with deterministic faults + enforced same-session control lease.**

Design desktop through the `Surface`/locator union and name UIA/AX/AT-SPI/xa11y as possible backends. Do not build them. Do not ship MCP, Electron, LangGraph, OPA, SQLite, provider comparison, or a public-site run in the default submission.
