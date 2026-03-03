(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselCore = Object.assign(root.VesselCore || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  var DEFAULT_ACTION_BINDINGS = {
    move_up: "KeyW",
    move_down: "KeyS",
    move_left: "KeyA",
    move_right: "KeyD",
    shoot_up: "ArrowUp",
    shoot_down: "ArrowDown",
    shoot_left: "ArrowLeft",
    shoot_right: "ArrowRight",
    interact: "KeyE",
    toggle_map: "Tab",
    restart: "KeyR",
    toggle_debug: "F2",
    prev_minimap_mode: "BracketLeft",
    next_minimap_mode: "BracketRight",
  };

  var REBINDABLE_ACTIONS = [
    "move_up",
    "move_down",
    "move_left",
    "move_right",
    "shoot_up",
    "shoot_down",
    "shoot_left",
    "shoot_right",
    "interact",
    "toggle_map",
    "restart",
  ];

  function cloneBindings(input) {
    return Object.assign({}, DEFAULT_ACTION_BINDINGS, input || {});
  }

  function createInputBindings(initial) {
    var bindings = cloneBindings(initial);

    function getBinding(actionId) {
      return bindings[actionId] || null;
    }

    function getBindings() {
      return cloneBindings(bindings);
    }

    function actionForCode(code) {
      for (var actionId in bindings) {
        if (bindings[actionId] === code) return actionId;
      }
      return null;
    }

    function isActionDown(keys, actionId) {
      var code = getBinding(actionId);
      return !!(code && keys.has(code));
    }

    function wasActionPressed(pressed, actionId) {
      var code = getBinding(actionId);
      return !!(code && pressed.has(code));
    }

    function rebind(actionId, code) {
      if (!actionId || !code || !bindings[actionId]) return false;
      for (var id in bindings) {
        if (id !== actionId && bindings[id] === code) {
          bindings[id] = bindings[actionId];
        }
      }
      bindings[actionId] = code;
      return true;
    }

    function restoreDefaults() {
      bindings = cloneBindings();
      return getBindings();
    }

    return {
      getBinding: getBinding,
      getBindings: getBindings,
      actionForCode: actionForCode,
      isActionDown: isActionDown,
      wasActionPressed: wasActionPressed,
      rebind: rebind,
      restoreDefaults: restoreDefaults,
    };
  }

  return {
    DEFAULT_ACTION_BINDINGS: DEFAULT_ACTION_BINDINGS,
    REBINDABLE_ACTIONS: REBINDABLE_ACTIONS,
    createInputBindings: createInputBindings,
  };
});
