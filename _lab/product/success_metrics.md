# Success metrics

Treat success as grader-verifiable evidence, not feature count or self-reported completion. All release gates below are binary unless explicitly marked optional. [Project.md §§6–7; brief decomposition §§3, 7]

## Demo readiness checklist

| ID | Pass condition | Required evidence/path | Related requirements |
|---|---|---|---|
| DEMO-01 | A clean checkout installs with npm, installs Chromium, and runs tests without a model key. | `/README.md`, `package-lock.json`, passing `npm test` output | Project.md §6.1; CU-33-01 |
| DEMO-02 | `discover --mock` exercises the offline harness, while a separately identified genuine OpenAI run proves model-driven observe → decide → act against rendered MemberDesk. | `/README.md`; `/evidence/` live discovery JSONL and sanitized rich signal | Project.md §§3.1, 4, 6.3; CU-31-01–04 |
| DEMO-03 | Successful discovery emits a Zod-valid, typed, versioned, reviewable JSON capability compiled from the run. | `/evidence/sample/capability.json` plus provenance link | Project.md §3.2; CU-32-01–07 |
| DEMO-04 | Replay succeeds with a known synthetic member while model credentials are absent and returns only declared typed outputs after checkpoint verification. | `/evidence/` successful replay log/result | Project.md §3.3; CU-33-01–04 |
| DEMO-05 | Replay with the not-found fixture returns `business_outcome/member_not_found`, not an exception or hard failure. | `/evidence/` not-found replay log/result | Project.md §3.3; CU-33-04–05 |
| DEMO-06 | One injected interstitial/transient condition produces a bounded recovery journal event and continuation; exhaustion has a tested hard-failure path. | `/evidence/` exceptional replay or deterministic test output | Project.md §3.3; CU-33-06–07 |
| DEMO-07 | One hard failure stops at the correct step and includes sanitized expected/observed detail plus a screenshot reference. | `/evidence/` failure result, JSONL, screenshot | Project.md §§3.3, 3.5; CU-33-07, CU-35-02 |
| DEMO-08 | A disallowed target/action is rejected before execution, and a risky action blocks or escalates. | Policy tests and replay/discovery event | Project.md §3.4; CU-34-01–02 |
| DEMO-09 | A repository/evidence scan and tests find no secrets, credentials, tokens, full PII, raw sensitive invocation values, or persisted ephemeral refs. | Redaction tests and sanitation check record | Project.md §§3.4, 9; CU-34-03 |
| DEMO-10 | HITL proves pause, contextual intervention, unchanged BrowserContext, human ownership/action, automation rejection while human-owned, resume, and re-observation. | `/evidence/` intervention, lease/operator journal, terminal result | Project.md §3.6; CU-36-01–05 |
| DEMO-11 | One exercised `Surface` boundary supports WebSurface; desktop and tenant reuse are accurately covered as design seams, not claimed implementations. | Tests/types and `/REPORT.md` | Project.md §3.7; CU-37-01–03 |
| DEMO-12 | The exact grader commands are copied into README and run in documented order. | `/README.md` demo section | Project.md §6.1; locked stack “Commands graders run” |

Required command baseline:

```bash
npm install
npx playwright install chromium
cp .env.example .env   # optional key
npm test               # no key required
npx tsx src/cli/index.ts discover --goal "..." --mock
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-found.json
npx tsx src/cli/index.ts replay --artifact evidence/sample/capability.json --input fixtures/replay-not-found.json
```

Do not release if the only discovery evidence used `--mock`, replay contacted an LLM for decisions, or HITL used a new session. [Project.md §§3.3, 3.6, §4; brief decomposition §8]

## Section 6 deliverable checklist

### DELIV-6.1 — repository and README

- [ ] Keep source code in the public repository.
- [ ] Put setup and run instructions in `/README.md`.
- [ ] Document Node/npm/Playwright setup and every required environment variable/key without committing values.
- [ ] Explain the no-key/offline path.
- [ ] Provide exact commands for genuine discovery and deterministic replay in sequence.
- [ ] Make the documented commands match the implemented CLI and the locked command baseline.

**Pass metric:** a reviewer can clone, install, test offline, and identify the live discovery/replay path without reverse-engineering code. [Project.md §6.1; brief decomposition §7]

### DELIV-6.2 — report

- [ ] Create `/REPORT.md` at approximately 1–3 pages.
- [ ] Use exactly these seven top-level headings, in this order:
  1. `Architecture`
  2. `Artifact schema`
  3. `Determinism & error handling`
  4. `Heterogeneity & multi-tenant`
  5. `Escalation & handoff`
  6. `Safety`
  7. `Cuts`
- [ ] Explain key decisions and trade-offs rather than listing frameworks.
- [ ] Explain the schema, targeting/waits/checkpoints, runtime taxonomy, surface seam, tenant reuse/drift, same-session lease, redaction/policy limits, deliberate cuts, and next extensions.
- [ ] Do not claim desktop, tenant runtime, polished operator UI, or production-scale infrastructure was built.

**Pass metric:** all seven exact headings are present and each answers its Project.md §6.2 prompt with claims supported by code/evidence. [Project.md §6.2; brief decomposition §7]

### DELIV-6.3 — evidence

- [ ] Create `/evidence/`.
- [ ] Commit a saved schema-valid example artifact.
- [ ] Commit sanitized logs from one genuine LLM discovery run.
- [ ] Commit sanitized logs/result from successful model-free replay.
- [ ] Commit sanitized logs/result from not-found replay.
- [ ] Include one recoverable or hard exceptional replay; include both when feasible under the core plan.
- [ ] Include at least one sanitized screenshot on failure/ambiguity.
- [ ] Include HITL intervention, ownership transitions, operator action, and resume evidence.
- [ ] Correlate files using run ID, capability/version, and step IDs.
- [ ] Keep any screen recording optional.

**Pass metric:** evidence alone demonstrates the causal thread from genuine discovery to compiled artifact to deterministic replay, exceptional behavior, and same-session handoff without exposing sensitive data. [Project.md §6.3; brief decomposition §§5, 7]

## Section 7 evaluation checklist

Use this order for implementation and review triage; it preserves the assignment’s approximate ranking. Do not trade a higher-ranked incomplete criterion for lower-ranked polish. [Project.md §7; brief decomposition §3]

### EVAL-01 — system design

- [ ] Keep clear boundaries among `surface`, `discovery`, `artifact`, `replay`, `policy`, `hitl`, `evidence`, `cli`, and target fixture modules.
- [ ] Make the artifact schema and invocation/result contract explicit, typed, versioned, and reviewable.
- [ ] Keep the architecture single-process and filesystem-backed.
- [ ] State trade-offs and limits in `/REPORT.md`.

**Pass metric:** a reviewer can explain where model decisions stop, where the reusable capability begins, and where every action is gated. [Project.md §7 “System design”; ADR-001]

### EVAL-02 — correctness of the core loop

- [ ] Prove a genuine model completes one real UI goal.
- [ ] Prove the successful trajectory emits the saved capability.
- [ ] Prove replay completes without model decisions.
- [ ] Verify terminal success through an observable checkpoint and typed output.

**Pass metric:** DEMO-02 through DEMO-04 pass with correlated evidence. [Project.md §7 “Correctness of the core loop”]

### EVAL-03 — robustness and error handling

- [ ] Resolve stable ranked semantic locators and reject ambiguity.
- [ ] Use condition-based bounded waits rather than fixed sleeps as the only strategy.
- [ ] Distinguish `business_outcome`, in-run recovery events, `hard_failure`, and `escalated`.
- [ ] Demonstrate not-found, one bounded recovery, and one hard failure.
- [ ] Include step, expected, observed, and evidence reference on failure.

**Pass metric:** DEMO-05 through DEMO-07 pass, and no code path blindly proceeds after an unknown state. [Project.md §7 “Robustness & error handling”; ADR-002; ADR-005]

### EVAL-04 — human-in-the-loop escalation

- [ ] Detect and route one stuck/risky state with sufficient context.
- [ ] Keep the original live browser context open.
- [ ] Enforce explicit lease ownership on every actuator.
- [ ] Record manual actions and control transitions.
- [ ] Re-observe and validate before resume.

**Pass metric:** DEMO-10 passes; a TODO, approval-only flag, or fresh session is an automatic failure. [Project.md §7 “Human-in-the-loop escalation”; ADR-004]

### EVAL-05 — generalization to the real environment

- [ ] Keep logical artifact actions separate from Playwright-specific bindings.
- [ ] Exercise `WebSurface` and type the Electron/OS seams without adding native dependencies.
- [ ] Explain vendor-level capability identity, tenant/version bindings, compatibility checks, drift signals, bounded overrides, and re-record criteria.
- [ ] Avoid test-ID-only, coordinate-only, and copy-per-tenant designs.

**Pass metric:** DEMO-11 passes and `/REPORT.md` gives a credible design without premature infrastructure. [Project.md §7 “Generalization to the real environment”; §3.7]

### EVAL-06 — safety and data handling

- [ ] Enforce target/route/action allowlists at the shared actuator boundary.
- [ ] Classify risk explicitly and escalate/block risky actions.
- [ ] Redact artifacts, logs, screenshots, traces, errors, and interventions before persistence.
- [ ] Use only local synthetic data and keep secrets out of Git.

**Pass metric:** DEMO-08 and DEMO-09 pass, including negative policy tests. [Project.md §7 “Safety & data handling”; §3.4]

### EVAL-07 — code quality

- [ ] Keep TypeScript reasonably typed and Zod contracts explicit.
- [ ] Test schema, compiler, replay taxonomy, policy/redaction, lease state machine, FakeSurface paths, and one Playwright smoke.
- [ ] Keep setup and CLI behavior simple.
- [ ] Commit `package-lock.json`; pin Playwright 1.62.1.
- [ ] Avoid generated bulk and coverage theater.

**Pass metric:** clean install and `npm test` pass without a key; core contracts have behavioral tests. [Project.md §7 “Code quality”; locked stack]

### EVAL-08 — communication

- [ ] Keep README commands exact.
- [ ] Keep REPORT concise and use exact headings.
- [ ] Link claims to evidence.
- [ ] Name deliberate cuts and next steps.
- [ ] Disclose mocks and design-only seams.

**Pass metric:** a reviewer can reproduce the demo and distinguish implemented, mocked, designed, and cut scope. [Project.md §7 “Communication”; §6]

## Release blockers

Any one of these blocks a “ready” status:

- Genuine discovery evidence is absent, scripted, or mock-only.
- Replay uses an LLM to decide an action.
- The artifact is a raw transcript/script or lacks any Project.md §3.2 must-have.
- Not-found is conflated with success/failure, recovery is unbounded, or unknown state proceeds blindly.
- Policy is configuration-only and bypassable.
- Secrets/full PII/raw sensitive evidence are persisted.
- HITL cannot operate and resume the same live session under exclusive ownership.
- `/README.md`, `/REPORT.md`, `/evidence/`, exact report headings, or exact runnable commands are missing.
- Scope was spent on queues, clusters, multi-tenant plumbing, MCP, or desktop implementation while a core gate remained incomplete.

[brief decomposition §8; Project.md §§3–7]

## Explicitly non-metrics

Do not optimize for feature count, framework count, line count, coverage percentage without behavioral value, queues/clusters, tenant provisioning, or UI polish. The assignment explicitly rewards a small, correct, coherent system and does not reward breadth or infrastructure theater. [Project.md §7; brief decomposition §3]
