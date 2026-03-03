/**
 * Phase 4 — Item Taxonomy, Synergy Matrix, and Dead-Build Validation
 *
 * Validates:
 * 1. All items have valid category, tags, and effects
 * 2. No items are no-ops (every item has at least one meaningful effect)
 * 3. All pair/triple synergy references point to valid items
 * 4. Deterministic simulation produces zero dead builds
 * 5. Item frequency distribution is not degenerate
 * 6. Every item category has at least 2 items
 * 7. Synergy matrix coverage (% of items participating in at least one synergy)
 *
 * Run: node scripts/bench/phase4_item_synergy_check.js
 */

// Load modules via require (UMD-compatible)
const path = require("path");

// Simulate global environment for UMD modules
global.globalThis = global;
global.VesselGameplay = {};

require(path.resolve(__dirname, "../../src/gameplay/itemSystem.js"));

const IS = global.VesselGameplay;

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed++;
    console.log("  PASS  " + label);
  } else {
    failed++;
    console.log("  FAIL  " + label);
  }
}

console.log("=== Phase 4: Item Taxonomy Validation ===\n");

// 1. All items have valid structure
console.log("--- Item Definition Integrity ---");
const poolIds = IS.getAllPoolIds();
assert(poolIds.length >= 20, "Pool has >= 20 items (got " + poolIds.length + ")");

for (const id of poolIds) {
  const def = IS.getItemDef(id);
  assert(def !== null, id + ": exists");
  assert(IS.ITEM_CATEGORIES.indexOf(def.category) >= 0, id + ": valid category (" + def.category + ")");
  assert(Array.isArray(def.tags) && def.tags.length > 0, id + ": has tags");
  assert(typeof def.corruption === "number", id + ": has corruption value");
  assert(typeof def.effects === "object" && Object.keys(def.effects).length > 0, id + ": has effects");
  // No-op check: at least one effect must be non-zero/non-false
  const hasEffect = Object.values(def.effects).some(v => (typeof v === "boolean" && v) || (typeof v === "number" && v !== 0));
  assert(hasEffect, id + ": not a no-op");
}

// 2. Category diversity
console.log("\n--- Category Distribution ---");
for (const cat of IS.ITEM_CATEGORIES) {
  const count = IS.getPoolIdsByCategory(cat).length;
  assert(count >= 2, cat + ": has >= 2 items (got " + count + ")");
}

// 3. Boss drops valid
console.log("\n--- Boss Drop Integrity ---");
for (const id of Object.keys(IS.BOSS_DROPS)) {
  const def = IS.BOSS_DROPS[id];
  assert(typeof def.name === "string", id + ": has name");
  assert(typeof def.boss === "string", id + ": has boss reference");
  assert(Object.keys(def.effects).length > 0, id + ": has effects");
}

// 4. Pair synergy references valid
console.log("\n--- Pair Synergy Validation ---");
const allIds = poolIds.concat(Object.keys(IS.BOSS_DROPS));
for (const syn of IS.PAIR_SYNERGIES) {
  const valid = syn.items.every(id => allIds.indexOf(id) >= 0);
  assert(valid, "PAIR " + syn.name + ": all items exist");
  assert(syn.items.length === 2, "PAIR " + syn.name + ": exactly 2 items");
  assert(Object.keys(syn.bonus).length > 0, "PAIR " + syn.name + ": has bonus");
}

// 5. Triple synergy references valid
console.log("\n--- Triple Synergy Validation ---");
for (const syn of IS.TRIPLE_SYNERGIES) {
  const valid = syn.items.every(id => allIds.indexOf(id) >= 0);
  assert(valid, "TRIPLE " + syn.name + ": all items exist");
  assert(syn.items.length === 3, "TRIPLE " + syn.name + ": exactly 3 items");
  assert(Object.keys(syn.bonus).length > 0, "TRIPLE " + syn.name + ": has bonus");
}

// 6. Synergy coverage
console.log("\n--- Synergy Coverage ---");
const inSynergy = new Set();
for (const syn of IS.PAIR_SYNERGIES) syn.items.forEach(id => inSynergy.add(id));
for (const syn of IS.TRIPLE_SYNERGIES) syn.items.forEach(id => inSynergy.add(id));
const coverageRatio = inSynergy.size / poolIds.length;
assert(coverageRatio >= 0.6, "Synergy coverage >= 60% of pool (got " + (coverageRatio * 100).toFixed(1) + "%)");
console.log("  Items in synergies: " + inSynergy.size + "/" + poolIds.length);
const notInSynergy = poolIds.filter(id => !inSynergy.has(id));
if (notInSynergy.length > 0) {
  console.log("  Items NOT in any synergy: " + notInSynergy.join(", "));
}

// 7. Deterministic simulation — zero dead builds
console.log("\n--- Deterministic Simulation (1000 runs, 6 items each) ---");
const simResult = IS.simulateItemRuns(1000, 6, 42);
assert(simResult.deadBuilds === 0, "Zero dead builds (got " + simResult.deadBuilds + ")");
assert(simResult.neverPickedItems.length === 0, "All items appear at least once (never picked: " + simResult.neverPickedItems.join(", ") + ")");
console.log("  Dead build rate: " + (simResult.deadBuildRate * 100).toFixed(2) + "%");
console.log("  Pool size: " + simResult.poolSize);
console.log("  Never-picked items: " + (simResult.neverPickedItems.length === 0 ? "none" : simResult.neverPickedItems.join(", ")));

// Item frequency distribution
const freqs = Object.values(simResult.itemPickCounts);
const avgFreq = freqs.reduce((a, b) => a + b, 0) / freqs.length;
const maxFreq = Math.max(...freqs);
const minFreq = Math.min(...freqs);
console.log("  Item pick frequency: min=" + minFreq + " avg=" + avgFreq.toFixed(1) + " max=" + maxFreq);
const skewRatio = maxFreq / (minFreq || 1);
assert(skewRatio < 10, "Item frequency skew < 10x (got " + skewRatio.toFixed(1) + "x)");

// Synergy hit frequency
const synHits = Object.entries(simResult.synergyHitCounts);
console.log("  Synergy hits: " + (synHits.length > 0 ? synHits.map(([n, c]) => n + ":" + c).join(", ") : "none"));

// Sample builds
console.log("\n--- Sample Builds ---");
for (const build of simResult.sampleBuilds) {
  console.log("  " + build.items.join(", ") + "  DPS:" + build.dps.toFixed(2) + " syn:" + build.synergies + " viable:" + build.viable);
}

// 8. Effect application integrity
console.log("\n--- Effect Application Test ---");
const testPlayer = {
  soul: 6, maxSoul: 6, corruption: 0, damage: 1, tears: 1.5,
  speed: 180, range: 400, shotSpeed: 320, damageReduction: 0,
  extraLife: 0, pierce: false, slow: false,
};
IS.applyItemEffects(testPlayer, "unholy_water");
assert(testPlayer.pierce === true, "unholy_water: pierce=true");
assert(testPlayer.corruption === 5, "unholy_water: corruption=5");

IS.applyItemEffects(testPlayer, "goats_eye");
assert(testPlayer.damage === 2, "goats_eye: damage=2");

IS.applyItemEffects(testPlayer, "blackened_tongue");
assert(testPlayer.slow === true, "blackened_tongue: slow=true");

// Synergy resolution
const held = ["unholy_water", "blackened_tongue"];
const synergies = IS.resolveActiveSynergies(held);
assert(synergies.length >= 1, "CORRUPTED FLOW synergy activates (got " + synergies.length + " synergies)");
const corruptedFlow = synergies.find(s => s.name === "CORRUPTED FLOW");
assert(corruptedFlow !== undefined, "CORRUPTED FLOW found in active synergies");

// 9. Balance floor enforcement
console.log("\n--- Balance Floor Enforcement ---");
const safePlayer = {
  soul: 6, maxSoul: 6, corruption: 0, damage: 1, tears: 1.5,
  speed: 180, range: 400, shotSpeed: 320, damageReduction: 0,
};
IS.applyItemEffects(safePlayer, "penitent_thorns"); // damage: -0.5
assert(safePlayer.damage >= IS.BALANCE.MIN_DAMAGE, "Damage floor enforced after penitent_thorns (got " + safePlayer.damage + ")");
assert(safePlayer.tears >= IS.BALANCE.MIN_TEARS, "Tears floor enforced (got " + safePlayer.tears + ")");

// DR cap
const drPlayer = {
  soul: 6, maxSoul: 6, corruption: 0, damage: 1, tears: 1.5,
  speed: 180, range: 400, shotSpeed: 320, damageReduction: 0,
};
IS.applyItemEffects(drPlayer, "flayed_skin"); // 0.25
IS.applyItemEffects(drPlayer, "bone_ward");   // +0.1
IS.applyItemEffects(drPlayer, "flayed_skin"); // +0.25 but should cap at 0.75
// Note: flayed_skin can't be held twice normally, but testing the cap
assert(drPlayer.damageReduction <= IS.BALANCE.MAX_DAMAGE_REDUCTION, "DR cap at " + IS.BALANCE.MAX_DAMAGE_REDUCTION + " (got " + drPlayer.damageReduction + ")");

// 10. Corruption scaling
console.log("\n--- Corruption Scaling Test ---");
const corrPlayer = {
  soul: 6, maxSoul: 6, corruption: 80, damage: 2, tears: 1.5,
  speed: 180, range: 400, shotSpeed: 320, damageReduction: 0,
  corruptionDamageScale: true, corruptionTearBonus: true,
};
const bonus = IS.resolveCorruptionScaling(corrPlayer);
assert(bonus.damage > 0, "Corruption damage bonus > 0 at 80% corruption (got " + bonus.damage.toFixed(2) + ")");
assert(bonus.tears > 0, "Corruption tear bonus > 0 at 80% corruption (got " + bonus.tears.toFixed(2) + ")");

// 11. Run history tracking
console.log("\n--- Run History Tracking ---");
const history = IS.createRunHistory();
IS.startRunTracking(history, 12345);
IS.trackOffer(history, ["unholy_water", "goats_eye"]);
IS.trackPick(history, "unholy_water");
IS.trackOffer(history, ["blackened_tongue", "saints_ash"]);
IS.trackPick(history, "blackened_tongue");
const endPlayer = {
  soul: 5, maxSoul: 6, corruption: 15, damage: 2, tears: 1.5,
};
IS.endRunTracking(history, endPlayer, "win");
const summary = IS.summarizeRunHistory(history);
assert(summary.total === 1, "Run history has 1 run");
assert(summary.winRate === 1, "Win rate = 1.0");
assert(summary.archetypes.offense === 1, "Build archetype classified as offense");

// ===
console.log("\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
process.exit(failed > 0 ? 1 : 0);
