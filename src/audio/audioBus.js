(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselAudio = Object.assign(root.VesselAudio || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  var AUDIO_BUS_PROFILES = {
    full: { master: 1, sfx: 1, ui: 1, voice: 1, music: 0.5 },
    reduced: { master: 0.75, sfx: 0.7, ui: 0.7, voice: 0.75, music: 0.35 },
    silent: { master: 0, sfx: 0, ui: 0, voice: 0, music: 0 },
  };

  function createAudioBus(audioCtx) {
    if (!audioCtx) return null;

    var buses = {
      master: audioCtx.createGain(),
      music: audioCtx.createGain(),
      sfx: audioCtx.createGain(),
      ui: audioCtx.createGain(),
      voice: audioCtx.createGain(),
    };

    buses.music.connect(buses.master);
    buses.sfx.connect(buses.master);
    buses.ui.connect(buses.master);
    buses.voice.connect(buses.master);
    buses.master.connect(audioCtx.destination);

    var profileId = "full";
    setProfile(profileId);

    function setProfile(nextProfileId) {
      if (!AUDIO_BUS_PROFILES[nextProfileId]) return profileId;
      profileId = nextProfileId;
      var p = AUDIO_BUS_PROFILES[profileId];
      buses.master.gain.value = p.master;
      buses.music.gain.value = p.music;
      buses.sfx.gain.value = p.sfx;
      buses.ui.gain.value = p.ui;
      buses.voice.gain.value = p.voice;
      return profileId;
    }

    function duckForCriticalCue(durationSec) {
      var now = audioCtx.currentTime;
      var start = buses.music.gain.value;
      buses.music.gain.cancelScheduledValues(now);
      buses.music.gain.setValueAtTime(start, now);
      buses.music.gain.linearRampToValueAtTime(start * 0.5, now + 0.03);
      buses.music.gain.linearRampToValueAtTime(start, now + (durationSec || 0.35));
    }

    function playTone(spec) {
      if (!spec) return;
      if (profileId === "silent" && !spec.critical) return;

      var busId = spec.bus || "sfx";
      var targetBus = buses[busId] || buses.sfx;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var now = audioCtx.currentTime;
      var durationSec = Math.max(0.02, spec.durationSec || 0.08);

      osc.type = spec.wave || "sine";
      osc.frequency.value = spec.freq || 440;
      gain.gain.value = Math.max(0.0001, spec.gain || 0.06);

      osc.connect(gain).connect(targetBus);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      if (spec.critical) duckForCriticalCue(durationSec + 0.1);

      osc.start(now);
      osc.stop(now + durationSec);
    }

    function setBusGain(busId, value) {
      if (!buses[busId]) return;
      buses[busId].gain.value = Math.max(0, Math.min(1, value));
    }

    return {
      setProfile: setProfile,
      playTone: playTone,
      setBusGain: setBusGain,
      getProfile: function () { return profileId; },
    };
  }

  return {
    AUDIO_BUS_PROFILES: AUDIO_BUS_PROFILES,
    createAudioBus: createAudioBus,
  };
});
