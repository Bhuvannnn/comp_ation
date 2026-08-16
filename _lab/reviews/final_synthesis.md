# Final synthesis

**Status:** research synthesis complete; implementation must follow accepted ADRs and `ORCHESTRATOR_DEFAULT` gates unless a human explicitly overrides them.  
**Sources:** `_lab/research/model_council.md` “Disagreements and resolution”; `_lab/research/_RESEARCH_COMPLETE.md`; `_lab/decisions/ADR-001-stack.md` through `ADR-005-taxonomy.md`; `_lab/decisions/locked_stack.md`; `/workspace/Project.md` §§3–7.

## What won

The winning plan is one web-first, artifact-centered vertical slice:

1. Use modified Stack A: TypeScript, npm, Playwright 1.62.1, OpenAI Responses API custom tools, Zod JSON, a custom in-process state machine, filesystem evidence, Commander/tsx, node:test, and one Playwright smoke. [ADR-001; locked stack]
2. Use Hybrid A′: observe discovery with Playwright AI-mode ARIA snapshots, permit screenshots on ambiguity, compile durable ranked semantic locators, and keep ephemeral refs/coordinates out of artifact identity. [ADR-002]
3. Use local synthetic MemberDesk as the primary live surface so success, not-found, interstitial, permission, validation, and slow/error conditions are reproducible without public-site risk. [ADR-003]
4. Use a real `SessionLease` over the same `BrowserContext`; gate every actuator by explicit ownership; keep the operator UI minimal/mockable while preserving actual pause/control/resume and action evidence. [ADR-004]
5. Return `success`, `business_outcome`, `hard_failure`, or `escalated`; journal recoveries as in-run events rather than terminal results. [ADR-005]
6. Build web now. Preserve Electron/OS and tenant reuse as typed/design seams. Do not build MCP, queues, multi-tenant runtime, native input injection, or stretch scope before the complete core evidence thread is green. [open questions G4/G7/G11/G12; Project.md §§3.7–8]

This plan won because it best satisfies the assignment’s ranked constraints: schema/replay-centered design, genuine discovery, deterministic model-free replay, deliberate runtime taxonomy, real same-session handoff, enforceable safety, and credible extension seams. It does not win because more council members preferred its package list. [Project.md §§3–7; brief decomposition §§3, 6]

## Disagreements preserved

The following D1–D10 table is copied verbatim from `_lab/research/model_council.md` “Disagreements and resolution”:

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

## Why not majority vote

Majority vote was not used because the research seats were deliberately heterogeneous and non-equivalent: they investigated overlapping but different questions, used different assumptions, and included supporting and adversarial roles. Counting preferences would turn model-family repetition into false confidence and would not resolve factual API/version claims or binding brief requirements. [model council “Phase 1A research assignments”, “Cross-review”, “Disagreements and resolution”]

Resolve conflicts in this order:

1. Honor binding language in `/workspace/Project.md`, especially §§3–7.
2. Verify concrete API/version claims against primary official sources.
3. Prefer the option that produces grader-visible proof for higher-ranked evaluation criteria.
4. Prefer a complete thin vertical slice over framework breadth, scaling infrastructure, or presentation polish.
5. Preserve material dissent and limitations; do not rewrite rejected views as consensus.
6. Record any human override by changing the relevant gate/ADR before changing implementation.

This method explains outcomes that a vote would obscure: ARIA was selected for web discovery without claiming it is independent native accessibility; `browser.bind()` remained possible transport without being mistaken for ownership; LangGraph remained technically viable without being justified for this slice; and Vitest remained acceptable without displacing the lower-friction locked test path. [model council D1/D2/D4/D6; Project.md §7]

## Implementation handoff

- Treat `_lab/product/PRD.md` requirement IDs and acceptance tests as the build contract.
- Implement journeys in `_lab/product/user_journeys.md`.
- Use `_lab/product/success_metrics.md` as the release checklist.
- Do not silently reopen D1–D10 or replace the stack. If evidence invalidates a decision, document the concrete evidence and update the gate/ADR first.
- Do not scaffold beyond the locked module seams or build any cut/stretch item while a Project.md §3 requirement lacks working proof.
