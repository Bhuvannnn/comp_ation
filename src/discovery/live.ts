import OpenAI from "openai";
import type { Surface } from "../surface/types.ts";
import type { EvidenceWriter } from "../evidence/writer.ts";
import { readFileSync } from "node:fs";
import { compileCapabilityFromJournal, durableSemanticName, writeCapability } from "../artifact/compile.ts";
import { join } from "node:path";

/** Chat Completions tools — works on OpenAI, Groq, Ollama, and other OpenAI-compatible APIs. */
const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
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
  },
];

const INSTRUCTIONS =
  "You operate MemberDesk through tools. Prefer accessible names (Member ID, Look up, Savings balance). " +
  "Never request secrets. One action per act() call: fill the Member ID from the goal, click Look up, extract the savings balance, then call done.";

type ToolArgs = {
  kind?: string;
  name?: string;
  role?: string;
  value?: string;
  url?: string;
  rationale?: string;
  outcome?: string;
  notes?: string;
};

function discoveryClient(): OpenAI {
  const baseURL = process.env.OPENAI_BASE_URL;
  const key = process.env.OPENAI_API_KEY ?? (baseURL ? "ollama" : undefined);
  if (!key) throw new Error("OPENAI_API_KEY is required for live discovery (or set OPENAI_BASE_URL for a local/OpenAI-compatible server)");
  return new OpenAI({ apiKey: key, baseURL: baseURL || undefined });
}

export async function runLiveDiscovery(
  surface: Surface,
  evidence: EvidenceWriter,
  goal: string,
  originBase: string,
): Promise<{ capabilityPath: string }> {
  const model = process.env.DISCOVERY_MODEL ?? "gpt-5.6-terra";
  const maxUsd = Number(process.env.DISCOVERY_MAX_USD ?? "2");
  const baseURL = process.env.OPENAI_BASE_URL;
  const local = Boolean(baseURL?.includes("127.0.0.1") || baseURL?.includes("localhost"));
  const client = discoveryClient();
  evidence.event({ type: "discover_start", mode: "live", model, goal, baseURL: baseURL ?? "openai" });

  const entryUrl = `${originBase}/`;
  evidence.event({ type: "act", kind: "navigate", url: entryUrl });
  await surface.act({ kind: "navigate", url: entryUrl });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: INSTRUCTIONS }];
  let spentUsd = 0;
  let done = false;

  for (let step = 0; step < 12 && !done; step++) {
    const obs = await surface.observe();
    evidence.event({ type: "observe", step, url: obs.url, ariaChars: obs.ariaSnapshot.length });
    messages.push({
      role: "user",
      content: `${step === 0 ? `Goal: ${goal}\n` : ""}URL: ${obs.url}\nARIA:\n${obs.ariaSnapshot.slice(0, 6000)}\nTEXT:\n${obs.text.slice(0, 2000)}`,
    });

    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages,
      tools: TOOLS,
      ...(local ? {} : { tool_choice: "required" as const }),
    });

    const tokens = response.usage?.total_tokens ?? 0;
    if (!local) {
      spentUsd += tokens * 0.00002;
      evidence.event({ type: "model_usage", step, tokens, spentUsd: Number(spentUsd.toFixed(6)) });
      if (spentUsd > maxUsd) throw new Error("DISCOVERY_SPEND_CAP");
    } else {
      evidence.event({ type: "model_usage", step, tokens, spentUsd: 0 });
    }

    const msg = response.choices[0]?.message;
    const call = msg?.tool_calls?.[0];
    if (!msg || !call || call.type !== "function") {
      evidence.event({ type: "model_no_tool", step, content: msg?.content?.slice(0, 200) });
      break;
    }

    messages.push({
      role: "assistant",
      content: msg.content,
      tool_calls: msg.tool_calls,
    });

    let args: ToolArgs = {};
    try {
      args = JSON.parse(call.function.arguments || "{}") as ToolArgs;
    } catch {
      evidence.event({ type: "model_tool_parse_error", step, name: call.function.name });
      break;
    }

    evidence.event({
      type: "model_tool",
      step,
      name: call.function.name,
      kind: args.kind,
      targetName: durableSemanticName(args.name) ?? args.name,
      rationale: args.rationale,
      outcome: args.outcome,
    });

    if (call.function.name === "done") {
      done = true;
      evidence.event({ type: "discover_done", outcome: args.outcome, notes: args.notes });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ ok: true, outcome: args.outcome }),
      });
      break;
    }

    const targetName = durableSemanticName(args.name);
    if (args.kind && args.kind !== "navigate") {
      evidence.event({
        type: "act",
        kind: args.kind,
        url: args.url,
        target: targetName
          ? { kind: "semantic", role: args.role, name: targetName }
          : undefined,
        valueKind: args.kind === "fill" ? "param" : undefined,
        paramName: args.kind === "fill" && /member\s*id/i.test(targetName ?? "") ? "memberId" : undefined,
      });
    } else if (args.kind === "navigate") {
      evidence.event({ type: "act", kind: "navigate", url: args.url });
    }

    const result = await surface.act({
      kind: (args.kind as "click") ?? "click",
      url: args.url,
      value: args.value,
      rationale: args.rationale,
      target: targetName
        ? { candidates: [{ kind: "semantic", role: args.role, name: targetName }] }
        : undefined,
    });
    evidence.event({
      type: "act_result",
      step,
      ok: result.ok,
      code: result.code,
      extracted: result.extracted,
    });
    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify({ ok: result.ok, code: result.code, extracted: result.extracted }),
    });
  }

  const cap = compileCapabilityFromJournal(readFileSync(evidence.journalPath, "utf8"));
  const capabilityPath = join(evidence.dir, "capability.json");
  writeCapability(capabilityPath, cap);
  evidence.event({ type: "artifact_written", path: "capability.json", note: "compiled durable locators; refs discarded" });
  return { capabilityPath };
}
