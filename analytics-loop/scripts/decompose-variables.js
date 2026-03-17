#!/usr/bin/env node
/**
 * Phase 3: Decompose Variables
 *
 * Reads scored posts and correlates performance with structural variables
 * from the content-engine's calendar JSON. Identifies the winning template
 * and per-channel overrides.
 *
 * Usage:
 *   node decompose-variables.js <project-slug> [<date>]
 *
 * Output:
 *   analytics-loop/data/<project>/<date>/variable-analysis.json
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("fs").promises ? require("fs/promises") : fs;

const VARIABLES = [
  "hook_type",
  "video_length",
  "voice_pace",
  "text_overlay",
  "background_type",
  "music_energy",
  "cta_style",
];

/**
 * Search all calendar.json files for a post matching the given Late.Dev or Buffer post ID.
 * Returns the calendar item's variables object if found.
 */
function findCalendarVariables(postId, latePostId, calendarsDir) {
  if (!fs.existsSync(calendarsDir)) return null;

  const campaigns = fs.readdirSync(calendarsDir, { withFileTypes: true });
  for (const campaign of campaigns) {
    if (!campaign.isDirectory()) continue;
    const calPath = path.join(calendarsDir, campaign.name, "calendar.json");
    if (!fs.existsSync(calPath)) continue;

    try {
      const cal = JSON.parse(fs.readFileSync(calPath, "utf-8"));
      for (const item of cal.items || []) {
        if (
          (latePostId && item.late_post_id === latePostId) ||
          (postId && item.buffer_post_id === postId)
        ) {
          return item.variables || null;
        }
      }
    } catch {
      // Skip malformed calendar files
    }
  }

  return null;
}

/**
 * Compute per-variable-value average engagement density.
 */
function computeVariableImpact(postsWithVars) {
  const impact = [];

  for (const variable of VARIABLES) {
    const buckets = {};

    for (const { score, variables } of postsWithVars) {
      const value = variables[variable];
      if (!value || value === "unknown") continue;

      if (!buckets[value]) {
        buckets[value] = { scores: [], count: 0 };
      }
      buckets[value].scores.push(score.engagementDensity);
      buckets[value].count++;
    }

    const values = {};
    let bestValue = null;
    let bestAvg = -1;

    for (const [value, data] of Object.entries(buckets)) {
      const avg =
        Math.round(
          (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100
        ) / 100;
      values[value] = { avg_score: avg, count: data.count };
      if (avg > bestAvg) {
        bestAvg = avg;
        bestValue = value;
      }
    }

    const globalAvg =
      postsWithVars.length > 0
        ? postsWithVars.reduce((sum, p) => sum + p.score.engagementDensity, 0) /
          postsWithVars.length
        : 0;

    const lift =
      globalAvg > 0
        ? Math.round(((bestAvg - globalAvg) / globalAvg) * 100) + "%"
        : "N/A";

    impact.push({
      variable,
      values,
      most_impactful_value: bestValue,
      lift_over_average: lift,
    });
  }

  return impact;
}

/**
 * Determine the winning template from variable impact data.
 */
function computeWinningTemplate(variableImpact, postsWithVars) {
  const template = {};
  for (const vi of variableImpact) {
    template[vi.variable] = vi.most_impactful_value;
  }

  // Count how many posts match the winning template exactly
  const matchingPosts = postsWithVars.filter((p) =>
    VARIABLES.every((v) => p.variables[v] === template[v])
  );

  const avgDensity =
    matchingPosts.length > 0
      ? Math.round(
          (matchingPosts.reduce((sum, p) => sum + p.score.engagementDensity, 0) /
            matchingPosts.length) *
            100
        ) / 100
      : null;

  let confidence = "low";
  if (matchingPosts.length >= 10) confidence = "high";
  else if (matchingPosts.length >= 5) confidence = "medium";

  return {
    ...template,
    avg_engagement_density: avgDensity,
    confidence,
    sample_count: matchingPosts.length,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];
  const date = args[1] || new Date().toISOString().split("T")[0];

  if (!projectSlug) {
    console.error("Usage: node decompose-variables.js <project-slug> [<date>]");
    process.exit(1);
  }

  // Load scored posts
  const dataDir = path.resolve(__dirname, `../data/${projectSlug}/${date}`);
  const scoredPath = path.join(dataDir, "scored-posts.json");

  if (!fs.existsSync(scoredPath)) {
    console.error(`No scored posts found at ${scoredPath}`);
    console.error("Run score-posts.js first.");
    process.exit(1);
  }

  const scored = JSON.parse(fs.readFileSync(scoredPath, "utf-8"));
  const includedPosts = scored.posts.filter((p) => !p.excluded);

  console.log(`Decomposing ${includedPosts.length} scored posts by structural variables`);

  // Look up variables from calendar entries
  const calendarsDir = path.resolve(__dirname, "../../content-engine/calendars");
  const postsWithVars = [];
  let postsWithoutVars = 0;

  for (const post of includedPosts) {
    const vars = findCalendarVariables(
      post.postId,
      post.latePostId,
      calendarsDir
    );

    if (vars) {
      postsWithVars.push({ ...post, variables: vars });
    } else {
      postsWithoutVars++;
      // TODO: Attempt to infer variables from post content
      // For now, skip posts without variable tags
    }
  }

  console.log(`  Posts with variable tags: ${postsWithVars.length}`);
  console.log(`  Posts without tags (skipped): ${postsWithoutVars}`);

  if (postsWithVars.length === 0) {
    console.warn(
      "\nNo posts have variable tags. The analytics loop needs tagged content to decompose."
    );
    console.warn(
      "Ensure the content-engine tags calendar items with variables (see shared-references/analytics-schema.md)."
    );

    // Write empty analysis
    const output = {
      date,
      sample_size: 0,
      excluded_posts: scored.summary.excludedPosts,
      global_avg_engagement_density: scored.summary.globalAvgEngagementDensity,
      winning_template: null,
      variable_impact: [],
      per_channel_overrides: [],
      warning: "No posts with variable tags found. Tag content via content-engine.",
    };
    fs.writeFileSync(
      path.join(dataDir, "variable-analysis.json"),
      JSON.stringify(output, null, 2)
    );
    return;
  }

  // Compute variable impact
  const variableImpact = computeVariableImpact(postsWithVars);
  const winningTemplate = computeWinningTemplate(variableImpact, postsWithVars);

  // TODO: Detect per-channel overrides (requires 3+ cycles of data)
  const perChannelOverrides = [];

  const output = {
    date,
    sample_size: postsWithVars.length,
    excluded_posts: scored.summary.excludedPosts,
    global_avg_engagement_density: scored.summary.globalAvgEngagementDensity,
    winning_template: winningTemplate,
    variable_impact: variableImpact,
    per_channel_overrides: perChannelOverrides,
  };

  const outPath = path.join(dataDir, "variable-analysis.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n--- Variable Analysis ---`);
  console.log(`Winning template: ${JSON.stringify(winningTemplate, null, 2)}`);
  console.log(`\nWrote analysis to ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
