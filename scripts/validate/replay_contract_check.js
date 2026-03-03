#!/usr/bin/env node

const path = require("node:path");

global.globalThis = global;
global.VesselGameplay = {};

global.VesselCore = global.VesselCore || {};

global.VesselEngine = global.VesselEngine || {};

require(path.resolve(__dirname, "../../src/gameplay/bossHazards.js"));
require(path.resolve(__dirname, "../../src/gameplay/bossStateMachine.js"));
require(path.resolve(__dirname, "../../src/gameplay/bossReplay.js"));

const VG = global.VesselGameplay;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function run() {
  const session = VG.createBossReplaySession("shepherd", 9001, { x: 480, y: 390, r: 8 });
  for (let tick = 0; tick < 480; tick++) {
    const a = tick * 0.04;
    VG.recordReplayInput(session, tick, { x: 480 + Math.cos(a) * 90, y: 280 + Math.sin(a) * 90 });
  }

  const runA = VG.replayBossFight(session, 1000 / 120);
  const runB = VG.replayBossFight(session, 1000 / 120);

  assert(runA.outcome === runB.outcome, "Replay outcome mismatch for identical input log");
  assert(runA.events.length === runB.events.length, "Replay event-count mismatch for identical input log");

  const seqA = runA.events.map((event) => event.type + ":" + (event.phaseId || event.attackName || "_")).join("|");
  const seqB = runB.events.map((event) => event.type + ":" + (event.phaseId || event.attackName || "_")).join("|");

  assert(seqA === seqB, "Replay event-sequence mismatch for identical input log");

  console.log(`Replay deterministic sequence length: ${runA.events.length}`);
  console.log("phase7_replay_status PASS");
}

run();
