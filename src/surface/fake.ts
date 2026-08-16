import type { ActionKind, ActionRequest, ActionResult, Observation, Surface } from "./types.ts";

export type FakePage = {
  url: string;
  title: string;
  aria: string;
  text: string;
  fields: Record<string, string>;
};

/**
 * In-memory Surface for taxonomy / lease / replay tests. No Playwright.
 */
export class FakeSurface implements Surface {
  readonly kind = "web" as const;
  readonly sessionId: string;
  page: FakePage;
  lastAction: ActionRequest | null = null;
  closed = false;
  private gate: (req: ActionRequest) => void;

  constructor(
    sessionId: string,
    initial: FakePage,
    gate: (req: ActionRequest) => void = () => undefined,
  ) {
    this.sessionId = sessionId;
    this.page = { ...initial, fields: { ...initial.fields } };
    this.gate = gate;
  }

  async observe(): Promise<Observation> {
    return {
      url: this.page.url,
      title: this.page.title,
      ariaSnapshot: this.page.aria,
      text: this.page.text,
    };
  }

  async act(request: ActionRequest): Promise<ActionResult> {
    this.gate(request);
    this.lastAction = request;
    if (request.kind === "navigate" && request.url) {
      this.page.url = request.url;
      return { ok: true };
    }
    if (request.kind === "fill") {
      const key = request.target?.candidates[0]?.kind === "semantic"
        ? request.target.candidates[0].name ?? "input"
        : "input";
      this.page.fields[key] = request.value ?? "";
      return { ok: true };
    }
    if (request.kind === "click" || request.kind === "dismiss") {
      return { ok: true };
    }
    if (request.kind === "extract") {
      return { ok: true, extracted: { savingsBalance: "1284.50" } };
    }
    if (request.kind === "wait" || request.kind === "read") {
      return { ok: true };
    }
    return { ok: false, code: "unsupported_action", message: request.kind };
  }

  async screenshot(): Promise<Buffer> {
    return Buffer.from("fake-png");
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export function memberDeskFoundPage(): FakePage {
  return {
    url: "http://127.0.0.1:4173/member?id=12345",
    title: "Member 12345",
    aria: '- heading "Member 12345" [level=1]\n- text: "Savings balance $1,284.50"',
    text: "Member 12345 Savings balance $1,284.50",
    fields: {},
  };
}

export function memberDeskNotFoundPage(): FakePage {
  return {
    url: "http://127.0.0.1:4173/search",
    title: "Search",
    aria: '- status "No such member"\n- text: "No such member"',
    text: "No such member",
    fields: {},
  };
}

export function memberDeskSearchPage(): FakePage {
  return {
    url: "http://127.0.0.1:4173/",
    title: "MemberDesk",
    aria: '- textbox "Member ID"\n- button "Look up"',
    text: "MemberDesk Look up",
    fields: {},
  };
}

export function unusedActionKind(_k: ActionKind): void {
  /* keeps ActionKind imported for typing helpers */
}
