---
description: Start the next sequential ticket
---

# Next ticket

1. `git checkout main` and `git pull` if needed. Create `feature/<ticket-id>` if you are not already on a feature branch (example: `feature/t2-compile-artifact`). Never use `cursor/` in the branch name.
2. Read `_lab/agent_ops/TICKETS.md`.
3. Do **only** the first ticket that is not `[x]`.
4. Follow `AGENTS.md` (no LLM in replay, no secrets, no queues).
5. Run `npm test` and `npm run typecheck`.
6. Stop. Summarize: what changed, how to run it, what ticket is next.

Do not start two tickets in one chat.
