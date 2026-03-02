(function (root, factory) {
  const api = factory(root.VesselCore);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselEngine = Object.assign(root.VesselEngine || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function (core) {
  function createEngineRuntime({ update, render, fixedDt = 1 / 120, maxSubSteps = 8 }) {
    if (!core || !core.createRuntimeLoop) throw new Error("VesselCore runtime unavailable");
    const loop = core.createRuntimeLoop({
      fixedDt,
      maxSubSteps,
      step: update,
      render,
    });
    return loop;
  }

  return { createEngineRuntime };
});
