# REPORT.md

## Architecture

This system is a single Node process with two engines over one `Surface` seam. **Discovery** may call an LLM via OpenAI-compatible Chat Completions function tools (OpenAI, Groq, or local Ollama — not the vendor `computer` tool). A **compiler** turns a successful trajectory into a Zod-validated JSON capability. **Replay** interprets that file with no model import. Every `act()` checks a **session lease** and an **allowlist**. Evidence is JSONL + optional screenshots under `/evidence/`.

Trade-off: implement one web surface thoroughly (local MemberDesk) and keep Electron/OS as typed stubs. That matches Project.md §3.7 (“design, not necessarily build”) and §7 (no scaling infrastructure). Orchestration is a custom reducer with explicit edge tables, not LangGraph: the live browser dies with the process, so a durable graph runtime does not buy the resource that matters.

## Artifact schema

A capability is a reviewable contract, not a transcript. It declares `schemaVersion`, `capabilityVersion`, a derived `contractHash` over the callable surface, typed params (with sensitivity), typed outputs, a closed set of **business outcomes**, ranked **semantic locators** (role/name/label/text, optional CSS with justification), checkpoints, and known recoverables. Ephemeral ARIA `ref=eN` values are discovery-turn-only and never persisted. Coordinates are not locator identity.

## Determinism & error handling

Replay resolves ranked locators through `WebSurface` (Playwright) or `MemberDeskFakeSurface` (unit tests). CLI `--live-browser` starts MemberDesk, drives Chromium, waits on DOM content after navigation, then classifies:

- `success` — checkpoint met, typed outputs returned
- `business_outcome` — e.g. `member_not_found`, `permission_denied` (caller-visible, not thrown)
- `hard_failure` — unmatched state, policy deny, timeout; includes step, expected, observed
- `escalated` — lease transferred to a human; session still live

Recoverable interstitials (`session_notice`) are **journal events**, not a fifth terminal kind. They dismiss/wait within a budget, then continue.

## Heterogeneity & multi-tenant

`Surface` is `web | electron | os_desktop`. Locators are semantic, not CSS-only, so a future UIA/AX/AT-SPI adapter can resolve the same `role`+`name` records. Electron would bind Playwright `_electron` (CDP) rather than OS injection. Multi-tenant reuse is a **vendor-family capability** plus optional overlay files (not an inline unreviewed `tenantOverrides` map). Drift: compare observation fingerprints / checkpoint failures and re-record or overlay locators. None of that runtime is built.

## Escalation & handoff

Stuck, risky, or unknown states write `intervention.json` and flip `SessionLease`: `automation → transitioning_to_human → human → transitioning_to_automation → automation`. Actuators refuse the wrong owner. The browser/context is **not** closed. Operator UI is a CLI/JSON mock; a headed window is optional. `browser.bind()` may attach a second client later — it is transport, not the control model. Resume re-observes before automation acts again.

## Safety

`config/policy.json` allowlists origins, paths, and action types. Off-list navigation is denied before side effects. `submit_irreversible` escalates. Redaction strips secret-like keys and long identifiers from journals. Limits: the model can still see on-screen text during discovery (treat UI as untrusted); screenshot OCR is not a full DLP pipeline; policy cannot see OS-level keystrokes on a future desktop adapter until that adapter shares the same chokepoint.

## Cuts

Not built: Electron/OS drivers, MCP capability server, queues, multi-tenant control plane, co-browsing console, assisted LLM fallback on replay, public-site runs. Live discovery evidence is in `evidence/discovery/live/` (Ollama `qwen2.5:3b` via OpenAI-compatible Chat Completions; no paid key). The capability is compiled from that journal (semantic locators; `ref=eN` dropped); known lookup outcomes are a contract overlay because one happy-path recording cannot enumerate every legitimate result. Next: optionally Playwright `_electron` as a second adapter.
