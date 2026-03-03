#!/usr/bin/env node

var input = require("../../src/core/inputBindings.js");
var options = require("../../src/core/playerOptions.js");
var alerts = require("../../src/ui/alertHud.js");
var audio = require("../../src/audio/audioBus.js");

var total = 0;
var pass = 0;
var fail = 0;

function assert(cond, label) {
  total++;
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL: " + label);
  }
}

console.log("=== Phase 9 UX/A11y/Audio Contracts ===");

var bindings = input.createInputBindings();
assert(bindings.getBinding("move_up") === "KeyW", "default move_up binding exists");
assert(bindings.rebind("move_up", "KeyI") === true, "binding can be rebound");
assert(bindings.getBinding("move_up") === "KeyI", "rebind stores new key");
assert(bindings.getBinding("shoot_up") === "ArrowUp", "unrelated binding preserved");

var snapshot = bindings.getBindings();
assert(snapshot.toggle_options == null, "legacy F8 options binding removed");

var playerOptions = options.createPlayerOptions({ flashIntensity: 1.5, shakeIntensity: -1, textScale: 9 });
var normalized = playerOptions.get();
assert(normalized.flashIntensity === 1, "flash intensity clamped high");
assert(normalized.shakeIntensity === 0, "shake intensity clamped low");
assert(normalized.textScale === 1.55, "text scale clamped high");

playerOptions.cycleMinimap(1);
assert(options.MINIMAP_MODES.indexOf(playerOptions.get().minimapMode) >= 0, "minimap cycle keeps legal mode");
playerOptions.cycleAudioIntensity(1);
assert(options.AUDIO_INTENSITY_MODES.indexOf(playerOptions.get().audioIntensity) >= 0, "audio intensity cycle legal");

var pureColor = options.getCorruptionHudColors(10, false);
var cbColor = options.getCorruptionHudColors(10, true);
assert(pureColor.fill !== cbColor.fill, "colorblind palette differs from default");

var alertState = alerts.createAlertState();
alerts.pushAlert(alertState, "info text", "info", 1);
alerts.pushAlert(alertState, "critical text", "critical", 1);
alerts.tickAlerts(alertState, 0.01);
assert(alertState.active && alertState.active.text === "critical text", "critical alerts preempt info alerts");
alerts.tickAlerts(alertState, 1.2);
alerts.tickAlerts(alertState, 0.01);
assert(alertState.active && alertState.active.text === "info text", "info alert shown after critical expires");

assert(audio.AUDIO_BUS_PROFILES.full.master === 1, "audio full profile contract");
assert(audio.AUDIO_BUS_PROFILES.reduced.master < audio.AUDIO_BUS_PROFILES.full.master, "reduced profile lowers master");
assert(audio.AUDIO_BUS_PROFILES.silent.master === 0, "silent profile mutes master");

if (fail > 0) {
  console.error("phase9_contract_status FAIL");
  console.error("passed=" + pass + " failed=" + fail + " total=" + total);
  process.exit(1);
}

console.log("phase9_contract_status PASS");
console.log("passed=" + pass + " failed=0 total=" + total);
