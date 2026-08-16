# ADR-002 — Hybrid A′ perception and locators

- **Status:** Accepted (G2)
- **Research:** `frontier_computer_use.md`, `alternatives_and_frontier_review.md`, `reviewer_pass_1.md`

## Decision

Discovery observes via Playwright AI-mode ARIA snapshot (plus screenshot on ambiguity). The model may act using snapshot-local refs **only during the live turn**. The compiler emits ranked **semantic locators** (role/name/label/text + frame path + optional CSS) into the capability. Replay never calls the LLM and never uses ephemeral refs or raw pixels as identity.

## Why not

- DOM-only: fails §3.1 wording.  
- ARIA-only as “non-DOM”: FALSE — a11y tree is DOM-derived (MDN).  
- Coordinate artifact: unreviewable, brittle, fails §3.2.

## Human gate

G2 default locked.
