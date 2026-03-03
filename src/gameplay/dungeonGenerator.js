(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {

  /* ------------------------------------------------------------------ */
  /*  Deterministic seeded RNG (shared LCG pattern)                      */
  /* ------------------------------------------------------------------ */
  function createDeterministicRng(seed) {
    var state = (seed >>> 0) || 1;
    return function next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  /* ================================================================== */
  /*  CONSTANTS                                                          */
  /* ================================================================== */

  var GRID_SIZE = 5;
  var START_X = 2;
  var START_Y = 2;
  var MIN_BOSS_MANHATTAN = 3; // boss edge distance from center

  /** Room type constants */
  var ROOM_TYPES = {
    START:      "start",
    BOSS:       "boss",
    COMBAT:     "combat",
    ALTAR:      "altar",
    CONFESSION: "confession",
    RELIQUARY:  "reliquary",
    REST:       "rest",       // recovery room (economy guarantee)
  };

  /** Valid room types set for validation */
  var VALID_ROOM_TYPES = {};
  for (var k in ROOM_TYPES) VALID_ROOM_TYPES[ROOM_TYPES[k]] = true;

  /**
   * Floor configuration — room counts and composition rules.
   * SPEC: 4 floors (Nave, Catacombs, Ossuary, Pit).
   * Room counts scale with floor depth.
   */
  var FLOOR_CONFIGS = [
    // Floor 0 — The Nave (introductory)
    {
      name: "The Nave",
      minRooms: 6,
      maxRooms: 8,
      minCombatRooms: 2,
      hasConfession: false,
      minRecoveryRooms: 1,  // altar counts as recovery
      hasLockKey: false,
    },
    // Floor 1 — The Catacombs
    {
      name: "The Catacombs",
      minRooms: 7,
      maxRooms: 10,
      minCombatRooms: 3,
      hasConfession: true,
      minRecoveryRooms: 2,  // altar + rest/reliquary
      hasLockKey: false,
    },
    // Floor 2 — The Ossuary
    {
      name: "The Ossuary",
      minRooms: 8,
      maxRooms: 12,
      minCombatRooms: 4,
      hasConfession: true,
      minRecoveryRooms: 2,
      hasLockKey: true,
    },
    // Floor 3 — The Pit (final)
    {
      name: "The Pit",
      minRooms: 5,
      maxRooms: 7,
      minCombatRooms: 2,
      hasConfession: true,
      minRecoveryRooms: 1,
      hasLockKey: true,
    },
  ];

  /**
   * Weighted room-role assignment templates.
   * Weights control probability of each special room appearing among
   * unassigned combat slots after mandatory rooms are placed.
   * Higher floors get more confession/rest weight.
   */
  var ROLE_WEIGHTS = [
    // Floor 0
    { combat: 5, reliquary: 2, rest: 1 },
    // Floor 1
    { combat: 4, confession: 2, reliquary: 2, rest: 1 },
    // Floor 2
    { combat: 3, confession: 2, reliquary: 2, rest: 2 },
    // Floor 3
    { combat: 4, confession: 1, reliquary: 1, rest: 1 },
  ];

  /**
   * Intensity scoring per room type.
   * Used for pacing analysis: high = pressure, low = recovery.
   */
  var INTENSITY_SCORES = {
    start:      0,
    boss:       10,
    combat:     6,
    altar:      1,
    confession: 2,
    reliquary:  3,
    rest:       1,
  };

  /* ================================================================== */
  /*  ROOM CREATION                                                      */
  /* ================================================================== */

  function createRoom(x, y, type) {
    return {
      x: x,
      y: y,
      type: type,
      spawned: false,
      cleared: type !== "combat" && type !== "boss",
      visited: false,
      doors: { u: false, d: false, l: false, r: false },
      enemies: [],
      pickups: [],
      choiceDone: false,
      intensity: INTENSITY_SCORES[type] || 0,
      locked: false,   // lock-key gate
      keyRoom: false,   // contains key to unlock a locked room
    };
  }

  /* ================================================================== */
  /*  GRAPH UTILITIES                                                     */
  /* ================================================================== */

  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function inBounds(x, y) {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }

  /** BFS from (sx,sy) — returns set of "x,y" keys of all reachable cells. */
  function bfsReachable(grid, sx, sy, ignoreLocks) {
    var visited = {};
    var queue = [{ x: sx, y: sy }];
    visited[sx + "," + sy] = true;
    while (queue.length > 0) {
      var cur = queue.shift();
      for (var d = 0; d < DIRS.length; d++) {
        var nx = cur.x + DIRS[d][0];
        var ny = cur.y + DIRS[d][1];
        var key = nx + "," + ny;
        if (!inBounds(nx, ny) || visited[key]) continue;
        var room = grid[ny][nx];
        if (!room) continue;
        if (!ignoreLocks && room.locked) continue;
        visited[key] = true;
        queue.push({ x: nx, y: ny });
      }
    }
    return visited;
  }

  /** Count how many neighbors a cell has in the grid */
  function neighborCount(grid, x, y) {
    var count = 0;
    for (var d = 0; d < DIRS.length; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (inBounds(nx, ny) && grid[ny][nx]) count++;
    }
    return count;
  }

  /** Get edge cells (manhattan dist >= MIN_BOSS_MANHATTAN from center) */
  function getValidBossPositions() {
    var positions = [];
    for (var x = 0; x < GRID_SIZE; x++) {
      for (var y = 0; y < GRID_SIZE; y++) {
        if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
          if (Math.abs(x - START_X) + Math.abs(y - START_Y) >= MIN_BOSS_MANHATTAN) {
            positions.push({ x: x, y: y });
          }
        }
      }
    }
    return positions;
  }

  /* ================================================================== */
  /*  PATH ENTROPY METRICS                                               */
  /*  Measures branching to reject linear corridors.                     */
  /* ================================================================== */

  /**
   * Compute path entropy score.
   * Returns ratio of rooms with 3+ neighbors (branch points) to total rooms.
   * A purely linear layout has entropy 0; heavily branched → higher.
   */
  function computePathEntropy(grid, rooms) {
    if (rooms.length <= 2) return 0;
    var branchPoints = 0;
    for (var i = 0; i < rooms.length; i++) {
      if (neighborCount(grid, rooms[i].x, rooms[i].y) >= 3) {
        branchPoints++;
      }
    }
    return branchPoints / rooms.length;
  }

  /**
   * Minimum path entropy threshold.
   * Floors with 6+ rooms must have at least one branch point.
   */
  var MIN_PATH_ENTROPY = 0.05;

  /* ================================================================== */
  /*  PACING ANALYSIS                                                    */
  /*  Ensures intensity valleys/peaks alternate along the path graph.    */
  /* ================================================================== */

  /**
   * BFS order from start gives a rough "encounter order".
   * We measure intensity swings along this ordering.
   */
  function computePacingProfile(grid, rooms, sx, sy) {
    var visited = {};
    var queue = [{ x: sx, y: sy }];
    visited[sx + "," + sy] = true;
    var order = [];
    while (queue.length > 0) {
      var cur = queue.shift();
      var room = grid[cur.y][cur.x];
      if (room) order.push(room);
      for (var d = 0; d < DIRS.length; d++) {
        var nx = cur.x + DIRS[d][0], ny = cur.y + DIRS[d][1];
        var key = nx + "," + ny;
        if (!inBounds(nx, ny) || visited[key] || !grid[ny][nx]) continue;
        visited[key] = true;
        queue.push({ x: nx, y: ny });
      }
    }
    return order.map(function (r) { return r.intensity; });
  }

  /**
   * Validate pacing: check that there's at least one intensity valley
   * (non-combat room) before the boss encounter.
   */
  function validatePacing(intensityProfile) {
    if (intensityProfile.length <= 2) return true;
    // Ensure at least one recovery room (intensity <= 3) between combat rooms
    var hasRecovery = false;
    for (var i = 1; i < intensityProfile.length - 1; i++) {
      if (intensityProfile[i] <= 3) hasRecovery = true;
    }
    return hasRecovery;
  }

  /* ================================================================== */
  /*  MAIN GENERATOR                                                     */
  /* ================================================================== */

  /**
   * Generate a dungeon for a given floor and seed.
   * Returns { grid, rooms, start, seed, floor, valid, rejection } or
   * null if the seed is rejected by the validator.
   *
   * @param {number} floor — 0-3
   * @param {number} seed — deterministic seed
   * @returns {object|null}
   */
  function generateDungeon(floor, seed) {
    var rng = createDeterministicRng(seed);
    var config = FLOOR_CONFIGS[floor] || FLOOR_CONFIGS[0];
    var weights = ROLE_WEIGHTS[floor] || ROLE_WEIGHTS[0];

    // 1. Create empty grid
    var grid = [];
    for (var gy = 0; gy < GRID_SIZE; gy++) {
      grid[gy] = [];
      for (var gx = 0; gx < GRID_SIZE; gx++) grid[gy][gx] = null;
    }
    var rooms = [];

    function setRoom(x, y, type) {
      if (grid[y][x]) return grid[y][x];
      var r = createRoom(x, y, type);
      grid[y][x] = r;
      rooms.push(r);
      return r;
    }

    // 2. Place start at center
    setRoom(START_X, START_Y, ROOM_TYPES.START);

    // 3. Place boss at valid edge position
    var bossPositions = getValidBossPositions();
    var bossPos = bossPositions[Math.floor(rng() * bossPositions.length)];
    setRoom(bossPos.x, bossPos.y, ROOM_TYPES.BOSS);

    // 4. Carve guaranteed path from start to boss (random walk)
    var cx = START_X, cy = START_Y;
    while (cx !== bossPos.x || cy !== bossPos.y) {
      if (rng() < 0.5 && cx !== bossPos.x) {
        cx += (bossPos.x > cx) ? 1 : -1;
      } else if (cy !== bossPos.y) {
        cy += (bossPos.y > cy) ? 1 : -1;
      } else {
        cx += (bossPos.x > cx) ? 1 : -1;
      }
      if (cx !== bossPos.x || cy !== bossPos.y) {
        setRoom(cx, cy, ROOM_TYPES.COMBAT);
      }
    }

    // 5. Place altar adjacent to start
    var adjPos = [];
    for (var d = 0; d < DIRS.length; d++) {
      var ax = START_X + DIRS[d][0], ay = START_Y + DIRS[d][1];
      if (inBounds(ax, ay) && !(ax === bossPos.x && ay === bossPos.y)) {
        adjPos.push({ x: ax, y: ay });
      }
    }
    // Prefer empty adjacent cells, but allow overwriting combat if needed
    var emptyAdj = adjPos.filter(function (p) { return !grid[p.y][p.x]; });
    var altarTarget = emptyAdj.length > 0
      ? emptyAdj[Math.floor(rng() * emptyAdj.length)]
      : adjPos[Math.floor(rng() * adjPos.length)];
    if (altarTarget) {
      if (grid[altarTarget.y][altarTarget.x]) {
        grid[altarTarget.y][altarTarget.x].type = ROOM_TYPES.ALTAR;
        grid[altarTarget.y][altarTarget.x].intensity = INTENSITY_SCORES.altar;
        grid[altarTarget.y][altarTarget.x].cleared = true;
      } else {
        setRoom(altarTarget.x, altarTarget.y, ROOM_TYPES.ALTAR);
      }
    }

    // 6. Expand to reach target room count with branching
    var targetRooms = config.minRooms + Math.floor(rng() * (config.maxRooms - config.minRooms + 1));
    var expandAttempts = 0;
    var maxExpandAttempts = 200;
    while (rooms.length < targetRooms && expandAttempts < maxExpandAttempts) {
      expandAttempts++;
      var base = rooms[Math.floor(rng() * rooms.length)];
      var dir = DIRS[Math.floor(rng() * DIRS.length)];
      var nx = base.x + dir[0], ny = base.y + dir[1];
      if (inBounds(nx, ny) && !grid[ny][nx]) {
        setRoom(nx, ny, ROOM_TYPES.COMBAT);
      }
    }

    // 7. Weighted role assignment for unassigned combat rooms
    var combatRooms = [];
    for (var ri = 0; ri < rooms.length; ri++) {
      if (rooms[ri].type === ROOM_TYPES.COMBAT) combatRooms.push(rooms[ri]);
    }

    // Assign confession room (floor > 0 or config says so)
    if (config.hasConfession && combatRooms.length > 0) {
      var ci = Math.floor(rng() * combatRooms.length);
      combatRooms[ci].type = ROOM_TYPES.CONFESSION;
      combatRooms[ci].intensity = INTENSITY_SCORES.confession;
      combatRooms[ci].cleared = true;
      combatRooms.splice(ci, 1);
    }

    // Assign reliquary
    if (combatRooms.length > 0) {
      var reli = Math.floor(rng() * combatRooms.length);
      combatRooms[reli].type = ROOM_TYPES.RELIQUARY;
      combatRooms[reli].intensity = INTENSITY_SCORES.reliquary;
      combatRooms[reli].cleared = true;
      combatRooms.splice(reli, 1);
    }

    // Assign rest rooms for economy guarantee (if needed)
    var recoveryCount = 0;
    for (var rc = 0; rc < rooms.length; rc++) {
      var rt = rooms[rc].type;
      if (rt === ROOM_TYPES.ALTAR || rt === ROOM_TYPES.REST || rt === ROOM_TYPES.RELIQUARY) {
        recoveryCount++;
      }
    }
    while (recoveryCount < config.minRecoveryRooms && combatRooms.length > 0) {
      var restI = Math.floor(rng() * combatRooms.length);
      combatRooms[restI].type = ROOM_TYPES.REST;
      combatRooms[restI].intensity = INTENSITY_SCORES.rest;
      combatRooms[restI].cleared = true;
      combatRooms.splice(restI, 1);
      recoveryCount++;
    }

    // Apply remaining weighted role reassignment among leftover combat rooms
    for (var wi = combatRooms.length - 1; wi >= 0; wi--) {
      var roll = rng();
      var totalWeight = 0;
      for (var wk in weights) totalWeight += weights[wk];
      var cumulative = 0;
      var assigned = ROOM_TYPES.COMBAT;
      for (var wk2 in weights) {
        cumulative += weights[wk2] / totalWeight;
        if (roll < cumulative) { assigned = wk2; break; }
      }
      if (assigned !== ROOM_TYPES.COMBAT) {
        // Limit special room counts (max 1 confession, max 2 reliquary, max 2 rest)
        var typeCount = 0;
        for (var tc = 0; tc < rooms.length; tc++) {
          if (rooms[tc].type === assigned) typeCount++;
        }
        var maxAllowed = assigned === ROOM_TYPES.CONFESSION ? 1
          : assigned === ROOM_TYPES.RELIQUARY ? 2
          : assigned === ROOM_TYPES.REST ? 2
          : 999;
        if (typeCount < maxAllowed) {
          combatRooms[wi].type = assigned;
          combatRooms[wi].intensity = INTENSITY_SCORES[assigned] || 6;
          if (assigned !== ROOM_TYPES.COMBAT) combatRooms[wi].cleared = true;
        }
      }
    }

    // 8. Lock-key progression (floors 2+)
    if (config.hasLockKey && rooms.length > 4) {
      // Find a non-critical room near boss to lock
      var bossNeighbors = [];
      for (var ld = 0; ld < DIRS.length; ld++) {
        var lnx = bossPos.x + DIRS[ld][0], lny = bossPos.y + DIRS[ld][1];
        if (inBounds(lnx, lny) && grid[lny][lnx] &&
            grid[lny][lnx].type === ROOM_TYPES.COMBAT) {
          bossNeighbors.push(grid[lny][lnx]);
        }
      }
      if (bossNeighbors.length > 0) {
        var lockRoom = bossNeighbors[Math.floor(rng() * bossNeighbors.length)];
        lockRoom.locked = true;
        // Place key in a room closer to start (first half of BFS order)
        var bfsOrder = [];
        var bfsVisited = {};
        var bfsQueue = [{ x: START_X, y: START_Y }];
        bfsVisited[START_X + "," + START_Y] = true;
        while (bfsQueue.length > 0) {
          var bc = bfsQueue.shift();
          var br = grid[bc.y][bc.x];
          if (br && br.type !== ROOM_TYPES.START && br.type !== ROOM_TYPES.BOSS &&
              !br.locked && br !== lockRoom) {
            bfsOrder.push(br);
          }
          for (var bd = 0; bd < DIRS.length; bd++) {
            var bnx = bc.x + DIRS[bd][0], bny = bc.y + DIRS[bd][1];
            var bKey = bnx + "," + bny;
            if (inBounds(bnx, bny) && !bfsVisited[bKey] && grid[bny][bnx]) {
              bfsVisited[bKey] = true;
              bfsQueue.push({ x: bnx, y: bny });
            }
          }
        }
        var firstHalf = bfsOrder.slice(0, Math.ceil(bfsOrder.length / 2));
        if (firstHalf.length > 0) {
          var keyTarget = firstHalf[Math.floor(rng() * firstHalf.length)];
          keyTarget.keyRoom = true;
        } else {
          // Can't place key — remove lock
          lockRoom.locked = false;
        }
      }
    }

    // 9. Wire doors between adjacent rooms
    for (var di = 0; di < rooms.length; di++) {
      var dr = rooms[di];
      if (grid[dr.y - 1] && grid[dr.y - 1][dr.x]) dr.doors.u = true;
      if (grid[dr.y + 1] && grid[dr.y + 1][dr.x]) dr.doors.d = true;
      if (grid[dr.y] && grid[dr.y][dr.x - 1]) dr.doors.l = true;
      if (grid[dr.y] && grid[dr.y][dr.x + 1]) dr.doors.r = true;
    }

    return {
      grid: grid,
      rooms: rooms,
      start: { x: START_X, y: START_Y },
      seed: seed,
      floor: floor,
    };
  }

  /* ================================================================== */
  /*  VALIDATOR                                                          */
  /*  Enforces hard constraints — reachability, economy, pacing,         */
  /*  entropy. Returns { valid, rejections[] }.                          */
  /* ================================================================== */

  function validateDungeon(dungeon) {
    var rejections = [];
    var grid = dungeon.grid;
    var rooms = dungeon.rooms;
    var floor = dungeon.floor;
    var config = FLOOR_CONFIGS[floor] || FLOOR_CONFIGS[0];

    // 1. Reachability: all rooms reachable from start (ignoring locks)
    var reachable = bfsReachable(grid, START_X, START_Y, true);
    for (var i = 0; i < rooms.length; i++) {
      if (!reachable[rooms[i].x + "," + rooms[i].y]) {
        rejections.push("unreachable room at (" + rooms[i].x + "," + rooms[i].y + ")");
      }
    }

    // 2. Boss exists and is at edge
    var hasBoss = false;
    for (var bi = 0; bi < rooms.length; bi++) {
      if (rooms[bi].type === ROOM_TYPES.BOSS) {
        hasBoss = true;
        var bx = rooms[bi].x, by = rooms[bi].y;
        if (bx !== 0 && bx !== GRID_SIZE - 1 && by !== 0 && by !== GRID_SIZE - 1) {
          rejections.push("boss not at edge: (" + bx + "," + by + ")");
        }
      }
    }
    if (!hasBoss) rejections.push("no boss room");

    // 3. Altar exists and is adjacent to start
    var hasAltar = false;
    for (var ai = 0; ai < rooms.length; ai++) {
      if (rooms[ai].type === ROOM_TYPES.ALTAR) {
        hasAltar = true;
        var dist = Math.abs(rooms[ai].x - START_X) + Math.abs(rooms[ai].y - START_Y);
        if (dist > 1) {
          rejections.push("altar not adjacent to start: dist=" + dist);
        }
      }
    }
    if (!hasAltar) rejections.push("no altar room");

    // 4. Minimum room count
    if (rooms.length < config.minRooms) {
      rejections.push("too few rooms: " + rooms.length + " < " + config.minRooms);
    }

    // 5. Minimum combat rooms
    var combatCount = 0;
    for (var cc = 0; cc < rooms.length; cc++) {
      if (rooms[cc].type === ROOM_TYPES.COMBAT) combatCount++;
    }
    if (combatCount < config.minCombatRooms) {
      rejections.push("too few combat rooms: " + combatCount + " < " + config.minCombatRooms);
    }

    // 6. Economy guarantee: minimum recovery rooms
    var recCount = 0;
    for (var ec = 0; ec < rooms.length; ec++) {
      var etype = rooms[ec].type;
      if (etype === ROOM_TYPES.ALTAR || etype === ROOM_TYPES.REST ||
          etype === ROOM_TYPES.RELIQUARY) {
        recCount++;
      }
    }
    if (recCount < config.minRecoveryRooms) {
      rejections.push("economy: too few recovery rooms: " + recCount + " < " + config.minRecoveryRooms);
    }

    // 7. Path entropy (reject purely linear layouts for 6+ rooms)
    if (rooms.length >= 6) {
      var entropy = computePathEntropy(grid, rooms);
      if (entropy < MIN_PATH_ENTROPY) {
        rejections.push("linear layout: entropy=" + entropy.toFixed(3) + " < " + MIN_PATH_ENTROPY);
      }
    }

    // 8. Pacing: at least one recovery between start and boss
    var pacingProfile = computePacingProfile(grid, rooms, START_X, START_Y);
    if (!validatePacing(pacingProfile)) {
      rejections.push("no recovery room between start and boss");
    }

    // 9. Lock-key consistency: if a locked room exists, a key room must exist
    var hasLock = false, hasKey = false;
    for (var lk = 0; lk < rooms.length; lk++) {
      if (rooms[lk].locked) hasLock = true;
      if (rooms[lk].keyRoom) hasKey = true;
    }
    if (hasLock && !hasKey) {
      rejections.push("locked room without key");
    }

    // 10. Lock-key reachability: key must be reachable from start without passing through lock
    if (hasLock && hasKey) {
      var reachableNoLock = bfsReachable(grid, START_X, START_Y, false);
      var keyReachable = false;
      for (var kr = 0; kr < rooms.length; kr++) {
        if (rooms[kr].keyRoom && reachableNoLock[rooms[kr].x + "," + rooms[kr].y]) {
          keyReachable = true;
        }
      }
      if (!keyReachable) {
        rejections.push("key not reachable without passing through lock");
      }
    }

    // 11. Confession on required floors
    if (config.hasConfession) {
      var hasConfession = false;
      for (var cf = 0; cf < rooms.length; cf++) {
        if (rooms[cf].type === ROOM_TYPES.CONFESSION) { hasConfession = true; break; }
      }
      if (!hasConfession) {
        rejections.push("missing confession room on floor " + floor);
      }
    }

    return {
      valid: rejections.length === 0,
      rejections: rejections,
    };
  }

  /* ================================================================== */
  /*  FAIL-FAST REROLL GENERATOR                                         */
  /*  Tries seeds sequentially until a valid dungeon is produced.        */
  /*  Fails hard after maxAttempts to prevent infinite loops.            */
  /* ================================================================== */

  var MAX_REROLL_ATTEMPTS = 100;

  /**
   * Generate a valid dungeon for a given floor and seed.
   * Rerolls seed on rejection.
   *
   * @param {number} floor
   * @param {number} seed
   * @param {number} [maxAttempts]
   * @returns {{ dungeon: object, attempts: number, rejectedSeeds: number[] }}
   */
  function generateValidDungeon(floor, seed, maxAttempts) {
    if (maxAttempts === undefined) maxAttempts = MAX_REROLL_ATTEMPTS;
    var rejectedSeeds = [];
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var currentSeed = (seed + attempt) >>> 0;
      var dungeon = generateDungeon(floor, currentSeed);
      var result = validateDungeon(dungeon);
      if (result.valid) {
        return {
          dungeon: dungeon,
          attempts: attempt + 1,
          rejectedSeeds: rejectedSeeds,
        };
      }
      rejectedSeeds.push(currentSeed);
    }
    // Hard fail — should not happen in practice
    throw new Error(
      "Dungeon generation failed after " + maxAttempts +
      " attempts for floor " + floor + " seed " + seed +
      ". Last rejections: " + rejectedSeeds.slice(-3).join(", ")
    );
  }

  /* ================================================================== */
  /*  ANALYSIS UTILITIES (for bench scripts and debug overlays)          */
  /* ================================================================== */

  /** Summarize dungeon stats for inspection */
  function summarizeDungeon(dungeon) {
    var rooms = dungeon.rooms;
    var typeCounts = {};
    for (var i = 0; i < rooms.length; i++) {
      var t = rooms[i].type;
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    var entropy = computePathEntropy(dungeon.grid, rooms);
    var profile = computePacingProfile(dungeon.grid, rooms, START_X, START_Y);
    var pacingValid = validatePacing(profile);
    var validation = validateDungeon(dungeon);

    var lockCount = 0, keyCount = 0;
    for (var lk = 0; lk < rooms.length; lk++) {
      if (rooms[lk].locked) lockCount++;
      if (rooms[lk].keyRoom) keyCount++;
    }

    return {
      floor: dungeon.floor,
      seed: dungeon.seed,
      roomCount: rooms.length,
      typeCounts: typeCounts,
      pathEntropy: entropy,
      intensityProfile: profile,
      pacingValid: pacingValid,
      lockCount: lockCount,
      keyCount: keyCount,
      valid: validation.valid,
      rejections: validation.rejections,
    };
  }

  /* ================================================================== */
  /*  PUBLIC API                                                         */
  /* ================================================================== */

  return {
    // Constants
    GRID_SIZE: GRID_SIZE,
    ROOM_TYPES: ROOM_TYPES,
    FLOOR_CONFIGS: FLOOR_CONFIGS,
    ROLE_WEIGHTS: ROLE_WEIGHTS,
    INTENSITY_SCORES: INTENSITY_SCORES,
    MIN_PATH_ENTROPY: MIN_PATH_ENTROPY,
    MAX_REROLL_ATTEMPTS: MAX_REROLL_ATTEMPTS,

    // Core generation
    generateDungeon: generateDungeon,
    validateDungeon: validateDungeon,
    generateValidDungeon: generateValidDungeon,

    // Analysis
    summarizeDungeon: summarizeDungeon,
    computePathEntropy: computePathEntropy,
    computePacingProfile: computePacingProfile,
    validatePacing: validatePacing,
    bfsReachable: bfsReachable,
  };

});
