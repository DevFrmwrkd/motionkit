# MotionKit — Project Content Map

> Last updated: 2026-04-16 post-sync (rewrite).
> Reflects the repo after `main` pulled PRs #1–#18. The earlier version
> described a much smaller codebase; do not rely on git blame to find the
> truth — the review pipeline, admin surface, checkout, billing, and
> monetisation tables shipped weeks ago.
>
> Source of truth for: what exists, where it lives, what it does in one
> line. For ongoing work and priorities, read
> [`MONSTER-TASK-LIST.md`](MONSTER-TASK-LIST.md). For UX direction read
> [`DESIGN-REMIX-SPEC.md`](DESIGN-REMIX-SPEC.md) and Steven's
> [`neuroform-study.md`](neuroform-study.md).

## Repo layout

```text
MotionKit/
├── README.md                 # Short "what + how to run" for humans
├── CLAUDE.md / AGENTS.md     # Agent-facing guidance (CLAUDE.md is gitignored)
├── motionkit-master-prompt.md # Original product prompt (historical)
├── .env.example              # Env template — no real values
├── package.json              # Root monorepo scripts
├── pnpm-workspace.yaml       # Workspaces — note: "shared" missing (see below)
├── vercel.json               # Root→app/ redirect for Vercel Pages deploy
├── app/                      # Next.js 16 frontend (Cloudflare Pages / Vercel)
├── convex/                   # Convex backend (real-time DB + serverless fns)
├── render-worker/            # Self-hosted Fastify + Remotion worker (Hetzner)
├── r2-uploader/              # Cloudflare Worker — signed PUT for rendered MP4s
├── shared/                   # Tri-imported helpers (app + convex + tests)
├── scripts/                  # sign-bundle.mjs (local utility; not in CI)
├── tests/                    # Node test-runner tests for `shared/`
├── presets/                  # 6 sample presets (not yet wired to R2 upload)
├── docs/                     # This folder (plans + maps + specs)
└── temp/                     # Local scratch, git-ignored
```

## What is live vs. planned

**Live and wired today:**

- Landing (`/`), Marketplace (`/marketplace`), Workstation (`/workstation`),
  AI create (`/create`), Manual import (`/import`), Preset detail (`/p/[id]`),
  Public creator pages (`/creators/[userId]`), Dashboard (`/dashboard`,
  `/dashboard/projects`, `/dashboard/collections`, `/dashboard/history`),
  Settings (`/settings`), Login / signup (`/login`, `/signup`).
- Creator-side: `/creator`, `/creator/analytics`, `/creator/earnings`,
  `/creator/upload` — UI scaffolded, earnings data largely mock.
- Admin-side: `/admin`, `/admin/audit`, `/admin/broken-renders`,
  `/admin/review`, `/admin/users` — full moderation surface.
- Checkout: `/checkout/[presetId]`, `/checkout/success` — Stripe
  integration exists, correctness not independently verified.
- Convex: 18 modules, 4 actions, 16 tables, cron, HTTP webhook endpoint.
- Rendering: Lambda path and self-hosted worker path both wired. Test
  renders for the publish pipeline run through the same dispatchers.
- Preset review state machine (`draft → validating → test-rendering →
  pending-review → approved → published`) with append-only audit log.
- BYOK API keys (Gemini, Anthropic, OpenRouter) encrypted at rest.
- Voting, collections, saved variants, forks, version history timeline.

**Present but still mostly scaffolded:**

- Creator earnings / analytics (mock data).
- R2 preset bundle upload pipeline (the Worker handles MP4s only; no
  `PUT /presets/...` endpoint yet).
- Brand kits (table defined; no UI).
- Preset comments (table defined; no UI).

## Frontend route map

| Route | File | Status |
|------|------|--------|
| `/` | `app/src/app/page.tsx` | Live |
| `/login` | `app/src/app/(auth)/login/page.tsx` | Live (demo-mode entry) |
| `/signup` | `app/src/app/(auth)/signup/page.tsx` | Live |
| `/marketplace` | `app/src/app/marketplace/page.tsx` | Live |
| `/create` | `app/src/app/create/page.tsx` | Live — AI iteration, preview, save |
| `/import` | `app/src/app/import/page.tsx` | Live — manual Remotion import |
| `/workstation` | `app/src/app/workstation/page.tsx` | Live — library · preview · controls · variants · version history |
| `/dashboard` | `app/src/app/dashboard/page.tsx` | Live |
| `/dashboard/projects` | `app/src/app/dashboard/projects/page.tsx` | Live |
| `/dashboard/collections` | `app/src/app/dashboard/collections/page.tsx` | Live |
| `/dashboard/history` | `app/src/app/dashboard/history/page.tsx` | Live |
| `/settings` | `app/src/app/settings/page.tsx` | Live |
| `/p/[presetId]` | `app/src/app/p/[presetId]/page.tsx` | Live |
| `/creators/[userId]` | `app/src/app/creators/[userId]/page.tsx` | Live |
| `/creator` | `app/src/app/creator/page.tsx` | Scaffolded |
| `/creator/analytics` | `app/src/app/creator/analytics/page.tsx` | Scaffolded (mock) |
| `/creator/earnings` | `app/src/app/creator/earnings/page.tsx` | Stub |
| `/creator/upload` | `app/src/app/creator/upload/page.tsx` | Scaffolded |
| `/admin` | `app/src/app/admin/page.tsx` | Live |
| `/admin/audit` | `app/src/app/admin/audit/page.tsx` | Live |
| `/admin/broken-renders` | `app/src/app/admin/broken-renders/page.tsx` | Live |
| `/admin/review` | `app/src/app/admin/review/page.tsx` | Live (post-2026-04-16: prompt replaced with in-app Dialog) |
| `/admin/users` | `app/src/app/admin/users/page.tsx` | Live |
| `/checkout/[presetId]` | `app/src/app/checkout/[presetId]/page.tsx` | Live (correctness unverified — see billing bucket) |
| `/checkout/success` | `app/src/app/checkout/success/page.tsx` | Live |

## Key frontend modules

| Area | Path | Purpose |
|------|------|---------|
| App shell | `app/src/app/layout.tsx` | Applies `<html class="dark">`, mounts `ConvexClientProvider`, `AppShell`, and `Toaster`. |
| Global styles | `app/src/app/globals.css` | Tailwind + shadcn theme tokens. `.dark` block is the active theme; `:root` is a light fallback. |
| Workstation | `app/src/components/workstation/` | `PresetLibrary`, `PreviewPanel`, `InputControls`, `RenderQueue`, `VariantsDropdown`, dialog set. |
| Marketplace | `app/src/components/marketplace/` | `PresetCard`, `PresetCardSkeleton`, filters, vote controls. |
| Preset runtime | `app/src/components/preset/` | `PresetPlayer`, `SandboxedPresetPlayer` (null-origin iframe for untrusted code), `SchemaForm`, `VersionTimeline`, `VersionTree`, `VersionHistory`, `ForkButton`. |
| AI helpers | `app/src/components/ai/` | Code preview, reference-image upload. |
| Shared UI | `app/src/components/shared/` | `SiteHeader`, `ConfirmDialog`, `ErrorBoundary`. |
| shadcn primitives | `app/src/components/ui/` | 24 components as of sync. |
| Hooks | `app/src/hooks/` | `useCurrentUser`, `useConversationState`, `usePresetProps`, `useRenderQueue`, `usePresetLibrary`, `useSavedVariants`. |
| Lib | `app/src/lib/` | `convex.tsx` (provider), `types.ts`, `preset-runtime/` (bundle fetch + compile), `renderableCompositions.ts` (re-export of `shared/renderableCompositionIds`). |
| Sandbox runtime | `app/src/sandbox-runtime/` | Guest code for the null-origin preset iframe — built separately by `scripts/build-sandbox.mjs`. |
| Local presets | `app/src/remotion/presets/` | 11 built-in compositions (Claude / Gemini / HelloWorld) used by the workstation + render pipeline. |

## Backend modules (Convex)

| File | Purpose |
|------|---------|
| `convex/schema.ts` | 16 tables, 8 enums, full index set. |
| `convex/auth.ts` + `auth.config.ts` | Convex Auth wiring (OAuth + demo bypass). |
| `convex/users.ts` | Current user, public profile, BYOK key crud (encrypted). |
| `convex/presets.ts` | Preset CRUD, marketplace sort/search, clone, version tree. |
| `convex/presetReview.ts` | Review state machine, admin approve/reject/archive, compile-error prune. |
| `convex/presetEvents.ts` | Append-only preset events (view / preview / fork / render / save / purchase). |
| `convex/collections.ts` | User-created folders. |
| `convex/savedPresets.ts` | Saved-variant rows. |
| `convex/projects.ts` | Project groupings. |
| `convex/renderJobs.ts` | Render queue + test-render completion bridge. |
| `convex/votes.ts` | Upvote/downvote with 3 s cooldown. |
| `convex/aiGeneration.ts` | AI generation records + storage upload URL. |
| `convex/analytics.ts` | Creator/admin rollups over `presetEvents`. |
| `convex/admin.ts` | Review queue, broken renders, moderation mutations, user role, audit log viewer. |
| `convex/licenses.ts` | License grants + usage meters. |
| `convex/billing.ts` | Stripe checkout + webhook handlers. |
| `convex/http.ts` | Convex HTTP router — Stripe webhook endpoint. |
| `convex/crons.ts` | Scheduled: compile-error prune. |
| `convex/seedPresets.ts`, `convex/geminiSeed.ts` | Seed scripts. |
| `convex/lib/authz.ts` | `requireSignedInUser`, `requireAuthorizedUser`, `requireAdmin`, demo-mode gate. |
| `convex/lib/moderation.ts` | `MAX_MODERATION_REASON_LENGTH`, `normalizeReason`. |
| `convex/lib/keyStorage.ts` | AES-GCM encrypt/decrypt + masked hint for BYOK keys. |
| `convex/lib/compile.ts` | Shared TSX → JS compile path (client sandbox + server validator). |
| `convex/lib/signing.ts` | HMAC-SHA256 bundle signing. |
| `convex/lib/renderableCompositions.ts` | Re-export of `shared/renderableCompositionIds` — single source of truth. |
| `convex/actions/generatePreset.ts` | AI dispatch to Gemini / Claude / OpenRouter. |
| `convex/actions/renderWithWorker.ts` | Public user-authed render dispatch → self-hosted worker. |
| `convex/actions/renderWithLambda.ts` | Public user-authed render dispatch → Remotion Lambda. |
| `convex/actions/validateAndTestRender.ts` | Creator's "submit for review" action. |
| `convex/actions/lib/renderDispatch.ts` | Shared dispatch logic (auth, proto-pollution guard, HMAC signing, R2 copy). |

## Preset sources (two folders — only one is wired)

1. `app/src/remotion/presets/` — **the render registry.** Built into the
   Remotion bundle consumed by both the worker and Lambda. Listed in
   `shared/renderableCompositionIds.ts`.
2. `presets/` — 6 standalone TSX files that follow the `PresetExport`
   contract (`_template`, `audiogram`, `code-hike`, `stargazer`,
   `text-title`, `tiktok-captions`). **Not yet plugged into a bundler or
   upload pipeline.** See Bucket 4 in `MONSTER-TASK-LIST.md`.

## Infrastructure packages

### `render-worker/`
Self-hosted Fastify service that bundles preset source + renders via
Remotion, writes the MP4 to a Caddy-served static path, and returns a
public URL. HMAC-signed POST `/render`. Deployed via rsync + systemd to
a Hetzner VPS. See [`RENDER-PIPELINE.md`](RENDER-PIPELINE.md).

### `r2-uploader/`
Cloudflare Worker with a single endpoint: `PUT /renders/<jobId>.mp4`,
HMAC-signed by the caller. Writes to the `motionkit-renders` R2 bucket.
Only used on the Lambda path (Lambda → S3 → Worker → R2). No preset
bundle endpoint yet (follow-up).

### `shared/`
Three imports, three consumers (app, convex, tests). Declares:
- `aiProviderConfig.ts` — `AiProvider` type, `normalizeOptionalString`,
  `resolveOpenRouterModel`, `isValidOpenRouterModelId`,
  `validateOpenRouterModelId`.
- `presetPricing.ts` — `normalizePresetPricing` for legacy-vs-modern
  price fields.
- `renderableCompositionIds.ts` — the 13 composition ids the Remotion
  bundle can render. Kept in sync with `app/src/remotion/` via the
  `renderableCompositionIds.test.ts` alignment test.

Not currently listed in `pnpm-workspace.yaml`. Imports resolve by
relative path (`../../shared/...`) rather than through the workspace —
slightly fragile, flagged in `MONSTER-TASK-LIST.md` Bucket 11.

### `scripts/sign-bundle.mjs`
Local CLI to sign a preset bundle using `BUNDLE_SIGNING_SECRET`. Mirrors
`convex/lib/signing.ts`. Not yet in CI or the preset-upload pipeline.

### `tests/`
Seven tests across three files covering the shared package only. Runner
is `node:test` via `tsx --test`. **Root `pnpm test` glob is broken on
macOS** (see `MONSTER-TASK-LIST.md`); run directly as
`npx tsx --test tests/*.test.ts`.

## Environment surface

The full authoritative list lives in [`.env.example`](../.env.example).
Categories (copy that file, then fill in your own values):

- Convex deployment (root + app `NEXT_PUBLIC_CONVEX_URL`).
- Convex Auth (JWT + JWKS + SITE_URL — set via `npx @convex-dev/auth`).
- Demo mode toggle.
- AI fallback keys (platform-side; users bring their own).
- `ENCRYPTION_KEY` (32 B base64) — BYOK key AES-GCM secret.
- R2 bucket credentials + uploader Worker URL + signing secret.
- Remotion Lambda credentials (used only when no render worker is set).
- Render-worker URL + HMAC secret.
- Preset bundle signing secret.
- Stripe API key + webhook secret.

All secrets live either in `.env.local` (local dev) or on the Convex
deployment env (server-side). Never hard-code in source.

## How this doc stays current

Add to CONTENT-MAP when you:

- Create a new route, component family, Convex module, or infra package.
- Retire or rename a major surface.
- Change where an env var lives.

Do **not** use this doc as a to-do list — it describes what exists.
`MONSTER-TASK-LIST.md` describes what to change.
