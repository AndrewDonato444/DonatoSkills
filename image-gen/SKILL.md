---
name: image-gen
description: Generate images for social media using AI (Nano Banana / Gemini). Use this skill when the user wants to create an image, graphic, social media visual, quote card, product shot, thumbnail, infographic, carousel slide, OG image, or any static visual content. Also trigger when the user says "make me an image", "create a graphic", "generate a visual", "quote card", "carousel", "thumbnail", or wants AI-generated images for social posts.
---

# Image Generator

Generate social media images using Google's Nano Banana (Gemini Image Generation). This skill creates platform-optimized visuals — quote cards, product shots, thumbnails, infographics, carousel slides, and more.

## How This Works

You craft the perfect prompt, call the Gemini API to generate the image, and save it locally. The user gets the image file and can review, tweak the prompt, or regenerate. Images are stored in an `images/` directory within the project, organized by job.

**For text on images**: Nano Banana has 94%+ accuracy in text rendering. Use the two-step method — isolate text specification from scene description — for best results.

---

## Orchestrated Mode

When invoked by the `content-engine` skill (or any orchestrator), the prompt will contain **"ORCHESTRATED MODE"** and all required parameters (concept, dimensions, style, output path). In this case:

1. **Skip the interactive question flow entirely** — all decisions are already made
2. **Confirm in one line** — e.g., "Generating 1080x1080 quote card for Instagram..."
3. **Generate the image directly**
4. **Output a structured summary when done:**
   ```
   IMAGE_COMPLETE
   asset_path: images/zenbrew-march/quote-card-001.png
   dimensions: 1080x1080
   aspect_ratio: 1:1
   ```

If any required parameter is missing, fall back to the interactive question flow for that parameter only.

---

## Project Registry (Multi-Project Support)

**Before generating any image**, resolve which project/brand this is for.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Resolve the active project:**
   - **CWD match** — Current directory is inside a project's `specs_path` → auto-select (most common — zero friction)
   - **Orchestrated** — Content-engine passed `project_id` → use directly
   - **Explicit** — User said "for [project name]" → match against project names/slugs
   - **Single project** — Only one project in registry → use it automatically
   - **Ask** — Multiple projects, can't auto-detect → "Which project is this image for?"

3. **Use the project's brand context:**
   - If `specs_path` is set → read vision.md, personas, and design tokens from there
   - If `brand_brief` is set → read that for tone, audience, and visual style
   - Apply brand colors and visual identity to image generation prompts

See `shared-references/project-registry.md` for the full resolution logic.

---

## Prerequisites

### Gemini API Key

This skill requires a `GEMINI_API_KEY` environment variable (stored in the project `.env` file). The user needs:

1. A Google Cloud account with Vertex AI API enabled
2. A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

If the key is missing, tell the user:
> "I need a Gemini API key to generate images. You can get one from aistudio.google.com — want me to walk you through it?"

### Node.js Dependencies

The generation script needs:
```bash
npm i @google/genai
```

---

## Interactive Question Flow

### Step 1: Absorb Context (silent — no questions)

Before asking the user anything, silently read whatever project context exists. **The active project (resolved in Step 0) determines where to find brand context.**

**From the active project (`projects.json`):**
- If `specs_path` is set → read SDD files from there
- If `brand_brief` is set → read that for brand context
- Apply `defaults.tone` as starting default for style questions

**Brand & Audience (from project's specs_path):**

1. **`.specs/vision.md`** — What the product is, who it's for, its personality and positioning. This shapes the visual style and messaging.

2. **`.specs/personas/*.md`** — Who the target users are. Informs what visuals resonate.

3. **`.specs/design-system/tokens.md`** — Brand colors, typography, visual style. These DIRECTLY inform image generation — colors, fonts, mood.

**Non-SDD projects (no specs_path):**
- Read `README.md`, landing page copy, or any product description
- Check for brand guidelines, style guides, or marketing docs

**Always check:**

4. **`shared-references/hook-writing.md`** — If the image includes text, the text should follow hook best practices for the target platform.
5. **`shared-references/platform-specs.md`** — Image dimensions, aspect ratios, file size limits, and supported formats per platform. Use this to set the correct output dimensions.
6. **`shared-references/caption-writing.md`** — Caption formulas per platform. When the image will be posted with a caption, the text overlay and caption should complement each other.
7. **`shared-references/content-pillars.md`** — Content pillar frameworks. When creating images as part of a content strategy, align the visual to the appropriate pillar.
8. **Previous conversation** — if the user just described what they want, you already know it.

**Use everything you find** to pre-fill answers below.

### Step 2: Ask Questions

Group these conversationally. Skip what you already know.

1. **What's the image for?** — "What do you need? (quote card, product shot, thumbnail, infographic, carousel, background, meme, ad creative)"

2. **Platform** — "Which platform? This determines the dimensions."
   - Instagram feed: 1080x1080 (1:1) or 1080x1350 (4:5)
   - Instagram Story/Reels cover: 1080x1920 (9:16)
   - Twitter/X: 1200x675 (16:9) or 1080x1080 (1:1)
   - LinkedIn: 1200x627 (1.91:1) or 1080x1080 (1:1)
   - Facebook: 1200x630 (1.91:1) or 1080x1080 (1:1)
   - YouTube thumbnail: 1280x720 (16:9)
   - Pinterest: 1000x1500 (2:3)
   - OG image: 1200x630 (1.91:1)

3. **Concept** — "Describe the visual. What should it look like?"
   - Encourage specificity: mood, colors, composition, lighting
   - If they're vague, offer options based on brand context

4. **Text overlay?** — "Any text on the image? (quote, headline, CTA, logo text)"
   - If yes: "What's the exact text? Keep it under 25 characters for best results."
   - Ask about font style preference (bold, clean, handwritten, serif)

5. **Style** — "What visual style?
   - **Photorealistic** — looks like a real photo
   - **Flat/graphic** — clean illustration, solid colors
   - **Abstract** — shapes, gradients, artistic
   - **Minimal** — lots of whitespace, simple
   - **Bold/vibrant** — high contrast, saturated colors
   - **Moody/dark** — dark tones, dramatic lighting"

6. **Quantity** — "How many variations? (1 is default, up to 4 for A/B testing)"

7. **Job name** — "What should I call this batch? (e.g., 'product-launch', 'weekly-quotes')"

### Step 3: Confirm & Generate

Show the prompt you'll send before generating:

> **Generation plan:**
> - **Type**: Quote card
> - **Platform**: Instagram (1080x1080, 1:1)
> - **Concept**: Matcha latte in a cozy setting with morning light
> - **Text**: "Dream Big" in bold white sans-serif, centered
> - **Style**: Photorealistic, warm tones
> - **Model**: gemini-2.5-flash-image
>
> Look good? I'll generate it.

Wait for confirmation before calling the API.

---

## Nano Banana API Reference

### Models

| Model | ID | Use Case | Speed | Cost |
|-------|-----|----------|-------|------|
| Nano Banana | `gemini-2.5-flash-image` | General purpose, good default | Fast (~5s) | ~$0.04/image |
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | Speed-optimized | Fastest (~3s) | ~$0.03/image |
| Nano Banana Pro | `gemini-3-pro-image-preview` | Studio quality, hero images | Slower (~10s) | ~$0.08/image |

**Default**: Use `gemini-2.5-flash-image` for most images. Use Pro for hero visuals or high-stakes creatives.

### Generation Script

Create a `generate-image.ts` script in the job directory:

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface ImageJob {
  name: string;
  prompt: string;
  aspectRatio: string;
  model?: string;
}

async function generateImage(job: ImageJob): Promise<string> {
  const model = job.model || "gemini-2.5-flash-image";

  const response = await ai.models.generateContent({
    model,
    contents: job.prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: job.aspectRatio,
      },
    },
  });

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const part of response.candidates![0].content!.parts!) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      const outputPath = path.join(outputDir, `${job.name}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Generated: ${outputPath} (${buffer.length} bytes)`);
      return outputPath;
    }
  }

  throw new Error("No image data in response");
}

// Usage
const job: ImageJob = {
  name: "IMAGE_NAME",
  prompt: "PROMPT_HERE",
  aspectRatio: "1:1",
};

generateImage(job).catch(console.error);
```

### Available Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| `"1:1"` | Instagram feed, Twitter, LinkedIn, Facebook |
| `"2:3"` | Pinterest, Instagram Story (closest to 9:16) |
| `"3:2"` | Landscape photos |
| `"4:3"` | Standard photo |
| `"16:9"` | YouTube thumbnails, Twitter cards, LinkedIn headers |
| `"21:9"` | Ultra-wide banners |

### Platform → Aspect Ratio Mapping

| Platform | Post Type | Aspect Ratio | Dimensions |
|----------|-----------|-------------|------------|
| Instagram | Feed | `"1:1"` | 1080x1080 |
| Instagram | Portrait | `"2:3"` | 1080x1350 |
| Instagram | Story/Reel cover | `"2:3"` | 1080x1920 |
| Twitter/X | In-feed image | `"16:9"` | 1200x675 |
| Twitter/X | Square | `"1:1"` | 1080x1080 |
| LinkedIn | Article/share | `"16:9"` | 1200x627 |
| Facebook | Share | `"16:9"` | 1200x630 |
| YouTube | Thumbnail | `"16:9"` | 1280x720 |
| Pinterest | Pin | `"2:3"` | 1000x1500 |

---

## Prompt Engineering

### Core Principles

1. **Positive framing** — describe what you WANT, not what you don't want ("empty street" not "no cars")
2. **Be specific** — mood, lighting, camera angle, color palette, composition
3. **Use negative prompts sparingly** — only "no blur, no distortion, no watermark"
4. **Two-step for text** — isolate text specification from scene description

### Prompt Structure

Use JSON-structured thinking when building prompts:

```json
{
  "subject": "Matcha latte in ceramic cup",
  "setting": "Cozy cafe window, morning light",
  "style": "Photorealistic, warm tones",
  "lighting": "Soft golden hour, side lighting",
  "composition": "Close-up, shallow depth of field",
  "colors": "Warm greens, cream, wood tones",
  "text": "'Dream Big' in bold white sans-serif, top center",
  "negative": "No blur, no distortion, no watermark"
}
```

Then flatten into a natural prompt:
> "Close-up photorealistic shot of a matcha latte in a ceramic cup on a wooden table by a cafe window, soft golden hour side lighting, warm greens and cream tones, shallow depth of field. Bold white sans-serif text reading 'Dream Big' centered at top. No blur, no distortion, no watermark."

### Text on Images (Two-Step Method)

For best text rendering accuracy:

**Step 1** — Specify text separately in the prompt:
> "Generate an image with the text 'Dream Big' rendered in bold white sans-serif font"

**Step 2** — Combine with the full scene:
> "Inspirational quote card with the text 'Dream Big' in bold white sans-serif font, centered, on a gradient background transitioning from deep teal to midnight blue, modern and clean"

**Text rules:**
- Keep text under 25 characters for best accuracy
- Use double quotes around the exact text in the prompt
- Specify font style, color, size, and placement
- Avoid cursive/script fonts — sans-serif renders most reliably
- For longer text, consider generating the image WITHOUT text and adding text overlay in post-processing

**CRITICAL: Gemini frequently misspells text in generated images.** Common errors include swapped letters ("mo" for "to"), dropped letters ("aready" for "already"), and phonetic substitutions ("rel" for "real"). To mitigate:
1. **Spell out short common words letter-by-letter** in the prompt when embedded in longer text (e.g., "T-O" not "to", "A-L-R-E-A-D-Y" not "already")
2. **Add "CRITICAL SPELLING: Double-check every word is spelled correctly"** to every prompt that includes text in the image
3. **Generate 2-3 variants** and visually inspect each for spelling errors before using
4. **Add a human review step** specifically for text-in-image accuracy before uploading/scheduling
5. **For guaranteed accuracy**: generate the image WITHOUT text, then add text programmatically (HTML canvas, ImageMagick, sharp, etc.) as a post-processing step. This is the recommended approach for any text longer than 3 words.

### Prompt Templates by Content Type

#### Quote Card
```
"Inspirational quote card with the text '[TEXT]' in [font style] [color] font,
[placement], on a [background description], [mood], modern and professional,
suitable for [platform]. No blur, no distortion."
```

#### Product Shot
```
"[Product description], [setting/background], [lighting style], photorealistic,
high quality, [mood], [composition], [brand colors]. No blur, no watermark."
```

#### Thumbnail
```
"YouTube thumbnail style image, [subject/scene], bold and eye-catching,
high contrast, [text if any], [color scheme], professional quality.
No blur, no distortion."
```

#### Abstract/Background
```
"Abstract [concept] visualization, flowing [shapes/lines] in [colors],
on a [background], [mood/feel], premium and modern, suitable for
text overlay. No blur, no distortion."
```

#### Infographic Background
```
"Clean [style] background for an infographic about [topic],
[color palette], with space for text and data overlays,
professional and modern. No blur, no watermark."
```

---

## File Storage

### Directory Structure

All generated images live in an `images/` directory in the project root:

```
images/
├── product-launch/
│   ├── package.json
│   ├── scripts/
│   │   └── generate-image.ts
│   └── output/
│       ├── hero-shot.png
│       ├── quote-card-001.png
│       └── quote-card-002.png
├── weekly-quotes/
│   ├── package.json
│   ├── scripts/
│   │   └── generate-image.ts
│   └── output/
│       ├── monday-quote.png
│       └── wednesday-quote.png
└── zenbrew-march/              ← orchestrator campaign
    ├── package.json
    ├── scripts/
    │   └── generate-image.ts
    └── output/
        ├── item-003-quote.png
        └── item-007-product.png
```

**Key rules:**
- **One job folder per invocation** (standalone) or per campaign (orchestrated)
- Each job gets its own `package.json` + `scripts/generate-image.ts`
- Generated images go in `output/`
- If `images/` doesn't exist, create it
- Descriptive filenames: `hero-shot.png`, `quote-card-001.png`, not `image1.png`

### Scaffolding a Job

When creating a new image job:

1. Create `images/<job-name>/`
2. Create `package.json` with `@google/genai` dependency
3. Create `scripts/generate-image.ts` with the generation logic
4. Run `npm install`
5. Run `npx tsx scripts/generate-image.ts`
6. Images appear in `output/`

---

## Batch Generation

For multiple images in one job (e.g., a week of quote cards):

```typescript
const jobs: ImageJob[] = [
  {
    name: "monday-quote",
    prompt: "Quote card with text 'Start Strong' in bold white...",
    aspectRatio: "1:1",
  },
  {
    name: "wednesday-tip",
    prompt: "Clean infographic background with text '3 Tips'...",
    aspectRatio: "1:1",
  },
  // ...
];

for (const job of jobs) {
  await generateImage(job);
  // Brief pause to avoid rate limits
  await new Promise((r) => setTimeout(r, 2000));
}
```

**Rate limits**: ~10 requests/minute. Add a 2-second delay between generations. For large batches (10+), use exponential backoff on 429 errors.

---

## Variations and A/B Testing

When generating variations:
1. Keep the core concept the same
2. Vary ONE element per variation (color, composition, text placement)
3. Name files clearly: `hero-v1.png`, `hero-v2.png`, `hero-v3.png`
4. Show all variations to the user and let them pick

---

## Image Types for Social Media

| Type | Best For | Text? | Example |
|------|----------|-------|---------|
| **Quote card** | Instagram, LinkedIn, Facebook | Yes — the quote IS the image | Motivational quote on gradient bg |
| **Product shot** | Instagram, Facebook ads | Maybe — product name/price | Stylized product photography |
| **Thumbnail** | YouTube, blog OG images | Yes — title text | Eye-catching preview image |
| **Infographic** | LinkedIn, Pinterest, carousel | Yes — data + labels | Stats, tips, or process visualization |
| **Meme/humor** | Twitter, Instagram, Facebook | Yes — setup/punchline | Relatable humor with text |
| **Abstract/mood** | Any — as background for text posts | No — pure visual | Gradient, texture, or pattern |
| **Behind-the-scenes** | Instagram, TikTok, LinkedIn | No | Workspace, process, team |
| **Carousel slide** | Instagram, LinkedIn | Yes — headline per slide | Multi-image swipeable content |

---

## Carousel Generation

For Instagram or LinkedIn carousels:

1. Plan the carousel: hook slide → content slides → CTA slide
2. Generate each slide as a separate image with consistent style
3. Number the files: `slide-01-hook.png`, `slide-02-tip1.png`, etc.
4. Keep visual consistency: same color palette, font style, layout pattern across all slides
5. The hook slide follows `shared-references/hook-writing.md` — it must make them swipe

```typescript
const carousel: ImageJob[] = [
  { name: "slide-01-hook", prompt: "Bold text 'Stop Doing This' on dark bg...", aspectRatio: "1:1" },
  { name: "slide-02-tip1", prompt: "Clean card with text 'Tip 1: ...' ...", aspectRatio: "1:1" },
  { name: "slide-03-tip2", prompt: "Clean card with text 'Tip 2: ...' ...", aspectRatio: "1:1" },
  { name: "slide-04-cta", prompt: "Card with text 'Follow for more' ...", aspectRatio: "1:1" },
];
```

---

## Performance Notes

- Each image: 3-10 seconds depending on model
- File size: ~1-2 MB per PNG
- Start with low-res previews for testing, then regenerate at full quality
- Cache everything in `output/` — no need to regenerate unless the prompt changes
- For cost optimization: use `gemini-2.5-flash-image` for drafts, `gemini-3-pro-image-preview` for finals
