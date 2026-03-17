#!/usr/bin/env node
/**
 * Analytics Loop Orchestrator
 *
 * Runs all 5 phases in sequence:
 *   Phase 1: Pull analytics from Late.Dev
 *   Phase 2: Score posts by engagement density
 *   Phase 2.5: Check suppressions (flag/lift underperforming values)
 *   Phase 3: Decompose winning patterns by structural variables
 *   Phase 4: Generate exploit/explore briefs (2 days of briefs per run)
 *
 * Usage:
 *   node run-loop.js <project-slug> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
 *
 * Environment:
 *   LATE_API_KEY — Late.Dev API key
 *
 * Output:
 *   analytics-loop/data/<project>/<date>/
 *     ├── raw-analytics.json
 *     ├── scored-posts.json
 *     ├── variable-analysis.json
 *     └── briefs/
 *         ├── all-briefs.json
 *         └── <channel-slug>.json
 */

const { execSync } = require("child_process");
const path = require("path");

function run(command, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Phase: ${label}`);
  console.log("=".repeat(60));
  try {
    execSync(command, {
      stdio: "inherit",
      cwd: path.resolve(__dirname),
    });
  } catch (err) {
    console.error(`\nPhase "${label}" failed with exit code ${err.status}`);
    process.exit(err.status || 1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];

  if (!projectSlug) {
    console.error("Usage: node run-loop.js <project-slug> [--from YYYY-MM-DD] [--to YYYY-MM-DD]");
    process.exit(1);
  }

  // Pass through date args
  const dateArgs = args.slice(1).join(" ");
  const date = new Date().toISOString().split("T")[0];

  console.log(`Analytics Loop — ${projectSlug}`);
  console.log(`Date: ${date}`);
  console.log(`Args: ${dateArgs || "(defaults)"}`);

  const startTime = Date.now();

  // Phase 1: Collect
  run(
    `node pull-analytics.js ${projectSlug} ${dateArgs}`,
    "1/5 — Pull Analytics"
  );

  // Phase 2: Score
  run(
    `node score-posts.js ${projectSlug} ${date}`,
    "2/5 — Score Posts"
  );

  // Phase 2.5: Check Suppressions
  run(
    `node check-suppressions.js ${projectSlug} ${date}`,
    "3/5 — Check Suppressions"
  );

  // Phase 3: Decompose
  run(
    `node decompose-variables.js ${projectSlug} ${date}`,
    "4/5 — Decompose Variables"
  );

  // Phase 4: Generate Briefs
  run(
    `node generate-briefs.js ${projectSlug} ${date}`,
    "5/5 — Generate Briefs"
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Analytics Loop Complete — ${elapsed}s`);
  console.log("=".repeat(60));
  console.log(`\nOutput: analytics-loop/data/${projectSlug}/${date}/`);
  console.log(`Briefs: analytics-loop/data/${projectSlug}/${date}/briefs/all-briefs.json`);

  // Output signals for orchestrated mode
  console.log(`\nANALYTICS_COMPLETE`);
  console.log(`BRIEFS_GENERATED: analytics-loop/data/${projectSlug}/${date}/briefs/all-briefs.json`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
