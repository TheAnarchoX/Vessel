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

  var AFFIX_POOL = {
    ash_fog: {
      id: "ash_fog",
      category: "readability",
      routeAffinity: "demonic",
      roomTypes: ["combat", "boss"],
      generationWeight: 3,
      combatMods: { enemySpeedScale: 1.08, telegraphScale: 0.9 },
      uiMods: { vignetteScale: 1.12 },
      audioMods: { whisperGainScale: 1.15 },
    },
    vow_silence: {
      id: "vow_silence",
      category: "control",
      routeAffinity: "ascetic",
      roomTypes: ["confession", "rest", "combat"],
      generationWeight: 3,
      combatMods: { enemySpeedScale: 0.94, telegraphScale: 1.1 },
      uiMods: { hudClarityScale: 1.08 },
      audioMods: { whisperGainScale: 0.85 },
    },
    bleeding_altar: {
      id: "bleeding_altar",
      category: "economy",
      routeAffinity: "demonic",
      roomTypes: ["altar", "reliquary", "combat"],
      generationWeight: 2,
      combatMods: { enemyDamageScale: 1.06 },
      uiMods: { alertPriorityScale: 1.08 },
      audioMods: { lowPassScale: 0.9 },
    },
    penitent_bloom: {
      id: "penitent_bloom",
      category: "recovery",
      routeAffinity: "ascetic",
      roomTypes: ["rest", "confession", "reliquary"],
      generationWeight: 2,
      combatMods: { enemyDamageScale: 0.95 },
      uiMods: { hudClarityScale: 1.06 },
      audioMods: { lowPassScale: 1.06 },
    },
    sigil_overgrowth: {
      id: "sigil_overgrowth",
      category: "hazard",
      routeAffinity: "unaligned",
      roomTypes: ["combat", "boss"],
      generationWeight: 2,
      combatMods: { hazardDamageScale: 1.15 },
      uiMods: { alertPriorityScale: 1.1 },
      audioMods: { whisperGainScale: 1.05 },
    },
  };

  function getAfflictionPool(routeId) {
    var out = [];
    var ids = Object.keys(AFFIX_POOL);
    for (var i = 0; i < ids.length; i++) {
      var affliction = AFFIX_POOL[ids[i]];
      var w = affliction.generationWeight;
      if (affliction.routeAffinity === routeId) w += 2;
      if (routeId === "unbound" && affliction.routeAffinity === "unaligned") w += 1;
      out.push({ id: affliction.id, weight: w });
    }
    return out;
  }

  function pickWeighted(rng, pool) {
    var total = 0;
    for (var i = 0; i < pool.length; i++) total += pool[i].weight;
    if (total <= 0) return pool[0].id;
    var roll = rng() * total;
    for (var p = 0; p < pool.length; p++) {
      roll -= pool[p].weight;
      if (roll <= 0) return pool[p].id;
    }
    return pool[pool.length - 1].id;
  }

  function rollFloorAfflictions(seed, floor, routeId) {
    var mixSeed = ((seed >>> 0) ^ ((floor + 1) * 2654435761)) >>> 0;
    var rng = createDeterministicRng(mixSeed);
    var pool = getAfflictionPool(routeId || "unbound");
    var routeSpecific = [];
    var ids = Object.keys(AFFIX_POOL);
    for (var i = 0; i < ids.length; i++) {
      var def = AFFIX_POOL[ids[i]];
      if (def.routeAffinity === routeId) routeSpecific.push(def.id);
    }

    var first = routeSpecific.length
      ? routeSpecific[Math.floor(rng() * routeSpecific.length)]
      : pickWeighted(rng, pool);
    var second = pickWeighted(rng, pool.filter(function (entry) { return entry.id !== first; }));
    return [first, second];
  }

  function annotateRoomsWithAfflictions(rooms, afflictionIds, seed) {
    var rng = createDeterministicRng(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
    var results = [];
    for (var i = 0; i < rooms.length; i++) {
      var room = rooms[i];
      var eligible = [];
      for (var a = 0; a < afflictionIds.length; a++) {
        var def = AFFIX_POOL[afflictionIds[a]];
        if (def && def.roomTypes.indexOf(room.type) !== -1) eligible.push(def.id);
      }
      if (eligible.length === 0) continue;
      var chosen = eligible[Math.floor(rng() * eligible.length)];
      results.push({ roomId: room.id || (room.x + "," + room.y), roomType: room.type, afflictionId: chosen });
    }
    return results;
  }

  function summarizeAfflictions(afflictionIds) {
    var out = {
      combat: { enemySpeedScale: 1, enemyDamageScale: 1, telegraphScale: 1, hazardDamageScale: 1 },
      ui: { vignetteScale: 1, hudClarityScale: 1, alertPriorityScale: 1 },
      audio: { whisperGainScale: 1, lowPassScale: 1 },
      categories: {},
    };

    for (var i = 0; i < afflictionIds.length; i++) {
      var def = AFFIX_POOL[afflictionIds[i]];
      if (!def) continue;
      out.categories[def.category] = (out.categories[def.category] || 0) + 1;

      var combatKeys = Object.keys(def.combatMods || {});
      for (var c = 0; c < combatKeys.length; c++) {
        var combatKey = combatKeys[c];
        out.combat[combatKey] *= def.combatMods[combatKey];
      }

      var uiKeys = Object.keys(def.uiMods || {});
      for (var u = 0; u < uiKeys.length; u++) {
        var uiKey = uiKeys[u];
        out.ui[uiKey] *= def.uiMods[uiKey];
      }

      var audioKeys = Object.keys(def.audioMods || {});
      for (var a = 0; a < audioKeys.length; a++) {
        var audioKey = audioKeys[a];
        out.audio[audioKey] *= def.audioMods[audioKey];
      }
    }

    return out;
  }

  function createAfflictionPlan(params) {
    params = params || {};
    var seed = params.seed || 1;
    var floor = params.floor || 0;
    var routeId = params.routeId || "unbound";
    var rooms = params.rooms || [];
    var ids = rollFloorAfflictions(seed, floor, routeId);
    var roomAssignments = annotateRoomsWithAfflictions(rooms, ids, seed);
    var summary = summarizeAfflictions(ids);

    return {
      seed: seed,
      floor: floor,
      routeId: routeId,
      afflictions: ids,
      roomAssignments: roomAssignments,
      summary: summary,
    };
  }

  function validateAfflictionContracts() {
    var ids = Object.keys(AFFIX_POOL);
    var valid = true;
    var failures = [];

    for (var i = 0; i < ids.length; i++) {
      var def = AFFIX_POOL[ids[i]];
      if (!def.id || !def.category || !def.routeAffinity) {
        valid = false;
        failures.push("missing core fields for " + ids[i]);
      }
      if (!Array.isArray(def.roomTypes) || def.roomTypes.length === 0) {
        valid = false;
        failures.push("missing roomTypes for " + ids[i]);
      }
      if (typeof def.generationWeight !== "number" || def.generationWeight <= 0) {
        valid = false;
        failures.push("invalid generationWeight for " + ids[i]);
      }
    }

    return { valid: valid, failures: failures };
  }

  return {
    AFFIX_POOL: AFFIX_POOL,
    createAfflictionPlan: createAfflictionPlan,
    rollFloorAfflictions: rollFloorAfflictions,
    annotateRoomsWithAfflictions: annotateRoomsWithAfflictions,
    summarizeAfflictions: summarizeAfflictions,
    validateAfflictionContracts: validateAfflictionContracts,
  };
});
