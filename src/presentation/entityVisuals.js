(function (root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselPresentation = Object.assign(root.VesselPresentation || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function (root) {
  let renderingApi = root.VesselRendering || null;
  if (!renderingApi && typeof require === "function") {
    try {
      renderingApi = require("../rendering/entityVisuals.js");
    } catch (_) {
      renderingApi = null;
    }
  }
  if (!renderingApi) {
    throw new Error("VesselRendering module unavailable; load src/rendering/entityVisuals.js first");
  }
  return renderingApi;
});
