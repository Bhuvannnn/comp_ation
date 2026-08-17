import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPolicy } from "../src/policy/engine.ts";
import { SessionLease } from "../src/hitl/lease.ts";
import { MemberDeskFakeSurface } from "../src/surface/memberdesk-fake.ts";
import { EvidenceWriter } from "../src/evidence/writer.ts";
import { compileSavingsLookupCapability } from "../src/artifact/compile.ts";
import { replayCapability } from "../src/replay/interpreter.ts";
import type { Surface } from "../src/surface/types.ts";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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

test("unexpected confirmation is hard_failure with step context", async () => {
  const { surface, evidence, cap } = env();
  const result = await replayCapability(surface, cap, { memberId: "77777" }, evidence);
  assert.equal(result.kind, "hard_failure");
  if (result.kind === "hard_failure") {
    assert.equal(result.stepId, "submit_search");
    assert.equal(result.code, "unexpected_state");
    assert.match(result.expected, /member_not_found|permission_denied|session_notice/);
    assert.match(result.observed, /cannot be undone|Confirm sub-account/i);
  }
  const shot = await surface.screenshot();
  assert.ok(shot.byteLength > 0);
  evidence.writeScreenshot(shot);
});

test("missing required param is hard_failure, not business_outcome", async () => {
  const { surface, evidence, cap } = env();
  const result = await replayCapability(surface, cap, {}, evidence);
  assert.equal(result.kind, "hard_failure");
  if (result.kind === "hard_failure") {
    assert.equal(result.code, "missing_param");
    assert.equal(result.expected, "memberId");
  }
});

test("FakeSurface policy deny is hard_failure with step context", async () => {
  const { surface, evidence, cap } = env();
  const deniedCap = {
    ...cap,
    steps: [
      {
        id: "open_offlist",
        action: "navigate" as const,
        url: "https://example.com/",
        checkpoint: { kind: "textMatches" as const, needle: "Example" },
      },
    ],
  };
  const result = await replayCapability(surface, deniedCap, { memberId: "12345" }, evidence);
  assert.equal(result.kind, "hard_failure");
  if (result.kind === "hard_failure") {
    assert.equal(result.stepId, "open_offlist");
    assert.equal(result.code, "policy_denied");
    assert.match(result.expected, /navigate/);
    assert.match(result.observed, /origin|allowlist/i);
  }
});

test("policy escalate is escalated terminal, not hard_failure", async () => {
  const { evidence, cap, surface: memberSurface, lease } = env();
  const gated = await memberSurface.act({ kind: "submit_irreversible" });
  assert.equal(gated.ok, false);
  assert.equal(gated.code, "policy_escalate");

  const escalateSurface: Surface = {
    kind: "web",
    sessionId: "escalate-fake",
    async observe() {
      return {
        url: "http://127.0.0.1:4173/",
        title: "MemberDesk",
        ariaSnapshot: "",
        text: "",
      };
    },
    async act() {
      return { ok: false, code: "policy_escalate", message: "submit_irreversible is irreversible" };
    },
    async screenshot() {
      return Buffer.from("fake-png");
    },
    async close() {},
  };
  const result = await replayCapability(
    escalateSurface,
    cap,
    { memberId: "12345" },
    evidence,
    undefined,
    { lease },
  );
  assert.equal(result.kind, "escalated");
  if (result.kind === "escalated") {
    assert.ok(result.interventionId.length > 0);
    assert.match(result.reason, /irreversible/i);
  }
  assert.equal(lease.owner(), "human");
  assert.throws(() => lease.assertAutomationMayAct());
  const interventionPath = join(evidence.dir, "intervention.json");
  assert.ok(existsSync(interventionPath));
  const intervention = JSON.parse(readFileSync(interventionPath, "utf8")) as {
    status: string;
    interventionId: string;
  };
  assert.equal(intervention.status, "open");
  assert.equal(intervention.interventionId, result.kind === "escalated" ? result.interventionId : "");
  const journal = readFileSync(evidence.journalPath, "utf8");
  assert.match(journal, /"type":"escalated"/);
});
