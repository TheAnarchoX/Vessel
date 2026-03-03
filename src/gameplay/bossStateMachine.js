(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {

  /* ------------------------------------------------------------------ */
  /*  Deterministic seeded RNG (same as enemyContracts.js)               */
  /* ------------------------------------------------------------------ */
  function createDeterministicRng(seed) {
    var state = (seed >>> 0) || 1;
    return function next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Hazard helpers — resolve at runtime from bossHazards module        */
  /* ------------------------------------------------------------------ */
  function hazardApi() {
    if (typeof root !== "undefined" && root.VesselGameplay && root.VesselGameplay.createHazard) {
      return root.VesselGameplay;
    }
    if (typeof require === "function") {
      try { return require("./bossHazards.js"); } catch (_) { /* noop */ }
    }
    return null;
  }

  /* ================================================================== */
  /*  ATTACK LIFECYCLE (mirrors enemyContracts.js contract)              */
  /*  idle → telegraph → read → recover → idle                          */
  /* ================================================================== */

  function startAttackWindow(attack, windowName, durationMs) {
    attack.state = windowName;
    attack.windowMs = durationMs;
    attack.windowConsumed = false;
  }

  function progressAttack(attack, contract, events, boss) {
    if (attack.state === "idle") {
      attack.attackId += 1;
      startAttackWindow(attack, "telegraph", contract.telegraphMs);
      events.push({ type: "telegraph_start", bossId: boss.id, attackName: contract.name, attackId: attack.attackId, source: contract.source || boss.id });
      return;
    }
    if (attack.state === "telegraph") {
      startAttackWindow(attack, "read", contract.readMs);
      events.push({ type: "read_start", bossId: boss.id, attackName: contract.name, attackId: attack.attackId, source: contract.source || boss.id });
      return;
    }
    if (attack.state === "read") {
      startAttackWindow(attack, "recover", contract.recoverMs);
      events.push({ type: "recover_start", bossId: boss.id, attackName: contract.name, attackId: attack.attackId, source: contract.source || boss.id });
      return;
    }
    // recover → idle
    attack.state = "idle";
    attack.cooldownMs = contract.cooldownMs;
    events.push({ type: "attack_end", bossId: boss.id, attackName: contract.name, attackId: attack.attackId, source: contract.source || boss.id });
  }

  function tickAttack(attack, contract, dtMs, events, boss, ctx) {
    if (attack.state === "idle") {
      attack.cooldownMs = Math.max(0, attack.cooldownMs - dtMs);
      if (attack.cooldownMs <= 0) {
        progressAttack(attack, contract, events, boss);
      }
      return;
    }
    attack.windowMs = Math.max(0, attack.windowMs - dtMs);
    // Emit action on first frame of read window
    if (attack.state === "read" && !attack.windowConsumed) {
      attack.windowConsumed = true;
      if (contract.action) {
        var actionEvents = contract.action(boss, ctx);
        if (actionEvents) {
          for (var i = 0; i < actionEvents.length; i++) {
            actionEvents[i].bossId = boss.id;
            actionEvents[i].attackName = contract.name;
            actionEvents[i].attackId = attack.attackId;
            actionEvents[i].source = contract.source || boss.id;
            actionEvents[i].window = "read";
            events.push(actionEvents[i]);
          }
        }
      }
    }
    if (attack.windowMs <= 0) {
      progressAttack(attack, contract, events, boss);
    }
  }

  /* ================================================================== */
  /*  TRANSITION GUARD EVALUATION                                        */
  /* ================================================================== */

  function evaluateGuard(guard, boss) {
    if (guard.type === "health_below") {
      return boss.health / boss.maxHealth < guard.value;
    }
    if (guard.type === "timer_elapsed") {
      return boss.phaseTimeMs >= guard.value;
    }
    if (guard.type === "trigger") {
      return !!boss.triggers[guard.value];
    }
    return false;
  }

  function initDelayBuffer(boss, capacity) {
    var cap = capacity || 20;
    boss.delay = {
      capacity: cap,
      x: new Array(cap),
      y: new Array(cap),
      head: 0,
      length: 0,
    };
  }

  function pushDelaySample(boss, x, y) {
    var q = boss.delay;
    if (!q || typeof q.capacity !== "number") {
      initDelayBuffer(boss, 20);
      q = boss.delay;
    }
    var write = (q.head + q.length) % q.capacity;
    q.x[write] = x;
    q.y[write] = y;
    if (q.length < q.capacity) {
      q.length += 1;
      return null;
    }
    var oldestX = q.x[q.head];
    var oldestY = q.y[q.head];
    q.head = (q.head + 1) % q.capacity;
    return { x: oldestX, y: oldestY };
  }

  /* ================================================================== */
  /*  CORE STATE MACHINE                                                 */
  /* ================================================================== */

  function createBossState(definition, spawnX, spawnY, seed) {
    var rng = createDeterministicRng(seed || 42);
    var boss = {
      id: definition.id,
      definitionId: definition.id,
      x: spawnX || 0,
      y: spawnY || 0,
      r: definition.radius || 36,
      health: definition.health,
      maxHealth: definition.health,
      speed: definition.speed || 64,
      damage: definition.damage || 1,
      color: definition.color || "#6a3a2b",

      phaseId: null,
      phaseTimeMs: 0,
      phasesVisited: [],

      attackStates: {},
      activeHazards: [],
      triggers: {},

      // Cinematic state
      inputLocked: false,
      introPlayed: false,
      outroPlayed: false,
      dead: false,

      // Movement state for specific bosses
      delay: null,
      orbitAngle: rng() * 6.283185307,

      // Internal
      _definition: definition,
      _rng: rng,

      // Presentation hints
      type: definition.id,
      phase: 1,
      hitT: 0,
      slowT: 0,
      spawnT: 0.6,
      cd: 0,
      maxHp: definition.health,
      hp: definition.health,
      split: false,
    };

    initDelayBuffer(boss, 20);

    // Initialize attack states for all phases
    var phases = definition.phases;
    for (var p = 0; p < phases.length; p++) {
      var phase = phases[p];
      if (phase.attacks) {
        for (var a = 0; a < phase.attacks.length; a++) {
          var atk = phase.attacks[a];
          boss.attackStates[atk.name] = {
            state: "idle",
            cooldownMs: atk.cooldownMs || 0,
            windowMs: 0,
            attackId: 0,
            windowConsumed: false,
          };
        }
      }
    }

    // Enter intro or initial phase
    if (definition.intro) {
      boss.phaseId = "_intro";
      boss.phaseTimeMs = 0;
      boss.inputLocked = true;
    } else {
      enterPhase(boss, definition.initialPhase, []);
    }

    return boss;
  }

  function getPhase(boss) {
    var phases = boss._definition.phases;
    for (var i = 0; i < phases.length; i++) {
      if (phases[i].id === boss.phaseId) return phases[i];
    }
    return null;
  }

  function enterPhase(boss, phaseId, events) {
    if (boss.phaseId && boss.phaseId !== "_intro") {
      events.push({ type: "phase_exit", bossId: boss.id, phaseId: boss.phaseId });
    }
    boss.phaseId = phaseId;
    boss.phaseTimeMs = 0;

    var phaseNum = 0;
    for (var i = 0; i < boss._definition.phases.length; i++) {
      if (boss._definition.phases[i].id === phaseId) { phaseNum = i + 1; break; }
    }
    boss.phase = phaseNum;

    if (boss.phasesVisited.indexOf(phaseId) === -1) {
      boss.phasesVisited.push(phaseId);
    }
    events.push({ type: "phase_enter", bossId: boss.id, phaseId: phaseId });

    var phase = getPhase(boss);
    if (phase && phase.onEnter) {
      phase.onEnter(boss, events);
    }

    // Reset attack cooldowns for this phase
    if (phase && phase.attacks) {
      for (var a = 0; a < phase.attacks.length; a++) {
        var atk = phase.attacks[a];
        var as = boss.attackStates[atk.name];
        if (as) {
          as.state = "idle";
          as.cooldownMs = atk.initialCooldownMs != null ? atk.initialCooldownMs : (atk.cooldownMs * 0.5);
          as.windowMs = 0;
          as.windowConsumed = false;
        }
      }
    }
  }

  function updateBoss(boss, ctx) {
    var events = [];
    var dtMs = ctx.dtMs;

    // Keep presentation parity
    boss.hp = boss.health;
    boss.hitT = Math.max(0, (boss.hitT || 0) - dtMs / 1000);
    boss.slowT = Math.max(0, (boss.slowT || 0) - dtMs / 1000);
    boss.spawnT = Math.max(0, (boss.spawnT || 0) - dtMs / 1000);
    boss.cd = 0; // managed by attack states

    // --- Intro phase ---
    if (boss.phaseId === "_intro") {
      if (!boss.introPlayed) {
        boss.introPlayed = true;
        events.push({ type: "intro_start", bossId: boss.id });
      }
      boss.phaseTimeMs += dtMs;
      boss.inputLocked = true;
      if (boss.phaseTimeMs >= boss._definition.intro.durationMs) {
        boss.inputLocked = false;
        events.push({ type: "intro_end", bossId: boss.id });
        enterPhase(boss, boss._definition.initialPhase, events);
      }
      return events;
    }

    // --- Outro phase ---
    if (boss.phaseId === "_outro") {
      if (!boss.outroPlayed) {
        boss.outroPlayed = true;
        events.push({ type: "outro_start", bossId: boss.id });
      }
      boss.phaseTimeMs += dtMs;
      boss.inputLocked = true;
      if (boss.phaseTimeMs >= boss._definition.outro.durationMs) {
        boss.inputLocked = false;
        boss.dead = true;
        events.push({ type: "outro_end", bossId: boss.id });
      }
      return events;
    }

    // --- Check death → enter outro or mark dead ---
    if (boss.health <= 0 && !boss.dead) {
      if (boss._definition.outro) {
        boss.phaseId = "_outro";
        boss.phaseTimeMs = 0;
        boss.inputLocked = true;
        return events;
      }
      boss.dead = true;
      boss.hp = 0;
      return events;
    }

    boss.phaseTimeMs += dtMs;

    // --- Movement ---
    var phase = getPhase(boss);
    if (phase && phase.movement) {
      phase.movement(boss, ctx, dtMs);
    }

    // --- Attacks ---
    if (phase && phase.attacks) {
      for (var a = 0; a < phase.attacks.length; a++) {
        var attackDef = phase.attacks[a];
        var attackState = boss.attackStates[attackDef.name];
        if (attackState) {
          tickAttack(attackState, attackDef, dtMs, events, boss, ctx);
          // Set cd hint for presentation when any attack is in telegraph
          if (attackState.state === "telegraph" || attackState.state === "read") {
            boss.cd = 0.1;
          }
        }
      }
    }

    // --- Hazards ---
    var hApi = hazardApi();
    for (var h = boss.activeHazards.length - 1; h >= 0; h--) {
      var hazard = boss.activeHazards[h];
      if (hApi) {
        var hEvents = hApi.updateHazard(hazard, dtMs);
        for (var he = 0; he < hEvents.length; he++) {
          hEvents[he].bossId = boss.id;
          events.push(hEvents[he]);
        }
      }
      if (hazard.state === "expired") {
        boss.activeHazards.splice(h, 1);
      }
    }

    // --- Transitions ---
    if (phase && phase.transitions) {
      for (var t = 0; t < phase.transitions.length; t++) {
        var trans = phase.transitions[t];
        if (evaluateGuard(trans.guard, boss)) {
          enterPhase(boss, trans.target, events);
          break;
        }
      }
    }

    return events;
  }

  function damageBoss(boss, amount) {
    boss.health = Math.max(0, boss.health - amount);
    boss.hp = boss.health;
    boss.hitT = 0.24;
  }

  /* ================================================================== */
  /*  BOSS DEFINITIONS                                                   */
  /* ================================================================== */

  function routeAlignmentScale(boss, ctx, alignedScale, opposedScale) {
    var affinity = ctx && ctx.routeAffinity ? ctx.routeAffinity : "unaligned";
    if (affinity === boss._definition.pathAffinity) return alignedScale;
    if (affinity === "unaligned" || boss._definition.pathAffinity === "unaligned") return 1;
    return opposedScale;
  }

  function moveChase(scale) {
    return function (boss, ctx, dtMs) {
      var target = ctx.target;
      var dx = target.x - boss.x;
      var dy = target.y - boss.y;
      var d = Math.hypot(dx, dy) || 1;
      var sp = boss.speed * (scale || 1) / 1000 * dtMs;
      boss.x += (dx / d) * sp;
      boss.y += (dy / d) * sp;
    };
  }

  function moveDelayed(followStrength) {
    return function (boss, ctx, _dtMs) {
      var target = ctx.target;
      var m = pushDelaySample(boss, target.x, target.y);
      if (!m) return;
      boss.x += (m.x - boss.x) * (followStrength || 0.08);
      boss.y += (m.y - boss.y) * (followStrength || 0.08);
    };
  }

  function moveOrbit(speedScale, orbitRadius) {
    return function (boss, ctx, dtMs) {
      var target = ctx.target;
      boss.orbitAngle += dtMs / 1000 * (speedScale || 2);
      boss.x = target.x + Math.cos(boss.orbitAngle) * (orbitRadius || 110);
      boss.y = target.y + Math.sin(boss.orbitAngle) * (orbitRadius || 110);
    };
  }

  function radialActionFactory(baseCount, amount, speed, color) {
    return function (boss, ctx) {
      var scale = routeAlignmentScale(boss, ctx, 1.35, 0.85);
      var count = Math.max(4, Math.round(baseCount * scale));
      var shots = [];
      for (var i = 0; i < count; i++) {
        var a = i * Math.PI * 2 / count + (boss.orbitAngle || 0);
        shots.push({
          type: "projectile",
          amount: amount,
          direction: { x: Math.cos(a), y: Math.sin(a) },
          speed: speed,
          x: boss.x,
          y: boss.y,
          color: color,
        });
      }
      return shots;
    };
  }

  function aimedActionFactory(amount, speed) {
    return function (boss, ctx) {
      var target = ctx.target;
      var dx = target.x - boss.x;
      var dy = target.y - boss.y;
      var d = Math.hypot(dx, dy) || 1;
      var scale = routeAlignmentScale(boss, ctx, 1.25, 0.9);
      return [{
        type: "projectile",
        amount: amount * scale,
        direction: { x: dx / d, y: dy / d },
        speed: speed,
        x: boss.x,
        y: boss.y,
      }];
    };
  }

  function summonActionFactory(baseCount, summonType) {
    return function (boss, ctx) {
      var scale = routeAlignmentScale(boss, ctx, 1.5, 0.8);
      var count = Math.max(1, Math.round(baseCount * scale));
      return [{ type: "summon", count: count, summonType: summonType, x: boss.x, y: boss.y }];
    };
  }

  function sigilActionFactory(radius, activeMs, damage) {
    return function (boss, ctx) {
      var hApi = hazardApi();
      if (!hApi) return [{ type: "hazard_spawn", hazardType: "damage_sigil", x: boss.x, y: boss.y }];
      var rng = boss._rng;
      var rb = ctx.roomBounds || { x: 80, y: 50, w: 800, h: 440 };
      var scale = routeAlignmentScale(boss, ctx, 1.2, 0.85);
      var h = hApi.createHazard("damage_sigil", {
        x: rb.x + 50 + rng() * (rb.w - 100),
        y: rb.y + 50 + rng() * (rb.h - 100),
        radius: Math.round(radius * scale),
        warnMs: 360,
        activeMs: Math.round(activeMs * scale),
        damage: damage * scale,
      });
      var activateEvents = hApi.activateHazard(h);
      boss.activeHazards.push(h);
      var events = [{ type: "hazard_spawn", hazardType: "damage_sigil", x: h.x, y: h.y }];
      for (var i = 0; i < activateEvents.length; i++) events.push(activateEvents[i]);
      return events;
    };
  }

  function confinementOnEnter(shrinkPerMs, minMargin, damage) {
    return function (boss, events) {
      var hApi = hazardApi();
      if (!hApi) return;
      var h = hApi.createHazard("arena_confinement", {
        shrinkPerMs: shrinkPerMs,
        minMargin: minMargin,
        damage: damage,
        roomBounds: { x: 0, y: 0, w: 960, h: 540 },
      });
      var activateEvents = hApi.activateHazard(h);
      boss.activeHazards.push(h);
      for (var i = 0; i < activateEvents.length; i++) {
        activateEvents[i].bossId = boss.id;
        events.push(activateEvents[i]);
      }
    };
  }

  function collapseEdgesOnEnter() {
    return function (boss, events) {
      var hApi = hazardApi();
      if (!hApi) return;
      var rb = { x: 80, y: 50, w: 800, h: 440 };
      var zone1 = hApi.createHazard("collapsing_zone", {
        rect: { x: rb.x, y: rb.y, w: 108, h: rb.h },
        warnMs: 800,
        collapseMs: Infinity,
        damage: 0.45,
      });
      var zone2 = hApi.createHazard("collapsing_zone", {
        rect: { x: rb.x + rb.w - 108, y: rb.y, w: 108, h: rb.h },
        warnMs: 800,
        collapseMs: Infinity,
        damage: 0.45,
      });
      hApi.activateHazard(zone1);
      hApi.activateHazard(zone2);
      boss.activeHazards.push(zone1);
      boss.activeHazards.push(zone2);
      events.push({ type: "hazard_spawn", bossId: boss.id, hazardType: "collapsing_zone", count: 2 });
    };
  }

  function attack(name, telegraphMs, readMs, recoverMs, cooldownMs, source, action, initialCooldownMs) {
    return {
      name: name,
      telegraphMs: telegraphMs,
      readMs: readMs,
      recoverMs: recoverMs,
      cooldownMs: cooldownMs,
      initialCooldownMs: initialCooldownMs != null ? initialCooldownMs : Math.floor(cooldownMs * 0.5),
      source: source,
      action: action,
    };
  }

  function phase(id, movement, attacks, transitions, onEnter) {
    return {
      id: id,
      movement: movement,
      attacks: attacks || [],
      transitions: transitions || [],
      onEnter: onEnter,
    };
  }

  function createBossDefinition(spec) {
    return {
      id: spec.id,
      name: spec.name,
      pathAffinity: spec.pathAffinity,
      health: spec.health,
      speed: spec.speed,
      damage: spec.damage,
      radius: spec.radius || 36,
      color: spec.color,
      initialPhase: spec.phases[0].id,
      intro: { durationMs: spec.introMs || 900 },
      outro: { durationMs: spec.outroMs || 700 },
      phases: spec.phases,
    };
  }

  var BOSS_ROSTER = [
    createBossDefinition({
      id: "shepherd",
      name: "SHEPHERD",
      pathAffinity: "ascetic",
      health: 38,
      speed: 68,
      damage: 1,
      color: "#6a3a2b",
      phases: [
        phase("shepherd_p1", moveChase(1), [
          attack("shepherd_summon", 300, 220, 300, 1700, "shepherd_summon", summonActionFactory(2, "penitent"), 820),
        ], [{ target: "shepherd_p2", guard: { type: "health_below", value: 0.52 } }]),
        phase("shepherd_p2", moveChase(1.45), [
          attack("shepherd_radial", 250, 180, 250, 1520, "shepherd_radial", radialActionFactory(8, 0.8, 175, "#912"), 620),
          attack("shepherd_summon_hard", 320, 210, 310, 2100, "shepherd_summon", summonActionFactory(3, "penitent"), 900),
        ], []),
      ],
    }),
    createBossDefinition({
      id: "pit",
      name: "THE PIT",
      pathAffinity: "demonic",
      health: 60,
      speed: 88,
      damage: 1.45,
      color: "#170812",
      phases: [
        phase("pit_p1", moveDelayed(0.08), [
          attack("pit_aimed", 280, 210, 250, 1350, "pit_aimed", aimedActionFactory(1.0, 210), 680),
        ], [{ target: "pit_p2", guard: { type: "health_below", value: 0.66 } }]),
        phase("pit_p2", moveDelayed(0.095), [
          attack("pit_aimed_fast", 240, 180, 220, 760, "pit_aimed", aimedActionFactory(1.0, 220), 380),
          attack("pit_spokes", 300, 210, 260, 1650, "pit_spokes", radialActionFactory(6, 0.7, 160, "#4a0918"), 700),
        ], [{ target: "pit_p3", guard: { type: "health_below", value: 0.33 } }]),
        phase("pit_p3", moveDelayed(0.11), [
          attack("pit_aimed_burst", 230, 170, 220, 700, "pit_aimed", aimedActionFactory(1.15, 230), 350),
          attack("pit_summon", 320, 200, 260, 1850, "pit_summon", summonActionFactory(2, "hollowed"), 850),
        ], [], confinementOnEnter(0.03, 64, 0.3)),
      ],
    }),
    createBossDefinition({
      id: "choir",
      name: "CHOIR",
      pathAffinity: "unaligned",
      health: 50,
      speed: 76,
      damage: 1,
      color: "#8d5ca8",
      phases: [
        phase("choir_p1", moveOrbit(1.7, 132), [
          attack("choir_sigil", 320, 240, 280, 2400, "choir_sigil", sigilActionFactory(30, 1800, 0.5), 1200),
        ], [{ target: "choir_p2", guard: { type: "health_below", value: 0.6 } }]),
        phase("choir_p2", moveOrbit(2.3, 112), [
          attack("choir_sigil_p2", 290, 220, 260, 2100, "choir_sigil", sigilActionFactory(33, 2400, 0.55), 800),
          attack("choir_radial_p2", 250, 200, 230, 1300, "choir_radial", radialActionFactory(4, 0.7, 165, "#9362ad"), 620),
        ], [{ target: "choir_p3", guard: { type: "health_below", value: 0.32 } }]),
        phase("choir_p3", moveOrbit(2.8, 92), [
          attack("choir_sigil_p3", 260, 200, 240, 1720, "choir_sigil", sigilActionFactory(36, 3000, 0.62), 700),
          attack("choir_radial_p3", 240, 180, 220, 1050, "choir_radial", radialActionFactory(6, 0.75, 176, "#9362ad"), 520),
        ], [], collapseEdgesOnEnter()),
      ],
    }),
    createBossDefinition({
      id: "warden",
      name: "WARDEN OF LITANY",
      pathAffinity: "ascetic",
      health: 56,
      speed: 72,
      damage: 1.15,
      color: "#6f6b4b",
      phases: [
        phase("warden_p1", moveChase(0.9), [
          attack("warden_bolt", 260, 190, 260, 1200, "warden_bolt", aimedActionFactory(0.9, 200), 600),
          attack("warden_prayer", 360, 260, 320, 2100, "warden_prayer", summonActionFactory(2, "votary"), 1000),
        ], [{ target: "warden_p2", guard: { type: "health_below", value: 0.48 } }]),
        phase("warden_p2", moveChase(1.35), [
          attack("warden_halo", 270, 190, 250, 1200, "warden_halo", radialActionFactory(10, 0.7, 170, "#cdb66a"), 550),
          attack("warden_sigil", 300, 220, 260, 1800, "warden_sigil", sigilActionFactory(34, 2000, 0.55), 780),
        ], []),
      ],
    }),
    createBossDefinition({
      id: "reliquary",
      name: "RELIQUARY ENGINE",
      pathAffinity: "demonic",
      health: 62,
      speed: 82,
      damage: 1.3,
      color: "#472018",
      phases: [
        phase("reliquary_p1", moveDelayed(0.07), [
          attack("reliquary_lance", 280, 200, 250, 1250, "reliquary_lance", aimedActionFactory(1.0, 220), 620),
        ], [{ target: "reliquary_p2", guard: { type: "health_below", value: 0.68 } }]),
        phase("reliquary_p2", moveDelayed(0.09), [
          attack("reliquary_sigil", 300, 230, 270, 1680, "reliquary_sigil", sigilActionFactory(32, 2000, 0.55), 780),
          attack("reliquary_spokes", 250, 180, 230, 1180, "reliquary_spokes", radialActionFactory(7, 0.72, 170, "#8f2d1c"), 560),
        ], [{ target: "reliquary_p3", guard: { type: "health_below", value: 0.35 } }]),
        phase("reliquary_p3", moveDelayed(0.11), [
          attack("reliquary_summon", 360, 230, 310, 2100, "reliquary_summon", summonActionFactory(3, "acolyte"), 980),
          attack("reliquary_lance_fast", 230, 170, 210, 780, "reliquary_lance", aimedActionFactory(1.1, 235), 390),
        ], [], confinementOnEnter(0.028, 70, 0.34)),
      ],
    }),
    createBossDefinition({
      id: "censer",
      name: "CENSER MATRON",
      pathAffinity: "unaligned",
      health: 46,
      speed: 70,
      damage: 1,
      color: "#5b7050",
      phases: [
        phase("censer_p1", moveOrbit(1.9, 125), [
          attack("censer_smoke", 320, 230, 280, 1800, "censer_smoke", sigilActionFactory(36, 2200, 0.5), 900),
          attack("censer_lace", 250, 190, 230, 1280, "censer_lace", radialActionFactory(5, 0.6, 155, "#88a180"), 610),
        ], [{ target: "censer_p2", guard: { type: "health_below", value: 0.44 } }]),
        phase("censer_p2", moveOrbit(2.5, 96), [
          attack("censer_lace_dense", 240, 170, 210, 980, "censer_lace", radialActionFactory(8, 0.62, 170, "#88a180"), 470),
          attack("censer_summon", 350, 240, 290, 2050, "censer_summon", summonActionFactory(2, "sigilist"), 920),
        ], []),
      ],
    }),
    createBossDefinition({
      id: "martyr",
      name: "MARTYR TWIN",
      pathAffinity: "ascetic",
      health: 58,
      speed: 80,
      damage: 1.25,
      color: "#7d6360",
      phases: [
        phase("martyr_p1", moveChase(1.1), [
          attack("martyr_strike", 270, 190, 250, 1120, "martyr_strike", aimedActionFactory(1.0, 210), 560),
        ], [{ target: "martyr_p2", guard: { type: "health_below", value: 0.67 } }]),
        phase("martyr_p2", moveChase(1.2), [
          attack("martyr_halo", 260, 180, 230, 1200, "martyr_halo", radialActionFactory(6, 0.74, 170, "#b58b84"), 600),
          attack("martyr_brand", 310, 220, 260, 1760, "martyr_brand", sigilActionFactory(30, 1900, 0.6), 780),
        ], [{ target: "martyr_p3", guard: { type: "health_below", value: 0.34 } }]),
        phase("martyr_p3", moveChase(1.4), [
          attack("martyr_duress", 230, 170, 210, 870, "martyr_duress", aimedActionFactory(1.18, 235), 420),
          attack("martyr_call", 330, 210, 270, 1900, "martyr_call", summonActionFactory(3, "vesper_guard"), 850),
        ], []),
      ],
    }),
    createBossDefinition({
      id: "carrion",
      name: "CARRION CHOIRMASTER",
      pathAffinity: "demonic",
      health: 64,
      speed: 86,
      damage: 1.35,
      color: "#3f1713",
      phases: [
        phase("carrion_p1", moveDelayed(0.09), [
          attack("carrion_fang", 260, 190, 230, 980, "carrion_fang", aimedActionFactory(1.1, 225), 490),
          attack("carrion_wing", 280, 190, 250, 1360, "carrion_wing", radialActionFactory(7, 0.72, 180, "#7b1d15"), 640),
        ], [{ target: "carrion_p2", guard: { type: "health_below", value: 0.45 } }]),
        phase("carrion_p2", moveDelayed(0.12), [
          attack("carrion_wing_dense", 230, 170, 210, 900, "carrion_wing", radialActionFactory(10, 0.76, 190, "#7b1d15"), 430),
          attack("carrion_spawn", 350, 240, 310, 2100, "carrion_spawn", summonActionFactory(4, "maggot"), 980),
        ], [], confinementOnEnter(0.032, 72, 0.36)),
      ],
    }),
    createBossDefinition({
      id: "vesper",
      name: "VESPER BELL",
      pathAffinity: "unaligned",
      health: 52,
      speed: 78,
      damage: 1.05,
      color: "#49637a",
      phases: [
        phase("vesper_p1", moveOrbit(1.8, 128), [
          attack("vesper_wave", 300, 220, 250, 1500, "vesper_wave", radialActionFactory(5, 0.65, 165, "#6e90af"), 740),
          attack("vesper_brand", 320, 230, 280, 2000, "vesper_brand", sigilActionFactory(30, 1700, 0.5), 1000),
        ], [{ target: "vesper_p2", guard: { type: "health_below", value: 0.62 } }]),
        phase("vesper_p2", moveOrbit(2.2, 104), [
          attack("vesper_wave_fast", 250, 180, 220, 980, "vesper_wave", radialActionFactory(7, 0.68, 172, "#6e90af"), 490),
          attack("vesper_lance", 240, 180, 220, 980, "vesper_lance", aimedActionFactory(1.0, 220), 500),
        ], [{ target: "vesper_p3", guard: { type: "health_below", value: 0.31 } }]),
        phase("vesper_p3", moveOrbit(2.8, 88), [
          attack("vesper_toll", 230, 170, 210, 900, "vesper_toll", radialActionFactory(9, 0.72, 186, "#7a9abc"), 440),
          attack("vesper_call", 330, 220, 280, 1920, "vesper_call", summonActionFactory(2, "chorister"), 930),
        ], []),
      ],
    }),
    createBossDefinition({
      id: "apostate",
      name: "THE APOSTATE",
      pathAffinity: "demonic",
      health: 68,
      speed: 84,
      damage: 1.4,
      color: "#2f0d1f",
      phases: [
        phase("apostate_p1", moveChase(1.0), [
          attack("apostate_sting", 250, 180, 220, 1020, "apostate_sting", aimedActionFactory(1.05, 220), 500),
          attack("apostate_sigil", 300, 220, 260, 1680, "apostate_sigil", sigilActionFactory(33, 2200, 0.58), 760),
        ], [{ target: "apostate_p2", guard: { type: "health_below", value: 0.64 } }]),
        phase("apostate_p2", moveChase(1.2), [
          attack("apostate_spokes", 260, 180, 220, 1120, "apostate_spokes", radialActionFactory(8, 0.72, 180, "#722d7a"), 560),
          attack("apostate_call", 330, 220, 280, 2000, "apostate_call", summonActionFactory(3, "heretic"), 920),
        ], [{ target: "apostate_p3", guard: { type: "health_below", value: 0.34 } }]),
        phase("apostate_p3", moveChase(1.38), [
          attack("apostate_sting_fast", 220, 160, 200, 760, "apostate_sting", aimedActionFactory(1.2, 238), 380),
          attack("apostate_fan", 230, 170, 220, 900, "apostate_fan", radialActionFactory(11, 0.76, 192, "#722d7a"), 440),
        ], [], collapseEdgesOnEnter()),
      ],
    }),
  ];

  /* ================================================================== */
  /*  DEFINITIONS REGISTRY                                               */
  /* ================================================================== */

  var BOSS_DEFINITIONS = {};
  for (var bi = 0; bi < BOSS_ROSTER.length; bi++) {
    BOSS_DEFINITIONS[BOSS_ROSTER[bi].id] = BOSS_ROSTER[bi];
  }

  var BOSS_FLOOR_POOLS = [
    ["shepherd", "warden", "censer"],
    ["choir", "reliquary", "martyr"],
    ["pit", "carrion", "vesper"],
    ["apostate", "pit", "carrion"],
  ];

  function selectBossForFloor(floor, seed) {
    var f = Math.max(0, Math.min(BOSS_FLOOR_POOLS.length - 1, floor | 0));
    var pool = BOSS_FLOOR_POOLS[f];
    var rng = createDeterministicRng(((seed || 1) + f * 911) >>> 0);
    var idx = Math.floor(rng() * pool.length) % pool.length;
    return pool[idx];
  }

  /* ================================================================== */
  /*  DEBUG OVERLAY                                                      */
  /* ================================================================== */

  function getBossDebugOverlay(boss) {
    var phase = getPhase(boss);
    var attackSummaries = [];
    if (phase && phase.attacks) {
      for (var a = 0; a < phase.attacks.length; a++) {
        var atk = phase.attacks[a];
        var as = boss.attackStates[atk.name];
        if (as) {
          attackSummaries.push(atk.name + ":" + as.state + " cd=" + as.cooldownMs.toFixed(0) + " win=" + as.windowMs.toFixed(0) + " #" + as.attackId);
        }
      }
    }
    return {
      id: boss.id,
      phaseId: boss.phaseId,
      health: boss.health + "/" + boss.maxHealth,
      phaseTimeMs: boss.phaseTimeMs.toFixed(0),
      phasesVisited: boss.phasesVisited.slice(),
      attacks: attackSummaries,
      activeHazards: boss.activeHazards.length,
      inputLocked: boss.inputLocked,
      dead: boss.dead,
    };
  }

  return {
    BOSS_ROSTER,
    BOSS_DEFINITIONS,
    BOSS_FLOOR_POOLS,
    selectBossForFloor,
    createBossState,
    updateBoss,
    damageBoss,
    getBossDebugOverlay,
  };
});
