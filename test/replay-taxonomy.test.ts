import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPolicy } from "../src/policy/engine.ts";
import { SessionLease } from "../src/hitl/lease.ts";
import { MemberDeskFakeSurface } from "../src/surface/memberdesk-fake.ts";
import { EvidenceWriter } from "../src/evidence/writer.ts";
import { compileSavingsLookupCapability } from "../src/artifact/compile.ts";
import { replayCapability } from "../src/replay/interpreter.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function env() {
  const policy = loadPolicy("config/policy.json");
  const lease = new SessionLease();
  const surface = new MemberDeskFakeSurface(lease, policy);
  const evidence = new EvidenceWriter(mkdtempSync(join(tmpdir(), "ev-")));
  return { policy, lease, surface, evidence, cap: compileSavingsLookupCapability() };
}

test("happy path replay returns success + balance", async () => {
  const { surface, evidence, cap } = env();
  const result = await replayCapability(surface, cap, { memberId: "12345" }, evidence);
  assert.equal(result.kind, "success");
  if (result.kind === "success") assert.match(result.outputs.savingsBalance, /\$1,284\.50/);
});

test("unknown member is a business_outcome, not a crash", async () => {
  const { surface, evidence, cap } = env();
  const result = await replayCapability(surface, cap, { memberId: "00000" }, evidence);
  assert.equal(result.kind, "business_outcome");
  if (result.kind === "business_outcome") assert.equal(result.code, "member_not_found");
});

test("permission denial is a business_outcome", async () => {
  const { surface, evidence, cap } = env();
  const result = await replayCapability(surface, cap, { memberId: "99999" }, evidence);
  assert.equal(result.kind, "business_outcome");
  if (result.kind === "business_outcome") assert.equal(result.code, "permission_denied");
});

test("known interstitial is recovered then succeeds", async () => {
  const { surface, evidence, cap } = env();
  surface.injectInterstitial = true;
  const result = await replayCapability(surface, cap, { memberId: "12345" }, evidence);
  assert.equal(result.kind, "success");
});
