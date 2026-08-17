# Computer-use automation (take-home)

LLM **discovers** a flow on a live UI once. The run compiles to a **versioned capability artifact**. **Deterministic replay** invokes that capability with **no model in the decision loop**. A **session lease** lets a human take the same live session and hand it back.

Proxy target: **MemberDesk**, a local hostile-ish HTML servicing console (tables, iframe, no test IDs, synthetic members only). Not a bank. No real PII.

## Setup

```bash
npm install
npx playwright install chromium   # only needed for --live-browser / surface-smoke
cp .env.example .env              # optional: OpenAI, Groq, or local Ollama (see below)
```

`npm test` does **not** need an API key or Chromium.

Live discovery (T1) can use a **local Ollama model** (no paid key): `brew install ollama`, `ollama serve`, `ollama pull qwen2.5:3b`, then copy `.env.example` → `.env`. Groq’s free tier also works (`OPENAI_BASE_URL=https://api.groq.com/openai/v1`).

## Demo path

```bash
# 1) Discovery (mock / CI — still produces a real artifact + journal)
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock

# 1b) Live LLM discovery against Chromium (Ollama local or OPENAI_API_KEY)
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their current savings balance" --live-browser
# writes a redacted journal to evidence/discovery/live/run.jsonl (also copied to evidence/sample/discovery-live.run.jsonl)

# 2) Deterministic replay — success + typed outputs
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json

# 3) Exceptional replay — unknown member is a business outcome, not a crash
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json

# 4) Hard failure — unexpected confirmation dialog (member 77777)
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-hard-failure.json

# 5) HITL: pause same session → mock operator → resume
npx tsx src/cli/index.ts escalate
```

Live-browser replay (Playwright + MemberDesk — not FakeSurface):

```bash
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json --live-browser
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json --live-browser
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-hard-failure.json --live-browser
```

Those commands write journals under `evidence/replay/<runId>/` and refresh `evidence/sample/replay-happy.*` / `replay-not-found.*` / `replay-hard-failure.*` (happy/not-found prefer `"mode":"live-browser"` on `replay_start`).

## Tests

```bash
npm test
npm run typecheck
```

## Layout

| Path | Seam |
|------|------|
| `src/surface/` | `Surface` (Web implemented; Electron/OS stubs) |
| `src/discovery/` | observe → decide → act (Chat Completions tools or `--mock`) |
| `src/artifact/` | Zod capability schema + compiler |
| `src/replay/` | interpreter — **must not import `openai`** |
| `src/policy/` | allowlist + redaction |
| `src/hitl/` | `SessionLease` + intervention JSON |
| `src/graph/` | custom state-machine edge tables (not LangGraph) |
| `src/target/memberdesk/` | local fixture |
| `config/policy.json` | domain/action allowlist |
| `REPORT.md` | design write-up |

## Safety

- Actions are allowlisted (`config/policy.json`).
- Irreversible `submit_irreversible` escalates.
- Journals redact secret-like keys and long digit runs.
- Discovery spend cap: `DISCOVERY_MAX_USD` (default $2/run).
