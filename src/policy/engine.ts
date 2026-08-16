import { readFileSync } from "node:fs";
import type { ActionKind, ActionRequest } from "../surface/types.ts";

export type PolicyDecision =
  | { verdict: "allow"; ruleId: string }
  | { verdict: "deny"; ruleId: string; reason: string }
  | { verdict: "escalate"; ruleId: string; reason: string };

export interface PolicyConfig {
  id: string;
  origins: string[];
  pathAllowlist: string[];
  allowedActions: ActionKind[];
  riskyActions: ActionKind[];
  blockedPatterns: string[];
}

export function loadPolicy(path: string): PolicyConfig {
  return JSON.parse(readFileSync(path, "utf8")) as PolicyConfig;
}

export function assertAllowed(action: ActionRequest, policy: PolicyConfig, currentOrigin?: string): PolicyDecision {
  if (policy.riskyActions.includes(action.kind)) {
    return { verdict: "escalate", ruleId: "risky", reason: `${action.kind} is irreversible` };
  }
  if (!policy.allowedActions.includes(action.kind)) {
    return { verdict: "deny", ruleId: "action-type", reason: `action ${action.kind} not allowlisted` };
  }
  if (action.url) {
    let origin: string;
    let pathname: string;
    try {
      const u = new URL(action.url);
      origin = u.origin;
      pathname = u.pathname;
    } catch {
      return { verdict: "deny", ruleId: "url", reason: "unparseable url" };
    }
    if (!policy.origins.includes(origin)) {
      return { verdict: "deny", ruleId: "origin", reason: `origin ${origin} not allowlisted` };
    }
    const okPath = policy.pathAllowlist.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!okPath) {
      return { verdict: "deny", ruleId: "path", reason: `path ${pathname} not allowlisted` };
    }
  } else if (currentOrigin && !policy.origins.includes(currentOrigin)) {
    return { verdict: "deny", ruleId: "origin", reason: `current origin ${currentOrigin} not allowlisted` };
  }
  const hay = `${action.value ?? ""} ${action.rationale ?? ""}`.toLowerCase();
  for (const pat of policy.blockedPatterns) {
    if (hay.includes(pat.toLowerCase())) {
      return { verdict: "deny", ruleId: "secret-pattern", reason: `blocked pattern ${pat}` };
    }
  }
  return { verdict: "allow", ruleId: "default-allow" };
}
