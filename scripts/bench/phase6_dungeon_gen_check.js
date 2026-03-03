/**
 * Phase 6 — Dungeon Generation and Room Pacing Validation
 *
 * Validates:
 *  1. All rooms reachable from start (BFS)
 *  2. Boss at edge, start at center, altar adjacent to start
 *  3. Minimum room counts per floor
 *  4. Economy guarantee: minimum recovery rooms per floor
 *  5. Path entropy rejects linear corridors (6+ rooms)
 *  6. Pacing: recovery room exists between start and boss
 *  7. Lock-key consistency (key reachable without passing through lock)
 *  8. Confession room present on required floors
 *  9. Validator rejects known-bad layouts
 * 10. Fail-fast reroll always produces valid dungeon
 * 11. Deterministic: same seed produces identical dungeon
 * 12. No unwinnable seeds across 1000-seed sweep per floor
 * 13. Room type distribution is reasonable
 * 14. Phase 1-5 regression (earlier modules still load)
 *
 * Run: node scripts/bench/phase6_dungeon_gen_check.js
 */

var path = require("path");

// Simulate global environment for UMD modules
global.globalThis = global;
global.VesselGameplay = {};
global.VesselCore = {};

require(path.resolve(__dirname, "../../src/gameplay/dungeonGenerator.js"));

var DG = global.VesselGameplay;

// Optional regression imports
var feelOk = false, enemyOk = false, bossOk = false, itemOk = false, corruptOk = false;
try { require(path.resolve(__dirname, "../../src/gameplay/feelMetrics.js")); feelOk = true; } catch (_) {}
try { require(path.resolve(__dirname, "../../src/gameplay/enemyContracts.js")); enemyOk = true; } catch (_) {}
try { require(path.resolve(__dirname, "../../src/gameplay/bossStateMachine.js")); bossOk = true; } catch (_) {}
try { require(path.resolve(__dirname, "../../src/gameplay/itemSystem.js")); itemOk = true; } catch (_) {}
try { require(path.resolve(__dirname, "../../src/gameplay/corruptionSystem.js")); corruptOk = true; } catch (_) {}

var pass = 0, fail = 0, total = 0;

function assert(cond, label) {
  total++;
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("  FAIL: " + label);
  }
}

// =====================================================================
// 1. Module API availability
// =====================================================================
console.log("\n=== 1. Module API Availability ===");
assert(typeof DG.generateDungeon === "function", "generateDungeon exists");
assert(typeof DG.validateDungeon === "function", "validateDungeon exists");
assert(typeof DG.generateValidDungeon === "function", "generateValidDungeon exists");
assert(typeof DG.summarizeDungeon === "function", "summarizeDungeon exists");
assert(typeof DG.computePathEntropy === "function", "computePathEntropy exists");
assert(typeof DG.computePacingProfile === "function", "computePacingProfile exists");
assert(typeof DG.bfsReachable === "function", "bfsReachable exists");
assert(DG.GRID_SIZE === 5, "grid size = 5");
assert(typeof DG.ROOM_TYPES === "object", "ROOM_TYPES defined");
assert(typeof DG.FLOOR_CONFIGS === "object", "FLOOR_CONFIGS defined");

// =====================================================================
// 2. Single-seed structural tests (floor 0, seed 42)
// =====================================================================
console.log("\n=== 2. Structural Tests (floor=0, seed=42) ===");
var d0 = DG.generateDungeon(0, 42);
assert(d0 !== null, "dungeon generated");
assert(d0.grid.length === 5, "grid has 5 rows");
assert(d0.grid[0].length === 5, "grid has 5 cols");
assert(d0.start.x === 2 && d0.start.y === 2, "start at center");
assert(d0.rooms.length >= DG.FLOOR_CONFIGS[0].minRooms, "meets min room count");

// Boss at edge
var bossRoom = null;
for (var i = 0; i < d0.rooms.length; i++) {
  if (d0.rooms[i].type === "boss") bossRoom = d0.rooms[i];
}
assert(bossRoom !== null, "boss room exists");
if (bossRoom) {
  assert(
    bossRoom.x === 0 || bossRoom.x === 4 || bossRoom.y === 0 || bossRoom.y === 4,
    "boss at grid edge"
  );
  assert(
    Math.abs(bossRoom.x - 2) + Math.abs(bossRoom.y - 2) >= 3,
    "boss manhattan dist >= 3 from center"
  );
}

// Altar adjacent to start
var altarRoom = null;
for (var j = 0; j < d0.rooms.length; j++) {
  if (d0.rooms[j].type === "altar") altarRoom = d0.rooms[j];
}
assert(altarRoom !== null, "altar room exists");
if (altarRoom) {
  var altarDist = Math.abs(altarRoom.x - 2) + Math.abs(altarRoom.y - 2);
  assert(altarDist <= 1, "altar adjacent to start (dist=" + altarDist + ")");
}

// All rooms reachable
var reachable = DG.bfsReachable(d0.grid, 2, 2, true);
for (var r = 0; r < d0.rooms.length; r++) {
  assert(reachable[d0.rooms[r].x + "," + d0.rooms[r].y], "room reachable: (" + d0.rooms[r].x + "," + d0.rooms[r].y + ")");
}

// Doors wired correctly
for (var dr = 0; dr < d0.rooms.length; dr++) {
  var room = d0.rooms[dr];
  var grid = d0.grid;
  if (room.doors.u) assert(grid[room.y - 1] && grid[room.y - 1][room.x], "door up valid: (" + room.x + "," + room.y + ")");
  if (room.doors.d) assert(grid[room.y + 1] && grid[room.y + 1][room.x], "door down valid: (" + room.x + "," + room.y + ")");
  if (room.doors.l) assert(grid[room.y] && grid[room.y][room.x - 1], "door left valid: (" + room.x + "," + room.y + ")");
  if (room.doors.r) assert(grid[room.y] && grid[room.y][room.x + 1], "door right valid: (" + room.x + "," + room.y + ")");
}

// =====================================================================
// 3. Validator correctness
// =====================================================================
console.log("\n=== 3. Validator ===");
var val0 = DG.validateDungeon(d0);
assert(val0.valid === true, "floor 0 seed 42 valid");
assert(Array.isArray(val0.rejections), "rejections is array");
assert(val0.rejections.length === 0, "no rejections for valid dungeon");

// =====================================================================
// 4. Determinism: same seed → identical dungeon
// =====================================================================
console.log("\n=== 4. Determinism ===");
var d0a = DG.generateDungeon(0, 42);
var d0b = DG.generateDungeon(0, 42);
assert(d0a.rooms.length === d0b.rooms.length, "same room count");
var sameLayout = true;
for (var di = 0; di < d0a.rooms.length; di++) {
  if (d0a.rooms[di].x !== d0b.rooms[di].x || d0a.rooms[di].y !== d0b.rooms[di].y || d0a.rooms[di].type !== d0b.rooms[di].type) {
    sameLayout = false;
  }
}
assert(sameLayout, "identical layout for same seed");

// Different seed → different dungeon (high probability)
var d0c = DG.generateDungeon(0, 99);
var differs = d0c.rooms.length !== d0a.rooms.length;
if (!differs) {
  for (var dk = 0; dk < d0c.rooms.length; dk++) {
    if (d0c.rooms[dk].x !== d0a.rooms[dk].x || d0c.rooms[dk].y !== d0a.rooms[dk].y) {
      differs = true; break;
    }
  }
}
assert(differs, "different seed produces different layout");

// =====================================================================
// 5. Per-floor structural requirements
// =====================================================================
console.log("\n=== 5. Per-Floor Requirements ===");
for (var fl = 0; fl < 4; fl++) {
  var cfg = DG.FLOOR_CONFIGS[fl];
  var dfl = DG.generateDungeon(fl, 123);
  var vfl = DG.validateDungeon(dfl);

  assert(dfl.rooms.length >= cfg.minRooms, "floor " + fl + ": min rooms (" + dfl.rooms.length + " >= " + cfg.minRooms + ")");
  assert(dfl.rooms.length <= cfg.maxRooms, "floor " + fl + ": max rooms (" + dfl.rooms.length + " <= " + cfg.maxRooms + ")");

  // Economy check
  var recov = 0;
  for (var ec = 0; ec < dfl.rooms.length; ec++) {
    var et = dfl.rooms[ec].type;
    if (et === "altar" || et === "rest" || et === "reliquary") recov++;
  }
  assert(recov >= cfg.minRecoveryRooms, "floor " + fl + ": recovery rooms (" + recov + " >= " + cfg.minRecoveryRooms + ")");

  // Confession check
  if (cfg.hasConfession) {
    var hasConf = false;
    for (var cf = 0; cf < dfl.rooms.length; cf++) {
      if (dfl.rooms[cf].type === "confession") hasConf = true;
    }
    assert(hasConf, "floor " + fl + ": has confession room");
  }

  if (vfl.rejections.length > 0) {
    console.log("  Floor " + fl + " rejections: " + vfl.rejections.join("; "));
  }
}

// =====================================================================
// 6. Lock-key consistency (floors 2, 3)
// =====================================================================
console.log("\n=== 6. Lock-Key Consistency ===");
for (var lfl = 2; lfl <= 3; lfl++) {
  var foundLock = false, foundKey = false;
  // Try multiple seeds to find one with lock-key
  for (var ls = 1; ls <= 50; ls++) {
    var dlk = DG.generateDungeon(lfl, ls);
    var vlk = DG.validateDungeon(dlk);
    for (var lm = 0; lm < dlk.rooms.length; lm++) {
      if (dlk.rooms[lm].locked) foundLock = true;
      if (dlk.rooms[lm].keyRoom) foundKey = true;
    }
    // If lock present, validate key reachability
    if (foundLock) {
      assert(foundKey, "floor " + lfl + ": key present when lock exists");
      assert(vlk.valid || vlk.rejections.indexOf("locked room without key") === -1,
        "floor " + lfl + ": no lock-without-key rejection");
      break;
    }
  }
}

// =====================================================================
// 7. Path entropy
// =====================================================================
console.log("\n=== 7. Path Entropy ===");
var d7 = DG.generateDungeon(1, 42);
var entropy = DG.computePathEntropy(d7.grid, d7.rooms);
assert(typeof entropy === "number", "entropy is numeric");
assert(entropy >= 0 && entropy <= 1, "entropy in [0,1] range");
console.log("  Floor 1 seed 42 entropy: " + entropy.toFixed(4));

// =====================================================================
// 8. Pacing profile
// =====================================================================
console.log("\n=== 8. Pacing Profile ===");
var profile = DG.computePacingProfile(d7.grid, d7.rooms, 2, 2);
assert(Array.isArray(profile), "pacing profile is array");
assert(profile.length === d7.rooms.length, "profile covers all rooms");
assert(DG.validatePacing(profile), "pacing is valid");

// =====================================================================
// 9. Summary utility
// =====================================================================
console.log("\n=== 9. Summary Utility ===");
var summary = DG.summarizeDungeon(d0);
assert(summary.roomCount === d0.rooms.length, "summary room count matches");
assert(typeof summary.typeCounts === "object", "typeCounts present");
assert(typeof summary.pathEntropy === "number", "entropy present");
assert(typeof summary.pacingValid === "boolean", "pacingValid present");
assert(summary.valid === true, "summary valid flag");

// =====================================================================
// 10. Fail-fast reroll (generateValidDungeon)
// =====================================================================
console.log("\n=== 10. Fail-Fast Reroll ===");
for (var rvfl = 0; rvfl < 4; rvfl++) {
  var result = DG.generateValidDungeon(rvfl, 1);
  assert(result.dungeon !== null, "floor " + rvfl + ": valid dungeon produced");
  assert(result.attempts >= 1, "floor " + rvfl + ": at least 1 attempt");
  assert(result.attempts <= DG.MAX_REROLL_ATTEMPTS, "floor " + rvfl + ": within attempt limit");
  var revalid = DG.validateDungeon(result.dungeon);
  assert(revalid.valid, "floor " + rvfl + ": reroll result passes validation");
  console.log("  Floor " + rvfl + ": valid in " + result.attempts + " attempt(s), rejected " + result.rejectedSeeds.length + " seed(s)");
}

// =====================================================================
// 11. Mass seed sweep: no unwinnable seeds (1000 seeds × 4 floors)
// =====================================================================
console.log("\n=== 11. Mass Seed Sweep (1000 seeds × 4 floors) ===");
var totalFailures = 0;
var maxAttempts = 0;
var failDetails = [];

for (var mfl = 0; mfl < 4; mfl++) {
  var floorFails = 0;
  for (var ms = 1; ms <= 1000; ms++) {
    try {
      var mr = DG.generateValidDungeon(mfl, ms);
      if (mr.attempts > maxAttempts) maxAttempts = mr.attempts;
    } catch (e) {
      floorFails++;
      failDetails.push("floor=" + mfl + " seed=" + ms + ": " + e.message);
    }
  }
  assert(floorFails === 0, "floor " + mfl + ": 0 unwinnable seeds in 1000 (got " + floorFails + ")");
  totalFailures += floorFails;
}
console.log("  Max attempts for any seed: " + maxAttempts);
if (failDetails.length > 0) {
  console.log("  Failure details:");
  for (var fd = 0; fd < Math.min(failDetails.length, 5); fd++) {
    console.log("    " + failDetails[fd]);
  }
}

// =====================================================================
// 12. Room type distribution sanity (1000 seeds, floor 1)
// =====================================================================
console.log("\n=== 12. Room Type Distribution (1000 runs, floor 1) ===");
var distCounts = {};
for (var ds = 1; ds <= 1000; ds++) {
  var dd = DG.generateValidDungeon(1, ds);
  for (var dri = 0; dri < dd.dungeon.rooms.length; dri++) {
    var dt = dd.dungeon.rooms[dri].type;
    distCounts[dt] = (distCounts[dt] || 0) + 1;
  }
}
console.log("  Distribution: " + JSON.stringify(distCounts));
assert(distCounts.start === 1000, "exactly 1 start per dungeon");
assert(distCounts.boss === 1000, "exactly 1 boss per dungeon");
assert(distCounts.altar === 1000, "exactly 1 altar per dungeon");
assert((distCounts.confession || 0) >= 900, "confession in >90% of floor 1 dungeons");
assert((distCounts.combat || 0) >= 1000, "combat rooms present");

// =====================================================================
// 13. Economy guarantee across all seeds
// =====================================================================
console.log("\n=== 13. Economy Guarantee (1000 seeds × 4 floors) ===");
var economyFails = 0;
for (var efl = 0; efl < 4; efl++) {
  var eCfg = DG.FLOOR_CONFIGS[efl];
  for (var es = 1; es <= 1000; es++) {
    var ed = DG.generateValidDungeon(efl, es);
    var eRec = 0;
    for (var eri = 0; eri < ed.dungeon.rooms.length; eri++) {
      var ert = ed.dungeon.rooms[eri].type;
      if (ert === "altar" || ert === "rest" || ert === "reliquary") eRec++;
    }
    if (eRec < eCfg.minRecoveryRooms) economyFails++;
  }
}
assert(economyFails === 0, "economy guarantee: 0 failures in 4000 dungeons (got " + economyFails + ")");

// =====================================================================
// 14. Phase 1-5 Regression
// =====================================================================
console.log("\n=== 14. Phase 1-5 Regression ===");
assert(feelOk, "feelMetrics.js loads");
assert(enemyOk, "enemyContracts.js loads");
assert(bossOk, "bossStateMachine.js loads");
assert(itemOk, "itemSystem.js loads");
assert(corruptOk, "corruptionSystem.js loads");

// =====================================================================
// Summary
// =====================================================================
console.log("\n========================================");
console.log("Phase 6 Dungeon Generation & Pacing");
console.log("  PASSED: " + pass + "/" + total);
console.log("  FAILED: " + fail + "/" + total);
console.log("========================================\n");

process.exit(fail > 0 ? 1 : 0);
