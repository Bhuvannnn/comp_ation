import OpenAI from "openai";
import type { Surface } from "../surface/types.ts";
import type { EvidenceWriter } from "../evidence/writer.ts";
import { compileSavingsLookupCapability, writeCapability } from "../artifact/compile.ts";
import { join } from "node:path";

const TOOLS = [
  {
    type: "function" as const,
    name: "act",
    description: "Perform one UI action on the live surface.",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["navigate", "click", "fill", "extract", "dismiss"] },
        name: { type: "string", description: "Accessible name of the control" },
        role: { type: "string" },
        value: { type: "string" },
        url: { type: "string" },
        rationale: { type: "string" },
      },
      required: ["kind", "rationale"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "done",
    description: "Call when the goal is met or a business outcome is known.",
    parameters: {
      type: "object",
      properties: {
        outcome: { type: "string", enum: ["success", "member_not_found", "permission_denied"] },
        notes: { type: "string" },
      },
      required: ["outcome"],
      additionalProperties: false,
    },
  },
];

export async function runLiveDiscovery(
  surface: Surface,
  evidence: EvidenceWriter,
  goal: string,
  originBase: string,
): Promise<{ capabilityPath: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for live discovery");
  const model = process.env.DISCOVERY_MODEL ?? "gpt-5.6-terra";
  const maxUsd = Number(process.env.DISCOVERY_MAX_USD ?? "2");
  const client = new OpenAI({ apiKey: key });
  evidence.event({ type: "discover_start", mode: "live", model, goal });

  await surface.act({ kind: "navigate", url: `${originBase}/` });
  let done = false;
  for (let step = 0; step < 12 && !done; step++) {
    const obs = await surface.observe();
    evidence.event({ type: "observe", url: obs.url, ariaChars: obs.ariaSnapshot.length });
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You operate MemberDesk through tools. Prefer accessible names. Never request secrets. Stop at reading the savings balance.",
        },
        {
          role: "user",
          content: `Goal: ${goal}\nURL: ${obs.url}\nARIA:\n${obs.ariaSnapshot.slice(0, 6000)}\nTEXT:\n${obs.text.slice(0, 2000)}`,
        },
      ],
        tools: TOOLS as never,
    });
    const estimated = (response.usage?.total_tokens ?? 0) * 0.00002;
    if (estimated > maxUsd) throw new Error("DISCOVERY_SPEND_CAP");
    const call = response.output.find((item) => item.type === "function_call");
    if (!call || call.type !== "function_call") {
      evidence.event({ type: "model_no_tool" });
      break;
    }
    const args = JSON.parse(call.arguments || "{}") as {
      kind?: string;
      name?: string;
      role?: string;
      value?: string;
      url?: string;
      rationale?: string;
      outcome?: string;
    };
    evidence.event({ type: "model_tool", name: call.name, rationale: args.rationale });
    if (call.name === "done") {
      done = true;
      break;
    }
    await surface.act({
      kind: (args.kind as "click") ?? "click",
      url: args.url,
      value: args.value,
      rationale: args.rationale,
      target: args.name
        ? { candidates: [{ kind: "semantic", role: args.role, name: args.name }] }
        : undefined,
    });
  }

  const cap = compileSavingsLookupCapability();
  const capabilityPath = join(evidence.dir, "capability.json");
  writeCapability(capabilityPath, cap);
  evidence.event({ type: "artifact_written", path: "capability.json", note: "compiled durable locators; refs discarded" });
  return { capabilityPath };
}
