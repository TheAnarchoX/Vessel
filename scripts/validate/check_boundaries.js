#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SRC_ROOT = path.join(ROOT, "src");

const LAYERS = {
  core: ["core"],
  gameplay: ["core", "gameplay", "content"],
  content: ["content", "core"],
  rendering: ["rendering", "core", "gameplay", "content"],
  audio: ["audio", "core", "content"],
  ui: ["ui", "core", "gameplay", "content"],
  engine: ["engine", "core", "gameplay", "content", "rendering", "audio", "ui"],
  presentation: ["presentation", "rendering", "audio", "ui", "core", "gameplay", "content"],
};

const NAMESPACE_TO_LAYER = {
  VesselCore: "core",
  VesselGameplay: "gameplay",
  VesselContent: "content",
  VesselRendering: "rendering",
  VesselAudio: "audio",
  VesselUI: "ui",
  VesselEngine: "engine",
  VesselPresentation: "presentation",
};

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(fullPath));
    else if (entry.isFile() && fullPath.endsWith(".js")) out.push(fullPath);
  }
  return out;
}

function layerForFile(filePath) {
  const rel = path.relative(SRC_ROOT, filePath);
  return rel.split(path.sep)[0];
}

function gatherNamespaceRefs(text) {
  const refs = [];
  for (const ns of Object.keys(NAMESPACE_TO_LAYER)) {
    if (text.includes(ns)) refs.push(ns);
  }
  return refs;
}

function main() {
  const files = listFiles(SRC_ROOT);
  const violations = [];

  for (const file of files) {
    const layer = layerForFile(file);
    const allowed = LAYERS[layer] || [layer];
    const text = fs.readFileSync(file, "utf8");

    const namespaceRefs = gatherNamespaceRefs(text);
    for (const ref of namespaceRefs) {
      const targetLayer = NAMESPACE_TO_LAYER[ref];
      if (!targetLayer) continue;
      if (targetLayer === layer) continue;
      if (!allowed.includes(targetLayer)) {
        violations.push(`${path.relative(ROOT, file)} references ${ref} (layer ${targetLayer}) from disallowed layer ${layer}`);
      }
    }

    const requireMatches = text.matchAll(/require\((['"])(\.\.\/|\.\/)([^'"]+)\1\)/g);
    for (const match of requireMatches) {
      const importPath = match[2] + match[3];
      const resolved = path.resolve(path.dirname(file), importPath);
      if (!resolved.startsWith(SRC_ROOT)) continue;
      const targetLayer = layerForFile(resolved);
      if (targetLayer && targetLayer !== layer && !allowed.includes(targetLayer)) {
        violations.push(`${path.relative(ROOT, file)} requires ${importPath} (layer ${targetLayer}) from disallowed layer ${layer}`);
      }
    }
  }

  if (violations.length) {
    console.error("phase7_boundary_status FAIL");
    for (const v of violations) console.error("  - " + v);
    process.exit(1);
  }

  console.log(`Boundary check passed across ${files.length} JS files.`);
  console.log("phase7_boundary_status PASS");
}

main();
