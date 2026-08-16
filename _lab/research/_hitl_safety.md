# F. HITL & Safety Research — Escalation, Control Transfer, Allowlist/Redaction, Error Taxonomy, Multi-Tenant Design

**Author:** HITL & Safety Specialist (`claude-sonnet-5-thinking-high`)
**Source:** `/workspace/Project.md` §§3.3, 3.4, 3.6, 3.7, glossary (§10)
**Date:** 2026-08-16 (all citation access dates below are 2026-08-16 unless noted)
**Status:** Research draft feeding `_RESEARCH_COMPLETE.md`, cross-review, and later `architecture/` — **not a PRD, not scaffolding**
**Model output is not a source.** Every claim below is backed by an official/serious external source with URL + access date. Where no such source exists, the recommendation is marked as my own synthesis and flagged as **design judgment**, not a cited fact.

---

## Thinking Protocol & Evaluative Stance

Working method for this assignment, made explicit before the content:

1. **Anchor to the brief, not to what's fashionable.** §3.6 asks for a *real* pause → cede → resume mechanism on the *same live session*, with a mockable operator UI but a real control-transfer model. §3.4 asks for a *configurable* allowlist and redaction, not a compliance program. §10 glossary flags "conflating business outcome with failure" as *the* most common design mistake — so the error taxonomy is treated as first-class, not an afterthought. §3.7 asks for credible *design*, explicitly not implementation, for heterogeneity/multi-tenancy.
2. **Prefer primary/official sources over blog synthesis.** Vendor docs (Anthropic, OpenAI, Chrome DevTools, Playwright, Microsoft, UiPath, AWS, W3C/MDN), standards bodies (OWASP, NIST), and regulator text (FTC/GLBA, PCI SSC) are weighted above secondary blog posts. Secondary sources are used only to fill gaps (e.g., "how RPA vendors talk about attended handoff in practice") and are labeled as such.
3. **Borrow from adjacent, mature industries rather than inventing from scratch.** This system's problem shape — human supervises/takes over an automated back-office UI session, and must classify runtime outcomes into "expected business result" vs "recoverable hiccup" vs "genuine failure" — is not new. It is the daily reality of **RPA in banking/insurance back offices** (UiPath's business-exception/system-exception distinction, attended-automation handoff) and of **agentic browser products** (Anthropic Computer Use, OpenAI Operator/CUA) that ship the exact "pause, hand off, confirm risky actions" pattern this brief asks for. I treat those as the load-bearing precedents, not academic papers.
4. **Every recommendation gets a viability tag** for *this specific take-home* (single surface, no deadline but time-boxed, one engineer, AI-assisted): **Viable for this take-home** | **Viable only as design story** | **Not viable / avoid**. This mirrors the non-viable/viable framing already used elsewhere in `_lab/research/` (see `non_viable.md`) so the synthesizer can merge consistently.
5. **Flag human gates rather than silently deciding them.** G9 (HITL UX depth), G4 (surface adapter seam), and G8 (artifact schema philosophy) all have HITL/safety-relevant sub-decisions baked into this research. I record a recommendation for each with rationale, but leave the gate `OPEN`/`ORCHESTRATOR_DEFAULT` for the orchestrator to reconcile against `decisions/open_questions.md` — I do not edit that file myself since I don't own gate reconciliation.
6. **Bias toward mechanisms that are cheap to build for real, not elaborate to describe.** A take-home is graded on "a real, well-reasoned mechanism... not just a TODO" (§7). Where a fully general mechanism (e.g., full remote-desktop shadowing, network-egress firewalling) is expensive to stand up correctly in a few hours, I mark it design-only and recommend the cheapest mechanism that is still *genuinely* the same live session, not a re-created one.

---

## 1. Escalation triggers + same-session control transfer

### 1.1 When to stop and ask a human (trigger taxonomy)

Concrete, checkable trigger conditions — not "the model feels stuck." Two trigger families map to the two places the brief requires escalation (§3.6): **during discovery** (the LLM is driving) and **during replay** (the deterministic executor is driving).

**Discovery-time triggers** (the LLM observe→decide→act loop):
- Step budget or wall-clock timeout exceeded without reaching the checkpoint (§3.1 "max steps, timeout, dead-end").
- The same action (locator + action type) fails N consecutive times against the same observed state (loop detection — the model is "stuck," not merely slow).
- The model's own output signals uncertainty/refusal to proceed (e.g., it explicitly reports it cannot determine the next action, or emits a "give up" token in a structured response schema).
- The next proposed action targets a domain/route/action-type **outside the configured allowlist** (§3.4) — this is a hard stop routed to a human, not a silent skip.
- The next proposed action is classified **risky/irreversible** per policy (see §2.2) and requires human confirmation before it is dispatched — this is the same seam as OpenAI's "user confirmation before finalizing actions with external side effects" for Operator/CUA (openai.com/index/introducing-operator, accessed 2026-08-16) and Anthropic's guidance to "ask a human to confirm decisions that may result in meaningful real-world consequences... such as executing financial transactions" (github.com/anthropics/anthropic-quickstarts computer-use-demo README, accessed 2026-08-16).
- An unrecognized blocking UI state appears (modal/dialog/CAPTCHA/step-up-auth/login prompt) that doesn't match any known-recoverable pattern (§1.1 of the taxonomy in §3 below draws the line between "known, auto-dismissable" and "unknown, escalate").

**Replay-time triggers** (the deterministic executor, no LLM in the loop per §3.3):
- A **hard failure** per the taxonomy in §3 below (checkpoint never reached, no known error pattern matched, ambiguous post-write state).
- An allowlist violation attempted mid-replay (this indicates artifact/policy drift, not just a runtime hiccup — surfaced to a human as a policy alert, distinct from a normal escalation, because unlike discovery there is no model to "decide differently"; replay should abort outright and flag for artifact review, only escalating to *live* human control if there is a legitimate reason to believe manual completion is still possible and safe).
- A risky/irreversible step is reached and the artifact/capability has not been marked "approved for unattended replay" (ties to §8 stretch goal "Confidence & approval" — draft/approved gate). Even in "approved" capabilities, a **class of steps** (e.g., final submit on money movement) can be pinned to always require confirmation regardless of approval state.

### 1.2 Same-session control transfer for a browser surface

The mechanism that makes "same live session" real (not a fresh one) is that the browser process, its cookies/local-storage, its open tab, and its DOM state are never torn down across the handoff — only *who is issuing input* changes.

**Chrome DevTools Protocol (CDP) is the primary real mechanism.** CDP's `Target` domain lets any client `attachToTarget` on a running page/tab and receive a `sessionId` used to route further commands (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`, `Page.navigate`, etc.) to that exact tab (Chrome DevTools Protocol, `Target.attachToTarget`, chromedevtools.github.io/devtools-protocol/tot/Target/, accessed 2026-08-16; ChromeDevTools/getting-started-with-cdp README, github.com/ChromeDevTools/getting-started-with-cdp, accessed 2026-08-16). Playwright exposes the same capability at a higher level via `chromium.connectOverCDP(endpointURL)`, which attaches to an **already-running** browser (launched headed, e.g. with `--remote-debugging-port=9222`) and exposes its existing `browser.contexts()[0].pages()[0]` — i.e., the actual live page, not a new one (Playwright docs, `BrowserType.connectOverCDP`, playwright.dev/docs/api/class-browsertype, accessed 2026-08-16).

Design for this take-home:
- Launch **one** headed Chromium instance with a fixed CDP debugging port for the whole run (discovery or replay).
- The automation harness (LLM loop or replay executor) holds the "driver" role: it is the process currently issuing `Input.*`/`Page.*` commands over CDP.
- On an escalation trigger, the harness **stops issuing commands** (it does not close the browser, the tab, or the CDP connection — it just pauses its own action loop) and flips session ownership (§7) to `human`.
- The human takes control of the **same visible window** in one of two equally-real ways, depending on where the browser process lives:
  - **Local/same-desktop case (cheapest, fully real):** the Chromium window is already visible on the operator's screen because it was launched headed and non-minimized; the human simply clicks into that window and drives it directly with mouse/keyboard — this is literally the same OS window, same CDP target, same cookies. No extra remote-control channel is needed. **Viable for this take-home** — this is the recommended default given a single-engineer, local-first setup.
  - **Remote/headless/containerized case:** if the browser runs in a container or remote host with no visible display, control transfer needs an actual remote-input channel — e.g., a second CDP client used by an "operator" web page that intercepts local mouse/key events and replays them via `Input.dispatchMouseEvent`/`Input.dispatchKeyEvent` on the shared CDP session, or a VNC/noVNC server pointed at the container's virtual display (Xvfb) exposing full mouse/keyboard, not just view. This is the same idea Anthropic recommends for computer-use deployments — "run in a dedicated virtual machine or container," reachable and controllable, not a black box (Anthropic, `computer-use-demo/README.md`, github.com/anthropics/anthropic-quickstarts, accessed 2026-08-16; "How we contain Claude across products," anthropic.com/engineering/how-we-contain-claude, accessed 2026-08-16). **Viable only as design story** for this take-home unless the chosen architecture already runs the browser in a container — building a full noVNC relay is disproportionate effort for a take-home.
- Resume: the human (or the mock operator UI) signals "done" (a button, a CLI command, an API call); the harness re-attaches its action loop, but **re-observes state first** (fresh screenshot/DOM/accessibility snapshot) rather than assuming the pre-handoff plan is still valid (see §6 resume semantics).
- **A full real-time co-browsing console** (shared live cursor, simultaneous multi-party control, telestration) is explicitly out of scope per §3.6 scope note. **Not viable / avoid** building this; a bare/mock operator surface satisfies the brief.

Note on OpenAI's product-level analogue: Operator/CUA implements a very similar seam under different names — **Takeover Mode** (control passed to the user for sensitive input like credentials/payment, during which "Operator does not collect or screenshot information entered by the user") and **Watch Mode** (on sensitive sites, the agent proceeds but requires active human supervision and pauses on inactivity) (OpenAI, "Introducing Operator," openai.com/index/introducing-operator, accessed 2026-08-16; "Computer-Using Agent," openai.com/index/computer-using-agent, accessed 2026-08-16; *Operator System Card*, cdn.openai.com/operator_system_card.pdf, accessed 2026-08-16). These map directly onto this system's `human`-owned and `transitioning` session-ownership states (§7), and the "Operator does not collect/screenshot during takeover" detail is a direct precedent for the redaction rule that **evidence capture must pause or redact while a human is entering credentials** (§9).

### 1.3 Same-session control transfer for desktop/Electron (design-only for this take-home)

**Electron** apps embed Chromium and can be attached to over the same CDP mechanism as a browser: launching (or already having launched) the Electron main process with `--remote-debugging-port` exposes its renderer(s) as CDP targets, which Playwright/Puppeteer can drive the same way as a browser tab (Playwright, *Electron* class docs, playwright.dev/docs/api/class-electron, accessed 2026-08-16 — Playwright ships first-class Electron automation built on this same CDP attach model). This means the web-surface control-transfer design (§1.2) **extends to Electron with no new primitive** — same CDP `attachToTarget`/`Input.*` seam, same "harness stops issuing commands, human takes the visible window" handoff. This is the key argument for why the artifact/replay abstraction should not hard-wire "web" into its locator or control-transfer model (ties to G4).

**Native desktop (non-Electron, no CDP)** has no browser-equivalent protocol, so control transfer must happen at the **OS session level**, not the application level. Two serious, official precedents:

- **Windows Remote Desktop Session Shadowing** (`mstsc /shadow:<sessionID> [/control] [/noConsentPrompt]`) lets one party attach to another's *already-running* interactive session and either just view it or take full keyboard/mouse control, with a policy-configurable consent prompt (Microsoft Learn, `shadow` command reference, learn.microsoft.com/en-us/windows-server/administration/windows-commands/shadow, accessed 2026-08-16; Microsoft Learn, "Remote Desktop Services: Session Shadowing," learn.microsoft.com/en-us/archive/technet-wiki/19804.remote-desktop-services-session-shadowing, accessed 2026-08-16). This is directly analogous to what §3.6 asks for at the OS layer: the automated session keeps running under one Windows session, and shadowing takes over *that exact session* rather than starting a new remote desktop connection.
- **UiPath's "Robot Session" (formerly Picture-in-Picture)** is the RPA-industry's shipped answer to "let a human and an unattended-style robot share one desktop session, then hand back": the automation runs in a child Windows session or a virtual desktop, and the human can "Join" it (expand to full screen, take input) and "Leave" it (return control to the robot) without restarting the process (UiPath docs, "Assistant - Robot session (previously Picture-in-Picture)," docs.uipath.com/robot/standalone/latest/admin-guide/picture-in-picture, accessed 2026-08-16). UiPath's "attended automation" model more broadly documents the same pattern this brief wants: "the robot runs until it reaches an auth gate, then pauses for the human to complete the login... after the human performs the action, the robot verifies the authenticated state and resumes execution" (UiPath docs, `attended-automations`, docs.uipath.com/robot/standalone/latest/admin-guide/attended-automations, accessed 2026-08-16; UiPath community pattern guide, "Interactive attended handoff," github.com/uipath/skills, accessed 2026-08-16). This is essentially a production-proven version of exactly the pause→cede→resume seam this brief is asking for, from the same industry (bank/insurance back-office RPA).
- **VNC-family screen sharing** (any X11/VNC server on Linux, Screen Sharing on macOS) is the equivalent primitive for non-Windows desktop targets — shares an existing display/session rather than creating a new remote login.

Design implication for the artifact/surface abstraction (feeds G4 and §3.7 write-up): "control transfer" should be modeled as a **capability of the Surface**, not of the artifact. A `WebSurface`/`ElectronSurface` implements it via CDP attach/detach; an `OsDesktopSurface` implements it via session shadowing or VNC; the artifact schema and replay engine only need to know "pause," "signal human,", "await resume," and "re-verify checkpoint" — they should never encode *how* control is transferred. This is a **design-only** conclusion for this take-home (no native desktop surface will be built), but it is cheap to keep the seam honest now.

### 1.4 Sources — §1

| Source | URL | Accessed |
|---|---|---|
| Chrome DevTools Protocol, `Target` domain (`attachToTarget`, `detachFromTarget`, `sendMessageToTarget` deprecation) | https://chromedevtools.github.io/devtools-protocol/tot/Target/ | 2026-08-16 |
| Getting Started with CDP (official ChromeDevTools org) | https://github.com/ChromeDevTools/getting-started-with-cdp | 2026-08-16 |
| Playwright `BrowserType.connectOverCDP` | https://playwright.dev/docs/api/class-browsertype | 2026-08-16 |
| Playwright Python `connect_over_cdp` | https://playwright.dev/python/docs/api/class-browsertype | 2026-08-16 |
| Playwright Electron automation | https://playwright.dev/docs/api/class-electron | 2026-08-16 |
| Anthropic, "How we contain Claude across products" | https://www.anthropic.com/engineering/how-we-contain-claude | 2026-08-16 |
| Anthropic, `computer-use-demo` README (safety precautions) | https://github.com/anthropics/anthropic-quickstarts/blob/main/computer-use-demo/README.md | 2026-08-16 |
| Anthropic, "Trustworthy agents in practice" | https://www.anthropic.com/research/trustworthy-agents | 2026-08-16 |
| OpenAI, "Introducing Operator" (Takeover Mode, Watch Mode) | https://openai.com/index/introducing-operator/ | 2026-08-16 |
| OpenAI, "Computer-Using Agent" | https://openai.com/index/computer-using-agent/ | 2026-08-16 |
| OpenAI, *Operator System Card* (PDF) | https://cdn.openai.com/operator_system_card.pdf | 2026-08-16 |
| Microsoft Learn, `shadow` command | https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/shadow | 2026-08-16 |
| Microsoft Learn, RDS Session Shadowing | https://learn.microsoft.com/en-us/archive/technet-wiki/19804.remote-desktop-services-session-shadowing | 2026-08-16 |
| UiPath docs, Attended automations | https://docs.uipath.com/robot/standalone/latest/admin-guide/attended-automations | 2026-08-16 |
| UiPath docs, Robot session (Picture-in-Picture) | https://docs.uipath.com/robot/standalone/latest/admin-guide/picture-in-picture | 2026-08-16 |
| UiPath skills repo, Interactive attended handoff pattern | https://github.com/uipath/skills/blob/main/skills/uipath-planner/references/attended-reauth-pattern-guide.md | 2026-08-16 |
| LangChain/LangGraph, `interrupt()` human-in-the-loop docs | https://docs.langchain.com/oss/python/langgraph/interrupts | 2026-08-16 |
| LangGraph human-in-the-loop concepts (GitHub) | https://github.com/langchain-ai/langgraph/blob/main/docs/docs/concepts/human_in_the_loop.md | 2026-08-16 |
| LangChain blog, "Making it easier to build human-in-the-loop agents with interrupt" | https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt | 2026-08-16 |
| MDN, `MediaDevices.getDisplayMedia()` (screen capture, no native remote input) | https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia | 2026-08-16 |
| W3C, Captured Surface Control (limited zoom/scroll forwarding only, not full remote control) | https://w3c.github.io/mediacapture-surface-control/ | 2026-08-16 |

---

## 2. Allowlist / risky-action / redaction patterns for regulated financial data

*(Design thinking without implementing a compliance program — per instructions.)*

### 2.1 Allowlist design principles

The controlling security principle is **positive validation (allowlist), not negative validation (denylist)**: "Allowlisting is the recommended minimal approach. Denylisting is prone to error, can be bypassed with various evasion techniques" (OWASP Top 10 Proactive Controls, C3 — Validate all Input, top10proactive.owasp.org, accessed 2026-08-16; OWASP Input Validation Cheat Sheet, cheatsheetseries.owasp.org, accessed 2026-08-16; OWASP ASVS 4.0, §V5, requirement 5.1.3 — "all input... validated using positive validation (allow lists)," github.com/OWASP/ASVS, accessed 2026-08-16). Applied to a computer-use agent, the allowlist has to cover more than form fields — it must cover **where the agent is allowed to be** and **what it is allowed to do there**:

- **Domain/host allowlist** — e.g., only `*.bankdemo.local` or the one public-proxy domain used for the take-home. Anthropic's own computer-use guidance states this explicitly: "Limit internet access to an allowlist of domains to reduce exposure to malicious content" (Anthropic `computer-use-demo` README, accessed 2026-08-16), and their production write-up describes doing this at the **network layer** (host firewall/egress rules resolved to IPs), not trusting in-guest DNS or the model's self-restraint ("How we contain Claude across products," accessed 2026-08-16).
- **Route/path allowlist** — canonicalized route patterns (e.g. `/member/:id`, `/member/:id/subaccounts/new`) rather than literal URLs, so the same allowlist entry covers every concrete instance (ties to the canonicalization stretch goal in §8 of the brief and to the multi-tenant reuse pattern in §4 below).
- **Action-type allowlist** — coarse verbs the agent may perform at all (`click`, `type`, `select`, `navigate`, `read`/`extract`) vs. verbs that are blocked outright regardless of target (`download`, `upload`, `execute_script`) unless a capability explicitly declares a need for them.
- **Per-capability declared scope** — each artifact (§3.2 of the brief) should declare *which* allowlist entries it needs (domains, routes, action types), so a human reviewer approving a capability is reviewing a small, legible diff against the global policy rather than trusting "the agent in general." This is the same idea as OWASP's structured-data-plus-schema validation (ASVS 5.1.4) applied to a capability manifest instead of a form.

**Layering** (outer → inner, cheapest/most-deterministic first): (1) network egress allowlist (host/container firewall — deterministic, cannot be argued around by a compromised or confused model — "the deterministic boundary is what gets hit when everything probabilistic misses," Anthropic, accessed 2026-08-16); (2) app-level policy engine allowlist (config-driven, evaluated by the harness before each action is dispatched — deterministic code, not a prompt); (3) per-action human confirmation for the risky class (§2.2). **Viable for this take-home:** layers 2 and 3 (a real, enforced, config-driven policy gate) — this is the load-bearing piece the grader can actually see work. **Viable only as design story:** layer 1 (VM/container egress firewalling) — worth describing, disproportionate to fully build for a single local demo target.

### 2.2 Safe/reversible vs. risky/irreversible classification

Both frontier computer-use products converge on the same design: classify actions by **potential harm × ease of reversal**, then gate the "high on both" class behind human confirmation, and forbid the worst class outright.

- OpenAI's Operator/CUA: "we categorized tasks and actions by their risk severity, considering the potential for harm to the user or others, and the ease of reversing any negative outcomes... This approach applies to model actions such as conducting financial transactions, sending emails, deleting calendar events... In some cases where the risk is determined to be too significant, we fully restrict the model from assisting with certain tasks, such as selling or purchasing stocks" (*Operator System Card*, accessed 2026-08-16). Measured effect: with mitigations, the model asks for confirmation on high-risk actions "with an average recall percentage of 92%" across 607 evaluated tasks — i.e., even a trained model is not 100% reliable at self-gating, which is the argument for a **deterministic policy gate outside the model**, not reliance on the model volunteering to ask.
- Anthropic: "Ask a human to confirm decisions that may result in meaningful real-world consequences as well as any tasks requiring affirmative consent, such as accepting cookies, executing financial transactions, or agreeing to terms of service" (`computer-use-demo` README, accessed 2026-08-16).

Applied concretely to a bank-like back-office app (this is **design judgment**, informed by but not copied verbatim from the sources above, since neither source targets bank back-office screens specifically):

| Class | Examples (bank-like) | Handling |
|---|---|---|
| **Safe / reversible** | Search/lookup a member, open a detail page, filter/sort a table, fill a form field *before* submit, navigate between screens, read/extract data | Allowed autonomously within the allowlist; no confirmation needed |
| **Risky / irreversible** | Submit/confirm a funds transfer, open or close an account, post a fee waiver, override a compliance hold, change a credit limit or interest rate, send a customer communication (email/SMS/letter), delete a record | Blocked by default; requires an explicit human confirmation step recorded in the run (both in discovery **and** in replay, unless the specific capability + step has been marked approved for unattended use per an approval workflow) |
| **Out of allowlist entirely** | Anything outside the declared domain/route/action-type scope for the capability | Hard-blocked, never offered as "confirm to proceed" — this is a policy violation, not a risk judgment call |

The same three-way split maps onto the public-proxy target: "safe" = browsing, searching, adding to cart, filling shipping info; "risky/irreversible" = the final "Place Order"/payment-submit action; "out of allowlist" = navigating off the target domain (e.g., following an outbound ad/affiliate link).

**Design rule:** risk classification is a property recorded **on the artifact's step**, not inferred at replay time by pattern-matching button text — the discovery run (or a human reviewing the artifact before approval) tags each step `risk: safe | confirm | irreversible`, because inferring "is this button dangerous" from DOM text alone is exactly the kind of heuristic that breaks on the legacy, non-semantic markup this brief warns about (§1 of the brief: "no test IDs," "non-semantic markup"). **Viable for this take-home.**

### 2.3 Redaction of regulated financial data

The brief explicitly invokes "PCI/PII/GLBA-level thinking without implementing a compliance program" — so the goal here is **correct mental model and concrete rules**, not a certified control set.

- **PCI DSS v4.0.1** draws a sharp distinction that matters for a logging/artifact design: **masking** (Requirement 3.4.1 — display at most first six/last four digits of a PAN) is a *display* rule; **rendering unreadable in storage** (Requirement 3.5.1 — one-way hash of the full PAN, truncation, tokenization/index tokens, or strong encryption with key management) is a *storage* rule, and "if PAN lands in logs, traces, or monitoring payloads and is retained, it is 'stored' and must be rendered unreadable" (PCI DSS v4.0.1, Req. 3.4.1/3.5.1; PCI Security Standards Council, *Payment Card Industry Data Security Standard: Requirements and Testing Procedures v4.0.1*, June 2024, mirrored at https://www.middlebury.edu/sites/default/files/2025-01/PCI-DSS-v4_0_1.pdf, accessed 2026-08-16). **Practical takeaway for this system: never persist a full PAN/account-number-shaped string anywhere, including "masked" form, in logs or artifacts — the safe default is to not log the value at all**, not to log a masked version, since masking alone does not satisfy the storage requirement.
- **GLBA Safeguards Rule (FTC, 16 CFR Part 314)** is broader than card data: it covers "customer information," i.e. any nonpublic personal information (NPI) about a customer of a financial institution, and requires "administrative, technical, and physical safeguards" including a written risk assessment, access controls, and encryption — but it does **not** prescribe a specific redaction algorithm (FTC, "FTC Safeguards Rule: What Your Business Needs to Know," ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know, accessed 2026-08-16; 16 CFR Part 314, govinfo.gov/content/pkg/CFR-2025-title16-vol1/pdf/CFR-2025-title16-vol1-part314.pdf, accessed 2026-08-16). **Practical takeaway: the obligation is data minimization + access control, so the design answer is "don't capture NPI (SSN, DOB, full account numbers, balances tied to an identified person) into logs/artifacts/evidence in the first place," not "encrypt it after collecting it."**
- **NIST SP 800-122** recommends a risk-based approach: classify PII by a "PII confidentiality impact level" (low/moderate/high) and apply safeguards, including de-identification, proportional to that level (NIST SP 800-122, *Guide to Protecting the Confidentiality of Personally Identifiable Information (PII)*, McCallister/Grance/Scarfone, 2010, nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-122.pdf, accessed 2026-08-16). This supports **tiering redaction rules** (e.g., a member ID used only as a lookup key is lower-impact than a full name+SSN+balance triple appearing together).
- **OWASP Logging Cheat Sheet / ASVS §V7** gives the concrete "never log" list this project should adopt directly: credentials, session identifiers/tokens (or only a hashed form), "bank account or payment card holder data," and "sensitive personal data" (OWASP Cheat Sheet Series, *Logging*, cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html, accessed 2026-08-16; OWASP ASVS 4.0.3, §V7, requirement 7.1.1/7.1.2, asvs.dev/v4.0.3/V7-Error-Logging/, accessed 2026-08-16).

**Concrete redaction rules for this system** (synthesized from the sources above — this is the operative design, see §9 for the canonical checklist):
1. Credentials, API keys, and session tokens are **never** written to artifacts, logs, or evidence — they live only in process environment/secret-store and are referenced by name, never by value, even in debug output.
2. Screenshots/DOM snapshots captured as evidence go through a redaction pass **before** they are written to disk: any field the policy marks `sensitive` (password inputs, SSN/account-number-shaped inputs, full card numbers) is blacked out or replaced in the captured artifact, not merely omitted from the *log line* referencing the screenshot.
3. Structured run logs use an **allowlisted field schema** (step name, action type, a human-readable locator *description* — not raw captured form values —, outcome/result kind, timing) — this is itself an application of the "allowlist over denylist" principle to logging, not just to network/actions. A denylist-style regex scrubber (matching card-number-shaped or SSN-shaped strings) is kept only as a **secondary, defense-in-depth layer**, consistent with OWASP's own guidance that denylisting is acceptable as a supplementary catch, never as the primary control (OWASP Input Validation Cheat Sheet, accessed 2026-08-16).
4. Artifacts store parameter **names and types**, never example values captured from a real run beyond clearly synthetic/redacted samples used for documentation.
5. During a human takeover of the live session (§1), evidence capture (screenshots, DOM dumps) for the interval where the human may be entering credentials/payment data is **paused or explicitly excluded**, mirroring OpenAI's stated behavior that "when in takeover mode, Operator does not collect or screenshot information entered by the user" (OpenAI, "Introducing Operator," accessed 2026-08-16).

**Viable for this take-home:** rules 1, 3, 4, 5 as real, enforced code paths (a redaction/log-schema module is cheap and directly demonstrable). Rule 2 (pixel-level screenshot redaction) is **viable for this take-home** in a light form (blank out known sensitive-field bounding boxes before saving) but a fully general "detect sensitive regions visually" system is **design-only**.

### 2.4 Sources — §2

| Source | URL | Accessed |
|---|---|---|
| OWASP Input Validation Cheat Sheet (allowlist vs denylist) | https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html | 2026-08-16 |
| OWASP Top 10 Proactive Controls, C3 (Validate Input) | https://top10proactive.owasp.org/archive/2024/the-top-10/c3-validate-input-and-handle-exceptions/ | 2026-08-16 |
| OWASP ASVS 4.0, §V5 Validation/Sanitization/Encoding | https://github.com/OWASP/ASVS/blob/master/4.0/en/0x13-V5-Validation-Sanitization-Encoding.md | 2026-08-16 |
| OWASP Logging Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | 2026-08-16 |
| OWASP ASVS 4.0.3, §V7 Error Handling and Logging | https://asvs.dev/v4.0.3/V7-Error-Logging/ | 2026-08-16 |
| PCI Security Standards Council, PCI DSS v4.0.1 (Req. 3.4.1, 3.5.1) | https://www.middlebury.edu/sites/default/files/2025-01/PCI-DSS-v4_0_1.pdf | 2026-08-16 |
| FTC, "FTC Safeguards Rule: What Your Business Needs to Know" | https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know | 2026-08-16 |
| 16 CFR Part 314 — Standards for Safeguarding Customer Information | https://www.govinfo.gov/content/pkg/CFR-2025-title16-vol1/pdf/CFR-2025-title16-vol1-part314.pdf | 2026-08-16 |
| NIST SP 800-122, Guide to Protecting the Confidentiality of PII | https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-122.pdf | 2026-08-16 |
| Anthropic, `computer-use-demo` README | https://github.com/anthropics/anthropic-quickstarts/blob/main/computer-use-demo/README.md | 2026-08-16 |
| Anthropic, "How we contain Claude across products" | https://www.anthropic.com/engineering/how-we-contain-claude | 2026-08-16 |
| OpenAI, *Operator System Card* | https://cdn.openai.com/operator_system_card.pdf | 2026-08-16 |
| OpenAI, "Introducing Operator" | https://openai.com/index/introducing-operator/ | 2026-08-16 |

---

## 3. Business outcome vs. recoverable vs. hard-failure taxonomy

*(The glossary calls conflating these "the most common design mistake here" — §10.)*

### 3.1 The precedent: RPA's business exception vs. system/application exception

This exact three-way (well, historically two-way, we add a third) split has been production-hardened for over a decade in RPA deployed at banks and insurers — the same domain this brief targets. UiPath's Orchestrator documentation draws the line as follows:

> "A Business Exception describes an error rooted in the fact that certain data which the automation project depends on is incomplete or missing... If a certain phone number is missing a digit due to human error, the queue item... becomes invalid... Retrying the transaction does not yield any chance of solving the issue, and there are other better courses of action, such as notifying the human user of this error... By default, Orchestrator does not retry transactions which are failed due to Business Exceptions" (UiPath docs, "Orchestrator - Business Exception Vs Application Exception," docs.uipath.com/orchestrator/standalone/2024.10/user-guide/business-exception-vs-application-exception, accessed 2026-08-16).

System/Application exceptions, by contrast, are "technical, unexpected failures such as application crashes, network timeouts, or missing UI elements... often transient, and UiPath Orchestrator is configured by default to automatically retry queue items that fail due to system exceptions" (same source; corroborated by UiPath Community Forum thread, forum.uipath.com/t/difference-between-system-exception-and-business-exception, accessed 2026-08-16).

Mapping this onto the brief's three-way split (§3.3, §10 glossary):

| Brief's category | UiPath analogue | Definition | Replay behavior |
|---|---|---|---|
| **Business outcome** | Business exception (but *not* a failure at all — a legitimate typed result) | A legitimate, expected terminal state produced by business rules/data, not a system malfunction. "No such member," "member has no savings account," "duplicate application," "insufficient funds." | Return a structured, typed result to the caller — success path of the result contract, just not the "happy" branch. Never thrown as an exception. |
| **Recoverable** | (no direct UiPath analogue — closest is auto-retried system exceptions, but scoped to *known* patterns) | A transient or expected friction that the system can resolve itself via a **known, allowlisted** compensating action, then continue. | Auto-handle (dismiss/retry/wait), log a "recovered" event, continue the flow. Never silently swallowed — always recorded. |
| **Hard failure** | System/Application exception, escalated rather than blindly retried | Something is wrong, indeterminate, or in a state the system cannot reason about safely — not covered by a known pattern. | Abort, capture evidence, report a structured error with step/expected/observed, and — per §3.6 — route to human escalation if live intervention could still complete the goal safely. |

### 3.2 Concrete examples — bank-like flow

**Goal: "look up member 12345 and read their current savings balance"**

| Category | Concrete example | Why |
|---|---|---|
| Business outcome | Search returns "No member found for ID 12345" | Legitimate answer the calling agent needs (e.g., to tell the end customer their ID was mistyped) — not a system malfunction |
| Business outcome | Member found, but has no savings account (only checking) | Expected business state; return `{status: "no_such_account_type"}` |
| Recoverable | A "results per page" or "you have unsaved changes" interstitial appears on first load — a **known**, allowlisted dialog the artifact declares how to dismiss | Deterministic, expected friction; auto-handled, logged as a recovered event |
| Recoverable | Page is slow to load (network latency); checkpoint element not yet present after 1s | Bounded wait/retry (e.g., up to N attempts / T seconds) before treating as a failure |
| Hard failure | Checkpoint locator never appears and no known error banner matches any allowlisted pattern | Unrecognized state — could be a new error type, a UI change, or a bug; must not be guessed at |
| Hard failure | Session/auth expires mid-flow with no allowlisted re-authentication capability | The replay cannot safely proceed or determine the account's true state; abort + escalate rather than attempt an unscoped login |
| **Ambiguous — explicitly call this out** | Page shows "Access Denied" for this member | This *could* be modeled as a business outcome (the caller's account genuinely lacks entitlement) **or** a hard failure (the automation's own service account is misconfigured) — the artifact author must explicitly decide and declare which, because the same UI text is legitimately either depending on *whose* permission failed. Treating this ambiguity as "someone else's problem" is exactly the trap the glossary warns about. |

**Goal: "open a new sub-account for this member and reach the confirmation screen"**

| Category | Concrete example | Why |
|---|---|---|
| Business outcome | "Member has reached the maximum number of sub-accounts" validation message | A business rule, returned as a typed outcome, not an exception |
| Recoverable | "You have unsaved changes, continue?" navigation-guard dialog, known and declared in the artifact | Auto-confirmed as part of the recorded flow |
| Hard failure | Form submits, but the confirmation page does not show the expected new account number, and no error banner is present either | **Indeterminate whether the transaction completed** — this is a money-adjacent write action; per the saga-pattern principle that ambiguous outcomes on non-idempotent writes must never be blindly retried (see idempotency-key literature, e.g. Stripe-style idempotency keys — cited generally, not a specific bank source, as **design judgment** informed by industry practice), the system must halt and escalate to a human to verify true state rather than re-submit or assume success |

### 3.3 Concrete examples — public-proxy flow (cart/checkout or search/detail)

| Category | Concrete example | Why |
|---|---|---|
| Business outcome | "No results found for this search term" / item is out of stock | Legitimate answer, not a crash |
| Business outcome | Item added, but quantity was capped to available stock (5 requested, 2 in stock, cart shows 2) | Expected business rule, must be surfaced as a typed outcome so the caller isn't misled |
| Recoverable | A cookie-consent banner covers the page on first load — known, allowlisted, dismissed automatically | Deterministic, declared in the artifact |
| Recoverable | Product image is lazy-loaded and not yet rendered when the checkpoint check runs | Wait-for-network-idle / wait-for-element before checking the checkpoint, bounded retry |
| Hard failure | Checkout total shown does not match the total computed from cart line items | Do not blindly submit a payment step against a total that doesn't reconcile — halt and escalate/report, since proceeding could authorize an incorrect charge |
| Hard failure | An unexpected upsell/cross-sell modal appears mid-checkout that was never seen during discovery and matches no known dismissible pattern | Unrecognized state; escalate rather than guess which button is "continue" |

### 3.4 Result contract shape (ties to G8 — artifact schema philosophy)

The taxonomy should be visible in the **type system** of the replay result, not just in prose — a discriminated union such as:

```
type ReplayResult =
  | { kind: "success"; outputs: Record<string, unknown> }
  | { kind: "business_outcome"; code: string; detail: string }
  | { kind: "recovered"; recoveredVia: string; then: ReplayResult }
  | { kind: "hard_failure"; step: string; expected: string; observed: string; evidenceRef: string }
```

This makes it structurally impossible for a caller to accidentally treat "no such member" the same way as "the automation broke" — which is the concrete fix for the glossary's named "most common design mistake." **Viable for this take-home** — this is one of the cheapest, highest-signal things to get right, since it's a type design decision, not new infrastructure.

### 3.5 Sources — §3

| Source | URL | Accessed |
|---|---|---|
| UiPath docs, "Orchestrator - Business Exception Vs Application Exception" | https://docs.uipath.com/orchestrator/standalone/2024.10/user-guide/business-exception-vs-application-exception | 2026-08-16 |
| UiPath docs, same (Automation Suite variant) | https://docs.uipath.com/orchestrator/automation-suite/2024.10/user-guide/business-exception-vs-application-exception | 2026-08-16 |
| UiPath Community Forum, "Difference between system exception and business exception" | https://forum.uipath.com/t/difference-between-system-exception-and-business-exception/393241 | 2026-08-16 |
| /workspace/Project.md §10 glossary ("Business outcome vs. failure") | n/a (primary brief, not external) | 2026-08-16 |

---

## 4. Heterogeneity + multi-tenant reuse design patterns (design-only, per §3.7)

### 4.1 Surface abstraction seam (feeds G4)

The seam the brief asks for — "what's the seam between how we perceive/act on a surface and the recorded flow?" — should be modeled as: **`Surface`** (perceive: screenshot/DOM/accessibility-tree/UIA snapshot; act: click/type/navigate/dispatch-input; control-transfer: pause/attach-human/resume) is an interface with one implementation per surface family (`WebSurface` via Playwright/CDP, `ElectronSurface` via the same CDP attach model — see §1.3, `OsDesktopSurface` via platform accessibility APIs — design-only). The **artifact** never references a `Surface` implementation directly; it references locator *strategies* (e.g., `role+name`, `css`, `xpath`, `text`, `coordinate+visual-hash` as a last resort) that each `Surface` knows how to resolve. This mirrors the same separation RPA tooling already converged on: UiPath's **Object Repository** stores UI element descriptors independently of the workflow logic that uses them, specifically so the same automation logic can be pointed at different underlying selectors as the app changes or as tenants differ (UiPath docs, "About Object Repository," docs.uipath.com/studio/standalone/latest/user-guide/about-object-repository, accessed 2026-08-16) — i.e., **artifact = "what to do", locators = "how to find it on this surface", and the mapping between them is the extension point**, not a monolith.

### 4.2 Vendor-product + tenant overlay (feeds §3.7 write-up)

The problem: hundreds of tenants run the same ~20 vendor products, "configured, branded, and versioned differently" (Project.md §1). The reuse pattern with the most mature, shipped precedent is **base package + extension/overlay**, seen in two independent ecosystems:

- **Salesforce managed packages**: a base managed package can be extended by a separate "extension package" that "can reference objects, fields, Apex classes, and components from the base package... but cannot modify base package internals" — the extension pattern is how ISVs "ship add-on products that augment a base product without forking it" (salesforcedictionary.com/terms/managed-package-extension, accessed 2026-08-16). Field-label and page-layout overrides are handled through an explicit, additive override mechanism (Translation Workbench overrides, per-profile layout assignment) rather than editing the base package (Salesforce Stack Exchange, "Modify the layout of Financial Service Cloud components in an installed package," accessed 2026-08-16).
- **UiPath UI Libraries**: "the same Object Repository can then work for both environments" by keeping environment-specific values (URLs, credentials) *out* of the descriptor and in config/assets, and by publishing shared UI element descriptors as a versioned library that consuming projects install as a **dependency** and can deliberately upgrade (UiPath Community Forum, "Object Repository - What's the Best Practice?," accessed 2026-08-16; UiPath docs, "Reusing objects (UI libraries)," docs.uipath.com/studio/standalone/2025.10/user-guide/reusing-objects-ui-libraries, accessed 2026-08-16).

Design translation for this system's artifact schema: an artifact should be addressable as `{vendor_product_id}@{version}` (the *base*, recorded once against a reference tenant's instance of the vendor product) plus an optional `{tenant_id}` **overlay** that can override specific fields — locator strategy variants for a rebranded/reconfigured screen, parameter defaults, or step-level text — **without duplicating the whole artifact**. This is a **bridge model** in the AWS SaaS-isolation sense (see §4.4): the artifact *definition* is pooled (one base, shared logic across tenants running the same vendor product), while artifact *execution context* (credentials, allowlist config, captured evidence, session) is siloed per tenant. AWS's own framing: "the bridge model... lets you silo what must be isolated for compliance or noisy-neighbor reasons while pooling the rest for efficiency" (AWS Well-Architected SaaS Lens, "Silo, Pool, and Bridge Models," docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html, accessed 2026-08-16; AWS Whitepaper, "SaaS Tenant Isolation Strategies," docs.aws.amazon.com/pdfs/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.pdf, accessed 2026-08-16).

### 4.3 Drift detection (design-only)

Two complementary, cited mechanisms:

1. **Locator fallback chains with structured drift logging.** At replay time, if the primary locator strategy for a step fails, fall through a declared, ordered list of fallback strategies (e.g., `role+accessible-name` → `stable-id` → `text` → `relative-position`); if a fallback succeeds, the run still **succeeds**, but a structured "drift event" is emitted (which strategy failed, which one worked, on which tenant/version) so a human can review before it becomes a hard failure. This treats drift as a *signal to review*, not an immediate outage — directly informed by UiPath's model where a UI Library can be updated with a new locator version and "all other solutions... can then upgrade dependencies" deliberately rather than reactively (docs.uipath.com/studio/standalone/2025.10/user-guide/reusing-objects-ui-libraries, accessed 2026-08-16).
2. **Config-as-code drift detection**, borrowed from the feature-flag/GitOps world: declare the *expected* base+overlay configuration in version control, and treat any divergence between the declared state and the observed runtime behavior (e.g., a fallback locator was needed, or a step's checkpoint text changed) as drift to be flagged, analogous to how flag-as-code tooling "detects drift [when] a user manually changes a flag... and reverts it (or alerts, depending on policy)" (FlagWay project README, github.com/FlagWay/flagway, accessed 2026-08-16) and how Martin Fowler's canonical feature-toggle write-up frames centralized, versioned toggle configuration with promotion between environments (martinfowler.com/articles/feature-toggles.html, accessed 2026-08-16). This is a **design analogy**, not a claim that feature-flag tooling is directly reusable — the point is the pattern (declared expected state + observed state + explicit reconciliation policy), not the specific product.

### 4.4 Multi-tenant isolation model for artifacts/evidence (design-only)

Borrowing directly from AWS's SaaS tenant-isolation whitepaper vocabulary (silo/pool/bridge — docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/, accessed 2026-08-16): this system should be a **bridge model**. Pool the artifact *definition* (one reviewed, versioned capability per vendor-product, reused across every tenant running that product) but silo the artifact's **execution context** per tenant — credentials, allowlist policy, captured screenshots/evidence, and run logs must not cross tenant boundaries, "even though shared resources... increase the chance for cross-tenant access... you cannot use this as a rationale to relax the isolation requirements" (AWS Whitepaper, "Pool isolation," docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/pool-isolation.html, accessed 2026-08-16). Concretely: `capability_id` (pooled) is distinct from `run_id` (siloed, tagged with `tenant_id`, its own storage namespace/prefix), so that reusing a capability across 200 tenants never implies sharing one tenant's evidence directory with another's.

**Mark: all of §4 is Viable only as design story for this take-home** — per §3.7 of the brief, "we don't expect you to implement multi-tenant or desktop support. We do expect the core abstractions not to paint you into a corner." The one thing worth actually demonstrating cheaply, if time allows, is the base+overlay *shape* in the artifact schema itself (an optional `overrides` object keyed by tenant, even with only one tenant ever populated) — this costs almost nothing to add to the schema and directly substantiates the design story with a real type, without requiring a second tenant, second vendor instance, or any tenant-registry infrastructure (which is explicitly listed as *not* rewarded — "queues, clusters, multi-tenant plumbing," §7).

### 4.5 Sources — §4

| Source | URL | Accessed |
|---|---|---|
| UiPath docs, About Object Repository | https://docs.uipath.com/studio/standalone/latest/user-guide/about-object-repository | 2026-08-16 |
| UiPath docs, Reusing objects (UI Libraries) | https://docs.uipath.com/studio/standalone/2025.10/user-guide/reusing-objects-ui-libraries | 2026-08-16 |
| UiPath Community Forum, Object Repository best practice | https://forum.uipath.com/t/object-repository-whats-the-best-practice/5753770 | 2026-08-16 |
| Salesforce Dictionary, "Managed Package Extension" | https://salesforcedictionary.com/terms/managed-package-extension | 2026-08-16 |
| Salesforce Stack Exchange, layout override in installed package | https://salesforce.stackexchange.com/questions/361122/modify-the-layout-of-financial-service-cloud-components-in-an-installed-package | 2026-08-16 |
| AWS Whitepaper, "SaaS Tenant Isolation Strategies" | https://docs.aws.amazon.com/pdfs/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.pdf | 2026-08-16 |
| AWS Well-Architected SaaS Lens, Silo/Pool/Bridge Models | https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html | 2026-08-16 |
| AWS Whitepaper, Pool isolation | https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/pool-isolation.html | 2026-08-16 |
| FlagWay (config-as-code drift detection pattern) | https://github.com/FlagWay/flagway | 2026-08-16 |
| Martin Fowler, "Feature Toggles (aka Feature Flags)" | https://martinfowler.com/articles/feature-toggles.html | 2026-08-16 |

---

## 5. Intervention request payload fields

Concrete schema (JSON-shaped), covering everything §3.6 asks the escalation to carry ("which capability/goal, the current step, the current state or screenshot, and why it stopped"):

```json
{
  "request_id": "esc_7f3a...",
  "run_id": "run_2026-08-16T17:40:00Z_ab12",
  "capability_id": "member_lookup_savings_balance@v3",
  "goal_text": "look up member 12345 and read their current savings balance",
  "trigger": {
    "reason_code": "unrecognized_state",
    "reason_detail": "Checkpoint locator 'balance-panel' not found; no known error pattern matched.",
    "trigger_source": "discovery" 
  },
  "step": {
    "index": 4,
    "name": "read_savings_balance",
    "expected_next_action": { "type": "extract_text", "target_description": "savings balance value in account summary panel" }
  },
  "state": {
    "screenshot_ref": "evidence/run_.../step_04_redacted.png",
    "dom_snapshot_ref": "evidence/run_.../step_04_dom_redacted.html",
    "current_url_or_window_title": "https://bankdemo.local/member/12345/accounts",
    "redaction_applied": true
  },
  "risk_level": "escalation_required",
  "session_owner_before": "automation",
  "artifact_version": "v3",
  "tenant_id": "design_only_default",
  "created_at": "2026-08-16T17:41:02Z",
  "expiry_at": "2026-08-16T17:56:02Z",
  "suggested_actions": ["review current screen", "manually navigate to the balance tab", "signal resume when done"]
}
```

Field notes:
- `trigger.reason_code` is a closed enum (not free text) so downstream tooling/metrics can bucket escalations — e.g., `max_steps_exceeded | loop_detected | allowlist_violation | risky_action_confirmation | unrecognized_state | hard_failure | replay_ambiguous_write_outcome`.
- `state.redaction_applied: true` is itself part of the contract — an intervention request must never carry an unredacted screenshot/DOM dump (ties to §2.3/§9).
- `expiry_at` bounds how long a request waits for a human before the run gives up entirely (ties to resume semantics in §6).

**Viable for this take-home** — this is a plain data contract, cheap to implement fully for real.

---

## 6. Resume semantics

- **Recording human actions.** While `session_owner == human`, every discrete action the human takes on the live session (clicks, navigations, form submits — not raw mouse-pixel telemetry) is appended to a `human_actions` log tied to the `run_id`, each entry carrying `{type, target_description, timestamp, value_present: boolean}` — **never the raw value typed**, only whether a value was present (this satisfies §3.6's "record what the human did" without violating the redaction rules in §9, and mirrors UiPath's attended-handoff pattern where "the robot verifies the authenticated state" after a human-completed step rather than inspecting what was typed — docs.uipath.com/robot/standalone/latest/admin-guide/attended-automations, accessed 2026-08-16). Capturing action *types and targets*, not values, is what makes it safe to keep this log even when the human was entering credentials.
- **Re-observation before resuming automation, never trust pre-handoff state.** On a resume signal, the harness takes a fresh screenshot/DOM/accessibility snapshot and evaluates it against the artifact's checkpoint conditions *before* deciding what to do next — this is the direct analogue of LangGraph's documented resume behavior, where on `Command(resume=...)` "graph execution starts from the beginning of the graph node where the last interrupt was triggered" rather than blindly continuing mid-function with stale assumptions (LangGraph docs, `interrupts`, docs.langchain.com/oss/python/langgraph/interrupts, accessed 2026-08-16; GitHub `human_in_the_loop.md`, accessed 2026-08-16).
- **Where the human left the flow matters.** Two resume paths:
  - If the human's actions brought the session to the **exact next expected checkpoint** the artifact/plan anticipated, resume proceeds from that step normally.
  - If the human moved the session to a **different recognized state** (e.g., they navigated somewhere else useful, or partially completed a different step), a **discovery-mode (LLM-in-the-loop) run** can re-plan from there — but a **pure deterministic replay** should not silently improvise; if the resulting state doesn't match a checkpoint the artifact declares, the safest default is to treat it as inconclusive and surface a hard failure requiring the artifact to be reviewed/updated, rather than guessing a new path through an app the replay engine has no model for reasoning about live.
- **Checkpoints and idempotency after resume.** Because a resume can, in principle, cause a step to be partially re-attempted (e.g., if the handoff happened mid-step), each step — especially any step classified `risky/irreversible` (§2.2) — should be treated the way saga-pattern literature treats a distributed transaction step: identify its idempotency key (e.g., "step + run_id + attempt"), and re-verify the checkpoint condition **immediately after resume and before dispatching the next irreversible action**, so a double-submit is structurally prevented rather than merely "unlikely." ("Every saga step must be idempotent... Use idempotency keys, an inbox table, or both," is the general-purpose framing this borrows from generic distributed-systems saga-pattern literature — cited as **design judgment informed by general industry practice**, not a bank-specific or authoritative standard: e.g. Voxire engineering blog, "Coordinating Distributed Transactions in Go: The Saga Pattern in Production," accessed 2026-08-16.)

**Viable for this take-home:** recording human action *types* + re-observation-before-resume + checkpoint re-verification are all cheap, real, demonstrable behaviors. **Viable only as design story:** full re-planning via the LLM after an "off-script" human resume — for this take-home, the safer and honestly-scoped choice is to require the operator to bring the session back to a recognized checkpoint, and to treat "landed somewhere unrecognized" as a hard failure that documents itself clearly rather than as a silently-improvised recovery.

---

## 7. Session ownership model

Explicit ownership states, each gating who may issue input to the live surface:

- **`automation`** — the harness (LLM loop or replay executor) is the sole issuer of input; the human, if watching, is view-only. This is the same distinction Windows RDP shadowing draws natively between "view session" and "control session" (`/control` flag) — control and observation are separate permissions, not a single on/off toggle (Microsoft Learn, `shadow` command, accessed 2026-08-16).
- **`transitioning_to_human`** — the harness has stopped issuing input (an escalation trigger fired) but the human has not yet explicitly taken over; the session is idle-but-alive. Bounded by the intervention request's `expiry_at` (§5) — if no human acts before expiry, the run terminates as a hard failure requiring a human review outside the live session.
- **`human`** — the human is the sole issuer of input; automation issues no commands and (per §9) evidence capture for this window follows the paused/redacted rule.
- **`transitioning_to_automation`** — the human has signaled resume; the harness is re-observing state (§6) before it starts issuing input again. This is a real, distinct state (not instantaneous) because re-observation can itself fail (e.g., the page is in an unrecognized state), in which case the transition aborts back into an escalation rather than silently becoming `automation`.

**Enforcement, not convention.** Every `act()` call in the harness must check current `session_owner == automation` before dispatching an input command — a cheap boolean/enum guard, not a documentation-only rule. This directly parallels how CDP's own model treats a session as something a client must explicitly `attachToTarget`/hold to issue commands into — ownership is a first-class, checkable thing, not an assumption (Chrome DevTools Protocol, `Target` domain, accessed 2026-08-16).

**Audit trail.** Every ownership transition (who/what requested it, timestamp, previous state, reason) is logged as a discrete event — this is the same audit-trail principle OWASP recommends for high-value transactions generally ("audit trails for high-value transactions, using tamper-resistant methods like append-only... tables," oligo.security OWASP Top 10 cheat-sheet-of-cheat-sheets summary of A09 Logging/Monitoring, accessed 2026-08-16 — used here as a secondary source corroborating OWASP's own official cheat sheets already cited in §2/§9), applied to control-transfer events specifically because "who is in control of a live session touching regulated data" is exactly the kind of high-value event that must be reconstructable after the fact.

**Viable for this take-home** — a four-state enum with an enforced guard and an append-only transition log is inexpensive and directly demonstrable.

---

## 8. Policy schema sketch (YAML)

```yaml
# policy.yaml — configurable allowlist + risk classification
version: 1
tenant_id: design_only_default   # single value for this take-home; schema anticipates more (see §4)

network:
  allowed_domains:
    - "bankdemo.local"
    - "*.bankdemo.local"

routes:
  # canonicalized route patterns, not literal URLs — see §4.1 canonicalization
  allowed:
    - pattern: "/member/:id"
      methods: [navigate, read]
    - pattern: "/member/:id/accounts"
      methods: [navigate, read]
    - pattern: "/member/:id/subaccounts/new"
      methods: [navigate, read, submit_form]

action_types:
  allowed: [click, type, select, navigate, extract_text, wait]
  blocked_by_default: [download, upload, execute_script, change_permissions]

risk_classification:
  default: safe
  rules:
    - match: { route: "/member/:id/subaccounts/new", action: "submit_form", step_role: "final_confirm" }
      risk: irreversible
      requires_confirmation: true
    - match: { action: "delete_record" }
      risk: irreversible
      requires_confirmation: true
    - match: { action: "send_communication" }
      risk: irreversible
      requires_confirmation: true

recoverable_patterns:
  # known, auto-dismissable interstitials — anything NOT listed here that blocks
  # progress is treated as unrecognized -> hard failure, never guessed at
  - id: unsaved_changes_dialog
    match_locator: "text=You have unsaved changes"
    action: click
    target_locator: "role=button[name='Continue']"
  - id: results_per_page_popup
    match_locator: "role=dialog[name='Results per page']"
    action: click
    target_locator: "role=button[name='OK']"

unattended_replay:
  # capability-level approval gate (ties to §8 stretch: draft -> approved)
  require_approval_for: [irreversible]
  default_state: draft

redaction:
  never_log_fields: [password, ssn, full_account_number, card_number, api_key, session_token]
  screenshot_blackout_selectors:
    - "input[type=password]"
    - "[data-sensitive=true]"
```

Notes: this is intentionally close to the OWASP-recommended positive-security shape (explicit allow, implicit deny) for `network`, `routes`, and `action_types`; `risk_classification` is a small rule-matching list rather than a free-text heuristic, so it stays reviewable by a human (a design goal directly stated in §3.2 of the brief: "a human reviewer... should be able to understand what the capability does"). **Viable for this take-home** — this is a config file plus a straightforward matcher, no new infrastructure.

---

## 9. Redaction rules (canonical checklist)

Never persist, in any artifact, log, or evidence file:
1. Credentials, passwords, API keys, session tokens/cookies (OWASP Logging Cheat Sheet; OWASP ASVS 7.1.1 — session tokens only ever in irreversibly hashed form if logged at all, accessed 2026-08-16).
2. Full PAN/card numbers, in any form (not even masked — masking is a display rule, not a storage rule, per PCI DSS 3.4.1 vs 3.5.1, accessed 2026-08-16). If a card-shaped or account-number-shaped string must be referenced for correlation, use an opaque token, never the value.
3. SSNs, dates of birth, full account balances tied to an identified customer, and other NPI/PII, unless narrowly necessary for the immediate step and even then minimized to what's needed (GLBA Safeguards Rule data-minimization framing; NIST SP 800-122 risk-based/impact-level framing, accessed 2026-08-16).
4. Raw values typed by a human during a takeover — only the *fact* that a value was entered, plus the field's semantic label, are recorded (§6).
5. Screenshots/DOM snapshots captured as evidence must pass through a redaction step (blackout known-sensitive selectors) **before** being written to disk — not filtered only at the point logs reference them.
6. Structured logs are built from an **allowlisted field schema** (step name, action type, locator *description*, outcome kind, timing) — raw captured form values are never a log field. A denylist regex scrubber for card/SSN-shaped patterns runs as a secondary, defense-in-depth pass only (OWASP: denylisting is acceptable only as a supplement, never the primary control, accessed 2026-08-16).
7. Retention is bounded — evidence and logs should have an explicit lifetime, "as short as possible" per OWASP ASVS §V7 guidance on log retention, rather than being kept indefinitely by default (asvs.dev/v4.0.3/V7-Error-Logging/, accessed 2026-08-16).

---

## 10. What must be REAL vs. mocked

| Component | Real or Mocked | Why |
|---|---|---|
| LLM-driven discovery run against a live surface | **Real** (non-negotiable per Project.md §4) | The brief states this explicitly outside anyone's discretion. |
| Pause → cede → resume mechanism on the actual live session (headed browser via CDP, or literally the same OS window) | **Real** | §3.6/§7 evaluation criteria: "not just a TODO"; this is the mechanism graders will check most closely. |
| Human-action recording during takeover | **Real** (types/targets), redacted values | §3.6 explicitly asks to "record what the human did." |
| Policy allowlist enforcement (domains/routes/action-types) | **Real**, config-driven gate | §3.4 requires enforcement, not description. |
| Risk classification + confirmation gate for irreversible actions | **Real** | Directly evaluated per §7 "treatment of risky and irreversible actions." |
| Redaction of captured evidence/logs | **Real** | §3.4 explicitly requires never persisting secrets/PII; must be demonstrable in `/evidence/`. |
| Business/recoverable/hard-failure result contract | **Real** | Central to §3.3 and named the most common mistake in the glossary — must be visible in actual replay output, not just described. |
| Operator console UI | **Mocked OK** (bare CLI prompt or a minimal local page showing the screenshot + a resume button) | Explicitly allowed by §3.6 scope note: "mock the operator UI if needed... make the handoff mechanism and control-transfer model real." |
| Network egress firewalling / VM sandboxing | **Design-only / lightly documented** | Valuable per Anthropic's guidance, but disproportionate infra to fully build for a single local demo target with a benign proxy site; describe in the write-up. |
| Remote-control channel for a headless/containerized browser (VNC/noVNC, remote CDP relay) | **Design-only**, unless the chosen architecture already runs the browser remotely | Only needed if the browser isn't already visible on the operator's own desktop; for a local-first take-home, the same-visible-window handoff is real and much cheaper. |
| Desktop/Electron control transfer (RDP shadowing, UiPath-style robot session, VNC) | **Design-only** | §3.7: desktop is explicitly design, not build, for this take-home. |
| Multi-tenant plumbing (registry, per-tenant deploy, drift-detection service) | **Design-only**; at most, an `overrides` field in the artifact schema as a cheap, real substantiation | §7 explicitly does not reward built scaling/multi-tenant infrastructure; §3.7 asks only that abstractions "not paint you into a corner." |

---

## Human gates touched by this research (G9, G4, G8)

Per instructions, these three gates from `_lab/decisions/open_questions.md` have HITL/safety-relevant sub-decisions surfaced by this research. Recorded here as **recommendations only** — gate status stays `OPEN` in `open_questions.md` until the orchestrator/human reconciles across all research files (this file does not overwrite that file).

- **G9 — HITL UX depth.** Recommendation: **CLI/API pause + the literal same headed browser window** for the operator to take over directly (§1.2), rather than building a local mock operator *console* as a separate rendered UI. Rationale: it is more genuinely "the same live session" (zero re-creation risk), cheaper to build correctly, and the brief only requires the *console* to be mock-able, not the control-transfer mechanism — so spending build effort on a nicer console buys little evaluation credit relative to spending it on a demonstrably real transfer mechanism. If a minimal web-based console is still wanted for demo polish, it should be a thin viewer/trigger over the same underlying CDP-session pause/resume calls, not a redundant control path.
- **G4 — Surface adapter seam.** Recommendation: model `Surface` as perceive + act + control-transfer, with locator strategies owned by the artifact and resolved per-`Surface` (§4.1), so that a `WebSurface` and a future `ElectronSurface` can share the *same* CDP-based control-transfer implementation (§1.3) with zero artifact-schema changes. This is the strongest evidence the write-up can offer for "the seam doesn't paint us into a corner" without building the second surface.
- **G8 — Artifact schema philosophy.** Recommendation: whichever schema style is chosen (declarative DSL vs. event-log+compiler vs. hybrid), it must be able to express, per step: a `risk` tag (`safe|confirm|irreversible`, §2.2), a locator-strategy list with fallbacks (§4.3), and a result-contract discriminant (§3.4) as first-class fields — these three are the load-bearing HITL/safety surface area in the schema, not optional metadata bolted on later.

---

## Summary of sources used (deduplicated)

All accessed 2026-08-16.

- Chrome DevTools Protocol, `Target` domain — https://chromedevtools.github.io/devtools-protocol/tot/Target/
- ChromeDevTools/getting-started-with-cdp — https://github.com/ChromeDevTools/getting-started-with-cdp
- Playwright `BrowserType.connectOverCDP` — https://playwright.dev/docs/api/class-browsertype
- Playwright Python connect_over_cdp — https://playwright.dev/python/docs/api/class-browsertype
- Playwright Electron — https://playwright.dev/docs/api/class-electron
- Anthropic, "How we contain Claude across products" — https://www.anthropic.com/engineering/how-we-contain-claude
- Anthropic, computer-use-demo README — https://github.com/anthropics/anthropic-quickstarts/blob/main/computer-use-demo/README.md
- Anthropic, "Trustworthy agents in practice" — https://www.anthropic.com/research/trustworthy-agents
- OpenAI, "Introducing Operator" — https://openai.com/index/introducing-operator/
- OpenAI, "Computer-Using Agent" — https://openai.com/index/computer-using-agent/
- OpenAI, Operator System Card — https://cdn.openai.com/operator_system_card.pdf
- Microsoft Learn, `shadow` command — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/shadow
- Microsoft Learn, RDS Session Shadowing — https://learn.microsoft.com/en-us/archive/technet-wiki/19804.remote-desktop-services-session-shadowing
- UiPath, Attended automations — https://docs.uipath.com/robot/standalone/latest/admin-guide/attended-automations
- UiPath, Robot session (PiP) — https://docs.uipath.com/robot/standalone/latest/admin-guide/picture-in-picture
- UiPath skills repo, attended-reauth pattern — https://github.com/uipath/skills/blob/main/skills/uipath-planner/references/attended-reauth-pattern-guide.md
- UiPath, Business Exception Vs Application Exception — https://docs.uipath.com/orchestrator/standalone/2024.10/user-guide/business-exception-vs-application-exception
- UiPath Community Forum, exception types — https://forum.uipath.com/t/difference-between-system-exception-and-business-exception/393241
- UiPath, About Object Repository — https://docs.uipath.com/studio/standalone/latest/user-guide/about-object-repository
- UiPath, Reusing objects (UI Libraries) — https://docs.uipath.com/studio/standalone/2025.10/user-guide/reusing-objects-ui-libraries
- UiPath Community Forum, Object Repository best practice — https://forum.uipath.com/t/object-repository-whats-the-best-practice/5753770
- LangGraph interrupts — https://docs.langchain.com/oss/python/langgraph/interrupts
- LangGraph human_in_the_loop.md — https://github.com/langchain-ai/langgraph/blob/main/docs/docs/concepts/human_in_the_loop.md
- LangChain blog, interrupt announcement — https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt
- MDN, getDisplayMedia — https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- W3C, Captured Surface Control — https://w3c.github.io/mediacapture-surface-control/
- OWASP Input Validation Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- OWASP Top 10 Proactive Controls C3 — https://top10proactive.owasp.org/archive/2024/the-top-10/c3-validate-input-and-handle-exceptions/
- OWASP ASVS 4.0 §V5 — https://github.com/OWASP/ASVS/blob/master/4.0/en/0x13-V5-Validation-Sanitization-Encoding.md
- OWASP Logging Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP ASVS 4.0.3 §V7 — https://asvs.dev/v4.0.3/V7-Error-Logging/
- OWASP Top 10 cheat-sheet-of-cheat-sheets (A09 logging/monitoring, secondary source) — https://www.oligo.security/academy/owasp-top-10-cheat-sheet-of-cheat-sheets
- PCI DSS v4.0.1 — https://www.middlebury.edu/sites/default/files/2025-01/PCI-DSS-v4_0_1.pdf
- FTC Safeguards Rule overview — https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know
- 16 CFR Part 314 — https://www.govinfo.gov/content/pkg/CFR-2025-title16-vol1/pdf/CFR-2025-title16-vol1-part314.pdf
- NIST SP 800-122 — https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-122.pdf
- AWS Whitepaper, SaaS Tenant Isolation Strategies — https://docs.aws.amazon.com/pdfs/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.pdf
- AWS Well-Architected SaaS Lens, Silo/Pool/Bridge — https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
- AWS Whitepaper, Pool isolation — https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/pool-isolation.html
- Salesforce Dictionary, Managed Package Extension — https://salesforcedictionary.com/terms/managed-package-extension
- Salesforce Stack Exchange, FSC layout override — https://salesforce.stackexchange.com/questions/361122/modify-the-layout-of-financial-service-cloud-components-in-an-installed-package
- FlagWay (secondary, illustrative of config-drift pattern) — https://github.com/FlagWay/flagway
- Martin Fowler, Feature Toggles — https://martinfowler.com/articles/feature-toggles.html
- Voxire engineering blog, Saga Pattern in Go (secondary, general distributed-systems practice) — https://voxire.com/blog/saga-pattern-distributed-transactions-go/

---

## What this file deliberately does not do

- Does not write a PRD or scaffold any code (per instructions).
- Does not implement a PCI/GLBA compliance program — only the design thinking a bank-facing system should apply.
- Does not resolve G4/G8/G9 — records recommendations for the orchestrator/human to reconcile in `decisions/open_questions.md`.
- Does not treat full co-browsing/telestration or native-desktop control transfer as in-scope builds — both are explicitly out of scope or design-only per the brief.
