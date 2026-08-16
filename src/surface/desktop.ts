import type { Surface } from "./types.ts";

/** Design seam for §3.7 — OS a11y / input injection is not built. */
export class OsDesktopSurface implements Surface {
  readonly kind = "os_desktop" as const;
  readonly sessionId = "unimplemented";
  async observe(): Promise<never> {
    throw new Error("OsDesktopSurface is a design stub (Project.md §3.7).");
  }
  async act(): Promise<never> {
    throw new Error("OsDesktopSurface is a design stub (Project.md §3.7).");
  }
  async screenshot(): Promise<never> {
    throw new Error("OsDesktopSurface is a design stub (Project.md §3.7).");
  }
  async close(): Promise<void> {
    /* noop */
  }
}
