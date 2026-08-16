# Start here (local Cursor)

Recommended approaches are **accepted**. Continue in **local Cursor Agent**, not a Cloud Agent.

## Once on your machine

1. GitHub Desktop → Fetch → branch `cursor/full-lab-and-scaffold-d23a`
2. `npm install` then `npm test`
3. Work tickets in order: `_lab/agent_ops/TICKETS.md`

## How to use multiple agents (simple)

Do **not** paste one giant prompt. Do **not** run several implementers on the same files at once.

| Chat | Who | What you type |
|------|-----|----------------|
| 1 | Agent (Composer or GPT) | `Do the next open ticket. Read _lab/agent_ops/TICKETS.md.` |
| 2 | **Different** model (Claude or Grok) | `Review the last ticket only. Don’t add features. Run npm test.` |
| 3 | Same as chat 1 | `Do the next open ticket.` |

Repeat until T8. One ticket per chat. Tests every time.

Skills already in the repo (Agent will pick them up): discover-run, replay-run, hitl-handoff, write-report, package-evidence, **next-ticket**.

## The only extra thing you must provide

An OpenAI key in `.env` for **T1** (the one real discovery run the assignment requires). Everything else can stay mock until then.

Questions you already approved: `_lab/decisions/open_questions.md`.


## Run without a key

```bash
npm install
npm test
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
npx tsx src/cli/index.ts escalate
```
