# Evidence

This folder is the graded demonstration pack (Project.md §6.3).

| Path | What belongs here |
|------|-------------------|
| `sample/capability.json` | Versioned capability artifact (no secrets, no ephemeral `ref=eN`) |
| `discovery/<runId>/run.jsonl` | Structured discovery journal |
| `discovery/<runId>/capability.json` | Artifact emitted from that run |
| `discovery/<runId>/result.json` | Terminal result |
| `replay/<runId>/` | Replay journals + `result.json` (include one `business_outcome`) |
| `hitl/<runId>/intervention.json` | Same-session pause/resume record |

Do not commit `.env`, screenshots with PII, or model API keys.

Committed sample pack:

| File | Contents |
|------|----------|
| `sample/capability.json` | Versioned capability |
| `sample/discovery.run.jsonl` / `discovery.result.json` | Mock discovery (no LLM) |
| `sample/discovery-live.run.jsonl` / `discovery-live.result.json` | Live LLM discovery (redacted copy; written by `--live-browser`) |
| `discovery/live/` | Same live pack (`run.jsonl` must contain `model_tool` events) |
| `sample/replay-happy.*` | Success + balance (prefer `--live-browser` journals) |
| `sample/replay-not-found.*` | `business_outcome: member_not_found` (prefer `--live-browser`) |
| `sample/replay-hard-failure.*` | `hard_failure: unexpected_state` + snapshot/`failure.png` (member `77777`; FakeSurface sample may be a stub PNG — prefer `--live-browser` for a real shot) |
| `sample/intervention.json` / `hitl.run.jsonl` | Same-session HITL mock |

```bash
npm test
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-hard-failure.json
npx tsx src/cli/index.ts escalate
```
