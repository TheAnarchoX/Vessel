(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselContent = Object.assign(root.VesselContent || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  var ITEM_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["id", "name", "category", "corruption", "pathAffinity", "tags", "effects"],
    properties: {
      id: { type: "string", minLength: 1 },
      name: { type: "string", minLength: 1 },
      category: { type: "string", enum: ["offense", "defense", "utility", "economy", "corruption_tech"] },
      corruption: { type: "number", minimum: -100, maximum: 100 },
      pathAffinity: { type: "string", enum: ["demonic", "ascetic", "unaligned"] },
      tags: { type: "array", minItems: 1, items: { type: "string" } },
      effects: {
        type: "object",
        minProperties: 1,
        additionalProperties: {
          anyOf: [{ type: "number" }, { type: "boolean" }],
        },
      },
    },
  };

  var ENEMY_ARCHETYPE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["id", "behavior", "role", "baseHealth", "baseSpeed", "pathAffinity", "telegraphMs", "readMs", "recoverMs"],
    properties: {
      id: { type: "string", minLength: 1 },
      behavior: { type: "string", enum: ["chase", "charge", "kite", "summon", "zone"] },
      role: { type: "string", enum: ["melee", "ranged", "area"] },
      baseHealth: { type: "number", minimum: 1 },
      baseSpeed: { type: "number", minimum: 1 },
      pathAffinity: { type: "string", enum: ["demonic", "ascetic", "unaligned"] },
      telegraphMs: { type: "number", minimum: 100, maximum: 1200 },
      readMs: { type: "number", minimum: 100, maximum: 1200 },
      recoverMs: { type: "number", minimum: 100, maximum: 1600 },
    },
  };

  var BOSS_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["id", "name", "pathAffinity", "phaseCount", "hazardProfile"],
    properties: {
      id: { type: "string", minLength: 1 },
      name: { type: "string", minLength: 1 },
      pathAffinity: { type: "string", enum: ["demonic", "ascetic", "unaligned"] },
      phaseCount: { type: "number", minimum: 1, maximum: 12 },
      hazardProfile: { type: "string", minLength: 1 },
      notes: { type: "string" },
    },
  };

  var ROOM_TEMPLATE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["id", "type", "intensity", "allowsCombatLock"],
    properties: {
      id: { type: "string", minLength: 1 },
      type: { type: "string", enum: ["start", "boss", "combat", "altar", "confession", "reliquary", "rest"] },
      intensity: { type: "number", minimum: 0, maximum: 10 },
      allowsCombatLock: { type: "boolean" },
      notes: { type: "string" },
    },
  };

  return {
    ITEM_SCHEMA: ITEM_SCHEMA,
    ENEMY_ARCHETYPE_SCHEMA: ENEMY_ARCHETYPE_SCHEMA,
    BOSS_SCHEMA: BOSS_SCHEMA,
    ROOM_TEMPLATE_SCHEMA: ROOM_TEMPLATE_SCHEMA,
  };
});
