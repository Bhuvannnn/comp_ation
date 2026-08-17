import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionLease, LeaseViolation } from "../src/hitl/lease.ts";
import { mockOperatorHandoff } from "../src/hitl/intervention.ts";
import { loadPolicy } from "../src/policy/engine.ts";
import { MemberDeskFakeSurface } from "../src/surface/memberdesk-fake.ts";

test("lease rejects automation actions while human owns the session", async () => {
  const lease = new SessionLease();
  const policy = loadPolicy("config/policy.json");
  const surface = new MemberDeskFakeSurface(lease, policy);
  const sessionId = surface.sessionId;
  await mockOperatorHandoff(
    lease,
    mkdtempSync(join(tmpdir(), "hitl-")),
    {
      interventionId: "i1",
      runId: sessionId,
      capabilityId: "memberdesk.savings_balance_lookup",
      goal: "demo",
      stepId: "submit_search",
      reason: "stuck",
      owner: "automation",
      createdAt: new Date().toISOString(),
      status: "open",
    },
    async () => {
      assert.equal(surface.sessionId, sessionId);
      assert.throws(() => lease.assertAutomationMayAct(), LeaseViolation);
      await assert.rejects(
        () => surface.act({ kind: "click", target: { candidates: [{ kind: "semantic", role: "button", name: "Look up" }] } }),
        LeaseViolation,
      );
    },
  );
  assert.equal(lease.owner(), "automation");
  lease.assertAutomationMayAct();
  const after = await surface.act({
    kind: "click",
    target: { candidates: [{ kind: "semantic", role: "button", name: "Look up" }] },
  });
  assert.equal(after.ok, true);
});
