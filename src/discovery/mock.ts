import type { Surface } from "../surface/types.ts";
import type { EvidenceWriter } from "../evidence/writer.ts";
import { compileSavingsLookupCapability, writeCapability } from "../artifact/compile.ts";
import { replayCapability, type TerminalResult } from "../replay/interpreter.ts";
import { join } from "node:path";

const MOCK_GOAL = "Look up member 12345 and read their current savings balance";

export async function runMockDiscovery(
  surface: Surface,
  evidence: EvidenceWriter,
  goal: string,
  originBase = "http://127.0.0.1:4173",
): Promise<{ result: TerminalResult; capabilityPath: string }> {
  evidence.event({ type: "discover_start", mode: "mock", goal });
  const cap = compileSavingsLookupCapability();
  const params = { memberId: goal.includes("00000") ? "00000" : "12345" };
  const result = await replayCapability(surface, cap, params, evidence, originBase);
  const capabilityPath = join(evidence.dir, "capability.json");
  if (result.kind === "success" || result.kind === "business_outcome") {
    writeCapability(capabilityPath, cap);
    evidence.event({ type: "artifact_written", path: "capability.json" });
  }
  return { result, capabilityPath };
}

export { MOCK_GOAL };
