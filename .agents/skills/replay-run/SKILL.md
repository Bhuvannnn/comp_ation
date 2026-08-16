# Replay run

`npx tsx src/cli/index.ts replay --artifact <capability.json> --input fixtures/replay-happy.json`

No LLM. Expect `success` or `business_outcome` (`member_not_found`). Hard failures write a screenshot when possible.

Also run `fixtures/replay-not-found.json`.
