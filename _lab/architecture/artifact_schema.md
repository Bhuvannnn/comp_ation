# Architecture — capability artifact schema (Zod-shaped draft + versioning)

**Status:** implementation contract. This is the single most graded object in the submission ([`Project.md`](../../Project.md) §3.2, §7).
**Locked inputs:** [`ADR-002-perception.md`](../decisions/ADR-002-perception.md), [`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md), [`locked_stack.md`](../decisions/locked_stack.md), G8 in [`open_questions.md`](../decisions/open_questions.md), [`PRD.md`](../product/PRD.md) "Artifact must-haves".
**Research cited:** [`tech_stack.md`](../research/tech_stack.md) §7 (versioning, provider constraints), [`alternatives_matrix.md`](../research/alternatives_matrix.md) A/B/C sketches, [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gaps 1–5 (the gaps this schema exists to close), [`_hitl_safety.md`](../research/_hitl_safety.md) §§2.2, 2.3, 4.2, [`frontier_computer_use.md`](../research/frontier_computer_use.md) §B.6, [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §3–4, [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4.
**File:** `src/artifact/schema.ts` (types + Zod), `src/artifact/locator.ts`, `src/artifact/contract.ts`, `src/artifact/overlay.ts`, `src/artifact/migrate.ts`.

---

## 0. The five gaps this schema closes

The Claude alternatives review found the strongest prior sketch (`CapabilityV1`) materially incomplete. Those findings are requirements here, not suggestions:

| Gap ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5) | Closed by |
|---|---|
| Versioning is a monotone counter; no `contractHash` | §4 three-part versioning + derived `contractHash` |
| `contract.input: JsonSchema` is an opaque blob — no sensitivity labels, no referential integrity | §5 first-class `params[]` with `sensitivity`; JSON Schema is *derived*, not authored |
| Caller-visible result union is implicit, scattered across steps | §6 `results` declared once at capability level; steps reference codes |
| No capability-level success condition | §6.3 `successCondition` |
| Extraction under-typed; tenant overrides are an unreviewable inline merge | §7 typed `parse` + `onMissing`; §9 overlays as separate approved files |

Plus one addition promoted from architecture `B`: `app.fingerprint` (§8), the concrete answer to "how do you detect per-tenant/version drift" ([`Project.md`](../../Project.md) §3.7).

---

## 1. Non-negotiables

1. **Locators are a discriminated union, not CSS strings.** CSS is one member of the union, is ranked last, and carries a mandatory justification. ([`ADR-002-perception.md`](../decisions/ADR-002-perception.md); [`non_viable.md`](../research/non_viable.md) #4)
2. **No `ref=eN`, no coordinates, ever, as an executable target.** Both are discovery provenance and live in the journal. ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §3; [`frontier_computer_use.md`](../research/frontier_computer_use.md) anti-pattern 4)
3. **The model does not author the artifact.** It emits a flat, strict-mode-safe proposal; the compiler synthesises versions, hashes, provenance, policy binding, and approval. ([`tech_stack.md`](../research/tech_stack.md) §7.2; [`Project.md`](../../Project.md) §3.2 "decoupled from the raw model transcript")
4. **JSON is canonical.** YAML is a render-for-review option only — implicit typing is a hazard in a file full of account-shaped identifiers. ([`tech_stack.md`](../research/tech_stack.md) §7.1)
5. **Zod is the single source of truth**: one definition yields the TypeScript type, the runtime validator, and the caller-facing JSON Schema via `z.toJSONSchema()`.

---

## 2. File and type map

| Path | Exports | Notes |
|---|---|---|
| `src/artifact/schema.ts` | `CapabilitySchema`, `Capability` (inferred), `CAPABILITY_SCHEMA_VERSION` | No `playwright`, no `openai` imports |
| `src/artifact/locator.ts` | `LocatorSchema`, `LocatorRefSchema`, `LocatorKindSchema`, `RankedTargetSchema`, `FrameRefSchema`, `StringMatcherSchema` | Pure data; resolution lives in `src/replay/resolve.ts` |
| `src/artifact/contract.ts` | `computeContractHash()`, `toCallerJsonSchema()`, `describeCapability()` | `describeCapability` renders the human/agent-readable summary for `inspect` |
| `src/artifact/compile.ts` | `compileCapability(journal, opts)` | Journal → artifact; strips refs; ranks locators |
| `src/artifact/overlay.ts` | `OverlaySchema`, `applyOverlay(base, overlay)` | Closed override kinds; returns `{ capability, appliedOps[] }` |
| `src/artifact/migrate.ts` | `migrate(raw)` | Known older majors upgraded; unknown majors refused |
| `src/artifact/serialize.ts` | `writeCapability`, `readCapability` | Canonical JSON (stable key order, 2-space, `\n`) |

### 2.1 Zod version and declaration order

Target **zod 4.x**. Two v4-specific things the snippets below rely on: `z.toJSONSchema()` is built in (no `zod-to-json-schema` dependency), and `z.record()` takes an explicit key schema (`z.record(z.string(), V)`, not `z.record(V)`).

The sections that follow are ordered for reading, not for compilation. Because every schema except `AssertionSchema` is evaluated eagerly, `schema.ts` must declare them **leaves first**:

```
StringMatcher → LeafLocatorMembers → LocatorRef → Locator → LocatorKind → FrameRef
  → RankedTarget → Assertion (z.lazy) → Wait → Sensitivity → Param/Output → Contract
  → Recoverable → ValueRef → Step → Entrypoint → SurfaceBinding → AppCompat
  → Provenance → OverrideKind → Capability → Overlay
```

Only `AssertionSchema` may forward-reference (`RankedTargetSchema` is captured inside the `z.lazy` thunk, so it resolves at parse time, not at module-init time). Any other forward reference is a `ReferenceError` at import — a temporal-dead-zone bug that unit tests catch immediately but that is worth not writing.

`WaitSchema` is artifact data, so it is **declared in `src/artifact/schema.ts`** and imported by `src/replay/waits.ts`, which owns only the executor. It is documented in [`replay_and_errors.md`](./replay_and_errors.md) §3 because that is where waits are explained; the dependency runs replay → artifact, never the reverse.

---

## 3. Top-level shape

```ts
// src/artifact/schema.ts
import { z } from "zod";

export const CAPABILITY_SCHEMA_VERSION = 1 as const;

export const CapabilitySchema = z.object({
  /* ── identity & versioning (§4) ─────────────────────────────── */
  schemaVersion:      z.literal(1),
  capabilityId:       z.string().regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),  // e.g. "memberdesk.savings_balance_lookup"
  capabilityVersion:  z.string().regex(/^\d+\.\d+\.\d+$/),                 // semver of the recorded flow
  contractHash:       z.string().regex(/^sha256:[0-9a-f]{64}$/),           // DERIVED — never hand-edited (§4.3)

  /* ── review state ───────────────────────────────────────────── */
  status: z.enum(["draft", "approved", "retired"]),
  approval: z.object({
    approvedBy:           z.string(),          // operator id, not a person's PII
    approvedAt:           z.string().datetime(),
    approvedContractHash: z.string(),          // must equal contractHash to be honoured
    notes:                z.string().max(2000),
  }).nullable(),

  /* ── provenance: how this file came to exist (§10) ───────────── */
  provenance: ProvenanceSchema,

  /* ── where it runs (§8) ─────────────────────────────────────── */
  surface: SurfaceBindingSchema,
  app:     AppCompatSchema,

  /* ── the callable contract (§5, §6) ─────────────────────────── */
  contract: ContractSchema,

  /* ── the flow ───────────────────────────────────────────────── */
  entrypoint: EntrypointSchema,
  steps:      z.array(StepSchema).min(1),

  /* ── declared runtime behaviour (§6) ────────────────────────── */
  knownRecoverables: z.array(RecoverableSchema),   // referenced by steps, declared once

  /* ── policy binding (§11) ───────────────────────────────────── */
  policyRef: z.object({
    id:     z.string(),                       // "policy/memberdesk@1"
    digest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  }),

  /* ── multi-tenant (§9): declaration only; no inline overrides ── */
  overlayPolicy: z.object({
    allowedKinds: z.array(OverrideKindSchema),   // closed set the base author permits
    requireApproval: z.boolean(),                // overlays must be `approved` to apply
  }),
}).strict();

export type Capability = z.infer<typeof CapabilitySchema>;
```

There is deliberately **no `tenantOverrides` map** in the base artifact. See §9.

---

## 4. Versioning — three different things, never conflated

Direct from [`tech_stack.md`](../research/tech_stack.md) §7.3, hardened by [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 1.

| Field | Versions | Consumer | Bump rule |
|---|---|---|---|
| `schemaVersion` | the file format | the replay engine | integer; replay **refuses unknown majors**, `migrate.ts` upgrades known older ones |
| `capabilityVersion` | the recorded flow's semantics | a human reviewing a diff | semver: patch = locator/rationale edits; minor = additive steps/outputs; **major = the invocation contract changed** |
| `contractHash` | *only* the callable surface | the calling agent | derived; changes iff the caller-visible contract changes |

### 4.1 `schemaVersion` gate (normative)

```ts
// src/artifact/migrate.ts
export function migrate(raw: unknown): Capability {
  const v = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof v !== "number") throw new ArtifactError("MISSING_SCHEMA_VERSION");
  if (v > CAPABILITY_SCHEMA_VERSION) throw new ArtifactError("UNSUPPORTED_SCHEMA_VERSION_NEWER");
  if (v < CAPABILITY_SCHEMA_VERSION) return MIGRATIONS[v](raw);   // explicit, tested, one function per hop
  return CapabilitySchema.parse(raw);
}
```

Refusal is a `hard_failure` at load time with the observed and supported versions in the message. Never "best effort parse".

### 4.2 What `capabilityVersion` does *not* do

It cannot tell a caller whether a change is breaking — `7 → 8` is equally consistent with a typo fix and a renamed required parameter. That is `contractHash`'s job.

### 4.3 `contractHash` (derived)

```ts
// src/artifact/contract.ts
export function computeContractHash(c: Capability): string {
  const surface = {                      // ONLY the callable surface — nothing else
    capabilityId: c.capabilityId,
    summary:      c.contract.summary,
    params:       c.contract.params.map(p => ({
      name: p.name, type: p.type, required: p.required, sensitivity: p.sensitivity,
      constraints: p.constraints ?? null,
    })),
    outputs:      c.contract.outputs.map(o => ({ name: o.name, type: o.type, nullable: o.nullable })),
    results:      c.contract.results.businessOutcomes.map(b => b.code).sort(),
    successCondition: c.contract.successCondition,
  };
  return "sha256:" + sha256(canonicalJson(surface));
}
```

Properties to test (`test/artifact-contract.test.ts`):

- stable under cosmetic edits (a locator rationale change, a step reorder that preserves the contract, whitespace);
- changes when a param is renamed, made required, retyped, when an output is added/removed, when a business-outcome code is added, or when `successCondition` changes;
- recomputed on write and **verified on read** — a file whose stored hash disagrees with its computed hash is refused (`CONTRACT_HASH_MISMATCH`), because that means the file was hand-edited.

A calling agent pins `capabilityId@contractHash` and fails loudly on breakage without diffing the artifact ([`Project.md`](../../Project.md) §3.2 "a calling agent should be able to understand what the capability does, what it needs, and what it returns").

---

## 5. Parameters and outputs — first-class, with sensitivity

The JSON Schema a caller consumes is **derived** from these arrays, not authored alongside them. Authoring both is how they drift.

```ts
export const SensitivitySchema = z.enum([
  "public",      // safe to log and persist (e.g. a page title)
  "internal",    // log the name, not the value (e.g. a branch code)
  "pii",         // never persisted anywhere; returned to the caller in-memory only
  "secret",      // never persisted, never sent to the model, injected by the executor
]);

export const ParamSchema = z.object({
  name:        z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  type:        z.enum(["string", "integer", "number", "boolean", "date"]),
  required:    z.boolean(),
  sensitivity: SensitivitySchema,
  description: z.string().min(1),                    // shown to the calling agent
  constraints: z.object({
    pattern:   z.string().nullable(),                // e.g. "^[0-9]{5}$" for a synthetic member id
    minLength: z.number().int().nullable(),
    maxLength: z.number().int().nullable(),
    enum:      z.array(z.string()).nullable(),
  }).nullable(),
  /** Synthetic only. Compiler REJECTS a value captured from a live run. */
  exampleSynthetic: z.string().nullable(),
}).strict();

export const OutputSchema = z.object({
  name:        z.string(),
  type:        z.enum(["string", "integer", "number", "boolean", "date", "currency"]),
  nullable:    z.boolean(),
  sensitivity: SensitivitySchema,
  description: z.string().min(1),
}).strict();
```

### 5.1 Rules the compiler enforces at build time (not at replay time)

| Check | Failure |
|---|---|
| Every `valueRef: {fromParam}` in `steps[]` resolves to a declared param | `UNRESOLVED_PARAM_REF` |
| Every declared param is consumed by at least one step | `UNUSED_PARAM` (warning in `draft`, error to reach `approved`) |
| Every `extract[].outputName` resolves to a declared output | `UNDECLARED_OUTPUT` |
| No literal value in `steps[]` matches a `pii`/`secret` param's captured value | `LEAKED_PARAM_VALUE` |
| `exampleSynthetic` is absent for `pii`/`secret` params | `EXAMPLE_ON_SENSITIVE_PARAM` |

This is the referential-integrity point in [`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 2: a string reference into an opaque JSON Schema blob cannot be checked; a first-class array can, in two lines.

### 5.2 Sensitivity semantics (the sentence for `REPORT.md` §6)

> Parameters are **placeholdered** in the artifact (`{{memberId}}`), never captured; secrets are **masked** in logs and never sent to the model; extracted outputs are **classified** — a balance is returned to the caller and never written to disk.

Cited: [`tech_stack.md`](../research/tech_stack.md) §12.3; [`_hitl_safety.md`](../research/_hitl_safety.md) §§2.3, 9.

---

## 6. The caller-visible result set — declared once

```ts
export const ContractSchema = z.object({
  /** One sentence a human reviewer and a calling agent both read first. */
  summary:     z.string().min(10).max(300),
  description: z.string().max(2000),

  params:  z.array(ParamSchema),
  outputs: z.array(OutputSchema),

  results: z.object({
    success: z.object({
      description: z.string(),
      outputs:     z.array(z.string()),          // names of outputs guaranteed present on success
    }),
    /** The CLOSED set of legitimate domain results. Steps reference these codes; they never invent them. */
    businessOutcomes: z.array(z.object({
      code:        z.string().regex(/^[a-z][a-z0-9_]*$/),   // e.g. "member_not_found"
      description: z.string().min(1),
      /** Outputs the caller can rely on for THIS outcome (usually a subset, often empty). */
      outputs:     z.array(z.string()),
      /** Why this is a business result and not a failure — forced prose, reviewed by a human. */
      rationale:   z.string().min(1),
    })),
  }),

  /** §6.3 — the one assertion a reviewer reads first. Redundant with the last step's checkpoint by design. */
  successCondition: AssertionSchema,
}).strict();
```

### 6.1 Why the union is hoisted

A calling agent cannot branch on a result set it has to derive by walking every step, and a human reviewer cannot answer "what can this thing tell me?" without reading the whole flow ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 3). A load-time check asserts every step-level outcome code is declared here (`UNDECLARED_OUTCOME_CODE`).

### 6.2 `recoverable` is not in this list

Recoverables are mid-flight handling, not caller-visible results ([`ADR-005-taxonomy.md`](../decisions/ADR-005-taxonomy.md); [`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4.1 "lurking conflation A"). They are declared separately:

```ts
export const RecoverableSchema = z.object({
  id:          z.string(),                       // "unsaved_changes_dialog"
  description: z.string(),
  detect:      AssertionSchema,                  // how we know we are in it
  handle: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("dismiss"), target: RankedTargetSchema }),
    z.object({ kind: z.literal("click"),   target: RankedTargetSchema }),
    z.object({ kind: z.literal("wait"),    until: AssertionSchema, timeoutMs: z.number().int().max(30_000) }),
    z.object({ kind: z.literal("reload") }),
  ]),
  maxAttempts: z.number().int().min(1).max(3),
  /** Exhausting the budget is a hard failure with this code. Never a silent give-up. */
  onExhausted: z.object({ code: z.string(), message: z.string() }),
}).strict();
```

### 6.3 Assertions (checkpoints, preconditions, detectors) — one union

`all`/`any`/`not` make this the one recursive schema in the file, so it needs an explicit type
annotation and `z.lazy` — TypeScript cannot infer a self-referential `z.infer`:

```ts
export type RankedTarget  = z.infer<typeof RankedTargetSchema>;
export type StringMatcher = z.infer<typeof StringMatcherSchema>;

export type Assertion =
  | { kind: "urlMatches";     pattern: string }
  | { kind: "elementVisible"; target: RankedTarget }
  | { kind: "elementAbsent";  target: RankedTarget }
  | { kind: "textMatches";    target: RankedTarget; matcher: StringMatcher }
  | { kind: "valueMatches";   target: RankedTarget; matcher: StringMatcher }
  | { kind: "ariaSubtree";    target: RankedTarget; expectedYaml: string }
  | { kind: "all"; of: Assertion[] }
  | { kind: "any"; of: Assertion[] }
  | { kind: "not"; of: Assertion };

export const AssertionSchema: z.ZodType<Assertion> = z.lazy(() => z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("urlMatches"),     pattern: z.string() }),            // route pattern, not literal URL
  z.object({ kind: z.literal("elementVisible"), target: RankedTargetSchema }),
  z.object({ kind: z.literal("elementAbsent"),  target: RankedTargetSchema }),
  z.object({ kind: z.literal("textMatches"),    target: RankedTargetSchema, matcher: StringMatcherSchema }),
  z.object({ kind: z.literal("valueMatches"),   target: RankedTargetSchema, matcher: StringMatcherSchema }),
  z.object({ kind: z.literal("ariaSubtree"),    target: RankedTargetSchema, expectedYaml: z.string() }), // narrow, scoped
  z.object({ kind: z.literal("all"), of: z.array(AssertionSchema).min(1) }),
  z.object({ kind: z.literal("any"), of: z.array(AssertionSchema).min(1) }),
  z.object({ kind: z.literal("not"), of: AssertionSchema }),
]));
```

`ariaSubtree` must be **scoped to a target**, never a whole-page golden dump — a full-page snapshot is too broad across tenants and runtime data ([`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §4).

---

## 7. Steps

```ts
export const ValueRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("param"),   name: z.string() }),
  z.object({ kind: z.literal("literal"), value: z.string(), sensitivity: z.literal("public") }), // public literals only
  z.object({ kind: z.literal("output"),  name: z.string() }),   // a value extracted earlier in this run
]);

export const StepSchema = z.object({
  id:     z.string().regex(/^s[0-9]{2,}$/),      // stable, ordered, referenced by journals and results
  intent: z.string().min(1),                      // human sentence: "open the savings row for the member"

  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("navigate"), url: z.object({ routePattern: z.string(), fromParams: z.array(z.string()) }) }),
    z.object({ kind: z.literal("click"),    target: RankedTargetSchema }),
    z.object({ kind: z.literal("fill"),     target: RankedTargetSchema, value: ValueRefSchema }),
    z.object({ kind: z.literal("select"),   target: RankedTargetSchema, value: ValueRefSchema }),
    z.object({ kind: z.literal("check"),    target: RankedTargetSchema, checked: z.boolean() }),
    z.object({ kind: z.literal("press"),    target: RankedTargetSchema, key: z.string() }),
    z.object({ kind: z.literal("read"),     target: RankedTargetSchema }),
    z.object({ kind: z.literal("waitFor"),  until: AssertionSchema }),
  ]),

  /** §3.4 risk lives in the DATA MODEL so policy can be evaluated before a run starts. */
  risk: z.enum(["read", "reversible_write", "irreversible"]),

  preconditions: z.array(AssertionSchema),
  wait:          WaitSchema,                       // see replay_and_errors.md §3 — never a fixed sleep
  checkpoint:    z.array(AssertionSchema).min(1),  // success is asserted, never inferred

  extract: z.array(z.object({
    outputName: z.string(),                        // must resolve to contract.outputs[]
    from:       RankedTargetSchema,
    source:     z.enum(["text", "value", "attribute", "ariaName"]),
    attribute:  z.string().nullable(),
    /** §7.1 — a balance rendered "$1,234.56" is not a number until someone says how to parse it. */
    parse: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("text"),     trim: z.boolean() }),
      z.object({ kind: z.literal("integer"),  stripChars: z.string() }),
      z.object({ kind: z.literal("currency"), locale: z.string(), currency: z.string(), stripChars: z.string() }),
      z.object({ kind: z.literal("date"),     format: z.string(), locale: z.string() }),
      z.object({ kind: z.literal("regex"),    pattern: z.string(), group: z.number().int() }),
    ]),
    /** §7.2 — a missing value is a DECISION the artifact records, not one the executor improvises. */
    onMissing: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("hardFailure"), code: z.string() }),
      z.object({ kind: z.literal("businessOutcome"), code: z.string() }),   // must be declared in contract.results
      z.object({ kind: z.literal("null") }),                                // only if output.nullable === true
    ]),
  })),

  /** Steps REFERENCE declared codes; they do not define them. */
  outcomes: z.array(z.object({
    when: AssertionSchema,
    code: z.string(),                              // → contract.results.businessOutcomes[].code
  })),
  recoverables: z.array(z.string()),               // → knownRecoverables[].id

  /** What happens when nothing above matches. Default is the only safe one. */
  onUnmatched: z.enum(["hard_failure", "escalate"]).default("hard_failure"),
}).strict();
```

---

## 8. Targets and locators — a discriminated union, **not** CSS-only

This is the section [`Project.md`](../../Project.md) §3.2 means by "how each target element/control is identified (with your reasoning about robustness)".

### 8.1 The locator union

```ts
// src/artifact/locator.ts
export const StringMatcherSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("exact"),      value: z.string() }),
  z.object({ kind: z.literal("normalized"), value: z.string() }),   // trimmed, whitespace-collapsed, case-insensitive
  z.object({ kind: z.literal("prefix"),     value: z.string() }),
  z.object({ kind: z.literal("regex"),      value: z.string() }),
]);

/** The non-composite members, declared once and reused. Spread into both unions below so the
    leaf kinds cannot drift apart. */
const LeafLocatorMembers = [
  // ── semantic, surface-portable: preferred, and the only kinds a desktop backend can also honour ──
  z.object({ kind: z.literal("role"),        role: z.string(), name: StringMatcherSchema.nullable(),
                                             state: z.record(z.string(), z.union([z.boolean(), z.string()])).nullable() }),
  z.object({ kind: z.literal("label"),       text: StringMatcherSchema }),
  z.object({ kind: z.literal("placeholder"), text: StringMatcherSchema }),
  z.object({ kind: z.literal("text"),        text: StringMatcherSchema }),
  z.object({ kind: z.literal("altText"),     text: StringMatcherSchema }),
  z.object({ kind: z.literal("title"),       text: StringMatcherSchema }),
  z.object({ kind: z.literal("testId"),      id: z.string() }),      // legacy apps essentially never have these

  // ── structural: allowed, ranked last, and must justify itself ──
  z.object({ kind: z.literal("css"),   selector: z.string(),
             justification: z.string().min(20) }),                    // WHY no semantic handle existed
  z.object({ kind: z.literal("xpath"), expression: z.string(),
             justification: z.string().min(20) }),
] as const;

/** The inner target of a scoped locator: leaves only. One level of scoping, no unbounded nesting. */
export const LocatorRefSchema = z.discriminatedUnion("kind", [...LeafLocatorMembers]);

export const LocatorSchema = z.discriminatedUnion("kind", [
  ...LeafLocatorMembers,

  // ── legacy-surface shapes: the table/frameset reality named in Project.md §1 ──
  z.object({ kind: z.literal("rowScoped"),                            // "the Open button in the row whose ID cell is 12345"
             rowMatch: z.object({ columnHint: z.string().nullable(), cell: StringMatcherSchema }),
             within:   LocatorRefSchema }),                           // a role/text locator applied inside the row
  z.object({ kind: z.literal("labelledRegion"),                       // "inside the 'Account summary' fieldset/landmark"
             region: z.object({ role: z.string(), name: StringMatcherSchema }),
             within: LocatorRefSchema }),
]);

export type Locator = z.infer<typeof LocatorSchema>;
```

The composite kinds (`rowScoped`, `labelledRegion`) scope a leaf locator to a row or a landmark; they are what make a table-based legacy UI addressable semantically instead of by `tr:nth-child(7)`. Nesting stops at one level by construction, because `within` takes `LocatorRefSchema` and that union has no composite member.

The kind list is also needed as a bare enum — policy logs which kind resolved an action ([`safety_and_policy.md`](./safety_and_policy.md) §3 `ActionRequest.locatorKind`) and replay journals kind-level drift:

```ts
export const LocatorKindSchema = z.enum([
  "role", "label", "placeholder", "text", "altText", "title", "testId",
  "rowScoped", "labelledRegion", "css", "xpath",
]);
export type LocatorKind = z.infer<typeof LocatorKindSchema>;

// Keeps the enum and the union from drifting; fails to compile if a member is added to one only.
type _KindsMatch = Locator["kind"] extends LocatorKind
  ? LocatorKind extends Locator["kind"] ? true : never
  : never;
const _kindsMatch: _KindsMatch = true;
```

**There is no `coordinate` member.** A bounded coordinate click is a *discovery* escape hatch that must be promoted to a semantic target by hit-test before the step can be compiled; if promotion fails the step is uncompilable and the capability cannot leave `draft` ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A4 carve-out; [`frontier_computer_use.md`](../research/frontier_computer_use.md) contrarian option 2).

### 8.2 Frame path — named, never positional

```ts
export const FrameRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("main") }),
  z.object({ kind: z.literal("name"),       name: z.string() }),
  z.object({ kind: z.literal("urlPattern"), pattern: z.string() }),
  z.object({ kind: z.literal("titleMatch"), matcher: StringMatcherSchema }),
]);
```

`@puppeteer/replay` identifies frames by `frame: number[]` — a positional index path. On a frameset where frames can be reordered or conditionally rendered, that is precisely the brittleness to avoid, so the union above has **no index member** ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) S3 Miss 1).

### 8.3 The ranked target

```ts
export const RankedTargetSchema = z.object({
  framePath: z.array(FrameRefSchema).min(1),        // always explicit, always starts at main
  candidates: z.array(z.object({
    rank:     z.number().int().min(1),
    locator:  LocatorSchema,
    /** §3.2's "with your reasoning about robustness" — a required field, not prose in a README. */
    rationale: z.string().min(10),
    /** Measured at record time, not asserted. */
    evidence: z.object({
      matchCountAtRecord: z.number().int(),          // MUST be 1 for rank 1 to be accepted
      uniqueWithinFrame:  z.boolean(),
      observedRole:       z.string().nullable(),
      observedName:       z.string().nullable(),
    }),
    source: z.enum(["model_proposal", "compiler_promotion", "human_review"]),
  })).min(1),
  /** Locators the recorder considered and rejected, with reasons. Directly answers §3.2.
      A descriptor, NOT an executable locator: a rejected candidate is never resolved, and demanding
      a `justification` for a shape we are discarding is noise — `reason` is the justification. */
  rejected: z.array(z.object({
    kind:       LocatorKindSchema,
    descriptor: z.string().min(1),        // "css: table tr:nth-child(3) td:nth-child(2) input"
    reason:     z.string().min(10),
  })),
}).strict();
```

Compiler rules:

- rank 1 must have `matchCountAtRecord === 1`, otherwise the step is uncompilable;
- at least one candidate must be a semantic kind (`role|label|placeholder|text|altText|title|rowScoped|labelledRegion`) — a target whose *only* candidate is `css`/`xpath` blocks `approved` status;
- candidates are ordered semantic-first, structural-last, and the order is the replay resolution order ([`replay_and_errors.md`](./replay_and_errors.md) §2).

### 8.4 Entrypoint

```ts
export const EntrypointSchema = z.object({
  /** Resolves against `policy.surfaces[].id` — the artifact stores NO literal origin (§11).
      Moving a capability between environments is a policy edit, not an artifact edit, and an
      overlay therefore cannot introduce an origin the allowlist has not already approved. */
  originAlias:  z.string(),
  /** Canonicalized route pattern, never a captured concrete URL: "/members/:id/accounts". */
  routePattern: z.string(),
  /** Param names substituted into the pattern, in the order the segments appear. */
  fromParams:   z.array(z.string()),
}).strict();
```

### 8.5 Surface binding and app compatibility

```ts
export const SurfaceBindingSchema = z.object({
  kind: z.enum(["web", "electron", "os_desktop"]),
  /** Optional, additive per-backend hints. Absence must never block a backend that understands the semantic locator. */
  backendHints: z.object({
    web:        z.object({ preferCssFallback: z.boolean() }).nullable(),
    windowsUia: z.object({ automationId: z.string().nullable(), controlType: z.string().nullable() }).nullable(),
  }).nullable(),
}).strict();

export const AppCompatSchema = z.object({
  vendorProduct:   z.string(),                    // "memberdesk"
  appVersionRange: z.string(),                    // semver range or "unknown"
  /** §3.7 drift detection: digest over title + landmark roles/names + route pattern, recorded at record time. */
  fingerprint: z.object({
    algorithm: z.literal("landmark-digest-v1"),
    value:     z.string(),
    inputs:    z.object({
      title:     z.string(),
      landmarks: z.array(z.object({ role: z.string(), name: z.string() })),
      route:     z.string(),
    }),
  }),
  /** Mismatch produces a typed drift outcome, never a crash. Policy chosen per capability. */
  onFingerprintMismatch: z.enum(["warn_and_continue", "escalate", "hard_failure"]),
}).strict();
```

---

## 9. Tenant overrides — separate overlay files, never a silent merge

The prior sketch's `tenantOverrides?: Record<string, LocatorOverride>` has three defects: it is keyed on tenant alone when drift is `{tenant, appVersion}`; an open record is an arbitrary merge, and an arbitrary merge is unreviewable; and nesting every tenant's deltas inside the shared base means one tenant's label change bumps an artifact all tenants depend on, which makes the base's approval state meaningless ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 gap 5).

### 9.1 Overlay file

`capabilities/<capabilityId>/overlays/<appFamily>__<variant>__<tenantId>.json`

```ts
// src/artifact/overlay.ts
export const OverrideKindSchema = z.enum([
  "entrypoint_origin",     // a different allowlisted surface alias, never a raw URL
  "locator_candidate",     // add/replace a candidate for one step's target
  "string_matcher",        // a renamed label on an existing locator
  "step_enabled",          // disable a step that does not exist for this tenant
  "recoverable_enabled",   // enable/disable a declared recoverable
  "wait_budget",           // widen a timeout for a slower tenant
  "param_default",         // a tenant-specific default for a non-sensitive param
]);

export const OverlaySchema = z.object({
  schemaVersion: z.literal(1),
  overlayId:     z.string(),
  /** Drift is {tenant, version}, so the key is a triple. */
  appliesTo: z.object({
    capabilityId:      z.string(),
    baseContractHash:  z.string(),        // overlay is INVALID against a different contract
    appFamily:         z.string(),
    variant:           z.string(),        // branding/config variant of the vendor product
    tenantId:          z.string(),
    appVersionRange:   z.string(),
  }),
  status:   z.enum(["draft", "approved", "retired"]),
  approval: z.object({ approvedBy: z.string(), approvedAt: z.string().datetime() }).nullable(),
  /** A CLOSED list of typed patch ops. No JSON-merge, no arbitrary paths. */
  ops: z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("entrypoint_origin"), originAlias: z.string() }),  // must exist in policy.surfaces[]
    z.object({ kind: z.literal("locator_candidate"), stepId: z.string(), targetPath: z.enum(["action.target"]),
               rank: z.number().int(), locator: LocatorSchema, rationale: z.string().min(10) }),
    z.object({ kind: z.literal("string_matcher"), stepId: z.string(), candidateRank: z.number().int(),
               matcher: StringMatcherSchema }),
    z.object({ kind: z.literal("step_enabled"), stepId: z.string(), enabled: z.boolean() }),
    z.object({ kind: z.literal("recoverable_enabled"), recoverableId: z.string(), enabled: z.boolean() }),
    z.object({ kind: z.literal("wait_budget"), stepId: z.string(), timeoutMs: z.number().int().max(60_000) }),
    z.object({ kind: z.literal("param_default"), name: z.string(), value: z.string() }),
  ])).min(1),
  fingerprint: AppCompatSchema.shape.fingerprint.nullable(),   // this tenant's observed fingerprint
}).strict();
```

### 9.2 Application rules (normative)

1. Overlays are applied **explicitly** — `replay --overlay <path>` or an explicit resolver call. Never auto-discovered and merged.
2. `applyOverlay` refuses if `baseContractHash` differs, if any op's `kind` is absent from `base.overlayPolicy.allowedKinds`, or if `requireApproval` is set and the overlay is not `approved`.
3. An overlay **cannot** change the contract: no param/output/result-code/successCondition edits. If a tenant needs those, it needs its own capability version. This is what keeps `contractHash` meaningful across tenants.
4. The applied ops are recorded in the run result (`appliedOverlays: [{overlayId, opCount, digest}]`) so evidence shows exactly what ran.
5. Base is **pooled**, execution context is **siloed** per tenant — credentials, policy, evidence, run ids ([`_hitl_safety.md`](../research/_hitl_safety.md) §4.4, AWS silo/pool/bridge).

For this take-home, ship the *types* plus one worked overlay against the second MemberDesk tenant variant if and only if core evidence is green (G11); the schema costs nothing and substantiates the §3.7 story with a real artifact rather than prose.

---

## 10. Provenance

```ts
export const ProvenanceSchema = z.object({
  discoveryRunId:      z.string(),
  compilerVersion:     z.string(),
  recordedAt:          z.string().datetime(),
  sourceEvidenceDigest: z.string(),        // digest of the redacted journal this was compiled from
  targetFixtureRef:    z.string(),         // git tag/commit of the frozen target (KC-5 integrity)
  model: z.object({                        // provenance ONLY — never execution identity
    provider:       z.string(),            // "openai"
    requestedModel: z.string(),            // env DISCOVERY_MODEL
    reportedModel:  z.string(),            // what the API said it used
    promptDigest:   z.string(),
    toolSchemaDigest: z.string(),
  }),
  humanEdits: z.array(z.object({ at: z.string().datetime(), by: z.string(), summary: z.string() })),
}).strict();
```

The discovery model is recorded as provenance and **never** baked into replay behaviour ([`locked_stack.md`](../decisions/locked_stack.md); [`reviewer_pass_1.md`](../reviews/reviewer_pass_1.md) §2).

---

## 11. Policy binding

`policyRef: {id, digest}` — not a bare string. The digest makes the binding visible at review time, not only at run time ([`alternatives_and_frontier_review.md`](../reviews/alternatives_and_frontier_review.md) A5 "smaller items"). Replay records the *evaluated* policy digest in `result.json`; a mismatch between the artifact's `policyRef.digest` and the loaded policy is a `hard_failure` with code `policy_digest_mismatch` unless `--allow-policy-drift` is passed explicitly (and that flag is journaled).

The binding also resolves the entrypoint: `entrypoint.originAlias` is looked up in `policy.surfaces[].id` and refused with `UNKNOWN_ORIGIN_ALIAS` at load time if it is absent ([`safety_and_policy.md`](./safety_and_policy.md) §2). Since the artifact holds no literal origin, a capability cannot address a host the allowlist has not approved, moving between environments is a policy edit rather than an artifact edit (the `contractHash` is untouched), and the `entrypoint_origin` overlay op can only re-point a tenant at another already-allowlisted surface.

Because `steps[].risk` is data, a capability's risk profile is **statically inspectable before a run starts**: `inspect` prints the set of risk classes and the routes touched, which is the small legible diff a human approver reviews ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.1).

---

## 12. Worked example (abridged, MemberDesk savings-balance lookup)

```jsonc
{
  "schemaVersion": 1,
  "capabilityId": "memberdesk.savings_balance_lookup",
  "capabilityVersion": "1.0.0",
  "contractHash": "sha256:…",
  "status": "draft",
  "approval": null,
  "provenance": { "discoveryRunId": "disc_2026-08-16T18-02-11Z_7f3a", "compilerVersion": "0.1.0", "…": "…" },
  "surface": { "kind": "web", "backendHints": null },
  "app": {
    "vendorProduct": "memberdesk",
    "appVersionRange": "unknown",
    "fingerprint": { "algorithm": "landmark-digest-v1", "value": "sha256:…",
      "inputs": { "title": "MemberDesk — Member Search", "landmarks": [{ "role": "navigation", "name": "Main" }], "route": "/members" } },
    "onFingerprintMismatch": "escalate"
  },
  "contract": {
    "summary": "Look up a member by ID and return their current savings balance.",
    "params": [{ "name": "memberId", "type": "string", "required": true, "sensitivity": "internal",
                 "description": "Synthetic MemberDesk member identifier.",
                 "constraints": { "pattern": "^[0-9]{5}$", "minLength": 5, "maxLength": 5, "enum": null },
                 "exampleSynthetic": "12345" }],
    "outputs": [{ "name": "savingsBalance", "type": "currency", "nullable": false,
                  "sensitivity": "pii", "description": "Current savings balance for the member." }],
    "results": {
      "success": { "description": "Balance read from the account summary panel.", "outputs": ["savingsBalance"] },
      "businessOutcomes": [
        { "code": "member_not_found", "description": "No member exists for the supplied ID.", "outputs": [],
          "rationale": "A legitimate answer the calling agent needs; the ID was mistyped, not the system broken." },
        { "code": "no_savings_account", "description": "Member exists but holds no savings account.", "outputs": [],
          "rationale": "Expected business state; the caller must distinguish it from a zero balance." }
      ]
    },
    "successCondition": { "kind": "all", "of": [
      { "kind": "urlMatches", "pattern": "/members/:id/accounts" },
      { "kind": "elementVisible", "target": { "framePath": [{ "kind": "main" }, { "kind": "name", "name": "content" }],
        "candidates": [{ "rank": 1, "locator": { "kind": "role", "role": "region", "name": { "kind": "normalized", "value": "Account summary" }, "state": null },
          "rationale": "Landmark region is stable across MemberDesk tenant branding.",
          "evidence": { "matchCountAtRecord": 1, "uniqueWithinFrame": true, "observedRole": "region", "observedName": "Account summary" },
          "source": "compiler_promotion" }], "rejected": [] } }
    ] }
  },
  "entrypoint": { "originAlias": "memberdesk_local", "routePattern": "/members", "fromParams": [] },
  "steps": [
    {
      "id": "s01", "intent": "Type the member ID into the member search field.",
      "action": { "kind": "fill",
        "target": { "framePath": [{ "kind": "main" }, { "kind": "name", "name": "content" }],
          "candidates": [
            { "rank": 1, "locator": { "kind": "label", "text": { "kind": "normalized", "value": "Member ID" } },
              "rationale": "Explicit <label for> association survives the table-based layout.",
              "evidence": { "matchCountAtRecord": 1, "uniqueWithinFrame": true, "observedRole": "textbox", "observedName": "Member ID" },
              "source": "compiler_promotion" },
            { "rank": 2, "locator": { "kind": "role", "role": "textbox", "name": { "kind": "normalized", "value": "Member ID" }, "state": null },
              "rationale": "Role+name fallback if the label association is removed.",
              "evidence": { "matchCountAtRecord": 1, "uniqueWithinFrame": true, "observedRole": "textbox", "observedName": "Member ID" },
              "source": "compiler_promotion" },
            { "rank": 3, "locator": { "kind": "css", "selector": "form[name=search] input[name=mid]",
                "justification": "Structural last resort; name attributes are server-rendered and stable in this app." },
              "rationale": "Used only if both semantic candidates fail; emits a drift event when it succeeds.",
              "evidence": { "matchCountAtRecord": 1, "uniqueWithinFrame": true, "observedRole": null, "observedName": null },
              "source": "compiler_promotion" }],
          "rejected": [{ "kind": "css", "descriptor": "css: table tr:nth-child(3) td:nth-child(2) input",
                         "reason": "Positional; breaks when the layout table gains a row." }] },
        "value": { "kind": "param", "name": "memberId" } },
      "risk": "read",
      "preconditions": [{ "kind": "urlMatches", "pattern": "/members" }],
      "wait": { "kind": "elementStable", "timeoutMs": 5000 },
      "checkpoint": [{ "kind": "valueMatches", "target": { "…": "same target" }, "matcher": { "kind": "exact", "value": "{{memberId}}" } }],
      "extract": [], "outcomes": [], "recoverables": ["session_warning_interstitial"], "onUnmatched": "hard_failure"
    }
    // s02 submit search · s03 classify found/not-found · s04 open savings row · s05 read balance
  ],
  "knownRecoverables": [
    { "id": "session_warning_interstitial", "description": "\"Your session will expire soon — Continue?\" dialog.",
      "detect": { "kind": "elementVisible", "target": { "…": "role=dialog name=Session" } },
      "handle": { "kind": "click", "target": { "…": "role=button name=Continue" } },
      "maxAttempts": 2, "onExhausted": { "code": "interstitial_not_dismissable", "message": "Session dialog reappeared after 2 dismissals." } }
  ],
  "policyRef": { "id": "policy/memberdesk@1", "digest": "sha256:…" },
  "overlayPolicy": { "allowedKinds": ["entrypoint_origin", "string_matcher", "locator_candidate", "wait_budget"], "requireApproval": true }
}
```

---

## 13. Compiler pipeline (`src/artifact/compile.ts`)

```
redacted journal (JSONL)
  → filter to accepted actions (rejected proposals stay in evidence only)
  → for each action: promote observation-local ref → semantic candidates
        · read role/name/label/text/frame from the observation record
        · probe uniqueness against the recorded snapshot (matchCountAtRecord)
        · emit ranked candidates + rationale + rejected list
        · if no semantic candidate resolves uniquely → mark step uncompilable
  → derive params from model-proposed value bindings; attach sensitivity from policy defaults + review
  → derive outputs from extraction actions; attach parse + onMissing (defaults require review to leave draft)
  → hoist business-outcome codes observed/declared during discovery into contract.results
  → attach knownRecoverables from policy.recoverable_patterns actually exercised
  → compute fingerprint from the first observation of the entry route
  → synthesise provenance, policyRef digest, capabilityVersion (1.0.0 for a new capability)
  → compute contractHash
  → CapabilitySchema.parse(...)  → write canonical JSON
```

Uncompilable step ⇒ the capability is written with `status: "draft"` and a `compilation.unresolved[]` note in the discovery result, and `replay` refuses to run it in `--require-approved` mode. Never silently substitute a coordinate or a ref.

---

## 14. Tests that must exist (`test/artifact-*.test.ts`)

| Test | Asserts |
|---|---|
| round-trip | write → read → deep-equal; canonical JSON is byte-stable |
| unknown major | `schemaVersion: 2` refused with `UNSUPPORTED_SCHEMA_VERSION_NEWER` |
| migration | a v0 fixture upgrades to v1 and validates |
| contract hash stability | rationale/whitespace edits do not change it |
| contract hash sensitivity | param rename, output add, outcome-code add, `successCondition` change each change it |
| hand-edit detection | mutating a stored file without recomputing → `CONTRACT_HASH_MISMATCH` |
| ref/coordinate ban | a fixture containing `ref=e17` or a coordinate target fails validation |
| locator union | a target whose only candidate is `css` cannot reach `approved` |
| frame path | positional frame index is not representable (type-level + fixture test) |
| referential integrity | unresolved param ref, undeclared output, undeclared outcome code each fail |
| sensitivity | `exampleSynthetic` on a `secret` param fails; a captured value equal to a `pii` param fails |
| overlay | wrong `baseContractHash` refused; disallowed op kind refused; contract-changing op refused; an `entrypoint_origin` op carrying a raw URL instead of an alias refused |
| JSON Schema derivation | `toCallerJsonSchema()` validates a known-good invocation and rejects a bad one |
| inline secret | a `fill` bound to a literal whose sensitivity is not `public` fails validation |
| empty checkpoint | a step with `checkpoint: []` fails — success is asserted, never inferred |
| kind enum exhaustiveness | `LocatorKindSchema` and `Locator["kind"]` stay in sync (type-level, §8.1) |
| module init | importing `schema.ts` throws no `ReferenceError` — guards the declaration order in §2.1 |
| worked example | the §12 fixture, expanded to its unabridged form, parses under `CapabilitySchema` |

---

## 15. Do / don't

**Do**

- Derive JSON Schema from `params`/`outputs`; keep it in the file for the caller, but never as the source of truth.
- Force a `rationale` on every locator candidate — the field is what turns §3.2's "with your reasoning about robustness" from prose into data.
- Record `rejected` locators. Reviewers read them, and they are cheap.
- Keep `steps[].risk` accurate at record time; policy re-checks it at replay time but does not infer it from button text ([`_hitl_safety.md`](../research/_hitl_safety.md) §2.2).
- Keep the whole file readable in a diff: stable key order, one step per block, no minification.

**Don't**

- Don't let the model emit the artifact. Strict structured outputs forbid optional fields and root-level `anyOf` anyway; ask for a flat proposal and synthesise ([`tech_stack.md`](../research/tech_stack.md) §7.2).
- Don't add a `coordinate` or `ref` locator kind "just for the fallback".
- Don't put tenant deltas in the base file.
- Don't use whole-page ARIA snapshots as checkpoints.
- Don't make `draft → approved` load-bearing for core safety: risky actions block or confirm regardless of approval state ([`reviewer_pass_2.md`](../reviews/reviewer_pass_2.md) §4.1 conflation D).
- Don't store balances, names, or any captured value in the artifact — only parameter names, types, and synthetic examples.
