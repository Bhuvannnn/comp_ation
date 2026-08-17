import type { ActionRequest, Observation, Surface } from "../surface/types.ts";
import type { Assertion, Capability, Step } from "../artifact/schema.ts";
import type { EvidenceWriter } from "../evidence/writer.ts";

export type TerminalResult =
  | { kind: "success"; outputs: Record<string, string> }
  | { kind: "business_outcome"; code: string; outputs: Record<string, string> }
  | { kind: "hard_failure"; stepId: string | null; code: string; expected: string; observed: string }
  | { kind: "escalated"; interventionId: string; reason: string };

function matches(obs: Observation, assertion: Assertion): boolean {
  if (assertion.kind === "urlMatches") return new RegExp(assertion.pattern).test(obs.url);
  if (assertion.kind === "textMatches") {
    return obs.text.includes(assertion.needle) || obs.ariaSnapshot.includes(assertion.needle);
  }
  if (assertion.kind === "elementVisible") {
    const c = assertion.target.candidates[0];
    const needle =
      c.kind === "semantic" ? (c.name ?? c.text ?? c.label ?? "") : c.selector;
    return obs.text.includes(needle) || obs.ariaSnapshot.includes(needle);
  }
  return false;
}

function resolveValue(
  step: Step,
  params: Record<string, string>,
): string | undefined {
  if (!step.value) return undefined;
  if (step.value.kind === "param") return params[step.value.name];
  return step.value.value;
}

export type ReplayOptions = {
  /** Evidence label: FakeSurface vs Playwright MemberDesk. */
  mode?: "fake" | "live-browser";
};

export async function replayCapability(
  surface: Surface,
  capability: Capability,
  params: Record<string, string>,
  evidence: EvidenceWriter,
  originBase = "http://127.0.0.1:4173",
  options: ReplayOptions = {},
): Promise<TerminalResult> {
  evidence.event({
    type: "replay_start",
    capabilityId: capability.capabilityId,
    params: { memberId: "[id]" },
    mode: options.mode ?? "fake",
  });
  const outputs: Record<string, string> = {};
  let recoveries = 0;

  for (const step of capability.steps) {
    const req: ActionRequest = {
      kind: step.action,
      target: step.target,
      url: step.url?.replace("http://127.0.0.1:4173", originBase),
      value: resolveValue(step, params),
    };
    evidence.event({ type: "replay_step", stepId: step.id, action: step.action });
    const acted = await surface.act(req);
    if (!acted.ok) {
      if (acted.code === "policy_escalate") {
        return { kind: "escalated", interventionId: "policy", reason: acted.message ?? "risky" };
      }
      return {
        kind: "hard_failure",
        stepId: step.id,
        code: acted.code ?? "act_failed",
        expected: step.action,
        observed: acted.message ?? "action failed",
      };
    }
    if (acted.extracted) Object.assign(outputs, acted.extracted);
    const obs = await surface.observe();

    if (step.on) {
      for (const branch of step.on) {
        if (!matches(obs, branch.detect)) continue;
        if (branch.outcome === "business_outcome") {
          evidence.event({ type: "business_outcome", code: branch.code, stepId: step.id });
          return { kind: "business_outcome", code: branch.code ?? "unknown", outputs };
        }
        if (branch.outcome === "recoverable") {
          const rec = capability.knownRecoverables.find((r) => r.id === branch.recoverableId);
          recoveries += 1;
          evidence.event({ type: "recovered", recoverableId: rec?.id, stepId: step.id });
          if (rec?.handle === "dismiss") {
            await surface.act({
              kind: "dismiss",
              target: { candidates: [{ kind: "semantic", role: "button", name: "Dismiss" }] },
            });
          }
          if (recoveries > (rec?.maxAttempts ?? 1)) {
            return {
              kind: "hard_failure",
              stepId: step.id,
              code: "recovery_exhausted",
              expected: rec?.id ?? "recoverable",
              observed: obs.text.slice(0, 120),
            };
          }
        }
      }
    }

    if (step.extract) {
      const text = obs.text;
      const re = step.extract.pattern ? new RegExp(step.extract.pattern) : null;
      const m = re ? text.match(re) : null;
      outputs[step.extract.outputName] = m?.[0] ?? acted.extracted?.[step.extract.outputName] ?? "";
    }

    if (step.checkpoint && !matches(obs, step.checkpoint) && !step.on) {
      return {
        kind: "hard_failure",
        stepId: step.id,
        code: "checkpoint_failed",
        expected: JSON.stringify(step.checkpoint),
        observed: obs.text.slice(0, 200),
      };
    }
  }

  const finalObs = await surface.observe();
  if (!matches(finalObs, capability.contract.successCondition)) {
    if (finalObs.text.includes("No such member")) {
      return { kind: "business_outcome", code: "member_not_found", outputs };
    }
    return {
      kind: "hard_failure",
      stepId: null,
      code: "success_condition_failed",
      expected: JSON.stringify(capability.contract.successCondition),
      observed: finalObs.text.slice(0, 200),
    };
  }
  evidence.event({ type: "replay_success", outputs: { savingsBalance: outputs.savingsBalance ?? "[n/a]" } });
  return { kind: "success", outputs };
}
