(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {

  /**
   * Boss Replay — deterministic record/replay for tuning.
   *
   * Records per-tick player inputs during a boss fight, then replays them
   * through updateBoss to produce an identical event sequence.
   * Depends on bossStateMachine.js + bossHazards.js being loaded.
   */

  function bossApi() {
    if (typeof root !== "undefined" && root.VesselGameplay) {
      return root.VesselGameplay;
    }
    if (typeof require === "function") {
      try {
        var sm = require("./bossStateMachine.js");
        var hz = require("./bossHazards.js");
        return Object.assign({}, hz, sm);
      } catch (_) { /* noop */ }
    }
    return null;
  }

  function createBossReplaySession(bossId, seed, playerSnapshot) {
    return {
      bossId: bossId,
      seed: seed || 42,
      playerSnapshot: playerSnapshot || { x: 480, y: 400, r: 8 },
      inputs: [],      // { tick, target: {x,y}, actions: [] }
      events: [],       // full event log on record
      outcome: null,    // "dead" | "timeout" | null
      tickCount: 0,
    };
  }

  function recordReplayInput(session, tick, input) {
    session.inputs.push({
      tick: tick,
      target: { x: input.x, y: input.y },
    });
    session.tickCount = Math.max(session.tickCount, tick + 1);
  }

  function recordReplayEvents(session, events) {
    for (var i = 0; i < events.length; i++) {
      session.events.push(events[i]);
    }
  }

  function replayBossFight(session, fixedDtMs) {
    var api = bossApi();
    if (!api || !api.BOSS_DEFINITIONS || !api.createBossState) {
      return { events: [], outcome: "error", error: "Boss API not available" };
    }

    var def = api.BOSS_DEFINITIONS[session.bossId];
    if (!def) {
      return { events: [], outcome: "error", error: "Unknown boss: " + session.bossId };
    }

    var dtMs = fixedDtMs || (1000 / 120);
    var boss = api.createBossState(def, 480, 230, session.seed);
    var events = [];
    var inputIndex = 0;
    var target = { x: session.playerSnapshot.x, y: session.playerSnapshot.y };

    for (var tick = 0; tick < session.tickCount; tick++) {
      // Advance to this tick's input
      while (inputIndex < session.inputs.length && session.inputs[inputIndex].tick <= tick) {
        target = session.inputs[inputIndex].target;
        inputIndex++;
      }

      var ctx = {
        dtMs: dtMs,
        target: target,
        roomBounds: { x: 80, y: 50, w: 800, h: 440 },
      };

      var tickEvents = api.updateBoss(boss, ctx);
      for (var e = 0; e < tickEvents.length; e++) {
        tickEvents[e]._tick = tick;
        events.push(tickEvents[e]);
      }

      if (boss.dead) {
        return { events: events, outcome: "dead", finalTick: tick };
      }
    }

    return { events: events, outcome: boss.dead ? "dead" : "timeout", finalTick: session.tickCount - 1 };
  }

  function getBossReplayStats(eventLog) {
    var phases = {};
    var currentPhase = null;
    var currentPhaseStart = 0;
    var totalDamage = 0;
    var totalProjectiles = 0;
    var totalSummons = 0;
    var totalHazards = 0;

    for (var i = 0; i < eventLog.length; i++) {
      var ev = eventLog[i];
      if (ev.type === "phase_enter") {
        currentPhase = ev.phaseId;
        currentPhaseStart = ev._tick || 0;
        if (!phases[currentPhase]) {
          phases[currentPhase] = { enterTick: currentPhaseStart, ticks: 0, attacks: 0 };
        }
      }
      if (ev.type === "phase_exit" && currentPhase) {
        phases[currentPhase].ticks = (ev._tick || 0) - phases[currentPhase].enterTick;
      }
      if (ev.type === "damage" || ev.type === "projectile") {
        totalDamage += ev.amount || 0;
        if (ev.type === "projectile") totalProjectiles++;
        if (currentPhase && phases[currentPhase]) phases[currentPhase].attacks++;
      }
      if (ev.type === "summon") totalSummons += ev.count || 0;
      if (ev.type === "hazard_spawn") totalHazards++;
    }

    return {
      phasesVisited: Object.keys(phases),
      phaseDetails: phases,
      totalDamageEmitted: totalDamage,
      totalProjectiles: totalProjectiles,
      totalSummons: totalSummons,
      totalHazards: totalHazards,
    };
  }

  return {
    createBossReplaySession,
    recordReplayInput,
    recordReplayEvents,
    replayBossFight,
    getBossReplayStats,
  };
});
