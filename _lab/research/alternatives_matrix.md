# Alternatives matrix: computer-use capability compiler

Research date: 2026-08-16  
Source of truth: `/workspace/Project.md`, especially Sections 3, 5, and 7.

## Decision frame

These are complete alternatives, not implementation phases of one predetermined design. The ranking weights the brief in its stated order: system design and artifact/replay contract first; a real core loop second; runtime error handling and same-session handoff next; then heterogeneity, safety, code quality, and communication. Feature count is not a positive signal.

All viable options preserve four boundaries:

1. **Discovery** may use an LLM.
2. **Compilation** turns a successful trajectory into a typed, reviewable capability.
3. **Replay** is a deterministic interpreter or finite graph with no LLM decision node.
4. **Evidence** is not the capability. Raw model messages, screenshots, and transient element references stay in a separately retained and redacted run bundle.

The proposed proxy target below, **MemberDesk**, is a local HTTP or desktop app containing only synthetic data. Its representative flow is: search for a synthetic member ID, distinguish found/not-found/permission outcomes, open a savings row, extract a displayed balance, and reach—but not submit—a confirmation screen. Fault switches produce timeout, transient load, validation, permission, and unexpected-dialog states. A locally served surface is still a live UI; the discovery evidence must show an actual model observing and operating it.

## Comparison

| Rank | Architecture | Discovery surface | Deterministic replay | Same-session HITL | Complexity | Section 7 interview fit | Viability | Principal residual risk |
|---:|---|---|---|---|---|---:|---|---|
| 1 | A. Thin TypeScript/Playwright DOM vertical slice | DOM-derived interactable summary, screenshot only as evidence | Playwright semantic locator interpreter plus finite outcome branches | Headed persistent `BrowserContext`, actuator lease, CLI pause/resume | Medium | **9/10** | **Take-home** | A clean browser adapter can look less representative of hostile/native systems |
| 2 | B. Accessibility-first capability graph | Playwright AI-mode ARIA snapshots; browser adapter now, UIA adapter later | Deterministic LangGraph state graph over semantic targets | Graph interrupt plus live browser handle and explicit control lease | Medium-high | **8/10** | **Take-home, if tightly cut** | Legacy controls may expose a poor or misleading accessibility tree |
| 3 | C. Screenshot CUA, record then compile | Claude computer-use screenshots and coordinates | Compiled Playwright DOM/ARIA locators only; coordinates are discarded | Headed browser and lease; screenshot context travels with intervention | High | **7/10** | **Take-home stretch / strong design** | Successful visual actions may not compile into stable semantic locators |
| 4 | D. Local Electron thick-client proxy | Electron renderer through Playwright, optional screenshots | Playwright `_electron` renderer locator interpreter | Same `ElectronApplication` and visible window | High | **6/10** | **Take-home only with a pre-existing Electron target; otherwise design-only** | Playwright Electron support is experimental and does not cover native OS dialogs |
| 5 | E. Native Windows accessibility adapter | Windows UI Automation tree through FlaUI | UIA selector and control-pattern interpreter | Same interactive Windows desktop via console/RDP | Very high and platform-specific | **6/10** | **Design-only for this Linux/cloud take-home** | Environment and custom-control variability can consume the project |
| 6 | F. Raw visual macro tape | Screenshot CUA | Fixed coordinates, keystrokes, and sleeps | Same visible session | Superficially low; debugging cost high | **2/10** | **Avoid** | It is deterministic only in the weakest sense and fails the artifact, robustness, and outcome requirements |

Scores are integers as requested. They are not probabilities and are not additive feature scores.

---

## A. Thin TypeScript/Playwright DOM vertical slice

### Name

**Capability Tape Compiler — conventional Playwright edition**

### Concrete technology stack

- **Language/runtime:** TypeScript on a current non-EOL Node.js LTS; `pnpm`.
- **LLM SDK/model:** `@anthropic-ai/sdk` with `claude-sonnet-5`; a small custom observe/decide/act loop using typed client tools. The exact model alias remains configuration, not artifact data.
- **Automation:** `playwright` for the runtime and `@playwright/test` for end-to-end tests. Prefer `getByRole`, `getByLabel`, and scoped text locators; use CSS only as a recorded lower-priority fallback.
- **OS/Electron path:** no OS automation in the implementation. `SurfaceAdapter` is the seam; a future `ElectronSurface` can return Playwright `Page` windows, while a native adapter maps the same abstract actions to UIA control patterns.
- **Orchestration:** an explicit in-process reducer/state machine, not an agent framework: `OBSERVE -> PROPOSE -> POLICY_CHECK -> ACT -> VERIFY -> {CONTINUE, COMPLETE, ESCALATE, FAIL}`.
- **Schema/storage:** Zod 4 as runtime/type source, `z.toJSONSchema()` for the caller-facing contract, canonical JSON files under a capability catalog. No database.
- **CLI/logging:** `commander`, `pino`, `tsx`.
- **Tests:** Vitest for compiler/policy/result taxonomy; `@playwright/test` for discovery-tool executors, replay, business outcomes, recovery, and handoff.
- **Evidence format:** redacted NDJSON event stream, compiled capability JSON, `result.json`, failure screenshot, DOM/ARIA snapshot, and Playwright `trace.zip`. Evidence files are indexed by a small redacted `manifest.json`.
- **Target app:** locally served hostile-ish MemberDesk: server-rendered tables, one iframe, no test IDs, synthetic data, and deterministic fault injection. It remains semantic enough for labels/roles on the primary path.

### Artifact schema sketch

```ts
type CapabilityV1 = {
  schemaVersion: "1.0";
  capabilityId: string;
  revision: number;
  status: "draft" | "approved" | "retired";
  app: {
    family: "memberdesk";
    surface: "web";
    compatibleVariants: string[];
    tenantOverrides?: Record<string, LocatorOverride>;
  };
  contract: {
    input: JsonSchema;   // e.g. { memberId: string }
    output: JsonSchema;  // discriminated success payload
  };
  entrypoint: { originAlias: string; pathTemplate: string };
  policyRef: string;
  steps: Array<{
    id: string;
    action: {
      kind: "click" | "fill" | "select" | "read";
      target: {
        primary: SemanticLocator;
        alternates: SemanticLocator[];
        framePath?: SemanticLocator[];
      };
      value?: { fromInput: string };
      risk: "read" | "reversible-write" | "irreversible";
    };
    preconditions: Assertion[];
    wait: WaitCondition;
    checkpoint: Assertion[];
    transitions: {
      success: string | "return";
      businessOutcomes: OutcomeRule[];
      recoverable: RecoveryRule[]; // bounded retry/dismiss/reauth-escalate
      hardFailure: FailureRule;
    };
    extract?: Array<{ outputPath: string; from: SemanticLocator; as: ScalarType }>;
  }>;
};
```

`SemanticLocator` records the reason for the choice and uniqueness evidence, for example `{kind:"role", role:"button", name:"Search", scope:{kind:"role", role:"form", name:"Member search"}}`. Discovery-time refs and literal member values never enter the artifact.

### Replay strategy — no LLM in the decision loop

Validate inputs and artifact version, open an allowlisted entrypoint, then interpret each step. Resolve the primary locator, require uniqueness and actionability, try only the explicitly recorded alternate sequence, execute, wait on a state-based condition, and evaluate the checkpoint. A fixed classifier maps known page signals to one of:

- `success(outputs)`;
- `business_outcome(code, details)` such as `MEMBER_NOT_FOUND`;
- `recoverable(code, attempts)` with a bounded, declared edge; or
- `failure(stepId, expected, observed, evidenceRefs)`.

There is no generated selector, semantic guess, or LLM fallback during replay. Retry limits and routes are artifact data. Cross-tenant reuse is `app.family + compatibleVariants` with reviewed locator overlays, not silent self-healing.

### HITL seam — same live session

The browser is launched headed with a persistent context. A run-owned control lease is atomically changed from `AUTOMATION` to `HUMAN`; every actuator checks the lease, so pausing is real rather than a prompt convention. The CLI prints an intervention bundle and waits for `resume`, `abort`, or `complete` while leaving that same page/context open. An init script records redacted click/input/navigation metadata during the human interval. Resume first captures and classifies the current state, then continues at an explicit resume checkpoint; it does not blindly repeat the interrupted action.

This meets the minimal brief without pretending that a CLI is a full operator console.

### Safety

- Validate origin, route pattern, frame origin, action kind, input source, and risk class **before every discovery and replay action**.
- Deny external navigation, downloads, uploads, arbitrary JavaScript, and irreversible submit by default. The demo stops at review; an irreversible action would require a one-use human approval bound to run/step/input hash.
- Keep credentials in process environment and browser storage only. Artifacts contain parameter references, never entered values or storage state.
- Redact at the event/evidence sink: typed sensitive fields, common PII/token patterns, URL query values, headers, DOM text regions, and screenshot boxes. Raw screenshots are memory-only unless a synthetic-data flag is asserted.
- Hash capability and policy files in each result so a reviewer knows what actually ran.

### Complexity

**Medium.** One process, one browser, one schema, and one replay engine. The nontrivial work is where the brief rewards it: locator compilation, typed outcomes, bounded recovery, policy checks, and control transfer. Avoid SQLite, queues, web dashboards, and framework persistence.

### Interview-fit score

**9/10.** Through the Section 7 lens, this has the best chance of showing a complete real thread and giving reviewers inspectable depth in the schema, replay contract, runtime error taxonomy, safety boundary, and same-session handoff. Its main deduction is representativeness: despite a hostile fixture and a surface seam, the implemented adapter remains browser/DOM-centric.

### Kill criteria

Abandon or move to B/C if the selected target's important controls cannot be uniquely addressed through role, label, text, frame, or narrowly justified structural locators; if the LLM is merely being handed selectors rather than discovering the task; or if headed same-session handoff cannot be demonstrated in the intended runner.

### Viability

**Take-home: recommended baseline.** It is the smallest senior-engineer vertical slice likely to satisfy every must-have with evidence. It should not be sold as the eventual universal bank-app mechanism.

---

## B. Accessibility-tree-first capability graph

### Name

**Semantic Control Graph — a11y-first, backend-neutral capability catalog**

### Concrete technology stack

- **Language/runtime:** TypeScript, Node.js LTS, `pnpm`.
- **LLM SDK/model:** `@anthropic-ai/sdk` with `claude-sonnet-5` and custom tools accepting observation-local accessibility refs.
- **Automation:** Playwright `page.ariaSnapshot({ mode: "ai", boxes: true })` for observation; `getByRole`/`getByLabel` for browser action and replay. Screenshot is a secondary observation on ambiguity.
- **OS/Electron path:** `BrowserA11ySurface` now. Later adapters translate `ControlTarget` to Windows UIA (`FlaUI.UIA3`) or macOS Accessibility (`AXUIElement` in a Swift sidecar). Electron renderer windows can use the browser adapter; native dialogs route to an OS adapter or HITL.
- **Orchestration:** `@langchain/langgraph` `StateGraph` and `@langchain/langgraph-checkpoint-sqlite`. Discovery nodes may call the model. The separately compiled replay graph contains only deterministic nodes and condition functions.
- **Policy-as-code:** Rego compiled to Wasm and evaluated in-process with `@open-policy-agent/opa-wasm`; policy input is `{run, app, state, proposedAction, risk, capability}`.
- **Schema/catalog:** Zod 4, JSON Schema 2020-12, canonical JSON. A generated `catalog.json` exposes capability name, description, approval state, input/output schemas, compatible app variants, and invoke command.
- **CLI/logging:** `commander`, `pino`, `tsx`.
- **Tests:** Vitest, Playwright Test, graph transition/property tests, Rego policy tests.
- **Evidence format:** redacted NDJSON plus per-node graph transition records, ARIA YAML snapshots, screenshots on ambiguity/failure, Playwright trace, artifact/result JSON, policy decision IDs.
- **Target app:** the same MemberDesk HTTP fixture, with an explicit browser variant whose DOM structure changes while accessible names/roles remain stable.

### Artifact schema sketch

```ts
type SemanticCapabilityV1 = {
  schemaVersion: "1.0";
  id: string;
  contract: { input: JsonSchema; output: JsonSchema };
  appCompatibility: {
    family: string;
    semanticFingerprint: string;
    variantRange: string[];
  };
  policyRef: { id: string; digest: string };
  graph: {
    entry: string;
    nodes: Record<string, {
      operation: "invoke" | "setValue" | "select" | "read" | "checkpoint" | "intervene";
      target?: {
        semantic: {
          role: string;
          name: StringMatcher;
          landmarkPath?: Array<{ role: string; name?: StringMatcher }>;
          states?: Record<string, boolean | string>;
        };
        backendHints?: {
          web?: { framePath?: SemanticTarget[]; structuralFallback?: string };
          windowsUia?: { automationId?: string; controlType?: string };
        };
      };
      args?: ParameterBinding;
      transitions: Array<{
        when: DeterministicPredicate;
        to?: string;
        return?: ResultVariant;
        retryBudget?: number;
      }>;
    }>;
  };
  approval: { state: "draft" | "approved"; reviewedAt?: string };
};
```

The capability catalog is derived from artifacts; it is not another source of truth. Observation refs such as Playwright `[ref=e17]` are session-local and prohibited by schema from becoming replay targets.

### Replay strategy — no LLM in the decision loop

Compile the artifact to a LangGraph graph whose node registry is allowlisted to deterministic executor functions. The replay binary does not initialize an LLM client. Conditions inspect typed state observations: accessible role/name/state, URL pattern, dialog signature, and extraction parse result. Known interstitials and transient loads are graph edges with attempt budgets; business outcomes terminate with declared result variants; unmatched state terminates or interrupts.

A startup assertion rejects graphs containing discovery-only node types. Thus “LangGraph” does not imply model-driven replay. SQLite checkpoints aid inspection and orchestration resume, but do not by themselves preserve a live browser; the browser process/handle remains owned by the run.

### HITL seam — same live session

A graph node calls `interrupt()` after changing the actuator lease to `HUMAN`. Its JSON payload includes graph node, reason, policy decision, redacted ARIA snapshot, screenshot reference, and allowed resume commands. The same process keeps the `BrowserContext` alive while the human uses its headed window. Resume uses `Command({resume: ...})`, reacquires the lease, records the human interval, and starts at a dedicated observe/checkpoint node.

The lease is essential: a graph checkpoint alone is not same-session control transfer.

### Safety

- Rego default-denies unknown origins, app variants, operation types, and routes; discovery and replay call the same policy evaluator.
- Risk policy can permit reads, permit bounded reversible writes, require approval for irreversible actions, and deny actions whose target confidence/uniqueness is below threshold.
- Model input gets an accessibility projection with sensitive text replaced by typed placeholders where possible. Screenshots are cropped/redacted before persistence.
- Artifact parameter bindings carry sensitivity labels. Event serialization rejects values from `secret` or `regulated` fields rather than relying only on regex.
- Catalog invocation is gated on `approved` artifact state and matching policy/artifact digests.

### Complexity

**Medium-high.** The semantic target abstraction and graph make the heterogeneity story unusually credible, but LangGraph, SQLite, and OPA introduce concepts that need tests and explanation. Keep the graph small and do not add a service deployment.

### Interview-fit score

**8/10.** It is strongest on Section 7 generalization, deliberate artifact design, explicit recovery edges, and handoff semantics. It loses a point relative to A because reviewers may see framework and policy machinery as premature unless every dependency visibly serves the thin slice. Accessibility quality is also target-dependent.

### Kill criteria

Abandon if the target’s accessible tree omits actionable controls, duplicates names without stable semantic scope, changes meaning across variants, or cannot expose the success/output state. Also kill the framework version if graph/checkpointer/policy plumbing delays a real discovery-and-replay evidence set; retain the schema ideas and fall back to A’s custom reducer.

### Viability

**Take-home, conditionally.** Viable when the target has useful accessibility semantics and the implementer already knows LangGraph/OPA. Otherwise it is a strong design alternative and A should implement the same semantic target seam more simply.

---

## C. Screenshot-and-coordinate CUA discovery, compiled replay

### Name

**Vision-to-Locator Compiler — visual discovery, semantic production**

### Concrete technology stack

- **Language/runtime:** TypeScript, Node.js LTS, `pnpm`.
- **LLM SDK/model:** `@anthropic-ai/sdk`, `claude-sonnet-5`, Anthropic beta `computer_20251124` tool with the `computer-use-2025-11-24` beta header.
- **Automation:** Playwright provides viewport screenshots and executes mouse/keyboard actions requested in screenshot coordinates. `sharp` creates crops and redaction masks. After each accepted action, a compiler probes Playwright/DOM and ARIA state at the point via `elementsFromPoint`, bounding boxes, labels, roles, and frame ancestry.
- **OS/Electron path:** a `PixelSurface` can later map actions to OS input injection, but **compiled replay requires a backend-specific stable target**. Electron renderer coordinates can compile to Playwright locators; Windows points can compile to UIA selectors. If no selector surface exists, the capability remains unapproved.
- **Orchestration:** custom bounded CUA loop plus an explicit offline compiler and validation pass. No model-based replay or self-healing.
- **Schema/storage:** Zod 4; raw trajectory is append-only NDJSON evidence, compiled capability is canonical JSON, and approval state is separate metadata.
- **CLI/logging:** `commander`, `pino`, `tsx`.
- **Tests:** Vitest compiler fixtures, Playwright Test for replay and coordinate-to-element capture, screenshot redaction tests, N-run replay stability check.
- **Evidence format:** redacted screenshots for every visual observation, coordinate/action overlays, redacted model/tool NDJSON, hit-test/ARIA compiler report, compiled artifact, replay trace and structured results.
- **Target app:** a visually clear but semantically hostile MemberDesk web variant with nested tables, generic elements, and an iframe. It must still have enough DOM/ARIA identity to compile stable replay targets.

### Artifact schema sketch

```ts
type VisualCompiledCapabilityV1 = {
  schemaVersion: "1.0";
  id: string;
  provenance: {
    discoveryRunId: string;
    compilerVersion: string;
    sourceEvidenceDigest: string;
  };
  contract: { input: JsonSchema; output: JsonSchema };
  steps: Array<{
    id: string;
    action: {
      kind: "click" | "fill" | "read";
      target: {
        compiled: SemanticLocator;
        alternates: SemanticLocator[];
        sourcePointProof: {
          screenshotRef: string; // redacted evidence reference, not replay input
          normalizedBox: [number, number, number, number];
          hitTestFingerprint: string;
        };
      };
      value?: ParameterBinding;
    };
    checkpoint: Assertion[];
    outcomes: OutcomeRule[];
    recovery: BoundedRecovery[];
  }>;
  compilation: {
    status: "resolved" | "ambiguous" | "unresolvable";
    uniquenessChecks: CompilationCheck[];
    replayTrials: number;
  };
  approval: "draft" | "approved";
};
```

Coordinates and screenshot references explain provenance; the replay executor refuses to use them as action targets. An `ambiguous` or `unresolvable` compilation cannot be approved.

### Replay strategy — no LLM in the decision loop

Replay is effectively A’s semantic Playwright interpreter. It loads only `compiled` targets, validates the capability is approved, and executes fixed waits/checkpoints/outcome branches. It never sends a screenshot to a model and never clicks the discovery coordinates. A compile validation run must prove each target resolves uniquely and the whole flow reaches the checkpoint; repeated runs provide a small stability signal.

For a truly opaque canvas, remote desktop stream, or video surface, this architecture has no honest locator compiler. A fixed image template plus normalized coordinates is deterministic but not sufficiently robust for this take-home’s production path; classify that surface as unsupported or route it to E, rather than disguising it as semantic replay.

### HITL seam — same live session

The CUA loop and replay engine both own a headed Playwright context guarded by the same control lease as A. Escalation provides the current redacted screenshot with cursor/action overlay and keeps the page open. The human acts in that window; browser instrumentation records a redacted event interval. Resume takes a fresh screenshot and DOM/ARIA snapshot, verifies a named checkpoint, and continues or terminates.

### Safety

- A policy gate evaluates every coordinate action before input injection. The executor maps the point to the current topmost element and frame when possible; navigation or risky targets that cannot be identified are denied.
- Origin/route/action allowlists still apply even though perception is visual. Coordinate clicks outside the content viewport, on browser chrome, downloads, or cross-origin frames are denied.
- Sensitive rectangles are derived from known field labels/DOM hit testing and blurred before model transmission or persistence. Typed secrets are inserted by the executor from parameter references; the model sees placeholders, not literal values.
- Irreversible controls require a semantic post-hit-test classification and human approval; unknown visual targets cannot be approved by coordinate alone.
- The compiled artifact contains no screenshot bytes, model transcript, entered values, or raw coordinates as executable actions.

### Complexity

**High.** This builds two targeting systems—visual discovery and semantic replay—and a compiler between them. That is intellectually aligned with “model discovers; artifact becomes capability,” but it raises the probability of an incomplete core.

### Interview-fit score

**7/10.** It responds directly to the brief’s bias toward surfaces without a clean DOM and demonstrates genuine record-then-compile thinking. The Section 7 deduction is execution risk: graders will prioritize a correct replay, error taxonomy, and handoff over an impressive discovery demo. Compilation failures are common exactly where visual CUA is most useful.

### Kill criteria

Stop after a short spike if more than one critical action compiles only to layout-sensitive CSS, if iframe/canvas hit testing cannot recover a stable target, if screenshot redaction cannot be demonstrated, or if the visual loop consumes the effort needed for deterministic replay and HITL. Fall back to A/B while retaining visual screenshots as a secondary observation.

### Viability

**Take-home stretch or strong design alternative.** It is viable if a compile spike resolves the full target path early. It should not be the only plan without that proof.

---

## D. Local Electron thick-client proxy

### Name

**Desktop Proxy Capability Runner — Playwright `_electron`**

### Concrete technology stack

- **Language/runtime:** TypeScript/Node.js, `pnpm`.
- **LLM SDK/model:** `@anthropic-ai/sdk` with `claude-sonnet-5`.
- **Target application:** packaged local `electron` MemberDesk Desktop Proxy with synthetic records, multiple `BrowserWindow`s, a preload bridge, modal confirmation, and injected error states. The automation must operate the visible UI; direct main-process APIs are diagnostics only.
- **Automation:** Playwright’s experimental `_electron` namespace; `ElectronApplication.firstWindow()/windows()` and ordinary `Page` locators for renderer content.
- **OS/Electron path:** this is the Electron path. Native `dialog.show*` UI is outside Playwright renderer control; either declare it unsupported and escalate, or add E’s OS adapter. Stubbing dialogs through `electronApplication.evaluate()` is acceptable in target tests but would not prove real computer use, so it is not the demo path.
- **Orchestration:** custom reducer like A, with a `SurfaceSession` holding `ElectronApplication`, window registry, and control lease.
- **Schema/storage:** Zod 4 and canonical JSON capability catalog; surface-specific window descriptors sit behind the common operation model.
- **CLI/logging:** `commander`, `pino`, `tsx`.
- **Tests:** Vitest, Playwright Test, Electron packaging smoke test, window/modal and process-exit tests.
- **Evidence format:** NDJSON, per-window screenshots, ARIA/DOM snapshots, renderer trace where supported, Electron process/window metadata, capability/result JSON, optional short screen recording.

### Artifact schema sketch

```ts
type ElectronCapabilityV1 = {
  schemaVersion: "1.0";
  id: string;
  app: {
    family: "memberdesk-electron";
    executableAlias: string;     // maps through trusted deployment config
    versionRange: string;
    publisherFingerprint?: string;
  };
  contract: { input: JsonSchema; output: JsonSchema };
  steps: Array<{
    id: string;
    window: {
      logicalName: string;
      title: StringMatcher;
      opener?: string;
      rendererOrigin?: StringMatcher;
    };
    action: RendererAction | { kind: "escalateNativeDialog"; signature: string };
    checkpoint: WindowAssertion[];
    transitions: TransitionRule[];
  }>;
  unsupportedSurfacePolicy: "escalate" | "fail";
  policyRef: string;
};
```

`RendererAction` uses the same semantic locator and parameter-binding types as A. Executable paths, local user directories, and window handles are runtime configuration, not portable artifact fields.

### Replay strategy — no LLM in the decision loop

Verify the executable identity/version, launch or attach according to deployment policy, map logical windows deterministically, and interpret renderer actions with Playwright locators. Window creation/closure, route, visible state, and output assertions are checkpoints. A native dialog signature takes an explicit `escalate`/`fail` edge; no model is called and no hidden IPC method performs the business action.

### HITL seam — same live session

Set the application lease to `HUMAN`, stop all Playwright actuators, and leave the same Electron process and windows visible. The operator acts in the desktop window. Renderer event instrumentation and window lifecycle listeners record the interval. Resume maps current windows again, verifies the expected checkpoint, and returns the lease to automation.

### Safety

- Allowlist executable alias, resolved binary path, publisher/hash in higher-assurance deployments, renderer origins, logical windows, and operation classes.
- Deny arbitrary `electronApp.evaluate`, preload IPC, shell opening, file pickers, external navigation, and OS shortcuts from model-generated actions.
- Use synthetic data in the demo. Apply the same typed-field and evidence-sink redaction as A; Electron user-data directories are ephemeral and deleted after test runs.
- Irreversible UI action policy is enforced immediately before the visible click, independent of discovery.
- If a native dialog cannot be observed and policy-checked, stop; do not inject blind keystrokes.

### Complexity

**High.** It requires creating/packaging a credible target and handling processes/windows in addition to the required automation system. The desktop signal is real but mostly Chromium renderer automation, not proof of Win32/WPF reach.

### Interview-fit score

**6/10.** It strengthens Section 7’s heterogeneity narrative and makes same-session desktop handoff vivid. It scores lower on expected take-home value because Electron setup competes with schema/replay/error depth, `_electron` is explicitly experimental, and native dialogs still require a second mechanism.

### Kill criteria

Abandon as the implementation target if packaging or display setup is unreliable, if the important path enters native dialogs, if the target app itself becomes a large deliverable, or if renderer automation adds no meaningful evidence beyond browser A. Retain `ElectronSurface` as a design adapter.

### Viability

**Take-home only when a suitable local Electron target already exists; otherwise design-only.** It is a good demonstration adapter, not the safest primary submission.

---

## E. Native Windows accessibility adapter

### Name

**UIA Control-Pattern Runner — native accessibility first**

### Concrete technology stack

- **Languages/runtime:** TypeScript/Node.js control plane plus a .NET 10 C# Windows worker over newline-delimited JSON-RPC on stdio.
- **LLM SDK/model:** `@anthropic-ai/sdk` with `claude-sonnet-5`; the model sees a compact UIA tree with observation-local refs.
- **Automation:** NuGet `FlaUI.Core` and `FlaUI.UIA3`; invoke UIA patterns (`Invoke`, `Value`, `Selection`, `Toggle`) before coordinate input. A UIA2 fallback may be selected for a known app profile where UIA3 has compatibility defects.
- **OS/Electron path:** Windows native is the implementation path. Browser/Electron adapters can coexist behind the same `SurfaceAdapter`; Electron native dialogs become visible to the UIA worker.
- **Orchestration:** custom TypeScript reducer; C# owns application attachment, UIA tree snapshots, event subscriptions, actions, and screenshots.
- **Schema/storage:** Zod 4 in the control plane; generated C# DTO schema validation; canonical JSON artifacts. No distributed service.
- **CLI/logging:** `commander`, `pino`, structured C# `ILogger` events.
- **Tests:** Vitest contract tests, xUnit worker tests, a small WPF/WinForms synthetic MemberDesk fixture, Windows-only end-to-end job.
- **Evidence format:** redacted NDJSON, normalized UIA tree snapshots, action/control-pattern records, screenshots and optional video on failure, capability/result JSON, process/window fingerprint.
- **Target app:** synthetic Windows WPF MemberDesk with a legacy WinForms variant for design validation. This must run on a Windows interactive desktop, not the present Linux/cloud runner.

### Artifact schema sketch

```ts
type NativeCapabilityV1 = {
  schemaVersion: "1.0";
  id: string;
  app: {
    family: string;
    executableAlias: string;
    productVersionRange: string;
    topWindow: UiaTarget;
  };
  contract: { input: JsonSchema; output: JsonSchema };
  steps: Array<{
    id: string;
    operation: "invoke" | "setValue" | "select" | "toggle" | "readText";
    target: UiaTarget;
    value?: ParameterBinding;
    expectedPatterns: string[];
    waitFor: UiaEventOrPredicate;
    outcomes: OutcomeRule[];
    retry: { maxAttempts: number; onComBusy?: true };
  }>;
  policyRef: string;
};

type UiaTarget = {
  controlType: string;
  name?: StringMatcher;
  automationId?: StringMatcher;
  frameworkId?: string;
  ancestors?: UiaTarget[];
  ordinal?: number;
};
```

Runtime IDs, HWNDs, screen coordinates, and process IDs are transient and forbidden in portable selectors. App/version profiles may provide reviewed target overrides for tenant variants.

### Replay strategy — no LLM in the decision loop

Attach only to the allowlisted process/window subtree, resolve each `UiaTarget`, require the expected control pattern, invoke it, and wait on UIA events plus bounded polling. Deterministic predicates inspect window/control existence, text/value parsing, enabled state, dialog signatures, and process liveness. COM-busy retries are bounded; known business dialogs return outcome variants; unknown modal windows stop with evidence.

### HITL seam — same live session

The Windows worker and target remain in the same interactive desktop session. On intervention it releases automation input, changes the lease to `HUMAN`, and surfaces a request to the operator connected to that exact console/RDP session. UIA focus/window events record what changed without persisting sensitive values. Resume reacquires the lease and snapshots the current UIA tree; it never starts a fresh app session.

### Safety

- Scope tree queries and actions to an allowlisted executable identity, process, top-level window, and descendant control. Deny desktop-global searches during actuation.
- Prefer semantic UIA patterns; raw `SendKeys` and coordinate clicks require explicit policy grants and are denied for unknown/risky targets.
- Strip `Value`, password, and configured PII-bearing text properties before model/evidence serialization. Redact screenshots at known UIA bounding rectangles.
- Require a one-use approval for irreversible UIA invocations, bound to control fingerprint and current window state.
- Worker protocol accepts a closed action union; no arbitrary PowerShell, process launch, or reflection.

### Complexity

**Very high and platform-specific.** It adds a second language, interactive Windows infrastructure, COM/UIA edge cases, and a target fixture. The abstraction is credible, but this is the wrong place to spend the take-home’s integration budget unless Windows is already available.

### Interview-fit score

**6/10.** It is the strongest direct answer to Section 7 heterogeneity and the brief’s “only reliable surface” statement. It is weaker against the total rubric because the likelihood of missing the complete discovery/replay/error/HITL evidence thread is materially higher. A native demo does not compensate for an incomplete artifact contract.

### Kill criteria

Do not implement unless a Windows interactive runner and target are available at the start. Abandon a target whose custom controls expose neither useful UIA properties nor stable patterns, whose secure desktop/UAC interrupts the session, or whose virtualization blocks same-session operator control. Keep it as an adapter design and implement A/B.

### Viability

**Design-only in the current environment.** Viable as a production adapter spike on dedicated Windows infrastructure, not as the primary take-home path.

---

## F. Anti-pattern: raw visual macro tape

### Name

**“Deterministic” Coordinate Recorder — the kill**

### Concrete technology stack

- **Language/runtime:** Python 3, `uv`.
- **LLM SDK/model:** `anthropic` with Claude computer use.
- **Automation:** `pyautogui` and Pillow screenshots, or Playwright mouse coordinates for a browser.
- **OS/Electron path:** global mouse/keyboard treats every surface alike in name only.
- **Orchestration:** a loop records `{screenshot, x, y, key, delay}` events.
- **Schema/storage:** Pydantic model for a linear JSON macro.
- **CLI/tests:** Typer and pytest; tests can assert serialization but cannot establish semantic correctness.
- **Evidence format:** screenshot sequence, model transcript, and macro JSON.
- **Target app:** any visually stable MemberDesk variant.

### Artifact schema sketch

```py
class Macro(BaseModel):
    version: Literal["1"]
    width: int
    height: int
    inputs: dict[str, str]
    events: list[
        Click(x=int, y=int, after_ms=int)
        | Type(text_template=str, after_ms=int)
        | Hotkey(keys=list[str], after_ms=int)
    ]
    success_pixel: tuple[int, int, str] | None
```

There are no semantic controls, typed output extraction contract, meaningful checkpoints, outcome branches, or app compatibility model.

### Replay strategy — no LLM in the decision loop

Replay substitutes parameters and emits the same coordinates/keys after fixed sleeps. It technically has no LLM in the decision loop, but timing and layout are implicit inputs. A pixel check is not a meaningful business checkpoint, and a dialog appearing early can redirect every subsequent action.

### HITL seam — same live session

Pause the macro and let a human use the same desktop, then resume at an event index. There is no reliable state reconciliation, control ownership beyond a process flag, or safe way to know whether the human already performed the next action.

### Safety

An origin/process allowlist can be checked at startup and typed parameter strings can be redacted, but per-action policy is weak because a point has no stable semantic identity. A late modal or shifted window can turn an allowed point into an irreversible control. Screenshots also maximize sensitive-data exposure.

### Complexity

**Low to demo, high to make trustworthy.** Adding image matching, OCR, modal classifiers, calibration, branching, and semantic hit testing reconstructs C or E poorly.

### Interview-fit score

**2/10.** It can show a flashy real goal, but it fails the Section 7 center of gravity: deliberate capability schema, stable replay, expected/recoverable/hard outcome handling, safe action identity, and credible reuse. “Same pixels” is not the stable-UI assumption the brief asks the candidate to exploit.

### Kill criteria

Kill immediately when an action cannot name the intended control independently of its position, when replay uses sleeps as state synchronization, when outputs require OCR without typed validation, or when an unexpected dialog can retarget a subsequent click. Do not repair it incrementally; move to C for compile-to-locator or E for UIA.

### Viability

**Avoid.** It is acceptable only as a short discovery instrumentation spike whose output is never approved or invoked as a capability.

---

## Ranked recommendation, without locking a winner

1. **A — conventional Playwright/TypeScript.** Best expected interview outcome because it protects the complete vertical slice and invests effort in the rubric’s load-bearing pieces. Preserve a real `SurfaceAdapter`, backend-neutral operations, and locator-reason metadata so the simplicity is a decision, not an accidental DOM lock-in.
2. **B — accessibility-first graph.** Prefer it over A if an early target probe shows a strong a11y tree and the implementer can keep LangGraph/OPA subordinate to the capability contract. Its graph schema and semantic targets are the best production-design direction.
3. **C — screenshot CUA compiler.** Promote it to #1 or #2 only after a short proof shows that every successful visual action compiles to a stable locator and redaction works. It is the clearest frontier-lab interpretation of “the model discovers.”
4. **D — Electron proxy.** Use if a suitable app already exists and desktop demonstration is strategically important. Do not mistake Chromium renderer automation for full native support.
5. **E — native UIA.** Carry the adapter and schema into the design; build it only on ready Windows infrastructure.
6. **F — raw macro.** Reject.

This is deliberately not a winner lock. The unresolved target and environment gates can change the ordering. Residual risks remain even for A: DOM semantics may overfit the proxy; CLI HITL may be visually modest; local synthetic data makes redaction less adversarial; and tenant overlays are designed rather than implemented. B retains accessibility coverage risk; C retains compiler risk; D/E retain platform risk.

### Why #1 is not a majority-vote claim

No model vote determines this ranking, and repeated recommendations would not make an architecture correct. A is #1 from an explicit grader-weighted expected-value judgment: probability of a complete, defensible artifact/replay/error/HITL implementation multiplied by the importance order in Section 7. It is not a claim that DOM automation is the production majority choice, that it generalizes best, or that other researchers agree. New evidence—especially an a11y-quality probe or a successful screenshot-to-locator compile spike—should change the rank.

## Human questions / required gates

### G1 — Target surface

**Question:** Which concrete surface should the implementation prove: local hostile HTML, public demo, local Electron, or native Windows?

- **Recommended default:** local hostile HTML MemberDesk with synthetic data and deterministic error injection.
- **If public demo:** less fixture code, but weaker control of exceptional states, availability, ToS, and repeatability.
- **If Electron:** stronger desktop signal, but only choose with a pre-existing target and accept renderer/native-dialog limits.
- **If native Windows:** select E and provide an interactive Windows environment; otherwise it is not an executable take-home choice.

### G2 — Computer-use mechanism

**Question:** Should discovery be DOM/tool-first (A), a11y-first (B), screenshot/coordinate-first with compilation (C), or hybrid?

- **Recommended default:** hybrid observation with A as the action/replay core: DOM plus ARIA summary during discovery, screenshots as secondary evidence; semantic locators on replay.
- **Choose B** if the target probe shows high-quality names, roles, landmarks, and states.
- **Choose C** only if visual discovery is an explicit differentiation goal and the full-path compiler spike succeeds.
- OS-global coordinate injection is not recommended for the take-home.

### G3 — Full technology stack lock

**Question:** Which complete stack should be locked after the target probe?

1. **Stack A:** TypeScript + `@anthropic-ai/sdk` + Playwright + custom reducer + Zod 4 + Commander/Pino + Vitest/Playwright Test + JSON/NDJSON/trace.
2. **Stack B:** Stack A plus Playwright ARIA snapshots + `@langchain/langgraph`/SQLite checkpoint + OPA Wasm.
3. **Stack C:** TypeScript + Anthropic computer-use tool + Playwright/`sharp` + custom CUA loop/compiler + Zod/Vitest/Playwright Test.

**Recommended default:** Stack A. Add one B idea—the backend-neutral semantic target—without adopting B’s frameworks unless a demonstrated need appears.

### G8 — Artifact schema philosophy

**Question:** Should the source artifact be a declarative DSL, a recorded event log, or a hybrid?

- **Recommended default:** hybrid pipeline, separate stores: append-only discovery events as redacted evidence; compiler emits a declarative, versioned JSON capability that is the only replay input.
- JSON is canonical because it has unambiguous machine serialization and direct JSON Schema validation. Generate a human-readable view if useful; do not make hand-edited YAML the authoritative runtime artifact.
- Reject replaying the raw transcript/event log. Keep compiler provenance and artifact/evidence digests for review.

### G12 — Scope cuts

**Question:** Implement web now with desktop as a real adapter design, or also implement Electron/native OS?

- **Recommended default:** implement one web adapter end to end; design `ElectronSurface` and `WindowsUiaSurface`; do not build either until all required web evidence, error cases, safety, and same-session handoff pass.
- **Optional cut-line exception:** add a tiny renderer-only Electron smoke adapter after the core, not a second discovery system.
- Native UIA remains design-only unless Windows infrastructure and a target are already supplied.

## Source notes

Official/primary references checked 2026-08-16:

- Assignment source: `/workspace/Project.md`, Sections 3–7.
- Playwright recommends user-facing role locators and explicit contracts: <https://playwright.dev/docs/locators>
- Playwright ARIA snapshots, including programmatic snapshots: <https://playwright.dev/docs/aria-snapshots> and <https://playwright.dev/docs/api/class-page#page-aria-snapshot>
- Playwright trace evidence and its DOM/action inspection: <https://playwright.dev/docs/trace-viewer>
- Playwright `_electron` is experimental; renderer windows and native-dialog limitation: <https://playwright.dev/docs/api/class-electron>
- Anthropic computer use is beta, uses `computer_20251124`, and requires the client to execute actions: <https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool>
- Anthropic TypeScript client package and runtime support: <https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript>
- Zod 4 native JSON Schema conversion: <https://zod.dev/json-schema>
- LangGraph interrupts/checkpointers: <https://docs.langchain.com/oss/javascript/langgraph/interrupts> and <https://docs.langchain.com/oss/javascript/langgraph/checkpointers>
- OPA’s JavaScript Wasm SDK package: <https://github.com/open-policy-agent/npm-opa-wasm>
- FlaUI’s Windows UIA2/UIA3 scope and compatibility trade-offs: <https://github.com/FlaUI/FlaUI>

Package versions should be locked from the package manager at implementation time; names and API status above were verified, but research should not invent future version pins.
