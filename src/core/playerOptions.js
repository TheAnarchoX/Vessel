(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselCore = Object.assign(root.VesselCore || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  var DEFAULT_PLAYER_OPTIONS = {
    textScale: 1,
    flashIntensity: 1,
    shakeIntensity: 1,
    minimapMode: "tactical",
    corruptionColorblindMode: false,
    tutorialHints: true,
    subtitles: "critical",
    audioIntensity: "full",
  };

  var MINIMAP_MODES = ["minimal", "tactical", "tactical_plus"];
  var SUBTITLE_MODES = ["off", "critical", "all"];
  var AUDIO_INTENSITY_MODES = ["full", "reduced", "silent"];

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function sanitizeOptions(input) {
    var o = Object.assign({}, DEFAULT_PLAYER_OPTIONS, input || {});
    o.textScale = clamp(Number(o.textScale) || 1, 0.85, 1.55);
    o.flashIntensity = clamp(Number(o.flashIntensity) || 0, 0, 1);
    o.shakeIntensity = clamp(Number(o.shakeIntensity) || 0, 0, 1);
    if (MINIMAP_MODES.indexOf(o.minimapMode) === -1) o.minimapMode = DEFAULT_PLAYER_OPTIONS.minimapMode;
    if (SUBTITLE_MODES.indexOf(o.subtitles) === -1) o.subtitles = DEFAULT_PLAYER_OPTIONS.subtitles;
    if (AUDIO_INTENSITY_MODES.indexOf(o.audioIntensity) === -1) o.audioIntensity = DEFAULT_PLAYER_OPTIONS.audioIntensity;
    o.corruptionColorblindMode = !!o.corruptionColorblindMode;
    o.tutorialHints = !!o.tutorialHints;
    return o;
  }

  function nextOptionValue(options, key, values, dir) {
    var current = options[key];
    var index = values.indexOf(current);
    if (index === -1) index = 0;
    var nextIndex = (index + (dir || 1) + values.length) % values.length;
    options[key] = values[nextIndex];
    return options[key];
  }

  function createPlayerOptions(initial) {
    var state = sanitizeOptions(initial);

    function get() {
      return Object.assign({}, state);
    }

    function patch(nextPartial) {
      state = sanitizeOptions(Object.assign({}, state, nextPartial || {}));
      return get();
    }

    function cycleMinimap(dir) {
      return nextOptionValue(state, "minimapMode", MINIMAP_MODES, dir || 1);
    }

    function cycleAudioIntensity(dir) {
      return nextOptionValue(state, "audioIntensity", AUDIO_INTENSITY_MODES, dir || 1);
    }

    function cycleSubtitles(dir) {
      return nextOptionValue(state, "subtitles", SUBTITLE_MODES, dir || 1);
    }

    return {
      get: get,
      patch: patch,
      cycleMinimap: cycleMinimap,
      cycleAudioIntensity: cycleAudioIntensity,
      cycleSubtitles: cycleSubtitles,
    };
  }

  function getCorruptionHudColors(corruption, useColorblindMode) {
    if (useColorblindMode) {
      if (corruption >= 75) return { fill: "#f4f0e5", text: "#f4f0e5", label: "CONSUMED" };
      if (corruption >= 50) return { fill: "#f2893d", text: "#f2893d", label: "CORRUPT" };
      if (corruption >= 25) return { fill: "#f2c94c", text: "#f2c94c", label: "TAINTED" };
      return { fill: "#5ed3ff", text: "#5ed3ff", label: "PURE" };
    }
    if (corruption >= 75) return { fill: "#42153f", text: "#d9a3d2", label: "CONSUMED" };
    if (corruption >= 50) return { fill: "#9f3535", text: "#d27a7a", label: "CORRUPT" };
    if (corruption >= 25) return { fill: "#b5a54a", text: "#d7c06e", label: "TAINTED" };
    return { fill: "#8fb2c9", text: "#8fb2c9", label: "PURE" };
  }

  return {
    DEFAULT_PLAYER_OPTIONS: DEFAULT_PLAYER_OPTIONS,
    MINIMAP_MODES: MINIMAP_MODES,
    SUBTITLE_MODES: SUBTITLE_MODES,
    AUDIO_INTENSITY_MODES: AUDIO_INTENSITY_MODES,
    sanitizeOptions: sanitizeOptions,
    createPlayerOptions: createPlayerOptions,
    getCorruptionHudColors: getCorruptionHudColors,
  };
});
