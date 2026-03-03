#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const Ajv = require("ajv");

const ROOT = path.resolve(__dirname, "../..");
const CONTENT_DIR = path.join(ROOT, "content");

const jobs = [
  { data: "items.json", schema: "schemas/items.schema.json" },
  { data: "enemies.json", schema: "schemas/enemies.schema.json" },
  { data: "rooms.json", schema: "schemas/rooms.schema.json" },
];

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, relPath), "utf8"));
}

function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  let failures = 0;

  for (const job of jobs) {
    const data = readJson(job.data);
    const schema = readJson(job.schema);
    const validate = ajv.compile(schema);
    const ok = validate(data);
    if (!ok) {
      failures += 1;
      console.error(`Schema validation failed: content/${job.data}`);
      for (const err of validate.errors || []) {
        console.error(`  - ${err.instancePath || "/"} ${err.message}`);
      }
    }
  }

  const items = readJson("items.json");
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) {
      failures += 1;
      console.error(`Duplicate item id: ${item.id}`);
    }
    ids.add(item.id);
  }

  if (failures > 0) {
    console.error("phase7_schema_status FAIL");
    process.exit(1);
  }

  console.log(`Schema validation passed for ${jobs.length} content files.`);
  console.log(`Item catalog entries: ${items.length}`);
  console.log("phase7_schema_status PASS");
}

main();
