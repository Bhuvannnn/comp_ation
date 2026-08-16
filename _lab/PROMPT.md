# Master Prompt — Computer-Use Take-Home: Research → Docs → Scaffolding

Source of truth: `/workspace/Project.md`. All exploration artifacts under `/_lab/` (gitignored). Submission surfaces: `/README.md`, `/REPORT.md`, `/evidence/`, production source.

**Order is fixed:** multi-model research into `/_lab/research/` → adversarial cross-review → human gates → docs/PRD from that research → scaffolding.

## Hard constraints

- Real LLM-driven discovery against a live surface; evidence under `/evidence/`.
- Discover → structured versioned artifact → deterministic replay without LLM in the decision loop.
- Error taxonomy: business outcome vs recoverable vs hard failure.
- Safety allowlist + redaction (no secrets/PII in artifacts/logs).
- HITL: pause same live session → human acts → resume; mock operator UI OK, real control-transfer model.
- Design for heterogeneity & multi-tenant in write-up; implement against one concrete surface.
- Prefer thin-but-real versions of every Section 3 requirement over a polished subset.
- No real bank systems; respect site ToS; no real credentials/PII.
- `_lab/` is research-only and must stay gitignored.

## Mandatory multi-model council

Use real subagents with separate contexts and at least three distinct model families. Do not silently downgrade.

Preferred council (master prompt) vs this environment: `gpt-5.6-sol-medium` is **unavailable**; substituted with `gpt-5.6-sol-high` (disclosed in `research/model_council.md`).

## Research Coverage Checklist

See `research/_RESEARCH_COMPLETE.md` (written only after A–G are documented).

Required files before leaving research:

- `research/brief_decomposition.md`
- `research/model_council.md`
- `research/frontier_computer_use.md`
- `research/os_desktop_electron.md`
- `research/tech_stack.md`
- `research/agent_native_workflows.md`
- `research/alternatives_matrix.md`
- `research/non_viable.md`
- `research/_RESEARCH_COMPLETE.md`

Do not write PRD/architecture/scaffolding until `_RESEARCH_COMPLETE.md` exists.

## Human gates

Required before stack lock / scaffolding. Listed in `decisions/open_questions.md`.

## Definition of done

A coding agent can take over and implement a testable vertical slice without re-researching from scratch. `_lab/` remains gitignored; no secrets committed.
