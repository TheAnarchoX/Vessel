/* global require */

const test = require("node:test");
const assert = require("node:assert/strict");

const { runPhase10Telemetry } = require("./harness.js");
const phase10Result = runPhase10Telemetry();

test("phase10 telemetry loops satisfy QA/balance gates", () => {
  assert.equal(phase10Result.failures.length, 0, phase10Result.failures.join("; "));
});

test("phase10 combat telemetry reports positive TTK and DPS", () => {
  const combat = phase10Result.telemetry.combat;

  for (const value of Object.values(combat.incomingDpsByBehavior)) {
    assert.ok(value >= 0, "incoming DPS must be non-negative");
  }

  for (const value of Object.values(combat.ttkSecByBehavior)) {
    assert.ok(value > 0, "TTK must be positive");
  }
});

test("phase10 generation telemetry has zero invalid floors", () => {
  const metrics = phase10Result.telemetry.generation.floorMetrics;

  for (const floor of metrics) {
    assert.equal(floor.invalidCount, 0, "invalid floor count must be zero");
  }
});

test("phase10 save migration remains forward-compatible", () => {
  const data = phase10Result.telemetry.determinism;

  assert.equal(data.saveMigratedVersion, data.saveVersion);
  assert.equal(data.saveIdempotentVersion, data.saveVersion);
  assert.equal(data.discoveredEndingsPreserved, true);
});
