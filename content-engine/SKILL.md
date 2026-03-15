---
name: content-engine
description: Plan and execute a full content calendar across social media platforms. Use this skill when the user wants to create a content strategy, build a content calendar, batch-create posts/videos/images, or automate their social media. Trigger when the user says "content calendar", "content plan", "plan my content", "run my social media", "create a week of content", "batch schedule", "content engine", "autonomous content", "go make content", or wants to plan and produce multiple pieces of content at scale.
---

# Content Engine

Plan, create, and schedule a full content calendar across social media platforms. This skill orchestrates other skills (video creation, image generation, etc.) and handles the end-to-end pipeline from brand analysis to scheduled posts.

## How This Works

You are the orchestrator. You do NOT create content directly. Instead, you:

1. **Analyze** the brand/product to understand what content to create
2. **Plan** a content calendar with specific posts, platforms, and timing
3. **Invoke** creation skills (remotion-video, image-gen, etc.) in orchestrated mode
4. **Upload** created assets to Cloudinary for public URLs
5. **Schedule** everything through Buffer via the social-media skill

The user tells you about their brand and goals. You build and execute the plan.

---

## Prerequisites

### Required API Keys

All keys should be in the project `.env` file:

| Key | Service | Purpose |
|-----|---------|---------|
| `BUFFER_API_KEY` | Buffer | Social media scheduling |
| `GEMINI_API_KEY` | Google Gemini | Video voiceover (TTS) + image generation |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Media hosting |
| `CLOUDINARY_API_KEY` | Cloudinary | Media hosting |
| `CLOUDINARY_API_SECRET` | Cloudinary | Media hosting |

If any key is missing, tell the user which ones are needed and how to get them.

### Buffer Channels

Social media channels must be connected through the Buffer web app. Query connected channels before planning:

```bash
# Get org ID
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ account { organizations { id } } }"}'

# List channels
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query($input: ChannelsInput!) { channels(input: $input) { id service name metadata { ... on TwitterMetadata { twitterUsername } ... on InstagramMetadata { instagramAccountType } ... on TikTokMetadata { tiktokUsername } ... on LinkedInMetadata { linkedinAccountType } ... on YouTubeMetadata { youtubeChannelTitle } ... on ThreadsMetadata { threadsUsername } ... on BlueskyMetadata { blueskyUsername } } } }", "variables": {"input": {"organizationId": "ORG_ID"}}}'
```

---

## Interactive Question Flow

### Step 1: Absorb Context (silent — no questions)

Before asking the user anything, silently read whatever project context exists:

**Brand & Audience (SDD projects):**

1. **`.specs/vision.md`** -- What the product is, who it's for, its personality and positioning. This shapes the *content and tone* of all posts.

2. **`.specs/personas/*.md`** -- Who the target users are. Personas contain vocabulary, patience level, and frustrations. These inform which content pillars resonate and what language to use in captions.

3. **`.specs/design-system/tokens.md`** -- Brand colors, typography, visual style. These inform video styles, image aesthetics, and overall visual consistency across content.

**Non-SDD projects:**
- Read `README.md`, landing page copy, or any product description
- Check for brand guidelines, style guides, or marketing docs

**Always check:**

4. **Buffer channels** -- query the API to see what platforms are connected
5. **Existing calendar** -- check `content-engine/calendars/` for active campaigns
6. **Previous conversation** -- if the user just described their product, you already know it

**Use everything you find** to pre-fill answers to the questions below. The more you absorb silently, the fewer questions you need to ask. If vision + personas give you brand, audience, tone, and content pillars, you may only need to ask about timeframe, frequency, and mode.

### Step 2: Ask Questions

Group these conversationally. Skip what you already know.

1. **Brand/Product** -- "What's the brand or product? (URL, description, or should I read your project?)"
   - If given a URL, analyze the landing page for: value prop, target audience, tone, visual style, key features
   - If given a description, extract the same
   - If the project has `.specs/vision.md`, read it

2. **Channels** -- "I can see you have [X, Y, Z] connected in Buffer. Want to post to all of them, or a subset?"

3. **Timeframe** -- "How far out should I plan? (1 week, 2 weeks, 1 month)"

4. **Frequency** -- "How often per platform? (e.g., daily on Twitter, 3x/week on Instagram)"

5. **Content Mix** -- "What types of content? Options:
   - **Videos** (short-form reels, explainers, product demos)
   - **Images** (graphics, quotes, product shots) -- *coming soon*
   - **Text posts** (threads, hot takes, tips)
   - **Mix of everything** (I'll balance it)"

6. **Content Pillars** -- "What themes should I rotate through? Common ones:
   - Product/feature highlights
   - Educational/tips
   - Behind the scenes
   - Social proof/testimonials
   - Entertainment/personality
   - Industry trends
   Or tell me your own."

7. **Tone** -- "What's the vibe? (professional, casual, funny, provocative, inspirational)"

8. **Mode** -- "How do you want to run this?
   - **Interactive** -- I'll show you each piece and get approval
   - **Autonomous** -- I'll create and schedule everything, you review after
   - **Plan only** -- just generate the calendar, don't create anything yet"

### Step 3: Generate Calendar

After gathering answers, generate the content calendar and show it:

```
Content Calendar: [Brand Name] -- [Timeframe]

| # | Date       | Platform   | Type  | Pillar      | Concept                              | Status  |
|---|------------|------------|-------|-------------|--------------------------------------|---------|
| 1 | 2026-03-17 | Twitter/X  | Video | Product     | 15s product demo with voiceover      | Pending |
| 2 | 2026-03-17 | Instagram  | Video | Product     | Same demo adapted for Reels (9:16)   | Pending |
| 3 | 2026-03-18 | Twitter/X  | Text  | Education   | Thread: 5 tips for [topic]           | Pending |
| 4 | 2026-03-19 | Instagram  | Video | Personality | Funny take on [trend]                | Pending |
| 5 | 2026-03-19 | LinkedIn   | Text  | Thought     | Lessons learned from building [X]    | Pending |
```

Ask: "Here's the content calendar. Want to adjust anything, or should I start creating?"

---

## Content Calendar Persistence

Calendars are stored as JSON in `content-engine/calendars/<campaign-slug>/calendar.json`.

See `references/calendar-schema.md` for the full schema.

**Status lifecycle per item:**
```
pending → creating → created → uploading → uploaded → scheduling → scheduled → posted
                                                                              → failed (at any step)
```

After generating the calendar, write it to `calendar.json`. Update status after each step. This enables:
- **Resume from failure** -- if execution stops, pick up where you left off
- **Progress tracking** -- show the user what's done and what's left
- **History** -- past calendars live in their own directories

Also generate a human-readable `calendar.md` from the JSON after each update.

---

## Execution Pipeline

For each calendar item, run this pipeline:

### 1. Create Content

Determine which skill to invoke based on the item's `type`:

| Content Type | Skill | Orchestrated Invocation |
|-------------|-------|------------------------|
| `video` | `remotion-video` | Invoke with all params pre-specified (platform, content, style, duration, voiceover). The skill will skip its interactive Q&A and build directly. |
| `image` | `image-gen` (future) | Invoke with concept, dimensions, style. |
| `text` | None (write directly) | Generate the caption/thread text yourself. No skill needed. |

**Invoking a creation skill in orchestrated mode:**

When invoking `remotion-video`, provide ALL of these in your prompt so it skips questions:
- Platform and dimensions
- Content/message (what the video says)
- Visual style (colors, vibe, animation style)
- Duration
- Voiceover: yes/no, and if yes, the script
- Output path

Example orchestrated invocation:
> "Use the remotion-video skill to create a video. ORCHESTRATED MODE -- all parameters provided, skip questions and build directly.
> - Platform: Twitter/X (1080x1080, 30fps)
> - Message: [the concept from the calendar]
> - Style: [brand style]
> - Duration: 15 seconds
> - Voiceover: AI voiceover, script: [the script]
> - Output: videos/[campaign-slug]/item-001/"

Update calendar item status to `creating` before, `created` after (with `asset_path`).

### 2. Upload to Cloudinary

After content is created locally, upload to Cloudinary:

```bash
# For video
curl -s -X POST "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/video/upload" \
  -F "file=@path/to/video.mp4" \
  -F "api_key=$CLOUDINARY_API_KEY" \
  -F "timestamp=$(date +%s)" \
  -F "signature=$(echo -n "timestamp=$(date +%s)$CLOUDINARY_API_SECRET" | shasum -a 1 | cut -d' ' -f1)"

# For image
curl -s -X POST "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload" \
  -F "file=@path/to/image.png" \
  -F "api_key=$CLOUDINARY_API_KEY" \
  -F "timestamp=$(date +%s)" \
  -F "signature=$(echo -n "timestamp=$(date +%s)$CLOUDINARY_API_SECRET" | shasum -a 1 | cut -d' ' -f1)"
```

Extract `secure_url` from the response. Update calendar item status to `uploaded` with `asset_url`.

See `references/cloudinary-upload.md` for details.

### 3. Schedule via Buffer

Use the Buffer GraphQL API to create the post:

```graphql
mutation {
  createPost(input: {
    channelId: "CHANNEL_ID"
    text: "Caption with #hashtags"
    schedulingType: automatic
    mode: customScheduled
    dueAt: "2026-03-17T14:00:00Z"
    assets: {
      videos: [{ url: "https://res.cloudinary.com/..." }]
    }
    aiAssisted: true
    source: "content-engine-skill"
  }) {
    ... on CreatePostPayload {
      post { id status scheduledAt }
    }
    ... on MutationError { message }
  }
}
```

**Important**: Use inline variables for mutations (not the `variables` JSON field). Buffer returns `Bad Request` with parameterized mutation variables.

Update calendar item status to `scheduled` with `buffer_post_id`.

### 4. Log & Continue

After each item is processed, update `calendar.json` and regenerate `calendar.md`. Show a brief progress line:

> Item 3/12: Twitter text post scheduled for Mar 18 at 2pm EST

Then move to the next item.

---

## Skill Registry

Available content creation skills and their interfaces:

| Skill | Produces | Required Params | Optional Params |
|-------|----------|-----------------|-----------------|
| `remotion-video` | `.mp4` video | platform, message, style, duration | voiceover (script + voice), visual mode, music |
| `social-media` | Scheduled post | channel_id, text, timing | assets, hashtags, metadata |
| `image-gen` | `.png/.jpg` image | concept, dimensions | style, colors, text overlay |
| `copywriting` | Text content | topic, tone, length | CTA, audience, format |

See `references/skill-registry.md` for detailed interface specs.

When a new skill is added to the project, add it to this table and create an entry in `references/skill-registry.md`.

---

## Caption Generation

When creating captions for scheduled posts, follow these rules:

### Structure
1. **Hook** -- first line grabs attention (question, bold claim, surprising stat)
2. **Body** -- deliver the value (scannable, not a wall of text)
3. **CTA** -- tell them what to do

### Platform Adaptation
Adapt captions per platform -- don't copy-paste:

| Platform | Tone | Max Length | Hashtags |
|----------|------|-----------|----------|
| Twitter/X | witty, concise | 280 chars | 1-2 |
| Instagram | polished, aspirational | 2200 chars (hook in first 125) | 5-15 |
| TikTok | raw, casual, funny | 300 chars | 3-5 |
| LinkedIn | professional, insightful | 3000 chars | 3-5 |
| Threads | personal, conversational | 500 chars | 0-2 |
| Bluesky | casual, techy | 300 chars | 0-1 |

### Cross-Platform Repurposing
One piece of content becomes multiple platform-optimized posts:
- Same video, different caption per platform
- Pull the best quote as a standalone text post
- Longer breakdown for LinkedIn, punchy hook for Twitter

---

## Autonomous Mode

When the user says "just run" or chooses autonomous mode:

1. Generate the full calendar
2. Get **one upfront approval** of the calendar
3. Process every item end-to-end without further prompts
4. Log progress to `content-engine/calendars/<slug>/run.log`
5. Show a final summary when done:

```
Content Engine Run Complete

Created: 8 videos, 4 text posts
Uploaded: 8 assets to Cloudinary
Scheduled: 12 posts across 3 platforms
Failed: 0

Next scheduled post: Mar 17 at 9am EST (Twitter/X)
```

### Error Handling in Autonomous Mode
- If a creation skill fails, log the error, mark the item as `failed`, and continue to the next item
- If Cloudinary upload fails, retry once, then mark as `failed` and continue
- If Buffer scheduling fails, log the error with the mutation response, mark as `failed`, continue
- At the end, report all failures so the user can address them

---

## Recurring Mode (Scheduled Tasks)

For ongoing content creation, use Claude Code's scheduled tasks:

1. User says "run my content every week"
2. Generate the first week's calendar and execute it
3. Create a scheduled task:

```
Task: Weekly content creation for [Brand]
Schedule: Every Monday at 9am
Prompt: |
  You are the content engine for [Brand].
  Read the campaign at content-engine/calendars/[slug]/calendar.json.
  Check Buffer for which posts from last week went out successfully.
  Generate next week's calendar items based on the brand brief and content pillars.
  Create all content, upload to Cloudinary, and schedule through Buffer.
  Update calendar.json with results.

  Brand: [inline brand brief]
  Channels: [channel IDs and names]
  Content pillars: [pillars]
  Frequency: [per-platform frequency]
  Tone: [tone/style]
```

This spawns a fresh Claude session each week that reads existing state, plans new content, and executes.

---

## Resume from Failure

If execution was interrupted or items failed:

1. Read `content-engine/calendars/<slug>/calendar.json`
2. Find items with status other than `scheduled` or `posted`
3. Resume from where each item left off:
   - `pending` or `creating` → start creation
   - `created` → upload to Cloudinary
   - `uploaded` or `uploading` → schedule via Buffer
   - `failed` → retry from the failed step
4. Show: "Resuming calendar: 5/12 items already scheduled, picking up from item 6."

---

## Brand Analysis

When analyzing a brand/product (from URL, description, or project context), extract:

1. **Value proposition** -- what does it do, who is it for
2. **Target audience** -- demographics, interests, pain points
3. **Tone of voice** -- how does the brand speak (casual, professional, edgy, warm)
4. **Visual identity** -- colors, style, imagery preferences
5. **Key messages** -- what should content consistently reinforce
6. **Competitors** -- who else is in this space (informs differentiation)
7. **Content opportunities** -- what topics/angles will resonate with the audience

Store this as `content-engine/calendars/<slug>/brand-brief.md` for reference during creation.

See `references/brand-analysis.md` for detailed analysis methodology.
