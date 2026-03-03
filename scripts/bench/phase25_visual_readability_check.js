const path = require("path");

const { ANIMATION_CHECKLIST, evaluateEnemyAnimationState, summarizeReadability } = require(path.join(__dirname, "../../src/presentation/entityVisuals.js"));
const { composeEncounter } = require(path.join(__dirname, "../../src/gameplay/enemyContracts.js"));

function assert(condition, message) {
  if (!condition) {
    console.error(`phase25_visual_readability_status FAIL: ${message}`);
    process.exit(1);
  }
}

const checklistRows = Object.entries(ANIMATION_CHECKLIST).map(([entity, states]) => `${entity}:${states.join("|")}`);
console.log("phase25_animation_checklist", JSON.stringify(checklistRows));
const REQUIRED_CHECKLIST = {
  player: ["idle", "move", "attack-telegraph", "hit"],
  enemy: ["idle", "move", "attack-telegraph", "hit", "death", "spawn"],
  item: ["idle", "spawn", "pickup"],
  boss: ["idle", "move", "attack-telegraph", "hit", "death", "spawn"],
};
for (const [entity, required] of Object.entries(REQUIRED_CHECKLIST)) {
  for (const state of required) {
    assert(ANIMATION_CHECKLIST[entity]?.includes(state), `${entity} checklist missing state: ${state}`);
  }
}

const ANIMATION_TEST_TIMESTAMP_MS = 1000;
const stateSamples = [
  evaluateEnemyAnimationState({ type: "penitent", hp: 3, spawnT: 0.4, cd: 1, charge: 0, slowT: 0, hitT: 0, x: 40, y: 30 }, ANIMATION_TEST_TIMESTAMP_MS),
  evaluateEnemyAnimationState({ type: "hollowed", hp: 3, spawnT: 0, cd: 1, charge: 0, slowT: 0.4, hitT: 0, x: 50, y: 40 }, ANIMATION_TEST_TIMESTAMP_MS),
  evaluateEnemyAnimationState({ type: "wisp", hp: 3, spawnT: 0, cd: 0.12, charge: 0, slowT: 0, hitT: 0, x: 60, y: 50 }, ANIMATION_TEST_TIMESTAMP_MS),
  evaluateEnemyAnimationState({ type: "bonecrawler", hp: 3, spawnT: 0, cd: 1, charge: 0, slowT: 0, hitT: 0, x: 100, y: 0 }, ANIMATION_TEST_TIMESTAMP_MS),
  evaluateEnemyAnimationState({ type: "revenant", hp: 3, spawnT: 0, cd: 1, charge: 0, slowT: 0, hitT: 0, x: 0, y: 0 }, ANIMATION_TEST_TIMESTAMP_MS),
  evaluateEnemyAnimationState({ type: "plague", hp: 0, spawnT: 0, cd: 1, charge: 0, slowT: 0, hitT: 0, x: 70, y: 60 }, ANIMATION_TEST_TIMESTAMP_MS),
];
console.log("phase25_animation_states", JSON.stringify(stateSamples));
assert(stateSamples.includes("spawn"), "spawn state did not evaluate");
assert(stateSamples.includes("attack-telegraph"), "telegraph state did not evaluate");
assert(stateSamples.includes("hit"), "hit state did not evaluate");
assert(stateSamples.includes("move"), "move state did not evaluate");
assert(stateSamples.includes("idle"), "idle state did not evaluate");
assert(stateSamples.includes("death"), "death state did not evaluate");

const stressEnemies = composeEncounter({ roomIntent: "boss", wave: 7, seed: 20260303 }).map((enemy, i) => ({
  ...enemy,
  type: ["penitent", "hollowed", "wisp", "bonecrawler", "revenant", "plague", "seraph", "choir", "tendril", "shepherd", "pit"][i % 11],
  hp: Math.max(1, enemy.health || 1),
}));
const stressSummary = summarizeReadability(stressEnemies);
console.log("phase25_stress_readability", JSON.stringify(stressSummary));
assert(stressSummary.distinctSilhouettes >= 4, "not enough silhouette separation under stress scene");
assert(stressSummary.distinctTypes >= 5, "not enough enemy type variety under stress scene");

console.log("phase25_visual_readability_status PASS");
