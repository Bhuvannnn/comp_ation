# REPORT.md

## Architecture

This system is a single Node/TypeScript process with two engines over one `Surface` seam. **Discovery** may call an LLM through OpenAI-compatible Chat Completions function tools (OpenAI, Groq, or local Ollama — not a vendor “computer” tool). A **compiler** turns a successful journal into a Zod-validated JSON capability. **Replay** interprets that file with **no model import** (`src/replay` is import-guarded). Every `act()` checks a **session lease** and an **allowlist**. Evidence is JSONL plus optional screenshots under `evidence/`.

Trade-off: implement one web surface thoroughly (local MemberDesk) and keep Electron/OS as typed stubs. That matches Project.md §3.7 (“design, not necessarily build”) and §7 (no scaling infrastructure). Orchestration is a custom reducer with explicit edge tables in `src/graph/`, not LangGraph: the live browser dies with the process, so a durable graph runtime does not buy the resource that matters. CLI modes are honest about fidelity — `--mock` discovery uses a scripted FakeSurface path; `--live-browser` uses Playwright against MemberDesk; FakeSurface remains the fast taxonomy harness.

## Artifact schema

A capability is a reviewable contract, not a transcript. It declares `schemaVersion`, `capabilityVersion`, a derived `contractHash` over the callable surface, typed params (with sensitivity), typed outputs, a closed set of **business outcomes**, ranked **semantic locators** (role/name/label/text, optional CSS with justification), checkpoints, and known recoverables. Ephemeral ARIA `ref=eN` values are discovery-turn-only and never persisted. Coordinates are not locator identity.

The compiler reads the discovery journal (`act` / `model_tool` events), strips ephemeral refs, and emits durable locators. Known lookup outcomes (`member_not_found`, `permission_denied`) are a **contract overlay**: one happy-path recording cannot enumerate every legitimate result, so the schema carries declared branches that replay matches against observations. Status stays `draft` until an operator would approve it in a fuller system.

## Determinism & error handling

Replay resolves ranked locators through `WebSurface` (Playwright) or `MemberDeskFakeSurface` (unit tests). Required `contract.params` are validated up front — missing `memberId` is `hard_failure: missing_param`, not a fake `member_not_found`. CLI `--live-browser` starts MemberDesk, drives Chromium, waits on DOM content after navigation, then classifies:

- `success` — success condition met, typed outputs returned
- `business_outcome` — e.g. `member_not_found`, `permission_denied` (caller-visible, not thrown)
- `hard_failure` — unmatched state (e.g. unexpected confirmation for member `77777`), policy deny, checkpoint miss, missing params; includes step, expected, observed; journals ARIA snapshot and may write `failure.png`
- `escalated` — policy/risk pause: `intervention.json` written, lease transferred to human; session still live

Recoverable interstitials (`session_notice`) are **journal events**, not a fifth terminal kind. They dismiss/wait within a budget, then continue. UI drift shows up as checkpoint / locator failure → `hard_failure`; re-record or overlay locators rather than inventing silent retries.

## Heterogeneity & multi-tenant

`Surface` is `web | electron | os_desktop`. Locators are semantic, not CSS-only, so a future UIA/AX/AT-SPI adapter can resolve the same `role`+`name` records. Electron would bind Playwright `_electron` (CDP) rather than OS injection. Multi-tenant reuse is a **vendor-family capability** plus optional overlay files (not an inline unreviewed `tenantOverrides` map). Drift: compare observation fingerprints / checkpoint failures and re-record or overlay locators. None of that runtime is built — the seam and schema are shaped so overlays can attach later without rewriting the interpreter.

## Escalation & handoff

Detection paths today: policy `escalate` (e.g. `submit_irreversible`), the standalone `escalate` CLI demo (stuck → mock operator → resume), and hard-failure for unexpected UI. On policy escalate during replay, `parkForHuman` writes `intervention.json` under the run evidence dir and flips `SessionLease`: `automation → transitioning_to_human → human`. Actuators refuse the wrong owner. The browser/context is **not** closed. Resume (demo path) transitions back through `transitioning_to_automation → automation` and re-observes before acting. Operator UI is CLI/JSON; a headed Chromium window is optional (`HEADED=1`). `browser.bind()` could attach a second client later — transport, not the control model. Live Playwright HITL is lease-enforced in `WebSurface.act`; the committed demo uses FakeSurface for determinism without a second headed client.

## Safety

`config/policy.json` allowlists origins, paths, and action types. Off-list navigation is denied before side effects (`policy_denied` → `hard_failure`). `submit_irreversible` escalates. Redaction strips secret-like keys and long identifiers from journals. Discovery spend is capped (`DISCOVERY_MAX_USD`). Limits: the model can still see on-screen text during discovery (treat UI as untrusted); screenshot OCR is not a full DLP pipeline; policy cannot see OS-level keystrokes on a future desktop adapter until that adapter shares the same chokepoint. Committed evidence is synthetic MemberDesk data only — no real PII, no `.env`.

## Cuts

Not built: Electron/OS drivers, MCP capability server, queues, multi-tenant control plane, co-browsing console, assisted LLM fallback on replay, public-site runs, live headed HITL evidence pack. Live discovery evidence is in `evidence/discovery/live/` (Ollama `qwen2.5:3b` via OpenAI-compatible Chat Completions; no paid key required). Mock discovery is for CI and graders without a model — it still compiles a real artifact, but overwrites sample paths if you re-run it; prefer the committed live journal for provenance. Next: optionally Playwright `_electron` as a second adapter, and a bounded assisted-fallback on a single failed step under the same policy chokepoint.
