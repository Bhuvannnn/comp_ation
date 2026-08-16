export type GraphKind = "discovery" | "replay";

export type NodeId =
  | "observe"
  | "decide"
  | "policy_check"
  | "act"
  | "checkpoint"
  | "recover"
  | "escalate"
  | "redact"
  | "persist_artifact"
  | "replay_step";

/**
 * Table-driven reducer seam. Discovery/replay interpreters call this
 * documentation contract; the thin vertical slice uses explicit loops
 * that still visit these nodes (see interpreter + mock discovery).
 */
export const DISCOVERY_EDGES: Record<string, Record<string, string>> = {
  observe: { observed: "decide", observe_failed: "escalate" },
  decide: { proposed_action: "policy_check", proposed_goal_met: "redact", gave_up: "escalate" },
  policy_check: { allow: "act", deny: "escalate", escalate: "escalate" },
  act: { acted: "checkpoint", target_not_found: "recover", lease_violation: "escalate" },
  checkpoint: { passed: "observe", outcome_matched: "redact", recoverable_detected: "recover", unmatched: "escalate" },
  recover: { recovered: "observe", budget_exhausted: "escalate" },
  escalate: { resumed: "observe", no_wait: "redact" },
  redact: { ready: "persist_artifact" },
  persist_artifact: { persisted: "done" },
};

export const REPLAY_EDGES: Record<string, Record<string, string>> = {
  replay_step: { step_ready: "policy_check", no_more_steps: "redact" },
  policy_check: { allow: "act", deny: "escalate", escalate: "escalate" },
  act: { acted: "checkpoint", target_not_found: "recover" },
  checkpoint: { passed: "replay_step", outcome_matched: "redact", recoverable_detected: "recover", unmatched: "escalate" },
  recover: { recovered: "replay_step", budget_exhausted: "escalate" },
  escalate: { no_wait: "redact" },
  redact: { ready: "done" },
};

export function nextNode(
  edges: Record<string, Record<string, string>>,
  node: string,
  outcome: string,
): string {
  const dest = edges[node]?.[outcome];
  if (!dest) throw new Error(`no edge ${node}/${outcome}`);
  return dest;
}
