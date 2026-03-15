# Content Calendar JSON Schema

Calendars are stored at `content-engine/calendars/<campaign-slug>/calendar.json`.

## Full Schema

```json
{
  "campaign": {
    "name": "Campaign Name",
    "project_id": "project-slug",
    "brand": "Brand Name",
    "created": "2026-03-15",
    "timeframe": {
      "start": "2026-03-17",
      "end": "2026-03-30"
    },
    "channels": [
      {
        "id": "buffer_channel_id",
        "service": "twitter",
        "name": "@username"
      }
    ],
    "content_pillars": ["product", "education", "personality", "social-proof"],
    "tone": "casual, funny, confident",
    "brand_brief_path": "content-engine/calendars/campaign-slug/brand-brief.md"
  },
  "items": [
    {
      "id": "001",
      "date": "2026-03-17",
      "time": "14:00",
      "timezone": "America/New_York",
      "platform": "twitter",
      "channel_id": "buffer_channel_id",
      "type": "video",
      "content_pillar": "product",
      "concept": "15s product demo with voiceover showing key feature",
      "caption": "Full caption text with #hashtags",
      "voiceover_script": "Script for AI voiceover if applicable",
      "skill": "remotion-video",
      "style": "minimal, dark bg, pop-in animations",
      "duration": 15,
      "status": "pending",
      "asset_path": null,
      "asset_url": null,
      "buffer_post_id": null,
      "error": null,
      "created_at": null,
      "scheduled_at": null
    }
  ],
  "stats": {
    "total": 12,
    "pending": 8,
    "creating": 0,
    "created": 0,
    "uploading": 0,
    "uploaded": 0,
    "scheduling": 0,
    "scheduled": 4,
    "posted": 0,
    "failed": 0
  }
}
```

## Status Lifecycle

```
pending      -- Calendar item planned, not yet started
creating     -- Content creation skill is working on it
created      -- Content file exists locally (asset_path set)
uploading    -- Uploading to Cloudinary
uploaded     -- Cloudinary URL available (asset_url set)
scheduling   -- Sending to Buffer
scheduled    -- Buffer post created (buffer_post_id set)
posted       -- Buffer confirms it was published
failed       -- Error at any step (error field has details)
```

## Item Types

| Type | Skill Used | Has Media | Notes |
|------|-----------|-----------|-------|
| `video` | `remotion-video` | Yes (.mp4) | Needs Cloudinary upload |
| `image` | `image-gen` (future) | Yes (.png/.jpg) | Needs Cloudinary upload |
| `text` | None (direct) | No | Caption only, no upload step |
| `carousel` | `image-gen` (future) | Yes (multiple images) | Instagram-specific |

## Directory Structure

```
content-engine/calendars/
└── zenbrew-march-launch/
    ├── calendar.json          # Machine-readable calendar
    ├── calendar.md            # Human-readable view (auto-generated)
    ├── brand-brief.md         # Brand analysis for this campaign
    └── run.log                # Execution log (autonomous mode)
```

## Generating calendar.md

After each calendar.json update, regenerate the markdown view:

```markdown
# Content Calendar: [Campaign Name]

**Brand**: [Brand] | **Period**: [Start] to [End] | **Status**: 4/12 scheduled

| # | Date | Platform | Type | Pillar | Concept | Status |
|---|------|----------|------|--------|---------|--------|
| 1 | Mar 17 | Twitter/X | Video | Product | 15s demo | Scheduled |
| 2 | Mar 17 | Instagram | Video | Product | Demo reel | Pending |
...
```
