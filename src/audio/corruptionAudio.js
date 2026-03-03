(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselAudio = Object.assign(root.VesselAudio || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  var CORRUPTION_AUDIO_PARAMS = {
    pure: { droneFreq: 0, droneGain: 0, reverbWet: 0.05, lowPassHz: 20000, distortion: 0 },
    tainted: { droneFreq: 55, droneGain: 0.03, reverbWet: 0.12, lowPassHz: 16000, distortion: 0.05 },
    corrupt: { droneFreq: 44, droneGain: 0.06, reverbWet: 0.22, lowPassHz: 10000, distortion: 0.15 },
    consumed: { droneFreq: 33, droneGain: 0.10, reverbWet: 0.35, lowPassHz: 6000, distortion: 0.3 },
  };

  var WHISPER_AUDIO_CUE = {
    type: "whisper",
    freqHz: 220,
    durationMs: 1800,
    gainRamp: [0, 0.04, 0.04, 0],
    desc: "Low breathy tone under whisper text",
  };

  var TIER_TRANSITION_AUDIO_CUES = {
    tainted: { type: "tier_shift", freqHz: 110, durationMs: 600, gain: 0.06, desc: "Hollow thud on tainted transition" },
    corrupt: { type: "tier_shift", freqHz: 80, durationMs: 900, gain: 0.09, desc: "Deep distorted impact on corrupt" },
    consumed: { type: "tier_shift", freqHz: 55, durationMs: 1400, gain: 0.12, desc: "Subsonic rumble on consumed" },
  };

  function getCorruptionAudioParams(tierId) {
    return CORRUPTION_AUDIO_PARAMS[tierId] || CORRUPTION_AUDIO_PARAMS.pure;
  }

  return {
    CORRUPTION_AUDIO_PARAMS: CORRUPTION_AUDIO_PARAMS,
    WHISPER_AUDIO_CUE: WHISPER_AUDIO_CUE,
    TIER_TRANSITION_AUDIO_CUES: TIER_TRANSITION_AUDIO_CUES,
    getCorruptionAudioParams: getCorruptionAudioParams,
  };
});
