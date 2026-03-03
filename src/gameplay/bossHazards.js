(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {

  /**
   * Hazard lifecycle: pending → warn → active → expired
   * All timers are deterministic (ms-based, decremented by dtMs).
   */

  const HAZARD_STATES = ["pending", "warn", "active", "expired"];

  const HAZARD_TYPES = {
    arena_confinement: {
      defaults: { shrinkPerMs: 0.03, minMargin: 64, damage: 0.3 },
    },
    damage_sigil: {
      defaults: { radius: 28, warnMs: 400, activeMs: 1800, damage: 0.5 },
    },
    collapsing_zone: {
      defaults: { warnMs: 600, collapseMs: Infinity, damage: 0.4 },
    },
  };

  function createHazard(type, config) {
    if (!HAZARD_TYPES[type]) throw new Error("Unknown hazard type: " + type);
    const def = HAZARD_TYPES[type].defaults;
    const hazard = {
      type,
      state: "pending",
      elapsedMs: 0,
    };

    if (type === "arena_confinement") {
      hazard.shrinkPerMs = config.shrinkPerMs != null ? config.shrinkPerMs : def.shrinkPerMs;
      hazard.minMargin = config.minMargin != null ? config.minMargin : def.minMargin;
      hazard.damage = config.damage != null ? config.damage : def.damage;
      hazard.currentMargin = config.initialMargin || 0;
      hazard.roomBounds = config.roomBounds || { x: 0, y: 0, w: 960, h: 540 };
    } else if (type === "damage_sigil") {
      hazard.x = config.x || 0;
      hazard.y = config.y || 0;
      hazard.radius = config.radius != null ? config.radius : def.radius;
      hazard.warnMs = config.warnMs != null ? config.warnMs : def.warnMs;
      hazard.activeMs = config.activeMs != null ? config.activeMs : def.activeMs;
      hazard.damage = config.damage != null ? config.damage : def.damage;
      hazard.remainingWarnMs = hazard.warnMs;
      hazard.remainingActiveMs = hazard.activeMs;
    } else if (type === "collapsing_zone") {
      hazard.rect = config.rect || { x: 0, y: 0, w: 80, h: 80 };
      hazard.warnMs = config.warnMs != null ? config.warnMs : def.warnMs;
      hazard.collapseMs = config.collapseMs != null ? config.collapseMs : def.collapseMs;
      hazard.damage = config.damage != null ? config.damage : def.damage;
      hazard.remainingWarnMs = hazard.warnMs;
      hazard.remainingCollapseMs = hazard.collapseMs;
    }

    return hazard;
  }

  function activateHazard(hazard) {
    if (hazard.state !== "pending") return [];
    hazard.state = "warn";
    return [{ type: "hazard_warn", hazardType: hazard.type }];
  }

  function updateHazard(hazard, dtMs) {
    var events = [];
    if (hazard.state === "expired" || hazard.state === "pending") return events;

    hazard.elapsedMs += dtMs;

    if (hazard.type === "arena_confinement") {
      if (hazard.state === "warn") {
        hazard.state = "active";
        events.push({ type: "hazard_active", hazardType: hazard.type });
      }
      if (hazard.state === "active") {
        hazard.currentMargin = Math.min(
          hazard.minMargin,
          hazard.currentMargin + hazard.shrinkPerMs * dtMs
        );
      }
      return events;
    }

    if (hazard.type === "damage_sigil") {
      if (hazard.state === "warn") {
        hazard.remainingWarnMs -= dtMs;
        if (hazard.remainingWarnMs <= 0) {
          hazard.state = "active";
          events.push({ type: "hazard_active", hazardType: hazard.type, x: hazard.x, y: hazard.y });
        }
      } else if (hazard.state === "active") {
        hazard.remainingActiveMs -= dtMs;
        if (hazard.remainingActiveMs <= 0) {
          hazard.state = "expired";
          events.push({ type: "hazard_expire", hazardType: hazard.type, x: hazard.x, y: hazard.y });
        }
      }
      return events;
    }

    if (hazard.type === "collapsing_zone") {
      if (hazard.state === "warn") {
        hazard.remainingWarnMs -= dtMs;
        if (hazard.remainingWarnMs <= 0) {
          hazard.state = "active";
          events.push({ type: "hazard_active", hazardType: hazard.type, rect: hazard.rect });
        }
      } else if (hazard.state === "active" && hazard.collapseMs !== Infinity) {
        hazard.remainingCollapseMs -= dtMs;
        if (hazard.remainingCollapseMs <= 0) {
          hazard.state = "expired";
          events.push({ type: "hazard_expire", hazardType: hazard.type, rect: hazard.rect });
        }
      }
      return events;
    }

    return events;
  }

  function checkHazardCollision(hazard, entity) {
    if (hazard.state !== "active") return { hit: false, damage: 0 };

    if (hazard.type === "arena_confinement") {
      var rb = hazard.roomBounds;
      var m = hazard.currentMargin;
      var left = rb.x + m;
      var right = rb.x + rb.w - m;
      var top = rb.y + m;
      var bottom = rb.y + rb.h - m;
      var clamped = false;
      if (entity.x < left) { entity.x = left; clamped = true; }
      if (entity.x > right) { entity.x = right; clamped = true; }
      if (entity.y < top) { entity.y = top; clamped = true; }
      if (entity.y > bottom) { entity.y = bottom; clamped = true; }
      return { hit: clamped, damage: clamped ? hazard.damage : 0, bounds: { left: left, right: right, top: top, bottom: bottom } };
    }

    if (hazard.type === "damage_sigil") {
      var dist = Math.hypot(entity.x - hazard.x, entity.y - hazard.y);
      var hit = dist < hazard.radius + (entity.r || 8);
      return { hit: hit, damage: hit ? hazard.damage : 0 };
    }

    if (hazard.type === "collapsing_zone") {
      var r = hazard.rect;
      var inside = entity.x >= r.x && entity.x <= r.x + r.w &&
                   entity.y >= r.y && entity.y <= r.y + r.h;
      return { hit: inside, damage: inside ? hazard.damage : 0 };
    }

    return { hit: false, damage: 0 };
  }

  function getHazardDebugInfo(hazard) {
    var info = hazard.type.toUpperCase() + " " + hazard.state + " elapsed=" + hazard.elapsedMs.toFixed(0) + "ms";
    if (hazard.type === "arena_confinement") info += " margin=" + hazard.currentMargin.toFixed(1);
    if (hazard.type === "damage_sigil") info += " @(" + hazard.x.toFixed(0) + "," + hazard.y.toFixed(0) + ")";
    if (hazard.type === "collapsing_zone") info += " rect=(" + hazard.rect.x + "," + hazard.rect.y + "," + hazard.rect.w + "," + hazard.rect.h + ")";
    return info;
  }

  return {
    HAZARD_STATES,
    HAZARD_TYPES,
    createHazard,
    activateHazard,
    updateHazard,
    checkHazardCollision,
    getHazardDebugInfo,
  };
});
