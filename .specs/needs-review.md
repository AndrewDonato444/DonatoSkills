# Wiring Audit — Warnings & Suggestions

> From code review on 2026-03-16. Critical issues have been fixed. Items below are non-blocking but worth addressing.

---

## Warnings

### Social Media
- **W1**: `project-registry.md` "Skill Reference" and "Analytics Integration" sections only mention Buffer, not Late.Dev — needs updating to cover both backends
- **W2**: `projects.json` Late TikTok account is "BabyFactsUnlocked" — doesn't match "Donato's Deals" project. Likely wrong account ID or test data
- **W3**: `template_promotion.min_channels: 5` but only 2 channels exist — threshold will never trigger. Setup skill suggests lowering to 3 for small channel counts

### Image Gen
- **W4**: SKILL.md "How This Works" section (line 12) only mentions Gemini; scaffolding checklist (line 478) hardcodes `@google/genai` dependency — should be conditional on provider
- **W5**: OpenAI size mapping — platform dimension table doesn't note that OpenAI only supports 1024x1024, 1536x1024, 1024x1536, auto
- **W6**: Batch generation section (lines 505-509) only has Gemini examples, no OpenAI batch example

### Remotion Video / TTS
- **W7**: `projects.json` TTS providers list is `["grok", "gemini"]` — missing ElevenLabs despite full docs in SKILL.md. Add if ElevenLabs is a supported provider for this project
- **W8**: SKILL.md line 142 says "via Grok TTS (Kore voice)" — Kore is a Gemini voice, not Grok. Copy-paste artifact
- **W9**: `tts-best-practices.md` has no ElevenLabs section — only covers Grok and Gemini voice selection

### Content Engine
- **W10**: Calendar schema `channel_id` is Buffer-centric — no `account_id` field for Late.Dev routing
- **W11**: `visual_mode` value mismatch: engine says `user-assets`, remotion-video expects `user-provided`
- **W12**: Skill-registry.md output path for remotion-video (`videos/<project>/out/video.mp4`) differs from SKILL.md canonical path (`content-engine/calendars/<campaign>/videos/`)

### Analytics Loop
- **W13**: `projects.json` uses `late.accounts` but analytics scripts read `late.channels` — field name mismatch. Scripts fall back to `profile_id` path so it works today, but multi-channel won't
- **W14**: `nightly-review.sh` hardcodes Cursor CLI, ignores `CLI_PROVIDER` (unlike `overnight-autonomous.sh`)
- **W15**: `score-posts.js` groups by `platform` only — two TikTok channels would merge into one bucket
- **W16**: `decompose-variables.js` has TODO stubs: variable inference (line 196) and per-channel overrides (line 233)
- **W17**: `check-suppressions.js` pairwise combination check is a stub (returns empty array)

---

## Suggestions

### Architecture
- **S1**: Add `scheduler: "buffer" | "late"` per calendar item for clearer resume-from-failure logic
- **S2**: Add `service_type` to calendar `channels` array to disambiguate scheduling backend per channel
- **S3**: Add `project_id` to all orchestrated invocation templates (instruction exists in skill-registry but wasn't applied)
- **S4**: Add cross-reference from `nano-banana-best-practices.md` to `openai-image-gen.md`
- **S5**: Add shell wrapper `scripts/run-analytics-loop.sh` for consistency with build scripts
- **S6**: Content-engine should add `shared-references/analytics-schema.md` to its "read these shared references" checklist
- **S7**: Add `background` param to SKILL.md OpenAI script template (documented in reference but missing from template)
- **S8**: Performance notes section is Gemini-only — should mention OpenAI model equivalents
- **S9**: Add Late.Dev profiles endpoint note to SKILL.md (for discovering profile IDs)
- **S10**: Backfill `organization_id` in Buffer config to save an API call

---

_Review with `/roadmap add` to prioritize any of these into the build plan._
