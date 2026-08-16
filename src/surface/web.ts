import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { ActionRequest, ActionResult, Observation, Surface } from "./types.ts";
import type { SessionLease } from "../hitl/lease.ts";
import { assertAllowed, type PolicyConfig } from "../policy/engine.ts";
import type { Locator, RankedTarget } from "./types.ts";

export class WebSurface implements Surface {
  readonly kind = "web" as const;
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
    const origin = this.page ? new URL(this.page.url()).origin : undefined;
    const decision = assertAllowed(request, this.policy, origin);
    if (decision.verdict === "deny") {
      return { ok: false, code: "policy_denied", message: decision.reason };
    }
    if (decision.verdict === "escalate") {
      return { ok: false, code: "policy_escalate", message: decision.reason };
    }
    const page = this.requirePage();
    if (request.kind === "navigate" && request.url) {
      await page.goto(request.url, { waitUntil: "domcontentloaded" });
      return { ok: true };
    }
    const loc = request.target ? this.resolve(request.target) : null;
    if (request.kind === "fill") {
      if (!loc) return { ok: false, code: "no_target", message: "fill requires target" };
      await loc.fill(request.value ?? "");
      return { ok: true };
    }
    if (request.kind === "click" || request.kind === "dismiss") {
      if (!loc) return { ok: false, code: "no_target", message: "click requires target" };
      await loc.click();
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
  }

  resolve(target: RankedTarget) {
    const page = this.requirePage();
    for (const candidate of target.candidates) {
      const loc = this.locator(page, candidate);
      return loc.first();
    }
    throw new Error("no candidates");
  }

  private locator(page: Page, candidate: Locator) {
    if (candidate.kind === "css") return page.locator(candidate.selector);
    if (candidate.role === "textbox" || candidate.label) {
      return page.getByLabel(candidate.label ?? candidate.name ?? "Member ID");
    }
    if (candidate.role === "button" || candidate.name) {
      return page.getByRole((candidate.role as "button") ?? "button", {
        name: candidate.name ?? candidate.text,
      });
    }
    if (candidate.text) return page.getByText(candidate.text);
    return page.locator("body");
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
