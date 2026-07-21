#!/usr/bin/env node
// Validates feature_list.json against the process rules in docs/specs.md:
// - at most one feature is in_progress or in_review at a time
// - a feature that's spec_ready or beyond has all three spec documents on disk

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ACTIVE_STATUSES = new Set(["in_progress", "in_review"]);
const SPEC_REQUIRED_STATUSES = new Set([
  "spec_ready",
  "in_progress",
  "in_review",
  "done",
]);
const SPEC_FILES = ["requirements.md", "design.md", "tasks.md"];

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

const raw = readFileSync(join(ROOT, "feature_list.json"), "utf8");
const { features } = JSON.parse(raw);

const active = features.filter((f) => ACTIVE_STATUSES.has(f.status));
if (active.length > 1) {
  fail(
    `${active.length} features are in_progress/in_review at once (${active
      .map((f) => f.id)
      .join(", ")}) — docs/specs.md allows only one.`
  );
} else if (active.length === 1) {
  console.log(`✓ single active feature: ${active[0].id} (${active[0].status})`);
}

let missingSpecs = 0;
for (const feature of features) {
  if (!SPEC_REQUIRED_STATUSES.has(feature.status)) continue;
  const dir = join(ROOT, feature.spec_dir ?? `specs/${feature.id}/`);
  for (const file of SPEC_FILES) {
    if (!existsSync(join(dir, file))) {
      fail(`${feature.id}: missing ${join(feature.spec_dir ?? `specs/${feature.id}/`, file)}`);
      missingSpecs++;
    }
  }
}
if (missingSpecs === 0 && features.length > 0) {
  console.log("✓ all spec_ready+ features have requirements/design/tasks on disk");
}

if (process.exitCode) {
  console.error("\ncheck-sdd-state failed — see docs/specs.md");
} else {
  console.log("✓ feature_list.json is consistent with docs/specs.md");
}
