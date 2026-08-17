import { chromium, type Browser, type BrowserContext, type FrameLocator, type Locator as PwLocator, type Page } from "playwright";
import type { ActionRequest, ActionResult, Observation, Surface } from "./types.ts";
import type { SessionLease } from "../hitl/lease.ts";
import { assertAllowed, type PolicyConfig } from "../policy/engine.ts";
import type { Locator, RankedTarget } from "./types.ts";

type QueryRoot = Page | FrameLocator;

/**
 * Playwright Chromium Surface. Only file that imports `playwright`.
 * Resolves ranked semantic/CSS locators (optional iframe `framePath`) for deterministic replay.
 */
export class WebSurface implements Surface {
  readonly kind = "web" as const;
  readonly binding = "playwright-chromium" as const;
  readonly sessionId: string;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  page: Page | null = null;

  constructor(
    sessionId: string,
    private readonly lease: SessionLease,
    private readonly policy: PolicyConfig,
    private readonly headed: boolean,
  ) {
    this.sessionId = sessionId;
  }

  async launch(): Promise<void> {
    this.browser = await chromium.launch({ headless: !this.headed });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async observe(): Promise<Observation> {
    const page = this.requirePage();
    let ariaSnapshot = "";
    try {
      ariaSnapshot = await page.ariaSnapshot({ mode: "ai", boxes: true });
    } catch {
      ariaSnapshot = await page.locator("body").innerText();
    }
    return {
      url: page.url(),
      title: await page.title(),
      ariaSnapshot,
      text: await page.locator("body").innerText(),
    };
  }

  async act(request: ActionRequest): Promise<ActionResult> {
    this.lease.assertAutomationMayAct();
    const page = this.requirePage();
    const origin = page.url().startsWith("http") ? new URL(page.url()).origin : undefined;
    const decision = assertAllowed(request, this.policy, origin);
    if (decision.verdict === "deny") {
      return { ok: false, code: "policy_denied", message: decision.reason };
    }
    if (decision.verdict === "escalate") {
      return { ok: false, code: "policy_escalate", message: decision.reason };
    }

    try {
      if (request.kind === "navigate" && request.url) {
        await page.goto(request.url, { waitUntil: "domcontentloaded" });
        return { ok: true };
      }
      const loc = request.target ? await this.resolve(request.target) : null;
      if (request.kind === "fill") {
        if (!loc) return { ok: false, code: "no_target", message: "fill requires a resolvable target" };
        await loc.fill(request.value ?? "");
        return { ok: true };
      }
      if (request.kind === "click" || request.kind === "dismiss") {
        if (!loc) return { ok: false, code: "no_target", message: "click requires a resolvable target" };
        const before = page.url();
        await loc.click();
        if (page.url() !== before) {
          await page.waitForLoadState("domcontentloaded");
        }
        return { ok: true };
      }
      if (request.kind === "extract") {
        const text = loc ? await loc.innerText() : await page.locator("body").innerText();
        const m = text.match(/\$[0-9,]+\.\d{2}/);
        return { ok: true, extracted: { savingsBalance: m?.[0] ?? text.slice(0, 80) } };
      }
      if (request.kind === "wait") {
        await page.waitForTimeout(50);
        return { ok: true };
      }
      return { ok: false, code: "unsupported_action", message: request.kind };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, code: "act_failed", message: message.slice(0, 240) };
    }
  }

  /** Prefer the first candidate that exists in the (optional) frame scope. */
  async resolve(target: RankedTarget): Promise<PwLocator | null> {
    const root = this.scope(target.framePath);
    for (const candidate of target.candidates) {
      const loc = this.buildLocator(root, candidate).first();
      try {
        // Bound wait so missing iframe/controls cannot hang replay or tests.
        await loc.waitFor({ state: "attached", timeout: 750 });
        return loc;
      } catch {
        continue;
      }
    }
    return null;
  }

  private scope(framePath?: string[]): QueryRoot {
    const page = this.requirePage();
    if (!framePath?.length) return page;
    let root: QueryRoot = page;
    for (const segment of framePath) {
      const sel = `iframe[title="${segment}"], iframe[name="${segment}"]`;
      root = root.frameLocator(sel);
    }
    return root;
  }

  private buildLocator(root: QueryRoot, candidate: Locator): PwLocator {
    if (candidate.kind === "css") return root.locator(candidate.selector);
    if (candidate.role === "textbox" || candidate.label) {
      return root.getByLabel(candidate.label ?? candidate.name ?? "Member ID");
    }
    if (candidate.role || candidate.name) {
      const role = (candidate.role ?? "button") as Parameters<Page["getByRole"]>[0];
      return root.getByRole(role, { name: candidate.name ?? candidate.text });
    }
    if (candidate.text) return root.getByText(candidate.text);
    return root.locator("body");
  }

  async screenshot(): Promise<Buffer> {
    return this.requirePage().screenshot({ type: "png" });
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  private requirePage(): Page {
    if (!this.page) throw new Error("WebSurface not launched");
    return this.page;
  }
}
