/* global require, module, __dirname, global */

const path = require("node:path");

let cachedModules = null;

function loadModules() {
  if (cachedModules) return cachedModules;

  global.globalThis = global;
  if (!global.VesselGameplay) global.VesselGameplay = {};
  if (!global.VesselEngine) global.VesselEngine = {};

  require(path.resolve(__dirname, "../../src/gameplay/enemyContracts.js"));
  require(path.resolve(__dirname, "../../src/gameplay/dungeonGenerator.js"));
  require(path.resolve(__dirname, "../../src/gameplay/itemSystem.js"));
  require(path.resolve(__dirname, "../../src/gameplay/bossHazards.js"));
  require(path.resolve(__dirname, "../../src/gameplay/bossStateMachine.js"));
  require(path.resolve(__dirname, "../../src/gameplay/bossReplay.js"));
  require(path.resolve(__dirname, "../../src/engine/saveMigrations.js"));

  cachedModules = {
    gameplay: global.VesselGameplay,
    engine: global.VesselEngine,
  };

  return cachedModules;
}

function round(n, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(n * scale) / scale;
}

function createCombatTelemetry(gameplay) {
  const baselinePlayer = { soul: 6, damage: 1, tears: 1.5 };
  const incoming = {};
  const ttkSec = {};
  let weightedIncomingDps = 0;

  for (const behavior of gameplay.BEHAVIOR_TYPES) {
    const contract = gameplay.BEHAVIOR_CONTRACTS[behavior];
    const amount = typeof contract.damage === "number" ? contract.damage : 0;
    const cooldownSec = contract.cooldownMs / 1000;
    const dps = cooldownSec > 0 ? amount / cooldownSec : 0;
    incoming[behavior] = round(dps, 4);
    weightedIncomingDps += dps;
  }

  weightedIncomingDps /= gameplay.BEHAVIOR_TYPES.length;

  const roster = gameplay.composeEncounter({ seed: 104729, roomIntent: "combat", wave: 3 });
  const comp = gameplay.summarizeEncounterComposition(roster);

  for (const behavior of gameplay.BEHAVIOR_TYPES) {
    const enemy = gameplay.createEnemyBehaviorState({
      id: behavior + "-ttk",
      behavior,
      health: 3,
    });
    ttkSec[behavior] = round(enemy.health / (baselinePlayer.damage * baselinePlayer.tears), 4);
  }

  return {
    baselinePlayer,
    averageIncomingDps: round(weightedIncomingDps, 4),
    survivabilitySec: round(baselinePlayer.soul / weightedIncomingDps, 4),
    incomingDpsByBehavior: incoming,
    ttkSecByBehavior: ttkSec,
    encounterComposition: comp,
  };
}

function createGenerationTelemetry(gameplay) {
  const sweepSeeds = 250;
  const floorMetrics = [];
  let totalFailures = 0;
  let maxAttempts = 0;

  for (let floor = 0; floor < 4; floor++) {
    let attemptsSum = 0;
    let entropySum = 0;
    let invalid = 0;

    for (let seed = 1; seed <= sweepSeeds; seed++) {
      try {
        const result = gameplay.generateValidDungeon(floor, seed);
        attemptsSum += result.attempts;
        if (result.attempts > maxAttempts) maxAttempts = result.attempts;

        const summary = gameplay.summarizeDungeon(result.dungeon);
        entropySum += summary.pathEntropy;
        if (!summary.valid) invalid++;
      } catch {
        totalFailures += 1;
        invalid += 1;
      }
    }

    floorMetrics.push({
      floor,
      seeds: sweepSeeds,
      avgAttempts: round(attemptsSum / sweepSeeds, 4),
      avgEntropy: round(entropySum / sweepSeeds, 4),
      invalidCount: invalid,
    });
  }

  return {
    sweepSeedsPerFloor: sweepSeeds,
    maxAttempts,
    totalFailures,
    floorMetrics,
  };
}

function createItemStackingTelemetry(gameplay) {
  const rng = gameplay.createDeterministicRng(987654321);
  const pool = gameplay.getAllPoolIds();
  const sampleBuilds = 400;
  let deadBuilds = 0;
  let capViolations = 0;
  let corruptionBoundsViolations = 0;

  for (let i = 0; i < sampleBuilds; i++) {
    const held = [];
    for (let pick = 0; pick < 8; pick++) {
      held.push(pool[Math.floor(rng() * pool.length)]);
    }

    const player = {
      soul: 6,
      maxSoul: 6,
      corruption: 0,
      damage: 1,
      tears: 1.5,
      speed: 180,
      range: 400,
      shotSpeed: 320,
      damageReduction: 0,
    };

    for (const itemId of held) {
      gameplay.applyItemEffects(player, itemId);
    }

    const synergies = gameplay.resolveActiveSynergies(held);
    gameplay.applySynergyBonuses(player, synergies);

    const viability = gameplay.detectDeadBuild(player, held);
    if (!viability.viable) deadBuilds++;

    if (player.damageReduction > gameplay.BALANCE.MAX_DAMAGE_REDUCTION) {
      capViolations++;
    }

    if (player.corruption < 0 || player.corruption > 100) {
      corruptionBoundsViolations++;
    }
  }

  return {
    sampleBuilds,
    deadBuildRate: round(deadBuilds / sampleBuilds, 4),
    deadBuilds,
    capViolations,
    corruptionBoundsViolations,
  };
}

function createDeterminismAndSaveTelemetry(gameplay, engine) {
  const signatureSamples = [];
  let layoutMismatches = 0;

  for (let floor = 0; floor < 4; floor++) {
    const seed = 71 + floor * 13;
    const a = gameplay.generateDungeon(floor, seed);
    const b = gameplay.generateDungeon(floor, seed);

    const sigA = a.rooms
      .map((room) => room.type + "@" + room.x + "," + room.y)
      .sort()
      .join("|");
    const sigB = b.rooms
      .map((room) => room.type + "@" + room.x + "," + room.y)
      .sort()
      .join("|");

    if (sigA !== sigB) layoutMismatches++;
    signatureSamples.push({ floor, seed, hashLength: sigA.length, equal: sigA === sigB });
  }

  const replaySession = gameplay.createBossReplaySession("shepherd", 1337, { x: 480, y: 390, r: 8 });
  for (let tick = 0; tick < 360; tick++) {
    const angle = tick * 0.045;
    gameplay.recordReplayInput(replaySession, tick, {
      x: 480 + Math.cos(angle) * 80,
      y: 280 + Math.sin(angle) * 80,
    });
  }

  const replayA = gameplay.replayBossFight(replaySession, 1000 / 120);
  const replayB = gameplay.replayBossFight(replaySession, 1000 / 120);
  const replaySignatureA = replayA.events.map((event) => event.type + ":" + (event.phaseId || event.attackName || "_"));
  const replaySignatureB = replayB.events.map((event) => event.type + ":" + (event.phaseId || event.attackName || "_"));

  const legacySave = { progress: { discoveredEndings: ["liberation"] } };
  const migratedOnce = engine.migrateSave(legacySave);
  const migratedTwice = engine.migrateSave(migratedOnce);

  return {
    layoutMismatches,
    signatureSamples,
    replayDeterministic: replayA.outcome === replayB.outcome && replaySignatureA.join("|") === replaySignatureB.join("|"),
    replayEventCount: replayA.events.length,
    saveVersion: engine.SAVE_VERSION,
    saveMigratedVersion: migratedOnce.meta.version,
    saveIdempotentVersion: migratedTwice.meta.version,
    discoveredEndingsPreserved: Array.isArray(migratedTwice.progress.discoveredEndings) && migratedTwice.progress.discoveredEndings.length === 1,
  };
}

function evaluateThresholds(telemetry, gameplay) {
  const failures = [];

  if (telemetry.combat.survivabilitySec < 2.8) {
    failures.push("combat survivability below 2.8s baseline");
  }
  if (!telemetry.combat.encounterComposition.validPressureMix) {
    failures.push("encounter composition missing melee/ranged/area pressure mix");
  }

  if (telemetry.generation.totalFailures !== 0) {
    failures.push("generation sweep produced unwinnable seeds");
  }
  if (telemetry.generation.maxAttempts > gameplay.MAX_REROLL_ATTEMPTS) {
    failures.push("generation reroll attempts exceeded hard cap");
  }

  if (telemetry.items.capViolations !== 0) {
    failures.push("item stacking exceeded damage reduction cap");
  }
  if (telemetry.items.corruptionBoundsViolations !== 0) {
    failures.push("item stacking produced corruption outside [0,100]");
  }
  if (telemetry.items.deadBuildRate > 0.08) {
    failures.push("item stacking dead-build rate above 8%");
  }

  if (telemetry.determinism.layoutMismatches !== 0) {
    failures.push("determinism mismatch in dungeon signatures");
  }
  if (!telemetry.determinism.replayDeterministic) {
    failures.push("boss replay determinism mismatch");
  }
  if (telemetry.determinism.saveMigratedVersion !== telemetry.determinism.saveVersion) {
    failures.push("save migration did not reach current version");
  }
  if (telemetry.determinism.saveIdempotentVersion !== telemetry.determinism.saveVersion) {
    failures.push("save migration is not idempotent");
  }
  if (!telemetry.determinism.discoveredEndingsPreserved) {
    failures.push("save migration failed to preserve discovered endings");
  }

  return failures;
}

function runPhase10Telemetry() {
  const modules = loadModules();

  const telemetry = {
    generatedAt: new Date().toISOString(),
    anchors: {
      combatPhilosophy: "SPEC.md: Combat Philosophy",
      dungeonGenerationPhilosophy: "SPEC.md: Dungeon Generation Philosophy",
      engineeringPhilosophy: "SPEC.md: Engineering Philosophy",
    },
    combat: createCombatTelemetry(modules.gameplay),
    generation: createGenerationTelemetry(modules.gameplay),
    items: createItemStackingTelemetry(modules.gameplay),
    determinism: createDeterminismAndSaveTelemetry(modules.gameplay, modules.engine),
  };

  const failures = evaluateThresholds(telemetry, modules.gameplay);
  return { telemetry, failures };
}

module.exports = {
  runPhase10Telemetry,
  evaluateThresholds,
};
