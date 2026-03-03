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
assert(ANIMATION_CHECKLIST.player.includes("idle") && ANIMATION_CHECKLIST.player.includes("move"), "player checklist missing core states");
assert(ANIMATION_CHECKLIST.enemy.includes("attack-telegraph") && ANIMATION_CHECKLIST.enemy.includes("death"), "enemy checklist missing combat states");

const nowMs = 20260303;
const stateSamples = [
  evaluateEnemyAnimationState({ type: "penitent", hp: 3, cd: 0.12, charge: 0, slowT: 0, x: 120, y: 110 }, nowMs),
  evaluateEnemyAnimationState({ type: "hollowed", hp: 3, cd: 0.7, charge: 0.3, slowT: 0, x: 210, y: 150 }, nowMs),
  evaluateEnemyAnimationState({ type: "wisp", hp: 3, cd: 0.7, charge: 0, slowT: 0.4, x: 310, y: 160 }, nowMs),
  evaluateEnemyAnimationState({ type: "plague", hp: 0, cd: 0.7, charge: 0, slowT: 0, x: 410, y: 170 }, nowMs),
];
console.log("phase25_animation_states", JSON.stringify(stateSamples));
assert(stateSamples.includes("attack-telegraph"), "telegraph state did not evaluate");
assert(stateSamples.includes("hit"), "hit state did not evaluate");
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
