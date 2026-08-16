# Model council

Access date for environment model allowlist: 2026-08-16.

## Environment model allowlist (Cursor Task tool)

The orchestrator can only launch subagents with these slugs (verbatim; no invented names):

- `inherit`
- `claude-fable-5-thinking-high`, `claude-fable-5-thinking-xhigh`
- `claude-opus-5-thinking-high`, `claude-opus-5-thinking-high-fast`
- `claude-sonnet-5-thinking-high`, `claude-sonnet-5-thinking-xhigh`
- `composer-2.5`, `composer-2.5-fast`
- `cursor-grok-4.5-high`, `cursor-grok-4.5-high-fast`, `cursor-grok-4.6-high-fast`
- `gemini-3.7-flash-high`
- `gpt-5.6-luna-high`
- `gpt-5.6-sol-high`, `gpt-5.6-sol-high-fast`, `gpt-5.6-sol-xhigh`, `gpt-5.6-sol-xhigh-fast`

## Unavailable preferred models (not silent)

| Requested (master prompt) | Status | Substitution | Disclosure |
|---------------------------|--------|--------------|------------|
| `gpt-5.6-sol-medium` (Systems architect) | **UNAVAILABLE** — not in allowlist | `gpt-5.6-sol-high` (same family, newest `sol` high variant) | Recorded before launch. Preserves GPT family seat rather than switching families. |
| Degraded single-model mode | **Not used** | n/a | Multi-agent + multi-family launch succeeded. |

No human approval was obtainable before launch (background/cloud agent). Substitution is disclosed here rather than silently downgraded to a single model.

## Phase 1A research assignments (recorded before launch)

| Agent name | Role | Model | Family | Assigned questions | Output file | Status |
|------------|------|-------|--------|--------------------|-------------|--------|
| Brief Analyst | Systems architect | `gpt-5.6-sol-high` | GPT | A. Brief & evaluation (full §1–11); must-have vs design-only vs stub-ok; glossary applied to designs; grader lens | `research/brief_decomposition.md` | complete |
| Frontier CUA Researcher | Contrarian researcher | `cursor-grok-4.6-high-fast` | Grok | B. Frontier computer use (web); overlap C. OS/desktop; record-once vs always-on; OSS vs toys | `research/frontier_computer_use.md` | complete |
| OS/Desktop/Electron Researcher | Independent desktop specialist | `gemini-3.7-flash-high` | Gemini | C. OS-level, native a11y, Electron/Tauri/hybrid; when desktop strengthens §3.7 | `research/os_desktop_electron.md` | complete |
| Tech Stack Researcher | Deep design reviewer | `claude-opus-5-thinking-high` | Claude | D. Full tech stack every layer; top 3 complete stacks; rejects; human questions | `research/tech_stack.md` | complete |
| Agent-Native Product Researcher | Implementation/scaffold reviewer | `composer-2.5` | Composer | E. Cursor/Codex/AGENTS.md/rules/skills; PRD→build loops | `research/agent_native_workflows.md` | complete |
| Independent Brief+Eval Reviewer | Independent reviewer | `cursor-grok-4.5-high` | Grok | Overlap A with Brief Analyst (independently); what graders do not reward | `research/_independent_brief_eval.md` (feeds brief + non_viable) | complete |
| Alternatives Architect | Contrarian architectures | `gpt-5.6-sol-xhigh` | GPT | G. ≥4 E2E architectures with concrete stacks; overlap D | `research/alternatives_matrix.md` | complete |
| HITL & Safety Specialist | Safety / HITL research | `claude-sonnet-5-thinking-high` | Claude | F. Escalation, allowlist, redaction, error taxonomy, multi-tenant design patterns | `research/_hitl_safety.md` (feeds F + architecture later) | complete |

**Minimum met:** 8 agents, 5 families (GPT, Grok, Gemini, Claude, Composer). Overlapping questions: (A) Brief Analyst vs Independent Reviewer; (D/G) Tech Stack vs Alternatives Architect; (B/C) Frontier CUA vs OS/Desktop.

## Cross-review (executed)

Every major recommendation received supporting review from a **different family** and adversarial review from a **different family**. Some planned seats were bundled (one agent covering two artifacts) to reduce duplicate context; family diversity was preserved.

| Artifact | Author family | Supporting (different family) | Adversarial (different family) | Output |
|----------|---------------|-------------------------------|--------------------------------|--------|
| brief_decomposition.md | GPT | Independent overlap already by Grok 4.5; Claude alternatives review also checked §3.2 schema must-haves | Grok `cursor-grok-4.5-high` | `reviews/reviewer_pass_2.md` |
| frontier_computer_use.md | Grok | GPT `gpt-5.6-sol-high` | Claude `claude-opus-5-thinking-high` | `reviews/supporting_frontier_hitl.md`, `reviews/alternatives_and_frontier_review.md` |
| os_desktop_electron.md | Gemini | Grok frontier file independently derived same desktop kill | Composer `composer-2.5` | `reviews/dx_and_desktop_review.md` |
| tech_stack.md | Claude | Composer `composer-2.5` | GPT `gpt-5.6-sol-xhigh` | `reviews/dx_and_desktop_review.md`, `reviews/reviewer_pass_1.md` |
| agent_native_workflows.md | Composer | Qualified in DX review (self-check + stack consistency); GPT stack review attacked overlapping DX claims | GPT `gpt-5.6-sol-xhigh` (test runner / native TS) | `reviews/reviewer_pass_1.md` |
| alternatives_matrix.md | GPT | Claude supporting hybrid A′ (also adversarial on DOM-first label) | Claude `claude-opus-5-thinking-high` | `reviews/alternatives_and_frontier_review.md` |
| HITL/safety notes | Claude | GPT `gpt-5.6-sol-high` | Grok `cursor-grok-4.5-high` | `reviews/supporting_frontier_hitl.md`, `reviews/reviewer_pass_2.md` |

**Deviation:** Gemini was not re-used as supporting reviewer of `alternatives_matrix.md` (planned). Claude performed both support-of-frontier and attack-of-alternatives in one pass. Grok 4.6 was not re-launched for a second supporting pass on desktop (independent derivation already existed in `frontier_computer_use.md`). Disclosed, not silent.

## Disagreements and resolution

Majority vote was **not** used. Resolution cites brief §7 + verified APIs.

| ID | Disagreement | Parties | Resolution | Why this won (not a vote) |
|----|--------------|---------|------------|---------------------------|
| D1 | DOM-first vs a11y-first as *the* architecture | Alternatives ranked Playwright-DOM #1; Frontier/TechStack ARIA-first; Claude review: false dichotomy | **Hybrid A′**: a11y snapshot for discovery observe; durable semantic locators for replay; DOM/CSS as compiled fallback; screenshot on ambiguity; coords never the artifact identity | Brief §3.1 bias to no-clean-DOM + §3.2 reviewable locators + MDN: a11y tree is DOM-derived (ARIA is not an independent desktop channel) |
| D2 | `browser.bind()` *is* HITL | TechStack vs GPT adversarial + Grok HITL review | Bind is **optional transport**. Real model = control lease + same BrowserContext + actuator gate + re-observe on resume. Mock operator for CI | Official Playwright docs: bind shares a browser; it does not own a lease. §3.6 grades the control-transfer model |
| D3 | Recoverable as terminal result kind | Claude HITL 4-way union vs Grok: recoverable is in-run | Terminal: `success \| business_outcome \| hard_failure \| escalated`. Recoverable = journaled event, not a peer terminal kind | Glossary: business outcome vs failure is the named trap; recoverable is how you *continue*, not what you *return* |
| D4 | npm vs pnpm; node:test vs Vitest | Alternatives pnpm+Vitest; TechStack npm+node:test; GPT adversarial Vitest; Composer npm+node:test | **npm + node:test + @playwright/test**. Vitest remains acceptable; not locked | Grader friction (§7 code quality / easy to run) beats watch-mode DX |
| D5 | Implement Electron/OS vs design seam | Gemini/Grok: hostile web enough; Composer: design-only is convenient; TechStack B wants xa11y | **Web-now, desktop design-only**. `Surface` interface mandatory. No xa11y/nut.js/PyAutoGUI | §3.7 "design, not necessarily build"; §7 no framework theater; permissions break grader repro |
| D6 | LangGraph | Alternatives B included it; TechStack killed for re-click; GPT adversarial: re-click kill is rhetoric | **Custom state machine.** Fair sentence: LangGraph *can* be safe with node boundaries; still overkill for this slice | §7 does not reward framework name-dropping; live session dies with the process anyway |
| D7 | OpenAI Terra vs Anthropic Sonnet | TechStack OpenAI default; Alternatives Anthropic | **OpenAI SDK, model via env**, default `gpt-5.6-terra` after smoke; Anthropic is a swap at the provider port | Custom tool harness (OpenAI Option 2) matches compile-to-locator design; key presence is the real tiebreaker (G6 OPEN) |
| D8 | Stack C MCP stretch | TechStack "near-free"; GPT adversarial FALSE | **No MCP in v1.** CLI `replay` *is* the callable contract | §8 stretch only after core; §7 no breadth |
| D9 | Headed-window-only HITL | Claude HITL vs Grok pass 2 | Scripted/mock operator path required; headed optional for demo | Graders may have no display; §3.6 allows mock UI |
| D10 | Local MemberDesk vs public site | Alternatives local; TechStack "both"; Claude: the-internet as self-hostable | **Local MemberDesk primary** with injected faults. No ToS-bound public run required | §6.3 wants exceptional-state replay on command; public sites do not fail deterministically |

## Notes

- Model output is not a source. Agents must cite primary/official URLs with access date 2026-08-16.
- `_RESEARCH_COMPLETE.md` written 2026-08-16 after the reviews above.
- Subagents accidentally committed `_lab/reviews/*` on branch `cursor/adversarial-review-pass-2-a5bc` (gitignore bypass). Submission branch does **not** track `_lab/`.

## Notes

- Model output is not a source. Agents must cite primary/official URLs with access date 2026-08-16.
- Do not write PRD/architecture/scaffolding until `_RESEARCH_COMPLETE.md` exists.
