# MotionKit — Project Guide

## What is this?

MotionKit is a Remotion-powered motion graphics marketplace and workstation. Users browse, customize, and render motion graphics presets without code. The core innovation is a **preset plugin architecture** — presets load dynamically at runtime from R2 bundles via the `PresetExport` contract.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS — in `/app`
- **Backend**: Convex (real-time DB + serverless functions) — in `/convex`
- **Video**: Remotion + @remotion/player for preview, @remotion/cli for rendering
- **Storage**: Cloudflare R2 (zero egress, CDN-cached preset bundles)
- **Rendering**: Modal API (BYOK) or Remotion Lambda (alt)
- **UI**: Shadcn/UI (to be initialized), lucide-react icons, react-colorful, framer-motion

## Project Structure

```
motionkit/
├── app/                    # Next.js frontend (Cloudflare Pages)
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

Current status: **Setup complete, Phase 1 not started.**

### Phase 1 — Core Render Loop (NEXT)
Build one hardcoded preset, Remotion Player preview, render via Modal, download .mp4.
- Deliverable: Type text → see preview → click render → watch progress → download video

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
- **Shadcn/UI**: Not yet initialized — run `pnpm dlx shadcn@latest init` in `/app`
- **Auth**: Not yet configured (Convex built-in auth or Clerk)

## Style

- Dark theme (zinc-950 bg, zinc-100 text, amber-500 accent, violet-500 brand)
- Inter + Geist fonts
- Framer Motion for UI only, Remotion for video animations

## Important Notes

- Presets must NEVER be statically imported into the host app — always dynamic `import()` from R2
- Convex reactive queries power all real-time UI (render progress, preset lists)
- R2 has zero egress fees — critical for serving bundles on every preview
- Remotion requires a commercial license for cloud rendering
