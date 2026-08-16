# ADR-005 — Result taxonomy

- **Status:** Accepted
- **Research:** Project.md §3.3, §10; `_hitl_safety.md`; `reviews/reviewer_pass_2.md`

## Decision

Caller-visible terminal result is a discriminated union:

- `success` — checkpoint met, typed outputs
- `business_outcome` — legitimate domain result (e.g. `member_not_found`)
- `hard_failure` — unexpected state, policy violation, timeout, crash
- `escalated` — stopped for human; session still live

**Recoverable** conditions are **not** a terminal kind. They are journal events (`dismissed_dialog`, `retry_wait`) that the replay graph handles, then continues.

Each capability step may declare expected business outcomes and known recoverables.

## Human gate

None beyond G8.
