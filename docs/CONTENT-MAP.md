# MotionKit -- Project Content Map

> Last updated: 2025-04-08

## Directory Structure (Target)

```
motionkit/
│
├── docs/                              # Documentation & planning
│   ├── CONTENT-MAP.md                 # THIS FILE -- project overview & file index
│   └── plans/
│       ├── 00-overview.md             # High-level architecture & phase roadmap
│       ├── 01-frontend.md             # Frontend technical plan
│       ├── 02-backend.md              # Backend technical plan (Convex + rendering)
│       └── 03-infrastructure.md       # Infra, CI/CD, deployment, credentials
│
├── app/                               # Next.js frontend (Cloudflare Pages)
│   ├── public/                        # Static assets
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   │   ├── layout.tsx             # Root layout (providers, fonts, theme)
│   │   │   ├── page.tsx               # Landing / marketplace home
│   │   │   ├── workstation/
│   │   │   │   └── page.tsx           # Three-panel workstation UI
│   │   │   ├── marketplace/
│   │   │   │   ├── page.tsx           # Browse/search presets
│   │   │   │   └── [presetId]/
│   │   │   │       └── page.tsx       # Single preset detail
│   │   │   ├── settings/
│   │   │   │   └── page.tsx           # BYOK key management, profile
│   │   │   └── api/                   # API routes (render proxy, upload)
│   │   │       ├── render/
│   │   │       │   └── route.ts       # Render dispatch (Modal / Lambda)
│   │   │       └── upload/
│   │   │           └── route.ts       # Preset bundle upload to R2
│   │   │
│   │   ├── components/                # React components
│   │   │   ├── ui/                    # Shadcn/UI primitives
│   │   │   ├── workstation/
│   │   │   │   ├── PresetLibrary.tsx  # Left panel -- preset browser
│   │   │   │   ├── PreviewPanel.tsx   # Center panel -- Remotion Player + queue
│   │   │   │   ├── InputControls.tsx  # Right panel -- schema-driven form
│   │   │   │   ├── RenderQueue.tsx    # Real-time render job list
│   │   │   │   └── BatchDialog.tsx    # Variations batch render modal
│   │   │   ├── marketplace/
│   │   │   │   ├── PresetCard.tsx     # Preset thumbnail card
│   │   │   │   ├── PresetGrid.tsx     # Filterable grid of presets
│   │   │   │   └── CategoryNav.tsx    # Category/tag sidebar
│   │   │   ├── preset/
│   │   │   │   ├── PresetLoader.tsx   # Dynamic import() runtime loader
│   │   │   │   ├── SchemaForm.tsx     # JSON schema -> form generator
│   │   │   │   └── PresetPlayer.tsx   # Remotion Player wrapper
│   │   │   └── shared/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── ThemeProvider.tsx
│   │   │
│   │   ├── lib/                       # Utilities & helpers
│   │   │   ├── preset-loader.ts       # Dynamic preset import logic
│   │   │   ├── schema-parser.ts       # Schema -> form field mapping
│   │   │   ├── r2-client.ts           # R2 upload/download helpers
│   │   │   └── convex.ts              # Convex client setup
│   │   │
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── usePreset.ts           # Load & manage active preset
│   │   │   ├── useRenderQueue.ts      # Subscribe to render job updates
│   │   │   └── usePresetProps.ts      # Manage preset input props state
│   │   │
│   │   └── styles/
│   │       └── globals.css            # Tailwind base + custom styles
│   │
│   ├── .env.local                     # Local env vars (gitignored)
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── convex/                            # Convex backend (co-located)
│   ├── _generated/                    # Auto-generated Convex types
│   ├── schema.ts                      # Database schema definition
│   ├── presets.ts                     # Preset CRUD queries/mutations
│   ├── users.ts                       # User management
│   ├── collections.ts                 # Folders/collections
│   ├── savedPresets.ts                # User-saved preset variations
│   ├── renderJobs.ts                  # Render job queue management
│   ├── projects.ts                    # Video project groupings
│   ├── actions/
│   │   ├── renderWithModal.ts         # Modal API render dispatch
│   │   ├── renderWithLambda.ts        # Remotion Lambda render dispatch
│   │   └── validateBundle.ts          # Preset bundle validation
│   ├── lib/
│   │   ├── encryption.ts              # API key encrypt/decrypt
│   │   └── validation.ts              # Input sanitization
│   └── convex.config.ts
│
├── presets/                           # Local preset development
│   ├── _template/                     # Starter template for new presets
│   │   ├── index.tsx                  # Preset component
│   │   ├── schema.ts                  # Input schema definition
│   │   └── build.ts                   # Esbuild bundle script
│   ├── text-title/                    # Example: animated text title
│   ├── logo-intro/                    # Example: logo reveal intro
│   ├── lower-third/                   # Example: name/title lower third
│   └── cta-subscribe/                 # Example: call-to-action overlay
│
├── remotion/                          # Remotion config (preview & render)
│   ├── remotion.config.ts
│   ├── Root.tsx                       # Dev-only: registers presets for local preview
│   └── index.ts
│
├── scripts/                           # Build & deployment scripts
│   ├── build-preset.ts                # Bundle a preset for R2 upload
│   ├── upload-preset.ts               # Upload bundle to R2
│   └── seed-presets.ts                # Seed Convex with initial presets
│
├── .env.local                         # Root-level env vars (gitignored)
├── .gitignore
├── package.json                       # Monorepo root (workspaces)
├── turbo.json                         # Turborepo config (if using)
├── tsconfig.base.json
└── motionkit-master-prompt.md         # Master prompt (already exists)
```

---

## Key Files by Domain

### Preset System (Core Innovation)
| File | Purpose |
|------|---------|
| `app/src/lib/preset-loader.ts` | Runtime dynamic `import()` of preset bundles from R2 |
| `app/src/components/preset/SchemaForm.tsx` | Generates UI controls from preset JSON schema |
| `app/src/components/preset/PresetPlayer.tsx` | Remotion Player wrapper for live preview |
| `convex/presets.ts` | Preset metadata CRUD + marketplace queries |
| `presets/_template/` | Boilerplate for building new presets |
| `scripts/build-preset.ts` | Esbuild bundler for preset -> single JS file |

### Rendering Pipeline
| File | Purpose |
|------|---------|
| `convex/renderJobs.ts` | Job queue: create, update status, list by user |
| `convex/actions/renderWithModal.ts` | Dispatch render to Modal API |
| `convex/actions/renderWithLambda.ts` | Dispatch render to Remotion Lambda |
| `app/src/hooks/useRenderQueue.ts` | Real-time render status subscription |
| `app/src/components/workstation/RenderQueue.tsx` | Render progress UI |

### Workstation UI
| File | Purpose |
|------|---------|
| `app/src/app/workstation/page.tsx` | Three-panel layout shell |
| `app/src/components/workstation/PresetLibrary.tsx` | Left panel: browse & select |
| `app/src/components/workstation/PreviewPanel.tsx` | Center: player + queue |
| `app/src/components/workstation/InputControls.tsx` | Right: schema-driven form |

### Data Layer (Convex)
| File | Purpose |
|------|---------|
| `convex/schema.ts` | All table definitions |
| `convex/users.ts` | Auth, profile, encrypted API keys |
| `convex/collections.ts` | User preset folders |
| `convex/projects.ts` | Video project groupings |

---

## Credential Sources

| Key | Source Project | Usage |
|-----|---------------|-------|
| `GOOGLE_API_KEY` | ai-image-outreach | Gemini AI (preset generation assist) |
| `CONVEX_DEPLOYMENT` | NEW (to create) | MotionKit's own Convex project |
| `R2_*` | ai-image-outreach (template) | Cloudflare R2 bucket credentials |
| `MODAL_API_KEY` | User-provided (BYOK) | Server-side rendering |
| `GITHUB_TOKEN` | ai-image-outreach | Repo management |
