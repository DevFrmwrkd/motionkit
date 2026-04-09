# MotionKit Frontend

This package contains the Next.js frontend for MotionKit: the public marketing pages, the preset marketplace, the AI creation flow, the import flow, the workstation, dashboard pages, creator pages, auth routes, and settings.

## Main Routes

- `/`
- `/login`
- `/signup`
- `/marketplace`
- `/create`
- `/import`
- `/workstation`
- `/dashboard/*`
- `/creator/*`
- `/settings`

## Commands

```bash
pnpm --filter app dev
pnpm --filter app lint
pnpm --filter app build
pnpm --filter app build:worker
pnpm --filter app preview:worker
```

## Notes

- The app expects `NEXT_PUBLIC_CONVEX_URL` to be available.
- AI generation can use per-user Gemini and Claude keys saved in Settings, or environment fallbacks from the workspace root.
- The build uses a local system font stack and does not depend on fetching Google Fonts.
- `next.config.ts` keeps image optimization disabled and is compatible with the OpenNext Cloudflare path.
- OpenNext/Cloudflare scripts are available for Worker builds and local Wrangler preview.

## Important Directories

- [`app/src/app/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/app/src/app)
- [`app/src/components/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/app/src/components)
- [`app/src/hooks/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/app/src/hooks)
- [`app/src/lib/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/app/src/lib)
- [`app/src/remotion/presets/`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/app/src/remotion/presets)
