/* global require */

const test = require("node:test");
const assert = require("node:assert/strict");

const cs = require("../../src/gameplay/corruptionSystem.js");

function drive(actions) {
  const state = cs.createCorruptionState();
  for (const action of actions) {
    if (action.type === "delta") {
      cs.applyCorruptionDelta(state, action.source, action.delta ?? null, action.tick);
    } else if (action.type === "confession") {
      cs.processConfession(state, action.choice, action.floor, action.tick);
    } else if (action.type === "relic") {
      cs.pickUpRelic(state, action.relicId, action.tick);
    }
  }
  return state;
}

test("phase11 route enters and locks demonic path deterministically", () => {
  const state = drive([
    { type: "delta", source: "floor_descent", tick: 1000 },
    { type: "confession", choice: "yield", floor: 1, tick: 1500 },
    { type: "relic", relicId: "bone_idol", tick: 1700 },
    { type: "confession", choice: "yield", floor: 2, tick: 2500 },
    { type: "relic", relicId: "worm_heart", tick: 2700 },
    { type: "relic", relicId: "black_scripture", tick: 2900 },
    { type: "confession", choice: "resist", floor: 3, tick: 3500 },
    { type: "relic", relicId: "saints_finger", tick: 3700 },
    { type: "relic", relicId: "blessed_water", tick: 3900 },
    { type: "confession", choice: "resist", floor: 4, tick: 4100 },
    { type: "delta", source: "item_pickup", delta: -30, tick: 4300 },
  ]);

  assert.equal(state.route.current, "demonic");
  assert.equal(state.route.locked, true);
  assert.ok(state.route.preventedSwitches >= 1);

  const lockEvent = state.route.history.find((entry) => entry.type === "lock");
  assert.ok(lockEvent);
});

test("phase11 route enters and locks ascetic path deterministically", () => {
  const state = drive([
    { type: "delta", source: "floor_descent", tick: 1000 },
    { type: "confession", choice: "resist", floor: 1, tick: 1500 },
    { type: "relic", relicId: "saints_finger", tick: 1700 },
    { type: "confession", choice: "resist", floor: 2, tick: 2500 },
    { type: "relic", relicId: "blessed_water", tick: 2700 },
    { type: "confession", choice: "resist", floor: 3, tick: 3500 },
    { type: "relic", relicId: "bone_idol", tick: 3700 },
    { type: "confession", choice: "yield", floor: 4, tick: 3900 },
    { type: "relic", relicId: "black_scripture", tick: 4100 },
    { type: "confession", choice: "yield", floor: 5, tick: 4300 },
    { type: "delta", source: "item_pickup", delta: 80, tick: 4500 },
  ]);

  assert.equal(state.route.current, "ascetic");
  assert.equal(state.route.locked, true);
  assert.ok(state.route.preventedSwitches >= 1);
});

test("phase11 route replay logs are deterministic", () => {
  const actions = [
    { type: "delta", source: "floor_descent", tick: 1000 },
    { type: "confession", choice: "yield", floor: 1, tick: 1500 },
    { type: "relic", relicId: "bone_idol", tick: 1700 },
    { type: "confession", choice: "yield", floor: 2, tick: 2500 },
    { type: "relic", relicId: "worm_heart", tick: 2700 },
  ];

  const runA = drive(actions);
  const runB = drive(actions);

  assert.equal(JSON.stringify(runA.route.history), JSON.stringify(runB.route.history));
  assert.equal(runA.level, runB.level);
  assert.equal(runA.route.current, runB.route.current);
});
