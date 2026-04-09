# MotionKit

MotionKit is a Remotion marketplace and workstation built with Next.js and Convex. The current repo supports AI-assisted preset generation, a Convex-backed marketplace, a preset workstation with live preview, saved variants, voting, and demo-mode auth. The long-term product brief lives in [`motionkit-master-prompt.md`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/motionkit-master-prompt.md).

## Current State

- Frontend app: [`app/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/app)
- Convex backend: [`convex/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/convex)
- Current repo map: [`docs/CONTENT-MAP.md`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/docs/CONTENT-MAP.md)
- Planning and handover notes: [`docs/plans/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/docs/plans)

Working now:

- Landing, marketplace, create, import, workstation, dashboard, settings, login, and signup routes
- Convex-backed presets, saved variants, collections, projects, AI generations, votes, and render jobs
- AI generation flow using Gemini or Claude, with per-user keys or environment fallbacks
- Demo mode for local exploration without full OAuth setup
- Local preset registry in [`app/src/remotion/presets/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/app/src/remotion/presets)

Still scaffolded or mocked:

- `renderWithModal` is still a simulated render pipeline
- Creator analytics, earnings, and upload flows are mostly UI scaffolds
- Cloudflare R2 upload and preset packaging are planned, not fully wired

## Getting Started

1. Copy [`/.env.example`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/.env.example) to `.env.local` and fill in the values you need.
2. Start Convex with `npx convex dev`.
3. Start the workspace with `pnpm dev`.

Useful commands:

- `pnpm dev`
- `pnpm dev:app`
- `pnpm dev:convex`
- `pnpm lint`
- `pnpm build`
- `pnpm build:worker`
- `pnpm preview:worker`

## Environment

Required for local development:

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`

Optional AI fallbacks used when a user has not stored their own keys in Settings:

- `GOOGLE_API_KEY`
- `ANTHROPIC_API_KEY`

Reserved for planned integrations:

- `ENCRYPTION_KEY`
- `R2_*`

## Notes

- The frontend now uses a local system font stack instead of `next/font/google`, so offline builds work.
- Generated build output and macOS `._*` sidecar files should never be committed.
- The planning docs under [`docs/plans/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/docs/plans) are useful context, but [`docs/CONTENT-MAP.md`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/docs/CONTENT-MAP.md) is the current source of truth for the repo layout.
