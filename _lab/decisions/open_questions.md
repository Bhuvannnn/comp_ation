# Open questions / human gates

Status legend: `OPEN` | `ORCHESTRATOR_DEFAULT` (human unavailable; recorded recommendation after research) | `LOCKED` (human answered)

Background/cloud agent cannot wait on interactive answers. Research completed first (`research/_RESEARCH_COMPLETE.md`). Defaults below are **not silent assumptions** — they are explicit locks the human can override.

## Required gates

| ID | Gate | Status | Options considered | Orchestrator default | Why | If human picks otherwise |
|----|------|--------|--------------------|----------------------|-----|--------------------------|
| G1 | Target surface | ORCHESTRATOR_DEFAULT | public demo / local mock / hostile HTML / Electron / native desktop | **Local MemberDesk** hostile-ish HTML (tables, iframe, no test IDs, synthetic data, fault injection) | §6.3 exceptional replay on command; ToS; grader repro. `os_desktop_electron.md`, `alternatives_matrix.md`, reviewer_pass_1 | Public: extra ToS/evidence run. Electron: after core only. Native: Python stack rewrite |
| G2 | Computer-use mechanism | ORCHESTRATOR_DEFAULT | DOM / a11y / screenshot+coords / OS injection / hybrid | **Hybrid A′**: Playwright ARIA snapshot observe → compile durable semantic locators → replay without LLM. Screenshot on failure/ambiguity. Coords = discovery escape hatch, never artifact identity | §3.1 no-clean-DOM bias; §3.2 reviewable locators; frontier + Claude alternatives review | Screenshot-first: compiler must still emit semantic locators or kill |
| G3 | Full tech stack | ORCHESTRATOR_DEFAULT | Stack A / B / C from `tech_stack.md` | **Modified Stack A** (see `locked_stack.md`): TS + npm + Playwright 1.62.1 + OpenAI custom tools + Zod + Commander + custom loop + node:test | Adversarial pass 1: MODIFY not as-written. §7 simplicity | B: Python+desktop. C: MCP stretch after core |
| G4 | Surface adapter seam | ORCHESTRATOR_DEFAULT | Web only vs Electron vs OS types | **`Surface` interface** with `WebSurface` implemented; `ElectronSurface` / `OsDesktopSurface` typed stubs + REPORT design | §3.7 design-not-build; Composer: Electron optional after M1–M4 | Built Electron: extra package + xvfb |
| G5 | Language & runtime | ORCHESTRATOR_DEFAULT | TS vs Python | **TypeScript on Node 20+** (dev on 22/24; do not require native type-stripping) | Interview/Playwright/agent-coding density; desktop not being built | Python if human demands native a11y demo |
| G6 | LLM provider / spend | ORCHESTRATOR_DEFAULT | OpenAI vs Anthropic; model ID; ceiling | **OpenAI SDK**, `DISCOVERY_MODEL` env default `gpt-5.6-terra`, custom tools not `type:computer`. Cap **$2/run**, fail closed if no key (dry-run/mock still works) | Option-2 harness compiles to locators; Terra is a real public ID. Key may be absent in this environment | Anthropic: swap provider port. Luna: plumbing only, not evidence model |
| G7 | Orchestration | ORCHESTRATOR_DEFAULT | custom vs LangGraph vs Temporal | **Custom in-process state machine** (discover loop + replay interpreter). No LangGraph | §7; live session dies with process; interrupt re-run is a design tax | LangGraph only if human wants durable HITL across process restart |
| G8 | Artifact schema | ORCHESTRATOR_DEFAULT | DSL vs event log+compiler vs hybrid; JSON vs YAML | **Hybrid compiler**: trajectory journal → versioned JSON capability. Ranked `SemanticLocator` + fallbacks. `schemaVersion` + `capabilityVersion` + contract JSON Schema. Locators not CSS-only | §3.2; YAML implicit types; refs must not persist | Event-log-only fails reviewability |
| G9 | HITL UX | ORCHESTRATOR_DEFAULT | headed window vs mock console | **Real lease** on same `BrowserContext`. CLI + JSON intervention file. Scripted mock operator for tests/CI. Headed window optional demo. `browser.bind()` optional transport after smoke | §3.6 mock UI OK, control model real; headed-only fails headless graders | Local web operator console is extra polish |
| G10 | Package/tooling | ORCHESTRATOR_DEFAULT | npm/pnpm; mono; lint/test | **npm, single package**, `tsx` + `tsc --noEmit`, `node --test`, `@playwright/test` for one smoke. No Biome required | Lowest clone friction | pnpm if human pins packageManager |
| G11 | Stretch | ORCHESTRATOR_DEFAULT | none vs 1–2 | **None until core evidence is green.** Schema may include unused `tenantOverrides` field (cheap). Next stretch: CLI invoke-by-name, then Electron adapter | §8 | Canonicalization / MCP only after HITL+taxonomy evidence |
| G12 | Scope cuts | ORCHESTRATOR_DEFAULT | web-now vs implement Electron/OS | **Web-now + desktop/Electron design seam.** Stub operator UI. No queues, no multi-tenant runtime, no xa11y | §3.7, §7, permission friction | Built Electron only after vertical slice |
| G13 | Brief ambiguities | ORCHESTRATOR_DEFAULT | listed below | Recorded; no silent grading policy | — | Human can reopen |

## Ambiguities in Project.md (resolved as defaults)

- No prescribed language/LLM/lib/target (§4) → modified Stack A + MemberDesk.
- Discovery must be real LLM live run (§4) → CLI `discover` supports `--mock` for CI and live OpenAI when `OPENAI_API_KEY` is set. Evidence for graders requires a live run later.
- Operator console mock OK (§3.6) → JSON/CLI operator; lease is real.
- Multi-tenant/desktop design-only (§3.7) → REPORT + `Surface` types.
- Time box self-imposed → thin-but-real every §3 item.

## Spend / API keys

- No API keys assumed in this environment.
- Scaffolding must `npm test` without a key.
- Live discovery is gated on `OPENAI_API_KEY`.
