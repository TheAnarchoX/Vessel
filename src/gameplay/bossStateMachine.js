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
      delay: [],
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

  /* ---------- SHEPHERD ---------- */
  var SHEPHERD_DEF = {
    id: "shepherd",
    health: 36,
    speed: 64,
    damage: 1,
    radius: 36,
    color: "#6a3a2b",
    initialPhase: "shepherd_p1",
    intro: { durationMs: 800 },
    outro: { durationMs: 600 },
    phases: [
      {
        id: "shepherd_p1",
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          var dx = target.x - boss.x;
          var dy = target.y - boss.y;
          var d = Math.hypot(dx, dy) || 1;
          var sp = boss.speed / 1000 * dtMs;
          boss.x += (dx / d) * sp;
          boss.y += (dy / d) * sp;
        },
        attacks: [
          {
            name: "shepherd_summon",
            telegraphMs: 300,
            readMs: 200,
            recoverMs: 300,
            cooldownMs: 1700,
            initialCooldownMs: 850,
            source: "shepherd_summon",
            action: function (boss) {
              return [
                { type: "summon", count: 2, summonType: "penitent", x: boss.x, y: boss.y },
              ];
            },
          },
        ],
        transitions: [
          { target: "shepherd_p2", guard: { type: "health_below", value: 0.5 } },
        ],
      },
      {
        id: "shepherd_p2",
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          var dx = target.x - boss.x;
          var dy = target.y - boss.y;
          var d = Math.hypot(dx, dy) || 1;
          var sp = boss.speed * 1.5 / 1000 * dtMs;
          boss.x += (dx / d) * sp;
          boss.y += (dy / d) * sp;
        },
        attacks: [
          {
            name: "shepherd_radial",
            telegraphMs: 250,
            readMs: 180,
            recoverMs: 250,
            cooldownMs: 1700,
            initialCooldownMs: 600,
            source: "shepherd_radial",
            action: function (boss) {
              var shots = [];
              for (var i = 0; i < 8; i++) {
                var a = i * Math.PI / 4;
                shots.push({ type: "projectile", amount: 0.8, direction: { x: Math.cos(a), y: Math.sin(a) }, speed: 170, x: boss.x, y: boss.y, color: "#912" });
              }
              return shots;
            },
          },
        ],
        transitions: [],
      },
    ],
  };

  /* ---------- PIT ---------- */
  var PIT_DEF = {
    id: "pit",
    health: 58,
    speed: 88,
    damage: 1.5,
    radius: 36,
    color: "#170812",
    initialPhase: "pit_p1",
    intro: { durationMs: 1000 },
    outro: { durationMs: 700 },
    phases: [
      {
        id: "pit_p1",
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          boss.delay.push({ x: target.x, y: target.y });
          if (boss.delay.length > 20) {
            var m = boss.delay.shift();
            boss.x += (m.x - boss.x) * 0.08;
            boss.y += (m.y - boss.y) * 0.08;
          }
        },
        attacks: [
          {
            name: "pit_aimed",
            telegraphMs: 280,
            readMs: 200,
            recoverMs: 260,
            cooldownMs: 1300,
            initialCooldownMs: 650,
            source: "pit_aimed",
            action: function (boss, ctx) {
              var target = ctx.target;
              var dx = target.x - boss.x;
              var dy = target.y - boss.y;
              var d = Math.hypot(dx, dy) || 1;
              return [{ type: "projectile", amount: 1, direction: { x: dx / d, y: dy / d }, speed: 210, x: boss.x, y: boss.y }];
            },
          },
        ],
        transitions: [
          { target: "pit_p2", guard: { type: "health_below", value: 0.66 } },
        ],
      },
      {
        id: "pit_p2",
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          boss.delay.push({ x: target.x, y: target.y });
          if (boss.delay.length > 20) {
            var m = boss.delay.shift();
            boss.x += (m.x - boss.x) * 0.08;
            boss.y += (m.y - boss.y) * 0.08;
          }
        },
        attacks: [
          {
            name: "pit_aimed_fast",
            telegraphMs: 240,
            readMs: 180,
            recoverMs: 220,
            cooldownMs: 750,
            initialCooldownMs: 375,
            source: "pit_aimed_fast",
            action: function (boss, ctx) {
              var target = ctx.target;
              var dx = target.x - boss.x;
              var dy = target.y - boss.y;
              var d = Math.hypot(dx, dy) || 1;
              return [{ type: "projectile", amount: 1, direction: { x: dx / d, y: dy / d }, speed: 210, x: boss.x, y: boss.y }];
            },
          },
        ],
        transitions: [
          { target: "pit_p3", guard: { type: "health_below", value: 0.33 } },
        ],
      },
      {
        id: "pit_p3",
        onEnter: function (boss, events) {
          var hApi = hazardApi();
          if (hApi) {
            var h = hApi.createHazard("arena_confinement", {
              shrinkPerMs: 0.03,
              minMargin: 64,
              damage: 0.3,
              roomBounds: { x: 0, y: 0, w: 960, h: 540 },
            });
            var activateEvents = hApi.activateHazard(h);
            boss.activeHazards.push(h);
            for (var i = 0; i < activateEvents.length; i++) {
              activateEvents[i].bossId = boss.id;
              events.push(activateEvents[i]);
            }
          }
        },
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          boss.delay.push({ x: target.x, y: target.y });
          if (boss.delay.length > 20) {
            var m = boss.delay.shift();
            boss.x += (m.x - boss.x) * 0.08;
            boss.y += (m.y - boss.y) * 0.08;
          }
        },
        attacks: [
          {
            name: "pit_aimed_fast",
            telegraphMs: 240,
            readMs: 180,
            recoverMs: 220,
            cooldownMs: 750,
            initialCooldownMs: 375,
            source: "pit_aimed_fast",
            action: function (boss, ctx) {
              var target = ctx.target;
              var dx = target.x - boss.x;
              var dy = target.y - boss.y;
              var d = Math.hypot(dx, dy) || 1;
              return [{ type: "projectile", amount: 1, direction: { x: dx / d, y: dy / d }, speed: 210, x: boss.x, y: boss.y }];
            },
          },
        ],
        transitions: [],
      },
    ],
  };

  /* ---------- CHOIR ---------- */
  var CHOIR_DEF = {
    id: "choir",
    health: 48,
    speed: 75,
    damage: 1,
    radius: 36,
    color: "#8d5ca8",
    initialPhase: "choir_p1",
    intro: { durationMs: 900 },
    outro: { durationMs: 650 },
    phases: [
      {
        id: "choir_p1",
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          boss.orbitAngle += dtMs / 1000 * 1.6;
          var orbit = 130;
          boss.x = target.x + Math.cos(boss.orbitAngle) * orbit;
          boss.y = target.y + Math.sin(boss.orbitAngle) * orbit;
        },
        attacks: [
          {
            name: "choir_sigil",
            telegraphMs: 320,
            readMs: 240,
            recoverMs: 280,
            cooldownMs: 2500,
            initialCooldownMs: 1200,
            source: "choir_sigil",
            action: function (boss, ctx) {
              var hApi = hazardApi();
              if (hApi) {
                var rng = boss._rng;
                var rb = ctx.roomBounds || { x: 80, y: 50, w: 800, h: 440 };
                var h = hApi.createHazard("damage_sigil", {
                  x: rb.x + 40 + rng() * (rb.w - 80),
                  y: rb.y + 40 + rng() * (rb.h - 80),
                  radius: 28,
                  warnMs: 400,
                  activeMs: 1800,
                  damage: 0.5,
                });
                var activateEvents = hApi.activateHazard(h);
                boss.activeHazards.push(h);
                var evts = [{ type: "hazard_spawn", hazardType: "damage_sigil", x: h.x, y: h.y }];
                for (var i = 0; i < activateEvents.length; i++) evts.push(activateEvents[i]);
                return evts;
              }
              return [{ type: "hazard_spawn", hazardType: "damage_sigil", x: boss.x, y: boss.y }];
            },
          },
        ],
        transitions: [
          { target: "choir_p2", guard: { type: "health_below", value: 0.6 } },
        ],
      },
      {
        id: "choir_p2",
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          boss.orbitAngle += dtMs / 1000 * 2.4;
          var orbit = 110;
          boss.x = target.x + Math.cos(boss.orbitAngle) * orbit;
          boss.y = target.y + Math.sin(boss.orbitAngle) * orbit;
        },
        attacks: [
          {
            name: "choir_sigil_p2",
            telegraphMs: 280,
            readMs: 220,
            recoverMs: 260,
            cooldownMs: 2200,
            initialCooldownMs: 800,
            source: "choir_sigil",
            action: function (boss, ctx) {
              var hApi = hazardApi();
              if (hApi) {
                var rng = boss._rng;
                var rb = ctx.roomBounds || { x: 80, y: 50, w: 800, h: 440 };
                var h = hApi.createHazard("damage_sigil", {
                  x: rb.x + 40 + rng() * (rb.w - 80),
                  y: rb.y + 40 + rng() * (rb.h - 80),
                  radius: 32,
                  warnMs: 400,
                  activeMs: 2800,
                  damage: 0.5,
                });
                var activateEvents = hApi.activateHazard(h);
                boss.activeHazards.push(h);
                var evts = [{ type: "hazard_spawn", hazardType: "damage_sigil", x: h.x, y: h.y }];
                for (var i = 0; i < activateEvents.length; i++) evts.push(activateEvents[i]);
                return evts;
              }
              return [{ type: "hazard_spawn", hazardType: "damage_sigil" }];
            },
          },
          {
            name: "choir_radial_p2",
            telegraphMs: 260,
            readMs: 200,
            recoverMs: 240,
            cooldownMs: 1400,
            initialCooldownMs: 700,
            source: "choir_radial",
            action: function (boss) {
              var shots = [];
              for (var i = 0; i < 4; i++) {
                var a = i * Math.PI / 2 + boss.orbitAngle;
                shots.push({ type: "projectile", amount: 0.6, direction: { x: Math.cos(a), y: Math.sin(a) }, speed: 160, x: boss.x, y: boss.y, color: "#9362ad" });
              }
              return shots;
            },
          },
        ],
        transitions: [
          { target: "choir_p3", guard: { type: "health_below", value: 0.3 } },
        ],
      },
      {
        id: "choir_p3",
        onEnter: function (boss, events) {
          var hApi = hazardApi();
          if (hApi) {
            var rb = { x: 80, y: 50, w: 800, h: 440 };
            // Collapsing zone on left side
            var zone1 = hApi.createHazard("collapsing_zone", {
              rect: { x: rb.x, y: rb.y, w: 100, h: rb.h },
              warnMs: 800,
              collapseMs: Infinity,
              damage: 0.4,
            });
            hApi.activateHazard(zone1);
            boss.activeHazards.push(zone1);
            // Collapsing zone on right side
            var zone2 = hApi.createHazard("collapsing_zone", {
              rect: { x: rb.x + rb.w - 100, y: rb.y, w: 100, h: rb.h },
              warnMs: 800,
              collapseMs: Infinity,
              damage: 0.4,
            });
            hApi.activateHazard(zone2);
            boss.activeHazards.push(zone2);
            events.push({ type: "hazard_spawn", bossId: boss.id, hazardType: "collapsing_zone", count: 2 });
          }
        },
        movement: function (boss, ctx, dtMs) {
          var target = ctx.target;
          boss.orbitAngle += dtMs / 1000 * 2.8;
          var orbit = 90;
          boss.x = target.x + Math.cos(boss.orbitAngle) * orbit;
          boss.y = target.y + Math.sin(boss.orbitAngle) * orbit;
        },
        attacks: [
          {
            name: "choir_sigil_p3",
            telegraphMs: 260,
            readMs: 200,
            recoverMs: 240,
            cooldownMs: 1800,
            initialCooldownMs: 600,
            source: "choir_sigil",
            action: function (boss, ctx) {
              var hApi = hazardApi();
              if (hApi) {
                var rng = boss._rng;
                var rb = ctx.roomBounds || { x: 80, y: 50, w: 800, h: 440 };
                var h = hApi.createHazard("damage_sigil", {
                  x: rb.x + 60 + rng() * (rb.w - 120),
                  y: rb.y + 60 + rng() * (rb.h - 120),
                  radius: 34,
                  warnMs: 350,
                  activeMs: 3200,
                  damage: 0.6,
                });
                var activateEvents = hApi.activateHazard(h);
                boss.activeHazards.push(h);
                var evts = [{ type: "hazard_spawn", hazardType: "damage_sigil", x: h.x, y: h.y }];
                for (var i = 0; i < activateEvents.length; i++) evts.push(activateEvents[i]);
                return evts;
              }
              return [{ type: "hazard_spawn", hazardType: "damage_sigil" }];
            },
          },
          {
            name: "choir_radial_p3",
            telegraphMs: 240,
            readMs: 180,
            recoverMs: 220,
            cooldownMs: 1100,
            initialCooldownMs: 550,
            source: "choir_radial",
            action: function (boss) {
              var shots = [];
              for (var i = 0; i < 6; i++) {
                var a = i * Math.PI / 3 + boss.orbitAngle;
                shots.push({ type: "projectile", amount: 0.7, direction: { x: Math.cos(a), y: Math.sin(a) }, speed: 175, x: boss.x, y: boss.y, color: "#9362ad" });
              }
              return shots;
            },
          },
        ],
        transitions: [],
      },
    ],
  };

  /* ================================================================== */
  /*  DEFINITIONS REGISTRY                                               */
  /* ================================================================== */

  var BOSS_DEFINITIONS = {
    shepherd: SHEPHERD_DEF,
    pit: PIT_DEF,
    choir: CHOIR_DEF,
  };

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
    BOSS_DEFINITIONS,
    createBossState,
    updateBoss,
    damageBoss,
    getBossDebugOverlay,
  };
});
