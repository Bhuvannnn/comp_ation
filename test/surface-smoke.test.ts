import assert from "node:assert/strict";
import { test } from "node:test";
import { ElectronSurface } from "../src/surface/electron.ts";
import { OsDesktopSurface } from "../src/surface/desktop.ts";
import { MemberDeskFakeSurface } from "../src/surface/memberdesk-fake.ts";
import { SessionLease } from "../src/hitl/lease.ts";
import { loadPolicy } from "../src/policy/engine.ts";

test("desktop stubs exist as typed seams", async () => {
  const e = new ElectronSurface();
  await assert.rejects(() => e.observe());
  const d = new OsDesktopSurface();
  await assert.rejects(() => d.act());
});

test("fake surface observe returns ARIA-like text", async () => {
  const s = new MemberDeskFakeSurface(new SessionLease(), loadPolicy("config/policy.json"));
  const obs = await s.observe();
  assert.match(obs.ariaSnapshot, /textbox/);
});
