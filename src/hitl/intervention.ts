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
