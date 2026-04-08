# Plan 02 -- Backend Technical Plan

> Convex (real-time DB + actions) + Modal (BYOK rendering) + R2 (storage)

---

## 1. Convex Project Setup

```bash
# Initialize Convex in the project root
npx convex init

# This creates:
# convex/             -> backend code directory
# convex.json         -> project config
# .env.local          -> CONVEX_DEPLOYMENT + CONVEX_URL (auto-generated)
```

A **new** Convex project will be created for MotionKit (separate from existing projects).

---

## 2. Database Schema (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ─── PRESETS ──────────────────────────────────────────────
  presets: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("intro"),
      v.literal("title"),
      v.literal("lower-third"),
      v.literal("cta"),
      v.literal("transition"),
      v.literal("outro"),
      v.literal("full"),
    ),
    tags: v.array(v.string()),
    author: v.optional(v.string()),
    authorId: v.optional(v.id("users")),

    // Bundle
    bundleUrl: v.string(),          // R2 URL to the JS bundle
    bundleHash: v.optional(v.string()),

    // Composition defaults
    fps: v.number(),
    width: v.number(),
    height: v.number(),
    durationInFrames: v.number(),

    // Schema (stored as JSON string -- parsed client-side)
    inputSchema: v.string(),

    // Display
    thumbnailUrl: v.optional(v.string()),
    previewVideoUrl: v.optional(v.string()),

    // Marketplace
    isPublic: v.boolean(),
    downloads: v.optional(v.number()),
    rating: v.optional(v.number()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),

    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_author", ["authorId"])
    .searchIndex("search_presets", {
      searchField: "name",
      filterFields: ["category", "status", "isPublic"],
    }),

  // ─── USERS ────────────────────────────────────────────────
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(
      v.literal("user"),
      v.literal("creator"),
      v.literal("admin"),
    ),

    // BYOK -- encrypted API keys
    modalApiKey: v.optional(v.string()),       // encrypted
    awsAccessKeyId: v.optional(v.string()),    // encrypted
    awsSecretAccessKey: v.optional(v.string()),// encrypted
    awsRegion: v.optional(v.string()),

    // Auth
    externalId: v.optional(v.string()),        // Clerk/Auth0 user ID
    plan: v.optional(v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise"),
    )),
    renderCredits: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_externalId", ["externalId"]),

  // ─── COLLECTIONS ──────────────────────────────────────────
  collections: defineTable({
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
    presetIds: v.array(v.id("presets")),
  })
    .index("by_user", ["userId"]),

  // ─── SAVED PRESETS (user customizations) ──────────────────
  savedPresets: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
    name: v.string(),
    customProps: v.string(),      // JSON string of overridden props
  })
    .index("by_user", ["userId"])
    .index("by_preset", ["presetId"]),

  // ─── RENDER JOBS ──────────────────────────────────────────
  renderJobs: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
    bundleUrl: v.string(),
    inputProps: v.string(),       // JSON string of render props

    // Status
    status: v.union(
      v.literal("queued"),
      v.literal("rendering"),
      v.literal("done"),
      v.literal("failed"),
    ),
    progress: v.optional(v.number()),   // 0-100
    error: v.optional(v.string()),

    // Output
    outputUrl: v.optional(v.string()),  // R2 URL to rendered video
    outputSize: v.optional(v.number()), // bytes

    // Rendering config
    renderEngine: v.union(
      v.literal("modal"),
      v.literal("lambda"),
      v.literal("platform"),
    ),

    // Timing
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),  // TTL for R2 cleanup
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  // ─── PROJECTS ─────────────────────────────────────────────
  projects: defineTable({
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
    presetEntries: v.array(v.object({
      presetId: v.id("presets"),
      savedPresetId: v.optional(v.id("savedPresets")),
      order: v.number(),
    })),
  })
    .index("by_user", ["userId"]),
});
```

---

## 3. Convex Functions

### 3.1 Presets (`convex/presets.ts`)

| Function | Type | Purpose |
|----------|------|---------|
| `list` | query | List presets with filters (category, tags, search) |
| `get` | query | Get single preset by ID |
| `getByBundleUrl` | query | Lookup preset by bundle URL |
| `create` | mutation | Create new preset (creator upload flow) |
| `update` | mutation | Update preset metadata |
| `archive` | mutation | Soft-delete (set status: archived) |
| `incrementDownloads` | mutation | Bump download counter |

### 3.2 Render Jobs (`convex/renderJobs.ts`)

| Function | Type | Purpose |
|----------|------|---------|
| `create` | mutation | Create queued render job |
| `listByUser` | query | All jobs for a user (real-time subscription) |
| `updateStatus` | mutation | Update job status + progress |
| `markDone` | mutation | Set done + output URL |
| `markFailed` | mutation | Set failed + error message |

### 3.3 Render Actions (`convex/actions/`)

#### `renderWithModal.ts` (Primary render engine)

```typescript
// Convex action (runs server-side, can call external APIs)
export const dispatchRender = action({
  args: {
    jobId: v.id("renderJobs"),
    bundleUrl: v.string(),
    inputProps: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Get user's encrypted Modal API key from Convex
    const user = await ctx.runQuery(internal.users.get, { id: args.userId });
    const modalKey = decrypt(user.modalApiKey);

    // 2. Update job status to "rendering"
    await ctx.runMutation(internal.renderJobs.updateStatus, {
      jobId: args.jobId,
      status: "rendering",
      startedAt: Date.now(),
    });

    // 3. Call Modal API to run Remotion render
    //    Modal function: fetches bundle from R2, runs renderMedia()
    const response = await fetch("https://api.modal.com/v1/...", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${modalKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bundleUrl: args.bundleUrl,
        inputProps: JSON.parse(args.inputProps),
        outputFormat: "mp4",
      }),
    });

    // 4. Poll for completion or use webhook
    // 5. On completion: upload output to R2, update job
    await ctx.runMutation(internal.renderJobs.markDone, {
      jobId: args.jobId,
      outputUrl: outputR2Url,
      outputSize: fileSize,
      completedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  },
});
```

#### `renderWithLambda.ts` (Alternative for AWS users)

Uses `@remotion/lambda` client to:
1. Deploy a Remotion Lambda function (one-time setup)
2. Call `renderMediaOnLambda()` with the user's AWS credentials
3. Poll `getRenderProgress()` for status updates
4. Return the S3 output URL

### 3.4 Users (`convex/users.ts`)

| Function | Type | Purpose |
|----------|------|---------|
| `getOrCreate` | mutation | Upsert user on auth |
| `get` | query | Get current user |
| `updateApiKeys` | mutation | Store encrypted BYOK keys |
| `getApiKeys` | internal query | Decrypt keys (internal only) |

### 3.5 Collections & Projects

Standard CRUD queries/mutations with user ownership validation.

---

## 4. API Key Encryption (`convex/lib/encryption.ts`)

User API keys are encrypted at rest in Convex using AES-256-GCM.

```typescript
// Encryption key stored as Convex environment variable
// ENCRYPTION_KEY = 32-byte hex string

export function encrypt(plaintext: string): string {
  // AES-256-GCM encryption
  // Returns: iv:ciphertext:authTag (base64)
}

export function decrypt(encrypted: string): string {
  // Reverse of encrypt
}
```

---

## 5. Modal Render Worker

A Modal function (Python) that runs the actual Remotion render:

```python
# modal_render.py -- deployed to Modal
import modal

app = modal.App("motionkit-renderer")

# Container image with Node.js + Remotion + Chromium
image = (
    modal.Image.debian_slim()
    .apt_install("chromium", "fonts-liberation")
    .run_commands("npm install -g @remotion/cli remotion")
)

@app.function(image=image, timeout=300, memory=4096)
def render_video(bundle_url: str, input_props: dict, output_format: str = "mp4"):
    """
    1. Download preset bundle from R2
    2. Create a minimal Remotion project that imports the bundle
    3. Run: npx remotion render <entry> --props <json>
    4. Upload output to R2
    5. Return R2 URL
    """
    pass
```

**Alternative**: Node.js-based Modal function using `@remotion/renderer` directly.

---

## 6. R2 Storage Layout

```
motionkit-r2-bucket/
├── bundles/                    # Preset JS bundles
│   ├── text-title-v1.js
│   ├── logo-intro-v1.js
│   └── ...
├── thumbnails/                 # Preset preview images
│   ├── text-title.png
│   └── ...
├── previews/                   # Preset demo videos
│   ├── text-title.mp4
│   └── ...
├── renders/                    # User-rendered outputs (TTL: 7 days)
│   ├── {userId}/{jobId}.mp4
│   └── ...
└── assets/                     # User-uploaded images/logos
    ├── {userId}/{filename}
    └── ...
```

R2 bucket config:
- CORS: Allow `GET` from app domain, `PUT` from API routes
- Lifecycle rule: Delete `renders/*` after 7 days
- Public access: `bundles/`, `thumbnails/`, `previews/` via Cloudflare CDN
- Private: `renders/`, `assets/` via signed URLs

---

## 7. Real-Time Data Flow

```
Convex reactive queries power the entire real-time experience:

┌──────────────┐     reactive query      ┌─────────────────┐
│   Frontend   │ ◄───────────────────── │    Convex DB    │
│   Component  │   (auto-updates when    │   renderJobs    │
│              │    document changes)     │   table         │
└──────────────┘                          └────────┬────────┘
                                                   │
                                          mutations from
                                          Convex action
                                                   │
                                          ┌────────▼────────┐
                                          │  Convex Action  │
                                          │  (server-side)  │
                                          │                  │
                                          │  Polls Modal or │
                                          │  receives webhook│
                                          └─────────────────┘
```

No WebSockets or SSE to build -- Convex handles this natively.

---

## 8. Phase 1 Backend Deliverables

1. New Convex project initialized (`npx convex init`)
2. Schema with `presets` and `renderJobs` tables (minimal)
3. `presets.get` query (return hardcoded preset metadata)
4. `renderJobs.create` mutation
5. `renderJobs.listByUser` reactive query
6. `renderJobs.updateStatus` + `markDone` mutations
7. One Convex action: `dispatchRender` (initially mock -> then Modal integration)
8. Encryption utility for API keys
9. R2 bucket created with CORS configured

---

## 9. Security Considerations

| Threat | Mitigation |
|--------|------------|
| Malicious preset bundles (XSS, data exfil) | Sandboxed iframe preview, CSP, bundle validation on upload |
| API key exposure | AES-256-GCM encryption at rest, internal-only decrypt queries |
| Unauthorized renders | Auth check on `renderJobs.create`, user ownership validation |
| R2 abuse (unlimited uploads) | File size limits, rate limiting, user quotas |
| SSRF from Modal render | Allowlist R2 domain only in render worker |
