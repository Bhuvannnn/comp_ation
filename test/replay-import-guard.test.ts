import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("src/replay does not import openai", () => {
  const dir = "src/replay";
  const files = readdirSync(dir).filter((name) => name.endsWith(".ts"));
  assert.ok(files.length > 0, "expected TypeScript files under src/replay");
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8");
    assert.doesNotMatch(src, /\bopenai\b/i, `${name} must not reference openai`);
    assert.doesNotMatch(src, /from\s+["']openai["']/, `${name} must not import openai`);
  }
});
