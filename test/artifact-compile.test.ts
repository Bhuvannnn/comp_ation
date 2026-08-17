import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  compileCapabilityFromJournal,
  compileSavingsLookupCapability,
  durableSemanticName,
} from "../src/artifact/compile.ts";
import { parseCapability } from "../src/artifact/schema.ts";
import { runMockDiscovery } from "../src/discovery/mock.ts";
import { EvidenceWriter } from "../src/evidence/writer.ts";
import { SessionLease } from "../src/hitl/lease.ts";
import { loadPolicy } from "../src/policy/engine.ts";
import { replayCapability } from "../src/replay/interpreter.ts";
import { MemberDeskFakeSurface } from "../src/surface/memberdesk-fake.ts";

const LIVE_JOURNAL = "evidence/sample/discovery-live.run.jsonl";

function journal(lines: unknown[]): string {
  return lines.map((line) => JSON.stringify(line)).join("\n") + "\n";
}

test("strips ephemeral ARIA refs from locator names", () => {
  assert.equal(durableSemanticName("Member ID [ref=e3]"), "Member ID");
  assert.equal(durableSemanticName("Look up ref=e12"), "Look up");
  assert.equal(durableSemanticName("ref=e4"), undefined);
  assert.equal(durableSemanticName("e7"), undefined);
});

test("compiles the committed live journal into a Zod capability", () => {
  const cap = compileCapabilityFromJournal(readFileSync(LIVE_JOURNAL, "utf8"));
  assert.equal(cap.provenance.source, "discovery");
  assert.equal(cap.capabilityId, "memberdesk.savings_balance_lookup");
  assert.ok(cap.steps.some((s) => s.action === "fill" && s.target?.candidates[0].kind === "semantic"));
  assert.ok(cap.steps.some((s) => s.action === "click"));
  assert.ok(cap.steps.some((s) => s.action === "extract"));
  assert.ok(!JSON.stringify(cap).includes("ref=e"));
  parseCapability(JSON.parse(JSON.stringify(cap)));
});

test("drops ref=eN tokens that appear in the journal", () => {
  const cap = compileCapabilityFromJournal(
    journal([
      { type: "discover_start", goal: "Look up member 12345 and read their savings balance", at: "2026-08-16T00:00:00.000Z" },
      { type: "act", kind: "navigate", url: "http://127.0.0.1:4173/" },
      {
        type: "act",
        kind: "fill",
        target: { kind: "semantic", role: "textbox", name: "Member ID [ref=e3]" },
        paramName: "memberId",
      },
      { type: "act", kind: "click", target: { kind: "semantic", role: "button", name: "Look up [ref=e9]" } },
      { type: "act", kind: "extract", target: { kind: "semantic", role: "status", name: "Savings balance" } },
      { type: "act_result", ok: true, extracted: { savingsBalance: "$1,284.50" } },
    ]),
  );
  const names = cap.steps.flatMap((s) =>
    (s.target?.candidates ?? []).map((c) => (c.kind === "semantic" ? c.name : c.selector)),
  );
  assert.deepEqual(names, ["Member ID", "Look up", "Savings balance"]);
  assert.ok(!JSON.stringify(cap).includes("ref=e"));
});

test("locator names come from the journal, not a canned template", () => {
  const cap = compileCapabilityFromJournal(
    journal([
      { type: "discover_start", goal: "Look up member 12345 and read their savings balance" },
      { type: "act", kind: "navigate", url: "http://127.0.0.1:4173/" },
      {
        type: "act",
        kind: "fill",
        target: { kind: "semantic", role: "textbox", name: "Member number" },
        paramName: "memberId",
      },
      { type: "act", kind: "click", target: { kind: "semantic", role: "button", name: "Search members" } },
      { type: "act", kind: "extract", target: { kind: "semantic", role: "status", name: "Savings balance" } },
    ]),
  );
  const click = cap.steps.find((s) => s.action === "click");
  const fill = cap.steps.find((s) => s.action === "fill");
  assert.equal(fill?.target?.candidates[0].kind === "semantic" ? fill.target.candidates[0].name : undefined, "Member number");
  assert.equal(click?.target?.candidates[0].kind === "semantic" ? click.target.candidates[0].name : undefined, "Search members");
  assert.notEqual(click?.target?.candidates[0].kind === "semantic" ? click.target.candidates[0].name : undefined, "Look up");
});

test("empty journal is rejected", () => {
  assert.throws(() => compileCapabilityFromJournal(""), /COMPILE_EMPTY_JOURNAL/);
  assert.throws(
    () => compileCapabilityFromJournal(journal([{ type: "discover_start", goal: "x" }])),
    /COMPILE_EMPTY_TRAJECTORY/,
  );
});

test("mock discovery journals acts then compiles that journal", async () => {
  const surface = new MemberDeskFakeSurface(new SessionLease(), loadPolicy("config/policy.json"));
  const dir = mkdtempSync(join(tmpdir(), "t2-"));
  const evidence = new EvidenceWriter(dir);
  const { result, capabilityPath } = await runMockDiscovery(
    surface,
    evidence,
    "Look up member 12345 and read their current savings balance",
  );
  assert.equal(result.kind, "success");
  const cap = parseCapability(JSON.parse(readFileSync(capabilityPath, "utf8")));
  assert.equal(cap.provenance.source, "discovery");
  const raw = readFileSync(evidence.journalPath, "utf8");
  assert.match(raw, /"type":"act"/);
  assert.match(raw, /"type":"artifact_written"/);
  const replayed = await replayCapability(
    new MemberDeskFakeSurface(new SessionLease(), loadPolicy("config/policy.json")),
    cap,
    { memberId: "12345" },
    new EvidenceWriter(mkdtempSync(join(tmpdir(), "t2r-"))),
  );
  assert.equal(replayed.kind, "success");
});

test("compileSavingsLookupCapability is the live journal, not a handwritten template", () => {
  const fromHelper = compileSavingsLookupCapability();
  const fromFile = compileCapabilityFromJournal(readFileSync(LIVE_JOURNAL, "utf8"));
  assert.equal(fromHelper.contractHash, fromFile.contractHash);
  assert.equal(fromHelper.provenance.source, "discovery");
});
