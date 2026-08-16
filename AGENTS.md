# AGENTS.md

This repository is a computer-use take-home: **discover with an LLM → versioned artifact → deterministic replay (no LLM) → HITL lease → evidence**.

## Commands

```bash
npm install
npm test                 # node --test, no API key
npm run typecheck
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
npx tsx src/cli/index.ts escalate
```

Live discovery requires `OPENAI_API_KEY` and `--live-browser`.

## Seams

- `src/surface` — only Playwright import lives in `web.ts`
- `src/replay` — MUST NOT import `openai`
- `src/artifact` — Zod capability; no ephemeral refs
- `src/policy` — allowlist + redaction chokepoint
- `src/hitl` — SessionLease is the control-transfer model
- `_lab/` is gitignored research. Never commit it. Never put required deliverables only there.

## Do / don't

- Thin-but-real every Project.md §3 requirement; no queues/clusters.
- Terminal results: `success | business_outcome | hard_failure | escalated`. Recoverable is a journal event.
- Do not persist secrets/PII. Do not automate real banks.
