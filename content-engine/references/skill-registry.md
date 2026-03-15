# Skill Registry -- Detailed Interfaces

This file documents the interface for each content creation skill the content-engine can orchestrate.

---

## remotion-video

**Produces**: `.mp4` video file
**Skill location**: `/remotion-video/SKILL.md`
**Output location**: `videos/<project-name>/out/video.mp4`

### Required Parameters (for orchestrated mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| platform | Target platform + dimensions | "Twitter/X (1080x1080, 30fps)" |
| message | What the video communicates | "5 reasons to try ZenBrew matcha" |
| style | Visual style and vibe | "minimal, dark background, green accents, pop-in animations" |
| duration | Target length in seconds | "15 seconds" |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| voiceover | AI voiceover with script | "AI voiceover, script: 'Tired of jittery coffee?...'" |
| voice | Gemini TTS voice name | "Puck" (default), "Kore", "Charon" |
| visual_mode | How visuals are created | "text-only", "ai-generated", "user-provided" |
| music | Background music | Not yet supported |
| output_path | Custom output directory | "videos/zenbrew-launch/item-001/" |

### Orchestrated Invocation Template

```
Use the remotion-video skill to create a video. ORCHESTRATED MODE -- all parameters provided, skip questions and build directly.

- Platform: [platform] ([width]x[height], [fps]fps)
- Message: [what the video says/shows]
- Style: [visual style description]
- Duration: [N] seconds
- Voiceover: [AI voiceover with script / none]
- Voice: [voice name if voiceover]
- Output: videos/[campaign-slug]/item-[NNN]/
```

### Output

After rendering, the skill produces:
- `out/video.mp4` -- the rendered video
- Audio files in `public/audio/` (if voiceover)
- `public/audio/manifest.json` (audio timing metadata)

---

## social-media

**Produces**: Scheduled Buffer post
**Skill location**: `/social-media/SKILL.md`

### Required Parameters (for orchestrated mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| channel_id | Buffer channel ID | "67d5f3a..." |
| text | Post caption with hashtags | "Vibe coding is the future #coding #ai" |
| timing | When to post | "2026-03-17T14:00:00Z" or "queue" or "now" |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| asset_url | Cloudinary URL for media | "https://res.cloudinary.com/..." |
| asset_type | Type of media | "video", "image" |
| platform_metadata | Platform-specific options | `{ instagram: { postType: "reel" } }` |

### Orchestrated Invocation Template

```
Use the social-media skill to schedule a post. ORCHESTRATED MODE -- all parameters provided, skip questions and schedule directly.

- Channel: [channel_id] ([platform name])
- Caption: [full caption with hashtags]
- Timing: [ISO datetime / "queue" / "now"]
- Media: [Cloudinary URL] (video/image)
- Platform metadata: [if applicable]
```

### Output

After scheduling, returns:
- Buffer post ID
- Scheduled time
- Post status

---

## image-gen (Future)

**Produces**: `.png` or `.jpg` image file
**Status**: Not yet implemented

### Planned Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| concept | What the image shows | "Matcha latte in a cozy setting" |
| dimensions | Image size | "1080x1080" |
| style | Visual style | "photography-style, warm tones" |
| text_overlay | Text on the image | "5 Benefits of Matcha" |

---

## copywriting (Future)

**Produces**: Text content (blog, email, thread)
**Status**: Not yet implemented

### Planned Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| topic | Subject matter | "Benefits of morning routines" |
| tone | Writing style | "casual, conversational" |
| length | Word count target | "150 words" |
| format | Content structure | "twitter-thread", "blog-post", "email" |
| cta | Call to action | "Sign up for the newsletter" |
