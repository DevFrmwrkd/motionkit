# FRMWRKD Motion Graphics Marketplace — Master Prompt

## Project codename

**MotionKit** (working title) — A plug-and-play marketplace and workstation for Remotion-based motion graphics presets.

---

## Vision

Build a browser-based video production workstation where users can browse, customize, and render motion graphics presets without writing code. Presets are community-contributed or custom-built, and rendering happens via the user's own compute keys (BYOK — bring your own key). The platform is a marketplace + workstation, not just a template gallery.

Think: **Canva meets Envato for programmatic video** — powered by Remotion, where the community supplies templates and users bring their own rendering compute.

---

## The core problem this solves

Remotion's current architecture requires a central `Root.tsx` file where every composition is statically imported and registered. Adding, removing, or swapping a preset means editing this shared file, rebuilding, and redeploying. AI agents consistently fail at this because they're editing a coupled monolith — one wrong import breaks everything. Presets are not truly swappable.

**MotionKit eliminates Root.tsx as a bottleneck** by introducing a preset runtime — a host app that never changes, loading presets dynamically as plugins at runtime from independent bundles stored on Cloudflare R2.

---

## User stories

### As a content creator (primary user)
- I browse a marketplace of motion graphics presets on the left sidebar
- I select presets I need for a video project (intro, title card, lower third, CTA, transition, outro)
- For each preset, I see a live preview powered by the Remotion Player (client-side, no server needed)
- I customize each preset via dynamic input fields: text, colors (color picker), fonts (font selector), images, duration, toggles
- Changes reflect instantly in the preview — no rebuild, no page reload
- I hit "Render" and the video renders using my own Modal API key (BYOK)
- I can render 5 variations of the same preset with different text/colors in one batch
- I move to the next preset in my project, customize it, render, repeat
- I organize presets into folders/collections
- I can save customized presets as my own variations
- I see a real-time render queue showing progress (queued → rendering → 40% → done → download)
- Rendered videos are stored temporarily and downloadable

### As a preset creator
- I build a self-contained Remotion composition following the preset contract
- I define an input schema that determines what controls users see
- I test locally with `npx remotion preview`
- I upload my preset bundle to the marketplace or to a private account
- I never touch the host app's code — my preset is fully independent
- AI agents can build presets for me in isolation — they only need the contract spec

### As a business/agency
- I hire a motion designer to build branded preset packs
- They follow the preset contract and deliver bundles
- I upload them to my private workspace — zero code changes to the platform
- My team uses these presets with our brand colors/fonts locked in

---

## Preset contract (the core architecture)

Every preset is a single JavaScript bundle hosted on Cloudflare R2 that exports one standardized object:

```typescript
// PresetExport interface — the contract every preset must fulfill

interface PresetExport {
  // The React component that renders the motion graphic
  component: React.FC<Record<string, any>>;

  // JSON schema defining the input form the user sees
  schema: {
    [fieldName: string]: {
      type: "text" | "color" | "font" | "image" | "number" | "duration" | "select" | "toggle";
      label?: string;
      default: any;
      options?: string[];       // for "select" and "font" types
      min?: number;             // for "number" and "duration" types
      max?: number;
      step?: number;
      group?: string;           // group fields visually (e.g. "Typography", "Colors")
    };
  };

  // Composition metadata
  meta: {
    name: string;
    description?: string;
    category?: string;          // "intro" | "title" | "lower-third" | "cta" | "transition" | "outro" | "full"
    tags?: string[];
    author?: string;
    fps: number;                // typically 30 or 60
    width: number;              // typically 1920
    height: number;             // typically 1080
    durationInFrames: number;   // default duration (can be overridden if schema has "duration" field)
    thumbnail?: string;         // URL to preview image
    previewVideo?: string;      // URL to demo video
  };
}
```

### Why this contract matters

- **Zero coupling**: The host app imports nothing at build time. It loads presets at runtime via dynamic `import()` from R2 URLs.
- **AI-agent friendly**: An AI agent builds a preset in isolation — it only needs to satisfy this interface. No shared files to break.
- **Truly swappable**: Adding/removing/swapping presets is a database operation (add/remove a Convex document), not a code change.
- **Schema-driven UI**: The input form is generated dynamically from the schema. Color pickers, font selectors, text inputs, toggles — all derived from the schema definition.

---

## Tech stack

### Frontend — Cloudflare Pages
- **Framework**: Next.js (or potentially Astro if SSR needs are minimal)
- **UI**: React + Tailwind CSS
- **Preview**: `@remotion/player` for client-side live preview
- **Dynamic loading**: Presets loaded at runtime via dynamic `import()` from R2 bundle URLs
- **Real-time**: Convex reactive queries for render queue status updates

### Backend — Convex
- **Why Convex over PostgreSQL**: Real-time subscriptions are native (critical for render progress streaming), document model maps cleanly to presets/users/collections, built-in file storage for thumbnails, no need to bolt on WebSockets + Redis + BullMQ separately. Already a known tool in the FRMWRKD stack (used in HR pipeline, Editor OS).
- **Data model**:
  - `presets` — metadata, schema, bundle URL, author, category, tags, ratings
  - `users` — auth, profile, API keys (encrypted), plan/tier
  - `collections` — user-created folders/groups of presets
  - `savedPresets` — user's customized versions of presets (overridden props)
  - `renderJobs` — job queue with real-time status (queued → rendering → progress% → done → URL)
  - `projects` — groupings of presets for a specific video (e.g. "Brand Intro Pack" with 6 presets)

### Storage — Cloudflare R2
- **Why R2 over S3/Hetzner Object Storage**: Zero egress fees. Preset bundles get fetched on every preview and render — with a marketplace this gets expensive fast on egress-billed storage. R2 + Cloudflare CDN edge caching = global fast delivery at zero egress cost.
- **What lives on R2**:
  - Preset bundles (JS files, typically 50KB–500KB each)
  - Preset thumbnails and preview videos
  - Temporarily rendered videos (with TTL/expiry)
  - User-uploaded assets (logos, images used in presets)

### Rendering — BYOK (bring your own key)
- **Primary: Modal** — Users plug in their Modal API key. The platform sends the preset bundle URL + input props to a pre-built Remotion render function running on Modal's serverless GPU/CPU infrastructure. The user's Modal account gets billed for compute. Modal is preferred because setup is simple (one API key vs. AWS IAM roles/S3 buckets) and it has a $30/month free tier.
- **Secondary: AWS Lambda** — Power users who already have AWS accounts can use Remotion Lambda, which is Remotion's native serverless rendering. Faster for parallel rendering but more complex setup (IAM roles, S3 buckets, Lambda concurrency limits).
- **Future: Platform-hosted render tier** — Optionally offer a "we render it for you" tier using a Remotion renderer on a dedicated Hetzner VPS. Users without their own keys pay per-render. This is a monetization path.

### Why NOT Vercel for hosting
- The template-vercel approach uses Vercel Sandbox for rendering and Vercel Blob for storage. This couples the platform to Vercel's pricing, including $0.15/GB bandwidth overages and per-seat costs that scale poorly.
- Vercel also charges for all traffic including malicious requests — a documented case showed a $23,000 bill from a DDoS attack.
- The marketplace serves preset bundles repeatedly (every preview, every render). R2's zero egress makes this free regardless of traffic.
- Cloudflare Pages + R2 keeps billing predictable and in one ecosystem.

### Why NOT Hostinger
- Hostinger Cloud Startup is traditional shared/cloud hosting optimized for PHP/WordPress sites. It doesn't provide the container orchestration, Node.js flexibility, or S3-compatible storage needed for this architecture.
- No native serverless functions, no edge network, no real-time capabilities.

### Where Hetzner VPS fits
- NOT for the frontend or API (Convex + CF Pages handle that).
- YES for a future self-hosted Remotion render worker (the "platform-hosted" tier where users without their own keys pay per-render).
- YES for any persistent background processes: preset bundle validation, thumbnail generation, abuse detection, etc.
- The existing Hetzner + Coolify setup can host these workers alongside other FRMWRKD infrastructure.

---

## Workstation UI layout

```
┌──────────────────────────────────────────────────────────────────┐
│ My projects  / Brand Intro Pack                     5 of 6 done │
├────────────┬────────────────────────────┬────────────────────────┤
│            │                            │                        │
│  PRESET    │     LIVE PREVIEW           │   INPUT CONTROLS       │
│  LIBRARY   │                            │                        │
│            │  ┌──────────────────────┐  │   Headline text        │
│  [Search]  │  │                      │  │   ┌──────────────┐    │
│            │  │   Remotion Player    │  │   │ Episode 12   │    │
│  My presets│  │                      │  │   └──────────────┘    │
│  Community │  │   Props update =     │  │                        │
│  Hired     │  │   instant re-render  │  │   Primary color        │
│            │  │                      │  │   [■] [■] [■]          │
│  ──────    │  └──────────────────────┘  │                        │
│  Selected  │  [▶────────────○────]      │   Font                 │
│  (6):      │                            │   ┌──────────────┐    │
│            │     RENDER QUEUE           │   │ Inter     ▾  │    │
│  [Intro]   │                            │   └──────────────┘    │
│  [Title]*  │  Intro — "FRMWRKD..." ✓   │                        │
│  [Lower]   │  Title — "Episode 12" ◉   │   Duration             │
│  [CTA  ]   │  Lower — "Zack T..."  ○   │   ┌──────────────┐    │
│  [Trans.]  │  CTA   — "Subscribe"  ○   │   │ 3.0s      ▾  │    │
│  [Outro]   │                            │   └──────────────┘    │
│            │                            │                        │
│            │                            │   [    RENDER     ]    │
│            │                            │   [ + 5 variations ]   │
└────────────┴────────────────────────────┴────────────────────────┘
```

### Panel breakdown

**Left — Preset library**
- Search/filter presets by name, category, tags
- Sections: "My presets" (saved/custom), "Community" (marketplace), "Hired/Custom" (branded packs)
- Currently selected presets for the active project shown at bottom
- Active preset highlighted (amber), others muted (purple)
- Drag to reorder presets in project sequence

**Center — Live preview + render queue**
- Top: Remotion Player showing the active preset with current props. Scrubbing timeline. Plays in real-time at correct FPS.
- Bottom: Render queue with real-time status updates (powered by Convex reactive queries). Shows all renders for the current session — completed, in-progress, queued.

**Right — Input controls**
- Dynamically generated from the active preset's schema
- Field types: text input, color picker, font selector (dropdown), number/duration slider, image upload, toggle, select dropdown
- Fields grouped by schema `group` property (e.g. "Typography", "Colors", "Layout")
- Changes update the Remotion Player props in real-time
- "Render" button triggers a single render
- "+ N variations" button opens a batch dialog where user defines prop variations (e.g. 5 different headline texts) and queues all at once

---

## Render flow (detailed)

1. User customizes a preset and clicks "Render"
2. Frontend creates a `renderJob` document in Convex with status `queued`, the preset bundle URL, input props, and the user's encrypted Modal API key
3. A Convex action picks up the job, decrypts the user's Modal API key, and calls Modal's API
4. Modal spins up a serverless container with Remotion installed, fetches the preset bundle from R2, runs `renderMedia()` with the provided props
5. Modal streams progress back (or the Convex action polls Modal's job status)
6. Convex updates the `renderJob` document: `rendering` → progress percentage → `done` + output URL
7. The frontend's reactive query on `renderJobs` updates the render queue UI in real-time
8. Rendered video is uploaded to R2 (temp storage with 24h–7d TTL)
9. User downloads or the video is available for further use

### Batch/variations flow
- User defines N variations (different text, colors, etc.)
- Frontend creates N `renderJob` documents in Convex, each with slightly different props
- All N jobs are dispatched to Modal concurrently
- Render queue shows all N with individual progress
- All N complete independently — user can download each or bulk-download

---

## Build phases

### Phase 1 — Core render loop (validate the infra)
- Fork/reference `template-vercel` render flow pattern
- Build one hardcoded preset
- Swap Vercel Sandbox → Modal for rendering (or local Remotion CLI for initial testing)
- Swap Vercel Blob → Cloudflare R2 for output storage
- Get the render → SSE progress → download flow working
- Deploy frontend on Cloudflare Pages
- **Deliverable**: A page where you type text, click render, see progress, download .mp4

### Phase 2 — Preset contract + dynamic loader (the hard part)
- Define and implement the `PresetExport` contract
- Build the dynamic loader: host app loads preset bundles from R2 URLs at runtime via `import()`
- Build the schema-driven form generator (reads preset schema → renders input controls)
- Test with 3-4 diverse presets (text title, logo intro, lower third, transition)
- Verify presets are truly swappable: add/remove a preset by changing a Convex document, zero code changes
- Verify AI agents can build presets in isolation given only the contract spec
- **Deliverable**: A page with a preset selector, dynamic input form, and live Remotion Player preview — all driven by runtime-loaded presets

### Phase 3 — Workstation UI
- Build the three-panel layout (preset library | preview + queue | input controls)
- Implement Convex data model: presets, users, collections, savedPresets, renderJobs, projects
- Build the render queue with Convex real-time updates
- Implement BYOK key management (user stores their Modal API key, encrypted in Convex)
- Implement folders/collections and saved preset variations
- Implement batch rendering (N variations)
- Implement project concept (group of presets for one video)
- **Deliverable**: Fully functional workstation where a user can assemble a 6-preset video project, customize each, and batch render

### Phase 4 — Marketplace + community
- Public preset publishing flow (creator uploads bundle + metadata)
- Preset discovery: categories, tags, search, sorting (popular, recent, trending)
- Ratings and reviews
- Creator profiles
- "Hire a creator" flow (request custom preset packs)
- Monetization: free presets, premium presets, creator revenue share
- **Deliverable**: Public marketplace where creators publish and users discover presets

### Phase 5 — Platform-hosted render tier (monetization)
- Run a Remotion render worker on Hetzner VPS
- Users without their own Modal/AWS keys can pay per-render
- Credit system or subscription tiers
- This is the SaaS monetization layer on top of the free marketplace
- **Deliverable**: "Render with MotionKit" option alongside BYOK

---

## Key technical risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dynamic `import()` of preset bundles from R2 may hit CORS/CSP issues | Presets won't load | R2 supports custom CORS headers; preset bundles served as ES modules with correct `Content-Type` |
| Preset bundles could contain malicious code (XSS, data exfil) | Security vulnerability | Render presets in sandboxed iframe for preview; validate bundles on upload; CSP restricts network access |
| Remotion Player may not support dynamically loaded components cleanly | Core feature breaks | Test early in Phase 2; fallback is to use Remotion's `lazyComponent` prop or iframe-based isolation |
| Modal API doesn't natively support Remotion rendering | Render pipeline fails | Build a custom Modal function that installs Remotion + Chromium in the container image; test in Phase 1 |
| Convex free tier limits may constrain growth | Scaling bottleneck | Convex free tier is generous for early stage; paid tier when revenue justifies it |
| Remotion licensing for cloud rendering requires Cloud Rendering Units | Legal/cost risk | Budget for Remotion license; required for commercial cloud rendering per their terms |

---

## Remotion licensing note

Remotion requires a license for commercial use and specifically for cloud rendering setups. Cloud Rendering Units must be purchased for server-side rendering. This is a real cost to budget for. See: https://remotion.pro/license

---

## Reference links

- Remotion docs: https://remotion.dev/docs
- Remotion Vercel template (reference for render flow): https://github.com/remotion-dev/template-vercel
- Remotion Vercel Sandbox rendering: https://remotion.dev/docs/vercel-sandbox
- Remotion Lambda (alternative render backend): https://remotion.dev/docs/lambda
- Remotion Player (client-side preview): https://remotion.dev/player
- Modal docs: https://modal.com/docs
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- Convex docs: https://docs.convex.dev/

---

## Summary

MotionKit is a Remotion-powered motion graphics marketplace and workstation. Its core innovation is a **preset plugin architecture** that decouples compositions from the host app via a standardized contract, enabling true plug-and-play preset swapping without code changes. The stack is **Cloudflare Pages + Convex + R2 + Modal (BYOK)**, chosen for real-time capabilities, zero egress costs, and serverless scalability. The build follows five phases from core render loop through marketplace and monetization.
