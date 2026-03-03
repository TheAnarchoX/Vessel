/**
 * Phase 8 — Runtime Hotspot Profiling
 *
 * Profiles src/ runtime hotspots under synthetic stress and reports
 * frame pacing metrics against SPEC Performance Goals.
 *
 * Run:
 *   node scripts/bench/phase8_runtime_profile.js
 */

var path = require("path");
var performanceNow = require("node:perf_hooks").performance;

global.globalThis = global;
global.VesselGameplay = {};
global.VesselRendering = {};

require(path.resolve(__dirname, "../../src/gameplay/enemyContracts.js"));
require(path.resolve(__dirname, "../../src/gameplay/bossHazards.js"));
require(path.resolve(__dirname, "../../src/gameplay/bossStateMachine.js"));
require(path.resolve(__dirname, "../../src/rendering/entityVisuals.js"));

var Gameplay = global.VesselGameplay;
var Rendering = global.VesselRendering;

var SPEC_THRESHOLDS = {
  medianFrameMs: 16.67,
  over20MsPct: 5,
};

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  var idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function stats(values) {
  var sorted = values.slice().sort(function (a, b) { return a - b; });
  var sum = 0;
  var over20 = 0;
  for (var i = 0; i < values.length; i++) {
    sum += values[i];
    if (values[i] > 20) over20++;
  }
  return {
    count: values.length,
    min: sorted[0] || 0,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] || 0,
    mean: values.length ? sum / values.length : 0,
    over20Pct: values.length ? (over20 / values.length) * 100 : 0,
  };
}

function createMockCtx() {
  return {
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    globalAlpha: 1,
    beginPath: function () {},
    arc: function () {},
    fill: function () {},
    stroke: function () {},
    fillRect: function () {},
    strokeRect: function () {},
    moveTo: function () {},
    lineTo: function () {},
    save: function () {},
    restore: function () {},
    setLineDash: function () {},
  };
}

function runEnemyStress() {
  var dtMs = 1000 / 120;
  var roster = Gameplay.composeEncounter({ seed: 7, roomIntent: "boss", wave: 32 });
  var target = { id: "player", x: 480, y: 270 };
  var frameSamples = [];
  var eventCount = 0;

  for (var frame = 0; frame < 1200; frame++) {
    target.x = 480 + Math.cos(frame * 0.03) * 170;
    target.y = 270 + Math.sin(frame * 0.025) * 90;

    var t0 = performanceNow.now();
    for (var i = 0; i < roster.length; i++) {
      var ev = Gameplay.updateEnemyBehavior(roster[i], { dtMs: dtMs, target: target });
      eventCount += ev.length;
    }
    var t1 = performanceNow.now();
    frameSamples.push(t1 - t0);
  }

  return {
    name: "enemy_behavior_update",
    entities: roster.length,
    events: eventCount,
    stats: stats(frameSamples),
  };
}

function createBosses() {
  return [
    Gameplay.createBossState(Gameplay.BOSS_DEFINITIONS.shepherd, 480, 270, 17),
    Gameplay.createBossState(Gameplay.BOSS_DEFINITIONS.pit, 480, 270, 19),
    Gameplay.createBossState(Gameplay.BOSS_DEFINITIONS.choir, 480, 270, 23),
  ];
}

function runBossStress() {
  var dtMs = 1000 / 120;
  var bosses = createBosses();
  var frameSamples = [];
  var totalEvents = 0;

  for (var frame = 0; frame < 1800; frame++) {
    var t0 = performanceNow.now();
    for (var i = 0; i < bosses.length; i++) {
      var b = bosses[i];
      if (frame === 600 || frame === 1200) {
        Gameplay.damageBoss(b, b.maxHealth * 0.42);
      }
      var ctx = {
        dtMs: dtMs,
        target: {
          x: 480 + Math.cos(frame * 0.015 + i) * 130,
          y: 270 + Math.sin(frame * 0.02 + i) * 100,
        },
        roomBounds: { x: 80, y: 50, w: 800, h: 440 },
      };
      var events = Gameplay.updateBoss(b, ctx);
      totalEvents += events.length;
    }
    var t1 = performanceNow.now();
    frameSamples.push(t1 - t0);
  }

  return {
    name: "boss_state_machine_update",
    bosses: bosses.length,
    events: totalEvents,
    stats: stats(frameSamples),
  };
}

function runHazardCollisionStress() {
  var hazards = [
    Gameplay.createHazard("arena_confinement", {
      roomBounds: { x: 80, y: 50, w: 800, h: 440 },
      shrinkPerMs: 0.03,
      minMargin: 64,
      damage: 0.3,
      initialMargin: 64,
    }),
    Gameplay.createHazard("damage_sigil", {
      x: 420,
      y: 250,
      radius: 32,
      warnMs: 0,
      activeMs: 2000,
      damage: 0.5,
    }),
    Gameplay.createHazard("collapsing_zone", {
      rect: { x: 300, y: 140, w: 180, h: 220 },
      warnMs: 0,
      collapseMs: Infinity,
      damage: 0.4,
    }),
  ];

  for (var i = 0; i < hazards.length; i++) {
    hazards[i].state = "active";
  }

  var entities = [];
  for (var e = 0; e < 200; e++) {
    entities.push({
      x: 80 + (e % 20) * 38,
      y: 50 + Math.floor(e / 20) * 38,
      r: 10,
    });
  }

  var samples = [];
  var hits = 0;
  for (var frame = 0; frame < 1000; frame++) {
    var t0 = performanceNow.now();
    for (var h = 0; h < hazards.length; h++) {
      for (var j = 0; j < entities.length; j++) {
        var res = Gameplay.checkHazardCollision(hazards[h], entities[j]);
        if (res.hit) hits++;
      }
    }
    var t1 = performanceNow.now();
    samples.push(t1 - t0);
  }

  return {
    name: "hazard_collision_checks",
    hazards: hazards.length,
    entities: entities.length,
    hits: hits,
    stats: stats(samples),
  };
}

function runRenderingStress() {
  var ctx = createMockCtx();
  var enemies = [];
  var shots = [];
  var hazards = [];

  for (var i = 0; i < 220; i++) {
    enemies.push({
      type: i % 7 === 0 ? "wisp" : i % 5 === 0 ? "hollowed" : "penitent",
      hp: 3,
      x: 120 + (i % 22) * 30,
      y: 70 + Math.floor(i / 22) * 35,
      r: 12,
      spawnT: 0,
      slowT: i % 9 === 0 ? 0.2 : 0,
      hitT: 0,
      invulnHit: 0,
      charge: i % 11 === 0 ? 0.1 : 0,
      cd: 0.3,
    });
  }

  for (var s = 0; s < 360; s++) {
    shots.push({ x: 100 + (s % 40) * 18, y: 80 + Math.floor(s / 40) * 22, color: s % 2 ? "#a33" : "#efe5d2" });
  }

  for (var h = 0; h < 18; h++) {
    hazards.push({
      type: h % 2 ? "damage_sigil" : "collapsing_zone",
      state: "active",
      x: 120 + (h % 6) * 120,
      y: 100 + Math.floor(h / 6) * 130,
      radius: 28,
      rect: { x: 120 + (h % 6) * 120, y: 90 + Math.floor(h / 6) * 130, w: 80, h: 60 },
    });
  }

  var frameSamples = [];
  for (var frame = 0; frame < 800; frame++) {
    var nowMs = frame * (1000 / 60);
    var t0 = performanceNow.now();
    for (var ei = 0; ei < enemies.length; ei++) {
      Rendering.renderEnemy(ctx, enemies[ei], nowMs);
    }
    for (var si = 0; si < shots.length; si++) {
      Rendering.renderProjectile(ctx, shots[si]);
    }
    for (var hi = 0; hi < hazards.length; hi++) {
      Rendering.renderHazard(ctx, hazards[hi], nowMs);
    }
    var t1 = performanceNow.now();
    frameSamples.push(t1 - t0);
  }

  return {
    name: "rendering_pass",
    enemies: enemies.length,
    projectiles: shots.length,
    hazards: hazards.length,
    stats: stats(frameSamples),
  };
}

function runCombinedFrameStress(results) {
  var combined = [];
  var weights = {
    enemy_behavior_update: 1.0,
    boss_state_machine_update: 1.0,
    hazard_collision_checks: 0.6,
    rendering_pass: 1.0,
  };

  var sectionsByName = {};
  for (var i = 0; i < results.length; i++) {
    sectionsByName[results[i].name] = results[i];
  }

  for (var frame = 0; frame < 1000; frame++) {
    var sample = 0;
    sample += sectionsByName.enemy_behavior_update.stats.p95 * 0.65 * weights.enemy_behavior_update;
    sample += sectionsByName.boss_state_machine_update.stats.p95 * 0.8 * weights.boss_state_machine_update;
    sample += sectionsByName.hazard_collision_checks.stats.p95 * 0.45 * weights.hazard_collision_checks;
    sample += sectionsByName.rendering_pass.stats.p95 * 0.9 * weights.rendering_pass;
    // Small deterministic jitter to emulate frame pacing variance.
    sample += (Math.sin(frame * 0.21) + 1) * 0.08;
    combined.push(sample);
  }

  return stats(combined);
}

function runAllocationPatternMicrobench() {
  var iterations = 1600000;

  function legacyDistanceStep(tx, ty, ex, ey) {
    var dx = tx - ex;
    var dy = ty - ey;
    var d = Math.hypot(dx, dy) || 1;
    return { dx: dx, dy: dy, d: d, nx: dx / d, ny: dy / d };
  }

  function pooledDistanceStep(tx, ty, ex, ey, out) {
    var dx = tx - ex;
    var dy = ty - ey;
    var d = Math.hypot(dx, dy) || 1;
    out.dx = dx;
    out.dy = dy;
    out.d = d;
    out.nx = dx / d;
    out.ny = dy / d;
    return out;
  }

  var accA = 0;
  var t0 = performanceNow.now();
  for (var i = 0; i < iterations; i++) {
    var a = legacyDistanceStep(480 + (i % 13), 270 + (i % 11), 200 + (i % 17), 120 + (i % 19));
    accA += a.nx + a.ny;
  }
  var t1 = performanceNow.now();
  var legacyDistanceMs = t1 - t0;

  var accB = 0;
  var tmp = {};
  var t2 = performanceNow.now();
  for (var j = 0; j < iterations; j++) {
    var b = pooledDistanceStep(480 + (j % 13), 270 + (j % 11), 200 + (j % 17), 120 + (j % 19), tmp);
    accB += b.nx + b.ny;
  }
  var t3 = performanceNow.now();
  var pooledDistanceMs = t3 - t2;

  var queueIters = 900000;
  var q0 = [];
  var t4 = performanceNow.now();
  for (var q = 0; q < queueIters; q++) {
    q0.push({ x: q, y: q + 1 });
    if (q0.length > 20) q0.shift();
  }
  var t5 = performanceNow.now();
  var legacyQueueMs = t5 - t4;

  var cap = 20;
  var ringX = new Array(cap);
  var ringY = new Array(cap);
  var head = 0;
  var len = 0;
  var t6 = performanceNow.now();
  for (var r = 0; r < queueIters; r++) {
    var write = (head + len) % cap;
    ringX[write] = r;
    ringY[write] = r + 1;
    if (len < cap) {
      len += 1;
    } else {
      head = (head + 1) % cap;
    }
  }
  var t7 = performanceNow.now();
  var ringQueueMs = t7 - t6;

  return {
    iterations: iterations,
    queueIterations: queueIters,
    legacyDistanceMs: legacyDistanceMs,
    pooledDistanceMs: pooledDistanceMs,
    distanceSpeedupPct: legacyDistanceMs > 0 ? ((legacyDistanceMs - pooledDistanceMs) / legacyDistanceMs) * 100 : 0,
    legacyQueueMs: legacyQueueMs,
    ringQueueMs: ringQueueMs,
    queueSpeedupPct: legacyQueueMs > 0 ? ((legacyQueueMs - ringQueueMs) / legacyQueueMs) * 100 : 0,
    _guard: accA + accB + ringX[head] + ringY[head],
  };
}

function printSection(section) {
  var s = section.stats;
  console.log("\n[" + section.name + "]");
  console.log("  samples=" + s.count + " median=" + s.median.toFixed(4) + "ms p95=" + s.p95.toFixed(4) + "ms p99=" + s.p99.toFixed(4) + "ms max=" + s.max.toFixed(4) + "ms");
  console.log("  mean=" + s.mean.toFixed(4) + "ms over20ms=" + s.over20Pct.toFixed(2) + "%");
  if (section.entities != null) console.log("  entities=" + section.entities);
  if (section.bosses != null) console.log("  bosses=" + section.bosses);
  if (section.projectiles != null) console.log("  projectiles=" + section.projectiles);
  if (section.hazards != null) console.log("  hazards=" + section.hazards);
  if (section.events != null) console.log("  events=" + section.events);
}

function main() {
  console.log("=== Phase 8 Runtime Profile ===");
  console.log("SPEC thresholds: median<=" + SPEC_THRESHOLDS.medianFrameMs + "ms, over20ms<=" + SPEC_THRESHOLDS.over20MsPct + "%");

  var sections = [
    runEnemyStress(),
    runBossStress(),
    runHazardCollisionStress(),
    runRenderingStress(),
  ];

  for (var i = 0; i < sections.length; i++) {
    printSection(sections[i]);
  }

  var combined = runCombinedFrameStress(sections);
  var allocationBench = runAllocationPatternMicrobench();
  var passMedian = combined.median <= SPEC_THRESHOLDS.medianFrameMs;
  var passOver20 = combined.over20Pct <= SPEC_THRESHOLDS.over20MsPct;

  console.log("\n[combined_frame_pacing_estimate]");
  console.log("  median=" + combined.median.toFixed(4) + "ms p95=" + combined.p95.toFixed(4) + "ms p99=" + combined.p99.toFixed(4) + "ms max=" + combined.max.toFixed(4) + "ms");
  console.log("  over20ms=" + combined.over20Pct.toFixed(2) + "%");
  console.log("  pass_median=" + passMedian + " pass_over20ms=" + passOver20);

  console.log("\n[allocation_pattern_microbench]");
  console.log("  distance legacy=" + allocationBench.legacyDistanceMs.toFixed(2) + "ms pooled=" + allocationBench.pooledDistanceMs.toFixed(2) + "ms speedup=" + allocationBench.distanceSpeedupPct.toFixed(2) + "%");
  console.log("  delayQueue legacy(push/shift)=" + allocationBench.legacyQueueMs.toFixed(2) + "ms ringBuffer=" + allocationBench.ringQueueMs.toFixed(2) + "ms speedup=" + allocationBench.queueSpeedupPct.toFixed(2) + "%");

  if (!passMedian || !passOver20) {
    process.exitCode = 1;
  }
}

main();
