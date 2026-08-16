# DX & Desktop Review

**Reviewer:** Composer family (`composer-2.5`)  
**Role:** Supporting reviewer of `tech_stack.md` (Stack A); adversarial reviewer of `os_desktop_electron.md`  
**Date:** 2026-08-16  
**Sources read:** `/workspace/Project.md`, `/workspace/_lab/research/tech_stack.md`, `/workspace/_lab/research/os_desktop_electron.md`, `/workspace/_lab/research/agent_native_workflows.md`, `/workspace/_lab/research/alternatives_matrix.md`

---

## Executive verdict

| Question | Answer |
|---|---|
| **Stack A implementable by agents?** | **Yes, with qualifications** — lock npm + `node --test` + OpenAI *or* Anthropic at G6 before scaffold; reconcile conflicts with `alternatives_matrix.md`. |
| **Hostile web enough for §3.7?** | **Yes for design; partially too convenient for interview differentiation** — credible if `SurfaceAdapter` + two tenant variants are real; weak on *process/window* heterogeneity unless documented honestly. |
| **Electron for this take-home?** | **NO as primary target. OPTIONAL YES as a post-core thin adapter** (~1 window, `_electron` smoke) if M1–M4 are green; never before core evidence. |
| **OS input injection?** | **NO — agree with kill criteria** in `os_desktop_electron.md`. |

---

## Part 1 — Stack A implementability (Composer lens)

### Support statement

Stack A in `tech_stack.md` §16 is the right default for agent-assisted implementation: TypeScript, Playwright ARIA-first perception, custom discovery/replay loops, Zod artifacts on disk, Commander CLI, filesystem evidence. It aligns with `Project.md` §7 weighting (artifact schema, replay contract, error taxonomy, HITL, safety) and with `alternatives_matrix.md` Architecture A.

**Qualifications before lock:**

1. **Internal doc conflict:** `tech_stack.md` defaults to `openai` + `gpt-5.6-terra` + **npm** + **`node --test`**. `alternatives_matrix.md` Stack A lists `@anthropic-ai/sdk` + `claude-sonnet-5` + **pnpm** + **Vitest/@playwright/test**. Agents will scaffold the wrong tree if both files stay unresolved. **Resolve at G3/G6/G10; do not let an agent pick.**

2. **HITL primitive:** Stack A leans on `browser.bind()` (Playwright 1.59+). That API is newer and less familiar in training data than `page.pause()`. Treat bind as **optional enhancement**; ship pause + control lease first so M4 does not block on an unverified API.

3. **Observation API drift:** Stack A cites `ariaSnapshotJSON()` at Playwright **1.63** while pinning **1.62**. Do not scaffold against 1.63-only APIs until verified at lock time. Use YAML `ariaSnapshot({ mode: 'ai', boxes: true })` as the portable observation path.

4. **Model IDs are config, not code:** Whatever G6 picks (`gpt-5.6-terra`, `claude-sonnet-5`, etc.), keep the model string in env/config only. Agents habitually hardcode model names into artifacts and tests.

### Package manager

**Recommendation: npm** (not pnpm) for Stack A scaffold.

| Choice | Agent/scaffold rationale |
|---|---|
| **npm** | Zero extra install for graders; matches `tech_stack.md` G10 default; `npm run` scripts are the documented entry in `Project.md` §6. |
| pnpm | Faster in monorepos; **not justified** for a single-package take-home. `alternatives_matrix.md` uses it by habit, not grader DX. |

`package.json` scripts should be the canonical interface; do not add `just`, Makefile, or oclif (all explicitly rejected in `tech_stack.md` §18).

### Test runner

**Recommendation: split runner, single command surface.**

| Layer | Runner | Why |
|---|---|---|
| Schema, replay engine, policy, redaction, `FakeSurface` fixtures | **`node --test`** | Zero deps; maps 1:1 to §3.3 error taxonomy branches; CI runs without API key. |
| One live replay smoke + optional HITL smoke | **`@playwright/test`** | Playwright owns browser lifecycle; do not wrap Playwright in Vitest unless you already chose Vitest for unit tests. |

**Do not adopt Vitest by default** unless G10 explicitly locks it. Vitest adds a devDependency and config surface agents will misconfigure (ESM/CJS, `globals`, path aliases) for no grading benefit on a repo with no bundler.

Suggested `package.json` scripts:

```json
{
  "test": "node --test 'test/**/*.test.ts'",
  "test:e2e": "playwright test",
  "test:all": "npm run test && npm run test:e2e",
  "typecheck": "tsc --noEmit"
}
```

CI must pass `npm run test` and `npm run typecheck` **without** `OPENAI_API_KEY`.

### CLI

**Commander.js** — agree with `tech_stack.md` §9. Subcommands to scaffold on day one:

| Command | Purpose | LLM? |
|---|---|---|
| `discover --goal … --target … [--dry-run]` | Discovery loop | Yes (or canned transcript in dry-run) |
| `replay <artifact> --param k=v [--inject fault]` | Deterministic replay | No |
| `inspect <artifact>` | Human-readable capability + contract hash | No |
| `operator` | List/claim/resume interventions (mock console OK) | No |

Wire `--inject` to the local MemberDesk fault switches early; it is both §6.3 evidence and fixture generation.

### Folder layout (single package)

Match `tech_stack.md` G10 + `agent_native_workflows.md` submission map:

```
/
├── AGENTS.md                 # after stack lock — commands, seams, never _lab/
├── README.md
├── REPORT.md
├── evidence/
├── package.json
├── tsconfig.json
├── playwright.config.ts
├── .env.example
├── config/
│   └── policy.yaml           # allowlist; validated with Zod at boot
├── capabilities/             # compiled artifacts (gitkeep + example)
├── fixtures/                 # FakeSurface snapshots, dry-run transcript
├── src/
│   ├── cli/                  # commander entry
│   ├── surface/              # SurfaceAdapter, WebSurface, (ElectronSurface stub)
│   ├── discovery/            # observe → model → act loop
│   ├── replay/               # step interpreter + error taxonomy
│   ├── artifact/             # Zod schemas, compiler, inspect renderer
│   ├── policy/               # assertAllowed, risk class
│   ├── hitl/                 # control lease, intervention records
│   ├── evidence/             # journal writer, redact(), manifest
│   └── target/               # local MemberDesk static server OR import
├── test/                     # node --test files
└── e2e/                      # @playwright/test (optional dir name)
```

**Agent trap:** putting production code under `apps/` or a pnpm workspace without G10 approval. Keep one package until a second deployable exists.

### Exact packages to scaffold (names only; pin at `npm install` time)

**Runtime dependencies**

| Package | Role |
|---|---|
| `playwright` | Surface automation + trace |
| `openai` *or* `@anthropic-ai/sdk` | Discovery only (G6) |
| `zod` | Artifact + config + result unions |
| `commander` | CLI |
| `pino` | JSONL journal (optional: hand-rolled writer is fine; pino `redact` is worth it) |

**Dev dependencies**

| Package | Role |
|---|---|
| `typescript` | Types |
| `@types/node` | Node types |
| `@playwright/test` | E2e smoke |
| `tsx` | Dev execution if not using Node native type-stripping |

**Explicitly do not scaffold yet:** LangGraph, Vercel AI SDK, MCP server, OPA, SQLite, `@crowecawcaw/xa11y`, nut.js, PyAutoGUI ports, Claude Agent SDK.

**Target app:** local MemberDesk — plain Node `http`/`fastify` static server under `src/target/` or `target-app/`; no separate npm package unless it prevents circular imports.

### What a coding agent will actually get wrong

Ordered by likelihood and damage:

1. **Persist session refs into artifacts** — writing Playwright MCP-style `ref=e14` or observation handles into the capability file. Refs die on navigation; replay cannot work. Rule: compile to semantic locators at record time; ban `ref` in Zod schema.

2. **LLM in replay path** — “helpful” fallback that calls the model on checkpoint failure. Violates §3.3 outright. Gate with a startup assertion: no LLM client import in `src/replay/`.

3. **CSS-first locators** — `#memberForm > table tr:nth-child(3)` because agents know CSS. Brief §3.1 biases against this. Primary chain: role + name + scoped ancestor + ordinal; CSS only as documented last resort in `alternates[]`.

4. **Mock HITL that opens a new browser** — `pause()` implemented as restart session. §3.6 requires same live session. Enforce `sessionId` + persistent `BrowserContext` in tests.

5. **Raw transcript as artifact** — dumping model messages into `/capabilities/`. §3.2 wants typed steps, parameters, outputs, checkpoints. Compiler step must be explicit in folder layout.

6. **Secrets in evidence** — logging full DOM text, query strings, or screenshots without redaction. Agents forget placeholder vs mask distinction from `tech_stack.md` §12.3. Add a failing redaction test before first discovery run.

7. **Coordinate replay as primary** — using `click_point(x,y)` in artifacts because computer-use demos do it. OK as fallback action; not as default target kind.

8. **`browser.bind()` without smoke test** — designing M4 around an API the agent has never run. Implement lease + `page.pause()` first; add bind if verified.

9. **Over-scaffold agent ops before M1** — huge `.cursor/rules` blobs, MCP server, Electron app, second tenant variant, all before discovery evidence. `agent_native_workflows.md` says scaffold after stack lock; keep rules <100 lines each, skills for workflows only.

10. **Package manager / test runner drift** — copying `pnpm` + Vitest from `alternatives_matrix.md` while README says `npm test`. One `AGENTS.md` command block prevents this.

### Unverified APIs — do not repeat as facts in scaffold

| Claim in research | Status |
|---|---|
| `page.ariaSnapshotJSON()` | Cited for Playwright **1.63**; stack pins **1.62** — **unverified at lock** |
| `browser.bind()` / `browser.unbind()` | Documented 1.59+; semantics for HITL — **smoke-test before design depends on it** |
| `page.screencast` + `showChapter()` / `showActions()` | 1.59+ polish — optional, not load-bearing |
| `gpt-5.6-terra`, `gpt-5.6-luna`, `claude-sonnet-5` | Treat as **config placeholders** until G6 key + live model list confirms |
| OpenAI GA `tools:[{type:"computer"}]` vs custom tool harness | Stack A correctly chooses **custom harness**; do not scaffold built-in computer tool as primary |
| Anthropic `computer_20251124` beta | Only relevant for Stack C-style paths; not Stack A default |

---

## Part 2 — Adversarial review of `os_desktop_electron.md`

### Is “hostile web is enough for §3.7” too convenient?

**Partly yes — but still defensible if written honestly.**

**Where the Gemini doc is right**

- `Project.md` §3.7: *“design, not necessarily build”* and §7: no reward for breadth. A local hostile web mock exercises legacy web (framesets, iframes, tables, no test IDs, session faults) — the common bank case in §1.
- Grader reproducibility, headless CI, and zero OS permissions are real constraints. Native UIA/AX/AT-SPI and PyAutoGUI fail those gates.
- The **`Surface` interface** sketch (semantic / visual / path / coordinate locators; `perceive` / `act` / HITL hooks) is the actual §3.7 deliverable, not a second runtime.

**Where it is too convenient**

- §3.7 asks for extension to **desktop apps**, not only legacy HTML. Hostile web alone does not demonstrate **`attach()` lifecycle difference** (launch process vs navigate URL), **multi-window**, or **native modal** classes unless you *simulate* them in HTML (`window.open`, in-page modals). Simulated modals are not the same interview story as OS-owned dialogs.
- A grader who reads REPORT §4 and sees only browser vocabulary may conclude desktop was hand-waved — even if the interface types are pretty.
- `alternatives_matrix.md` scores Architecture D (Electron) at **6/10** interview fit vs A at **9/10** *because* DOM-centric implementation looks less representative — that penalty is real even when design is sound.

**Mitigation without building native OS**

1. Implement **`WebSurface` fully** + **`ElectronSurface` interface stub** with typed locators shared verbatim.
2. Ship **two tenant variants** of local HTML (base + overlay locators) for multi-tenant story — cheaper than Electron, satisfies half of §3.7.
3. In REPORT §4, explicitly map: HTML iframe ≈ legacy frameset; in-page modal ≈ recoverable dialog; **Electron window ≈ WPF window** at the a11y seam; **UIA** as production adapter — with a diagram, not a claim of implementation.

### Would a tiny Electron app via Playwright `_electron` be the better interview story?

**Better for §3.7 surface axis only — not for overall submission EV.**

| Factor | Hostile web primary | + Tiny `_electron` after core |
|---|---|---|
| §7 weight (schema, replay, errors, HITL) | Protects time for load-bearing work | **Risk:** Electron target eats target-app budget |
| §3.7 desktop credibility | Design + types | **Demonstrated** second `attach()` implementation |
| Grader setup | `npm install` + local HTTP | + Electron binary download; experimental API disclaimer |
| Honesty | Must admit no true native dialogs | Still Chromium renderer — **not** WPF/Swing; native `dialog.showMessageBox` needs evaluate stub or HITL |
| Cost | ~hours for MemberDesk HTML | +**half day to 1 day** for minimal shell + one flow + smoke test |

**Composer judgment:** If M1–M4 (discovery, replay, error path, HITL) are not green, Electron is the wrong trade. If core is green with a week of slack, a **single-window** Electron MemberDesk that reuses the **same artifact schema and replay engine** is the highest ROI desktop proof — stronger than 20 pages of UIA prose, weaker than risking core depth.

`tech_stack.md` §17 already says this (“few hours” optional adapter). `os_desktop_electron.md` ranks hostile web **RECOMMENDED** and Electron **Alternative** — agree with ranking; disagree only if someone claims web alone maxes §3.7 *interview narrative* without the honest “renderer-only” caveat.

### Electron yes/no

**NO** — as the primary implementation surface and discovery target for this take-home.

**OPTIONAL YES** — as a post-core **`ElectronSurface` smoke adapter** (one packaged window, same MemberDesk flow, shared semantic locators, `_electron` launch in CI with `xvfb-run` on Linux), **only after** `/evidence/` contains discovery + replay + error + HITL from web.

Do **not** build Electron instead of artifact depth, tenant-variant design, or injected fault replay.

### Kill criteria for OS input injection — agree/disagree

**Agree** with `os_desktop_electron.md` rejection of PyAutoGUI, cliclick, nut.js, xdotool, raw coordinate replay as **implementation** paths.

| Kill criterion | Verdict |
|---|---|
| Global cursor hijack / DPI / multi-monitor fragility | **Agree** — fails §3.3 determinism and grader reproducibility |
| macOS TCC / headless CI failure | **Agree** — disqualifying for public repo README |
| nut.js paid prebuilds | **Agree** — unacceptable grader friction |
| Coordinate-only artifacts | **Agree** — violates §3.2 reviewability |
| Native UIA/AX/AT-SPI as take-home **build** | **Agree** — design-only in Linux/cloud agent environment |

**Qualify (do not throw away)**

- **Screenshot + coordinate as discovery-only action** (`click_point` escape hatch) — agree with both docs; one bounded action in web harness, not OS injection.
- **CDP synthetic input in Electron** — not OS injection; acceptable inside `_electron` adapter; still prefer semantic/a11y targeting for artifacts.
- **`electronApp.evaluate()` to stub native dialogs** — acceptable for **fault injection** in tests; label as simulated, not production UIA.

**Disagree with one rhetorical excess:** calling hostile web “100% of §1, §3.1–§3.6” — §3.1 explicitly mentions surfaces beyond browser. Web covers the **legacy web** bullet, not the full heterogeneity paragraph. Soften to “covers the graded implementation path; desktop addressed at seam.”

---

## Part 3 — Cursor/Codex layout vs locked Stack A

`agent_native_workflows.md` is **consistent in intent** with Stack A (AGENTS.md as cross-tool contract, thin rules, workflow skills, no `_lab/` in submission). Conflicts are **packaging choices**, not architecture.

### Conflicts to resolve at lock

| Topic | `tech_stack.md` Stack A | `alternatives_matrix.md` / `agent_native_workflows.md` | Resolution |
|---|---|---|---|
| Package manager | npm (G10 default) | pnpm | **Lock npm** unless human prefers pnpm at G10 |
| LLM SDK | `openai` | `@anthropic-ai/sdk` | **G6** — one provider; both docs allow either |
| Unit tests | `node --test` | Vitest | **`node --test`** default; Vitest only if G10 locks |
| E2e | implied Playwright Test | `@playwright/test` explicit | **Same** — add `playwright.config.ts` |
| Orchestration | custom loop + state machine | custom reducer | **Same** — do not import LangGraph from matrix B |
| Dev runner | Node 24 type-stripping *or* tsx | tsx listed | **tsx for dev**, `tsc --noEmit` in CI |
| Agent scaffold timing | “No scaffolding until lock” (`tech_stack.md` header) | “Do not scaffold `.cursor/` until PRD + stack lock” | **Aligned** — R2 after G3 |

### Layout mapping — no structural conflict

| Agent-native path | Stack A home | Notes |
|---|---|---|
| Production code | `src/{surface,discovery,replay,artifact,policy,hitl,evidence,cli}` | Matches both docs |
| Cross-tool skills | `.agents/skills/` | `discover-run`, `replay-run`, `hitl-handoff`, `package-evidence`, `write-report` |
| Cursor mirror | `.cursor/skills/` symlink or copy | Optional |
| Cursor rules | `.cursor/rules/*.mdc` | Glob-scoped: `artifact-schema`, `replay-engine`, `safety-redaction`, `hitl-handoff`, `00-submission-paths` |
| Commands in AGENTS.md | Mirror `package.json` scripts exactly | Prevents Codex/Cursor inventing `pnpm replay` vs `npm run replay` |

### Concrete DX recommendations for R2 scaffold

1. **Root `AGENTS.md` (~120 lines):** submission paths, `npm ci`, `npx playwright install chromium`, `npm run test`, `npm run discover -- --dry-run`, `npm run replay`, evidence layout, “never commit `_lab/`”, Surface ≠ artifact ≠ replay.

2. **`.env.example`:** `OPENAI_API_KEY=` or `ANTHROPIC_API_KEY=`, `MAX_USD_PER_RUN=`, `DISCOVERY_MODEL=` — no secrets in repo.

3. **`.cursor/rules/00-submission-paths.mdc`:** `alwaysApply: true`, <30 lines — allowed write roots: `src/`, `test/`, `e2e/`, `evidence/`, `capabilities/`, `config/`, root docs; forbid implementing in `_lab/`.

4. **Single CI job:** `typecheck` → `node --test` → `playwright test` against local target with `--inject not-found` — no API key.

5. **Do not** commit `.codex/config.toml` until needed; document byte-limit override in README if AGENTS.md grows.

6. **Skills reference commands, not duplicate stack essay** — point to locked `AGENTS.md` for package names.

### Conflict verdict

**No irreconcilable conflict** between Cursor/Codex layout and Stack A once G3/G6/G10 pick npm, test runner, and LLM provider. The real risk is **parallel defaults** in `alternatives_matrix.md` (pnpm, Vitest, Anthropic) vs `tech_stack.md` (npm, node:test, OpenAI). **Human gate or orchestrator default must collapse these before any agent scaffolds.**

---

## Cross-reference table

| Document | Stack A stance | Desktop stance | Action |
|---|---|---|---|
| `tech_stack.md` | Default; npm; node:test; OpenAI | Web primary; Electron optional stretch | **Support** — lock conflicts |
| `alternatives_matrix.md` | #1 architecture; pnpm; Vitest; Anthropic | Electron #4; design UIA | **Merge into A** — don’t fork stack |
| `os_desktop_electron.md` | N/A | Hostile web RECOMMENDED; no OS injection | **Agree implementation**; **qualify §3.7 narrative** |
| `agent_native_workflows.md` | Scaffold after lock | Same seam story | **Consistent** — execute at R2 |

---

## Recommended human gates (concise)

| Gate | Recommendation |
|---|---|
| G3 Stack lock | **Stack A** from `tech_stack.md` |
| G6 Provider | Whichever key exists; model string in env only |
| G10 Tooling | **npm** + **`node --test`** + **`@playwright/test`** e2e |
| G1 Surface | **Local hostile MemberDesk HTML** (+ 2 variants) |
| G12 Scope | **Web now**; Electron adapter **only post-core**; native OS **design only** |

---

*Review complete. Not a PRD. Next step: record defaults in `_lab/decisions/open_questions.md` or human lock, then R2 scaffold per `agent_native_workflows.md`.*
