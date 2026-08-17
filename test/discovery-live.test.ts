import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runLiveDiscovery } from "../src/discovery/live.ts";

test("live discovery requires OPENAI_API_KEY or OPENAI_BASE_URL", async () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevBase = process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  try {
    await assert.rejects(
      () => runLiveDiscovery({} as never, {} as never, "goal", "http://127.0.0.1:4173"),
      /OPENAI_API_KEY|OPENAI_BASE_URL/,
    );
  } finally {
    if (prevKey !== undefined) process.env.OPENAI_API_KEY = prevKey;
    else delete process.env.OPENAI_API_KEY;
    if (prevBase !== undefined) process.env.OPENAI_BASE_URL = prevBase;
    else delete process.env.OPENAI_BASE_URL;
  }
});

test("committed live discovery journal has model tool calls", () => {
  for (const path of [
    "evidence/sample/discovery-live.run.jsonl",
    "evidence/discovery/live/run.jsonl",
  ]) {
    const raw = readFileSync(path, "utf8");
    const lines = raw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string; mode?: string });
    assert.equal(lines[0]?.type, "discover_start", path);
    assert.equal(lines[0]?.mode, "live", path);
    assert.ok(
      lines.some((event) => event.type === "model_tool"),
      `${path} must contain model_tool events`,
    );
    assert.doesNotMatch(raw, /sk-|gsk_|OPENAI_API_KEY\s*=\s*sk/);
  }
});
