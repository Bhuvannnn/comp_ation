import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Surface } from "../surface/types.ts";
import type { EvidenceWriter } from "../evidence/writer.ts";
import { compileCapabilityFromJournal, writeCapability } from "../artifact/compile.ts";
import type { TerminalResult } from "../replay/interpreter.ts";

const MOCK_GOAL = "Look up member 12345 and read their current savings balance";

function memberIdFromGoal(goal: string): string {
  if (goal.includes("00000")) return "00000";
  if (goal.includes("99999")) return "99999";
  return goal.match(/\b\d{5}\b/)?.[0] ?? "12345";
}

function resultFromObservation(text: string, extracted?: Record<string, string>): TerminalResult {
  if (text.includes("No such member")) {
    return { kind: "business_outcome", code: "member_not_found", outputs: {} };
  }
  if (text.includes("Access denied")) {
    return { kind: "business_outcome", code: "permission_denied", outputs: {} };
  }
  if (extracted?.savingsBalance) {
    return { kind: "success", outputs: extracted };
  }
  return {
    kind: "hard_failure",
    stepId: "read_balance",
    code: "extract_failed",
    expected: "savingsBalance",
    observed: text.slice(0, 200),
  };
}

export async function runMockDiscovery(
  surface: Surface,
  evidence: EvidenceWriter,
  goal: string,
  originBase = "http://127.0.0.1:4173",
): Promise<{ result: TerminalResult; capabilityPath: string }> {
  evidence.event({ type: "discover_start", mode: "mock", goal });
  const memberId = memberIdFromGoal(goal);
  const acts = [
    {
      kind: "navigate" as const,
      url: `${originBase}/`,
    },
    {
      kind: "fill" as const,
      target: { candidates: [{ kind: "semantic" as const, role: "textbox", name: "Member ID" }] },
      value: memberId,
      paramName: "memberId",
    },
    {
      kind: "click" as const,
      target: { candidates: [{ kind: "semantic" as const, role: "button", name: "Look up" }] },
    },
    {
      kind: "extract" as const,
      target: { candidates: [{ kind: "semantic" as const, role: "status", name: "Savings balance" }] },
    },
  ];

  let extracted: Record<string, string> | undefined;
  for (const act of acts) {
    const locator = act.target?.candidates[0];
    evidence.event({
      type: "act",
      kind: act.kind,
      url: "url" in act ? act.url : undefined,
      target: locator,
      valueKind: act.kind === "fill" ? "param" : undefined,
      paramName: "paramName" in act ? act.paramName : undefined,
    });
    const result = await surface.act({
      kind: act.kind,
      url: "url" in act ? act.url : undefined,
      target: act.target,
      value: "value" in act ? act.value : undefined,
    });
    evidence.event({
      type: "act_result",
      ok: result.ok,
      code: result.code,
      extracted: result.extracted,
    });
    if (result.extracted) extracted = result.extracted;
  }

  const cap = compileCapabilityFromJournal(readFileSync(evidence.journalPath, "utf8"));
  const capabilityPath = join(evidence.dir, "capability.json");
  writeCapability(capabilityPath, cap);
  evidence.event({ type: "artifact_written", path: "capability.json", note: "compiled durable locators; refs discarded" });

  const obs = await surface.observe();
  return { result: resultFromObservation(obs.text, extracted), capabilityPath };
}

export { MOCK_GOAL };
