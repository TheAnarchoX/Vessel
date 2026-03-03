(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselCore = Object.assign(root.VesselCore || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function createEventBus() {
    const subscribers = {};
    const history = [];

    function publish(topic, payload, tick) {
      const event = { topic: topic, payload: payload, tick: tick };
      history.push(event);
      const handlers = subscribers[topic] || [];
      for (let i = 0; i < handlers.length; i++) {
        handlers[i](event);
      }
      return event;
    }

    function subscribe(topic, handler) {
      if (!subscribers[topic]) subscribers[topic] = [];
      subscribers[topic].push(handler);
      return function unsubscribe() {
        const list = subscribers[topic];
        if (!list) return;
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      };
    }

    return {
      publish: publish,
      subscribe: subscribe,
      getHistory: function () { return history.slice(); },
      clearHistory: function () { history.length = 0; },
    };
  }

  return {
    createEventBus: createEventBus,
  };
});
