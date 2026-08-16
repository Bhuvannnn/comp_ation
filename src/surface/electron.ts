import type { Surface } from "./types.ts";

/** Design seam for §3.7 — not implemented in this take-home. */
export class ElectronSurface implements Surface {
  readonly kind = "electron" as const;
  readonly sessionId = "unimplemented";
  async observe(): Promise<never> {
    throw new Error("ElectronSurface is a design stub (Project.md §3.7).");
  }
  async act(): Promise<never> {
    throw new Error("ElectronSurface is a design stub (Project.md §3.7).");
  }
  async screenshot(): Promise<never> {
    throw new Error("ElectronSurface is a design stub (Project.md §3.7).");
  }
  async close(): Promise<void> {
    /* noop */
  }
}
