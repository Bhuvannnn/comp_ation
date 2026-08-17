import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compileSavingsLookupCapability,
  writeCapability,
} from "../src/artifact/compile.ts";
import { parseCapability, computeContractHash, CAPABILITY_SCHEMA_VERSION } from "../src/artifact/schema.ts";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

test("capability schema round-trip and contract hash", () => {
  const cap = compileSavingsLookupCapability();
  assert.equal(cap.schemaVersion, CAPABILITY_SCHEMA_VERSION);
  assert.equal(cap.contractHash, computeContractHash(cap));
  const parsed = parseCapability(JSON.parse(JSON.stringify(cap)));
  assert.equal(parsed.capabilityId, "memberdesk.savings_balance_lookup");
  assert.equal(parsed.provenance.source, "discovery");
  assert.ok(parsed.steps.every((s) => !JSON.stringify(s).includes("ref=e")));
  mkdirSync("evidence/sample", { recursive: true });
  mkdirSync("evidence/discovery/live", { recursive: true });
  writeCapability(join("evidence/sample/capability.json"), cap);
  writeCapability(join("evidence/discovery/live/capability.json"), cap);
  writeCapability(join("capabilities/memberdesk.savings_balance_lookup.json"), cap);
});

test("rejects transcript-shaped payload", () => {
  assert.throws(() => parseCapability({ messages: ["click the button"] }));
});

test("hash changes when a param is renamed", () => {
  const cap = compileSavingsLookupCapability();
  const mutated = structuredClone(cap);
  mutated.contract.params[0].name = "id";
  assert.notEqual(computeContractHash(mutated), cap.contractHash);
});
