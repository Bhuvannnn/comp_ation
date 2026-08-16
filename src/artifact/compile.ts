import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  computeContractHash,
  type Capability,
  CAPABILITY_SCHEMA_VERSION,
} from "./schema.ts";

/** Compile a successful lookup trajectory into a reviewable capability (not a transcript). */
export function compileSavingsLookupCapability(): Capability {
  const draft: Omit<Capability, "contractHash"> = {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    capabilityId: "memberdesk.savings_balance_lookup",
    capabilityVersion: "1.0.0",
    status: "draft",
    provenance: {
      recordedAt: "2026-08-16T00:00:00.000Z",
      source: "handwritten_fixture",
      notes: "Compiled from the mock/live discovery path for MemberDesk lookup.",
    },
    surface: { kind: "web", binding: "playwright-chromium" },
    app: { family: "memberdesk", variant: "local-v1" },
    contract: {
      summary: "Look up a synthetic member and return the displayed savings balance.",
      params: [
        {
          name: "memberId",
          type: "string",
          required: true,
          sensitivity: "internal",
          description: "Synthetic five-digit member identifier.",
          exampleSynthetic: "12345",
        },
      ],
      outputs: [
        {
          name: "savingsBalance",
          type: "currency",
          nullable: true,
          sensitivity: "internal",
          description: "Displayed savings balance when the member exists.",
        },
      ],
      results: {
        success: { description: "Member found and balance extracted.", outputs: ["savingsBalance"] },
        businessOutcomes: [
          {
            code: "member_not_found",
            description: "Search completed; MemberDesk reported no such member.",
            outputs: [],
            rationale: "A valid lookup with an unknown id is a domain result, not an automation crash.",
          },
          {
            code: "permission_denied",
            description: "Operator is not allowed to view this member.",
            outputs: [],
            rationale: "Access denial is a legitimate servicing outcome.",
          },
        ],
      },
      successCondition: { kind: "textMatches", needle: "Savings balance" },
    },
    entrypoint: { originAlias: "memberdesk", path: "/" },
    steps: [
      {
        id: "open",
        action: "navigate",
        url: "http://127.0.0.1:4173/",
        checkpoint: { kind: "textMatches", needle: "MemberDesk" },
      },
      {
        id: "fill_id",
        action: "fill",
        target: { candidates: [{ kind: "semantic", role: "textbox", name: "Member ID" }] },
        value: { kind: "param", name: "memberId" },
      },
      {
        id: "submit_search",
        action: "click",
        target: { candidates: [{ kind: "semantic", role: "button", name: "Look up" }] },
        on: [
          {
            detect: { kind: "textMatches", needle: "No such member" },
            outcome: "business_outcome",
            code: "member_not_found",
          },
          {
            detect: { kind: "textMatches", needle: "Access denied" },
            outcome: "business_outcome",
            code: "permission_denied",
          },
          {
            detect: { kind: "textMatches", needle: "Session notice" },
            outcome: "recoverable",
            recoverableId: "session_notice",
          },
        ],
      },
      {
        id: "read_balance",
        action: "extract",
        target: { candidates: [{ kind: "semantic", role: "status", name: "Savings balance" }] },
        extract: { outputName: "savingsBalance", from: "text", pattern: "\\$[0-9,]+\\.\\d{2}" },
        checkpoint: { kind: "textMatches", needle: "Savings balance" },
      },
    ],
    knownRecoverables: [
      {
        id: "session_notice",
        description: "Dismiss the known interstitial before continuing.",
        detect: { kind: "textMatches", needle: "Session notice" },
        handle: "dismiss",
        maxAttempts: 1,
      },
    ],
    policyRef: { id: "policy/memberdesk@1" },
  };
  return { ...draft, contractHash: computeContractHash(draft) };
}

export function writeCapability(path: string, cap: Capability): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cap, null, 2)}\n`);
}
