import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SessionLease } from "./lease.ts";

export interface InterventionRequest {
  interventionId: string;
  runId: string;
  capabilityId: string | null;
  goal: string;
  stepId: string | null;
  reason: string;
  owner: string;
  screenshotRel?: string;
  createdAt: string;
  status: "open" | "claimed" | "resumed" | "aborted";
}

export function writeIntervention(dir: string, req: InterventionRequest): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "intervention.json");
  writeFileSync(path, JSON.stringify(req, null, 2));
  return path;
}

/**
 * Pause automation for a human: write intervention.json and transfer the lease.
 * Does not resume — caller / operator must claim and return the lease later.
 */
export function parkForHuman(
  lease: SessionLease,
  dir: string,
  partial: Omit<InterventionRequest, "status" | "createdAt" | "owner">,
): InterventionRequest {
  const req: InterventionRequest = {
    ...partial,
    owner: lease.owner(),
    createdAt: new Date().toISOString(),
    status: "open",
  };
  writeIntervention(dir, req);
  lease.transition("transitioning_to_human", "risky_action_confirmation", "automation", req.interventionId);
  lease.transition("human", "operator_claimed", "system", req.interventionId);
  req.owner = lease.owner();
  writeIntervention(dir, req);
  return req;
}

/** Scripted operator for CI: claim → optional mock act → resume. Same session. */
export async function mockOperatorHandoff(
  lease: SessionLease,
  dir: string,
  req: InterventionRequest,
  actAsHuman: () => Promise<void>,
): Promise<InterventionRequest> {
  writeIntervention(dir, req);
  lease.transition("transitioning_to_human", "mock_handoff", "automation", req.interventionId);
  lease.transition("human", "operator_claimed", "operator", req.interventionId);
  req.status = "claimed";
  writeIntervention(dir, req);
  lease.assertHumanMayAct();
  await actAsHuman();
  lease.transition("transitioning_to_automation", "operator_resumed", "operator", req.interventionId);
  lease.transition("automation", "operator_resumed", "system", req.interventionId);
  req.status = "resumed";
  writeIntervention(dir, req);
  return req;
}
