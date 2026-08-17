import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { compileSavingsLookupCapability } from "../src/artifact/compile.ts";
import type { Capability } from "../src/artifact/schema.ts";
import { EvidenceWriter } from "../src/evidence/writer.ts";
import { SessionLease } from "../src/hitl/lease.ts";
import { loadPolicy, type PolicyConfig } from "../src/policy/engine.ts";
import { replayCapability, type TerminalResult } from "../src/replay/interpreter.ts";
import { WebSurface } from "../src/surface/web.ts";
import { memberDeskPort, startMemberDesk } from "../src/target/memberdesk/server.ts";
import type { Server } from "node:http";

type LiveCtx = {
  base: string;
  policy: PolicyConfig;
  lease: SessionLease;
  surface: WebSurface;
  evidence: EvidenceWriter;
  server: Server;
  cap: Capability;
};

async function openLive(): Promise<LiveCtx> {
  const lease = new SessionLease();
  const evidence = new EvidenceWriter(mkdtempSync(join(tmpdir(), "replay-live-")));
  const cap = compileSavingsLookupCapability();
  const server = await startMemberDesk("127.0.0.1", 0);
  const base = `http://127.0.0.1:${memberDeskPort(server)}`;
  const policy: PolicyConfig = {
    ...loadPolicy("config/policy.json"),
    origins: [base, base.replace("127.0.0.1", "localhost")],
  };
  const surface = new WebSurface(randomUUID(), lease, policy, false);
  await surface.launch();
  return { base, policy, lease, surface, evidence, server, cap };
}

async function closeLive(ctx: LiveCtx): Promise<void> {
  await ctx.surface.close();
  await new Promise<void>((resolve, reject) =>
    ctx.server.close((err) => (err ? reject(err) : resolve())),
  );
}

async function withLiveReplay(memberId: string): Promise<TerminalResult> {
  const ctx = await openLive();
  try {
    return await replayCapability(ctx.surface, ctx.cap, { memberId }, ctx.evidence, ctx.base, {
      mode: "live-browser",
    });
  } finally {
    await closeLive(ctx);
  }
}

test(
  "live-browser replay happy path returns success + balance",
  { timeout: 60_000 },
  async () => {
    const result = await withLiveReplay("12345");
    assert.equal(result.kind, "success");
    if (result.kind === "success") assert.match(result.outputs.savingsBalance, /\$1,284\.50/);
  },
);

test(
  "live-browser replay unknown member is business_outcome",
  { timeout: 60_000 },
  async () => {
    const result = await withLiveReplay("00000");
    assert.equal(result.kind, "business_outcome");
    if (result.kind === "business_outcome") assert.equal(result.code, "member_not_found");
  },
);

test(
  "live-browser replay permission denial is business_outcome",
  { timeout: 60_000 },
  async () => {
    const result = await withLiveReplay("99999");
    assert.equal(result.kind, "business_outcome");
    if (result.kind === "business_outcome") assert.equal(result.code, "permission_denied");
  },
);

test(
  "live-browser journals mode=live-browser and never invokes openai",
  { timeout: 60_000 },
  async () => {
    const ctx = await openLive();
    try {
      const result = await replayCapability(
        ctx.surface,
        ctx.cap,
        { memberId: "12345" },
        ctx.evidence,
        ctx.base,
        { mode: "live-browser" },
      );
      assert.equal(result.kind, "success");
      const journal = readFileSync(ctx.evidence.journalPath, "utf8");
      const start = JSON.parse(journal.trim().split("\n")[0]!) as { type: string; mode?: string };
      assert.equal(start.type, "replay_start");
      assert.equal(start.mode, "live-browser");
      assert.doesNotMatch(journal, /openai|sk-|gsk_/i);
    } finally {
      await closeLive(ctx);
    }
  },
);

test(
  "live-browser recovers interstitial then reads balance",
  { timeout: 60_000 },
  async () => {
    const ctx = await openLive();
    try {
      // One-shot interstitial: fault= drops on dismiss; member 12345 then loads.
      await ctx.surface.act({
        kind: "navigate",
        url: `${ctx.base}/search?memberId=12345&fault=interstitial`,
      });
      const notice = await ctx.surface.observe();
      assert.match(notice.text, /Session notice/);
      const dismissed = await ctx.surface.act({
        kind: "dismiss",
        target: { candidates: [{ kind: "semantic", role: "button", name: "Dismiss" }] },
      });
      assert.equal(dismissed.ok, true);
      const after = await ctx.surface.observe();
      assert.match(after.text, /Savings balance/);
      const extracted = await ctx.surface.act({
        kind: "extract",
        target: {
          candidates: [{ kind: "semantic", role: "status", name: "Savings balance" }],
        },
      });
      assert.equal(extracted.ok, true);
      assert.match(extracted.extracted?.savingsBalance ?? "", /\$1,284\.50/);
    } finally {
      await closeLive(ctx);
    }
  },
);

test(
  "live-browser ranked locators skip a dead candidate then fill",
  { timeout: 60_000 },
  async () => {
    const ctx = await openLive();
    try {
      await ctx.surface.act({ kind: "navigate", url: `${ctx.base}/` });
      const filled = await ctx.surface.act({
        kind: "fill",
        value: "12345",
        target: {
          candidates: [
            { kind: "semantic", role: "textbox", name: "No Such Field" },
            { kind: "semantic", role: "textbox", name: "Member ID" },
          ],
        },
      });
      assert.equal(filled.ok, true);
      const clicked = await ctx.surface.act({
        kind: "click",
        target: {
          candidates: [
            { kind: "css", selector: "#does-not-exist", justification: "negative probe" },
            { kind: "semantic", role: "button", name: "Look up" },
          ],
        },
      });
      assert.equal(clicked.ok, true);
      const obs = await ctx.surface.observe();
      assert.match(obs.text, /Savings balance/);
    } finally {
      await closeLive(ctx);
    }
  },
);

test(
  "live-browser iframe framePath scopes into results frame",
  { timeout: 60_000 },
  async () => {
    const ctx = await openLive();
    try {
      await ctx.surface.act({ kind: "navigate", url: `${ctx.base}/` });
      // Main document has Member ID; empty results iframe must not claim that control.
      const mainFill = await ctx.surface.act({
        kind: "fill",
        value: "12345",
        target: {
          candidates: [{ kind: "semantic", role: "textbox", name: "Member ID" }],
        },
      });
      assert.equal(mainFill.ok, true);
      const inFrame = await ctx.surface.resolve({
        framePath: ["results"],
        candidates: [{ kind: "semantic", role: "textbox", name: "Member ID" }],
      });
      assert.equal(inFrame, null);
      const missing = await ctx.surface.act({
        kind: "click",
        target: {
          framePath: ["results"],
          candidates: [{ kind: "semantic", role: "button", name: "Look up" }],
        },
      });
      assert.equal(missing.ok, false);
      assert.equal(missing.code, "no_target");
    } finally {
      await closeLive(ctx);
    }
  },
);

test(
  "live-browser policy deny becomes hard_failure on replay",
  { timeout: 60_000 },
  async () => {
    const ctx = await openLive();
    try {
      const deniedCap: Capability = {
        ...ctx.cap,
        steps: [
          {
            id: "open_offlist",
            action: "navigate",
            url: "https://example.com/",
            checkpoint: { kind: "textMatches", needle: "Example" },
          },
        ],
      };
      const result = await replayCapability(
        ctx.surface,
        deniedCap,
        { memberId: "12345" },
        ctx.evidence,
        ctx.base,
        { mode: "live-browser" },
      );
      assert.equal(result.kind, "hard_failure");
      if (result.kind === "hard_failure") {
        assert.equal(result.stepId, "open_offlist");
        assert.equal(result.code, "policy_denied");
        assert.match(result.expected, /navigate/);
        assert.match(result.observed, /origin|allowlist/i);
      }
    } finally {
      await closeLive(ctx);
    }
  },
);

test(
  "live-browser missing control is hard_failure with step context",
  { timeout: 60_000 },
  async () => {
    const ctx = await openLive();
    try {
      const broken: Capability = {
        ...ctx.cap,
        steps: [
          {
            id: "open",
            action: "navigate",
            url: "http://127.0.0.1:4173/",
            checkpoint: { kind: "textMatches", needle: "MemberDesk" },
          },
          {
            id: "fill_missing",
            action: "fill",
            target: {
              candidates: [{ kind: "semantic", role: "textbox", name: "Definitely Missing" }],
            },
            value: { kind: "param", name: "memberId" },
          },
        ],
      };
      const result = await replayCapability(
        ctx.surface,
        broken,
        { memberId: "12345" },
        ctx.evidence,
        ctx.base,
        { mode: "live-browser" },
      );
      assert.equal(result.kind, "hard_failure");
      if (result.kind === "hard_failure") {
        assert.equal(result.stepId, "fill_missing");
        assert.equal(result.code, "no_target");
        assert.equal(result.expected, "fill");
        assert.match(result.observed, /resolvable target/i);
      }
    } finally {
      await closeLive(ctx);
    }
  },
);

test(
  "live-browser screenshot is a PNG buffer",
  { timeout: 60_000 },
  async () => {
    const ctx = await openLive();
    try {
      await ctx.surface.act({ kind: "navigate", url: `${ctx.base}/` });
      const shot = await ctx.surface.screenshot();
      assert.ok(shot.byteLength > 100);
      assert.equal(shot[0], 0x89);
      assert.equal(shot[1], 0x50); // P
      assert.equal(shot[2], 0x4e); // N
      assert.equal(shot[3], 0x47); // G
    } finally {
      await closeLive(ctx);
    }
  },
);

test("committed sample live-browser journals carry mode", () => {
  for (const path of [
    "evidence/sample/replay-happy.run.jsonl",
    "evidence/sample/replay-not-found.run.jsonl",
  ]) {
    const raw = readFileSync(path, "utf8");
    const start = JSON.parse(raw.trim().split("\n")[0]!) as { type: string; mode?: string };
    assert.equal(start.type, "replay_start", path);
    assert.equal(start.mode, "live-browser", path);
  }
});
