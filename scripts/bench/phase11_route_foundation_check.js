#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const cs = require(path.resolve(__dirname, "../../src/gameplay/corruptionSystem.js"));

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runActions(actions) {
  const state = cs.createCorruptionState();
  const log = [];

  for (const action of actions) {
    if (action.type === "delta") {
      cs.applyCorruptionDelta(state, action.source, action.delta ?? null, action.tick);
    } else if (action.type === "confession") {
      cs.processConfession(state, action.choice, action.floor, action.tick);
    } else if (action.type === "relic") {
      cs.pickUpRelic(state, action.relicId, action.tick);
    } else {
      throw new Error("Unknown action type: " + action.type);
    }

    const snapshot = cs.getRouteSnapshot(state);
    log.push({
      tick: action.tick,
      action: action,
      corruption: state.level,
      route: snapshot.current,
      locked: snapshot.locked,
      preventedSwitches: snapshot.preventedSwitches,
    });
  }

  return { state, log };
}

function main() {
  const demonicActions = [
    { type: "delta", source: "floor_descent", tick: 1000 },
    { type: "confession", choice: "yield", floor: 1, tick: 1500 },
    { type: "relic", relicId: "bone_idol", tick: 1700 },
    { type: "confession", choice: "yield", floor: 2, tick: 2500 },
    { type: "relic", relicId: "worm_heart", tick: 2700 },
    { type: "relic", relicId: "black_scripture", tick: 2900 },
    { type: "confession", choice: "resist", floor: 3, tick: 3500 },
    { type: "relic", relicId: "saints_finger", tick: 3700 },
    { type: "relic", relicId: "blessed_water", tick: 3900 },
    { type: "confession", choice: "resist", floor: 4, tick: 4100 },
    { type: "delta", source: "item_pickup", delta: -30, tick: 4300 },
  ];

  const asceticActions = [
    { type: "delta", source: "floor_descent", tick: 1000 },
    { type: "confession", choice: "resist", floor: 1, tick: 1500 },
    { type: "relic", relicId: "saints_finger", tick: 1700 },
    { type: "confession", choice: "resist", floor: 2, tick: 2500 },
    { type: "relic", relicId: "blessed_water", tick: 2700 },
    { type: "confession", choice: "resist", floor: 3, tick: 3500 },
    { type: "relic", relicId: "bone_idol", tick: 3700 },
    { type: "confession", choice: "yield", floor: 4, tick: 3900 },
    { type: "relic", relicId: "black_scripture", tick: 4100 },
    { type: "confession", choice: "yield", floor: 5, tick: 4300 },
    { type: "delta", source: "item_pickup", delta: 80, tick: 4500 },
  ];

  const runA = runActions(demonicActions);
  const runB = runActions(demonicActions);
  const asceticRun = runActions(asceticActions);

  assert(runA.state.route.current === "demonic", "demonic path should remain active");
  assert(runA.state.route.locked === true, "demonic path should lock in");
  assert(runA.state.route.preventedSwitches >= 1, "demonic lock should prevent switch");

  assert(asceticRun.state.route.current === "ascetic", "ascetic path should remain active");
  assert(asceticRun.state.route.locked === true, "ascetic path should lock in");
  assert(asceticRun.state.route.preventedSwitches >= 1, "ascetic lock should prevent switch");

  const replayA = JSON.stringify(runA.log);
  const replayB = JSON.stringify(runB.log);
  assert(replayA === replayB, "route replay logs should be deterministic");

  const evidenceDir = path.resolve(__dirname, "../../docs/evidence");
  ensureDir(evidenceDir);

  const replayPath = path.join(evidenceDir, "phase11a_route_replay.log");
  const summaryPath = path.join(evidenceDir, "phase11a_route_summary.json");

  const lines = [];
  lines.push("# Phase 11A Route Replay Log");
  lines.push("");
  lines.push("## Demonic Scenario");
  for (const row of runA.log) {
    lines.push(`${row.tick}\t${row.action.type}:${row.action.source || row.action.choice || row.action.relicId}\tlevel=${row.corruption}\troute=${row.route}\tlocked=${row.locked}\tblocked=${row.preventedSwitches}`);
  }
  lines.push("");
  lines.push("## Ascetic Scenario");
  for (const row of asceticRun.log) {
    lines.push(`${row.tick}\t${row.action.type}:${row.action.source || row.action.choice || row.action.relicId}\tlevel=${row.corruption}\troute=${row.route}\tlocked=${row.locked}\tblocked=${row.preventedSwitches}`);
  }
  lines.push("");
  lines.push("deterministic_replay_match=true");

  const summary = {
    demonic: cs.getRouteSnapshot(runA.state),
    ascetic: cs.getRouteSnapshot(asceticRun.state),
    deterministicReplay: true,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(replayPath, lines.join("\n") + "\n", "utf8");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log("Phase11A replay log: " + replayPath);
  console.log("Phase11A summary: " + summaryPath);
  console.log("Demonic route locked: " + summary.demonic.locked + " (blocked=" + summary.demonic.preventedSwitches + ")");
  console.log("Ascetic route locked: " + summary.ascetic.locked + " (blocked=" + summary.ascetic.preventedSwitches + ")");
  console.log("phase11_route_status PASS");
}

main();
