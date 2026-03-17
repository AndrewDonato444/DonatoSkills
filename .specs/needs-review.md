# Wiring Audit — Remaining Items

> From code review on 2026-03-16. Critical issues and warnings have been fixed. Items below are suggestions for future improvement.

---

## Suggestions

### Architecture
- **S1**: Add `project_id` to all orchestrated invocation templates (instruction exists in skill-registry but wasn't applied to individual templates)
- **S2**: Add cross-reference from `nano-banana-best-practices.md` to `openai-image-gen.md`
- **S3**: Add shell wrapper `scripts/run-analytics-loop.sh` for consistency with build scripts
- **S4**: Content-engine should add `shared-references/analytics-schema.md` to its "read these shared references" checklist
- **S5**: Add `background` param to SKILL.md OpenAI script template (documented in reference but missing from template)
- **S6**: Add Late.Dev profiles endpoint note to social-media SKILL.md (for discovering profile IDs)
- **S7**: Backfill `organization_id` in Buffer config to save an API call per session

### Analytics Loop (Known TODOs)
- **S8**: `decompose-variables.js` line 196 — variable inference from post content (spec promises this)
- **S9**: `decompose-variables.js` line 233 — per-channel overrides (requires 3+ cycles of data)
- **S10**: `check-suppressions.js` lines 105-113 — pairwise combination tracking (stub, returns empty array)

---

_Review with `/roadmap add` to prioritize any of these into the build plan._
