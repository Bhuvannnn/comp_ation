#!/usr/bin/env node
import { Command } from "commander";
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { loadPolicy } from "../policy/engine.ts";
import { SessionLease } from "../hitl/lease.ts";
import { mockOperatorHandoff } from "../hitl/intervention.ts";
import { EvidenceWriter } from "../evidence/writer.ts";
import { writeCapability } from "../artifact/compile.ts";
import { parseCapability } from "../artifact/schema.ts";
import { replayCapability } from "../replay/interpreter.ts";
import { runMockDiscovery } from "../discovery/mock.ts";
import { runLiveDiscovery } from "../discovery/live.ts";
import { MemberDeskFakeSurface } from "../surface/memberdesk-fake.ts";
import { startMemberDesk } from "../target/memberdesk/server.ts";
import { WebSurface } from "../surface/web.ts";
import type { Surface } from "../surface/types.ts";

const ROOT = process.cwd();
const POLICY_PATH = join(ROOT, "config/policy.json");

function loadEnvFile(): void {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

function copyLiveDiscoveryEvidence(fromDir: string): void {
  const liveDir = join(ROOT, "evidence/discovery/live");
  mkdirSync(liveDir, { recursive: true });
  for (const name of ["run.jsonl", "result.json", "capability.json"]) {
    const src = join(fromDir, name);
    if (existsSync(src)) copyFileSync(src, join(liveDir, name));
  }
  const sampleJournal = join(ROOT, "evidence/sample/discovery-live.run.jsonl");
  copyFileSync(join(fromDir, "run.jsonl"), sampleJournal);
  const resultSrc = join(fromDir, "result.json");
  if (existsSync(resultSrc)) {
    copyFileSync(resultSrc, join(ROOT, "evidence/sample/discovery-live.result.json"));
  }
}

function originBase(): string {
  const host = process.env.MEMBERDESK_HOST ?? "127.0.0.1";
  const port = process.env.MEMBERDESK_PORT ?? "4173";
  return `http://${host}:${port}`;
}

async function withTarget<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const host = process.env.MEMBERDESK_HOST ?? "127.0.0.1";
  const port = Number(process.env.MEMBERDESK_PORT ?? 4173);
  const server = await startMemberDesk(host, port);
  try {
    return await fn(`http://${host}:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

const program = new Command();
program.name("comp-ation").description("Discover once, replay forever.");

program
  .command("surface-smoke")
  .description("Launch MemberDesk + Chromium, take one ARIA snapshot, exit.")
  .option("--fake", "use FakeSurface (no Chromium)")
  .action(async (opts: { fake?: boolean }) => {
    loadEnvFile();
    const policy = loadPolicy(POLICY_PATH);
    const lease = new SessionLease();
    if (opts.fake) {
      const surface = new MemberDeskFakeSurface(lease, policy);
      const obs = await surface.observe();
      console.log(obs.ariaSnapshot);
      return;
    }
    await withTarget(async (base) => {
      const surface = new WebSurface(randomUUID(), lease, policy, process.env.HEADED === "1");
      await surface.launch();
      try {
        await surface.act({ kind: "navigate", url: `${base}/` });
        const obs = await surface.observe();
        console.log(obs.ariaSnapshot.slice(0, 2000));
      } finally {
        await surface.close();
      }
    });
  });

program
  .command("discover")
  .requiredOption("--goal <text>", "natural language goal")
  .option("--mock", "scripted discovery (no LLM)")
  .option("--live-browser", "use Playwright against MemberDesk (default with --mock: FakeSurface)")
  .action(async (opts: { goal: string; mock?: boolean; liveBrowser?: boolean }) => {
    loadEnvFile();
    const policy = loadPolicy(POLICY_PATH);
    const lease = new SessionLease();
    const runId = randomUUID();
    const dir = join(ROOT, "evidence/discovery", runId);
    const evidence = new EvidenceWriter(dir);
    mkdirSync(join(ROOT, "evidence/discovery"), { recursive: true });
    writeFileSync(join(ROOT, "evidence/discovery/latest"), runId);

    const hasLiveLlm = Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);
    if (opts.liveBrowser && !opts.mock && !hasLiveLlm) {
      throw new Error("OPENAI_API_KEY or OPENAI_BASE_URL is required for --live-browser discovery");
    }
    const useMock = Boolean(opts.mock) || !hasLiveLlm;
    const useBrowser = Boolean(opts.liveBrowser) && !opts.mock;

    const run = async (surface: Surface, base: string) => {
      if (useMock) {
        const { result, capabilityPath } = await runMockDiscovery(surface, evidence, opts.goal, base);
        writeCapability(join(ROOT, "evidence/sample/capability.json"), parseCapability(JSON.parse(readFileSync(capabilityPath, "utf8"))));
        writeCapability(join(ROOT, "capabilities/memberdesk.savings_balance_lookup.json"), parseCapability(JSON.parse(readFileSync(capabilityPath, "utf8"))));
        evidence.writeJson("result.json", result);
        copyFileSync(evidence.journalPath, join(ROOT, "evidence/sample/discovery.run.jsonl"));
        copyFileSync(join(dir, "result.json"), join(ROOT, "evidence/sample/discovery.result.json"));
        console.log(JSON.stringify({ runId, result, capabilityPath }, null, 2));
        return;
      }
      const { capabilityPath } = await runLiveDiscovery(surface, evidence, opts.goal, base);
      evidence.writeJson("result.json", { kind: "compiled", capabilityPath: "capability.json", mode: "live" });
      copyLiveDiscoveryEvidence(dir);
      console.log(JSON.stringify({ runId, capabilityPath, packed: "evidence/discovery/live" }, null, 2));
    };

    if (useBrowser) {
      await withTarget(async (base) => {
        const surface = new WebSurface(runId, lease, policy, process.env.HEADED === "1");
        await surface.launch();
        try {
          await run(surface, base);
        } finally {
          await surface.close();
        }
      });
    } else {
      const surface = new MemberDeskFakeSurface(lease, policy);
      await run(surface, originBase());
    }
  });

function packReplaySample(fromDir: string, inputPath: string): void {
  const lower = inputPath.replace(/\\/g, "/").toLowerCase();
  const stem = lower.includes("hard-failure")
    ? "replay-hard-failure"
    : lower.includes("not-found")
      ? "replay-not-found"
      : lower.includes("happy")
        ? "replay-happy"
        : null;
  if (!stem) return;
  const sample = join(ROOT, "evidence/sample");
  mkdirSync(sample, { recursive: true });
  copyFileSync(join(fromDir, "run.jsonl"), join(sample, `${stem}.run.jsonl`));
  if (existsSync(join(fromDir, "result.json"))) {
    copyFileSync(join(fromDir, "result.json"), join(sample, `${stem}.result.json`));
  }
  const shot = join(fromDir, "failure.png");
  if (existsSync(shot)) copyFileSync(shot, join(sample, `${stem}.failure.png`));
}

program
  .command("replay")
  .requiredOption("--artifact <path>", "capability JSON")
  .requiredOption("--input <path>", "JSON params, e.g. {\"memberId\":\"12345\"}")
  .option("--live-browser", "replay against Playwright MemberDesk")
  .option("--fault <name>", "inject interstitial|unexpected on fake surface")
  .action(async (opts: { artifact: string; input: string; liveBrowser?: boolean; fault?: string }) => {
    loadEnvFile();
    const policy = loadPolicy(POLICY_PATH);
    const lease = new SessionLease();
    const cap = parseCapability(JSON.parse(readFileSync(opts.artifact, "utf8")));
    const params = JSON.parse(readFileSync(opts.input, "utf8")) as Record<string, string>;
    const runId = randomUUID();
    const dir = join(ROOT, "evidence/replay", runId);
    const evidence = new EvidenceWriter(dir);
    const mode = opts.liveBrowser ? "live-browser" : "fake";

    const execute = async (surface: Surface, base: string) => {
      if (surface instanceof MemberDeskFakeSurface) {
        if (opts.fault === "interstitial") surface.injectInterstitial = true;
        if (opts.fault === "unexpected") surface.injectUnexpectedConfirm = true;
      }
      const result = await replayCapability(surface, cap, params, evidence, base, { mode, lease });
      if (result.kind === "hard_failure") {
        const shot = await surface.screenshot();
        evidence.writeScreenshot(shot);
        evidence.event({ type: "screenshot", path: "failure.png", bytes: shot.byteLength });
      }
      evidence.writeJson("result.json", result);
      // Refresh committed sample journals only from live-browser runs so FakeSurface
      // never overwrites a real hard-failure PNG (or live happy/not-found journals).
      if (opts.liveBrowser) packReplaySample(dir, opts.input);
      console.log(JSON.stringify({ runId, result, mode }, null, 2));
    };

    if (opts.liveBrowser) {
      await withTarget(async (base) => {
        const surface = new WebSurface(runId, lease, policy, process.env.HEADED === "1");
        await surface.launch();
        try {
          await execute(surface, base);
        } finally {
          await surface.close();
        }
      });
    } else {
      await execute(new MemberDeskFakeSurface(lease, policy), originBase());
    }
  });

program
  .command("escalate")
  .description("Demo HITL pause → mock operator → resume on the same FakeSurface session.")
  .action(async () => {
    const policy = loadPolicy(POLICY_PATH);
    const lease = new SessionLease();
    const surface = new MemberDeskFakeSurface(lease, policy);
    const dir = join(ROOT, "evidence/hitl", randomUUID());
    const evidence = new EvidenceWriter(dir);
    await surface.act({ kind: "navigate", url: "http://127.0.0.1:4173/" });
    const sessionId = surface.sessionId;
    evidence.event({ type: "stuck", sessionId, reason: "demo escalate" });
    await mockOperatorHandoff(
      lease,
      dir,
      {
        interventionId: randomUUID(),
        runId: sessionId,
        capabilityId: "memberdesk.savings_balance_lookup",
        goal: "Look up member 12345",
        stepId: "submit_search",
        reason: "demo: automation paused; operator fills member id",
        owner: lease.owner(),
        createdAt: new Date().toISOString(),
        status: "open",
      },
      async () => {
        evidence.event({ type: "human_action", action: "fill", sessionId });
        lease.assertHumanMayAct();
      },
    );
    if (surface.sessionId !== sessionId) throw new Error("session identity changed");
    lease.assertAutomationMayAct();
    evidence.writeJson("result.json", { kind: "escalated_then_resumed", sessionId });
    console.log(JSON.stringify({ sessionId, owner: lease.owner(), dir }, null, 2));
  });

program
  .command("resume")
  .option("--dir <path>", "intervention directory")
  .action(async (opts: { dir?: string }) => {
    if (!opts.dir) {
      console.log("Pass --dir evidence/hitl/<id> after escalate, or use the escalate command which resumes automatically in mock mode.");
      return;
    }
    const raw = JSON.parse(readFileSync(join(opts.dir, "intervention.json"), "utf8"));
    raw.status = "resumed";
    writeFileSync(join(opts.dir, "intervention.json"), JSON.stringify(raw, null, 2));
    console.log(JSON.stringify(raw, null, 2));
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
