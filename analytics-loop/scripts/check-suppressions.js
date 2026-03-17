#!/usr/bin/env node
/**
 * Phase 2.5: Check Suppressions
 *
 * Runs between scoring and decomposition. Reads the previous suppression list,
 * validates whether any suppressions should be lifted, adds new suppressions
 * based on fresh data, and writes the updated list for the brief generator.
 *
 * Suppression rules:
 *   - A variable value is suppressed when it scores below 50% of the global
 *     average across 3+ scoring cycles with 10+ data points.
 *   - A suppressed value is lifted when a retest scores above 75% of the
 *     global average.
 *   - Pairwise combinations can also be suppressed independently.
 *
 * Usage:
 *   node check-suppressions.js <project-slug> [<date>]
 *
 * Output:
 *   analytics-loop/data/<project>/suppression-list.json
 */

const fs = require("fs");
const path = require("path");

const SUPPRESSION_THRESHOLD = 0.5; // Below 50% of global avg
const LIFT_THRESHOLD = 0.75; // Above 75% of global avg to unsuppress
const MIN_CYCLES = 3; // Minimum scoring cycles to suppress
const MIN_SAMPLE = 10; // Minimum data points to suppress
const RECHECK_DAYS = 14; // Days between explore retests of suppressed values

/**
 * Load existing suppression list or initialize empty one.
 */
function loadSuppressionList(projectDataDir) {
  const listPath = path.join(projectDataDir, "suppression-list.json");
  if (fs.existsSync(listPath)) {
    return JSON.parse(fs.readFileSync(listPath, "utf-8"));
  }
  return {
    suppressed_values: [],
    suppressed_combinations: [],
    lifted: [],
    last_updated: null,
  };
}

/**
 * Count how many scoring cycles a variable value has been observed in,
 * and compute its average score across all cycles.
 */
function getValueHistory(projectDataDir, variable, value) {
  if (!fs.existsSync(projectDataDir)) return { cycles: 0, avg: 0, total: 0 };

  const entries = fs.readdirSync(projectDataDir, { withFileTypes: true });
  let totalScore = 0;
  let totalCount = 0;
  let cyclesPresent = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const analysisPath = path.join(
      projectDataDir,
      entry.name,
      "variable-analysis.json"
    );
    if (!fs.existsSync(analysisPath)) continue;

    try {
      const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
      const vi = (analysis.variable_impact || []).find(
        (v) => v.variable === variable
      );
      if (!vi || !vi.values[value]) continue;

      cyclesPresent++;
      totalScore += vi.values[value].avg_score * vi.values[value].count;
      totalCount += vi.values[value].count;
    } catch {
      // Skip malformed files
    }
  }

  return {
    cycles: cyclesPresent,
    avg: totalCount > 0 ? Math.round((totalScore / totalCount) * 100) / 100 : 0,
    total: totalCount,
  };
}

/**
 * Get the global average engagement density from the current scoring run.
 */
function getGlobalAvg(dataDir) {
  const scoredPath = path.join(dataDir, "scored-posts.json");
  if (!fs.existsSync(scoredPath)) return 0;

  const scored = JSON.parse(fs.readFileSync(scoredPath, "utf-8"));
  return scored.summary?.globalAvgEngagementDensity || 0;
}

/**
 * Check pairwise combinations for suppression.
 */
function checkPairwiseSuppression(dataDir, globalAvg) {
  const scoredPath = path.join(dataDir, "scored-posts.json");
  if (!fs.existsSync(scoredPath)) return [];

  // This is a stub for pairwise analysis — full implementation would
  // cross-reference calendar variables on scored posts and compute
  // avg engagement density for each pair of variable values.
  // For now, return empty — will be populated as data accumulates.
  return [];
}

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];
  const date = args[1] || new Date().toISOString().split("T")[0];

  if (!projectSlug) {
    console.error(
      "Usage: node check-suppressions.js <project-slug> [<date>]"
    );
    process.exit(1);
  }

  const projectDataDir = path.resolve(__dirname, `../data/${projectSlug}`);
  const dataDir = path.join(projectDataDir, date);
  const globalAvg = getGlobalAvg(dataDir);

  console.log(`Checking suppressions for ${projectSlug}`);
  console.log(`Global avg engagement density: ${globalAvg}`);

  const list = loadSuppressionList(projectDataDir);
  const previousCount = list.suppressed_values.length;

  // --- Phase A: Check if any existing suppressions should be lifted ---
  const stillSuppressed = [];
  for (const entry of list.suppressed_values) {
    const history = getValueHistory(
      projectDataDir,
      entry.variable,
      entry.value
    );

    // Check if a recent retest scored above the lift threshold
    const currentAnalysisPath = path.join(dataDir, "variable-analysis.json");
    let currentScore = null;
    if (fs.existsSync(currentAnalysisPath)) {
      try {
        const analysis = JSON.parse(
          fs.readFileSync(currentAnalysisPath, "utf-8")
        );
        const vi = (analysis.variable_impact || []).find(
          (v) => v.variable === entry.variable
        );
        if (vi && vi.values[entry.value]) {
          currentScore = vi.values[entry.value].avg_score;
        }
      } catch {
        // Skip
      }
    }

    if (currentScore !== null && globalAvg > 0) {
      const ratio = currentScore / globalAvg;
      if (ratio >= LIFT_THRESHOLD) {
        console.log(
          `  LIFTED: ${entry.variable}="${entry.value}" — now scoring ${Math.round(ratio * 100)}% of avg (was ${Math.round(entry.ratio * 100)}%)`
        );
        list.lifted.push({
          ...entry,
          lifted_date: date,
          lifted_score: currentScore,
          lifted_ratio: Math.round(ratio * 100) / 100,
        });
        continue;
      }
    }

    stillSuppressed.push(entry);
  }
  list.suppressed_values = stillSuppressed;

  // --- Phase B: Check for new suppressions ---
  const currentAnalysisPath = path.join(dataDir, "variable-analysis.json");
  if (fs.existsSync(currentAnalysisPath) && globalAvg > 0) {
    const analysis = JSON.parse(
      fs.readFileSync(currentAnalysisPath, "utf-8")
    );

    for (const vi of analysis.variable_impact || []) {
      for (const [value, data] of Object.entries(vi.values || {})) {
        const ratio = data.avg_score / globalAvg;

        // Already suppressed?
        const alreadySuppressed = list.suppressed_values.some(
          (s) => s.variable === vi.variable && s.value === value
        );
        if (alreadySuppressed) continue;

        // Check if it meets suppression criteria
        if (ratio >= SUPPRESSION_THRESHOLD) continue;

        const history = getValueHistory(projectDataDir, vi.variable, value);
        if (history.cycles < MIN_CYCLES) continue;
        if (history.total < MIN_SAMPLE) continue;

        // Check that the low score is consistent across cycles, not just this one
        const historyRatio = globalAvg > 0 ? history.avg / globalAvg : 0;
        if (historyRatio >= SUPPRESSION_THRESHOLD) continue;

        console.log(
          `  SUPPRESSED: ${vi.variable}="${value}" — ${Math.round(historyRatio * 100)}% of avg across ${history.cycles} cycles (${history.total} data points)`
        );

        list.suppressed_values.push({
          variable: vi.variable,
          value,
          avg_score: history.avg,
          global_avg: globalAvg,
          ratio: Math.round(historyRatio * 100) / 100,
          sample_count: history.total,
          cycles_observed: history.cycles,
          suppressed_since: date,
          reason: `Consistently ${Math.round((1 - historyRatio) * 100)}% below average across ${history.cycles} cycles with ${history.total} data points`,
        });
      }
    }
  }

  // --- Phase C: Check pairwise combinations ---
  const newCombos = checkPairwiseSuppression(dataDir, globalAvg);
  for (const combo of newCombos) {
    const alreadySuppressed = list.suppressed_combinations.some(
      (s) =>
        JSON.stringify(s.combination) === JSON.stringify(combo.combination)
    );
    if (!alreadySuppressed) {
      list.suppressed_combinations.push(combo);
    }
  }

  list.last_updated = date;
  list.recheck_cadence_days = RECHECK_DAYS;

  // Write updated suppression list
  const outPath = path.join(projectDataDir, "suppression-list.json");
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2));

  // Summary
  const newSuppressions = list.suppressed_values.length - previousCount;
  const liftedCount =
    list.lifted.filter((l) => l.lifted_date === date).length;

  console.log(`\n--- Suppression Summary ---`);
  console.log(`Active suppressions: ${list.suppressed_values.length}`);
  console.log(`Suppressed combinations: ${list.suppressed_combinations.length}`);
  console.log(
    `This cycle: ${newSuppressions >= 0 ? "+" : ""}${newSuppressions} new, ${liftedCount} lifted`
  );
  console.log(`Wrote suppression list to ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
