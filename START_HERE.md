# Start here

This branch includes **everything**: submission code **and** the `_lab/` research/planning tree (normally gitignored).

The take-home graders should see `README.md`, `REPORT.md`, `evidence/`, and `src/` — not `_lab/`. Use this branch to review decisions; strip `_lab/` before the public assignment repo if you follow the original brief.

## Read in this order (about 30–45 minutes)

| # | File | Why |
|---|------|-----|
| 1 | `Project.md` | The assignment |
| 2 | `_lab/00_index.md` | Map of all lab docs |
| 3 | `_lab/research/_RESEARCH_COMPLETE.md` | Research gate + citations |
| 4 | `_lab/decisions/open_questions.md` | **Simple questions for you** (skip if you like the defaults) |
| 5 | `_lab/decisions/locked_stack.md` | Packages we implemented |
| 6 | `_lab/product/PRD.md` | What to build |
| 7 | `README.md` + `REPORT.md` | How to run + design write-up |

Deeper (optional): `_lab/architecture/` then `_lab/agent_ops/implementation_playbook.md`.

## What you must do

1. **Read `_lab/decisions/open_questions.md`.** It is 8 short questions. If you agree with the recommended answers, you can ignore them. The only one that usually needs you: **Q5 (API key)**.
2. **For the one required live AI demo** (graders want this):
   - `cp .env.example .env` and set `OPENAI_API_KEY`
   - `npx playwright install chromium`
   - `npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --live-browser`
3. No other secrets. Do not use real bank systems or real PII.

## Run without a key

```bash
npm install
npm test
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
npx tsx src/cli/index.ts escalate
```
