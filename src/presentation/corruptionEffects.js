(function (root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselPresentation = Object.assign(root.VesselPresentation || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function (root) {
  let uiApi = root.VesselUI || null;
  let audioApi = root.VesselAudio || null;

  if ((!uiApi || !audioApi) && typeof require === "function") {
    try {
      uiApi = uiApi || require("../ui/corruptionHud.js");
      audioApi = audioApi || require("../audio/corruptionAudio.js");
    } catch (_) {
      // noop: explicit error below
    }
  }

  if (!uiApi || !audioApi) {
    throw new Error("VesselUI/VesselAudio module unavailable; load src/ui/corruptionHud.js and src/audio/corruptionAudio.js first");
  }

  return Object.assign({}, uiApi, audioApi);
});
