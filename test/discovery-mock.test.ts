import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPolicy } from "../src/policy/engine.ts";
import { SessionLease } from "../src/hitl/lease.ts";
import { MemberDeskFakeSurface } from "../src/surface/memberdesk-fake.ts";
import { EvidenceWriter } from "../src/evidence/writer.ts";
import { runMockDiscovery } from "../src/discovery/mock.ts";
import { parseCapability } from "../src/artifact/schema.ts";

test("mock discovery completes and writes a journal", async () => {
  const dir = mkdtempSync(join(tmpdir(), "discovery-mock-"));
  const evidence = new EvidenceWriter(dir);
  const surface = new MemberDeskFakeSurface(new SessionLease(), loadPolicy("config/policy.json"));
  const { result, capabilityPath } = await runMockDiscovery(
    surface,
    evidence,
    "Look up member 12345 and read their savings balance",
  );

  assert.equal(result.kind, "success");
  if (result.kind === "success") assert.match(result.outputs.savingsBalance, /\$1,284\.50/);

  assert.ok(existsSync(evidence.journalPath));
  const journal = readFileSync(evidence.journalPath, "utf8");
  assert.match(journal, /"type":"discover_start"/);
  assert.match(journal, /"mode":"mock"/);
  assert.match(journal, /"type":"act"/);
  assert.match(journal, /"type":"artifact_written"/);
  assert.doesNotMatch(journal, /\bopenai\b/i);
  assert.doesNotMatch(journal, /\bsk-[A-Za-z0-9]{20,}/);

  const cap = parseCapability(JSON.parse(readFileSync(capabilityPath, "utf8")));
  assert.equal(cap.provenance.source, "discovery");
  assert.ok(cap.steps.length >= 1);
});
