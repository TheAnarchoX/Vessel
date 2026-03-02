(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselCore = Object.assign(root.VesselCore || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function advanceFixedStep(state, frameDt, step, fixedDt, maxSubSteps) {
    state.accumulator += frameDt;
    let steps = 0;
    while (state.accumulator >= fixedDt && steps < maxSubSteps) {
      step(fixedDt);
      state.accumulator -= fixedDt;
      state.simTime += fixedDt;
      steps++;
    }
    if (steps === maxSubSteps && state.accumulator >= fixedDt) {
      state.accumulator = 0;
      state.droppedFrames++;
    }
    state.totalSteps += steps;
    return steps;
  }

  function createRuntimeLoop({ step, render, fixedDt = 1 / 120, maxSubSteps = 8 }) {
    const state = { accumulator: 0, simTime: 0, totalSteps: 0, droppedFrames: 0 };
    let lastNow = performance.now();

    function tick(now) {
      const frameDt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      advanceFixedStep(state, frameDt, step, fixedDt, maxSubSteps);
      render(state.accumulator / fixedDt);
      requestAnimationFrame(tick);
    }

    return {
      state,
      start() {
        lastNow = performance.now();
        requestAnimationFrame(tick);
      },
    };
  }

  return { advanceFixedStep, createRuntimeLoop };
});
