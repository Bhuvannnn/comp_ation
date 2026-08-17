import { FakeSurface, type FakePage } from "./fake.ts";
import { MEMBERS } from "../target/memberdesk/server.ts";
import type { ActionRequest, ActionResult } from "./types.ts";
import type { SessionLease } from "../hitl/lease.ts";
import { assertAllowed, type PolicyConfig } from "../policy/engine.ts";

function searchPage(): FakePage {
  return {
    url: "http://127.0.0.1:4173/",
    title: "MemberDesk",
    aria: '- textbox "Member ID"\n- button "Look up"',
    text: "MemberDesk Look up",
    fields: {},
  };
}

function notFoundPage(): FakePage {
  return {
    url: "http://127.0.0.1:4173/search",
    title: "Search",
    aria: '- status "No such member"',
    text: "No such member",
    fields: {},
  };
}

function deniedPage(): FakePage {
  return {
    url: "http://127.0.0.1:4173/search",
    title: "Search",
    aria: '- status "Access denied"',
    text: "Access denied",
    fields: {},
  };
}

function noticePage(id: string): FakePage {
  return {
    url: `http://127.0.0.1:4173/search?memberId=${id}&fault=interstitial`,
    title: "MemberDesk",
    aria: '- dialog "Session notice"\n- button "Dismiss"',
    text: "Session notice: please acknowledge to continue.",
    fields: { "Member ID": id },
  };
}

function unexpectedConfirmPage(id: string): FakePage {
  return {
    url: `http://127.0.0.1:4173/search?memberId=${id}&fault=unexpected`,
    title: "MemberDesk",
    aria: '- dialog "Unexpected confirmation"\n- button "Confirm"\n- button "Cancel"',
    text: "Confirm sub-account transfer? This action cannot be undone.",
    fields: { "Member ID": id },
  };
}

function memberPage(id: string, savings: string, name: string): FakePage {
  return {
    url: `http://127.0.0.1:4173/member?id=${id}`,
    title: `Member ${id}`,
    aria: `- heading "Member ${id}"\n- status "Savings balance"`,
    text: `Member ${id} ${name} Savings balance ${savings}`,
    fields: {},
  };
}

export class MemberDeskFakeSurface extends FakeSurface {
  injectInterstitial = false;
  injectUnexpectedConfirm = false;
  private memberId = "";
  private readonly lease: SessionLease;
  private readonly policy: PolicyConfig;

  constructor(lease: SessionLease, policy: PolicyConfig) {
    super("memberdesk-fake", searchPage());
    this.lease = lease;
    this.policy = policy;
  }

  override async act(request: ActionRequest): Promise<ActionResult> {
    this.lease.assertAutomationMayAct();
    const decision = assertAllowed(request, this.policy, "http://127.0.0.1:4173");
    if (decision.verdict === "deny") {
      return { ok: false, code: "policy_denied", message: decision.reason };
    }
    if (decision.verdict === "escalate") {
      return { ok: false, code: "policy_escalate", message: decision.reason };
    }

    const result = await super.act(request);
    if (request.kind === "navigate") {
      this.page = searchPage();
      return { ok: true };
    }
    if (request.kind === "fill") {
      this.memberId = request.value ?? "";
      this.page.fields["Member ID"] = this.memberId;
      return { ok: true };
    }
    if (request.kind === "dismiss") {
      this.injectInterstitial = false;
      return this.lookup();
    }
    if (request.kind === "click") {
      if (this.page.text.includes("Session notice")) {
        return this.lookup();
      }
      if (this.injectInterstitial) {
        this.page = noticePage(this.memberId);
        return { ok: true };
      }
      if (this.injectUnexpectedConfirm || this.memberId === "77777") {
        this.page = unexpectedConfirmPage(this.memberId || "77777");
        return { ok: true };
      }
      return this.lookup();
    }
    if (request.kind === "extract") {
      const m = this.page.text.match(/\$[0-9,]+\.\d{2}/);
      return { ok: true, extracted: { savingsBalance: m?.[0] ?? "" } };
    }
    return result;
  }

  private lookup(): ActionResult {
    const id = this.memberId;
    const member = MEMBERS[id];
    if (!member) {
      this.page = notFoundPage();
      return { ok: true };
    }
    if (!member.permission) {
      this.page = deniedPage();
      return { ok: true };
    }
    this.page = memberPage(id, member.savings, member.name);
    return { ok: true };
  }
}
