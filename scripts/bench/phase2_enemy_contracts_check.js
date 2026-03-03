const assert = require("assert");
const { advanceFixedStep } = require("../../src/core/fixedStep.js");
const {
  BEHAVIOR_TYPES,
  ENEMY_ROSTER,
  ELITE_MODIFIERS,
  getEnemyArchetype,
  createEnemyFromArchetype,
  createEnemyBehaviorState,
  updateEnemyBehavior,
  buildEncounterDebugOverlay,
  composeEncounter,
  summarizeEncounterComposition,
  runEncounterStress,
} = require("../../src/gameplay/enemyContracts.js");

const fixedDt = 1 / 120;
const STEP_MS = fixedDt * 1000;
const ELITE_BASE_SPEED = 100;
const ELITE_BASE_HEALTH = 10;

function assertScaling(actual, base, scale, propertyName, modifier) {
  assert.ok(typeof scale === "number" || typeof scale === "undefined", `${modifier} ${propertyName} scale must be number or undefined`);
  const expected = typeof scale === "number" ? base * scale : base;
  const reason = typeof scale === "number" ? "scaling mismatch" : "should remain base when scale missing";
  assert.strictEqual(actual, expected, `${modifier} ${propertyName} ${reason}`);
}

function runAttackPath(behavior) {
  const runtimeState = { accumulator: 0, simTime: 0, totalSteps: 0, droppedFrames: 0 };
  const enemy = createEnemyBehaviorState({
    id: `${behavior}-specimen`,
    behavior,
    x: 120,
    y: 120,
  });
  enemy.cooldownMs = 0;

  const target = { id: "player", x: behavior === "kite" ? 420 : 136, y: 126 };
  const events = [];
  const transitions = [];
  let previousState = enemy.state;

  function step() {
    const tickEvents = updateEnemyBehavior(enemy, { dtMs: STEP_MS, target });
    events.push(...tickEvents);
    if (enemy.state !== previousState) {
      transitions.push(`${previousState}->${enemy.state}`);
      previousState = enemy.state;
    }
  }

  for (let i = 0; i < 720; i++) {
    advanceFixedStep(runtimeState, fixedDt, step, fixedDt, 8);
  }

  const hasTelegraph = events.some((e) => e.type === "telegraph_start");
  const hasRead = events.some((e) => e.type === "read_start");
  const hasRecover = events.some((e) => e.type === "recover_start");
  assert.ok(hasTelegraph && hasRead && hasRecover, `${behavior} missing telegraph/read/recover contract events`);

  const contractActionByBehavior = {
    chase: "damage",
    charge: "damage",
    kite: "projectile",
    summon: "summon",
    zone: "zone",
    support: "buff_aura",
    disruptor: "disrupt",
  };
  const actionType = contractActionByBehavior[behavior];
  const action = events.find((e) => e.type === actionType && e.window === "read" && e.attackId > 0);
  assert.ok(action, `${behavior} missing read-window action`);
  assert.ok(action.source, `${behavior} missing damage attribution source`);

  return {
    behavior,
    transitions,
    firstAction: action,
    overlay: buildEncounterDebugOverlay([enemy])[0],
  };
}

assert.strictEqual(ENEMY_ROSTER.length, 20, "Phase 11B requires exactly 20 enemy archetypes");
for (const behavior of ["chase", "charge", "kite", "summon", "zone", "support", "disruptor"]) {
  assert.ok(ENEMY_ROSTER.some((entry) => entry.behavior === behavior), `Missing behavior coverage for ${behavior}`);
}

for (const archetype of ENEMY_ROSTER) {
  const lookup = getEnemyArchetype(archetype.id);
  assert.ok(lookup, `archetype lookup failed for ${archetype.id}`);
  const enemy = createEnemyFromArchetype(archetype.id, { id: `${archetype.id}-sample` });
  assert.strictEqual(enemy.behavior, archetype.behavior, `${archetype.id} behavior mismatch`);
}

const attackPathEvidence = BEHAVIOR_TYPES.map(runAttackPath);
for (const path of attackPathEvidence) {
  console.log(
    "phase2_attack_path",
    path.behavior,
    JSON.stringify({ transitions: path.transitions.slice(0, 6), firstAction: path.firstAction, overlay: path.overlay })
  );
}

for (const [modifier, scales] of Object.entries(ELITE_MODIFIERS)) {
  assert.ok(Object.keys(scales).length > 0, `${modifier} must define at least one scaling property`);
  const elite = createEnemyBehaviorState({
    id: `elite-${modifier}`,
    behavior: "chase",
    speed: ELITE_BASE_SPEED,
    health: ELITE_BASE_HEALTH,
    modifier,
  });
  assertScaling(elite.speed, ELITE_BASE_SPEED, scales.speedScale, "speed", modifier);
  assertScaling(elite.health, ELITE_BASE_HEALTH, scales.healthScale, "health", modifier);
  assert.strictEqual(elite.cooldownScale, scales.cooldownScale || 1, `${modifier} cooldown scaling mismatch`);
  assert.strictEqual(elite.damageScale, scales.damageScale || 1, `${modifier} damage scaling mismatch`);
  console.log("phase2_elite_variant", modifier, JSON.stringify({ speed: elite.speed, health: elite.health }));
}

const roomEnemies = composeEncounter({ seed: 77, roomIntent: "combat", wave: 4 });
const roomSummary = summarizeEncounterComposition(roomEnemies);
assert.ok(roomSummary.validPressureMix, "combat room composition does not satisfy melee/ranged/area pressure mix");
console.log("phase2_composition_sample", JSON.stringify(roomSummary));
console.log("phase2_overlay_sample", JSON.stringify(buildEncounterDebugOverlay(roomEnemies, 5)));

const stress = runEncounterStress({ iterations: 180, roomIntent: "combat", wave: 5, seed: 1024 });
assert.strictEqual(stress.invalid, 0, "encounter stress produced invalid pressure mixes");
console.log("phase2_stress_summary", JSON.stringify({ iterations: stress.iterations, invalid: stress.invalid }));
console.log("phase2_enemy_contracts_status PASS");
