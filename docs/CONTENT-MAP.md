# MotionKit -- Project Content Map

> Last updated: 2026-04-09
> This file describes the current checked-in repo. The files under `docs/plans/` are planning and handover notes, not the primary source of truth.

## Current Repo Shape

```text
MotionKit/
├── README.md
├── motionkit-master-prompt.md
├── .env.example
├── package.json
├── app/                  # Next.js frontend
├── convex/               # Convex backend
├── docs/                 # Current map + historical planning docs
├── presets/              # Minimal local preset template area
├── scripts/              # Reserved for future tooling
└── temp/                 # Local scratch / seed artifacts
```

## What Is Live Versus Planned

Live and wired today:

- Public landing page and marketplace
- AI creation flow backed by Convex actions
- Manual preset import flow
- Workstation with live Remotion preview, saved variants, cloning, and render queue
- Dashboard, settings, login, and signup flows
- Convex-backed presets, votes, collections, saved presets, projects, AI generations, and render jobs

Present but still mostly scaffolded:

- Creator analytics, earnings, and upload screens
- Real Modal rendering
- Cloudflare R2 upload and preset packaging workflow

## Frontend Route Map

| Route | File | Status | Notes |
|------|------|--------|-------|
| `/` | `app/src/app/page.tsx` | Live | Product landing page |
| `/login` | `app/src/app/(auth)/login/page.tsx` | Live | Supports demo-mode entry |
| `/signup` | `app/src/app/(auth)/signup/page.tsx` | Live | Signup UI |
| `/marketplace` | `app/src/app/marketplace/page.tsx` | Live | Convex-backed search, filters, votes |
| `/create` | `app/src/app/create/page.tsx` | Live | AI generation, iteration, preview, save |
| `/import` | `app/src/app/import/page.tsx` | Live | Manual Remotion preset import |
| `/workstation` | `app/src/app/workstation/page.tsx` | Live | Library, preview, props, queue, project dialogs |
| `/dashboard` | `app/src/app/dashboard/page.tsx` | Live | Convex-backed overview |
| `/dashboard/projects` | `app/src/app/dashboard/projects/page.tsx` | Live | Project list |
| `/dashboard/collections` | `app/src/app/dashboard/collections/page.tsx` | Live | Collection list |
| `/dashboard/history` | `app/src/app/dashboard/history/page.tsx` | Live | Render and activity history |
| `/settings` | `app/src/app/settings/page.tsx` | Live | Profile + API key management |
| `/creator` | `app/src/app/creator/page.tsx` | Scaffolded | Mostly static creator overview |
| `/creator/analytics` | `app/src/app/creator/analytics/page.tsx` | Scaffolded | Mock analytics UI |
| `/creator/earnings` | `app/src/app/creator/earnings/page.tsx` | Scaffolded | Mock earnings UI |
| `/creator/upload` | `app/src/app/creator/upload/page.tsx` | Scaffolded | Upload flow UI, not fully wired |

## Key Frontend Modules

| Area | File / Folder | Purpose |
|------|---------------|---------|
| App shell | `app/src/app/layout.tsx` | Root providers and global UI |
| Global styles | `app/src/app/globals.css` | Theme tokens and base styles |
| Workstation | `app/src/components/workstation/` | Preset library, preview, controls, dialogs, render queue |
| Marketplace | `app/src/components/marketplace/` | Cards and voting controls |
| Preset runtime | `app/src/components/preset/` | Player, schema form, version tree |
| AI helpers | `app/src/components/ai/` | Code preview and reference image upload |
| Frontend utilities | `app/src/lib/` | Convex provider, preset registry, runtime compilation helpers |
| Local presets | `app/src/remotion/presets/` | Checked-in preset implementations used by the app |

## Backend Modules

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Core schema and indexes |
| `convex/presets.ts` | Preset CRUD, marketplace sorting, search, clone/version tree |
| `convex/users.ts` | Auth lookups, demo mode, profiles, API keys |
| `convex/collections.ts` | User collections |
| `convex/savedPresets.ts` | Saved preset variants |
| `convex/projects.ts` | Project groupings |
| `convex/renderJobs.ts` | Render queue records and internal mutations |
| `convex/aiGeneration.ts` | AI generation records and upload URLs |
| `convex/votes.ts` | Marketplace voting |
| `convex/actions/generatePreset.ts` | Gemini / Claude generation dispatch |
| `convex/actions/renderWithModal.ts` | Mocked render dispatch with progress simulation |

## Preset Sources

There are two preset sources in this repo today:

1. `app/src/remotion/presets/`
   The actively used local preset registry for the frontend.
2. `presets/`
   A minimal template/scratch area that is not yet fully wired into an R2 packaging workflow.

## Environment Surface

Current runtime environment keys:

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`
- `GOOGLE_API_KEY` optional fallback
- `ANTHROPIC_API_KEY` optional fallback

Planned or partially wired keys:

- `ENCRYPTION_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

Use [`/.env.example`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/.env.example) for the safe template. Never place literal secrets in docs.
