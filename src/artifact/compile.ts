import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeContractHash,
  parseCapability,
  type Capability,
  type Step,
  CAPABILITY_SCHEMA_VERSION,
} from "./schema.ts";

const SAMPLE_LIVE_JOURNAL = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../evidence/sample/discovery-live.run.jsonl",
);

const REF_TOKEN = /\[ref=e\d+\]|ref=e\d+/gi;

export type JournalEvent = {
  type: string;
  at?: string;
  mode?: string;
  goal?: string;
  kind?: string;
  name?: string;
  targetName?: string;
  role?: string;
  url?: string;
  target?: {
    kind?: string;
    role?: string;
    name?: string;
    text?: string;
    label?: string;
    selector?: string;
  };
  valueKind?: string;
  paramName?: string;
  extracted?: Record<string, string>;
};

type TrajectoryAct = {
  kind: string;
  url?: string;
  role?: string;
  name?: string;
  paramName?: string;
  extracted?: Record<string, string>;
};

/** Drop Playwright ARIA `ref=eN` tokens; those are per-observation, not locator identity. */
export function durableSemanticName(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(REF_TOKEN, "").replace(/\s+/g, " ").trim();
  if (!cleaned || /^e\d+$/i.test(cleaned)) return undefined;
  return cleaned;
}

export function parseJournal(jsonl: string): JournalEvent[] {
  return jsonl
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as JournalEvent);
}

function toParamName(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const joined = parts
    .map((part, i) => {
      const lower = part.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!lower) return "";
      return i === 0 ? lower : lower[0].toUpperCase() + lower.slice(1);
    })
    .join("");
  return joined || "value";
}

function inferRole(kind: string, name?: string): string | undefined {
  if (kind === "fill") return "textbox";
  if (kind === "click" || kind === "dismiss") return "button";
  if (kind === "extract" || kind === "read") {
    if (name && /balance|status/i.test(name)) return "status";
    return "status";
  }
  return undefined;
}

function inferParamName(name?: string): string | undefined {
  if (!name) return undefined;
  if (/member\s*id/i.test(name)) return "memberId";
  return toParamName(name);
}

function inferOutputName(name?: string, extracted?: Record<string, string>): string {
  if (extracted?.savingsBalance || (name && /savings|balance/i.test(name))) return "savingsBalance";
  if (extracted) {
    const key = Object.keys(extracted)[0];
    if (key) return key;
  }
  return name ? toParamName(name) : "value";
}

function isLookupTrajectory(acts: TrajectoryAct[]): boolean {
  return acts.some((a) => a.kind === "fill" && /member\s*id/i.test(a.name ?? "")) &&
    acts.some((a) => a.kind === "click" && /look\s*up/i.test(a.name ?? ""));
}

function lookupBranches(): NonNullable<Step["on"]> {
  return [
    {
      detect: { kind: "textMatches", needle: "No such member" },
      outcome: "business_outcome",
      code: "member_not_found",
    },
    {
      detect: { kind: "textMatches", needle: "Access denied" },
      outcome: "business_outcome",
      code: "permission_denied",
    },
    {
      detect: { kind: "textMatches", needle: "Session notice" },
      outcome: "recoverable",
      recoverableId: "session_notice",
    },
  ];
}

function knownStepId(act: TrajectoryAct, index: number): string {
  if (act.kind === "navigate") return "open";
  if (act.kind === "fill" && /member\s*id/i.test(act.name ?? "")) return "fill_id";
  if (act.kind === "click" && /look\s*up/i.test(act.name ?? "")) return "submit_search";
  if (act.kind === "extract" && /savings|balance/i.test(act.name ?? "")) return "read_balance";
  return `${act.kind}_${index}`;
}

function trajectoryFromJournal(events: JournalEvent[]): TrajectoryAct[] {
  const preferExplicitActs = events.some((e) => e.type === "act");
  const acts: TrajectoryAct[] = [];
  let pending: TrajectoryAct | null = null;

  const flush = () => {
    if (pending) acts.push(pending);
    pending = null;
  };

  for (const event of events) {
    const isExplicitAct = event.type === "act" && event.kind;
    const isModelAct = event.type === "model_tool" && event.name === "act" && Boolean(event.kind);
    if ((preferExplicitActs && isExplicitAct) || (!preferExplicitActs && isModelAct)) {
      flush();
      const name = durableSemanticName(event.target?.name ?? event.targetName);
      pending = {
        kind: event.kind as string,
        url: event.url,
        role: event.target?.role ?? event.role,
        name,
        paramName: event.paramName ?? (event.kind === "fill" ? inferParamName(name) : undefined),
      };
      continue;
    }
    if (event.type === "act_result" && pending && event.extracted) {
      pending.extracted = event.extracted;
    }
  }
  flush();

  const hasNavigate = acts.some((a) => a.kind === "navigate");
  if (!hasNavigate) {
    const firstObserve = events.find((e) => e.type === "observe" && typeof e.url === "string");
    if (firstObserve?.url) {
      acts.unshift({ kind: "navigate", url: firstObserve.url });
    }
  }
  return acts;
}

function stepFromAct(act: TrajectoryAct, index: number, lookup: boolean): Step {
  const id = knownStepId(act, index);
  if (act.kind === "navigate") {
    return {
      id,
      action: "navigate",
      url: act.url,
      checkpoint: { kind: "textMatches", needle: "MemberDesk" },
    };
  }

  const name = act.name;
  if (!name) {
    throw new Error(`COMPILE_NO_SEMANTIC_LOCATOR step=${id} kind=${act.kind}`);
  }
  const role = act.role ?? inferRole(act.kind, name);
  const target = { candidates: [{ kind: "semantic" as const, role, name }] };

  if (act.kind === "fill") {
    const paramName = act.paramName ?? inferParamName(name) ?? "value";
    return {
      id,
      action: "fill",
      target,
      value: { kind: "param", name: paramName },
    };
  }

  if (act.kind === "click" || act.kind === "dismiss") {
    const step: Step = { id, action: act.kind === "dismiss" ? "dismiss" : "click", target };
    if (lookup && /look\s*up/i.test(name)) {
      step.on = lookupBranches();
    }
    return step;
  }

  if (act.kind === "extract" || act.kind === "read") {
    const outputName = inferOutputName(name, act.extracted);
    const currency = Boolean(act.extracted?.[outputName]?.match(/\$[0-9,]+\.\d{2}/) || outputName === "savingsBalance");
    return {
      id,
      action: "extract",
      target,
      extract: {
        outputName,
        from: "text",
        pattern: currency ? "\\$[0-9,]+\\.\\d{2}" : undefined,
      },
      checkpoint: { kind: "textMatches", needle: name },
    };
  }

  if (act.kind === "wait") {
    return { id, action: "wait" };
  }

  throw new Error(`COMPILE_UNSUPPORTED_ACTION kind=${act.kind}`);
}

/**
 * Turn a discovery JSONL journal into a reviewable capability.
 * Steps and locators come from the trajectory; MemberDesk lookup outcomes are a
 * contract overlay (a single happy-path recording cannot enumerate every legitimate result).
 */
export function compileCapabilityFromJournal(jsonl: string): Capability {
  const events = parseJournal(jsonl);
  if (events.length === 0) throw new Error("COMPILE_EMPTY_JOURNAL");

  const start = events.find((e) => e.type === "discover_start");
  const acts = trajectoryFromJournal(events).filter((a) =>
    ["navigate", "click", "fill", "extract", "wait", "dismiss", "read"].includes(a.kind),
  );
  if (acts.length === 0) throw new Error("COMPILE_EMPTY_TRAJECTORY");

  const lookup = isLookupTrajectory(acts);
  const steps = acts.map((act, i) => stepFromAct(act, i, lookup));
  if (JSON.stringify(steps).includes("ref=e")) {
    throw new Error("COMPILE_EPHEMERAL_REF");
  }

  const params = steps
    .filter((s) => s.action === "fill" && s.value?.kind === "param")
    .map((s) => {
      const name = s.value && s.value.kind === "param" ? s.value.name : "value";
      const member = name === "memberId";
      return {
        name,
        type: "string" as const,
        required: true,
        sensitivity: "internal" as const,
        description: member
          ? "Synthetic five-digit member identifier."
          : `Value typed into ${s.target?.candidates[0] && s.target.candidates[0].kind === "semantic" ? s.target.candidates[0].name : name}.`,
        exampleSynthetic: member ? "12345" : null,
      };
    });

  const outputs = steps
    .filter((s) => s.extract)
    .map((s) => {
      const name = s.extract?.outputName ?? "value";
      const currency = name === "savingsBalance";
      return {
        name,
        type: (currency ? "currency" : "string") as "currency" | "string",
        nullable: true,
        sensitivity: "internal" as const,
        description: currency
          ? "Displayed savings balance when the member exists."
          : `Text extracted from ${s.target?.candidates[0] && s.target.candidates[0].kind === "semantic" ? s.target.candidates[0].name : name}.`,
      };
    });

  const extractStep = steps.find((s) => s.extract);
  const extractName = outputs[0]?.name;
  const successNeedle =
    extractStep?.checkpoint?.kind === "textMatches"
      ? extractStep.checkpoint.needle
      : lookup
        ? "Savings balance"
        : "MemberDesk";
  const goal = start?.goal ?? "Look up a synthetic member and return the displayed savings balance.";
  const recordedAt = start?.at ?? new Date().toISOString();

  const draft: Omit<Capability, "contractHash"> = {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    capabilityId: lookup ? "memberdesk.savings_balance_lookup" : "memberdesk.discovered",
    capabilityVersion: "1.0.0",
    status: "draft",
    provenance: {
      recordedAt,
      source: "discovery",
      notes: "Compiled from the discovery journal; ephemeral ARIA refs discarded.",
    },
    surface: { kind: "web", binding: "playwright-chromium" },
    app: { family: "memberdesk", variant: "local-v1" },
    contract: {
      summary: lookup
        ? "Look up a synthetic member and return the displayed savings balance."
        : goal.slice(0, 200),
      params,
      outputs,
      results: {
        success: {
          description: lookup ? "Member found and balance extracted." : "Recorded success condition was met.",
          outputs: extractName ? [extractName] : [],
        },
        businessOutcomes: lookup
          ? [
              {
                code: "member_not_found",
                description: "Search completed; MemberDesk reported no such member.",
                outputs: [],
                rationale: "A valid lookup with an unknown id is a domain result, not an automation crash.",
              },
              {
                code: "permission_denied",
                description: "Operator is not allowed to view this member.",
                outputs: [],
                rationale: "Access denial is a legitimate servicing outcome.",
              },
            ]
          : [],
      },
      successCondition: { kind: "textMatches", needle: successNeedle },
    },
    entrypoint: { originAlias: "memberdesk", path: "/" },
    steps,
    knownRecoverables: lookup
      ? [
          {
            id: "session_notice",
            description: "Dismiss the known interstitial before continuing.",
            detect: { kind: "textMatches", needle: "Session notice" },
            handle: "dismiss",
            maxAttempts: 1,
          },
        ]
      : [],
    policyRef: { id: "policy/memberdesk@1" },
  };

  const cap: Capability = { ...draft, contractHash: computeContractHash(draft) };
  return parseCapability(cap);
}

/** Compile the committed live discovery journal (used by replay tests). */
export function compileSavingsLookupCapability(): Capability {
  return compileCapabilityFromJournal(readFileSync(SAMPLE_LIVE_JOURNAL, "utf8"));
}

export function writeCapability(path: string, cap: Capability): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cap, null, 2)}\n`);
}
