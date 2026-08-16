# Locked stack (orchestrator default after research)

**Status:** ORCHESTRATOR_DEFAULT — human may override G3/G5/G6/G10.  
**Sources:** `tech_stack.md` Stack A, `reviews/reviewer_pass_1.md` MODIFY verdict, `reviews/dx_and_desktop_review.md`, `research/_RESEARCH_COMPLETE.md`.  
**Date:** 2026-08-16.

## Exact intent (packages)

| Layer | Lock | Version intent | Do not |
|-------|------|----------------|--------|
| Language | TypeScript | `typescript` ~5.x, Node ≥20 | Native type-stripping as a design constraint |
| Package manager | npm | commit `package-lock.json` | pnpm/bun unless human says so |
| Layout | single package | `src/` modules below | monorepo |
| LLM | `openai` official SDK | Responses API + custom tools | built-in `type: computer` as the product; `computer-use-preview` |
| Discovery model | env `DISCOVERY_MODEL` | default `gpt-5.6-terra` | bake model into capability artifact |
| Automation | `playwright` + `@playwright/test` | **pin 1.62.1** | `ariaSnapshotJSON()` (1.63 unreleased as of research); Selenium; Puppeteer |
| Observe | `page.ariaSnapshot({ mode: "ai", boxes: true })` | YAML to model | persist `ref=eN` into artifacts |
| Replay locators | Playwright `getByRole` / `getByLabel` / `getByText` + frame path + optional CSS fallback | compiled at record time | coordinate-only replay |
| Orchestration | custom loop + replay state machine | one process | LangGraph, Temporal, Inngest, queues |
| Schema | `zod` | JSON files | protobuf, YAML-canonical |
| Persistence | filesystem | `capabilities/`, `evidence/` | SQLite/Postgres |
| CLI | `commander` + `tsx` | `discover` `replay` `escalate` `resume` | oclif |
| Logs | structured JSON / JSONL | pino optional; start with JSONL writer | OpenTelemetry as primary evidence |
| Tests | `node --test` + one Playwright smoke | FakeSurface fixtures | coverage theater |
| Target | local MemberDesk HTTP fixture | `fixtures/memberdesk/` | real banks; ToS-bound public sites as required path |
| HITL | `SessionLease` + same context | mock operator in tests | headed-window as the only path |
| Desktop | types + REPORT | — | xa11y, nut.js, PyAutoGUI, OS injection |

## Module seams (implement these paths)

```
src/
  surface/          WebSurface implements Surface; electron.ts / desktop.ts stubs
  discovery/        observe → decide → act loop (LLM or mock)
  artifact/         Zod schema, serialize, compile locators
  replay/           interpreter, waits, taxonomy
  policy/           allowlist, risky actions, redaction
  hitl/             lease, intervention request, resume
  evidence/         journal + screenshots writer
  cli/              commander entry
  target/           MemberDesk static/server (or fixtures/)
```

## Commands graders run

```bash
npm install
npx playwright install chromium
cp .env.example .env   # optional key
npm test               # no key required
npx tsx src/cli/index.ts discover --goal "..." --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-found.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
```
