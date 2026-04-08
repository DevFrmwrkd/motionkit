# Plan 01 -- Frontend Technical Plan

> Next.js 15 + React 19 + Remotion Player + Tailwind + Shadcn/UI

---

## 1. Project Setup

```bash
# Initialize Next.js app inside /app workspace
pnpm create next-app@latest app --typescript --tailwind --eslint --app --src-dir

# Core dependencies
pnpm add @remotion/player @remotion/cli remotion
pnpm add convex                           # Convex client
pnpm add @cloudflare/r2                   # R2 SDK (upload)

# UI
pnpm dlx shadcn@latest init              # Shadcn/UI setup
pnpm add @radix-ui/react-dialog          # Dialogs (batch render, settings)
pnpm add @radix-ui/react-tabs            # Panel tabs
pnpm add react-colorful                  # Color picker
pnpm add lucide-react                    # Icons
pnpm add framer-motion                   # UI transitions (not video -- video uses Remotion)

# Dev
pnpm add -D @types/react @types/node typescript
```

---

## 2. App Router Structure

```
src/app/
├── layout.tsx                  # ConvexProvider, ThemeProvider, fonts
├── page.tsx                    # Landing page / marketplace home
├── workstation/
│   ├── layout.tsx              # Workstation shell (three-panel)
│   └── page.tsx                # Default workstation view
├── marketplace/
│   ├── page.tsx                # Browse all presets
│   └── [presetId]/page.tsx     # Single preset detail + try
├── settings/
│   └── page.tsx                # Profile, API keys, preferences
└── api/
    ├── render/route.ts         # POST: dispatch render job
    └── upload/route.ts         # POST: upload preset bundle to R2
```

---

## 3. Core Components -- Detailed Design

### 3.1 Preset Loader (`lib/preset-loader.ts`)

The heart of the plugin architecture. Loads preset bundles from R2 at runtime.

```typescript
// Pseudocode -- actual implementation in Phase 2
interface PresetModule {
  component: React.FC<Record<string, any>>;
  schema: PresetSchema;
  meta: PresetMeta;
}

const presetCache = new Map<string, PresetModule>();

export async function loadPreset(bundleUrl: string): Promise<PresetModule> {
  if (presetCache.has(bundleUrl)) return presetCache.get(bundleUrl)!;

  // Dynamic import from R2 CDN URL
  const module = await import(/* webpackIgnore: true */ bundleUrl);
  const preset: PresetModule = module.default;

  // Validate contract
  if (!preset.component || !preset.schema || !preset.meta) {
    throw new Error("Invalid preset: missing required exports");
  }

  presetCache.set(bundleUrl, preset);
  return preset;
}
```

**Key risks & mitigations**:
- CORS: R2 bucket configured with `Access-Control-Allow-Origin: *` for bundle URLs
- CSP: `script-src` must allow the R2 domain
- Caching: Service worker or in-memory Map to avoid re-fetching
- Security: Presets run in sandboxed iframe in production (Phase 3+)

### 3.2 Schema-Driven Form (`components/preset/SchemaForm.tsx`)

Reads a preset's `schema` object and generates the correct input control for each field.

```
Schema field type -> React component mapping:
─────────────────────────────────────────────
"text"     -> <Input />
"color"    -> <ColorPicker /> (react-colorful)
"font"     -> <Select /> with font options (Google Fonts)
"image"    -> <FileUpload /> + preview
"number"   -> <Slider /> + <Input type="number" />
"duration" -> <Slider /> (seconds -> frames conversion)
"select"   -> <Select /> with options
"toggle"   -> <Switch />
```

Fields are grouped by `schema[field].group` into collapsible sections (e.g., "Typography", "Colors").

Every field change calls `onPropsChange(newProps)` -> updates Remotion Player in real-time.

### 3.3 Remotion Player Wrapper (`components/preset/PresetPlayer.tsx`)

```typescript
// Wraps @remotion/player with preset-specific config
<Player
  component={preset.component}
  inputProps={currentProps}
  durationInFrames={preset.meta.durationInFrames}
  fps={preset.meta.fps}
  compositionWidth={preset.meta.width}
  compositionHeight={preset.meta.height}
  style={{ width: "100%" }}
  controls
  autoPlay
  loop
/>
```

### 3.4 Workstation Layout (`app/workstation/page.tsx`)

Three resizable panels using CSS Grid + drag handles.

```
┌──────────────┬─────────────────────────┬──────────────────┐
│ PresetLibrary│    PreviewPanel          │  InputControls   │
│ (280px)      │    (flex-1)             │  (360px)         │
│              │                          │                  │
│ - Search     │  - PresetPlayer         │  - SchemaForm    │
│ - Categories │  - Timeline scrubber    │  - Render button │
│ - Selected   │  - RenderQueue          │  - Batch button  │
└──────────────┴─────────────────────────┴──────────────────┘
```

- Panels resizable via drag handles (min/max widths enforced)
- Responsive: collapses to stacked layout on mobile/tablet
- Dark theme by default (motion graphics aesthetic)

---

## 4. State Management

### Local State (React)
- `currentPreset` -- the actively selected preset module
- `currentProps` -- the current input values for the active preset
- `panelSizes` -- resizable panel dimensions

### Server State (Convex reactive queries)
- `presets` -- list of available presets (from Convex)
- `renderJobs` -- render queue with real-time status updates
- `collections` -- user's preset folders
- `savedPresets` -- user's saved preset variations
- `projects` -- user's video projects

### Hooks

| Hook | Purpose | Data Source |
|------|---------|-------------|
| `usePreset(presetId)` | Load preset module from R2, return component + schema + meta | R2 via dynamic import |
| `usePresetProps(schema)` | Manage form state with defaults from schema | Local state |
| `useRenderQueue(userId)` | Subscribe to render job updates | Convex reactive query |
| `usePresetLibrary(filters)` | Filtered/searched preset list | Convex query |
| `useProject(projectId)` | Current project's presets and status | Convex query |

---

## 5. Render Flow (Frontend Perspective)

```
1. User clicks "Render"
     │
2. Frontend calls Convex mutation: createRenderJob({
     presetBundleUrl,
     inputProps,
     userId
   })
     │
3. Convex creates renderJob doc with status: "queued"
     │
4. Frontend's useRenderQueue hook picks up new job via reactive query
     │
5. RenderQueue component shows: "Queued..."
     │
6. Convex action dispatches to Modal (server-side)
     │
7. Convex updates renderJob: "rendering" -> progress% -> "done" + outputUrl
     │
8. Frontend reactively updates: progress bar -> download button
     │
9. User clicks download -> fetches from R2 temp URL
```

---

## 6. AI-Assisted Preset Generation (Prompt-to-Motion)

Leveraging the Remotion "Prompt to Motion Graphics" template pattern + available Google Gemini API key.

```
User describes animation in natural language
     │
     ▼
Gemini API generates Remotion component code
     │
     ▼
Browser-side Babel compilation (from template pattern)
     │
     ▼
Live preview in Remotion Player
     │
     ▼
User refines via chat or direct prop editing
     │
     ▼
"Save as preset" -> bundles and uploads to R2
```

This is a Phase 4+ feature but architecturally planned from the start. The Google API key from `ai-image-outreach` (`AIzaSyACFbBvs8ksoA2jL8KxMJsw_NkqSRsf22k`) can power this.

---

## 7. Styling & Design System

- **Base**: Tailwind CSS with custom theme tokens
- **Components**: Shadcn/UI (consistent, accessible, themeable)
- **Theme**: Dark-first (suits motion graphics / video editing aesthetic)
- **Color palette**:
  - Background: slate-950 / zinc-950
  - Surfaces: slate-900 / zinc-900
  - Accent: amber-500 (active preset), violet-500 (brand)
  - Text: slate-100 (primary), slate-400 (secondary)
- **Typography**: Inter (UI), JetBrains Mono (code/technical)
- **Animations**: Framer Motion for UI transitions only (Remotion handles video)

---

## 8. Phase 1 Frontend Deliverables (First Sprint)

1. Next.js app with Tailwind + Shadcn/UI initialized
2. Single page with:
   - Hardcoded preset rendered in Remotion Player
   - Text input fields that update player props in real-time
   - "Render" button that creates a Convex render job
   - Render status display (polling or reactive)
   - Download link when render completes
3. Convex client connected
4. Deployed to Cloudflare Pages

---

## 9. Key Dependencies & Versions

| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.x | Framework |
| react | 19.x | UI library |
| remotion | 4.x | Video engine |
| @remotion/player | 4.x | Client-side preview |
| convex | latest | Backend client |
| tailwindcss | 4.x | Styling |
| shadcn/ui | latest | Component library |
| react-colorful | latest | Color picker input |
| framer-motion | latest | UI animations |
| esbuild | latest | Preset bundling |
