import assert from "node:assert/strict";
import { test } from "node:test";
import { assertAllowed, loadPolicy } from "../src/policy/engine.ts";
import { redactValue, redactRecord } from "../src/policy/redact.ts";

const policy = loadPolicy("config/policy.json");

test("allowlisted navigate on MemberDesk origin", () => {
  const d = assertAllowed(
    { kind: "navigate", url: "http://127.0.0.1:4173/" },
    policy,
  );
  assert.equal(d.verdict, "allow");
});

test("denies off-allowlist origin", () => {
  const d = assertAllowed({ kind: "navigate", url: "https://evil.example/" }, policy);
  assert.equal(d.verdict, "deny");
});

test("risky irreversible action escalates", () => {
  const d = assertAllowed({ kind: "submit_irreversible" }, policy);
  assert.equal(d.verdict, "escalate");
});

test("redacts long digit runs and secret keys", () => {
  assert.equal(redactValue("token", "abc"), "[redacted:token]");
  assert.match(String(redactRecord({ member: "123456789" }).member), /\[id\]/);
});
