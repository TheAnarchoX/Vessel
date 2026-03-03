#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");

const { BOSS_DEFINITIONS, BOSS_FLOOR_POOLS, createBossState, updateBoss, getBossDebugOverlay } = require("../../src/gameplay/bossStateMachine.js");
const { ENEMY_ROSTER, composeEncounter, runEncounterStress, buildEncounterDebugOverlay } = require("../../src/gameplay/enemyContracts.js");

const DT_MS = 1000 / 120;
const TARGET = { x: 430, y: 260 };
const BOUNDS = { x: 80, y: 50, w: 800, h: 440 };
const EVIDENCE_DIR = path.resolve(__dirname, "../../docs/evidence");
const SUMMARY_JSON = path.join(EVIDENCE_DIR, "phase11b_combat_summary.json");
const SUMMARY_MD = path.join(EVIDENCE_DIR, "phase11b_combat_summary.md");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sampleBossOverlay(bossId) {
  const def = BOSS_DEFINITIONS[bossId];
  const boss = createBossState(def, 480, 210, 42);
  const ctx = { dtMs: DT_MS, target: TARGET, roomBounds: BOUNDS, routeAffinity: "demonic" };
  for (let i = 0; i < 400; i++) updateBoss(boss, ctx);
  return getBossDebugOverlay(boss);
}

function validateBossWindows() {
  const issues = [];
  for (const [bossId, def] of Object.entries(BOSS_DEFINITIONS)) {
    for (const ph of def.phases) {
      for (const atk of ph.attacks || []) {
        if (atk.telegraphMs < 150 || atk.telegraphMs > 420) {
          issues.push(`${bossId}/${atk.name} telegraphMs out of readability window: ${atk.telegraphMs}`);
        }
        if (atk.readMs < 150 || atk.readMs > 420) {
          issues.push(`${bossId}/${atk.name} readMs out of readability window: ${atk.readMs}`);
        }
        if (atk.recoverMs < 180 || atk.recoverMs > 520) {
          issues.push(`${bossId}/${atk.name} recoverMs out of readability window: ${atk.recoverMs}`);
        }
      }
    }
  }
  return issues;
}

function validateEnemyWindows() {
  const issues = [];
  for (const enemy of ENEMY_ROSTER) {
    if (enemy.telegraphMs < 150 || enemy.telegraphMs > 460) issues.push(`${enemy.id} telegraphMs out of readability window: ${enemy.telegraphMs}`);
    if (enemy.readMs < 150 || enemy.readMs > 460) issues.push(`${enemy.id} readMs out of readability window: ${enemy.readMs}`);
    if (enemy.recoverMs < 180 || enemy.recoverMs > 520) issues.push(`${enemy.id} recoverMs out of readability window: ${enemy.recoverMs}`);
  }
  return issues;
}

function main() {
  assert.strictEqual(Object.keys(BOSS_DEFINITIONS).length, 10, "Phase 11B requires 10 boss definitions");
  assert.strictEqual(ENEMY_ROSTER.length, 20, "Phase 11B requires 20 enemy archetypes");

  const rosterBossIds = Object.keys(BOSS_DEFINITIONS).sort();
  const rosterEnemyIds = ENEMY_ROSTER.map((entry) => entry.id).sort();

  const poolCoverage = new Set();
  for (const floorPool of BOSS_FLOOR_POOLS) {
    for (const bossId of floorPool) poolCoverage.add(bossId);
  }
  assert.ok(poolCoverage.size >= 8, "Boss floor pools should expose broad roster coverage");

  const stress = runEncounterStress({ iterations: 240, roomIntent: "combat", wave: 6, seed: 1111 });
  assert.strictEqual(stress.invalid, 0, "Pressure mix stress check failed");

  const bossWindowIssues = validateBossWindows();
  const enemyWindowIssues = validateEnemyWindows();
  assert.strictEqual(bossWindowIssues.length, 0, bossWindowIssues.join("\n"));
  assert.strictEqual(enemyWindowIssues.length, 0, enemyWindowIssues.join("\n"));

  const encounterSample = composeEncounter({ seed: 20260303, roomIntent: "boss", wave: 7 });
  const overlaySample = buildEncounterDebugOverlay(encounterSample, 8);

  const bossOverlays = {
    shepherd: sampleBossOverlay("shepherd"),
    apostate: sampleBossOverlay("apostate"),
    reliquary: sampleBossOverlay("reliquary"),
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    bossCount: rosterBossIds.length,
    enemyCount: rosterEnemyIds.length,
    bossIds: rosterBossIds,
    enemyIds: rosterEnemyIds,
    floorPoolCoverage: Array.from(poolCoverage).sort(),
    stressSummary: {
      iterations: stress.iterations,
      invalidPressureMix: stress.invalid,
    },
    overlaySample,
    bossOverlays,
  };

  ensureDir(EVIDENCE_DIR);
  fs.writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2) + "\n", "utf8");

  const mdLines = [];
  mdLines.push("# Phase 11B Combat Content Summary");
  mdLines.push("");
  mdLines.push(`- Boss count: ${summary.bossCount}`);
  mdLines.push(`- Enemy count: ${summary.enemyCount}`);
  mdLines.push(`- Stress iterations: ${summary.stressSummary.iterations}`);
  mdLines.push(`- Invalid pressure mixes: ${summary.stressSummary.invalidPressureMix}`);
  mdLines.push("");
  mdLines.push("## Boss Roster");
  for (const bossId of summary.bossIds) mdLines.push(`- ${bossId}`);
  mdLines.push("");
  mdLines.push("## Enemy Roster");
  for (const enemyId of summary.enemyIds) mdLines.push(`- ${enemyId}`);
  mdLines.push("");
  mdLines.push("## Overlay Sample (High Density)");
  for (const line of summary.overlaySample) mdLines.push(`- ${line}`);
  mdLines.push("");
  mdLines.push("## Boss Overlay Snapshots");
  for (const [bossId, overlay] of Object.entries(summary.bossOverlays)) {
    mdLines.push(`- ${bossId}: phase=${overlay.phaseId}, health=${overlay.health}, activeHazards=${overlay.activeHazards}`);
  }

  fs.writeFileSync(SUMMARY_MD, mdLines.join("\n") + "\n", "utf8");

  console.log(`phase11b_summary_json ${SUMMARY_JSON}`);
  console.log(`phase11b_summary_md ${SUMMARY_MD}`);
  console.log(`phase11b_counts bosses=${summary.bossCount} enemies=${summary.enemyCount}`);
  console.log(`phase11b_stress invalid=${summary.stressSummary.invalidPressureMix} iterations=${summary.stressSummary.iterations}`);
  console.log("phase11b_combat_status PASS");
}

main();
