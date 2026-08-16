import { createHash } from "node:crypto";
import { z } from "zod";

export const CAPABILITY_SCHEMA_VERSION = 1 as const;

export const SensitivitySchema = z.enum(["public", "internal", "pii", "secret"]);

export const SemanticLocatorSchema = z.object({
  kind: z.literal("semantic"),
  role: z.string().optional(),
  name: z.string().optional(),
  label: z.string().optional(),
  text: z.string().optional(),
  nth: z.number().int().optional(),
});

export const CssLocatorSchema = z.object({
  kind: z.literal("css"),
  selector: z.string(),
  justification: z.string().min(8),
});

export const LocatorSchema = z.discriminatedUnion("kind", [
  SemanticLocatorSchema,
  CssLocatorSchema,
]);

export const RankedTargetSchema = z.object({
  framePath: z.array(z.string()).optional(),
  candidates: z.array(LocatorSchema).min(1),
});

export const AssertionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("urlMatches"), pattern: z.string() }),
  z.object({ kind: z.literal("textMatches"), needle: z.string() }),
  z.object({ kind: z.literal("elementVisible"), target: RankedTargetSchema }),
]);

export const ValueRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("param"), name: z.string() }),
  z.object({ kind: z.literal("literal"), value: z.string(), sensitivity: z.literal("public") }),
]);

export const StepSchema = z.object({
  id: z.string(),
  action: z.enum(["navigate", "click", "fill", "extract", "wait", "dismiss", "read"]),
  target: RankedTargetSchema.optional(),
  url: z.string().optional(),
  value: ValueRefSchema.optional(),
  extract: z
    .object({
      outputName: z.string(),
      from: z.enum(["text", "aria"]),
      pattern: z.string().optional(),
    })
    .optional(),
  checkpoint: AssertionSchema.optional(),
  expectedBusinessOutcome: z.string().optional(),
  on: z
    .array(
      z.object({
        detect: AssertionSchema,
        outcome: z.enum(["business_outcome", "recoverable", "continue"]),
        code: z.string().optional(),
        recoverableId: z.string().optional(),
      }),
    )
    .optional(),
});

export const ParamSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "integer", "number", "boolean"]),
  required: z.boolean(),
  sensitivity: SensitivitySchema,
  description: z.string().min(1),
  exampleSynthetic: z.string().nullable().optional(),
});

export const OutputSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "currency"]),
  nullable: z.boolean(),
  sensitivity: SensitivitySchema,
  description: z.string().min(1),
});

export const CapabilitySchema = z.object({
  schemaVersion: z.literal(CAPABILITY_SCHEMA_VERSION),
  capabilityId: z.string(),
  capabilityVersion: z.string(),
  contractHash: z.string(),
  status: z.enum(["draft", "approved", "retired"]),
  provenance: z.object({
    recordedAt: z.string(),
    source: z.enum(["discovery", "handwritten_fixture"]),
    notes: z.string().optional(),
  }),
  surface: z.object({
    kind: z.enum(["web", "electron", "os_desktop"]),
    binding: z.literal("playwright-chromium"),
  }),
  app: z.object({
    family: z.string(),
    variant: z.string(),
  }),
  contract: z.object({
    summary: z.string().min(10),
    params: z.array(ParamSchema),
    outputs: z.array(OutputSchema),
    results: z.object({
      success: z.object({ description: z.string(), outputs: z.array(z.string()) }),
      businessOutcomes: z.array(
        z.object({
          code: z.string(),
          description: z.string(),
          outputs: z.array(z.string()),
          rationale: z.string(),
        }),
      ),
    }),
    successCondition: AssertionSchema,
  }),
  entrypoint: z.object({
    originAlias: z.literal("memberdesk"),
    path: z.string(),
  }),
  steps: z.array(StepSchema).min(1),
  knownRecoverables: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      detect: AssertionSchema,
      handle: z.enum(["dismiss", "wait"]),
      maxAttempts: z.number().int().min(1).max(3),
    }),
  ),
  policyRef: z.object({
    id: z.string(),
  }),
});

export type Capability = z.infer<typeof CapabilitySchema>;
export type Assertion = z.infer<typeof AssertionSchema>;
export type Step = z.infer<typeof StepSchema>;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function computeContractHash(c: Omit<Capability, "contractHash"> | Capability): string {
  const surface = {
    capabilityId: c.capabilityId,
    summary: c.contract.summary,
    params: c.contract.params.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required,
      sensitivity: p.sensitivity,
    })),
    outputs: c.contract.outputs.map((o) => ({ name: o.name, type: o.type, nullable: o.nullable })),
    results: c.contract.results.businessOutcomes.map((b) => b.code).sort(),
    successCondition: c.contract.successCondition,
  };
  return `sha256:${createHash("sha256").update(canonicalJson(surface)).digest("hex")}`;
}

export function parseCapability(raw: unknown): Capability {
  const parsed = CapabilitySchema.parse(raw);
  const expected = computeContractHash(parsed);
  if (parsed.contractHash !== expected) {
    throw new Error(`CONTRACT_HASH_MISMATCH expected ${expected}`);
  }
  return parsed;
}

export function validateCapabilityObject(raw: unknown): Capability {
  return parseCapability(raw);
}
