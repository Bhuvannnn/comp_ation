# Start here (local Cursor)

Work from **`main`**. For each ticket, make a normal feature branch (`feature/t1-live-discovery`, not `cursor/...`).

## Once on your machine

1. GitHub Desktop → **Fetch origin** → switch to **`main`**
2. `npm install` then `npm test`
3. Tickets: `_lab/agent_ops/TICKETS.md`

## Git (keep it boring)

```bash
git checkout main
git pull origin main

# one branch per ticket
git checkout -b feature/t1-live-discovery
# ... agent does the ticket, tests pass ...
git add -A
git commit -m "T1: live discovery evidence"
git checkout main
git merge feature/t1-live-discovery
```

Then the next ticket: `git checkout -b feature/t2-compile-artifact` off **updated** `main`.

## How to use multiple agents

Do **not** paste one giant prompt. **Not** several implementers on the same files at once.

| Chat | Model | What you type |
|------|--------|----------------|
| 1 | Composer or GPT | `Do the next open ticket. Read _lab/agent_ops/TICKETS.md.` |
| 2 | Different model (Claude or Grok) | `Review the last ticket only. Don’t add features. Run npm test.` |
| 3 | Same as chat 1 | `Do the next open ticket.` |

One ticket per chat. `npm test` every time.

## The only extra thing you provide

OpenAI key in `.env` for **T1**. Never commit `.env`.

## Run without a key

```bash
npm install
npm test
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
npx tsx src/cli/index.ts escalate
```
