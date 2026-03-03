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
  /*  ITEM CATEGORIES                                                    */
  /* ================================================================== */
  var ITEM_CATEGORIES = ["offense", "defense", "utility", "economy", "corruption_tech"];

  /* ================================================================== */
  /*  ITEM DEFINITIONS — data-driven, no closures                        */
  /*  Grounded in SPEC.md Player Systems:                                */
  /*    Soul (HP), Corruption 0-100, Tear stats (rate/damage/range/      */
  /*    speed), damageReduction, pierce/slow/homing flags                 */
  /* ================================================================== */
  var ITEM_DEFINITIONS = {
    // === OFFENSE (tear/damage boosters) ===
    unholy_water:     { name: "UNHOLY WATER",       category: "offense",          corruption: 5,   tags: ["tear", "unholy"],       effects: { pierce: true } },
    goats_eye:        { name: "GOAT'S EYE",         category: "offense",          corruption: 10,  tags: ["unholy", "body"],        effects: { damage: 1 } },
    marrow_candle:    { name: "MARROW CANDLE",      category: "offense",          corruption: 5,   tags: ["tear", "body"],          effects: { tears: 0.5 } },
    inverted_cross:   { name: "INVERTED CROSS",     category: "offense",          corruption: 25,  tags: ["unholy", "corruption"],  effects: { damage: 1, soul: -1 } },
    blackened_tongue: { name: "BLACKENED TONGUE",    category: "offense",          corruption: 10,  tags: ["unholy", "tear"],        effects: { slow: true } },
    split_nail:       { name: "SPLIT NAIL",         category: "offense",          corruption: 8,   tags: ["tear"],                  effects: { split: 2 } },
    chain_censer:     { name: "CHAIN CENSER",       category: "offense",          corruption: 12,  tags: ["tear", "holy"],          effects: { chain: 2 } },
    burning_stigmata: { name: "BURNING STIGMATA",   category: "offense",          corruption: 15,  tags: ["body", "corruption"],    effects: { dot: 0.5 } },
    siphon_tooth:     { name: "SIPHON TOOTH",       category: "offense",          corruption: 12,  tags: ["unholy", "soul"],        effects: { siphon: 0.3 } },

    // === DEFENSE (soul/survivability) ===
    the_rope:         { name: "THE ROPE",           category: "defense",          corruption: 0,   tags: ["holy"],                  effects: { extraLife: 1 } },
    saints_ash:       { name: "SAINT'S ASH",        category: "defense",          corruption: 0,   tags: ["soul", "holy"],          effects: { maxSoul: 2, soul: 2 } },
    flayed_skin:      { name: "FLAYED SKIN",        category: "defense",          corruption: 15,  tags: ["body", "unholy"],        effects: { damageReduction: 0.25 } },
    bone_ward:        { name: "BONE WARD",          category: "defense",          corruption: 8,   tags: ["body", "soul"],          effects: { maxSoul: 1, damageReduction: 0.1 } },
    martyrs_veil:     { name: "MARTYR'S VEIL",      category: "defense",          corruption: 3,   tags: ["holy", "body"],          effects: { maxSoul: 1, soul: 1 } },

    // === UTILITY (movement/range/map) ===
    pilgrims_sandals: { name: "PILGRIM'S SANDALS",  category: "utility",          corruption: 0,   tags: ["body", "holy"],          effects: { speed: 30 } },
    widened_eye:      { name: "WIDENED EYE",        category: "utility",          corruption: 5,   tags: ["body"],                  effects: { range: 80 } },
    swift_tear:       { name: "SWIFT TEAR",         category: "utility",          corruption: 3,   tags: ["tear"],                  effects: { shotSpeed: 60 } },
    cartographers_bone:{ name: "CARTOGRAPHER'S BONE",category: "utility",         corruption: 0,   tags: ["holy"],                  effects: { mapReveal: true } },

    // === ECONOMY (soul income/item access) ===
    tithe_box:        { name: "TITHE BOX",          category: "economy",          corruption: 0,   tags: ["soul", "holy"],          effects: { soulOnClear: 1 } },
    reliquary_key:    { name: "RELIQUARY KEY",      category: "economy",          corruption: 5,   tags: ["holy"],                  effects: { extraPickup: true } },
    blood_chalice:    { name: "BLOOD CHALICE",      category: "economy",          corruption: 10,  tags: ["soul", "unholy"],        effects: { siphon: 0.2 } },

    // === CORRUPTION-TECH (high-risk high-reward) ===
    void_heart:       { name: "VOID HEART",         category: "corruption_tech",  corruption: 20,  tags: ["corruption", "soul"],    effects: { corruptionDamageScale: true } },
    penitent_thorns:  { name: "PENITENT THORNS",    category: "corruption_tech",  corruption: -10, tags: ["corruption", "holy"],    effects: { damage: -0.3, maxSoul: 1 } },
    blackened_halo:   { name: "BLACKENED HALO",     category: "corruption_tech",  corruption: 30,  tags: ["corruption", "unholy"],  effects: { aura: 1.5 } },
    vessels_echo:     { name: "VESSEL'S ECHO",      category: "corruption_tech",  corruption: 15,  tags: ["corruption", "tear"],    effects: { corruptionTearBonus: true } },
  };

  /* ================================================================== */
  /*  BOSS DROPS — fixed rewards, not in general pool                    */
  /* ================================================================== */
  var BOSS_DROPS = {
    shepherds_brand:  { name: "SHEPHERD'S BRAND",   category: "offense",  corruption: 8,  tags: ["unholy", "tear"],  effects: { homing: true },                  boss: "shepherd" },
    saints_marrow:    { name: "SAINT'S MARROW",     category: "offense",  corruption: 10, tags: ["body"],            effects: { damage: 1 },                     boss: "pit" },
    testament:        { name: "TESTAMENT",          category: "utility",  corruption: 5,  tags: ["tear", "holy"],    effects: { tears: 0.5, mapReveal: true },   boss: "choir" },
  };

  /* ================================================================== */
  /*  PAIR SYNERGIES — bonus when both items are held                     */
  /* ================================================================== */
  var PAIR_SYNERGIES = [
    { items: ["unholy_water", "blackened_tongue"],   name: "CORRUPTED FLOW",     bonus: { damage: 0.5 },                  desc: "Pierce and slow amplify each other" },
    { items: ["goats_eye", "burning_stigmata"],      name: "SEARING GAZE",       bonus: { dot: 0.3 },                     desc: "Raw damage fuels the burn" },
    { items: ["saints_ash", "tithe_box"],            name: "HOLY OFFERING",      bonus: { soulOnClear: 1 },               desc: "Purity rewards devotion" },
    { items: ["flayed_skin", "bone_ward"],           name: "OSSIFIED",           bonus: { damageReduction: 0.1 },          desc: "Layered defenses harden further" },
    { items: ["void_heart", "blackened_halo"],       name: "ABYSSAL PRESENCE",   bonus: { aura: 1.0 },                    desc: "Corruption amplifies the dark aura" },
    { items: ["pilgrims_sandals", "swift_tear"],     name: "SWIFT PILGRIMAGE",   bonus: { speed: 15, shotSpeed: 30 },     desc: "Movement and projectile harmony" },
    { items: ["blood_chalice", "inverted_cross"],    name: "BLOOD PACT",         bonus: { siphon: 0.2 },                  desc: "Sacrifice powers life-steal" },
    { items: ["chain_censer", "split_nail"],         name: "FRAGMENTED PRAYER",  bonus: { damage: 0.3 },                  desc: "Split-chain cascade amplifies hits" },
    { items: ["vessels_echo", "marrow_candle"],       name: "FLICKERING VESSEL",  bonus: { tears: 0.3 },                   desc: "Corruption echo accelerates tears" },
    { items: ["the_rope", "penitent_thorns"],        name: "PENITENCE",          bonus: { maxSoul: 1 },                   desc: "Rope and thorns purify the vessel" },
    { items: ["siphon_tooth", "blood_chalice"],      name: "CRIMSON TIDE",       bonus: { siphon: 0.2 },                  desc: "Double siphon builds sustain" },
    { items: ["widened_eye", "chain_censer"],         name: "FAR PRAYER",         bonus: { range: 40, chain: 1 },          desc: "Extended range enables chain spread" },
    { items: ["martyrs_veil", "the_rope"],           name: "UNDYING FAITH",      bonus: { soul: 1 },                      desc: "Layered safety nets restore hope" },
    { items: ["cartographers_bone", "reliquary_key"],name: "TREASURE HUNTER",    bonus: { extraPickup: true },             desc: "Full map vision reveals hidden loot" },
  ];

  /* ================================================================== */
  /*  TRIPLE SYNERGIES — emergent bonuses for 3-item combos              */
  /* ================================================================== */
  var TRIPLE_SYNERGIES = [
    { items: ["unholy_water", "split_nail", "chain_censer"],           name: "SHATTERED DELUGE",   bonus: { damage: 1 },                                        desc: "Three tear mods create devastating cascade" },
    { items: ["goats_eye", "burning_stigmata", "void_heart"],          name: "CORRUPTED INFERNO",  bonus: { dot: 1.0, corruptionDamageScale: true },              desc: "Maximum corruption offense" },
    { items: ["saints_ash", "the_rope", "penitent_thorns"],            name: "MARTYRDOM",          bonus: { maxSoul: 2, damageReduction: 0.15 },                 desc: "Holy trinity of defense" },
    { items: ["blood_chalice", "void_heart", "blackened_halo"],        name: "VESSEL UNBOUND",     bonus: { siphon: 0.5, aura: 2.0 },                           desc: "Ultimate corruption build" },
    { items: ["pilgrims_sandals", "cartographers_bone", "swift_tear"], name: "PATHFINDER",         bonus: { speed: 30, range: 60 },                             desc: "Full utility synergy" },
    { items: ["siphon_tooth", "blood_chalice", "flayed_skin"],         name: "IRON LEECH",         bonus: { siphon: 0.3, damageReduction: 0.1 },                desc: "Sustain through violence" },
    { items: ["marrow_candle", "split_nail", "vessels_echo"],          name: "ECHO STORM",         bonus: { tears: 0.5, split: 1 },                             desc: "Fire rate and split overwhelm" },
  ];

  /* ================================================================== */
  /*  TAG-BASED SCALING — bonuses for accumulating tags                   */
  /* ================================================================== */
  var TAG_THRESHOLDS = {
    tear:   { threshold: 3, perExtra: { tears: 0.2 },   name: "TEAR MASTERY" },
    unholy: { threshold: 3, perExtra: { damage: 0.3 },  name: "UNHOLY COMMUNION" },
    holy:   { threshold: 3, perExtra: { maxSoul: 1 },   name: "SANCTIFIED" },
    body:   { threshold: 3, perExtra: { speed: 10 },    name: "BODY HORROR" },
    soul:   { threshold: 3, perExtra: { soul: 0.5 },    name: "SOUL RESONANCE" },
  };

  /* ================================================================== */
  /*  BALANCE CONSTANTS — dead-build detection thresholds                 */
  /*                                                                     */
  /*  These floors ensure every build can clear content.                  */
  /*  Documented in MEMORY.md per Phase 4 agent prompt.                  */
  /* ================================================================== */
  var BALANCE = {
    MIN_EFFECTIVE_DPS: 1.0,       // damage * tears — below this, rooms are unwinnable
    MIN_SOUL_FLOOR: 2,            // minimum maxSoul to survive at least 2 hits
    MAX_DAMAGE_REDUCTION: 0.75,   // cap to prevent invulnerability
    MIN_DAMAGE: 0.5,              // hard floor on tear damage
    MIN_TEARS: 0.5,               // hard floor on fire rate
  };

  /* ================================================================== */
  /*  ITEM LOOKUP HELPERS                                                */
  /* ================================================================== */
  function getItemDef(itemId) {
    return ITEM_DEFINITIONS[itemId] || BOSS_DROPS[itemId] || null;
  }

  function getAllPoolIds() {
    return Object.keys(ITEM_DEFINITIONS);
  }

  function getPoolIdsByCategory(category) {
    return Object.keys(ITEM_DEFINITIONS).filter(function (id) {
      return ITEM_DEFINITIONS[id].category === category;
    });
  }

  /* ================================================================== */
  /*  EFFECT APPLICATION                                                 */
  /*  Applies a single item's effects to player stats (mutates player).  */
  /* ================================================================== */
  function applyItemEffects(player, itemId) {
    var def = getItemDef(itemId);
    if (!def) return;
    var fx = def.effects;
    // Additive numeric stats
    if (fx.damage)          player.damage += fx.damage;
    if (fx.tears)           player.tears += fx.tears;
    if (fx.speed)           player.speed += fx.speed;
    if (fx.range)           player.range += fx.range;
    if (fx.shotSpeed)       player.shotSpeed += fx.shotSpeed;
    if (fx.maxSoul)         { player.maxSoul += fx.maxSoul; }
    if (fx.soul)            player.soul = Math.max(1, player.soul + fx.soul);
    if (fx.damageReduction) player.damageReduction = Math.min(BALANCE.MAX_DAMAGE_REDUCTION, player.damageReduction + fx.damageReduction);
    if (fx.extraLife)       player.extraLife = (player.extraLife || 0) + fx.extraLife;
    if (fx.siphon)          player.siphon = (player.siphon || 0) + fx.siphon;
    if (fx.soulOnClear)     player.soulOnClear = (player.soulOnClear || 0) + fx.soulOnClear;
    if (fx.split)           player.split = (player.split || 0) + fx.split;
    if (fx.chain)           player.chain = (player.chain || 0) + fx.chain;
    if (fx.dot)             player.dot = (player.dot || 0) + fx.dot;
    if (fx.aura)            player.aura = (player.aura || 0) + fx.aura;
    // Boolean flags
    if (fx.pierce)                player.pierce = true;
    if (fx.slow)                  player.slow = true;
    if (fx.homing)                player.homing = true;
    if (fx.mapReveal)             player.mapReveal = true;
    if (fx.extraPickup)           player.extraPickup = true;
    if (fx.corruptionDamageScale) player.corruptionDamageScale = true;
    if (fx.corruptionTearBonus)   player.corruptionTearBonus = true;
    // Corruption
    player.corruption = Math.min(100, Math.max(0, player.corruption + def.corruption));
    // Enforce balance floors
    player.damage = Math.max(BALANCE.MIN_DAMAGE, player.damage);
    player.tears = Math.max(BALANCE.MIN_TEARS, player.tears);
    player.maxSoul = Math.max(BALANCE.MIN_SOUL_FLOOR, player.maxSoul);
  }

  /* ================================================================== */
  /*  SYNERGY RESOLUTION                                                 */
  /*  Returns array of active synergies given held item IDs.             */
  /* ================================================================== */
  function resolveActiveSynergies(heldItemIds) {
    var active = [];
    var i, syn;
    // Pair synergies
    for (i = 0; i < PAIR_SYNERGIES.length; i++) {
      syn = PAIR_SYNERGIES[i];
      if (syn.items.every(function (id) { return heldItemIds.indexOf(id) >= 0; })) {
        active.push({ type: "pair", name: syn.name, bonus: syn.bonus, desc: syn.desc });
      }
    }
    // Triple synergies
    for (i = 0; i < TRIPLE_SYNERGIES.length; i++) {
      syn = TRIPLE_SYNERGIES[i];
      if (syn.items.every(function (id) { return heldItemIds.indexOf(id) >= 0; })) {
        active.push({ type: "triple", name: syn.name, bonus: syn.bonus, desc: syn.desc });
      }
    }
    // Tag-based scaling
    var tagCounts = {};
    for (i = 0; i < heldItemIds.length; i++) {
      var def = getItemDef(heldItemIds[i]);
      if (def && def.tags) {
        for (var t = 0; t < def.tags.length; t++) {
          var tag = def.tags[t];
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    var tagKeys = Object.keys(TAG_THRESHOLDS);
    for (i = 0; i < tagKeys.length; i++) {
      var tag = tagKeys[i];
      var cfg = TAG_THRESHOLDS[tag];
      if ((tagCounts[tag] || 0) >= cfg.threshold) {
        var extra = tagCounts[tag] - cfg.threshold + 1;
        var scaledBonus = {};
        var bonusKeys = Object.keys(cfg.perExtra);
        for (var k = 0; k < bonusKeys.length; k++) {
          scaledBonus[bonusKeys[k]] = cfg.perExtra[bonusKeys[k]] * extra;
        }
        active.push({ type: "tag", name: cfg.name, bonus: scaledBonus, tag: tag, stacks: extra });
      }
    }
    return active;
  }

  /* ================================================================== */
  /*  APPLY SYNERGY BONUSES to player stats (mutates player)             */
  /* ================================================================== */
  function applySynergyBonuses(player, synergies) {
    for (var i = 0; i < synergies.length; i++) {
      var b = synergies[i].bonus;
      if (b.damage)          player.damage += b.damage;
      if (b.tears)           player.tears += b.tears;
      if (b.speed)           player.speed += b.speed;
      if (b.range)           player.range += b.range;
      if (b.shotSpeed)       player.shotSpeed += b.shotSpeed;
      if (b.maxSoul)         player.maxSoul += b.maxSoul;
      if (b.soul)            player.soul = Math.max(1, player.soul + b.soul);
      if (b.damageReduction) player.damageReduction = Math.min(BALANCE.MAX_DAMAGE_REDUCTION, player.damageReduction + b.damageReduction);
      if (b.extraLife)       player.extraLife = (player.extraLife || 0) + b.extraLife;
      if (b.siphon)          player.siphon = (player.siphon || 0) + b.siphon;
      if (b.soulOnClear)     player.soulOnClear = (player.soulOnClear || 0) + b.soulOnClear;
      if (b.split)           player.split = (player.split || 0) + b.split;
      if (b.chain)           player.chain = (player.chain || 0) + b.chain;
      if (b.dot)             player.dot = (player.dot || 0) + b.dot;
      if (b.aura)            player.aura = (player.aura || 0) + b.aura;
      if (b.pierce)                player.pierce = true;
      if (b.slow)                  player.slow = true;
      if (b.homing)                player.homing = true;
      if (b.mapReveal)             player.mapReveal = true;
      if (b.extraPickup)           player.extraPickup = true;
      if (b.corruptionDamageScale) player.corruptionDamageScale = true;
      if (b.corruptionTearBonus)   player.corruptionTearBonus = true;
    }
    // Enforce balance floors after synergies
    player.damage = Math.max(BALANCE.MIN_DAMAGE, player.damage);
    player.tears = Math.max(BALANCE.MIN_TEARS, player.tears);
    player.maxSoul = Math.max(BALANCE.MIN_SOUL_FLOOR, player.maxSoul);
  }

  /* ================================================================== */
  /*  CORRUPTION-SCALED STATS                                            */
  /*  Applied at combat resolution time for corruption-tech items.       */
  /* ================================================================== */
  function resolveCorruptionScaling(player) {
    var ratio = player.corruption / 100;
    var bonus = { damage: 0, tears: 0 };
    if (player.corruptionDamageScale) {
      // Up to +50% damage at 100 corruption
      bonus.damage = player.damage * ratio * 0.5;
    }
    if (player.corruptionTearBonus) {
      // Up to +30% tears at 100 corruption
      bonus.tears = player.tears * ratio * 0.3;
    }
    return bonus;
  }

  /* ================================================================== */
  /*  DEAD-BUILD DETECTION                                               */
  /*  Checks whether a build meets minimum viability thresholds.         */
  /* ================================================================== */
  function detectDeadBuild(player, heldItemIds) {
    var issues = [];
    var effectiveDps = player.damage * player.tears;
    // Account for chain/split as DPS multipliers (conservative: +30% per level)
    var multiHitBonus = 1;
    if (player.chain) multiHitBonus += player.chain * 0.3;
    if (player.split) multiHitBonus += player.split * 0.3;
    effectiveDps *= multiHitBonus;
    // Account for corruption scaling at conservative 40% corruption estimate
    if (player.corruptionDamageScale) effectiveDps *= 1.2;
    if (player.corruptionTearBonus) effectiveDps *= 1.12;
    if (effectiveDps < BALANCE.MIN_EFFECTIVE_DPS) {
      issues.push("DPS_TOO_LOW:" + effectiveDps.toFixed(2));
    }
    if (player.maxSoul < BALANCE.MIN_SOUL_FLOOR) {
      issues.push("MAX_SOUL_TOO_LOW:" + player.maxSoul);
    }
    // Check for no-op items: items whose effects are already superseded
    for (var i = 0; i < heldItemIds.length; i++) {
      var def = getItemDef(heldItemIds[i]);
      if (!def) continue;
      var fx = def.effects;
      var hasEffect = false;
      var keys = Object.keys(fx);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var val = fx[key];
        if (typeof val === "boolean" && val) { hasEffect = true; break; }
        if (typeof val === "number" && val !== 0) { hasEffect = true; break; }
      }
      if (!hasEffect) {
        issues.push("NO_OP_ITEM:" + heldItemIds[i]);
      }
    }
    return { viable: issues.length === 0, issues: issues };
  }

  /* ================================================================== */
  /*  ITEM POOL GENERATION — deterministic offering for altar/reliquary  */
  /* ================================================================== */
  function generateItemOffering(rng, heldItemIds, count, options) {
    count = count || 2;
    options = options || {};
    var pool = getAllPoolIds().filter(function (id) {
      return heldItemIds.indexOf(id) < 0; // exclude already held
    });
    if (pool.length === 0) return [];

    // Category-diverse offering: try different categories
    var offered = [];
    var usedCategories = {};
    var attempts = 0;
    var maxAttempts = pool.length * 3;
    while (offered.length < count && attempts < maxAttempts) {
      attempts++;
      var idx = Math.floor(rng() * pool.length);
      var id = pool[idx];
      var def = ITEM_DEFINITIONS[id];
      if (!def) continue;
      // Avoid duplicate in same offering
      if (offered.indexOf(id) >= 0) continue;
      // Prefer category diversity (soft constraint)
      if (offered.length > 0 && usedCategories[def.category] && attempts < maxAttempts / 2) continue;
      offered.push(id);
      usedCategories[def.category] = true;
    }
    // Fill remaining if diversity couldn't satisfy
    while (offered.length < count && offered.length < pool.length) {
      var idx = Math.floor(rng() * pool.length);
      var id = pool[idx];
      if (offered.indexOf(id) < 0) offered.push(id);
    }
    return offered;
  }

  /* ================================================================== */
  /*  RUN HISTORY TRACKER — tracks item offer/pick across runs           */
  /* ================================================================== */
  function createRunHistory() {
    return {
      runs: [],
      currentRun: null,
    };
  }

  function startRunTracking(history, seed) {
    history.currentRun = {
      seed: seed,
      offered: [],
      picked: [],
      synergiesActivated: [],
      finalCorruption: 0,
      outcome: null,
      buildArchetype: null,
    };
  }

  function trackOffer(history, itemIds) {
    if (history.currentRun) {
      history.currentRun.offered.push(itemIds.slice());
    }
  }

  function trackPick(history, itemId) {
    if (history.currentRun) {
      history.currentRun.picked.push(itemId);
    }
  }

  function endRunTracking(history, player, outcome) {
    if (!history.currentRun) return;
    history.currentRun.finalCorruption = player.corruption;
    history.currentRun.outcome = outcome; // "win", "dead", "consumed"
    history.currentRun.synergiesActivated = resolveActiveSynergies(history.currentRun.picked).map(function (s) { return s.name; });
    // Classify build archetype by dominant category
    var catCounts = {};
    for (var i = 0; i < history.currentRun.picked.length; i++) {
      var def = getItemDef(history.currentRun.picked[i]);
      if (def) catCounts[def.category] = (catCounts[def.category] || 0) + 1;
    }
    var maxCat = null, maxCount = 0;
    var cats = Object.keys(catCounts);
    for (var i = 0; i < cats.length; i++) {
      if (catCounts[cats[i]] > maxCount) { maxCount = catCounts[cats[i]]; maxCat = cats[i]; }
    }
    history.currentRun.buildArchetype = maxCat || "none";
    history.runs.push(history.currentRun);
    history.currentRun = null;
  }

  function summarizeRunHistory(history) {
    var total = history.runs.length;
    if (total === 0) return { total: 0 };
    var wins = 0, archetypes = {}, itemFreq = {}, synergyFreq = {};
    for (var i = 0; i < total; i++) {
      var run = history.runs[i];
      if (run.outcome === "win") wins++;
      archetypes[run.buildArchetype] = (archetypes[run.buildArchetype] || 0) + 1;
      for (var j = 0; j < run.picked.length; j++) {
        itemFreq[run.picked[j]] = (itemFreq[run.picked[j]] || 0) + 1;
      }
      for (var k = 0; k < run.synergiesActivated.length; k++) {
        synergyFreq[run.synergiesActivated[k]] = (synergyFreq[run.synergiesActivated[k]] || 0) + 1;
      }
    }
    return { total: total, winRate: wins / total, archetypes: archetypes, itemFrequency: itemFreq, synergyFrequency: synergyFreq };
  }

  /* ================================================================== */
  /*  DETERMINISTIC ITEM SIMULATION                                      */
  /*  Simulates N runs picking items from altars, checks for dead builds */
  /* ================================================================== */
  function simulateItemRuns(runCount, itemsPerRun, seed) {
    runCount = runCount || 1000;
    itemsPerRun = itemsPerRun || 6;
    seed = seed || 42;
    var rng = createDeterministicRng(seed);
    var deadBuilds = 0;
    var allBuilds = [];
    var itemPickCounts = {};
    var synergyHitCounts = {};

    for (var r = 0; r < runCount; r++) {
      var held = [];
      // Simulate picking items across altars/reliquaries
      for (var pick = 0; pick < itemsPerRun; pick++) {
        var offered = generateItemOffering(rng, held, 2);
        if (offered.length === 0) break;
        // Simulate: pick first offered (deterministic strategy)
        var chosen = offered[Math.floor(rng() * offered.length)];
        held.push(chosen);
        itemPickCounts[chosen] = (itemPickCounts[chosen] || 0) + 1;
      }
      // Compute final stats
      var player = {
        soul: 6, maxSoul: 6, corruption: 0, damage: 1, tears: 1.5,
        speed: 180, range: 400, shotSpeed: 320, damageReduction: 0,
      };
      for (var h = 0; h < held.length; h++) applyItemEffects(player, held[h]);
      var synergies = resolveActiveSynergies(held);
      applySynergyBonuses(player, synergies);
      for (var s = 0; s < synergies.length; s++) {
        synergyHitCounts[synergies[s].name] = (synergyHitCounts[synergies[s].name] || 0) + 1;
      }
      var viable = detectDeadBuild(player, held);
      if (!viable.viable) deadBuilds++;
      allBuilds.push({ items: held, viable: viable.viable, issues: viable.issues, dps: player.damage * player.tears, synergies: synergies.length });
    }

    // Item appearance frequency
    var poolSize = getAllPoolIds().length;
    var neverPicked = getAllPoolIds().filter(function (id) { return !itemPickCounts[id]; });

    return {
      runs: runCount,
      itemsPerRun: itemsPerRun,
      deadBuilds: deadBuilds,
      deadBuildRate: deadBuilds / runCount,
      neverPickedItems: neverPicked,
      itemPickCounts: itemPickCounts,
      synergyHitCounts: synergyHitCounts,
      poolSize: poolSize,
      sampleBuilds: allBuilds.slice(0, 5),
    };
  }

  /* ================================================================== */
  /*  ITEM DESCRIPTIONS — short flavor text per item                     */
  /* ================================================================== */
  var ITEM_DESCRIPTIONS = {
    // Offense
    unholy_water:     "Tears baptized in blasphemy, passing through all they touch.",
    goats_eye:        "Sees the weak points in all living things.",
    marrow_candle:    "Burns bone-fuel faster, accelerating tear production.",
    inverted_cross:   "Power at a terrible price. Damage surges but the soul withers.",
    blackened_tongue: "Words of binding that slow all they strike.",
    split_nail:       "A nail driven through the veil, splitting tears into fragments.",
    chain_censer:     "Holy smoke that leaps between victims.",
    burning_stigmata: "Wounds that never close, inflicting persistent burn.",
    siphon_tooth:     "Drains life from the dying.",
    // Defense
    the_rope:         "One last chance to hold on.",
    saints_ash:       "Remains of the faithful. Expands the vessel's capacity.",
    flayed_skin:      "Hardened through suffering. Absorbs incoming blows.",
    bone_ward:        "Ossified protection layered around the soul.",
    martyrs_veil:     "The thin shroud between life and death.",
    // Utility
    pilgrims_sandals: "Worn by those who never stopped walking.",
    widened_eye:      "Forced open to see further than intended.",
    swift_tear:       "Tears fly faster, reaching their mark sooner.",
    cartographers_bone:"A finger bone that always points the way.",
    // Economy
    tithe_box:        "The church always collects.",
    reliquary_key:    "Opens hidden compartments others cannot see.",
    blood_chalice:    "Drink deep from the wounds of others.",
    // Corruption-tech
    void_heart:       "A heart that beats in darkness. Corruption fuels destruction.",
    penitent_thorns:  "Self-inflicted restraint. Purity through sacrifice.",
    blackened_halo:   "An inverted ring of divine rejection.",
    vessels_echo:     "The vessel remembers what it was.",
    // Boss drops
    shepherds_brand:  "The Shepherd's mark burns into your tears, guiding them home.",
    saints_marrow:    "The marrow of something once holy. Raw devastating power.",
    testament:        "The final words of The Choir, etched in fading light.",
  };

  /* ================================================================== */
  /*  EFFECT DISPLAY LABELS                                              */
  /* ================================================================== */
  var EFFECT_LABELS = {
    damage: "DAMAGE", tears: "FIRE RATE", speed: "SPEED", range: "RANGE",
    shotSpeed: "SHOT SPEED", maxSoul: "MAX SOUL", soul: "SOUL",
    damageReduction: "DAMAGE REDUCTION", extraLife: "EXTRA LIFE",
    siphon: "LIFE STEAL", soulOnClear: "SOUL ON CLEAR",
    split: "SPLIT", chain: "CHAIN", dot: "BURN DMG", aura: "AURA DMG",
    pierce: "PIERCING TEARS", slow: "SLOWING TEARS", homing: "HOMING TEARS",
    mapReveal: "MAP REVEAL", extraPickup: "BONUS PICKUP",
    corruptionDamageScale: "CORRUPTION \u2192 DAMAGE",
    corruptionTearBonus: "CORRUPTION \u2192 FIRE RATE",
  };

  /* ================================================================== */
  /*  TOOLTIP FORMATTER                                                  */
  /*  Returns { name, category, desc, effects[], corruption } for UI.    */
  /* ================================================================== */
  function formatItemTooltip(itemId) {
    var def = getItemDef(itemId);
    if (!def) return null;
    var fx = def.effects;
    var effectLines = [];
    var keys = Object.keys(fx);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = fx[key];
      var label = EFFECT_LABELS[key] || key.toUpperCase();
      if (typeof val === "boolean") {
        effectLines.push(label);
      } else if (typeof val === "number") {
        var sign = val > 0 ? "+" : "";
        if (key === "damageReduction") {
          effectLines.push(sign + Math.round(val * 100) + "% " + label);
        } else {
          effectLines.push(sign + val + " " + label);
        }
      }
    }
    return {
      id: itemId,
      name: def.name,
      category: def.category,
      desc: ITEM_DESCRIPTIONS[itemId] || "",
      effects: effectLines,
      corruption: def.corruption,
      tags: def.tags || [],
    };
  }

  /* ================================================================== */
  /*  PUBLIC API                                                         */
  /* ================================================================== */
  return {
    ITEM_CATEGORIES: ITEM_CATEGORIES,
    ITEM_DEFINITIONS: ITEM_DEFINITIONS,
    BOSS_DROPS: BOSS_DROPS,
    PAIR_SYNERGIES: PAIR_SYNERGIES,
    TRIPLE_SYNERGIES: TRIPLE_SYNERGIES,
    TAG_THRESHOLDS: TAG_THRESHOLDS,
    BALANCE: BALANCE,
    getItemDef: getItemDef,
    getAllPoolIds: getAllPoolIds,
    getPoolIdsByCategory: getPoolIdsByCategory,
    applyItemEffects: applyItemEffects,
    resolveActiveSynergies: resolveActiveSynergies,
    applySynergyBonuses: applySynergyBonuses,
    resolveCorruptionScaling: resolveCorruptionScaling,
    detectDeadBuild: detectDeadBuild,
    generateItemOffering: generateItemOffering,
    createRunHistory: createRunHistory,
    startRunTracking: startRunTracking,
    trackOffer: trackOffer,
    trackPick: trackPick,
    endRunTracking: endRunTracking,
    summarizeRunHistory: summarizeRunHistory,
    simulateItemRuns: simulateItemRuns,
    formatItemTooltip: formatItemTooltip,
    ITEM_DESCRIPTIONS: ITEM_DESCRIPTIONS,
  };
});
