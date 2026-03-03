(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselEngine = Object.assign(root.VesselEngine || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const VALID_TRANSITIONS = {
    boot: ["title"],
    title: ["run_starting"],
    run_starting: ["in_run", "title"],
    in_run: ["paused", "floor_transition", "run_ending"],
    paused: ["in_run", "title"],
    floor_transition: ["in_run", "run_ending"],
    run_ending: ["title"],
  };

  function createGameStateMachine(initialState) {
    let current = initialState || "boot";
    const history = [current];

    function canTransition(next) {
      const allowed = VALID_TRANSITIONS[current] || [];
      return allowed.indexOf(next) >= 0;
    }

    function transition(next) {
      if (!canTransition(next)) {
        throw new Error("Invalid game-state transition: " + current + " -> " + next);
      }
      current = next;
      history.push(current);
      return current;
    }

    return {
      getState: function () { return current; },
      canTransition: canTransition,
      transition: transition,
      getHistory: function () { return history.slice(); },
    };
  }

  return {
    VALID_TRANSITIONS: VALID_TRANSITIONS,
    createGameStateMachine: createGameStateMachine,
  };
});
