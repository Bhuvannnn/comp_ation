# ADR-004 — HITL control lease (not bind-as-handoff)

- **Status:** Accepted (G9)
- **Research:** `_hitl_safety.md`, `reviews/reviewer_pass_2.md`, `reviews/reviewer_pass_1.md`

## Decision

Session ownership is an explicit enum: `automation | transitioning_to_human | human | transitioning_to_automation`. Every actuator checks the lease. Escalation **does not close** the browser/context. Operator UI may be a CLI writing `intervention.json` + scripted mock actions. `browser.bind()` is optional attachment after a smoke test, not the control model. `page.pause()` is a demo aid, not the graded mechanism.

## Human gate

G9 default locked.
