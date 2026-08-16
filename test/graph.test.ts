import assert from "node:assert/strict";
import { test } from "node:test";
import { nextNode, REPLAY_EDGES, DISCOVERY_EDGES } from "../src/graph/machine.ts";

test("replay graph has no invented edges", () => {
  assert.equal(nextNode(REPLAY_EDGES, "act", "acted"), "checkpoint");
  assert.equal(nextNode(DISCOVERY_EDGES, "decide", "proposed_action"), "policy_check");
  assert.throws(() => nextNode(REPLAY_EDGES, "act", "teleport"));
});
