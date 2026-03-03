(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function createDeterministicRng(seed) {
    var state = (seed >>> 0) || 1;
    return function next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  var ECHO_TONES = {
    demonic: [
      "The nave answers in teeth.",
      "The vessel hums in hunger.",
      "Mercy decays before impact.",
    ],
    ascetic: [
      "Silence hardens into doctrine.",
      "The vessel denies the feast.",
      "Each refusal leaves a scar.",
    ],
    unbound: [
      "The walls still wait for your verdict.",
      "Compromise drips between prayers.",
      "No path has claimed you yet.",
    ],
  };

  function createNarrativeEchoState() {
    return {
      events: [],
      counts: {
        confession_resist: 0,
        confession_yield: 0,
        relic_holy: 0,
        relic_dark: 0,
        tier_shift: 0,
        boss_kill: 0,
      },
      routeEchoScore: {
        demonic: 0,
        ascetic: 0,
      },
    };
  }

  function scoreEvent(state, eventType, payload) {
    if (eventType === "confession_resist") {
      state.counts.confession_resist += 1;
      state.routeEchoScore.ascetic += 2;
    }
    if (eventType === "confession_yield") {
      state.counts.confession_yield += 1;
      state.routeEchoScore.demonic += 2;
    }
    if (eventType === "relic_holy") {
      state.counts.relic_holy += 1;
      state.routeEchoScore.ascetic += 2;
    }
    if (eventType === "relic_dark") {
      state.counts.relic_dark += 1;
      state.routeEchoScore.demonic += 2;
    }
    if (eventType === "tier_shift") {
      state.counts.tier_shift += 1;
      if (payload && payload.toTier === "consumed") state.routeEchoScore.demonic += 1;
      if (payload && payload.toTier === "pure") state.routeEchoScore.ascetic += 1;
    }
    if (eventType === "boss_kill") {
      state.counts.boss_kill += 1;
      state.routeEchoScore.demonic += 0.5;
      state.routeEchoScore.ascetic += 0.5;
    }
  }

  function recordEchoEvent(state, eventType, payload, tick) {
    var row = {
      eventType: eventType,
      payload: payload || {},
      tick: tick,
    };
    state.events.push(row);
    scoreEvent(state, eventType, payload || {});
    return row;
  }

  function getDominantEchoRoute(state, routeSnapshot) {
    var demonic = state.routeEchoScore.demonic;
    var ascetic = state.routeEchoScore.ascetic;

    if (routeSnapshot && routeSnapshot.current && routeSnapshot.current !== "unbound") {
      if (routeSnapshot.current === "demonic") demonic += 1.5;
      if (routeSnapshot.current === "ascetic") ascetic += 1.5;
    }

    if (demonic === ascetic) {
      if (routeSnapshot && routeSnapshot.current) return routeSnapshot.current;
      return "unbound";
    }
    return demonic > ascetic ? "demonic" : "ascetic";
  }

  function createEchoProfile(state, routeSnapshot) {
    var dominant = getDominantEchoRoute(state, routeSnapshot);
    var intensity = Math.min(1, state.events.length / 24);

    return {
      dominantRoute: dominant,
      intensity: intensity,
      whisperBias: dominant === "demonic" ? 1.2 : dominant === "ascetic" ? 0.85 : 1,
      narrativeBias: dominant === "demonic" ? "erosion" : dominant === "ascetic" ? "atonement" : "ambiguity",
      audioBias: {
        droneScale: dominant === "demonic" ? 1.15 : dominant === "ascetic" ? 0.82 : 1,
        lowPassScale: dominant === "demonic" ? 0.9 : dominant === "ascetic" ? 1.1 : 1,
      },
      uiBias: {
        alertWeight: dominant === "demonic" ? 1.15 : 0.95,
      },
    };
  }

  function selectEchoLine(state, routeSnapshot, seed) {
    var profile = createEchoProfile(state, routeSnapshot);
    var pool = ECHO_TONES[profile.dominantRoute] || ECHO_TONES.unbound;
    var rng = createDeterministicRng((seed >>> 0) || 1);
    var idx = Math.floor(rng() * pool.length);
    return {
      line: pool[idx],
      route: profile.dominantRoute,
      intensity: profile.intensity,
    };
  }

  function createEndingEchoDelta(state, routeSnapshot, endingId) {
    var profile = createEchoProfile(state, routeSnapshot);
    var suffix = profile.dominantRoute === "demonic" ? "The vessel chose hunger." :
      profile.dominantRoute === "ascetic" ? "The vessel chose restraint." :
        "The vessel chose uncertainty.";
    return {
      endingId: endingId,
      route: profile.dominantRoute,
      additionalLine: suffix,
      audioBias: profile.audioBias,
    };
  }

  function validateEchoContracts(state) {
    var issues = [];
    if (!state || !Array.isArray(state.events)) issues.push("state.events must be array");
    if (!state || !state.counts) issues.push("state.counts missing");
    if (!state || !state.routeEchoScore) issues.push("state.routeEchoScore missing");
    return { valid: issues.length === 0, issues: issues };
  }

  return {
    ECHO_TONES: ECHO_TONES,
    createNarrativeEchoState: createNarrativeEchoState,
    recordEchoEvent: recordEchoEvent,
    createEchoProfile: createEchoProfile,
    selectEchoLine: selectEchoLine,
    createEndingEchoDelta: createEndingEchoDelta,
    validateEchoContracts: validateEchoContracts,
  };
});
