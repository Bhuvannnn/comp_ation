# ADR-001 — Modified Stack A (web-first TypeScript)

- **Status:** Accepted (orchestrator default; G3)
- **Date:** 2026-08-16
- **Brief:** Project.md §§3–7
- **Research:** `tech_stack.md`, `reviews/reviewer_pass_1.md`, `alternatives_matrix.md`

## Context

The take-home needs a real LLM discovery run, a typed artifact, deterministic replay, HITL same-session transfer, and a credible §3.7 seam — without scaling infrastructure.

## Decision

Ship **modified Stack A**: TypeScript, npm, Playwright 1.62.1, OpenAI custom-tool harness, Zod JSON artifacts, custom state machine, local MemberDesk, `Surface` abstraction.

## Thinking protocol

1. **Normative:** TS + Playwright DOM locators + custom loop.  
2. **Contrarian:** Python + native a11y second surface, or screenshot CUA compiled to locators, or Electron `_electron`.  
3. **Rejected:** LangGraph/Temporal, Selenium, Skyvern AGPL, coordinate-macro replay, xa11y as a required dep, MCP v1.  
4. **Frontier:** Labs run always-on screenshot CUA; Microsoft documents RPA vs CUA split — we want RPA-like replay after CUA-like discovery.  
5. **Grader lens:** §7 ranks design and core loop over framework names.  
6. **Recommendation:** Modified A.  
7. **Human gate:** G3 — default locked.

## Consequences

+ Fast vertical slice, headed HITL possible, traces for evidence.  
− Desktop remains a design story. ARIA snapshot is DOM-derived (not a native a11y proof).
