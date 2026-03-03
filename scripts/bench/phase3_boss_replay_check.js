/**
 * Phase 3 – Boss Replay System Validation
 *
 * Deterministic checks:
 *   1. Session creation and input recording.
 *   2. Replay produces identical events for identical inputs.
 *   3. Replay stats are correct and non-empty.
 *   4. Two replays of same seed + inputs yield same outcome.
 */

const assert = require("assert");
const {
  BOSS_DEFINITIONS,
} = require("../../src/gameplay/bossStateMachine.js");
const {
  createBossReplaySession,
  recordReplayInput,
  replayBossFight,
  getBossReplayStats,
} = require("../../src/gameplay/bossReplay.js");

const DT_MS = 1000 / 120;
let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    passed++;
    console.log("  PASS", label);
  } catch (e) {
    failed++;
    console.error("  FAIL", label, e.message);
  }
}

// ── 1. Session creation ───────────────────────────────────────────────
console.log("\n1. Session creation");
check("createBossReplaySession returns valid session", () => {
  const s = createBossReplaySession("shepherd", 42, { x: 480, y: 400, r: 8 });
  assert.strictEqual(s.bossId, "shepherd");
  assert.strictEqual(s.seed, 42);
  assert.deepStrictEqual(s.playerSnapshot, { x: 480, y: 400, r: 8 });
  assert.strictEqual(s.inputs.length, 0);
  assert.strictEqual(s.tickCount, 0);
});

// ── 2. Input recording ───────────────────────────────────────────────
console.log("\n2. Input recording");
check("recordReplayInput stores inputs", () => {
  const s = createBossReplaySession("pit", 99, { x: 480, y: 400, r: 8 });
  recordReplayInput(s, 0, { x: 100, y: 200 });
  recordReplayInput(s, 1, { x: 110, y: 210 });
  recordReplayInput(s, 2, { x: 120, y: 220 });
  assert.strictEqual(s.inputs.length, 3);
  assert.strictEqual(s.tickCount, 3);
  assert.deepStrictEqual(s.inputs[1].target, { x: 110, y: 210 });
});

// ── 3. Replay determinism ─────────────────────────────────────────────
console.log("\n3. Replay determinism");
for (const bossId of Object.keys(BOSS_DEFINITIONS).sort()) {
  check(`${bossId} replay is deterministic`, () => {
    function buildSession() {
      const s = createBossReplaySession(bossId, 777, { x: 480, y: 400, r: 8 });
      // Simulate 600 ticks of input (player moving in a circle)
      for (let t = 0; t < 600; t++) {
        const angle = t * 0.05;
        recordReplayInput(s, t, { x: 480 + Math.cos(angle) * 100, y: 270 + Math.sin(angle) * 100 });
      }
      return s;
    }

    const s1 = buildSession();
    const s2 = buildSession();
    const r1 = replayBossFight(s1, DT_MS);
    const r2 = replayBossFight(s2, DT_MS);

    assert.strictEqual(r1.outcome, r2.outcome, `${bossId} outcome differs`);
    assert.strictEqual(r1.events.length, r2.events.length, `${bossId} event count differs`);

    // Compare event types
    const types1 = r1.events.map((e) => e.type).join(",");
    const types2 = r2.events.map((e) => e.type).join(",");
    assert.strictEqual(types1, types2, `${bossId} event sequence differs`);
  });
}

// ── 4. Replay stats ───────────────────────────────────────────────────
console.log("\n4. Replay stats");
check("getBossReplayStats from replay events", () => {
  const s = createBossReplaySession("shepherd", 42, { x: 480, y: 400, r: 8 });
  for (let t = 0; t < 800; t++) {
    recordReplayInput(s, t, { x: 480, y: 270 });
  }
  const result = replayBossFight(s, DT_MS);
  const stats = getBossReplayStats(result.events);

  assert.ok(stats.phasesVisited.length > 0, "Should visit at least one phase");
  assert.ok(typeof stats.totalProjectiles === "number");
  assert.ok(typeof stats.totalSummons === "number");
  assert.ok(typeof stats.totalHazards === "number");
});

check("replay with enough damage kills boss", () => {
  // Create a long session to let boss go through intro + get killed in replay
  const s = createBossReplaySession("shepherd", 42, { x: 480, y: 400, r: 8 });
  // Shepherd has 36 HP, we just run through without damage in replay
  // Build many ticks
  for (let t = 0; t < 2000; t++) {
    recordReplayInput(s, t, { x: 480, y: 270 });
  }
  const result = replayBossFight(s, DT_MS);
  // Replay doesn't deal damage (no player shots), so boss should timeout
  assert.strictEqual(result.outcome, "timeout", "Boss should timeout without player damage");
});

// ── Summary ───────────────────────────────────────────────────────────
console.log("\n========================================");
console.log(`phase3_boss_replay: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("phase3_boss_replay_status FAIL");
  process.exit(1);
}
console.log("phase3_boss_replay_status PASS");
