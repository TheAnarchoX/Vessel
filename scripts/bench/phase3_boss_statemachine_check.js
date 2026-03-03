/**
 * Phase 3 – Boss State Machine Validation
 *
 * Deterministic checks:
 *   1. All boss definitions exist and have required structure.
 *   2. Each boss transitions through all expected phases when damaged.
 *   3. Intro/outro cinematics fire correctly with input locks.
 *   4. Attack lifecycle (telegraph→read→recover) emits proper events.
 *   5. Hazard spawns are valid and lifecycle progresses.
 *   6. Boss death triggers outro → dead flag.
 */

const assert = require("assert");
const {
  BOSS_DEFINITIONS,
  createBossState,
  updateBoss,
  damageBoss,
  getBossDebugOverlay,
} = require("../../src/gameplay/bossStateMachine.js");
const {
  createHazard,
  activateHazard,
  updateHazard,
  checkHazardCollision,
  HAZARD_TYPES,
} = require("../../src/gameplay/bossHazards.js");

const DT_MS = 1000 / 120; // 120Hz fixed step
const TARGET = { x: 400, y: 300 };
const BOUNDS = { x: 48, y: 48, w: 864, h: 444 };
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

// ── 1. Boss definition structure ──────────────────────────────────────
console.log("\n1. Boss definition structure");
const EXPECTED_BOSSES = ["shepherd", "pit", "choir"];
for (const id of EXPECTED_BOSSES) {
  check(`${id} definition exists`, () => {
    assert.ok(BOSS_DEFINITIONS[id], `Missing definition for ${id}`);
  });
  check(`${id} has phases`, () => {
    assert.ok(BOSS_DEFINITIONS[id].phases.length >= 2, `${id} needs >=2 phases`);
  });
  check(`${id} has intro/outro`, () => {
    const d = BOSS_DEFINITIONS[id];
    assert.ok(d.intro, `${id} missing intro`);
    assert.ok(d.outro, `${id} missing outro`);
    assert.ok(d.intro.durationMs > 0, `${id} intro duration >0`);
    assert.ok(d.outro.durationMs > 0, `${id} outro duration >0`);
  });
  check(`${id} has health/speed/radius`, () => {
    const d = BOSS_DEFINITIONS[id];
    assert.ok(d.health > 0);
    assert.ok(d.speed > 0);
    assert.ok(d.radius > 0);
  });
}

// ── 2. Phase transitions ──────────────────────────────────────────────
console.log("\n2. Phase transitions");
for (const id of EXPECTED_BOSSES) {
  check(`${id} transitions through all phases`, () => {
    const def = BOSS_DEFINITIONS[id];
    const boss = createBossState(def, 480, 270, 42);
    const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS };
    const allEvents = [];
    const phasesReached = new Set();

    // Advance through intro
    for (let i = 0; i < 200; i++) {
      const evts = updateBoss(boss, ctx);
      allEvents.push(...evts);
      if (boss.phaseId) phasesReached.add(boss.phaseId);
    }

    // Damage boss progressively and tick to trigger transitions
    const increment = boss.maxHealth / 20;
    for (let chunk = 0; chunk < 25; chunk++) {
      damageBoss(boss, increment);
      for (let i = 0; i < 200; i++) {
        const evts = updateBoss(boss, ctx);
        allEvents.push(...evts);
        if (boss.phaseId) phasesReached.add(boss.phaseId);
        if (boss.dead) break;
      }
      if (boss.dead) break;
    }

    // Verify all gameplay phases were visited (excluding _intro/_outro)
    const gameplayPhases = def.phases.map((p) => p.id);
    for (const gp of gameplayPhases) {
      assert.ok(phasesReached.has(gp), `${id} never reached phase ${gp}, visited: ${[...phasesReached]}`);
    }

    // Verify intro and outro were visited
    assert.ok(phasesReached.has("_intro"), `${id} never reached _intro`);
    assert.ok(phasesReached.has("_outro"), `${id} never reached _outro`);
  });
}

// ── 3. Intro/outro input locks ────────────────────────────────────────
console.log("\n3. Intro/outro input locks");
for (const id of EXPECTED_BOSSES) {
  check(`${id} intro locks input`, () => {
    const def = BOSS_DEFINITIONS[id];
    const boss = createBossState(def, 480, 270, 42);
    const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS };

    // First update should start intro with inputLocked=true
    updateBoss(boss, ctx);
    assert.strictEqual(boss.phaseId, "_intro");
    assert.strictEqual(boss.inputLocked, true);
  });

  check(`${id} intro ends and unlocks`, () => {
    const def = BOSS_DEFINITIONS[id];
    const boss = createBossState(def, 480, 270, 42);
    const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS };
    let introEnded = false;

    for (let i = 0; i < 500; i++) {
      const evts = updateBoss(boss, ctx);
      if (evts.some((e) => e.type === "intro_end")) { introEnded = true; break; }
    }
    assert.ok(introEnded, `${id} intro never ended`);
    assert.strictEqual(boss.inputLocked, false);
  });

  check(`${id} outro locks and ends`, () => {
    const def = BOSS_DEFINITIONS[id];
    const boss = createBossState(def, 480, 270, 42);
    const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS };

    // Skip intro
    for (let i = 0; i < 500; i++) { updateBoss(boss, ctx); if (!boss.inputLocked) break; }

    // Kill boss
    damageBoss(boss, boss.health + 1);
    let outroEnded = false;
    for (let i = 0; i < 500; i++) {
      const evts = updateBoss(boss, ctx);
      if (evts.some((e) => e.type === "outro_end")) { outroEnded = true; break; }
    }
    assert.ok(outroEnded, `${id} outro never ended`);
    assert.ok(boss.dead, `${id} should be dead after outro`);
  });
}

// ── 4. Attack lifecycle events ────────────────────────────────────────
console.log("\n4. Attack lifecycle events");
for (const id of EXPECTED_BOSSES) {
  check(`${id} emits attack events`, () => {
    const def = BOSS_DEFINITIONS[id];
    const boss = createBossState(def, 480, 270, 42);
    const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS };
    const allEvents = [];

    // Skip intro
    for (let i = 0; i < 500; i++) { updateBoss(boss, ctx); if (!boss.inputLocked) break; }

    // Run for enough ticks to see attacks
    for (let i = 0; i < 2000; i++) {
      const evts = updateBoss(boss, ctx);
      allEvents.push(...evts);
    }

    const hasTelegraph = allEvents.some((e) => e.type === "telegraph_start");
    const hasRead = allEvents.some((e) => e.type === "read_start");
    assert.ok(hasTelegraph, `${id} missing telegraph_start events`);
    assert.ok(hasRead, `${id} missing read_start events`);
  });
}

// ── 5. Hazard system ──────────────────────────────────────────────────
console.log("\n5. Hazard system");
for (const type of Object.keys(HAZARD_TYPES)) {
  check(`hazard type ${type} lifecycle`, () => {
    const cfg = type === "collapsing_zone"
      ? { rect: { x: 200, y: 200, w: 100, h: 100 }, warnMs: 300, collapseMs: 500 }
      : type === "arena_confinement"
        ? { roomBounds: { x: 0, y: 0, w: 960, h: 540 }, initialMargin: 0 }
        : { x: 200, y: 200, radius: 50, warnMs: 300, activeMs: 500 };
    const h = createHazard(type, cfg);
    assert.strictEqual(h.state, "pending");

    // Activate → warn
    activateHazard(h);
    assert.strictEqual(h.state, "warn");

    if (type === "arena_confinement") {
      // Arena confinement goes warn→active immediately on first update
      updateHazard(h, 100);
      assert.strictEqual(h.state, "active");
    } else {
      // Still warning
      updateHazard(h, 100);
      assert.strictEqual(h.state, "warn");

      // Transition to active
      updateHazard(h, 300);
      assert.strictEqual(h.state, "active");

      // Still active
      updateHazard(h, 100);
      assert.strictEqual(h.state, "active");

      if (type !== "collapsing_zone") {
        // Transition to expired (collapsing_zone is permanent by default)
        updateHazard(h, 500);
        assert.strictEqual(h.state, "expired");
      }
    }
  });
}

check("hazard collision detection", () => {
  const h = createHazard("damage_sigil", { x: 100, y: 100, radius: 50, warnMs: 100, activeMs: 500 });
  activateHazard(h);
  updateHazard(h, 150); // Active
  const result = checkHazardCollision(h, { x: 110, y: 110, r: 10 });
  assert.ok(result.hit, "Player inside hazard should be hit");
  assert.ok(result.damage > 0, "Hazard should deal damage");

  const miss = checkHazardCollision(h, { x: 500, y: 500, r: 10 });
  assert.ok(!miss.hit, "Player outside hazard should not be hit");
});

// ── 6. Debug overlay ──────────────────────────────────────────────────
console.log("\n6. Debug overlay");
check("getBossDebugOverlay returns valid info", () => {
  const def = BOSS_DEFINITIONS.shepherd;
  const boss = createBossState(def, 480, 270, 42);
  const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS };
  for (let i = 0; i < 200; i++) updateBoss(boss, ctx);

  const dbg = getBossDebugOverlay(boss);
  assert.ok(dbg.id, "debug overlay should have id");
  assert.ok(dbg.phaseId != null, "debug overlay should have phaseId");
  assert.ok(dbg.health != null, "debug overlay should have health");
});

// ── 7. Determinism ────────────────────────────────────────────────────
console.log("\n7. Determinism");
check("same seed produces identical results", () => {
  function runBoss(seed) {
    const def = BOSS_DEFINITIONS.pit;
    const boss = createBossState(def, 480, 270, seed);
    const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS };
    const log = [];
    for (let i = 0; i < 600; i++) {
      const evts = updateBoss(boss, ctx);
      for (const e of evts) log.push(e.type + (e.phaseId || ""));
    }
    return { x: boss.x, y: boss.y, hp: boss.hp, log: log.join(",") };
  }
  const a = runBoss(999);
  const b = runBoss(999);
  assert.strictEqual(a.x, b.x, "X should be deterministic");
  assert.strictEqual(a.y, b.y, "Y should be deterministic");
  assert.strictEqual(a.hp, b.hp, "HP should be deterministic");
  assert.strictEqual(a.log, b.log, "Event log should be deterministic");
});

// ── Summary ───────────────────────────────────────────────────────────
console.log("\n========================================");
console.log(`phase3_boss_statemachine: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("phase3_boss_statemachine_status FAIL");
  process.exit(1);
}
console.log("phase3_boss_statemachine_status PASS");
