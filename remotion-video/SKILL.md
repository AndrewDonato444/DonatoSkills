---
name: remotion-video
description: Create social media videos using Remotion (React-based video framework). Use this skill whenever the user wants to make a video, short-form content, animated clip, reel, TikTok, YouTube Short, Instagram story, or any motion graphics for social media. Also trigger when the user mentions Remotion, video rendering, animated text, kinetic typography, or wants to turn text/images/data into a video. Even if they just say "make me a video" or "create a reel" or "animate this", use this skill.
---

# Remotion Video Creator

Create highly animated social media videos using [Remotion](https://www.remotion.dev) — a React framework that turns components into videos.

## How This Works

Remotion treats video as a function of time. You write React components that read the current frame number, and Remotion renders each frame into a video file. Everything you know about React (components, props, CSS, layout) applies directly to video creation.

The user tells you what video they want. **You guide them through an interactive question flow**, then scaffold a Remotion project, write the compositions, and render the final `.mp4`. They get both the rendered video AND the full project so they can tweak and re-render later.

---

## Interactive Question Flow

**DO NOT jump straight to building.** Walk the user through these questions conversationally. Skip any that are already answered by their initial request or by project context (SDD files, design tokens, etc). Group related questions together — don't ask one at a time.

### Step 1: Absorb Project Identity (silent — no questions)

Before asking the user anything, silently read whatever project context exists:

**Brand & Audience (SDD projects):**

1. **`.specs/vision.md`** — What the product is, who it's for, its personality and positioning. This shapes the *content and tone* of the video.

2. **`.specs/personas/*.md`** — Who the target users are. Personas contain vocabulary, patience level, and frustrations.

3. **`.specs/design-system/tokens.md`** — Colors, typography, spacing, and personality. This shapes the *visual style*.

**Non-SDD projects:**

4. **`tailwind.config.*`** — Tailwind theme with custom colors/fonts
5. **`src/styles/theme.*` or `src/lib/theme.*`** — Custom theme files
6. **`package.json`** — Check for font packages

### Step 2: Ask Questions

Present questions as a grouped, conversational message. Here's the full question set — **skip any you can already answer from context**:

#### Always Ask:
1. **Platform** — "What platform is this for? (TikTok, Instagram Reels, YouTube Shorts, Twitter/X, LinkedIn, or multiple?)"
2. **Content** — "What's the message? What should the video say/show?"

#### Ask If Multiple Personas Exist:
3. **Persona** — "I see you have personas for [list them]. Who's this video for, or should I aim for a general brand feel?"

#### Ask Based on Content:
4. **Visual Mode** — "Do you want this to be:
   - **Text-only** — animated text on styled backgrounds (fastest, no API calls)
   - **AI-generated visuals** — I'll generate custom backgrounds and imagery using Nano Banana / Gemini *(requires GEMINI_API_KEY)*
   - **Your own assets** — you provide images/photos for me to animate"

5. **Duration** — "How long? (default: 15s for short-form, 30s for story-style)" *(skip if platform implies it)*

#### Only If Not Covered by Design Tokens:
6. **Style** — "What vibe? (premium/luxury, energetic, minimal, playful, corporate, techy)" *(skip if tokens.md has a personality)*
7. **Colors** — "Any specific colors or brand palette?" *(skip if tokens.md or tailwind covers this)*

#### Optional:
8. **Logo** — "Want a logo included? I can check your project for one, or you can point me to a file." *(Check `public/` and project root first — if you find one, just mention it: "I found logo.png — want me to include it?")*
9. **Multi-platform** — "Want me to render for multiple platforms at once? I can create compositions for different aspect ratios from the same content."

### Step 3: Confirm & Build

After gathering answers, give a brief summary of what you'll build:

> "Here's what I'll create:
> - **Platform**: TikTok (1080×1920, 30fps)
> - **Duration**: 15 seconds (450 frames)
> - **Style**: Premium/luxury using your design tokens (navy + gold palette)
> - **Visuals**: AI-generated backgrounds via Nano Banana
> - **Scenes**: [brief scene breakdown]
> - **Logo**: Your logo.png as an end-card reveal
>
> Ready to build?"

Then build it.

---

## Visual Modes

### Text-Only Mode (Default — No API Keys Needed)

Pure Remotion — animated text, gradients, shapes, and data visualizations. No external calls. This is the fastest path and produces great results for most social media content.

Use gradient backgrounds, particle effects, geometric shapes, and the full animation patterns library in `references/animation-patterns.md`.

### AI-Generated Visuals Mode (Nano Banana / Gemini)

Uses Google's Gemini image generation API ("Nano Banana") to create custom backgrounds, scene imagery, and visual assets that Remotion then animates.

**Requirements:**
- `GEMINI_API_KEY` environment variable set, OR
- User provides the key when asked

**How it works:**

1. Based on the video concept, generate 2-5 scene images via Gemini API
2. Save them to the Remotion project's `public/` folder
3. Use them as backgrounds with Ken Burns zoom, image reveals, or overlays
4. Layer animated text, data, and transitions on top via Remotion

**Asset Generation Script:**

Create a `scripts/generate-assets.ts` in the video project:

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AssetRequest {
  name: string;          // filename (no extension)
  prompt: string;        // what to generate
  aspectRatio?: string;  // "16:9", "1:1", "2:3", etc.
}

async function generateAssets(requests: AssetRequest[]) {
  const outputDir = path.join(__dirname, "..", "public", "generated");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const req of requests) {
    console.log(`Generating: ${req.name}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: req.prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: req.aspectRatio ? { aspectRatio: req.aspectRatio } : undefined,
      },
    });

    for (const part of response.candidates![0].content!.parts!) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data!, "base64");
        const filepath = path.join(outputDir, `${req.name}.png`);
        fs.writeFileSync(filepath, buffer);
        console.log(`  Saved: ${filepath} (${(buffer.length / 1024).toFixed(0)} KB)`);
      }
    }
  }
}

// Define assets for this video
const assets: AssetRequest[] = [
  // Customize these per video
  {
    name: "scene-1-bg",
    prompt: "Description of scene 1 background...",
    aspectRatio: "2:3",
  },
];

generateAssets(assets).catch(console.error);
```

**Aspect Ratio Mapping for Nano Banana:**

| Video Platform | Video Aspect | Nano Banana Aspect |
|---------------|-------------|-------------------|
| TikTok/Reels (9:16) | 1080×1920 | `"2:3"` (closest available) |
| Twitter/LinkedIn (1:1) | 1080×1080 | `"1:1"` |
| YouTube (16:9) | 1920×1080 | `"16:9"` |

**Available Nano Banana aspect ratios:** `"1:1"`, `"2:3"`, `"3:2"`, `"4:3"`, `"16:9"`, `"21:9"`, `"1:4"`, `"4:1"`, `"1:8"`, `"8:1"`

**Model choices:**
- `gemini-2.5-flash-image` — fast, good quality, best for bulk generation (recommended)
- `gemini-3.1-flash-image-preview` — newer, speed-optimized
- `gemini-3-pro-image-preview` — highest quality, slower, best for hero images

**Prompt tips for video assets:**
- Include the mood/lighting: "cinematic, golden hour, moody, high contrast"
- Specify it's for a background: "suitable as a video background, clean composition, space for text overlay"
- Match the project's brand: "luxury, premium, dark navy and gold accents" (pull from vision/tokens)
- Be specific about style: "photorealistic", "flat illustration", "3D render", "abstract"

**Using generated assets in Remotion:**

```tsx
import { Img, staticFile } from "remotion";

// Reference generated assets
<Img src={staticFile("generated/scene-1-bg.png")} style={{
  width: "100%",
  height: "100%",
  objectFit: "cover",
}} />
```

### User-Provided Assets Mode

User supplies their own images/photos. Copy them to `public/` and animate with Ken Burns, reveals, and transitions.

---

## Platform Presets

Each platform has specific dimensions and duration norms. Use these unless the user says otherwise:

| Platform | Resolution | Aspect | FPS | Typical Duration |
|----------|-----------|--------|-----|-----------------|
| TikTok | 1080×1920 | 9:16 | 30 | 15-60s |
| Instagram Reels | 1080×1920 | 9:16 | 30 | 15-90s |
| Instagram Story | 1080×1920 | 9:16 | 30 | 5-15s |
| YouTube Shorts | 1080×1920 | 9:16 | 30 | 15-60s |
| Twitter/X | 1080×1080 | 1:1 | 30 | 5-60s |
| LinkedIn | 1080×1080 | 1:1 | 30 | 15-60s |
| Facebook Reels | 1080×1920 | 9:16 | 30 | 15-60s |
| YouTube (landscape) | 1920×1080 | 16:9 | 30 | any |

If the user doesn't specify a platform, ask. If they say "social media" generically, default to 1080×1920 (9:16) since it covers TikTok, Reels, and Shorts.

---

## Building the Video

### 1. Scaffold the Project

#### Project Location

All video projects go inside a `videos/` directory in the current working directory:

```
project-root/
├── videos/                    # All Remotion video projects live here
│   ├── tiktok-5am-reasons/
│   ├── ig-product-launch/
│   └── ...
├── src/                       # The main project's code (untouched)
└── ...
```

If `videos/` doesn't exist, create it automatically. Each video gets its own subdirectory.

#### Existing vs New

Check for an existing Remotion project (look for `remotion.config.ts` or `package.json` with `remotion` dependency inside `videos/<name>/`). If yes, add compositions. If not, create a new one.

#### New Project Setup

```bash
mkdir -p videos/<project-name> && cd videos/<project-name>
npm init -y
npm i remotion @remotion/cli @remotion/bundler react react-dom
npm i -D typescript @types/react @types/react-dom
```

If using AI-generated visuals, also install:
```bash
npm i @google/genai
```

File structure:

```
videos/<project-name>/
├── src/
│   ├── Root.tsx              # Register all compositions
│   ├── Video.tsx             # Main video component
│   ├── components/           # Reusable animated components
│   │   ├── AnimatedText.tsx
│   │   ├── Logo.tsx          # (if logo provided)
│   │   └── ...
│   └── lib/
│       └── constants.ts      # Colors, fonts, timing
├── scripts/
│   └── generate-assets.ts    # (if using Nano Banana)
├── public/                   # Static assets (logos, images)
│   └── generated/            # (AI-generated images go here)
├── remotion.config.ts
├── tsconfig.json
├── package.json
└── render.sh                 # One-command render script
```

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "commonjs",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "scripts/**/*"]
}
```

#### remotion.config.ts

```ts
import { Config } from "@remotion/cli/config";
Config.setOverwriteOutput(true);
```

#### render.sh

```bash
#!/bin/bash
# Generate AI assets first (if applicable)
if [ -f scripts/generate-assets.ts ] && [ -n "$GEMINI_API_KEY" ]; then
  echo "🍌 Generating AI visuals..."
  npx tsx scripts/generate-assets.ts
fi

# Render the video
npx remotion render src/index.ts <CompositionId> out/video.mp4
echo "✅ Video rendered to out/video.mp4"
```

Make it executable: `chmod +x render.sh`

#### src/index.ts (entry point)

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
```

### 2. Write the Compositions

This is the creative core. Read `references/animation-patterns.md` for the full pattern library.

#### Core Remotion Concepts

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, Img, staticFile } from "remotion";
```

- **`useCurrentFrame()`** — returns the current frame number (starts at 0)
- **`useVideoConfig()`** — returns `{ width, height, fps, durationInFrames }`
- **`interpolate(frame, inputRange, outputRange, options?)`** — maps frame numbers to animation values
- **`spring({ frame, fps, config? })`** — physics-based animation (bouncy, natural)
- **`<Sequence from={frame} durationInFrames={n}>`** — show children only during a time window
- **`<Series>`** + **`<Series.Sequence>`** — auto-chain scenes back-to-back
- **`<AbsoluteFill>`** — full-screen positioned div for layering
- **`<Img src={staticFile("logo.png")} />`** — load images from `public/`

#### Root.tsx Pattern

```tsx
import { Composition } from "remotion";
import { MainVideo } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MainVideo"
      component={MainVideo}
      durationInFrames={450}  // 15s at 30fps
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
```

#### Animation Philosophy

Social media videos need to be **punchy and fast-moving**:

- **First 1-2 seconds**: Hook — big text, bold motion, something that stops the scroll
- **Middle**: Content delivery — stagger elements in, keep things moving, never let a frame feel static
- **Last 1-2 seconds**: CTA or payoff — logo reveal, final message

Key techniques:
- **Stagger entries** — reveal elements 5-10 frames apart
- **Use spring()** for organic bouncy motion
- **Use interpolate() with clamp** for controlled slides and fades
- **Scale + opacity together** — elements that grow 0.8→1.0 while fading in feel premium
- **Slight rotation on entry** — 5-10 degrees that resolves to 0 adds energy
- **Color transitions** — background shifts between scenes keep energy high

See `references/animation-patterns.md` for copy-paste animation recipes.

### 3. Handle Assets

**Logo**: Check project root and `public/` for existing logo files (`logo.png`, `logo.svg`, `favicon.*`). If found, mention it. If user wants it, create a `<Logo>` component.

**Images**: Copy to `public/` and use `<Img src={staticFile("filename")} />`. Always use Remotion's `<Img>` component.

**Colors**: Priority order:
1. **User-specified** — explicit color requests
2. **Design tokens** — `.specs/design-system/tokens.md` or theme files
3. **AI-inferred** — from project context
4. **Sensible defaults** — match the vibe described

Define in `src/lib/constants.ts` with source comments:

```ts
// Colors from .specs/design-system/tokens.md
export const COLORS = {
  primary: "#2D6A4F",
  secondary: "#52B788",
  background: "#0F0F0F",
  text: "#FEFAE0",
  accent: "#D4AF37",
};
```

**Fonts**: Priority order:
1. **Design tokens font** — tokens.md font family
2. **Project fonts** — `@fontsource/*` or fonts in `public/`
3. **Google Fonts** — via `@remotion/google-fonts`

```tsx
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont();
```

### 4. Preview and Render

**Preview** (opens browser):
```bash
npx remotion studio src/index.ts
```

**Render** final video:
```bash
npx remotion render src/index.ts <CompositionId> out/video.mp4
```

If render fails, check:
- Missing dependencies (run `npm i`)
- Asset files not in `public/`
- TypeScript errors (run `npx tsc --noEmit`)
- If using Nano Banana: ensure `GEMINI_API_KEY` is set and assets are generated first

---

## Identity Absorption Reference

How project context shapes the video:

| What you found | How it shapes the video |
|---------------|------------------------|
| Vision: "luxury real estate for HNW investors" | Premium feel, dark backgrounds, gold accents, authoritative copy |
| Vision: "fun fitness app for college students" | High energy, bright colors, casual language, fast cuts |
| Persona patience: Very Low | 1-2s per scene max, punchy text, no wasted frames |
| Persona patience: High | Can hold scenes 3-4s, room for subtle animations |
| Persona vocabulary: "properties" not "listings" | Use "properties" in all on-screen text |
| Tokens personality: Professional | Clean transitions, minimal bounce, restrained palette |
| Tokens personality: Bold | Big spring animations, rotation, saturated colors |

Tell the user what you absorbed: *"I read your vision, personas, and design tokens. This video will target [persona] with your brand colors and a [personality] feel."*

The project identity is a smart default, not a constraint — the user can always override.

---

## Video Types

### Text-Based (Most Common)

Kinetic typography, quote videos, listicles, announcements, countdowns. The key is **pacing and rhythm** — every 1-2 seconds, something new happens.

Patterns: words appearing one at a time, sentences sliding in, text scaling with spring physics, split-screen reveals, counter animations.

### Image/Media-Based

Photo slideshows, product showcases, before/after reveals. Use `<Img>` with Ken Burns zoom/pan via `interpolate()` on `transform: scale()`.

With Nano Banana: generate scene-specific imagery that matches the brand, then animate it.

### Data-Driven

Animated stats, chart reveals, number counters. Animate numbers with `interpolate()` + `Math.round()`. For charts, animate bar heights or SVG `stroke-dashoffset`.

---

## Common Pitfalls

- **Text too small**: Body text at least 48px, headlines 72px+. Phones are small.
- **Too much on screen**: One idea per scene. Reveal list items one at a time.
- **Animations too slow**: Entrance animations should complete in 10-15 frames (0.3-0.5s).
- **No visual hierarchy**: Use size, color, and weight contrast to guide the eye.
- **Forgetting the safe zone**: Stay within 90% of the frame for critical content.
- **Duration math wrong**: Always verify `durationInFrames` = `seconds × fps`. Don't let sequences exceed the composition duration.

---

## Multi-Platform Output

For multiple platforms, create separate compositions sharing the same components:

```tsx
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="TikTok" component={MainVideo} width={1080} height={1920} fps={30} durationInFrames={450} />
      <Composition id="Twitter" component={MainVideo} width={1080} height={1080} fps={30} durationInFrames={450} />
      <Composition id="YouTube" component={MainVideo} width={1920} height={1080} fps={30} durationInFrames={450} />
    </>
  );
};
```

Render each:
```bash
npx remotion render src/index.ts TikTok out/tiktok.mp4
npx remotion render src/index.ts Twitter out/twitter.mp4
```

With Nano Banana, generate assets at the right aspect ratio for each platform.
