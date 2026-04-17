# MotionKit — Project Guide

## What is this?

MotionKit is a Remotion-powered motion graphics marketplace and workstation. Users browse, customize, and render motion graphics presets without code. The core innovation is a **preset plugin architecture** — presets load dynamically at runtime from R2 bundles via the `PresetExport` contract.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS — in `/app`
- **Backend**: Convex (real-time DB + serverless functions) — in `/convex`
- **Video**: Remotion + @remotion/player for preview, @remotion/cli for rendering
- **Storage**: Cloudflare R2 (zero egress, CDN-cached preset bundles)
- **Hosting (primary)**: Vercel → `remotion-kit.com`
- **Hosting (secondary/dev)**: Cloudflare Workers (OpenNext adapter) → `motionkit.frmwrkd-media.workers.dev`
- **Rendering**: Modal API (BYOK) or Remotion Lambda (alt)
- **UI**: Shadcn/UI (initialized, 14 components), lucide-react icons, react-colorful, framer-motion

## Deployment URLs

- **Production**: https://remotion-kit.com (Vercel, project `motionkit`, team `theo-vas-projects`)
- **Dev/Preview**: https://motionkit.frmwrkd-media.workers.dev (Cloudflare Workers, OpenNext)
- **Convex (canonical)**: `https://superb-oriole-955.convex.cloud` — matches Vercel prod env. ALL wirings must point here.
- **R2 uploader Worker**: separate Cloudflare Worker in `r2-uploader/` (HMAC-signed PUT for rendered MP4s) — not related to frontend host.

## Project Structure

```
motionkit/
├── app/                    # Next.js frontend (Vercel primary, Cloudflare Workers secondary)
│   └── src/
│       ├── app/            # App Router pages
│       ├── components/     # React components (workstation/, preset/, marketplace/, shared/)
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities (convex.ts, types.ts)
├── convex/                 # Convex backend
│   ├── schema.ts           # 6 tables: presets, users, collections, savedPresets, renderJobs, projects
│   ├── presets.ts           # Preset CRUD + search
│   ├── renderJobs.ts        # Render job queue
│   ├── users.ts             # User management + BYOK keys
│   ├── collections.ts       # Preset folders
│   ├── projects.ts          # Video project groupings
│   ├── savedPresets.ts      # User's customized preset variations
│   └── actions/             # Server-side actions (render dispatch)
├── presets/                 # Local preset development
│   └── _template/           # Starter template with PresetExport contract
├── docs/                    # Plans and architecture docs
│   ├── CONTENT-MAP.md       # Full file tree + key files index
│   └── plans/               # 00-overview, 01-frontend, 02-backend, 03-infrastructure
└── scripts/                 # Build & deployment scripts
```

## Key Architecture Concept: Preset Contract

Every preset is a single JS bundle exporting:
```typescript
interface PresetExport {
  component: React.FC<Record<string, unknown>>;  // The Remotion composition
  schema: Record<string, SchemaField>;            // Input form definition
  meta: PresetMeta;                               // Name, fps, dimensions, etc.
}
```

See `app/src/lib/types.ts` for full type definitions and `presets/_template/index.tsx` for a working example.

## Convex

- **Project**: motionkit (team: theo-va)
- **Deployment**: `dev:superb-oriole-955`
- **URL**: `https://superb-oriole-955.convex.cloud`
- **Dashboard**: https://dashboard.convex.dev/t/theo-va/motionkit

All 6 tables with indexes are deployed. All CRUD functions are live.

## Environment Variables

Root `.env.local` has Convex config. App `.env.local` has `NEXT_PUBLIC_CONVEX_URL` and `GOOGLE_API_KEY`.
See `.env.example` for the full template.

## Commands

```bash
pnpm dev              # Run Next.js + Convex dev servers
pnpm dev:app          # Next.js only
pnpm dev:convex       # Convex only
pnpm build            # Production build
npx convex dev --once # Push Convex functions once
```

## Build Phases

Current status: **UI scaffolded, Phase 1 wiring needed.**

### Phase 1 — Core Render Loop (NEXT — what to build)
All UI components and hooks are scaffolded. The next agent needs to **wire them together**:

1. **Wire the workstation page** (`app/src/app/workstation/page.tsx`):
   - Import the text-title preset from `presets/text-title/index.tsx`
   - Pass its `.component` to `PresetPlayer`, `.schema` to `SchemaForm`
   - Use `usePresetProps(schema)` hook to manage form state
   - Connect render button to `api.renderJobs.create` mutation
   - Subscribe to render queue via `useRenderQueue(userId)`

2. **Implement render dispatch** (`convex/actions/renderWithModal.ts`):
   - Convex action that picks up queued jobs and calls Modal API
   - For initial testing: mock render (simulate progress, return dummy URL)

3. **Test the flow**: type text → preview updates → click render → queue updates → download

Components ready to use:
- `PresetPlayer` — Remotion Player wrapper (just pass component + props + meta)
- `SchemaForm` — auto-generates form from schema (text, color, number, toggle, select)
- `RenderQueue` — shows job list with progress bars + download links
- `PresetLibrary` — preset browser with search + category filters
- `InputControls` — wraps SchemaForm + render button
- `PreviewPanel` — wraps PresetPlayer + RenderQueue

Hooks ready:
- `usePresetProps(schema)` — manages form values with defaults + reset
- `useRenderQueue(userId)` — Convex reactive subscription to render jobs
- `usePresetLibrary(category?)` — fetches preset list from Convex

### Phase 2 — Preset Contract + Dynamic Loader
Runtime preset loading from R2, schema-driven form generator. 4 diverse presets.

### Phase 3 — Workstation UI
Three-panel layout (library | preview+queue | controls), BYOK key management, batch rendering.

### Phase 4 — Marketplace
Creator upload flow, discovery, ratings, free + premium presets.

### Phase 5 — Monetization
Self-hosted render tier on Hetzner VPS, pay-per-render.

## Pending Setup

- **Cloudflare R2**: Wrangler needs re-auth (`wrangler login`), then create `motionkit-assets` bucket
- **Auth**: Not yet configured (Convex built-in auth or Clerk)

## What's Already Built

### UI Components (Shadcn/UI initialized + 14 components)
`button`, `input`, `label`, `slider`, `select`, `switch`, `tabs`, `card`, `badge`, `dialog`, `separator`, `scroll-area`, `progress`, `tooltip`

### Custom Components
- `app/src/components/preset/PresetPlayer.tsx` — Remotion Player wrapper
- `app/src/components/preset/SchemaForm.tsx` — Schema-driven form (text/color/number/toggle/select/image)
- `app/src/components/workstation/PresetLibrary.tsx` — Left panel preset browser
- `app/src/components/workstation/PreviewPanel.tsx` — Center panel (player + queue)
- `app/src/components/workstation/InputControls.tsx` — Right panel (form + render button)
- `app/src/components/workstation/RenderQueue.tsx` — Render job status list

### Hooks
- `app/src/hooks/usePresetProps.ts` — Form state from schema defaults
- `app/src/hooks/useRenderQueue.ts` — Convex reactive render job subscription
- `app/src/hooks/usePresetLibrary.ts` — Preset list query

### Presets
- `presets/_template/` — Blank starter preset
- `presets/text-title/` — Animated text title (ready for Phase 1)

### Pages (routes)
- `/` — Landing page with nav to workstation
- `/workstation` — Three-panel layout (scaffolded, needs wiring)
- `/settings` — BYOK key management page (scaffolded)

## Style

- Dark theme (zinc-950 bg, zinc-100 text, amber-500 accent, violet-500 brand)
- Inter + Geist fonts
- Framer Motion for UI only, Remotion for video animations

## Important Notes

- Presets must NEVER be statically imported into the host app — always dynamic `import()` from R2
- Convex reactive queries power all real-time UI (render progress, preset lists)
- R2 has zero egress fees — critical for serving bundles on every preview
- Remotion requires a commercial license for cloud rendering
