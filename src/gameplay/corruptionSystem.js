(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {

  /* ------------------------------------------------------------------ */
  /*  Deterministic seeded RNG (shared pattern)                          */
  /* ------------------------------------------------------------------ */
  function createDeterministicRng(seed) {
    var state = (seed >>> 0) || 1;
    return function next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  /* ================================================================== */
  /*  CORRUPTION TIERS                                                   */
  /*  Grounded in SPEC.md Player Systems: Corruption 0-100               */
  /*  and Thematic Rules: spiritual erosion, not power fantasy.          */
  /*  Tier boundaries drive mechanic, visual, and audio shifts.          */
  /* ================================================================== */
  var CORRUPTION_TIERS = [
    { id: "pure",     min: 0,  max: 24,  label: "UNMARKED",       tearColor: "#e8e0d0" },
    { id: "tainted",  min: 25, max: 49,  label: "TAINTED",        tearColor: "#d4b870" },
    { id: "corrupt",  min: 50, max: 74,  label: "CORRUPTED",      tearColor: "#c44030" },
    { id: "consumed", min: 75, max: 100, label: "VESSEL CONSUMED", tearColor: "#1a0a1e" },
  ];

  function getCorruptionTier(corruption) {
    for (var i = CORRUPTION_TIERS.length - 1; i >= 0; i--) {
      if (corruption >= CORRUPTION_TIERS[i].min) return CORRUPTION_TIERS[i];
    }
    return CORRUPTION_TIERS[0];
  }

  /* ================================================================== */
  /*  CORRUPTION MECHANIC EFFECTS                                        */
  /*  Each tier applies passive stat modifications.                      */
  /*  "consumed" tier is double-edged: massive damage, soul decay.       */
  /* ================================================================== */
  var TIER_MECHANIC_EFFECTS = {
    pure:     { damageScale: 1.0,  tearScale: 1.0,  soulDecayPerSec: 0,    dodgeWindow: 0 },
    tainted:  { damageScale: 1.1,  tearScale: 1.05, soulDecayPerSec: 0,    dodgeWindow: 0 },
    corrupt:  { damageScale: 1.25, tearScale: 1.1,  soulDecayPerSec: 0.02, dodgeWindow: 0.1 },
    consumed: { damageScale: 1.5,  tearScale: 1.2,  soulDecayPerSec: 0.05, dodgeWindow: 0.2 },
  };

  function getTierMechanics(corruption) {
    var tier = getCorruptionTier(corruption);
    return TIER_MECHANIC_EFFECTS[tier.id];
  }

  /* ================================================================== */
  /*  CORRUPTION SOURCES — events that raise/lower corruption            */
  /* ================================================================== */
  var CORRUPTION_SOURCES = {
    item_pickup:       { delta: "item",  desc: "Item-defined corruption change" },
    altar_sacrifice:   { delta: 8,       desc: "Sacrificing soul at a dark altar" },
    confession_resist: { delta: -5,      desc: "Resisting temptation at confession" },
    confession_yield:  { delta: 12,      desc: "Yielding to temptation at confession" },
    boss_kill:         { delta: 5,       desc: "Absorbing boss essence on kill" },
    floor_descent:     { delta: 3,       desc: "Deeper descent corrodes the vessel" },
    soul_at_zero:      { delta: 2,       desc: "Soul depletion briefly corrupts" },
    holy_relic:        { delta: -8,      desc: "Holy relic purifies corruption" },
    dark_relic:        { delta: 15,      desc: "Dark relic floods corruption" },
  };

  /* ================================================================== */
  /*  CORRUPTION STATE                                                   */
  /*  Tracks corruption level + history for narrative/ending logic.      */
  /* ================================================================== */
  function createCorruptionState() {
    return {
      level: 0,
      peakLevel: 0,
      history: [],          // { source, delta, resultLevel, tick }
      tierTransitions: [],  // { from, to, tick }
      confessionChoices: [],// { floor, choice: "resist"|"yield", tick }
      bossesKilled: [],
      relicsFound: [],
      currentTier: "pure",
      soulDecayAccum: 0,
    };
  }

  function applyCorruptionDelta(state, source, delta, tick) {
    var prevTier = state.currentTier;
    var prevLevel = state.level;
    var actualDelta = (source === "item_pickup") ? (delta || 0) : (CORRUPTION_SOURCES[source] ? CORRUPTION_SOURCES[source].delta : delta);
    if (actualDelta === "item") actualDelta = delta || 0;
    state.level = Math.max(0, Math.min(100, state.level + actualDelta));
    state.peakLevel = Math.max(state.peakLevel, state.level);

    state.history.push({
      source: source,
      delta: actualDelta,
      resultLevel: state.level,
      tick: tick,
    });

    var newTier = getCorruptionTier(state.level);
    if (newTier.id !== prevTier) {
      state.tierTransitions.push({ from: prevTier, to: newTier.id, tick: tick });
      state.currentTier = newTier.id;
    }

    return {
      prevLevel: prevLevel,
      newLevel: state.level,
      prevTier: prevTier,
      newTier: newTier.id,
      tierChanged: newTier.id !== prevTier,
    };
  }

  /* ================================================================== */
  /*  SOUL DECAY — corruption-driven passive soul drain                  */
  /*  Called each fixed-step tick. Returns actual drain applied.          */
  /* ================================================================== */
  function tickSoulDecay(state, player, dtSec) {
    var mechanics = getTierMechanics(state.level);
    if (mechanics.soulDecayPerSec <= 0) return 0;
    state.soulDecayAccum += mechanics.soulDecayPerSec * dtSec;
    if (state.soulDecayAccum >= 1) {
      var drain = Math.floor(state.soulDecayAccum);
      state.soulDecayAccum -= drain;
      player.soul = Math.max(0, player.soul - drain);
      return drain;
    }
    return 0;
  }

  /* ================================================================== */
  /*  WHISPER SYSTEM — context-aware horror text                         */
  /*  Aligned with SPEC.md Thematic Rules: horror tone, spiritual        */
  /*  erosion framing. No comedy. Player is the vessel.                  */
  /* ================================================================== */
  var WHISPER_POOLS = {
    high_corruption: [
      "You are becoming something else.",
      "The walls breathe with you now.",
      "Your tears burn darker.",
      "It was always going to end this way.",
      "The vessel remembers what you forgot.",
      "There is no prayer left that knows your name.",
    ],
    low_soul: [
      "The light is leaving.",
      "Each step costs more than the last.",
      "You can feel the edges fraying.",
      "Something is waiting for you to stop.",
    ],
    boss_approach: [
      "It knows you are here.",
      "The air thickens with purpose.",
      "This was never meant to be survived.",
      "Kneel or be broken.",
    ],
    floor_descent: [
      "Deeper. Always deeper.",
      "The stone remembers other vessels.",
      "You descend because you must.",
      "Below awaits what you deserve.",
    ],
    tier_transition: {
      tainted:  "Something stirs beneath your skin.",
      corrupt:  "Your reflection no longer follows.",
      consumed: "You are no longer the one holding on.",
    },
    confession: {
      resist: "Purity is just another cage.",
      yield:  "Was it worth it? It always is.",
    },
  };

  function selectWhisper(context, rng, corruptionState) {
    if (context === "tier_transition") {
      return WHISPER_POOLS.tier_transition[corruptionState.currentTier] || null;
    }
    if (context === "confession_resist") return WHISPER_POOLS.confession.resist;
    if (context === "confession_yield") return WHISPER_POOLS.confession.yield;

    var pool = WHISPER_POOLS[context];
    if (!pool || !pool.length) return null;
    var idx = Math.floor(rng() * pool.length);
    return pool[idx];
  }

  /* ================================================================== */
  /*  NARRATIVE BEATS — floor transition story fragments                 */
  /*  Horror-only tone per Thematic Rules. Player = vessel.              */
  /* ================================================================== */
  var FLOOR_NARRATIVES = {
    1: {
      pure:     "The Nave stretches before you. Icons watch from cracked walls. You do not belong here, but you enter anyway.",
      tainted:  "The Nave feels smaller than before. The icons' eyes follow. Something inside you recognizes this place.",
      corrupt:  "The Nave opens like a wound. You can hear the icons whispering. They know what you are becoming.",
      consumed: "The Nave is yours now. The icons bow. The stone parts for you. You remember building this place.",
    },
    2: {
      pure:     "The stairs descend into the Catacombs. The dead are restless. You feel their attention.",
      tainted:  "The Catacombs welcome you by name. Bones shift in their alcoves as you pass.",
      corrupt:  "The Catacombs are warm. The dead press against their tombs, reaching for what you carry.",
      consumed: "The dead part before you. They remember serving you. The Catacombs are home.",
    },
    3: {
      pure:     "The Ossuary glows with borrowed light. Skulls line every surface. Each one watched someone die.",
      tainted:  "The Ossuary hums. The skulls turn to face you. Some are smiling.",
      corrupt:  "The Ossuary sings. You recognize the melody. It is the sound of bones remembering flesh.",
      consumed: "The Ossuary opens its throat and swallows you whole. You descend willingly.",
    },
    4: {
      pure:     "The Pit. There is nothing holy here. Even the darkness is afraid.",
      tainted:  "The Pit opens below. You can feel it pulling. It has been waiting.",
      corrupt:  "The Pit is not below you. It is inside you. You have been carrying it all along.",
      consumed: "You are the Pit. The Pit is you. There was never a difference.",
    },
  };

  function getFloorNarrative(floor, corruption) {
    var tier = getCorruptionTier(corruption);
    var floorData = FLOOR_NARRATIVES[floor];
    if (!floorData) return null;
    return floorData[tier.id] || floorData.pure;
  }

  /* ================================================================== */
  /*  CONDITIONAL ENDINGS                                                */
  /*  Grounded in SPEC.md Thematic Rules: player is the vessel.          */
  /*  Endings reflect moral tradeoffs, not power fantasy reward.         */
  /* ================================================================== */
  var ENDINGS = {
    liberation: {
      id: "liberation",
      name: "LIBERATION",
      desc: "The vessel breaks. What was inside escapes. You are free, but empty.",
      conditions: { maxCorruption: 24, confessionResists: 3 },
      priority: 1,
    },
    martyrdom: {
      id: "martyrdom",
      name: "MARTYRDOM",
      desc: "You burn away the corruption with what remains of your soul. The church stands. You do not.",
      conditions: { minCorruption: 25, maxCorruption: 49, minBossKills: 3, confessionResists: 2 },
      priority: 2,
    },
    communion: {
      id: "communion",
      name: "COMMUNION",
      desc: "The corruption and the vessel find equilibrium. You are neither saved nor lost. You simply continue.",
      conditions: { minCorruption: 50, maxCorruption: 74, confessionMixed: true },
      priority: 3,
    },
    consumed: {
      id: "consumed",
      name: "CONSUMED",
      desc: "The vessel is full. What was you is now something else entirely. The church was always yours.",
      conditions: { minCorruption: 75 },
      priority: 4,
    },
    vessel_ascendant: {
      id: "vessel_ascendant",
      name: "VESSEL ASCENDANT",
      desc: "You kept every dark relic. You yielded at every confession. You are what the church was built to contain.",
      conditions: { minCorruption: 90, confessionYields: 3, minDarkRelics: 2 },
      priority: 5,
    },
  };

  function evaluateEnding(corruptionState) {
    var candidates = [];
    var endingIds = Object.keys(ENDINGS);

    for (var i = 0; i < endingIds.length; i++) {
      var ending = ENDINGS[endingIds[i]];
      var cond = ending.conditions;
      var met = true;

      if (cond.maxCorruption != null && corruptionState.level > cond.maxCorruption) met = false;
      if (cond.minCorruption != null && corruptionState.level < cond.minCorruption) met = false;
      if (cond.minBossKills != null && corruptionState.bossesKilled.length < cond.minBossKills) met = false;

      // Count confession choices
      var resists = 0, yields = 0;
      for (var c = 0; c < corruptionState.confessionChoices.length; c++) {
        if (corruptionState.confessionChoices[c].choice === "resist") resists++;
        if (corruptionState.confessionChoices[c].choice === "yield") yields++;
      }
      if (cond.confessionResists != null && resists < cond.confessionResists) met = false;
      if (cond.confessionYields != null && yields < cond.confessionYields) met = false;
      if (cond.confessionMixed && !(resists >= 1 && yields >= 1)) met = false;

      // Dark relics
      var darkRelics = 0;
      for (var r = 0; r < corruptionState.relicsFound.length; r++) {
        if (corruptionState.relicsFound[r].type === "dark") darkRelics++;
      }
      if (cond.minDarkRelics != null && darkRelics < cond.minDarkRelics) met = false;

      if (met) candidates.push(ending);
    }

    // Return highest-priority ending
    candidates.sort(function (a, b) { return b.priority - a.priority; });
    return candidates.length > 0 ? candidates[0] : ENDINGS.consumed; // fallback
  }

  /* ================================================================== */
  /*  PROGRESSION TRACKING — discovered endings and meta-unlocks         */
  /* ================================================================== */
  var META_UNLOCKS = {
    liberation:       { unlock: "holy_start",      desc: "Start with +1 MAX SOUL" },
    martyrdom:        { unlock: "martyr_tears",     desc: "Start with BURNING STIGMATA available in pool" },
    communion:        { unlock: "balanced_path",    desc: "Confession rooms appear more frequently" },
    consumed:         { unlock: "void_start",       desc: "Start with +10 corruption and VOID HEART in pool" },
    vessel_ascendant: { unlock: "true_vessel",      desc: "Unlock the Vessel's true form — all corruption-tech items start revealed" },
  };

  function createProgressionState() {
    return {
      discoveredEndings: {},   // { endingId: { firstSeed, runCount, bestTime } }
      totalRuns: 0,
      metaUnlocks: {},         // { unlockId: true }
    };
  }

  function recordEndingDiscovery(progression, endingId, seed, runTimeMs) {
    progression.totalRuns++;
    if (!progression.discoveredEndings[endingId]) {
      progression.discoveredEndings[endingId] = {
        firstSeed: seed,
        runCount: 1,
        bestTime: runTimeMs,
      };
      // Grant meta-unlock
      var meta = META_UNLOCKS[endingId];
      if (meta) {
        progression.metaUnlocks[meta.unlock] = true;
      }
      return { newDiscovery: true, unlock: meta ? meta : null };
    }
    progression.discoveredEndings[endingId].runCount++;
    if (runTimeMs < progression.discoveredEndings[endingId].bestTime) {
      progression.discoveredEndings[endingId].bestTime = runTimeMs;
    }
    return { newDiscovery: false, unlock: null };
  }

  function getDiscoveredEndingCount(progression) {
    return Object.keys(progression.discoveredEndings).length;
  }

  function getTotalEndingCount() {
    return Object.keys(ENDINGS).length;
  }

  /* ================================================================== */
  /*  CONFESSION ROOM — branching choice mechanic                        */
  /*  Each floor can have one confession. Player resist/yield decision    */
  /*  shifts corruption and narrative state.                             */
  /* ================================================================== */
  function processConfession(corruptionState, choice, floor, tick) {
    var source = choice === "resist" ? "confession_resist" : "confession_yield";
    corruptionState.confessionChoices.push({ floor: floor, choice: choice, tick: tick });
    return applyCorruptionDelta(corruptionState, source, null, tick);
  }

  /* ================================================================== */
  /*  RELIC SYSTEM — holy/dark relics that gate endings                  */
  /* ================================================================== */
  var RELICS = {
    saints_finger:    { type: "holy", name: "SAINT'S FINGER",     corruption: -5,  desc: "A fragment of something once pure." },
    blessed_water:    { type: "holy", name: "BLESSED WATER",      corruption: -8,  desc: "It burns what should not be burned." },
    prophets_eye:     { type: "holy", name: "PROPHET'S EYE",      corruption: -3,  desc: "It sees what you refuse to." },
    bone_idol:        { type: "dark", name: "BONE IDOL",          corruption: 15,  desc: "Carved from something that was still alive." },
    black_scripture:  { type: "dark", name: "BLACK SCRIPTURE",    corruption: 12,  desc: "The words rewrite themselves as you read." },
    worm_heart:       { type: "dark", name: "WORM HEART",         corruption: 18,  desc: "It pulses in time with yours. Or yours in time with it." },
  };

  function pickUpRelic(corruptionState, relicId, tick) {
    var relic = RELICS[relicId];
    if (!relic) return null;
    corruptionState.relicsFound.push({ id: relicId, type: relic.type, tick: tick });
    var source = relic.type === "holy" ? "holy_relic" : "dark_relic";
    return applyCorruptionDelta(corruptionState, source, relic.corruption, tick);
  }

  /* ================================================================== */
  /*  DETERMINISTIC SCENARIO SIMULATION                                  */
  /*  Runs N scenarios with varying corruption paths and validates       */
  /*  that all endings are reachable and triggers fire correctly.        */
  /* ================================================================== */
  function simulateCorruptionScenarios(runCount, seed) {
    runCount = runCount || 500;
    seed = seed || 42;
    var rng = createDeterministicRng(seed);

    var endingCounts = {};
    var tierTransitionCounts = { tainted: 0, corrupt: 0, consumed: 0 };
    var whispersFired = 0;
    var narrativesFired = 0;
    var soulDecayTriggered = 0;
    var allScenarios = [];

    for (var r = 0; r < runCount; r++) {
      var state = createCorruptionState();
      var player = { soul: 6, maxSoul: 6, corruption: 0 };

      // Strategy mix: 20% purity-focused, 20% corruption-heavy, 60% random
      var strategy = r < runCount * 0.2 ? "pure" : r < runCount * 0.4 ? "dark" : "random";

      // Simulate 4 floors
      for (var floor = 1; floor <= 4; floor++) {
        // Floor descent
        applyCorruptionDelta(state, "floor_descent", null, floor * 1000);

        // Item pickups (2 per floor)
        for (var ip = 0; ip < 2; ip++) {
          var itemCorr;
          if (strategy === "pure") itemCorr = Math.floor(rng() * 5) - 3;      // -3 to +1
          else if (strategy === "dark") itemCorr = Math.floor(rng() * 15) + 5; // +5 to +19
          else itemCorr = Math.floor(rng() * 20) - 3;                          // -3 to +16
          applyCorruptionDelta(state, "item_pickup", itemCorr, floor * 1000 + ip * 100);
        }

        // Confession choice influenced by strategy
        var confChoice;
        if (strategy === "pure") confChoice = "resist";
        else if (strategy === "dark") confChoice = "yield";
        else confChoice = rng() < (state.level / 100 * 0.6 + 0.2) ? "yield" : "resist";
        processConfession(state, confChoice, floor, floor * 1000 + 500);

        // Relic (50% chance per floor, bias by strategy)
        if (rng() < 0.5) {
          var relicIds = Object.keys(RELICS);
          var relicId;
          if (strategy === "pure") {
            var holyRelics = relicIds.filter(function(id) { return RELICS[id].type === "holy"; });
            relicId = holyRelics[Math.floor(rng() * holyRelics.length)];
          } else if (strategy === "dark") {
            var darkRelics = relicIds.filter(function(id) { return RELICS[id].type === "dark"; });
            relicId = darkRelics[Math.floor(rng() * darkRelics.length)];
          } else {
            relicId = relicIds[Math.floor(rng() * relicIds.length)];
          }
          pickUpRelic(state, relicId, floor * 1000 + 600);
        }

        // Boss kill
        state.bossesKilled.push({ floor: floor, tick: floor * 1000 + 900 });
        applyCorruptionDelta(state, "boss_kill", null, floor * 1000 + 900);

        // Narrative
        var narrative = getFloorNarrative(floor, state.level);
        if (narrative) narrativesFired++;

        // Whisper
        var whisper = selectWhisper(
          state.level >= 50 ? "high_corruption" : "floor_descent",
          rng, state
        );
        if (whisper) whispersFired++;

        // Soul decay simulation (10 seconds at 120fps)
        for (var t = 0; t < 1200; t++) {
          var drain = tickSoulDecay(state, player, 1 / 120);
          if (drain > 0) soulDecayTriggered++;
        }
      }

      // Evaluate ending
      player.corruption = state.level;
      var ending = evaluateEnding(state);
      endingCounts[ending.id] = (endingCounts[ending.id] || 0) + 1;

      // Track tier transitions
      for (var tt = 0; tt < state.tierTransitions.length; tt++) {
        var to = state.tierTransitions[tt].to;
        if (tierTransitionCounts[to] != null) tierTransitionCounts[to]++;
      }

      allScenarios.push({
        finalCorruption: state.level,
        peakCorruption: state.peakLevel,
        ending: ending.id,
        confessions: state.confessionChoices.length,
        relics: state.relicsFound.length,
        tierTransitions: state.tierTransitions.length,
      });
    }

    return {
      runs: runCount,
      endingCounts: endingCounts,
      endingsReachable: Object.keys(endingCounts).length,
      totalEndings: getTotalEndingCount(),
      tierTransitionCounts: tierTransitionCounts,
      whispersFired: whispersFired,
      narrativesFired: narrativesFired,
      soulDecayTriggered: soulDecayTriggered,
      sampleScenarios: allScenarios.slice(0, 5),
    };
  }

  /* ================================================================== */
  /*  PUBLIC API                                                         */
  /* ================================================================== */
  return {
    CORRUPTION_TIERS: CORRUPTION_TIERS,
    TIER_MECHANIC_EFFECTS: TIER_MECHANIC_EFFECTS,
    CORRUPTION_SOURCES: CORRUPTION_SOURCES,
    WHISPER_POOLS: WHISPER_POOLS,
    FLOOR_NARRATIVES: FLOOR_NARRATIVES,
    ENDINGS: ENDINGS,
    META_UNLOCKS: META_UNLOCKS,
    RELICS: RELICS,

    getCorruptionTier: getCorruptionTier,
    getTierMechanics: getTierMechanics,
    createCorruptionState: createCorruptionState,
    applyCorruptionDelta: applyCorruptionDelta,
    tickSoulDecay: tickSoulDecay,
    selectWhisper: selectWhisper,
    getFloorNarrative: getFloorNarrative,
    evaluateEnding: evaluateEnding,
    createProgressionState: createProgressionState,
    recordEndingDiscovery: recordEndingDiscovery,
    getDiscoveredEndingCount: getDiscoveredEndingCount,
    getTotalEndingCount: getTotalEndingCount,
    processConfession: processConfession,
    pickUpRelic: pickUpRelic,
    simulateCorruptionScenarios: simulateCorruptionScenarios,
  };
});
