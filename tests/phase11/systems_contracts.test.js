/* global require */

const test = require("node:test");
const assert = require("node:assert/strict");

const cs = require("../../src/gameplay/corruptionSystem.js");
const afflictions = require("../../src/gameplay/roomAfflictionSystem.js");
const echoes = require("../../src/gameplay/narrativeEchoSystem.js");

function buildRouteSnapshot(choiceType) {
  const state = cs.createCorruptionState();
  if (choiceType === "demonic") {
    cs.processConfession(state, "yield", 1, 100);
    cs.pickUpRelic(state, "bone_idol", 200);
    cs.processConfession(state, "yield", 2, 300);
    cs.pickUpRelic(state, "worm_heart", 400);
    cs.pickUpRelic(state, "black_scripture", 500);
  } else {
    cs.processConfession(state, "resist", 1, 100);
    cs.pickUpRelic(state, "saints_finger", 200);
    cs.processConfession(state, "resist", 2, 300);
    cs.pickUpRelic(state, "blessed_water", 400);
    cs.processConfession(state, "resist", 3, 500);
  }
  return cs.getRouteSnapshot(state);
}

const rooms = [
  { id: "r0", x: 2, y: 2, type: "start" },
  { id: "r1", x: 2, y: 1, type: "combat" },
  { id: "r2", x: 3, y: 1, type: "combat" },
  { id: "r3", x: 3, y: 2, type: "altar" },
  { id: "r4", x: 3, y: 3, type: "boss" },
  { id: "r5", x: 2, y: 3, type: "confession" },
  { id: "r6", x: 1, y: 3, type: "rest" },
  { id: "r7", x: 1, y: 2, type: "reliquary" },
];

test("phase11 system contracts for afflictions validate", () => {
  const verdict = afflictions.validateAfflictionContracts();
  assert.equal(verdict.valid, true);
});

test("phase11 room affliction plans are deterministic and route-sensitive", () => {
  const demonicRoute = buildRouteSnapshot("demonic");
  const asceticRoute = buildRouteSnapshot("ascetic");

  const demonicA = afflictions.createAfflictionPlan({ seed: 4242, floor: 2, routeId: demonicRoute.current, rooms });
  const demonicB = afflictions.createAfflictionPlan({ seed: 4242, floor: 2, routeId: demonicRoute.current, rooms });
  const ascetic = afflictions.createAfflictionPlan({ seed: 4242, floor: 2, routeId: asceticRoute.current, rooms });

  assert.equal(JSON.stringify(demonicA), JSON.stringify(demonicB));
  assert.notEqual(JSON.stringify(demonicA.afflictions), JSON.stringify(ascetic.afflictions));
  assert.ok(demonicA.roomAssignments.length > 0);
});

test("phase11 narrative echo ledger is deterministic and route-aware", () => {
  const state = echoes.createNarrativeEchoState();
  const route = buildRouteSnapshot("demonic");

  echoes.recordEchoEvent(state, "confession_yield", { floor: 1 }, 1000);
  echoes.recordEchoEvent(state, "relic_dark", { relicId: "bone_idol" }, 1100);
  echoes.recordEchoEvent(state, "tier_shift", { toTier: "corrupt" }, 1200);

  const profile = echoes.createEchoProfile(state, route);
  const lineA = echoes.selectEchoLine(state, route, 9090);
  const lineB = echoes.selectEchoLine(state, route, 9090);

  assert.equal(profile.dominantRoute, "demonic");
  assert.equal(lineA.line, lineB.line);

  const delta = echoes.createEndingEchoDelta(state, route, "consumed");
  assert.equal(delta.route, "demonic");
});
