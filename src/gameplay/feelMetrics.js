(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselGameplay = Object.assign(root.VesselGameplay || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const DEFAULT_FEEL_TARGETS = {
    maxP95InputLatencyMs: 130,
    maxCadenceErrorRatio: 0.2,
    minSamples: 8,
  };

  function percentile(values, p) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
    return sorted[idx];
  }

  function createFeelMetrics() {
    return {
      shotLatenciesMs: [],
      shotCadencesMs: [],
      hitstopMs: [],
      lastShotAtMs: null,
    };
  }

  function recordShot(metrics, nowMs, intentAtMs, expectedCadenceMs) {
    if (typeof intentAtMs === "number") {
      metrics.shotLatenciesMs.push(Math.max(0, nowMs - intentAtMs));
    }
    if (typeof metrics.lastShotAtMs === "number") {
      metrics.shotCadencesMs.push(Math.max(0, nowMs - metrics.lastShotAtMs - expectedCadenceMs));
    }
    metrics.lastShotAtMs = nowMs;
  }

  function recordHitstop(metrics, ms) {
    metrics.hitstopMs.push(ms);
  }

  function summarizeFeel(metrics) {
    const latencyAvg = metrics.shotLatenciesMs.length
      ? metrics.shotLatenciesMs.reduce((a, b) => a + b, 0) / metrics.shotLatenciesMs.length
      : 0;
    const p95Latency = percentile(metrics.shotLatenciesMs, 0.95);
    const cadenceErrorAvg = metrics.shotCadencesMs.length
      ? metrics.shotCadencesMs.reduce((a, b) => a + Math.abs(b), 0) / metrics.shotCadencesMs.length
      : 0;
    return {
      samples: metrics.shotLatenciesMs.length,
      latencyAvgMs: latencyAvg,
      latencyP95Ms: p95Latency,
      cadenceErrorAvgMs: cadenceErrorAvg,
      hitstopAvgMs: metrics.hitstopMs.length
        ? metrics.hitstopMs.reduce((a, b) => a + b, 0) / metrics.hitstopMs.length
        : 0,
    };
  }

  function evaluateFeel(summary, targets = DEFAULT_FEEL_TARGETS) {
    const failures = [];
    if (summary.samples >= targets.minSamples) {
      if (summary.latencyP95Ms > targets.maxP95InputLatencyMs) {
        failures.push(`input-latency-p95>${targets.maxP95InputLatencyMs}ms`);
      }
      const cadenceErrorRatio = summary.cadenceErrorAvgMs / (1000 / 1.5);
      if (cadenceErrorRatio > targets.maxCadenceErrorRatio) {
        failures.push(`cadence-error-ratio>${targets.maxCadenceErrorRatio.toFixed(2)}`);
      }
    }
    return failures;
  }

  return {
    DEFAULT_FEEL_TARGETS,
    createFeelMetrics,
    recordShot,
    recordHitstop,
    summarizeFeel,
    evaluateFeel,
  };
});
