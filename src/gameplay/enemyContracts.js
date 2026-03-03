(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const BEHAVIOR_TYPES = ["chase", "charge", "kite", "summon", "zone", "support", "disruptor"];

  const BEHAVIOR_CONTRACTS = {
    chase: { telegraphMs: 220, readMs: 280, recoverMs: 320, cooldownMs: 850, damage: 1, source: "body", range: 34 },
    charge: { telegraphMs: 360, readMs: 220, recoverMs: 420, cooldownMs: 1000, damage: 1.25, source: "rush", range: 36 },
    kite: { telegraphMs: 180, readMs: 320, recoverMs: 260, cooldownMs: 900, damage: 0.75, source: "projectile", range: 220 },
    summon: { telegraphMs: 420, readMs: 260, recoverMs: 380, cooldownMs: 1250, summonCount: 2, source: "summon", range: 180 },
    zone: { telegraphMs: 300, readMs: 460, recoverMs: 340, cooldownMs: 1050, damage: 0.8, source: "sigil", range: 130 },
    support: { telegraphMs: 260, readMs: 300, recoverMs: 280, cooldownMs: 980, amount: 0.3, source: "chant", range: 200 },
    disruptor: { telegraphMs: 310, readMs: 240, recoverMs: 300, cooldownMs: 1040, amount: 0.6, source: "hex", range: 160 },
  };

  const ROLE_BY_BEHAVIOR = {
    chase: "melee",
    charge: "melee",
    kite: "ranged",
    summon: "ranged",
    zone: "area",
    support: "ranged",
    disruptor: "area",
  };

  const ENEMY_ROSTER = [
    { id: "penitent", behavior: "chase", role: "melee", baseHealth: 2, baseSpeed: 62, baseDamage: 0.55, pathAffinity: "ascetic", color: "#89272d" },
    { id: "bonecrawler", behavior: "chase", role: "melee", baseHealth: 3, baseSpeed: 106, baseDamage: 0.95, pathAffinity: "unaligned", color: "#bcbaaa" },
    { id: "flagellant", behavior: "chase", role: "melee", baseHealth: 4, baseSpeed: 78, baseDamage: 1.05, pathAffinity: "ascetic", color: "#9f3f46" },
    { id: "dread_hound", behavior: "chase", role: "melee", baseHealth: 4, baseSpeed: 94, baseDamage: 1.1, pathAffinity: "demonic", color: "#6f1e22" },
    { id: "hollowed", behavior: "charge", role: "melee", baseHealth: 3, baseSpeed: 75, baseDamage: 1, pathAffinity: "demonic", color: "#c7b39e" },
    { id: "revenant", behavior: "charge", role: "melee", baseHealth: 6, baseSpeed: 55, baseDamage: 1.35, pathAffinity: "unaligned", color: "#7c7c7c" },
    { id: "lancer", behavior: "charge", role: "melee", baseHealth: 5, baseSpeed: 70, baseDamage: 1.2, pathAffinity: "ascetic", color: "#c17f61" },
    { id: "gore_ram", behavior: "charge", role: "melee", baseHealth: 5, baseSpeed: 82, baseDamage: 1.25, pathAffinity: "demonic", color: "#7c2620" },
    { id: "wisp", behavior: "kite", role: "ranged", baseHealth: 2, baseSpeed: 56, baseDamage: 0.55, pathAffinity: "unaligned", color: "#805ca0" },
    { id: "seraph", behavior: "kite", role: "ranged", baseHealth: 5, baseSpeed: 84, baseDamage: 0.95, pathAffinity: "ascetic", color: "#ca8054" },
    { id: "chorister", behavior: "kite", role: "ranged", baseHealth: 3, baseSpeed: 66, baseDamage: 0.8, pathAffinity: "unaligned", color: "#8d5ca8" },
    { id: "soul_archer", behavior: "kite", role: "ranged", baseHealth: 4, baseSpeed: 72, baseDamage: 0.95, pathAffinity: "demonic", color: "#8e4a7e" },
    { id: "acolyte", behavior: "summon", role: "ranged", baseHealth: 4, baseSpeed: 48, baseDamage: 0.85, pathAffinity: "demonic", color: "#6d3f33" },
    { id: "vesper_guard", behavior: "summon", role: "ranged", baseHealth: 5, baseSpeed: 52, baseDamage: 0.9, pathAffinity: "ascetic", color: "#58718d" },
    { id: "heretic", behavior: "summon", role: "ranged", baseHealth: 4, baseSpeed: 50, baseDamage: 1, pathAffinity: "demonic", color: "#5d273f" },
    { id: "maggot", behavior: "summon", role: "ranged", baseHealth: 3, baseSpeed: 58, baseDamage: 0.75, pathAffinity: "demonic", color: "#797252" },
    { id: "sigilist", behavior: "zone", role: "area", baseHealth: 4, baseSpeed: 52, baseDamage: 0.8, pathAffinity: "unaligned", color: "#4f829f" },
    { id: "plague", behavior: "zone", role: "area", baseHealth: 4, baseSpeed: 50, baseDamage: 1, pathAffinity: "demonic", color: "#4f7f45" },
    { id: "cantor", behavior: "support", role: "ranged", baseHealth: 4, baseSpeed: 60, baseDamage: 0.7, pathAffinity: "ascetic", color: "#6d8c75" },
    { id: "obscurer", behavior: "disruptor", role: "area", baseHealth: 5, baseSpeed: 58, baseDamage: 0.95, pathAffinity: "demonic", color: "#412a57" },
  ];

  const ELITE_MODIFIERS = {
    faster: { speedScale: 1.2 },
    armored: { healthScale: 1.4 },
    cursed: { cooldownScale: 0.9, damageScale: 1.15 },
    berserk: { speedScale: 1.15, damageScale: 1.2, cooldownScale: 0.85 },
  };

  function createDeterministicRng(seed = 1) {
    let state = (seed >>> 0) || 1;
    return function next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function getEnemyArchetype(id) {
    for (const archetype of ENEMY_ROSTER) {
      if (archetype.id === id) return archetype;
    }
    return null;
  }

  function createEnemyBehaviorState({ id, behavior, x = 0, y = 0, speed = 62, health = 3, modifier = null }) {
    if (!BEHAVIOR_CONTRACTS[behavior]) throw new Error(`Unknown behavior: ${behavior}`);
    const enemy = {
      id,
      behavior,
      role: ROLE_BY_BEHAVIOR[behavior],
      x,
      y,
      speed,
      health,
      modifier,
      state: "idle",
      cooldownMs: 0,
      windowMs: 0,
      attackId: 0,
      windowConsumed: false,
      dirX: 0,
      dirY: 0,
    };
    if (modifier) applyEliteModifier(enemy, modifier);
    enemy.cooldownMs = BEHAVIOR_CONTRACTS[behavior].cooldownMs;
    return enemy;
  }

  function createEnemyFromArchetype(archetypeId, options = {}) {
    const archetype = getEnemyArchetype(archetypeId);
    if (!archetype) throw new Error(`Unknown enemy archetype: ${archetypeId}`);
    const enemy = createEnemyBehaviorState({
      id: options.id || archetype.id,
      behavior: archetype.behavior,
      x: options.x || 0,
      y: options.y || 0,
      speed: options.speed || archetype.baseSpeed,
      health: options.health || archetype.baseHealth,
      modifier: options.modifier || null,
    });
    enemy.type = archetype.id;
    enemy.pathAffinity = archetype.pathAffinity;
    enemy.color = archetype.color;
    enemy.damage = archetype.baseDamage;
    return enemy;
  }

  function applyEliteModifier(enemy, modifier) {
    const stats = ELITE_MODIFIERS[modifier];
    if (!stats) return enemy;
    enemy.speed *= stats.speedScale || 1;
    enemy.health *= stats.healthScale || 1;
    enemy.cooldownScale = stats.cooldownScale || 1;
    enemy.damageScale = stats.damageScale || 1;
    enemy.modifier = modifier;
    return enemy;
  }

  function distanceToTarget(enemy, target) {
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    return { dx, dy, d, nx: dx / d, ny: dy / d };
  }

  function startWindow(enemy, windowName, durationMs) {
    enemy.state = windowName;
    enemy.windowMs = durationMs;
    enemy.windowConsumed = false;
  }

  function progressAttackWindow(enemy, contract, events, target) {
    if (enemy.state === "idle") {
      startWindow(enemy, "telegraph", contract.telegraphMs);
      enemy.attackId += 1;
      events.push({ type: "telegraph_start", enemyId: enemy.id, behavior: enemy.behavior, attackId: enemy.attackId });
      return;
    }
    if (enemy.state === "telegraph") {
      startWindow(enemy, "read", contract.readMs);
      events.push({ type: "read_start", enemyId: enemy.id, behavior: enemy.behavior, attackId: enemy.attackId });
      return;
    }
    if (enemy.state === "read") {
      startWindow(enemy, "recover", contract.recoverMs);
      events.push({ type: "recover_start", enemyId: enemy.id, behavior: enemy.behavior, attackId: enemy.attackId });
      return;
    }
    enemy.state = "idle";
    enemy.cooldownMs = contract.cooldownMs * (enemy.cooldownScale || 1);
    events.push({ type: "attack_end", enemyId: enemy.id, behavior: enemy.behavior, attackId: enemy.attackId, targetId: target.id || "player" });
  }

  function maybeEmitReadAction(enemy, contract, target, events) {
    if (enemy.state !== "read" || enemy.windowConsumed) return;
    enemy.windowConsumed = true;
    const dist = distanceToTarget(enemy, target);
    const damageBase = contract.damage != null ? contract.damage : (contract.amount != null ? contract.amount : 0);
    const damage = damageBase * (enemy.damageScale || 1);
    const base = {
      enemyId: enemy.id,
      behavior: enemy.behavior,
      attackId: enemy.attackId,
      window: "read",
      source: contract.source,
      targetId: target.id || "player",
    };

    if (enemy.behavior === "kite") {
      events.push(Object.assign({ type: "projectile", amount: damage, direction: { x: dist.nx, y: dist.ny } }, base));
      return;
    }
    if (enemy.behavior === "summon") {
      events.push(Object.assign({ type: "summon", count: contract.summonCount }, base));
      return;
    }
    if (enemy.behavior === "support") {
      events.push(Object.assign({ type: "buff_aura", hasteScale: 1 + contract.amount }, base));
      return;
    }
    if (enemy.behavior === "disruptor") {
      events.push(Object.assign({ type: "disrupt", slowSec: 0.6, amount: damage }, base));
      return;
    }
    if (enemy.behavior === "zone") {
      const inside = dist.d <= contract.range;
      events.push(Object.assign({ type: "zone", radius: contract.range, amount: inside ? damage : 0 }, base));
      return;
    }
    if (dist.d <= contract.range) {
      events.push(Object.assign({ type: "damage", amount: damage }, base));
    }
  }

  function advanceBehaviorPosition(enemy, target, dtMs) {
    const { nx, ny, d } = distanceToTarget(enemy, target);
    const speedPerMs = enemy.speed / 1000;
    if (enemy.behavior === "kite") {
      const desired = 170;
      const sign = d < desired ? -1 : 1;
      enemy.x += nx * sign * speedPerMs * dtMs;
      enemy.y += ny * sign * speedPerMs * dtMs;
      return;
    }
    if (enemy.behavior === "zone" || enemy.behavior === "summon" || enemy.behavior === "support" || enemy.behavior === "disruptor") {
      const tangentX = -ny;
      const tangentY = nx;
      enemy.x += tangentX * speedPerMs * dtMs * 0.65;
      enemy.y += tangentY * speedPerMs * dtMs * 0.65;
      return;
    }
    if (enemy.behavior === "charge" && enemy.state === "read") {
      enemy.x += enemy.dirX * speedPerMs * dtMs * 2.3;
      enemy.y += enemy.dirY * speedPerMs * dtMs * 2.3;
      return;
    }
    enemy.x += nx * speedPerMs * dtMs;
    enemy.y += ny * speedPerMs * dtMs;
  }

  function updateEnemyBehavior(enemy, context) {
    const dtMs = context.dtMs;
    const target = context.target || { id: "player", x: 0, y: 0 };
    const contract = BEHAVIOR_CONTRACTS[enemy.behavior];
    const events = [];

    advanceBehaviorPosition(enemy, target, dtMs);

    if (enemy.behavior === "charge") {
      const lock = distanceToTarget(enemy, target);
      enemy.dirX = lock.nx;
      enemy.dirY = lock.ny;
    }

    if (enemy.state === "idle") {
      enemy.cooldownMs = Math.max(0, enemy.cooldownMs - dtMs);
      if (enemy.cooldownMs <= 0) {
        progressAttackWindow(enemy, contract, events, target);
      }
      return events;
    }

    enemy.windowMs = Math.max(0, enemy.windowMs - dtMs);
    maybeEmitReadAction(enemy, contract, target, events);
    if (enemy.windowMs <= 0) {
      progressAttackWindow(enemy, contract, events, target);
    }
    return events;
  }

  function buildEnemyDebugOverlay(enemy) {
    return `${enemy.id} ${enemy.behavior.toUpperCase()} ${enemy.state.toUpperCase()} win=${enemy.windowMs.toFixed(0)}ms cd=${enemy.cooldownMs.toFixed(0)}ms atk=${enemy.attackId}${enemy.modifier ? ` ${enemy.modifier}` : ""}`;
  }

  function buildEncounterDebugOverlay(enemies, maxLines = 6) {
    return enemies.slice(0, maxLines).map(buildEnemyDebugOverlay);
  }

  function composeEncounter({ seed = 1, roomIntent = "combat", wave = 1 } = {}) {
    const rng = createDeterministicRng(seed);
    const roster = [];
    const required = roomIntent === "combat"
      ? ["chase", "kite", "zone", "support"]
      : ["chase", "charge", "kite", "summon", "zone", "support", "disruptor"];

    for (const behavior of required) {
      const candidates = ENEMY_ROSTER.filter((entry) => entry.behavior === behavior);
      const pick = candidates[Math.floor(rng() * candidates.length) % candidates.length];
      roster.push(createEnemyFromArchetype(pick.id, {
        id: `${pick.id}-${roster.length}`,
        x: 120 + Math.floor(rng() * 500),
        y: 80 + Math.floor(rng() * 260),
        modifier: rng() > 0.88 ? ["faster", "armored", "cursed", "berserk"][Math.floor(rng() * 4)] : null,
      }));
    }

    const extras = Math.max(0, wave - 1);
    for (let i = 0; i < extras; i++) {
      const archetype = ENEMY_ROSTER[Math.floor(rng() * ENEMY_ROSTER.length)];
      roster.push(createEnemyFromArchetype(archetype.id, {
        id: `extra-${i}-${archetype.id}`,
        x: 120 + Math.floor(rng() * 500),
        y: 80 + Math.floor(rng() * 260),
      }));
    }
    return roster;
  }

  function summarizeEncounterComposition(enemies) {
    const summary = {
      total: enemies.length,
      behaviors: {},
      roles: { melee: 0, ranged: 0, area: 0 },
      validPressureMix: false,
    };
    for (const enemy of enemies) {
      summary.behaviors[enemy.behavior] = (summary.behaviors[enemy.behavior] || 0) + 1;
      summary.roles[enemy.role] = (summary.roles[enemy.role] || 0) + 1;
    }
    summary.validPressureMix = summary.roles.melee > 0 && summary.roles.ranged > 0 && summary.roles.area > 0;
    return summary;
  }

  function runEncounterStress({ iterations = 100, roomIntent = "combat", wave = 3, seed = 13 } = {}) {
    const samples = [];
    let invalid = 0;
    for (let i = 0; i < iterations; i++) {
      const enemies = composeEncounter({ roomIntent, wave, seed: seed + i * 17 });
      const summary = summarizeEncounterComposition(enemies);
      if (!summary.validPressureMix) invalid += 1;
      samples.push({ seed: seed + i * 17, summary });
    }
    return { iterations, invalid, samples };
  }

  return {
    BEHAVIOR_TYPES,
    BEHAVIOR_CONTRACTS,
    ENEMY_ROSTER,
    ELITE_MODIFIERS,
    ROLE_BY_BEHAVIOR,
    createDeterministicRng,
    getEnemyArchetype,
    createEnemyFromArchetype,
    createEnemyBehaviorState,
    updateEnemyBehavior,
    buildEnemyDebugOverlay,
    buildEncounterDebugOverlay,
    composeEncounter,
    summarizeEncounterComposition,
    runEncounterStress,
  };
});
