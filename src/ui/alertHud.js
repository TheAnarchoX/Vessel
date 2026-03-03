(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselUI = Object.assign(root.VesselUI || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  var ALERT_PRIORITIES = {
    info: 1,
    warning: 2,
    critical: 3,
  };

  function createAlertState() {
    return {
      queue: [],
      active: null,
    };
  }

  function pushAlert(state, text, severity, durationSec) {
    if (!state || !text) return;
    var level = severity || "info";
    state.queue.push({
      text: text,
      severity: ALERT_PRIORITIES[level] ? level : "info",
      durationSec: durationSec || 1.8,
      ttlSec: durationSec || 1.8,
    });
    state.queue.sort(function (a, b) {
      var pa = ALERT_PRIORITIES[a.severity] || 0;
      var pb = ALERT_PRIORITIES[b.severity] || 0;
      return pb - pa;
    });
  }

  function tickAlerts(state, dt) {
    if (!state) return null;

    if (!state.active && state.queue.length > 0) {
      state.active = state.queue.shift();
    }

    if (state.active) {
      state.active.ttlSec = Math.max(0, state.active.ttlSec - dt);
      if (state.active.ttlSec <= 0) state.active = null;
    }

    return state.active;
  }

  function renderAlert(ctx, state, x, y, width, textScale) {
    if (!state || !state.active) return;
    var a = state.active;
    var color = a.severity === "critical" ? "#ffcf7a" : a.severity === "warning" ? "#d8a26d" : "#b7a89f";
    var border = a.severity === "critical" ? "#7a3a1d" : a.severity === "warning" ? "#604030" : "#4a2f35";
    var alpha = Math.min(1, a.ttlSec / Math.max(0.25, a.durationSec * 0.25));
    var h = Math.round(28 * textScale);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(8,2,10,0.86)";
    ctx.fillRect(x, y, width, h);
    ctx.strokeStyle = border;
    ctx.strokeRect(x, y, width, h);
    ctx.fillStyle = color;
    ctx.font = Math.round(12 * textScale) + "px monospace";
    ctx.fillText(a.text, x + 10, y + Math.round(18 * textScale));
    ctx.restore();
  }

  return {
    ALERT_PRIORITIES: ALERT_PRIORITIES,
    createAlertState: createAlertState,
    pushAlert: pushAlert,
    tickAlerts: tickAlerts,
    renderAlert: renderAlert,
  };
});
