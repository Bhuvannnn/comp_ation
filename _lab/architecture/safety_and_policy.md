# Architecture — safety, policy allowlist, risky actions, redaction

**Status:** implementation contract for `src/policy/**` and the redaction chokepoint in `src/evidence/**`.
**Locked inputs:** [`locked_stack.md`](../decisions/locked_stack.md), [`ADR-003-target.md`](../decisions/ADR-003-target.md), [`ADR-004-hitl.md`](../decisions/ADR-004-hitl.md), [`PRD.md`](../product/PRD.md) §3.4 (CU-34-01…03).
**Research cited:** [`_hitl_safety.md`](../research/_hitl_safety.md) §§2.1–2.3, 8, 9 (OWASP allowlist-over-denylist, PCI mask-vs-store, GLBA minimisation, NIST tiering, Operator/Anthropic risk gating), [`tech_stack.md`](../research/tech_stack.md) §12 (policy file shape, redaction layering, exact-origin matching), [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2 (why a typed function beats Rego here), [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §9.6–9.7, [`frontier_computer_use.md`](../research/frontier_computer_use.md) anti-pattern 12 (prompt injection), [`non_viable.md`](../research/non_viable.md) #10, #37.
**Brief:** [`Project.md`](../../Project.md) §3.4, §7 "Safety & data handling".

---

## 1. Model in one paragraph

Positive validation, deterministic, outside the model. A committed policy file declares permitted origins, route patterns, action kinds, risk rules, known recoverable patterns, run limits, and redaction rules. It is parsed by Zod into a typed `Policy`, and evaluated by **one function** called from **inside the actuator** on both the discovery and replay paths. Deny is the default for anything not matched. Risky/irreversible actions are gated on a human decision recorded in the run — never on the model volunteering to ask.

Why a typed function and not OPA/Rego: the audience for this guardrail model is a reviewer, and a ~40-line exhaustive `switch` over a discriminated union is auditable at a glance, unit-testable branch by branch, and cannot drift from the types the rest of the system uses. "Same evaluator on both paths" comes from calling the same function, not from adopting a policy engine ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2). Name OPA in `REPORT.md` §6 as the swap-in when policy authorship must move outside the codebase.

---

## 2. Policy file

**Canonical format is JSON** (`policy.json`), because the artifact pipeline already validates JSON with Zod, YAML's implicit typing is a hazard in a file containing account-shaped identifiers, and adding a YAML parser buys nothing ([`tech_stack.md`](../research/tech_stack.md) §7.1, §12.2). A YAML rendering may be produced for review by `inspect --format yaml`; it is never the runtime source.

`policy.json` (committed; `policy.example.json` documents each field):

```jsonc
{
  "version": 1,
  "policyId": "policy/memberdesk@1",
  "tenantId": "design_only_default",

  "surfaces": [
    {
      "id": "memberdesk_local",
      "kind": "web",
      // EXACT origins. Never substring/includes — "evil.com/?x=localhost:7080" is the classic bypass.
      "origins": ["http://localhost:7080"],
      "routes": {
        // canonicalized patterns, not literal URLs, so one entry covers every concrete instance
        "allow": [
          { "pattern": "/",                          "actions": ["navigate", "read"] },
          { "pattern": "/members",                   "actions": ["navigate", "read", "click", "fill", "press"] },
          { "pattern": "/members/:id",               "actions": ["navigate", "read", "click"] },
          { "pattern": "/members/:id/accounts",      "actions": ["navigate", "read", "click"] },
          { "pattern": "/members/:id/subaccounts/new", "actions": ["navigate", "read", "click", "fill", "select", "check"] }
        ],
        "deny": ["/admin/*", "/settings/*", "/export/*"]
      },
      "frames": { "allowNames": ["nav", "content"], "denyCrossOrigin": true }
    }
  ],

  "actions": {
    "allow": ["navigate", "click", "fill", "select", "check", "press", "read", "waitFor", "screenshot"],
    "deny":  ["download", "upload", "file_chooser", "new_tab", "execute_script", "clipboard", "drag"]
  },

  "risk": {
    "default": "read",
    "rules": [
      { "id": "r-submit-subaccount", "match": { "route": "/members/:id/subaccounts/new", "action": "click",
        "targetRole": "button", "targetName": "Create sub-account" },
        "risk": "irreversible", "handling": "escalate" },
      { "id": "r-delete",  "match": { "intentTag": "delete_record" },      "risk": "irreversible", "handling": "escalate" },
      { "id": "r-send",    "match": { "intentTag": "send_communication" }, "risk": "irreversible", "handling": "escalate" },
      { "id": "r-write",   "match": { "action": "fill" },                  "risk": "reversible_write", "handling": "allow" }
    ]
  },

  "recoverablePatterns": [
    { "id": "session_warning_interstitial",
      "detect": { "kind": "elementVisible", "target": { "role": "dialog", "name": "Session" } },
      "handle": { "kind": "click", "target": { "role": "button", "name": "Continue" } },
      "maxAttempts": 2 },
    { "id": "results_per_page_popup",
      "detect": { "kind": "elementVisible", "target": { "role": "dialog", "name": "Results per page" } },
      "handle": { "kind": "click", "target": { "role": "button", "name": "OK" } },
      "maxAttempts": 1 }
  ],

  "limits": {
    "maxSteps": 25,
    "maxWallClockSec": 300,
    "maxUsd": 2.00,
    "maxRecoveriesPerRun": 6,
    "maxConsecutiveSameActionFailures": 3,
    "interventionExpirySec": 900
  },

  "unattendedReplay": { "requireApprovedFor": ["irreversible"], "defaultState": "draft" },

  "redaction": {
    "neverPersistFields": ["password", "ssn", "dob", "account_number", "full_account_number",
                            "card_number", "cvv", "api_key", "token", "cookie", "authorization"],
    "valuePatterns": ["pan_luhn", "ssn_us", "jwt", "openai_key", "bearer_token"],
    "screenshotBlackout": {
      "selectors": ["input[type=password]", "[data-sensitive=true]"],
      "ariaNamePatterns": ["(?i)ssn", "(?i)social security", "(?i)account number", "(?i)card number"]
    },
    "pauseCaptureWhileHumanOwnsSession": true,
    "retentionDays": 30
  }
}
```

Layering, outer to inner ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.1): (1) network egress allowlist at the host/container — **design-only** here, described in `REPORT.md` §6; (2) this app-level policy gate — **real and enforced**; (3) per-action human confirmation for the risky class — **real**.

---

## 3. The evaluator

```ts
// src/policy/engine.ts
export interface ActionRequest {
  kind: ActionKind;                       // "navigate" | "click" | "fill" | …  (closed union)
  intent: string;                         // human sentence from the step or the model's rationale
  intentTag: IntentTag | null;            // "delete_record" | "send_communication" | … (from artifact/model, closed union)
  surfaceId: string;
  url: { origin: string; route: string }; // route already canonicalized: /members/12345 → /members/:id
  framePath: FrameRef[];
  target: { role: string | null; name: string | null; locatorKind: LocatorKind } | null;
  valueRef: ValueRef | null;              // never a literal secret; sensitivity is carried, not the value
  declaredRisk: RiskClass;                // steps[].risk from the artifact, or the model's proposal in discovery
  phase: "discovery" | "replay" | "recovery" | "operator_resume";
}

export type PolicyDecision =
  | { verdict: "allow";    decisionId: string; ruleId: string }
  | { verdict: "deny";     decisionId: string; ruleId: string; code: PolicyDenyCode; reason: string }
  | { verdict: "escalate"; decisionId: string; ruleId: string; risk: RiskClass; reason: string };

export function assertAllowed(a: ActionRequest, ctx: PolicyContext): PolicyDecision;
```

Evaluation order (deny-by-default at each stage):

```
1. surface known?                       else deny  unknown_surface
2. origin exactly in surfaces[].origins? else deny  origin_not_allowed
3. route matches an allow pattern, and not a deny pattern? else deny route_not_allowed
4. action kind in actions.allow and not in actions.deny? else deny action_not_allowed
5. route entry permits this action kind? else deny action_not_allowed_on_route
6. frame path within allowNames; no cross-origin frame? else deny frame_not_allowed
7. value binding references a declared param (never an inline secret)? else deny illegal_value_binding
8. run limits intact (steps, wall clock, spend, recoveries)? else deny budget_exhausted
9. risk rules: first match wins →
      handling "allow"    → allow
      handling "confirm"  → escalate (confirmation)
      handling "escalate" → escalate
      handling "block"    → deny risky_action_blocked
10. otherwise allow with ruleId "default_allow_read" only if declaredRisk === "read"; else deny unclassified_risk
```

Every decision gets a `decisionId` (ULID) that is journaled with the action, so evidence joins actions to rules. `PolicyDenyCode` is a closed union; both `deny` and `escalate` are recorded even when the run continues.

### 3.1 Where it is called from

Inside `WebSurface.act()` and inside `WebSurface.navigate()`, immediately after the lease check ([`system_overview.md`](./system_overview.md) §5). Not at call sites. That is what makes enforcement total rather than conventional, and it is why a recovery action and an operator-resume action are gated identically.

### 3.2 Discovery vs replay differences

| Aspect | Discovery | Replay |
|---|---|---|
| Deny | Stop the loop, escalate to a human with the denied action in the intervention (the model may be confused; a human can judge) | `hard_failure` code `policy_denied` — there is no model to decide differently, and a denial mid-replay means artifact/policy drift ([`_hitl_safety.md`](../research/_hitl_safety.md) §1.1) |
| Escalate | Confirmation gate before dispatch | Confirmation gate before dispatch; if the capability is not approved for unattended risky steps, escalate regardless |
| Risk source | Model proposal + policy rules; the compiler records the final class on the step | `steps[].risk` from the artifact, re-checked against policy rules |

---

## 4. Risky vs safe — classification, not text matching

Frontier practice converges on classifying by potential harm × ease of reversal, gating the high-high class behind human confirmation, and forbidding the worst class outright ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.2, citing the OpenAI Operator system card and Anthropic's computer-use guidance).

| Class | MemberDesk examples | Handling |
|---|---|---|
| `read` — safe/reversible | search a member, open a detail page, sort a table, read a balance, navigate | allowed autonomously within the allowlist |
| `reversible_write` | fill a form field before submit, toggle a filter | allowed; journaled with the value's *sensitivity*, never its value |
| `irreversible` | submit/confirm a sub-account creation, post a fee waiver, delete a record, send a communication | blocked by default; requires an explicit human confirmation recorded in the run, on **both** paths |
| out of allowlist | anything else | hard-blocked; never offered as "confirm to proceed" — it is a policy violation, not a risk judgment |

Two rules that matter more than the table:

1. **Risk is recorded on the step at record time**, not inferred at replay time by pattern-matching button text. Inferring "is this button dangerous" from DOM text is exactly the heuristic that breaks on the non-semantic markup this brief describes ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.2).
2. **The gate is deterministic and outside the model.** Even a mitigated frontier model asks for confirmation on high-risk actions with ~92% recall, not 100% — so model self-gating is a supplement, never the control ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.2; [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §8.1 item 35).

**Approval is not load-bearing for this gate.** `unattendedReplay.requireApprovedFor` exists, but a `draft` capability still blocks/confirms irreversible steps; the draft→approved lifecycle is a §8 stretch and must not become a prerequisite for §3.4 safety ([`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4.1 conflation D).

The MemberDesk demo flow **stops at the confirmation screen** and performs no money movement ([`ADR-003-target.md`](../decisions/ADR-003-target.md)), so the irreversible gate is demonstrated by an escalation, not by a completed write.

---

## 5. Redaction

Two complementary layers, because either alone is insufficient ([`tech_stack.md`](../research/tech_stack.md) §12.3):

1. **Allowlisted field schema (primary).** Journal lines are *built* from a fixed field set — never by serialising an arbitrary object. Applying the allowlist-over-denylist principle to logging, not just to actions.
2. **Value scanning (defence in depth).** A bounded pattern pass for card-shaped, SSN-shaped, JWT-shaped, and key-shaped strings that slipped into free text. OWASP is explicit that denylisting is acceptable only as a supplement ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.3).

### 5.1 The canonical never-persist list

From [`_hitl_safety.md`](../research/_hitl_safety.md) §9:

1. Credentials, passwords, API keys, session tokens/cookies — referenced by name, never by value, even in debug output.
2. Full PAN/card numbers **in any form, including masked** — masking is a display rule (PCI DSS 3.4.1), rendering unreadable is a storage rule (3.5.1); if it lands in a log and is retained, it is stored. Use an opaque token if correlation is needed.
3. SSNs, DOBs, and balances tied to an identified customer, unless narrowly necessary for the immediate step (GLBA minimisation; NIST SP 800-122 impact tiering).
4. Raw values typed by a human during a takeover — record only the *fact* a value was entered plus the field's semantic label.
5. Screenshots/DOM snapshots must pass redaction **before** they are written, not be filtered at the point a log references them.
6. Structured logs are built from the allowlisted field schema; regex scrubbing is the second pass only.
7. Retention is bounded (`redaction.retentionDays`), not indefinite.

### 5.2 The journal line schema (allowlisted fields)

```ts
// src/evidence/journal.ts
export interface JournalEvent {
  ts: string; runId: string; seq: number;
  phase: "discovery" | "replay" | "hitl";
  actor: "agent" | "human" | "system";          // makes the §3.6 handoff visible in one grep
  event: JournalEventKind;                       // closed union: action_dispatched, checkpoint_passed, recovered, drift, …
  stepId: string | null;
  action: { kind: ActionKind; targetSummary: string; valueRef: string | null } | null;
                                                 // targetSummary is a DESCRIPTION ("textbox 'Member ID' in frame content"),
                                                 // valueRef is a NAME ("param:memberId"), never a captured value
  rationale: string | null;                      // §3.5 "what the agent did and why"
  policy: { decisionId: string; ruleId: string; verdict: PolicyVerdict } | null;
  outcome: string | null;
  durationMs: number | null;
  evidenceRefs: string[];
}
```

`rationale` and `actor` carry disproportionate weight: the first answers §3.5's "and why", the second makes control transfer legible as data ([`tech_stack.md`](../research/tech_stack.md) §11.1).

### 5.3 Screenshot redaction

Before any image is written: compute blackout rectangles from (a) `redaction.screenshotBlackout.selectors`, (b) elements whose accessible name matches `ariaNamePatterns`, using the boxes already available from `ariaSnapshot({ boxes: true })`, and (c) the bounding box of any element bound to a `pii`/`secret` param. Fill them opaque, then write.

State the limit honestly in `REPORT.md` §6: box-based masking does **not** guarantee no sensitive persistence — canvas content, overlays, stale boxes, and full traces can still carry data. The real boundary is synthetic-only demo data plus deny-by-default evidence sinks ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §9).

### 5.4 Capture during human control

While the lease owner is `human`, screenshot/DOM capture is **paused** (`pauseCaptureWhileHumanOwnsSession: true`), mirroring Operator's takeover behaviour, because that is exactly the window where credentials may be typed ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.3 rule 5, §9 item 4). The journal still records action *types and targets* — that is what "record what the human did" means here ([`hitl_control_transfer.md`](./hitl_control_transfer.md) §6).

---

## 6. The MemberDesk data rule

The fixture is seeded with realistically **shaped** synthetic data — SSN-shaped and account-number-shaped strings, card-like digit runs, a free-text notes field containing a fake token — so the redactor has something to catch and the evidence shows it catching it. A redaction pipeline that has never had a positive hit is untested code in the highest-consequence path ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A3(4)).

No real credentials, no real PII, no real institution ([`Project.md`](../../Project.md) §4, §9).

---

## 7. Stated limits (write these in `REPORT.md` §6, do not pretend otherwise)

1. **An allowlist on our own actions is not a defence against prompt injection from page content.** On-screen text is untrusted input; the mitigations here are the action allowlist, the origin/route allowlist, and human gating of irreversible actions — not the model's judgment ([`tech_stack.md`](../research/tech_stack.md) §12.2; [`frontier_computer_use.md`](../research/frontier_computer_use.md) anti-pattern 12).
2. **Network egress firewalling is design-only.** Layer 1 belongs in a container/VM policy; it is described, not built ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.1, §10).
3. **Screenshot masking is best-effort** (§5.3).
4. **The policy is single-tenant in this build.** `tenantId` exists in the file and per-tenant policy siloing is described, not implemented ([`_hitl_safety.md`](../research/_hitl_safety.md) §4.4).
5. **No compliance program.** PCI/GLBA/NIST inform the rules; nothing here is a certified control set ([`Project.md`](../../Project.md) §3.4 "without implementing a compliance program"; [`non_viable.md`](../research/non_viable.md) #37).

---

## 8. Tests (`test/policy-*.test.ts`, `test/redaction-*.test.ts`)

| Test | Asserts |
|---|---|
| exact origin | `http://localhost:7080` allowed; `http://localhost:7080.evil.com` and `https://evil.com/?x=localhost:7080` denied |
| route canonicalisation | `/members/12345` matches `/members/:id`; `/admin/users` denied even though the origin is allowed |
| action kind | `execute_script`, `download`, `new_tab` denied on both paths |
| route × action | `fill` on `/members/:id` denied (that route allows navigate/read/click only) |
| frame | an unnamed or cross-origin frame path denied |
| risk escalate | the sub-account submit click returns `escalate`, and no action reaches the surface |
| risk not inferred | a button whose text says "Delete" but whose step risk is `read` still uses the declared class + rules, deterministically |
| budgets | step/wall-clock/recovery budget exhaustion returns `deny budget_exhausted` |
| decision id | every dispatched action's journal line carries a matching `decisionId` |
| journal field allowlist | serialising an event with an extra field throws rather than writing it |
| redaction: keys | a fixture containing `sk-…`, a JWT, and a Luhn-valid PAN is scrubbed in journal, result, and intervention files |
| redaction: params | a `pii` output never appears in `result.json` on disk, but is returned in-process |
| redaction: screenshot | the password field's box is opaque in the written PNG |
| redaction: human window | no capture files are written while the lease owner is `human` |
| repo scan | `npm run scan:evidence` finds no key/PAN/SSN-shaped strings under `evidence/` |

---

## 9. Do / don't

**Do**

- Keep `assertAllowed` a pure function of `(ActionRequest, PolicyContext)` so it is trivially testable.
- Match origins exactly and routes by canonical pattern.
- Record `deny` and `escalate` decisions in the journal even when the run continues.
- Fail closed: an unparseable or missing `policy.json` aborts the run before the browser opens.
- Hash the policy file and record the digest in every `result.json`, so a reviewer knows what actually ran.

**Don't**

- Don't spread policy checks across call sites; one chokepoint inside the actuator.
- Don't use `includes()`/`startsWith()` on origins.
- Don't rely on the model to refuse a risky action.
- Don't log a masked PAN and call it redacted — do not capture it at all.
- Don't add OPA/Rego, an egress firewall, or a compliance framework to this build (§7; [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A2, KC-6).
- Don't let redaction live downstream of the writer — it is the writer's first step.
