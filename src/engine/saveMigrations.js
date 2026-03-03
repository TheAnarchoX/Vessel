(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselEngine = Object.assign(root.VesselEngine || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const SAVE_VERSION = 1;

  const MIGRATIONS = {
    0: function migrate0to1(save) {
      const next = Object.assign({}, save);
      if (!next.meta) next.meta = {};
      next.meta.version = 1;
      if (!next.meta.createdAt) next.meta.createdAt = Date.now();
      if (!next.meta.updatedAt) next.meta.updatedAt = next.meta.createdAt;
      if (!next.progress) next.progress = { discoveredEndings: [] };
      return next;
    },
  };

  function migrateSave(save) {
    const input = Object.assign({}, save || {});
    let version = input.meta && typeof input.meta.version === "number" ? input.meta.version : 0;
    let migrated = input;

    while (version < SAVE_VERSION) {
      const migrate = MIGRATIONS[version];
      if (!migrate) throw new Error("Missing migration for save version " + version);
      migrated = migrate(migrated);
      version += 1;
    }

    migrated.meta = migrated.meta || {};
    migrated.meta.version = SAVE_VERSION;
    migrated.meta.updatedAt = Date.now();
    return migrated;
  }

  return {
    SAVE_VERSION: SAVE_VERSION,
    MIGRATIONS: MIGRATIONS,
    migrateSave: migrateSave,
  };
});
