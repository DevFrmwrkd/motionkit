# Plan 00 -- Architecture Overview & Phase Roadmap

> MotionKit: Remotion Motion Graphics Marketplace & Workstation

---

## System Architecture (High-Level)

```
                        ┌─────────────────────────────────┐
                        │         USERS (Browser)         │
                        └────────────┬────────────────────┘
                                     │
                        ┌────────────▼────────────────────┐
                        │   Cloudflare Pages (Next.js)    │
                        │   ─────────────────────────     │
                        │   - Marketplace UI              │
                        │   - Workstation (3-panel)       │
                        │   - Remotion Player (preview)   │
                        │   - Schema-driven forms         │
                        └──┬──────────┬───────────────┬───┘
                           │          │               │
              ┌────────────▼──┐  ┌────▼────────┐  ┌──▼──────────────┐
              │   Convex      │  │ Cloudflare  │  │  Render Engine  │
              │   (Backend)   │  │ R2 (Storage) │  │  (BYOK)        │
              │   ──────────  │  │ ──────────  │  │  ────────────   │
              │   - Presets DB │  │ - Bundles   │  │  - Modal API   │
              │   - Users     │  │ - Thumbnails│  │  - Lambda (alt) │
              │   - Render Q  │  │ - Renders   │  │  - Self-hosted  │
              │   - Real-time │  │ - Assets    │  │    (future)     │
              └───────────────┘  └─────────────┘  └─────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 + React 19 | App Router, RSC, familiar ecosystem |
| Styling | Tailwind CSS + Shadcn/UI | Rapid UI dev, consistent design system |
| Preview | @remotion/player | Client-side live animation preview |
| Backend | Convex | Real-time subscriptions, document DB, built-in auth |
| Storage | Cloudflare R2 | Zero egress fees, CDN edge caching |
| Hosting | Cloudflare Pages | Fast deploys, integrated with R2 |
| Rendering | Modal (primary) | Simple BYOK, $30/mo free tier |
| Rendering (alt) | Remotion Lambda | For AWS-native users |
| AI Assist | Google Gemini (API key available) | Preset generation, prompt-to-motion |
| Monorepo | pnpm workspaces (or Turborepo) | Clean separation of app/convex/presets |

---

## Phase Roadmap

### Phase 1 -- Core Render Loop (Weeks 1-2)
**Goal**: Prove the render pipeline works end-to-end.

```
[Hardcoded Preset] -> [Remotion Player Preview] -> [Render via Modal] -> [Download .mp4]
```

- One hardcoded preset (animated text title)
- Remotion Player for client-side preview
- Render button -> Convex action -> Modal API -> R2 output -> download
- SSE/polling progress updates
- Deploy on Cloudflare Pages
- **Exit criteria**: Type text, see preview, click render, watch progress, download video

### Phase 2 -- Preset Contract + Dynamic Loader (Weeks 3-4)
**Goal**: Presets load dynamically at runtime. No code changes to add/remove.

```
[R2 Bundle URL] -> [dynamic import()] -> [Remotion Player] -> [Schema-driven Form]
```

- Implement PresetExport contract interface
- Build esbuild bundler for presets
- Runtime loader: `import(r2Url)` -> component + schema + meta
- Schema-to-form generator (text, color, font, number, toggle, select)
- Test with 4 diverse presets
- Verify AI agents can build presets given only the contract
- **Exit criteria**: Add a preset by uploading bundle + Convex doc, zero code changes

### Phase 3 -- Workstation UI (Weeks 5-7)
**Goal**: Full three-panel production workstation.

- Left: Preset library (search, filter, categories, selections)
- Center: Remotion Player + render queue (real-time status)
- Right: Dynamic input controls (grouped by schema)
- Full Convex data model (users, collections, saved presets, projects)
- BYOK key management (encrypted storage)
- Batch rendering (N variations)
- Project concept (group presets into a video)
- **Exit criteria**: Assemble 6-preset video project, customize each, batch render

### Phase 4 -- Marketplace (Weeks 8-10)
**Goal**: Creators publish, users discover and use presets.

- Preset upload flow (bundle + metadata + thumbnail)
- Discovery: categories, tags, search, trending
- Ratings, reviews, creator profiles
- Free + premium presets
- **Exit criteria**: Public marketplace with creator accounts

### Phase 5 -- Monetization (Weeks 11+)
**Goal**: Revenue via platform-hosted rendering.

- Self-hosted Remotion renderer on Hetzner VPS
- Pay-per-render for users without BYOK keys
- Credit system / subscription tiers

---

## Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| Auth | Convex built-in auth (or Clerk) |
| Security | Sandboxed iframe for preset preview, CSP headers, bundle validation |
| Performance | R2 CDN edge caching, Remotion Player lazy loading |
| Error handling | Convex action retries, render job failure states |
| Monitoring | Cloudflare analytics, Convex dashboard |
| Licensing | Remotion Cloud Rendering Units required for commercial use |
