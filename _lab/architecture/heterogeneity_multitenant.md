# Architecture — heterogeneity and multi-tenant reuse (design-only, §3.7)

**Status:** design contract. Exactly one thing here is built — the `Surface` interface with `WebSurface` behind it, plus the overlay *types*. Everything else is a designed seam, per [`Project.md`](../../Project.md) §3.7 ("We don't expect you to implement multi-tenant or desktop support. We do expect the core abstractions not to paint you into a corner.").
**Locked inputs:** G4 and G12 in [`open_questions.md`](../decisions/open_questions.md), [`ADR-001-stack.md`](../decisions/ADR-001-stack.md), [`ADR-002-perception.md`](../decisions/ADR-002-perception.md), [`PRD.md`](../product/PRD.md) §3.7 (CU-37-01…03).
**Research cited:** [`_hitl_safety.md`](../research/_hitl_safety.md) §§1.3, 4.1–4.4 (Surface owns control transfer; object repository; base + overlay; AWS silo/pool/bridge), [`os_desktop_electron.md`](../research/os_desktop_electron.md), [`frontier_computer_use.md`](../research/frontier_computer_use.md) §C.2 (a11y is the desktop twin), [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A1 (the §3.7 argument decides the targeting model), A5 gap 5 (overlay shape), S3 Miss 2 (RPA object repository), [`tech_stack.md`](../research/tech_stack.md) §§4, 5, 7.3, [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §5 (xa11y is design-only), [`non_viable.md`](../research/non_viable.md) #6, #16.

---

## 1. The two questions §3.7 asks, answered in one line each

1. **Surface abstraction.** The seam is: *the artifact names controls the way an accessibility tree names controls; a `Surface` knows how to turn that name into a handle on its own backend.* Swapping web → Electron → native desktop is a resolver swap, not an artifact rewrite.
2. **Multi-tenant reuse.** The artifact is **pooled** at vendor-product level and **specialised** by separately reviewed overlay files keyed `{appFamily, variant, tenantId, appVersionRange}`; drift is detected by a recorded surface fingerprint and reported as a typed outcome.

Why the first answer is shaped that way: if the artifact names controls the way UIA names controls, the desktop adapter is a resolver swap; if it names controls the way CSS names elements, the desktop adapter is a rewrite. That is the whole argument for semantic-first targeting, and it is a §3.7 argument rather than a §3.1 one ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A1).

---

## 2. The `Surface` interface

`src/surface/types.ts`. Three responsibilities, deliberately including control transfer — a `WebSurface` implements it via keeping the context alive, a future `OsDesktopSurface` via session shadowing or VNC, and the artifact/replay engine never learns *how* ([`_hitl_safety.md`](../research/_hitl_safety.md) §1.3).

```ts
export type SurfaceKind = "web" | "electron" | "os_desktop";

export interface Observation {
  /** Semantic spine: role/name tree. Web = ariaSnapshot({mode:"ai", boxes:true}); UIA/AX = native tree. */
  tree: SemanticNode[];
  /** Bounded overlay of interactables with NO role or NO accessible name (legacy reality, see §3.1). */
  unlabelledInteractables: InteractableHint[];
  /** Frame/window identity stamped on every node — never positional. */
  frames: FrameDescriptor[];
  route: { pattern: string; concrete: string };   // canonicalized + raw (raw is redacted before persistence)
  title: string;
  capturedAt: string;
  /** Session-local handles for THIS observation only. Never persisted, never compiled. */
  refs: Record<string, EphemeralRef>;
}

export interface Surface {
  readonly kind: SurfaceKind;
  readonly sessionId: string;

  open(entry: EntryPoint): Promise<void>;
  observe(opts?: { screenshot?: boolean; scope?: TargetSpec }): Promise<Observation>;

  /** Locator union → live handles. Counting is separate from acting so ambiguity is detectable. */
  countMatches(frame: FrameHandle, locator: Locator, timeoutMs: number): Promise<number>;
  resolve(target: RankedTarget, budget: ResolveBudget): Promise<Resolution>;

  /** The gated actuator: lease → policy → resolve → dispatch → journal. */
  act(request: ActionRequest): Promise<ActionResult>;

  read(target: RankedTarget, source: ReadSource): Promise<string | null>;
  capture(kind: "screenshot" | "snapshot", scope?: TargetSpec): Promise<CaptureRef>;
  waitFor(wait: Wait): Promise<WaitOutcome>;

  controlTransfer: ControlTransfer;
  close(): Promise<void>;
}

export interface ControlTransfer {
  /** Stop issuing input. MUST NOT tear down the session. */
  pauseActuation(reason: TransitionReason): Promise<void>;
  /** What a human needs to find this session (window title, URL, CDP endpoint, RDP session id…). */
  describeSession(): Promise<SessionDescriptor>;
  /** Dispatch an operator action under assertHumanMayAct(). */
  operatorAct(request: ActionRequest): Promise<ActionResult>;
  /** Resume issuing input after the caller has re-observed. */
  resumeActuation(): Promise<void>;
}
```

### 2.1 What the seam forbids

| Forbidden | Why |
|---|---|
| A `Page`, `Locator`, `Frame`, or `ElementHandle` in any engine signature | leaks Playwright into the artifact/replay layer |
| A `css`-only locator contract | a desktop backend cannot honour it, which is the corner §3.7 warns about |
| Positional frame/window indices | reordered frames silently retarget ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) S3 Miss 1) |
| Persisting `Observation.refs` | ephemeral by construction ([`ADR-002-perception.md`](../decisions/ADR-002-perception.md)) |
| Control transfer implemented in the engine | it is surface-specific; the engine only knows pause / describe / resume / re-verify |

### 2.2 Implementations

| Class | File | Status | Notes |
|---|---|---|---|
| `WebSurface` | `src/surface/web.ts` | **built** | Playwright 1.62.1, one headed-or-headless `BrowserContext`; the only file importing `playwright` |
| `FakeSurface` | `src/surface/fake.ts` | **built (tests)** | Fixture-driven; every taxonomy branch is tested through it with no browser ([`tech_stack.md`](../research/tech_stack.md) §10.2) |
| `ElectronSurface` | `src/surface/electron.ts` | **typed stub** | Throws `NotImplemented`. Design note: Playwright's `_electron` drives renderer windows over the same CDP attach model, so observe/act/control-transfer are the same primitives; native OS dialogs are out of renderer reach and route to HITL or an OS adapter ([`_hitl_safety.md`](../research/_hitl_safety.md) §1.3; [`tech_stack.md`](../research/tech_stack.md) §5.1) |
| `OsDesktopSurface` | `src/surface/desktop.ts` | **typed stub** | Throws `NotImplemented`. Design note: UIA/AX/AT-SPI expose role/name/state and control patterns — the same abstraction as the a11y tree ([`frontier_computer_use.md`](../research/frontier_computer_use.md) §C.2). Named candidate backends for `REPORT.md` §4: UIA via the Appium Windows Driver or FlaUI; macOS AX; AT-SPI. **Do not install any of them** ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §5) |

The stubs are typed against the real interface and compile. That is the difference between a seam and an empty promise — but they must not grow bodies in this build (G12).

---

## 3. How each surface family resolves the same locator union

The locator union in [`artifact_schema.md`](./artifact_schema.md) §8.1 was chosen so every semantic member has a backend-neutral meaning.

| Locator kind | Web (`WebSurface`) | Electron renderer | Windows UIA (design) | macOS AX (design) |
|---|---|---|---|---|
| `role` + `name` | `getByRole(role, {name})` | identical | `ControlType` + `Name` property condition | `AXRole` + `AXTitle`/`AXDescription` |
| `label` | `getByLabel` | identical | `LabeledBy` relation → `Name` | `AXTitleUIElement` |
| `placeholder` | `getByPlaceholder` | identical | `HelpText` / `Placeholder` | `AXPlaceholderValue` |
| `text` | `getByText` | identical | descendant `Text` control name | `AXValue` on static text |
| `altText` / `title` | `getByAltText` / `getByTitle` | identical | `Name` on image control | `AXDescription` |
| `rowScoped` | row locator by cell text, then inner locator | identical | `DataItem`/`GridItem` patterns | `AXRow` + `AXCell` |
| `labelledRegion` | landmark/fieldset scope, then inner locator | identical | ancestor `Group`/`Pane` with `Name` | `AXGroup` with `AXTitle` |
| `testId` | `getByTestId` | identical | `AutomationId` (the true equivalent) | accessibility identifier |
| `css` / `xpath` | supported, ranked last, justified | supported | **not representable** → capability unsupported on this backend | not representable |

The last row is the honest cost, and it is why `css` candidates never stand alone (§8.3 of the schema doc): a step whose only target is structural is a step that does not port. `backendHints.windowsUia.automationId` exists as an additive hint for the day a real UIA backend is written; its absence must never block a backend that understands the semantic locator.

### 3.1 Observation is hybrid, targeting is semantic-first

`ariaSnapshot` is a *filtered* projection: layout tables get genericised, `<div onclick>` has no role, unlabelled inputs have no accessible name. So a11y-first must not mean a11y-only — the observation is the a11y spine **plus** a bounded overlay of clickable/focusable nodes with no role or name (short structural descriptor + nearby-text hint) **plus** explicit frame identity on every node ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A1, S2; [`frontier_computer_use.md`](../research/frontier_computer_use.md) contrarian option 3). That merge lives entirely behind `WebSurface.observe()`; replay still targets semantically.

The a11y tree is **DOM-derived**, not an independent perception channel — say this plainly in `REPORT.md` §4 rather than overclaiming ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §4; MDN, cited in [`_RESEARCH_COMPLETE.md`](../research/_RESEARCH_COMPLETE.md)).

### 3.2 Bitmap-only surfaces (Citrix/VDI/RDP) — the carve-out

A wholesale "pixels are banned" position is wrong for bank back offices, where a real fraction of access is through a bitmap of someone else's UI. The correct policy ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A4, D8):

> Pixels are a **perceive channel of last resort**, never a **replay contract**. On a surface where no semantic handle exists for a step, that step is not compiled into a capability — it is declared unsupported and routed to HITL, and the capability cannot reach `approved` with an uncompilable step in it.

This turns a rejection into a policy, and it is consistent with the schema having no coordinate locator kind.

---

## 4. Multi-tenant reuse

### 4.1 The problem restated

Hundreds of tenants, ~20 apps each, many running the *same vendor product* configured, branded, and versioned differently ([`Project.md`](../../Project.md) §1). Re-recording per tenant is the failure mode ([`non_viable.md`](../research/non_viable.md) #16); building a tenant registry/fleet service is the other failure mode (#6, and §7 of the brief).

### 4.2 The pattern: base + overlay, with two independent precedents

- **Object repository** (UiPath; Blue Prism Application Modeller; page-object/resource files in Robot Framework): element descriptors live in a named, shared, separately versioned registry, decoupled from the flows that use them, so one UI change is fixed once and inherited ([`_hitl_safety.md`](../research/_hitl_safety.md) §4.1; [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) S3 Miss 2).
- **Managed package + extension** (Salesforce): an extension references and overrides a base package through an explicit, additive mechanism rather than forking it ([`_hitl_safety.md`](../research/_hitl_safety.md) §4.2).

Translation here: `{vendorProduct}` + `capabilityId@capabilityVersion` is the **base**, recorded once against a reference instance; a **tenant overlay** is a separate file of typed patch ops. Concrete schema in [`artifact_schema.md`](./artifact_schema.md) §9.

```
capabilities/
  memberdesk.savings_balance_lookup/
    v1.0.0.json                                   ← pooled base, one review, one approval
    overlays/
      memberdesk__branded-b__tenant-002.json      ← separate file, separate review, separate approval
```

### 4.3 Why not an inline `tenantOverrides` map

Three defects, all fatal for review ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 5):

1. keyed on tenant alone when drift is `{tenant, appVersion}`;
2. an open record is an arbitrary merge, and an arbitrary merge is unreviewable — which defeats §3.2 precisely where §3.7 needs review most;
3. nesting deltas in the shared base means one tenant's label change bumps an artifact every tenant depends on, so the base's approval state stops meaning anything.

### 4.4 Isolation model: bridge (pool the definition, silo the execution)

Borrowing AWS's silo/pool/bridge vocabulary ([`_hitl_safety.md`](../research/_hitl_safety.md) §4.4):

| Pooled (shared across tenants) | Siloed (per tenant, never crosses) |
|---|---|
| capability base artifact, its schema, its contract | credentials and session state |
| the replay engine and policy evaluator code | policy instance (`tenantId`, origins, routes) |
| the locator union and resolution algorithm | evidence directory, journals, screenshots |
| — | run ids, results, extracted outputs |

Concretely: `capabilityId` is pooled; `runId` is siloed, tagged with `tenantId`, and lives in its own storage namespace. Reusing one capability across 200 tenants must never imply sharing one tenant's evidence with another's.

### 4.5 Drift detection and the maintenance cycle

Three mechanisms, cheapest first:

1. **Fingerprint check** at replay start — a digest over title, key landmark roles/names, and route pattern, recorded at record time ([`artifact_schema.md`](./artifact_schema.md) §8.4; [`replay_and_errors.md`](./replay_and_errors.md) §2.1). Mismatch is a typed drift outcome with a per-capability policy (`warn_and_continue | escalate | hard_failure`) — never a mystery failure three steps later.
2. **Ranked-locator fallback with structured drift events** — a run that succeeds on rank 2, or on a `css` candidate, still emits a drift event naming the failed and used candidates. Drift is a signal to review, not an outage ([`_hitl_safety.md`](../research/_hitl_safety.md) §4.3).
3. **Declared-vs-observed reconciliation** — base + overlays live in version control, so the expected configuration is diffable, and drift events accumulate against `{capabilityId, tenantId, appVersion}` for review.

And the loop that closes the record-replay story ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) S1 qualification 2):

```
drift outcome or hard failure
  → route back to DISCOVERY (the model is allowed here; it was never allowed in the replay decision path)
  → compiler emits capabilityVersion N+1 (or a tenant overlay, if the delta is tenant-local)
  → human review + approval
  → only then invocable unattended
```

Record-replay is a maintenance cycle, and versioning plus approval is what makes the cycle safe. Auditability, not cost, is the lead argument for it in this domain: a bank cannot review and re-review a model's future decisions, but it can review an artifact. When the question is "why did this system move this money", the answerable form is `capability@version + contractHash + policy digest + run journal` — not a model transcript.

---

## 5. What is built vs designed (state this table in `REPORT.md` §4)

| Item | Status | Where |
|---|---|---|
| `Surface` interface exercised by both engines | **built** | `src/surface/types.ts` |
| `WebSurface` (Playwright, MemberDesk) | **built** | `src/surface/web.ts` |
| `FakeSurface` for every taxonomy branch | **built** | `src/surface/fake.ts` |
| Backend-neutral locator union + frame refs | **built** | `src/artifact/locator.ts` |
| Fingerprint recording + drift outcome | **built** | `src/artifact/compile.ts`, `src/replay/interpreter.ts` |
| Overlay schema + `applyOverlay` + refusal rules | **built (types + function)** | `src/artifact/overlay.ts` |
| One worked overlay against a second MemberDesk variant | **stretch, only if core evidence is green** (G11) | `capabilities/**/overlays/` |
| `ElectronSurface`, `OsDesktopSurface` | **typed stubs** | `src/surface/electron.ts`, `desktop.ts` |
| UIA/AX/AT-SPI backends, `xa11y`, `nut.js`, OS input injection | **not built, named only** | `REPORT.md` §4 |
| Tenant registry, per-tenant deploy, drift service, queues | **not built, explicitly non-rewarded** | [`non_viable.md`](../research/non_viable.md) #5, #6 |
| Desktop/OS-level control transfer (RDP shadowing, UiPath robot session, VNC) | **design-only** | [`_hitl_safety.md`](../research/_hitl_safety.md) §1.3 |

---

## 6. Honest limits (do not overclaim in the write-up)

1. A browser fixture cannot prove process attachment, OS-owned dialogs, UIA quirks, or Citrix behaviour. Say so ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) "disagreements", `os_desktop_electron.md` correction).
2. The a11y tree is DOM-derived; on genuinely legacy markup it can be simultaneously large (table soup) and incomplete (the actual control has no role or name). The mitigations are the interactable overlay (§3.1), scoped `rowScoped`/`labelledRegion` locators, and ranked structural fallbacks — not a claim that a11y always works ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) S2; [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §4).
3. One tenant variant is not a multi-tenant proof. Two branded variants of one self-authored fixture demonstrate the *shape* of base+overlay, not fleet operation.
4. Electron renderer automation is Chromium automation; it is not evidence of Win32/WPF reach ([`tech_stack.md`](../research/tech_stack.md) §5.1).
5. Nothing here addresses tenant-level authentication, entitlement, or credential distribution; those are named as out of scope.

---

## 7. Do / don't

**Do**

- Write both engines against `Surface` from milestone 1, so the seam is exercised rather than declared.
- Keep every semantic locator kind meaningful on a non-web backend; if a new kind cannot be explained in UIA terms, question it.
- Stamp frame/window identity on every observed node, by name or URL pattern.
- Record the fingerprint even though only one variant exists — it is the drift answer and it costs a hash.
- Ship the overlay *types* and the refusal rules even if no overlay file is ever applied.

**Don't**

- Don't implement Electron or desktop backends in this build (G12), and don't install `xa11y`, `nut.js`, or PyAutoGUI ([`locked_stack.md`](../decisions/locked_stack.md)).
- Don't add a tenant registry, config service, or per-tenant deployment pipeline ([`Project.md`](../../Project.md) §7).
- Don't put tenant deltas inline in the base artifact.
- Don't let an overlay change the callable contract — that is a new capability version, not an override.
- Don't claim the design "proves" desktop support. It proves the seam is honest; the write-up should say exactly that.
