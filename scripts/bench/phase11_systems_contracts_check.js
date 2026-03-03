#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

global.globalThis = global;
global.VesselGameplay = global.VesselGameplay || {};

require(path.resolve(__dirname, "../../src/gameplay/corruptionSystem.js"));
require(path.resolve(__dirname, "../../src/gameplay/roomAfflictionSystem.js"));
require(path.resolve(__dirname, "../../src/gameplay/narrativeEchoSystem.js"));

const VG = global.VesselGameplay;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function buildRouteSnapshot(choiceType) {
  const state = VG.createCorruptionState();
  if (choiceType === "demonic") {
    VG.processConfession(state, "yield", 1, 100);
    VG.pickUpRelic(state, "bone_idol", 200);
    VG.processConfession(state, "yield", 2, 300);
    VG.pickUpRelic(state, "worm_heart", 400);
    VG.pickUpRelic(state, "black_scripture", 500);
  } else {
    VG.processConfession(state, "resist", 1, 100);
    VG.pickUpRelic(state, "saints_finger", 200);
    VG.processConfession(state, "resist", 2, 300);
    VG.pickUpRelic(state, "blessed_water", 400);
    VG.processConfession(state, "resist", 3, 500);
  }
  return VG.getRouteSnapshot(state);
}

function buildRooms() {
  return [
    { id: "r0", x: 2, y: 2, type: "start" },
    { id: "r1", x: 2, y: 1, type: "combat" },
    { id: "r2", x: 3, y: 1, type: "combat" },
    { id: "r3", x: 3, y: 2, type: "altar" },
    { id: "r4", x: 3, y: 3, type: "boss" },
    { id: "r5", x: 2, y: 3, type: "confession" },
    { id: "r6", x: 1, y: 3, type: "rest" },
    { id: "r7", x: 1, y: 2, type: "reliquary" },
  ];
}

function run() {
  const afflictionContract = VG.validateAfflictionContracts();
  assert(afflictionContract.valid, "affliction contracts should validate");

  const demonicRoute = buildRouteSnapshot("demonic");
  const asceticRoute = buildRouteSnapshot("ascetic");

  const rooms = buildRooms();
  const demonicPlanA = VG.createAfflictionPlan({ seed: 4242, floor: 2, routeId: demonicRoute.current, rooms });
  const demonicPlanB = VG.createAfflictionPlan({ seed: 4242, floor: 2, routeId: demonicRoute.current, rooms });
  const asceticPlan = VG.createAfflictionPlan({ seed: 4242, floor: 2, routeId: asceticRoute.current, rooms });

  assert(JSON.stringify(demonicPlanA) === JSON.stringify(demonicPlanB), "affliction plan should be deterministic");
  assert(JSON.stringify(demonicPlanA.afflictions) !== JSON.stringify(asceticPlan.afflictions), "route-specific afflictions should diverge");
  assert(demonicPlanA.roomAssignments.length > 0, "affliction plan should annotate rooms");

  const echoState = VG.createNarrativeEchoState();
  assert(VG.validateEchoContracts(echoState).valid, "echo contracts should validate");

  VG.recordEchoEvent(echoState, "confession_yield", { floor: 1 }, 1000);
  VG.recordEchoEvent(echoState, "relic_dark", { relicId: "bone_idol" }, 1200);
  VG.recordEchoEvent(echoState, "tier_shift", { toTier: "corrupt" }, 1600);

  const echoProfile = VG.createEchoProfile(echoState, demonicRoute);
  const echoLineA = VG.selectEchoLine(echoState, demonicRoute, 9090);
  const echoLineB = VG.selectEchoLine(echoState, demonicRoute, 9090);
  const endingEcho = VG.createEndingEchoDelta(echoState, demonicRoute, "consumed");

  assert(echoProfile.dominantRoute === "demonic", "echo profile should track demonic dominance");
  assert(echoLineA.line === echoLineB.line, "echo line selection should be deterministic");
  assert(endingEcho.route === "demonic", "ending echo should include route bias");

  const evidenceDir = path.resolve(__dirname, "../../docs/evidence");
  ensureDir(evidenceDir);

  const summaryPath = path.join(evidenceDir, "phase11a_systems_summary.json");
  const mdPath = path.join(evidenceDir, "phase11a_systems_summary.md");

  const summary = {
    generatedAt: new Date().toISOString(),
    systems: {
      roomAfflictionLayer: {
        deterministicPlan: true,
        demonicAfflictions: demonicPlanA.afflictions,
        asceticAfflictions: asceticPlan.afflictions,
        roomAssignments: demonicPlanA.roomAssignments.length,
      },
      narrativeEchoLedger: {
        dominantRoute: echoProfile.dominantRoute,
        intensity: echoProfile.intensity,
        deterministicEchoLine: echoLineA.line,
        endingDeltaRoute: endingEcho.route,
      },
    },
  };

  const markdown = [
    "# Phase 11A Systems Contracts Evidence",
    "",
    "Generated: " + summary.generatedAt,
    "",
    "## System 1: Room Affliction Layer",
    "",
    "- Deterministic plan replay: true",
    "- Demonic afflictions: " + demonicPlanA.afflictions.join(", "),
    "- Ascetic afflictions: " + asceticPlan.afflictions.join(", "),
    "- Room assignments (demonic sample): " + demonicPlanA.roomAssignments.length,
    "",
    "## System 2: Narrative Echo Ledger",
    "",
    "- Dominant route: " + echoProfile.dominantRoute,
    "- Echo intensity: " + echoProfile.intensity.toFixed(3),
    "- Deterministic echo line: \"" + echoLineA.line + "\"",
    "- Ending delta route: " + endingEcho.route,
    "",
    "phase11_systems_status PASS",
    "",
  ].join("\n");

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
  fs.writeFileSync(mdPath, markdown, "utf8");

  console.log("Phase11A systems summary JSON: " + summaryPath);
  console.log("Phase11A systems summary MD: " + mdPath);
  console.log("phase11_systems_status PASS");
}

run();
