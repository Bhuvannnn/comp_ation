# Agent-native delivery workflows (Cursor + Codex + lab practices)

**Researcher:** Agent-Native Product Researcher (`composer-2.5`)  
**Access date:** 2026-08-16  
**Sources:** Official Cursor docs, OpenAI Codex docs, AGENTS.md site, Agent Skills standard, public playbooks. Model output is not a source.

---

## Thinking protocol (for downstream agents)

Use this block before implementing or editing agent instructions:

1. **Read order:** `/workspace/Project.md` → submission paths only (`README.md`, `REPORT.md`, `/evidence/`, production source) → root `AGENTS.md` (when scaffolded) → scoped `.cursor/rules/*.mdc` → relevant `.cursor/skills/*/SKILL.md` or `.agents/skills/*/SKILL.md`.
2. **Single source of truth:** Cross-tool norms live in root `AGENTS.md`. Cursor-only scoping lives in `.mdc` rules. Workflows live in skills. Do not duplicate the same paragraph in three places.
3. **Lab boundary:** `_lab/` is gitignored research/planning. Never put required deliverables only in `_lab/`. PRD and playbooks may live in `_lab/` during research but submission surfaces must mirror what graders read.
4. **Verify before claiming done:** Run the project’s lint/test commands from `AGENTS.md`. For discovery/replay milestones, produce artifacts under `/evidence/` with structured logs—not model transcripts alone.
5. **Attribution:** Multi-model council work is recorded in `_lab/reviews/` with author model, reviewer model, and verdict. Implementation commits use normal git authorship; optional `Co-authored-by` / `Generated-By` trailers for agent runs.
6. **No overbuild:** Thin-but-real for every Section 3 requirement beats polished subsets. Agent instructions must reinforce depth on artifact schema, replay contract, safety, HITL—not premature infra.
7. **When instructions conflict:** Explicit user chat > nearest nested `AGENTS.md` / `AGENTS.override.md` > parent `AGENTS.md` > global `~/.codex/AGENTS.md` (Codex) / Cursor User Rules. Cursor Team Rules precede Project Rules when both apply ([Cursor Rules](https://cursor.com/docs/rules), accessed 2026-08-16).

---

## E. Agent-native delivery

### E.1 How AI-native teams structure the loop (2025–2026)

Modern teams treat **spec → eval → implement → verify** as one bounded loop, not “prompt until it compiles.”

| Layer | Purpose | Typical artifacts | Viability for this take-home |
|-------|---------|-------------------|------------------------------|
| **Product spec / PRD** | Numbered acceptance criteria; each mappable to pass/fail | `_lab/product/PRD.md` (pre-submission); mirrors grader checklist from `Project.md` §3 | **Viable for this take-home** |
| **Agent instructions** | Persistent norms: commands, seams, boundaries | Root `AGENTS.md` + scoped rules/skills | **Viable for this take-home** |
| **Evals / gates** | Deterministic checks before “done” | CLI smoke tests, artifact schema validation, replay exit codes, evidence folder layout | **Viable for this take-home** |
| **Multi-model council** | Research + adversarial review before lock | `_lab/research/*`, `_lab/reviews/*`, `model_council.md` | **Viable for this take-home** (already in `_lab/PROMPT.md`) |
| **Golden-PR replay / traceAI** | Weekly agent regression on last N merged PRs | CI harness, git notes, line-level attribution | **Viable only as design story** (out of scope for take-home time box) |
| **Enterprise provenance (agentdiff, Ink, AgentBlame)** | Line-level signed attribution in git notes | `.git/agentdiff/`, `refs/notes/*` | **Not viable / avoid** (heavy; optional mention in REPORT.md only) |

**PRD → build loop (recommended for this repo):**

```mermaid
flowchart LR
  A[Project.md + research] --> B[_lab/product/PRD.md]
  B --> C[Human gates / locked_stack]
  C --> D[AGENTS.md + rules + skills scaffold]
  D --> E[Vertical slice implementation]
  E --> F[Deterministic evals: lint test schema replay]
  F --> G[/evidence/ + REPORT.md]
  G --> H[Cross-model review optional]
  H --> I[Public submission]
```

Practices aligned with 2026 literature:

- **Acceptance criteria as contract:** Each PRD item should be convertible to a check (command exit code, schema validator, file exists, replay result enum). Criteria missing a measurable pass condition are rewritten, not built ([Pondero spec-driven guide](https://pondero.ai/enterprise/guides/spec-driven-agent-development/), accessed 2026-08-16). **Viable for this take-home**
- **Bounded loops:** Cap iterations/tokens; human owns merge ([Loiane AI loop engineering](https://loiane.com/2026/08/ai-loop-engineering-github-pr-claude-code/), accessed 2026-08-16). **Viable for this take-home**
- **Verification gate > model self-assessment:** Tests and structured replay results beat “looks good” ([Mehul Jain implementation guide](https://www.jainmehul.com/guides/ai-coding-agents), accessed 2026-08-16). **Viable for this take-home**

**Project.md §5 alignment:** AI-assisted development is assumed; graders weight judgment and integration (artifact schema, replay, safety, HITL) over raw throughput. Agent ops should **accelerate the vertical slice**, not substitute for real discovery evidence in `/evidence/`.

---

### E.2 Cursor rules, skills, subagents, hooks (current conventions)

Official Cursor documentation (accessed 2026-08-16) defines four instruction types: **Project Rules**, **User Rules**, **Team Rules**, and **`AGENTS.md`** ([Cursor Rules](https://cursor.com/docs/rules)).

#### Project rules — `.cursor/rules/*.mdc`

| Fact | Detail | Source |
|------|--------|--------|
| Location | **Mandatory** `.cursor/rules/`; files ignored elsewhere | [Cursor Rules](https://cursor.com/docs/rules), [forum confirmation](https://forum.cursor.com/t/is-the-cursor-rules-directory-mandatory-for-all-rule-types/132662) |
| Extension | `.mdc` only; plain `.md` in this folder is **ignored** | [Cursor Rules](https://cursor.com/docs/rules) |
| Legacy | Root `.cursorrules` deprecated; migrate to `.mdc` | [Cursor forum](https://forum.cursor.com/t/project-rule-in-cursorrules-not-applied-in-agent-chat-works-in-cursor-rules/154309/3) |
| Precedence | Team Rules → Project Rules → User Rules | [Cursor Rules](https://cursor.com/docs/rules) |
| Size | Keep under ~500 lines; split composable rules | [Cursor Rules](https://cursor.com/docs/rules) |

**Frontmatter activation matrix** (from official docs):

| `alwaysApply` | `description` | `globs` | Behavior |
|:--|:--|:--|:--|
| `true` | — | — | Always included |
| `false` | — | set | Auto-attached when matching files in context |
| `false` | set | omitted | Agent pulls when description matches |
| `false` | omitted | omitted | Manual `@rule` only |

**Creation:** `/create-rule` in Agent chat, or **Customize → Rules → Add Rule** ([Cursor Rules](https://cursor.com/docs/rules)).

**Viability:** Scoped `.mdc` rules for implementation paths — **Viable for this take-home**. Huge `alwaysApply: true` catch-alls — **Not viable / avoid**.

#### Agent skills — `.cursor/skills/` and `.agents/skills/`

Skills follow the **Agent Skills open standard** ([Cursor Skills](https://cursor.com/docs/skills), [agentskills.io](https://agentskills.io) referenced from docs, accessed 2026-08-16).

| Location | Scope |
|----------|--------|
| `.cursor/skills/` | Project (Cursor) |
| `.agents/skills/` | Project (cross-tool) |
| `~/.cursor/skills/`, `~/.agents/skills/` | User global |
| Nested e.g. `src/foo/.cursor/skills/` | Auto-scoped to subtree |
| Compatibility | Also loads `.codex/skills/`, `.claude/skills/` for migration | [Cursor Skills](https://cursor.com/docs/skills) |

**SKILL.md required frontmatter:**

```yaml
---
name: skill-folder-name   # must match folder name; lowercase + hyphens
description: When to use; include trigger words and anti-triggers
paths: "**/*.py"          # optional glob scope (prefer `paths`; `globs` legacy)
disable-model-invocation: true  # optional: slash-only invocation
---
```

Optional dirs: `scripts/`, `references/`, `assets/`. Built-ins include `/create-skill`, `/migrate-to-skills`, `/review`, `/create-subagent` ([Cursor Skills](https://cursor.com/docs/skills)).

**Migration:** Dynamic “Apply Intelligently” rules (no globs) → skills via `/migrate-to-skills`. Rules with `alwaysApply: true` or globs stay as rules ([Cursor Skills](https://cursor.com/docs/skills)).

**Viability:** Workflow skills (discover run, replay run, package evidence) — **Viable for this take-home**. Converting everything to skills — **Not viable / avoid** (keep glob-scoped rules as rules).

#### Subagents — `.cursor/agents/*.md`

Markdown files with YAML frontmatter: `name`, `description`, `model` (`inherit` or ID), `readonly`, `is_background` ([Cursor Subagents](https://cursor.com/docs/subagents), accessed 2026-08-16).

- Nesting: parent + one child level (two-deep tree); deeper nesting blocked.
- Use for **delegation** (verifier, adversarial reviewer), not duplicate of rules.
- **Viability:** Readonly cross-family reviewer subagents for `_lab/reviews/` — **Viable for this take-home**. Autonomous merge bots — **Not viable / avoid**.

#### Hooks — `.cursor/hooks.json`

Project or global hooks for lifecycle: `subagentStart`, `subagentStop`, `afterAgentResponse`, `stop`, file/shell gates ([Cursor Hooks](https://cursor.com/docs/hooks), accessed 2026-08-16).

**Viability:** Logging subagent model/name to `_lab/reviews/` — **Viable only as design story** for take-home (optional). Production compliance hooks — **Not viable / avoid** here.

#### Strong public example (community, not official)

[DVC2/cursor-agent-configs](https://github.com/DVC2/cursor-agent-configs) (accessed 2026-08-16) demonstrates 2026 layout: **`AGENTS.md` first**, `.cursor/rules/*.mdc` for globs, `.cursor/agents/` for delegation, `.cursor/skills/` for workflows. Treat as pattern reference, not normative spec.

---

### E.3 OpenAI Codex conventions (current — do not use obsolete layouts)

#### Instruction discovery — `AGENTS.md` chain

Codex loads instructions once per run ([Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md), accessed 2026-08-16):

1. **Global:** `~/.codex/AGENTS.override.md` else `~/.codex/AGENTS.md` (one file).
2. **Project:** Walk from Git root → CWD; per directory: `AGENTS.override.md` → `AGENTS.md` → `project_doc_fallback_filenames` entries.
3. **Merge:** Concatenate root-down; **later/closer files override** earlier guidance.
4. **Limit:** Default `project_doc_max_bytes = 32768` (32 KiB); split nested files or raise in config.

**Important Codex-specific behavior:** In a directory, if `AGENTS.override.md` exists, regular `AGENTS.md` in that same directory is **skipped** (not merged with override).

**Verification commands:**

```bash
codex --ask-for-approval never "Summarize the current instructions."
codex --cd subdir --ask-for-approval never "Show which instruction files are active."
```

**Code review rules:** Add `## Code Review Rules` to the `AGENTS.md` closest to governed code ([Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)).

#### Configuration — `.codex/config.toml`

| Scope | Path | Notes |
|-------|------|-------|
| User | `~/.codex/config.toml` | Defaults |
| Project | `.codex/config.toml` | Loaded only when project is **trusted** |
| Profile | `~/.codex/<profile>.config.toml` | `--profile` |
| Precedence | CLI > project `.codex/` (closest wins) > profile > user > system | [Codex config basics](https://developers.openai.com/codex/config-basic), accessed 2026-08-16 |

Relevant keys ([Codex config reference](https://developers.openai.com/codex/config-reference), accessed 2026-08-16):

- `project_doc_max_bytes`, `project_doc_fallback_filenames`
- `model_instructions_file` — replaces built-in instructions (prefer `AGENTS.md` for repos)
- `[[skills.config]]` — enable/disable skills by path
- `[features].hooks` — lifecycle hooks (inline or `hooks.json`)
- `instructions` key — **reserved; prefer AGENTS.md**

**Obsolete / avoid:** Single global `.codex/instructions.md` as primary repo contract without `AGENTS.md`; duplicating full stack guidance in both `~/.codex/config.toml` and root `AGENTS.md`; untrusted-project reliance on project `.codex/` layers.

#### Codex skills — `.agents/skills/` (not `.codex/skills/` as primary)

Official Codex skill locations ([Codex Skills](https://developers.openai.com/codex/skills), accessed 2026-08-16):

| Scope | Path |
|-------|------|
| Repo root | `$REPO_ROOT/.agents/skills/` |
| Parent / CWD | `$CWD/../.agents/skills/`, `$CWD/.agents/skills/` |
| User | `$HOME/.agents/skills/` |
| Admin | `/etc/codex/skills/` |

Cursor **also** reads `.codex/skills/` for compatibility ([Cursor Skills](https://cursor.com/docs/skills)), but **author cross-tool skills under `.agents/skills/`** so Codex and Cursor share one tree.

Skill shape matches Agent Skills standard: folder + `SKILL.md` with `name`, `description`; optional `scripts/`, `references/`, `assets/`, `agents/openai.yaml`.

Explicit invocation in Codex CLI: `$skill-name` or `/skills`.

**Viability for this take-home:** Root `AGENTS.md` + `.agents/skills/` mirrored/symlinked under `.cursor/skills/` if needed — **Viable for this take-home**. Per-developer `~/.codex/AGENTS.md` only — **Viable only as design story** (not submission-critical).

---

### E.4 AGENTS.md open format

Stewarded via [Agentic AI Foundation / agents.md](https://agents.md/) (accessed 2026-08-16).

| Property | Detail |
|----------|--------|
| Format | Plain Markdown; **no required schema** |
| Location | Repo root; nested files for packages |
| Precedence | Closest file to edited path wins; user prompt overrides all |
| Purpose | Build/test commands, conventions, boundaries—not human README duplicate |
| Ecosystem | Cursor, Codex, Copilot, Claude Code, Aider, Windsurf, etc. |

Community spec example ([agents-sync spec](https://github.com/googlarz/agents-sync/blob/main/docs/agents-md-spec.md), accessed 2026-08-16) suggests sections: Project, Stack, Architecture, Conventions, Boundaries (`### Never`), Testing, Deployment, Gotchas. **Optional**, not mandatory.

**Splitting guidance (2026 consensus):**

- **`AGENTS.md`:** Universal commands, package manager, test/lint, submission paths, safety/redaction, architecture overview.
- **`.cursor/rules/*.mdc`:** Path-scoped rules Cursor can auto-attach.
- **Skills:** Multi-step workflows with optional scripts.

**Viability:** Single root `AGENTS.md` under ~150 lines + nested file only if monorepo packages emerge — **Viable for this take-home**. 88 nested files — **Not viable / avoid**.

---

### E.5 Multi-model review / edit loops with traceable attribution

#### Pattern used in this lab (mandatory per `_lab/PROMPT.md`)

| Phase | Actor | Output | Attribution |
|-------|-------|--------|-------------|
| Research draft | Author agent + model family | `_lab/research/<topic>.md` | Header: role, model slug |
| Cross-review | Different family (support + adversarial) | `_lab/reviews/<topic>_review.md` | Table: reviewer model, verdict, disagreements |
| Human gate | Human | `_lab/decisions/open_questions.md` | Named human decision |
| Implementation | Coding agent | `src/`, `/evidence/` | Git commit + optional trailer |

Council matrix is recorded in `_lab/research/model_council.md`. **Viable for this take-home**

#### Cursor-native patterns

- **Parallel models:** Same prompt, multiple models, side-by-side compare ([Cursor agent best practices](https://cursor.com/blog/agent-best-practices), accessed 2026-08-16). **Viable only as design story** for final polish.
- **Subagent reviewers:** `readonly: true`, distinct `model` per subagent ([Cursor Subagents](https://cursor.com/docs/subagents)). **Viable for this take-home** for `_lab/reviews/`.
- **Built-in `/review` skill:** Post-implementation pass ([Cursor Skills](https://cursor.com/docs/skills)). **Viable for this take-home** before submission.
- **Hooks:** `subagentStart` / `subagentStop` log `{subagent_name, model}` to JSONL ([Cursor Hooks](https://cursor.com/docs/hooks)). **Viable only as design story**.

#### Git / provenance (optional, not required for take-home)

| Mechanism | Granularity | Viability |
|-----------|-------------|-----------|
| `Co-authored-by:` / `Generated-By:` trailer | Commit-level | **Viable for this take-home** (lightweight) |
| Git Notes (`refs/notes/*`) | Line-level | **Viable only as design story** |
| agentdiff / Agent Trace v0.1 | Signed line ranges | **Not viable / avoid** |

**Anti-pattern:** Silent single-model “council” without recording substitutions (see `model_council.md` disclosure for `gpt-5.6-sol-medium` → `gpt-5.6-sol-high`).

---

### E.6 Playbooks to copy for THIS repo

These are **recommended contents** for later `_lab/agent_ops/implementation_playbook.md` and scaffolded agent files—not implemented in this research phase.

#### Playbook 1: Repository map (root `AGENTS.md`)

```markdown
## Submission surfaces ( graders read these )
- README.md — setup + exact demo commands
- REPORT.md — seven headings from Project.md §6
- evidence/ — discovery artifact, replay logs, optional error-case replay
- src/ (or chosen root) — production code only

## Never commit
- _lab/ (gitignored research)
- .env, secrets/, raw PII, API keys
- Full model transcripts as the artifact; use structured capability schema

## Commands (fill after stack lock)
- install: …
- lint: …
- test: …
- discover: … → writes artifact + evidence
- replay: … → deterministic, no LLM in decision loop

## Architecture seams (implement thin-but-real)
- Surface adapter | flow/artifact | replay engine | policy | HITL | observability
- Mock operator UI at seam; real pause/resume on same session

## Safety
- Configurable allowlist (domains, action types)
- Redact secrets/PII from artifacts and logs
- Risky actions: block or require HITL

## Agent behavior
- Follow PRD in _lab/product/PRD.md for requirements; implement only submission paths
- Prefer minimal diff; no scaling infra (queues, multi-tenant runtime)
- Document cuts in REPORT.md §7
```

**Viability:** **Viable for this take-home**

#### Playbook 2: Cursor rules (recommended files only)

| File | Activation | Contents |
|------|------------|----------|
| `00-submission-paths.mdc` | `alwaysApply: true` (short) | Allowed write roots; forbid `_lab/` commits |
| `artifact-schema.mdc` | globs: artifact paths | Schema invariants, versioning, parameterization |
| `replay-engine.mdc` | globs: replay source | Determinism, checkpoint, error taxonomy |
| `safety-redaction.mdc` | globs: logging/policy | Allowlist, redaction rules |
| `hitl-handoff.mdc` | globs: HITL module | Pause/resume, same session, evidence continuity |

Keep each **< 100 lines**; point to canonical types/tests with `@` references ([Cursor Rules best practices](https://cursor.com/docs/rules)).

**Viability:** **Viable for this take-home**

#### Playbook 3: Shared skills (`.agents/skills/` + `.cursor/skills/`)

See § Skills below.

#### Playbook 4: PRD → milestone evals

| Milestone | Deterministic eval (examples) |
|-----------|-------------------------------|
| M0 scaffold | `test -f AGENTS.md`; lint passes on empty/minimal project |
| M1 discovery | CLI exits 0; `/evidence/discovery/` log + saved artifact validates against schema |
| M2 replay happy path | Replay CLI exits 0; outputs match contract; no LLM env required |
| M3 replay errors | Injected bad input → business outcome vs hard failure encoded in result |
| M4 HITL | Automated test: pause → mock operator action → resume preserves session id |
| M5 safety | Unit test: disallowed domain/action blocked; redaction snapshot test |
| M6 submission | README demo commands work copy-paste; REPORT.md seven sections present |

LLM-judge rubrics for prose quality — **Viable only as design story**; gate on deterministic checks first ([Pondero](https://pondero.ai/enterprise/guides/writing-agent-prds-acceptance-evals-2026/), accessed 2026-08-16).

#### Playbook 5: Multi-model review before stack lock

1. Author completes research file.
2. Launch readonly reviewer subagent (different model family) with checklist from `Project.md` §7.
3. Adversarial reviewer searches for overbuild, missing §3 requirements, `_lab/` leakage.
4. Record in `_lab/reviews/<file>_review.md`; resolve or document in `open_questions.md`.

**Viability:** **Viable for this take-home**

---

## Submission-OK vs `_lab/` (gitignored)

From `Project.md` §6, `_lab/PROMPT.md`, `_lab/00_index.md`, `.gitignore`:

| Commit to public repo | Keep in `_lab/` only |
|----------------------|----------------------|
| `README.md`, `REPORT.md`, `/evidence/` | `_lab/research/*`, `_lab/reviews/*` |
| Production source (`src/` or equivalent) | `_lab/product/PRD.md` (until copied norms to `AGENTS.md`) |
| `.env.example` (no secrets) | `_lab/decisions/`, ADRs, `open_questions.md` |
| `AGENTS.md` (agent contract for implementers + graders cloning repo) | `_lab/PROMPT.md`, orchestration notes |
| `.cursor/rules/*.mdc`, `.cursor/skills/` or `.agents/skills/` | Scratch logs, council transcripts |
| Optional: `.cursor/agents/` for team reuse | `_lab/architecture/` drafts pre-lock |
| `.codex/config.toml` **only** if minimal + no secrets (prefer documenting in README) | Full exploration traces, model outputs as “sources” |

**Hard rule:** Required grader deliverables must never exist **only** under `_lab/`. PRD may originate in `_lab/` but requirements must flow into `AGENTS.md`, rules, and implementation.

**Viability:** Enforcing via `00-submission-paths.mdc` + pre-commit — **Viable for this take-home**

---

## Skills this take-home should have

Author under `.agents/skills/<name>/SKILL.md` (cross-tool); mirror to `.cursor/skills/` if Cursor-specific paths needed.

| Skill | Trigger / description keywords | Steps (high level) | Viability |
|-------|-------------------------------|--------------------|-----------|
| `discover-run` | “discovery”, “LLM run”, “record capability” | Load goal + target → run observe/decide/act → validate success → emit versioned artifact → write `/evidence/discovery/` logs (redacted) | **Viable for this take-home** |
| `replay-run` | “deterministic replay”, “invoke capability” | Load artifact + params → replay without LLM decisions → checkpoint → map errors to taxonomy → write `/evidence/replay/` | **Viable for this take-home** |
| `hitl-handoff` | “stuck”, “escalate”, “operator”, “resume” | Detect block → pause same session → surface context → mock operator acts → record human steps → resume | **Viable for this take-home** |
| `write-report` | “REPORT.md”, “design write-up” | Enforce seven headings from `Project.md` §6; tie each to implementation + cuts | **Viable for this take-home** |
| `package-evidence` | “evidence/”, “submission”, “demo bundle” | Verify artifact + both run logs + optional error replay; no secrets; README command cross-check | **Viable for this take-home** |
| `env-setup` | Cloud agent / CI setup | Use Cursor env-setup skill pattern if on Cloud Agent | **Viable only as design story** |
| `golden-pr-replay` | Regression over merged PRs | **Not viable / avoid** for take-home |

Use `disable-model-invocation: true` for `package-evidence` and `write-report` if you want human-triggered finalization only.

---

## Rules (recommended themes)

| Theme | Belongs in | Example rule |
|-------|------------|----------------|
| **Architecture seams** | `AGENTS.md` + `architecture-seams.mdc` (globs on `src/`) | Surface adapter ≠ artifact ≠ replay; no business logic in CLI glue |
| **Artifact schema** | `artifact-schema.mdc` | Typed params/outputs, version field, no raw transcript in artifact |
| **Safety / redaction** | `safety-redaction.mdc` | Allowlist enforced; never persist credentials; redact PII in logs |
| **Evidence** | `evidence.mdc` (globs: `evidence/**`) | Structured logs; failure screenshots/snapshots; discovery + replay both present |
| **No overbuild** | `00-submission-paths.mdc` | No queues/clusters/multi-tenant runtime; design in REPORT only |

Universal boundaries → **`AGENTS.md`**. Path-specific enforcement → **`.mdc`**. Procedure → **skills**.

---

## Definition of done — high-level milestones

Implementation detail deferred to `_lab/agent_ops/implementation_playbook.md`.

| Milestone | Done when | Grader alignment |
|-----------|-----------|------------------|
| **R0 Research gate** | `_lab/research/_RESEARCH_COMPLETE.md` exists; cross-reviews recorded | Internal |
| **R1 Stack lock** | Human gates resolved; tech stack + target surface chosen | Judgment |
| **R2 Agent scaffold** | Root `AGENTS.md`, rules, skills committed (not `_lab/` only) | AI-native workflow |
| **M1 Discovery vertical** | Real LLM run completes goal; structured artifact saved; evidence log | §3.1, §3.2, §3.5, §4 |
| **M2 Replay vertical** | Replay succeeds with params; checkpoint verified; structured result | §3.3 |
| **M3 Error path** | At least one replay showing business vs recoverable vs hard failure | §3.3 |
| **M4 HITL** | Pause/handoff/resume on same session (mock UI OK); human actions recorded | §3.6 |
| **M5 Safety** | Allowlist + conservative risky actions + redaction demonstrated | §3.4 |
| **M6 Docs + evidence** | `README.md` demo commands work; `REPORT.md` seven sections; `/evidence/` complete | §6 |
| **M7 Optional stretch** | At most 1–2 stretch goals if core solid | §8 |

Each milestone should have **at least one deterministic check** an agent can run without judging its own prose.

---

## Anti-patterns

| Anti-pattern | Why it fails | Mark |
|--------------|--------------|------|
| Huge always-on rules (>500 lines, all `alwaysApply: true`) | Dilutes context; rules stop being followed | **Not viable / avoid** |
| Duplicate Cursor + Codex + `_lab/PROMPT` paragraphs | Drift; contradictory guidance | **Not viable / avoid** |
| Required deliverables only in `_lab/` | Graders never see them | **Not viable / avoid** |
| `.cursorrules` only (legacy) | Agent chat may ignore; no globs | **Not viable / avoid** |
| Plain `.md` in `.cursor/rules/` | Ignored by Cursor | **Not viable / avoid** |
| Skills for everything including glob scoping | Wrong abstraction; use `.mdc` | **Not viable / avoid** |
| Model transcript as the artifact | Fails §3.2 reviewability | **Not viable / avoid** |
| Autonomous agent merge to main | No human accountability | **Not viable / avoid** |
| Enterprise git-notes provenance as gate | Time sink | **Not viable / avoid** |
| Building multi-tenant/queue infra early | Not rewarded; design in REPORT | **Not viable / avoid** |
| Single-model “council” without disclosure | Violates lab integrity | **Not viable / avoid** |

---

## Recommended file layout (recommendation only — do not scaffold yet)

```
/workspace/
├── AGENTS.md                          # Cross-tool: commands, seams, submission paths, safety
├── README.md                          # Human + grader setup/demo
├── REPORT.md                          # Seven-section write-up
├── evidence/                          # Discovery + replay proof (committed)
├── src/                               # Production code (path TBD at stack lock)
├── .env.example
│
├── .agents/skills/                    # Cross-tool workflows (Codex primary scan path)
│   ├── discover-run/SKILL.md
│   ├── replay-run/SKILL.md
│   ├── hitl-handoff/SKILL.md
│   ├── write-report/SKILL.md
│   └── package-evidence/SKILL.md
│
├── .cursor/
│   ├── rules/
│   │   ├── 00-submission-paths.mdc    # alwaysApply: short
│   │   ├── architecture-seams.mdc
│   │   ├── artifact-schema.mdc
│   │   ├── replay-engine.mdc
│   │   ├── safety-redaction.mdc
│   │   └── hitl-handoff.mdc
│   ├── skills/                        # Optional symlink or copy of .agents/skills
│   └── agents/                        # Optional: verifier, adversarial-reviewer (readonly)
│
├── .codex/
│   └── config.toml                    # Optional: project_doc_max_bytes, trusted project only
│
└── _lab/                              # GITIGNORED — research, PRD, reviews, ADRs
    ├── PROMPT.md
    ├── research/
    ├── reviews/
    ├── decisions/
    ├── product/PRD.md                 # After research gate
    └── agent_ops/implementation_playbook.md
```

**Single-source strategy:** Write skills once in `.agents/skills/`. Cursor discovers them via compatibility paths; Codex scans `.agents/skills/` officially. Keep root `AGENTS.md` as the **normative** cross-tool doc; `.mdc` files hold Cursor-only scoping; avoid repeating full PRD text in rules.

---

## Citations (accessed 2026-08-16)

| Topic | URL |
|-------|-----|
| Cursor Rules (`.mdc`, AGENTS.md, precedence) | https://cursor.com/docs/rules |
| Cursor Agent Skills | https://cursor.com/docs/skills |
| Cursor Subagents | https://cursor.com/docs/subagents |
| Cursor Hooks | https://cursor.com/docs/hooks |
| Cursor agent best practices | https://cursor.com/blog/agent-best-practices |
| OpenAI Codex — AGENTS.md | https://developers.openai.com/codex/guides/agents-md |
| OpenAI Codex — Skills | https://developers.openai.com/codex/skills |
| OpenAI Codex — config reference | https://developers.openai.com/codex/config-reference |
| OpenAI Codex — config basics | https://developers.openai.com/codex/config-basic |
| AGENTS.md open format | https://agents.md/ |
| Agent Skills standard (linked from Cursor/Codex docs) | https://agentskills.io |
| Spec-driven PRD → evals (secondary) | https://pondero.ai/enterprise/guides/spec-driven-agent-development/ |
| Bounded agent loops (secondary) | https://loiane.com/2026/08/ai-loop-engineering-github-pr-claude-code/ |
| Public Cursor layout example (community) | https://github.com/DVC2/cursor-agent-configs |
| Assignment brief | `/workspace/Project.md` |
| Lab orchestration | `/workspace/_lab/PROMPT.md` |

---

## Summary judgment for implementers

1. **Start with root `AGENTS.md`** — submission paths, commands, seams, safety, no `_lab/` commits.
2. **Add small scoped `.cursor/rules/*.mdc`** — never a monolithic always-on blob.
3. **Put workflows in `.agents/skills/`** — discover, replay, HITL, report, evidence packaging.
4. **Codex users** inherit the same tree; optional `.codex/config.toml` for byte limits only after trust.
5. **Multi-model traceability** — `_lab/reviews/` + model headers in research; optional git trailers for implementation.
6. **Gate on deterministic evals** aligned to `Project.md` §3 before polishing prose or stretch goals.

**Do not scaffold `.cursor/` files until PRD + stack lock after `_RESEARCH_COMPLETE.md`.**
