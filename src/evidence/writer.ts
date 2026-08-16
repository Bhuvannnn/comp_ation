import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { redactRecord } from "../policy/redact.ts";

export class EvidenceWriter {
  readonly dir: string;
  readonly journalPath: string;

  constructor(dir: string) {
    this.dir = dir;
    this.journalPath = join(dir, "run.jsonl");
    mkdirSync(dir, { recursive: true });
  }

  event(record: Record<string, unknown>): void {
    const safe = redactRecord({ ...record, at: new Date().toISOString() });
    appendFileSync(this.journalPath, `${JSON.stringify(safe)}\n`);
  }

  writeJson(name: string, value: unknown): string {
    const path = join(this.dir, name);
    writeFileSync(path, JSON.stringify(value, null, 2));
    return path;
  }

  writeScreenshot(buf: Buffer, name = "failure.png"): string {
    const path = join(this.dir, name);
    writeFileSync(path, buf);
    return path;
  }
}
