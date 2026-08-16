# Research complete — gate file

**Written:** 2026-08-16  
**Rule:** This file exists *before* PRD / architecture lock / scaffolding.  
**Council:** see `model_council.md`. Cross-reviews: `_lab/reviews/`.

Human answers were **not** available (background/cloud agent). Gates remain documented as `ORCHESTRATOR_DEFAULT` in `decisions/open_questions.md`. Defaults are derived from research + adversarial review, not vibes.

## Coverage checklist

### A. Brief & evaluation

- [x] Full decomposition of `/Project.md` Sections 1–11 → `brief_decomposition.md` (GPT `gpt-5.6-sol-high`) + independent overlap `_independent_brief_eval.md` (Grok `cursor-grok-4.5-high`)
- [x] What graders weigh (Section 7) and what they do **not** reward
- [x] Must-have vs design-only vs stub-ok seams
- [x] Glossary terms applied to proposed designs
- [x] Adversarial pass: `reviews/reviewer_pass_2.md`

### B. Frontier computer use (web)

- [x] How frontier labs approach computer use / browser agents / CUA → `frontier_computer_use.md` (Grok `cursor-grok-4.6-high-fast`)
- [x] DOM vs a11y snapshot vs screenshot+coords — viability on dirty/legacy UI
- [x] Record-once / replay-many vs always-on LLM control in production
- [x] Open-source stacks worth copying vs demo-only toys
- [x] Supporting review: `reviews/supporting_frontier_hitl.md` (GPT); adversarial: `reviews/alternatives_and_frontier_review.md` (Claude)

### C. OS-level, desktop, Electron / hybrid

- [x] OS input injection, native a11y, screenshot+VLM, Electron CDP vs opaque desktop, Tauri/native comparisons, permissions, HITL, §3.7 → `os_desktop_electron.md` (Gemini `gemini-3.7-flash-high`)
- [x] Independent overlap in `frontier_computer_use.md` §C
- [x] Adversarial DX/desktop: `reviews/dx_and_desktop_review.md` (Composer)

### D. Full tech stack (every layer)

- [x] Language, LLM, web automation, OS/desktop, Electron, orchestration, schema, persistence, CLI, testing, observability, config/allowlist/redaction, target app → `tech_stack.md` (Claude `claude-opus-5-thinking-high`)
- [x] Top 3 complete stacks + recommended default + rejects + human questions
- [x] Adversarial claim verification: `reviews/reviewer_pass_1.md` (GPT `gpt-5.6-sol-xhigh`) — **Stack A MODIFY** (pin Playwright 1.62.1; do not use `ariaSnapshotJSON()`; `browser.bind()` is transport not control model)

### E. Agent-native delivery

- [x] Cursor rules/skills, Codex/AGENTS.md, PRD→build loops → `agent_native_workflows.md` (Composer `composer-2.5`)
- [x] Supporting/consistency: `reviews/dx_and_desktop_review.md`

### F. HITL, safety, errors, multi-tenant design

- [x] Escalation, same-session transfer, allowlist, redaction, taxonomy, multi-tenant patterns → `_hitl_safety.md` (Claude `claude-sonnet-5-thinking-high`)
- [x] Adversarial: `reviews/reviewer_pass_2.md`; supporting: `reviews/supporting_frontier_hitl.md`

### G. Alternatives & anti-patterns

- [x] ≥4 E2E architectures with concrete stacks → `alternatives_matrix.md` (GPT `gpt-5.6-sol-xhigh`)
- [x] Explicit non-viable list → `non_viable.md` (Grok) + corrections in reviewer_pass_2
- [x] Adversarial: `reviews/alternatives_and_frontier_review.md` — DOM-first label does **not** survive; hybrid **A′** does

## Key citations (primary)

| Topic | Source | Accessed |
|-------|--------|----------|
| Assignment | `/workspace/Project.md` §§1–11 | 2026-08-16 |
| Anthropic Computer Use | https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool | 2026-08-16 |
| OpenAI Computer Use (custom harness option) | https://developers.openai.com/api/docs/guides/tools-computer-use | 2026-08-16 |
| GPT-5.6 Terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 2026-08-16 |
| Gemini Computer Use | https://ai.google.dev/gemini-api/docs/computer-use | 2026-08-16 |
| Microsoft RPA vs CUA | https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/agent-tools | 2026-08-16 |
| Playwright `browser.bind` | https://playwright.dev/docs/api/class-browser | 2026-08-16 |
| Playwright 1.62.1 | https://github.com/microsoft/playwright/releases/tag/v1.62.1 | 2026-08-16 |
| Playwright aria snapshots | https://playwright.dev/docs/aria-snapshots | 2026-08-16 |
| LangGraph interrupt re-runs node | https://docs.langchain.com/oss/javascript/langgraph/interrupts | 2026-08-16 |
| Cursor rules | https://cursor.com/docs/rules | 2026-08-16 |
| Accessibility tree (DOM-derived) | https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree | 2026-08-16 |

## Remaining human questions

All G1–G13 listed in `decisions/open_questions.md`. Proceeding with orchestrator defaults **after** this gate so scaffolding can exist; human may override.

Highest-impact unanswered: API key presence, spend ceiling, whether a built Electron adapter is desired.

## Explicit substitutions / degraded mode

- `gpt-5.6-sol-medium` **unavailable** → `gpt-5.6-sol-high` (disclosed in `model_council.md` before launch).
- Multi-agent multi-family mode **succeeded** (GPT, Grok, Gemini, Claude, Composer). No single-model degradation.

## Permission to leave research

Checklist A–G documented. Cross-family supporting + adversarial reviews exist for every major recommendation. Synthesizer may write ADRs / PRD / architecture **citing these files**. Scaffolding only after `open_questions.md` records defaults or human answers.
