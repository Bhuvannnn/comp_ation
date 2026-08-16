# ADR-003 — Local MemberDesk target

- **Status:** Accepted (G1)
- **Research:** `alternatives_matrix.md`, `os_desktop_electron.md`, `tech_stack.md` §13

## Decision

Implement a local HTTP fixture (MemberDesk): search member → detail/balance → confirmation screen (no real money movement). Synthetic IDs. Deterministic faults: not-found, permission, validation, interstitial, slow load.

## Why not public demo as primary

Cannot inject exceptional states on command (§6.3). ToS/rate limits (§9). Availability.

## Human gate

G1 default locked.
