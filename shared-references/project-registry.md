# Project Registry

The project registry (`projects.json` in the DonatoSkills root) is a **routing table** that maps project folders to their Buffer channels and API keys.

**Every skill reads this file.** It answers: "What social channels go with this project?"

---

## Why This Exists

You work inside a project folder. The project folder has the code, the brand context (`.specs/`), the content. But it doesn't know which Buffer channels to post to or which API keys to use.

`projects.json` bridges that gap:

```
~/acme-corp/          ← you work here (code, .specs/, brand context)
   └── .specs/

~/my-saas/            ← different project, different folder
   └── .specs/

~/DonatoSkills/
   └── projects.json  ← routes each folder to its Buffer channels + API keys
```

Each project entry maps a folder to:
- A set of **Buffer channels** (which social accounts to post to)
- **API credentials** (which Buffer account, which Cloudinary account)
- **Default settings** (tone, posting frequency, content pillars)

The **brand context itself** (vision, personas, design tokens) lives in the project folder's `.specs/` directory — not in `projects.json`. The registry just points to it via `specs_path`.

---

## Schema

```json
{
  "_schema": "DonatoSkills Project Registry v1",
  "_docs": "shared-references/project-registry.md",

  "projects": {
    "project-slug": {
      "name": "Human-Readable Name",
      "description": "Brief description of this project/brand",
      "specs_path": "/absolute/path/to/.specs/",
      "brand_brief": "relative/path/to/brand-brief.md",
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "organization_id": "org_id_from_buffer",
        "channels": {
          "twitter": {
            "id": "buffer_channel_id",
            "name": "display_name",
            "username": "@handle"
          },
          "instagram": {
            "id": "buffer_channel_id",
            "name": "display_name",
            "username": "@handle"
          }
        }
      },
      "cloudinary": {
        "cloud_name_env": "CLOUDINARY_CLOUD_NAME",
        "api_key_env": "CLOUDINARY_API_KEY",
        "api_secret_env": "CLOUDINARY_API_SECRET"
      },
      "defaults": {
        "tone": "casual, funny, confident",
        "content_pillars": ["product", "education", "personality"],
        "posting_frequency": {
          "twitter": "daily",
          "instagram": "3x/week"
        }
      },
      "created": "2026-03-15",
      "updated": "2026-03-15"
    }
  },

  "default_project": "project-slug"
}
```

---

## Field Reference

### Project Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable project/brand name |
| `description` | string | No | Brief description of the brand/audience |
| `specs_path` | string\|null | No | Absolute path to the project's `.specs/` directory (for SDD projects). If set, skills read vision.md, personas, and design tokens from here. |
| `brand_brief` | string\|null | No | Relative path (from DonatoSkills root) to the brand brief markdown file |
| `buffer` | object | Yes | Buffer API configuration for this project |
| `cloudinary` | object | No | Cloudinary configuration (can be shared across projects) |
| `defaults` | object | No | Default content settings for this project |
| `created` | string | Yes | ISO date when the project was added |
| `updated` | string | Yes | ISO date of last update |

### Buffer Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key_env` | string | Yes | Name of the environment variable containing the Buffer API key. Defaults to `BUFFER_API_KEY`. For multiple Buffer accounts, use unique names like `BUFFER_API_KEY_CLIENT_XYZ`. |
| `organization_id` | string\|null | No | Buffer organization ID. If null, the skill queries it on first use and can backfill this field. |
| `channels` | object | Yes | Map of platform → channel config. Keys are platform names (`twitter`, `instagram`, `linkedin`, `tiktok`, `facebook`, `youtube`, `threads`, `bluesky`, `mastodon`). |

### Channel Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Buffer channel ID (used in API calls) |
| `name` | string | Yes | Display name of the channel |
| `username` | string | No | Platform username/handle |

### Cloudinary Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cloud_name_env` | string | Yes | Env var for Cloudinary cloud name |
| `api_key_env` | string | Yes | Env var for Cloudinary API key |
| `api_secret_env` | string | Yes | Env var for Cloudinary API secret |

### Default Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tone` | string | No | Default tone/voice for content |
| `content_pillars` | string[] | No | Default content pillars |
| `posting_frequency` | object | No | Platform → frequency (e.g., `"twitter": "daily"`) |

---

## How Skills Resolve the Active Project

The primary mechanism is **folder matching** — you're working in a project folder, and the registry maps that folder to its channels.

```
1. CWD MATCH — Current working directory is inside a project's specs_path
   → Auto-select that project (most common case — zero friction)

2. ORCHESTRATED — Content-engine passed project_id in orchestrated mode params
   → Use that project directly

3. EXPLICIT — User said "for [project name]" or "for [brand]"
   → Match against project names and slugs

4. SINGLE PROJECT — Only one project in the registry
   → Use it automatically (no need to ask)

5. ASK — Multiple projects exist, can't auto-detect
   → "I see multiple projects: [list]. Which one is this for?"
```

**The typical flow**: You're in `~/acme-corp/`, you say "make me a video." The skill reads `projects.json`, sees Acme's `specs_path` is `/Users/you/acme-corp/.specs`, matches your cwd, and loads Acme's channels and API keys. You never think about project selection.

**Once resolved**, the skill uses the project's:
- **Buffer channels** — only shows/uses channels for this project
- **API keys** — reads the correct env var for Buffer and Cloudinary
- **Brand context** — reads specs_path or brand_brief for tone, audience, style
- **Defaults** — pre-fills tone, pillars, frequency

---

## Multiple Buffer Accounts

### Scenario A: One Buffer Account, Multiple Brands

All channels live under one Buffer organization. Different projects use different channels from the same account.

```json
{
  "projects": {
    "brand-a": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "channels": {
          "twitter": { "id": "aaa111", "name": "Brand A", "username": "@brand_a" }
        }
      }
    },
    "brand-b": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "channels": {
          "twitter": { "id": "bbb222", "name": "Brand B", "username": "@brand_b" },
          "instagram": { "id": "ccc333", "name": "Brand B", "username": "@brand_b" }
        }
      }
    }
  }
}
```

Both projects share the same `BUFFER_API_KEY`. The registry just maps which channels belong to which project.

### Scenario B: Separate Buffer Accounts

Each project has its own Buffer account with a separate API key.

```json
{
  "projects": {
    "my-brand": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "channels": { "twitter": { "id": "aaa111", "name": "My Brand" } }
      }
    },
    "client-xyz": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY_CLIENT_XYZ",
        "channels": { "twitter": { "id": "xxx999", "name": "Client XYZ" } }
      }
    }
  }
}
```

The `.env` file would contain:
```
BUFFER_API_KEY=my_personal_token
BUFFER_API_KEY_CLIENT_XYZ=client_xyz_token
```

### Scenario C: Shared Cloudinary, Separate Buffer

Most common setup — one Cloudinary account for all media hosting, separate Buffer accounts per client.

```json
{
  "client-abc": {
    "buffer": { "api_key_env": "BUFFER_API_KEY_ABC" },
    "cloudinary": {
      "cloud_name_env": "CLOUDINARY_CLOUD_NAME",
      "api_key_env": "CLOUDINARY_API_KEY",
      "api_secret_env": "CLOUDINARY_API_SECRET"
    }
  }
}
```

---

## Adding a New Project

### Interactive (recommended)

Say: "Add a new project" or "Set up a new client". The skill will:

1. Ask for the project name and description
2. Query Buffer for connected channels (using the specified API key)
3. Let you pick which channels belong to this project
4. Ask about brand context (specs path, tone, pillars)
5. Write the entry to `projects.json`

### Manual

Add a new key to `projects.projects` in `projects.json`:

```json
"new-client": {
  "name": "New Client",
  "description": "E-commerce brand for pet products",
  "specs_path": null,
  "brand_brief": null,
  "buffer": {
    "api_key_env": "BUFFER_API_KEY",
    "organization_id": null,
    "channels": {}
  },
  "defaults": {
    "tone": "friendly, warm",
    "content_pillars": ["product", "education", "community"]
  },
  "created": "2026-03-15",
  "updated": "2026-03-15"
}
```

Then run "sync channels for new-client" — the social-media skill will query Buffer, show available channels, and let you assign them.

---

## Calendar Integration

When the content-engine creates a calendar, it includes the `project_id`:

```json
{
  "campaign": "spring-launch",
  "project_id": "client-xyz",
  "brand": "Client XYZ",
  "channels": [...]
}
```

This means:
- Calendars are scoped to a project
- Resume/retry operations use the correct API keys
- Analytics are automatically per-project
- The content-engine can list calendars per project

---

## Analytics Integration

When the analytics skill (future) checks post performance:

1. Read `projects.json` → get the project's Buffer channels and API key
2. Query Buffer for post metrics using the correct API key
3. Store metrics per project
4. Generate per-project performance reports
5. Feed per-project learnings back into the content-engine

This ensures Brand A's engagement data never pollutes Brand B's optimization loop.

---

## Skill Reference

### For All Skills

Before starting work, read `projects.json` and resolve the active project:

```
1. Read projects.json from the DonatoSkills root
2. Resolve which project to use (see resolution order above)
3. Set the Buffer API key: read from process.env[project.buffer.api_key_env]
4. Filter channels to only this project's channels
5. Read brand context from specs_path or brand_brief
6. Apply defaults (tone, pillars) as pre-filled answers
```

### For Content-Engine

- Include `project_id` in every `calendar.json`
- Use only the project's channels when planning
- Read brand context from the project's specs_path or brand_brief
- Pass project_id to orchestrated skill invocations

### For Social-Media

- Only show/use channels from the active project
- Use the project's Buffer API key (may differ per project)
- Tag posts with `source: "donatoskills-{project_id}"`

### For Creation Skills (remotion-video, image-gen, text-writer)

- Read brand context from the project's specs_path (if set)
- Apply project defaults for tone and content pillars
- In orchestrated mode, project context comes from the content-engine
