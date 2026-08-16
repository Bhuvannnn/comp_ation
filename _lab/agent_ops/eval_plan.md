# Eval plan — vertical slice definition of done

How we know the core thread works before submission polish. Gates are **deterministic** (exit codes, schema validation, file existence) — not LLM self-judgment.

**Aligns to:** Project.md §3 (requirements), §6 (deliverables), [`locked_stack.md`](../decisions/locked_stack.md) grader commands.

---

## Quick green check (run every milestone)

```bash
cd /workspace
npm install
npx playwright install chromium
npm test
```

**Pass:** exit 0, no `OPENAI_API_KEY` required.

---

## Command matrix

| Check | Command | Pass condition |
|-------|---------|----------------|
| E0 Install | `npm install && npx playwright install chromium` | Clean exit |
| E1 Unit + FakeSurface | `npm test` | All tests green; replay taxonomy branches covered |
| E2 Mock discovery | `npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock` | Exit 0; `evidence/discovery/latest/run.jsonl` exists |
| E3 Schema | Validate latest `capability.json` against Zod / `npm test` artifact tests | Parses; has `schemaVersion`, steps, inputs, outputs, checkpoint |
| E4 Happy replay | `npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-happy.json` | `result.kind === "success"`; typed outputs present |
| E5 Business outcome | `npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json` | `result.kind === "business_outcome"`; not thrown exception |
| E6 No LLM in replay | `OPENAI_API_KEY=sk-fake npm test` + replay command | Replay still passes; no OpenAI client invoked (mock network or import guard) |
| E7 Policy | `npm test -- test/policy.test.ts` | Allowlist block + redaction snapshots pass |
| E8 HITL | `npm test -- test/hitl.test.ts` | Same `sessionId` after pause → mock operator → resume |
| E9 Live discovery | `npx tsx src/cli/index.ts discover --goal "..."` (with real key) | Exit 0; committed under `evidence/discovery/<runId>/` |
| E10 Playwright smoke | `npx playwright test` (if configured) | One live browser path green in CI |

---

## FakeSurface test requirements

`FakeSurface` implements `Surface` with fixture YAML/DOM snapshots — **no browser, no LLM**.

Minimum test files (per [`locked_stack.md`](../decisions/locked_stack.md)):

| Test file | Covers |
|-----------|--------|
| `test/artifact-schema.test.ts` | Zod round-trip; reject invalid / transcript-only payloads |
| `test/replay-taxonomy.test.ts` | **One case each:** `success`, `business_outcome`, `hard_failure`, `escalated` |
| `test/replay-happy.test.ts` | Outputs + checkpoint on happy path |
| `test/policy.test.ts` | Disallowed origin; redaction of secrets/PII patterns |
| `test/hitl.test.ts` | Lease transitions; act blocked while `human` holds lease |
| `test/discovery-mock.test.ts` | Mock loop completes; writes journal |

**Pass:** `npm test` runs all branches in &lt;30s on CI.

---

## Evidence files (committed for graders)

Project.md §6.3 expects discovery + replay + ideally one error replay.

```
evidence/
├── sample/
│   └── capability.json          # Synthetic sample for replay commands in README
├── discovery/
│   └── <runId>/                 # LIVE LLM run (not --mock)
│       ├── capability.json
│       ├── run.jsonl
│       └── screenshot.png       # optional
├── replay/
│   ├── happy/
│   │   ├── result.json
│   │   └── run.jsonl
│   └── not-found/               # or other exceptional state
│       ├── result.json
│       ├── run.jsonl
│       └── failure-snapshot.png # richer signal on failure (§3.5)
└── replay/
    └── hitl/                    # optional
        ├── intervention.json
        └── run.jsonl
```

### Evidence validation script (add in M8)

```bash
# package.json script: "eval:evidence"
node --test test/evidence-layout.test.ts
```

Checks:

- `evidence/discovery/*/` contains non-mock capability (metadata flag `discoveryMode: "live"`)
- `evidence/replay/not-found/result.json` has `kind: "business_outcome"`
- No file matches `/sk-[a-zA-Z0-9]{20,}/` or `.env` contents
- `capability.json` files validate against schema

---

## Replay result contract (assert in tests)

```typescript
// Terminal kinds only (ADR-005)
type ResultKind = "success" | "business_outcome" | "hard_failure" | "escalated";

// success → outputs object matching artifact.outputs schema
// business_outcome → code e.g. "member_not_found" + optional message
// hard_failure → step index, expected vs observed
// escalated → intervention id; session still live
```

Recoverable events appear in `run.jsonl` as `event: "recoverable"` — never as `result.kind`.

---

## README demo script (final acceptance)

Copy-paste block graders run (from Project.md §6.1):

```bash
git clone <repo> && cd <repo>
npm install && npx playwright install chromium
cp .env.example .env   # add OPENAI_API_KEY for live discover only

npm test

# 1) Discovery (mock for CI; live once for evidence)
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock

# 2) Happy replay
npx tsx src/cli/index.ts replay \
  --artifact evidence/sample/capability.json \
  --input fixtures/replay-happy.json

# 3) Exceptional state
npx tsx src/cli/index.ts replay \
  --artifact evidence/sample/capability.json \
  --input fixtures/replay-not-found.json
```

**Pass:** All three commands behave as README documents; `REPORT.md` has seven sections.

---

## Milestone → eval mapping

| Milestone | Minimum eval |
|-----------|----------------|
| M1 Surface | E0, E10 (smoke) |
| M2 Discovery | E2 |
| M3 Artifact | E3 |
| M4 Replay | E4, E6 |
| M5 Errors | E5 + FakeSurface taxonomy |
| M6 Safety | E7 |
| M7 HITL | E8 |
| M8 Submission | E9 + evidence layout + README demo + REPORT headings |

---

## What we do not gate on

- LLM-judge rubrics for prose quality
- Coverage percentages
- Electron/desktop implementation
- Multi-tenant runtime
- Stretch goals (§8) before core green

---

## Citations

- Grader commands: [`locked_stack.md`](../decisions/locked_stack.md) § "Commands graders run"
- Evidence requirement: [`Project.md`](../../Project.md) §6.3
- Error taxonomy: [`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md)
