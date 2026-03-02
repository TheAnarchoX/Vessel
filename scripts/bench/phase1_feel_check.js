const { advanceFixedStep } = require("../../src/core/fixedStep.js");
const {
  createFeelMetrics,
  recordShot,
  summarizeFeel,
  evaluateFeel,
  DEFAULT_FEEL_TARGETS,
} = require("../../src/gameplay/feelMetrics.js");

const fixedDt = 1 / 120;
const state = { accumulator: 0, simTime: 0, totalSteps: 0, droppedFrames: 0 };
const metrics = createFeelMetrics();
const fireCd = { value: 0 };
const shotIntent = { at: null };
const tears = 1.5;
const expectedCadenceMs = 1000 / tears;
let nowMs = 0;

function step(dt) {
  fireCd.value -= dt;
  const shotEvery = 1 / tears;
  if (Math.abs((state.simTime % shotEvery) - shotEvery) < fixedDt * 1.5 || state.simTime % shotEvery < fixedDt * 1.5) {
    shotIntent.at = nowMs - 8;
  }
  if (shotIntent.at !== null && fireCd.value <= 0) {
    fireCd.value = 1 / tears;
    recordShot(metrics, nowMs, shotIntent.at, expectedCadenceMs);
    shotIntent.at = null;
  }
}

for (let i = 0; i < 3600; i++) {
  const jitter = (i % 3) * 0.0015;
  const frameDt = 1 / 60 + jitter;
  nowMs += frameDt * 1000;
  advanceFixedStep(state, frameDt, step, fixedDt, 8);
}

const summary = summarizeFeel(metrics);
const failures = evaluateFeel(summary, DEFAULT_FEEL_TARGETS);
console.log("phase1_feel_summary", JSON.stringify(summary));
if (failures.length) {
  console.error("phase1_feel_regressions", failures.join(","));
  process.exit(1);
}
console.log("phase1_feel_status PASS");
