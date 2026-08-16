import type { LeaseOwner } from "../surface/types.ts";

export type TransitionReason =
  | "risky_action_confirmation"
  | "unknown_state"
  | "policy_denied_in_discovery"
  | "budget_exhausted"
  | "loop_detected"
  | "operator_claimed"
  | "operator_resumed"
  | "operator_aborted"
  | "intervention_expired"
  | "mock_handoff";

export interface LeaseTransition {
  at: string;
  from: LeaseOwner;
  to: LeaseOwner;
  reason: TransitionReason;
  requestedBy: "automation" | "operator" | "system";
  interventionId: string | null;
}

const LEGAL: Record<LeaseOwner, LeaseOwner[]> = {
  automation: ["transitioning_to_human"],
  transitioning_to_human: ["human"],
  human: ["transitioning_to_automation"],
  transitioning_to_automation: ["automation", "transitioning_to_human"],
};

export class LeaseViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeaseViolation";
  }
}

export class SessionLease {
  private current: LeaseOwner = "automation";
  private readonly log: LeaseTransition[] = [];

  owner(): LeaseOwner {
    return this.current;
  }

  assertAutomationMayAct(): void {
    if (this.current !== "automation") {
      throw new LeaseViolation(`automation cannot act while owner=${this.current}`);
    }
  }

  assertHumanMayAct(): void {
    if (this.current !== "human") {
      throw new LeaseViolation(`human cannot act while owner=${this.current}`);
    }
  }

  transition(
    to: LeaseOwner,
    reason: TransitionReason,
    by: LeaseTransition["requestedBy"],
    interventionId: string | null = null,
  ): LeaseTransition {
    const allowed = LEGAL[this.current];
    if (!allowed.includes(to)) {
      throw new LeaseViolation(`illegal lease ${this.current} → ${to}`);
    }
    const event: LeaseTransition = {
      at: new Date().toISOString(),
      from: this.current,
      to,
      reason,
      requestedBy: by,
      interventionId,
    };
    this.current = to;
    this.log.push(event);
    return event;
  }

  history(): readonly LeaseTransition[] {
    return this.log;
  }
}
