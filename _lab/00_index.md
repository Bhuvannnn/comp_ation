# Lab index — reading order for agents

Source of truth: `/workspace/Project.md` (assignment brief).
This directory is gitignored research/planning. Submission surfaces are `/README.md`, `/REPORT.md`, `/evidence/`, and production source.

## Fixed order

1. Multi-model research into `_lab/research/`
2. Adversarial cross-review (`_lab/reviews/`)
3. Human gates (`_lab/decisions/open_questions.md`)
4. Docs/PRD from research (`product/`, `architecture/`, `agent_ops/`)
5. Scaffolding (repo + Cursor/Codex tooling)

**Hard rule:** Do not write `product/PRD.md`, architecture docs (except open questions), or scaffolding until `research/_RESEARCH_COMPLETE.md` exists.

## Reading order

| Order | Path | Purpose |
|------:|------|---------|
| 0 | `/workspace/Project.md` | Brief. Read fully first. |
| 1 | `_lab/PROMPT.md` | Orchestration master prompt |
| 2 | `_lab/research/model_council.md` | Agent/model assignments, substitutions, reviews |
| 3 | `_lab/research/brief_decomposition.md` | Sections 1–11 → requirements / eval |
| 4 | `_lab/research/frontier_computer_use.md` | Labs, CUA, web mechanisms |
| 5 | `_lab/research/os_desktop_electron.md` | OS a11y, Electron, desktop |
| 6 | `_lab/research/tech_stack.md` | Full stack matrix + top 3 |
| 7 | `_lab/research/agent_native_workflows.md` | Cursor / Codex / AGENTS.md |
| 8 | `_lab/research/alternatives_matrix.md` | ≥4 end-to-end architectures |
| 9 | `_lab/research/non_viable.md` | Anti-patterns |
| 10 | `_lab/research/_RESEARCH_COMPLETE.md` | Gate file before PRD |
| 11 | `_lab/reviews/*` | Cross-model reviews |
| 12 | `_lab/decisions/open_questions.md` | Human gates + orchestrator defaults |
| 13 | `_lab/decisions/ADR-*.md` + `locked_stack.md` | Locked decisions |
| 14 | `_lab/product/PRD.md` | Implementable requirements |
| 15 | `_lab/architecture/*` | Seams, schema, graph — read in the order below |
| 15a | `architecture/system_overview.md` | Boxes, five seams, dependency rules |
| 15b | `architecture/artifact_schema.md` | Zod schema, locator union, versioning, overlays |
| 15c | `architecture/replay_and_errors.md` | Determinism, waits, ADR-005 taxonomy |
| 15d | `architecture/safety_and_policy.md` | Allowlist, risk gating, redaction |
| 15e | `architecture/hitl_control_transfer.md` | Lease model per ADR-004 |
| 15f | `architecture/heterogeneity_multitenant.md` | `Surface`, base + tenant overlay (design-only §3.7) |
| 15g | `architecture/agent_graph.md` | Custom state machine: nodes, edges, gates |
| 16 | `_lab/agent_ops/*` | Build playbook for coding agents |
| 17 | `_lab/READY_TO_BUILD.md` | Handoff to implementer |

## Submission vs lab

| In git (submission) | Gitignored (`_lab/`) |
|---------------------|----------------------|
| `README.md`, `REPORT.md`, `evidence/`, `src/` (or equiv) | research, PRD drafts, ADRs, reviews |
| `.cursor/rules`, `.cursor/skills`, `AGENTS.md` | exploration notes |
| `.env.example` | secrets, traces, scratch |

## Status

- Phase 1A research: complete (`research/_RESEARCH_COMPLETE.md`, reviews, ADR-001…005, `locked_stack.md`)
- Phase 1B docs: architecture set complete (7 docs, §15a–g). The Zod draft in `artifact_schema.md`
  is compile-checked against zod 4.x and its example fragments parse, so it can be transcribed as-is.
- Phase 2 scaffolding: complete (`src/`, CLI, tests, `README.md`, `REPORT.md`, `evidence/sample/`)
