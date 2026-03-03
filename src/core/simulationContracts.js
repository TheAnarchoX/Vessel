(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselCore = Object.assign(root.VesselCore || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function assertFiniteNumber(name, value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(name + " must be a finite number");
    }
  }

  function createSimulationContract(config) {
    const fixedDt = config.fixedDt;
    const maxSubSteps = config.maxSubSteps;

    assertFiniteNumber("fixedDt", fixedDt);
    assertFiniteNumber("maxSubSteps", maxSubSteps);

    if (fixedDt <= 0) throw new Error("fixedDt must be > 0");
    if (maxSubSteps < 1) throw new Error("maxSubSteps must be >= 1");

    function validateFrameInput(frameDt) {
      assertFiniteNumber("frameDt", frameDt);
      if (frameDt < 0) throw new Error("frameDt must be >= 0");
    }

    function validateInterpolation(alpha) {
      assertFiniteNumber("alpha", alpha);
      if (alpha < 0 || alpha > 1) {
        throw new Error("render interpolation alpha must be in [0, 1]");
      }
    }

    return {
      fixedDt: fixedDt,
      maxSubSteps: maxSubSteps,
      validateFrameInput: validateFrameInput,
      validateInterpolation: validateInterpolation,
    };
  }

  return {
    createSimulationContract: createSimulationContract,
  };
});
