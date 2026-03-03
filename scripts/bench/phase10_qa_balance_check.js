#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { runPhase10Telemetry } = require(path.resolve(__dirname, "../../tests/phase10/harness.js"));

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function formatPct(value) {
  return (value * 100).toFixed(2) + "%";
}

function renderMarkdown(result) {
  const telemetry = result.telemetry;
  const lines = [];

  lines.push("# Phase 10 QA/Balance Telemetry Evidence");
  lines.push("");
  lines.push("Generated: " + telemetry.generatedAt);
  lines.push("");
  lines.push("## Anchors");
  lines.push("");
  lines.push("- " + telemetry.anchors.combatPhilosophy);
  lines.push("- " + telemetry.anchors.dungeonGenerationPhilosophy);
  lines.push("- " + telemetry.anchors.engineeringPhilosophy);
  lines.push("");
  lines.push("## Combat Math");
  lines.push("");
  lines.push("- Baseline player DPS: " + (telemetry.combat.baselinePlayer.damage * telemetry.combat.baselinePlayer.tears).toFixed(2));
  lines.push("- Average incoming DPS: " + telemetry.combat.averageIncomingDps.toFixed(3));
  lines.push("- Baseline survivability: " + telemetry.combat.survivabilitySec.toFixed(3) + "s");
  lines.push("- Pressure mix valid: " + telemetry.combat.encounterComposition.validPressureMix);
  lines.push("");
  lines.push("## Generation Integrity");
  lines.push("");
  lines.push("- Seed sweep per floor: " + telemetry.generation.sweepSeedsPerFloor);
  lines.push("- Total generation failures: " + telemetry.generation.totalFailures);
  lines.push("- Max reroll attempts observed: " + telemetry.generation.maxAttempts);
  lines.push("");
  lines.push("## Item Stacking");
  lines.push("");
  lines.push("- Sample builds: " + telemetry.items.sampleBuilds);
  lines.push("- Dead build rate: " + formatPct(telemetry.items.deadBuildRate));
  lines.push("- DR cap violations: " + telemetry.items.capViolations);
  lines.push("- Corruption bounds violations: " + telemetry.items.corruptionBoundsViolations);
  lines.push("");
  lines.push("## Determinism + Save Compatibility");
  lines.push("");
  lines.push("- Dungeon signature mismatches: " + telemetry.determinism.layoutMismatches);
  lines.push("- Boss replay deterministic: " + telemetry.determinism.replayDeterministic);
  lines.push("- Save migrated to latest version: " + telemetry.determinism.saveMigratedVersion + "/" + telemetry.determinism.saveVersion);
  lines.push("- Save migration idempotent: " + (telemetry.determinism.saveIdempotentVersion === telemetry.determinism.saveVersion));
  lines.push("- Discovered endings preserved: " + telemetry.determinism.discoveredEndingsPreserved);
  lines.push("");
  lines.push("## Gate Result");
  lines.push("");

  if (result.failures.length === 0) {
    lines.push("PASS - Phase 10 QA/Balance gates satisfied.");
  } else {
    lines.push("FAIL - Phase 10 QA/Balance gates failed:");
    for (const failure of result.failures) {
      lines.push("- " + failure);
    }
  }

  return lines.join("\n") + "\n";
}

function main() {
  const result = runPhase10Telemetry();

  const evidenceDir = path.resolve(__dirname, "../../docs/evidence");
  ensureDir(evidenceDir);

  const jsonPath = path.join(evidenceDir, "phase10_qa_balance_telemetry.json");
  const mdPath = path.join(evidenceDir, "phase10_qa_balance_telemetry.md");

  fs.writeFileSync(jsonPath, JSON.stringify(result.telemetry, null, 2) + "\n", "utf8");
  fs.writeFileSync(mdPath, renderMarkdown(result), "utf8");

  console.log("Phase10 telemetry JSON: " + jsonPath);
  console.log("Phase10 telemetry summary: " + mdPath);
  console.log("Combat survivability sec: " + result.telemetry.combat.survivabilitySec.toFixed(3));
  console.log("Generation failures: " + result.telemetry.generation.totalFailures);
  console.log("Item dead-build rate: " + formatPct(result.telemetry.items.deadBuildRate));
  console.log("Replay deterministic: " + result.telemetry.determinism.replayDeterministic);

  if (result.failures.length > 0) {
    for (const failure of result.failures) {
      console.error("FAIL: " + failure);
    }
    process.exit(1);
  }

  console.log("phase10_qa_balance_status PASS");
}

main();
