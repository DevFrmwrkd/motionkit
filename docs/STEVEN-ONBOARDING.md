# MotionKit — Onboarding for Steven

Welcome aboard! This doc is your starting point for working on MotionKit (the Remotion Marketplace / Motion Design Platform). Read this first, then work through `IMPROVEMENT-PUNCHLIST.md` in the same folder.

## 1. What MotionKit is

MotionKit is a Remotion-powered motion graphics marketplace + workstation. Users browse, customize ("remix"), and render motion graphics presets without writing code. Think "Figma for motion graphics templates" with a creator marketplace on top.

**North star we're chasing:** https://neuform.ai/ — similar space, much more polished UX. Spend 30 min exploring it before you start coding. Pay attention to:
- How the grid/card hover states feel
- The transition from "browse" → "open" → "customize" → "save"
- Creator profile pages
- How folders and "my stuff" are organized
- Any remix/fork affordances

## 2. What access you already have

- **Git repo:** this repository (main branch). Create feature branches as `steven/<feature>`.
- **Convex:** `dev:superb-oriole-955` (https://dashboard.convex.dev/t/theo-va/motionkit). You can push backend changes with `npx convex dev --once`.
- **ClickUp:** tasks assigned to you in *Dev Space → Motion Design Platform → Development* (and bugs in the sibling Bugs list).

What you **don't** have yet — ping Theo if you need any of these:
- Cloudflare R2 credentials (only needed for publishing/loading preset bundles)
- Modal render API key (only needed if you want to test full render pipeline)
- Production deployment access

## 3. Getting the project running

```bash
# From the repo root
pnpm install
pnpm dev              # Runs Next.js (app/) + Convex dev in parallel
# or run them separately:
pnpm dev:app
pnpm dev:convex
```

Then open http://localhost:3000. Sign in, go to `/workstation` and try:
1. Pick a preset from the left library
2. Edit the schema form on the right — preview should update live
3. Click "Render" — for now this queues a job; full render needs Modal keys

**If anything is broken in the golden path above, that's your first bug.** Log it in the Bugs list before continuing.

## 4. Codebase map (the short version)

```
motionkit/
├── app/src/
│   ├── app/                     # Next.js routes (App Router)
│   │   ├── page.tsx             # Landing
│   │   ├── marketplace/         # Public preset browsing
│   │   ├── workstation/         # 3-panel editor (library | preview+queue | controls)
│   │   ├── dashboard/           # "My stuff" — presets, saved variants, collections
│   │   ├── creator/             # Creator-only pages (earnings, upload)
│   │   └── settings/            # BYOK keys, profile
│   ├── components/
│   │   ├── marketplace/         # PresetCard, filters
│   │   ├── preset/              # PresetPlayer, SchemaForm, ForkButton, VersionHistory
│   │   ├── workstation/         # 3-panel layout components
│   │   └── shared/              # Nav, buttons, etc.
│   ├── hooks/                   # usePresetProps, useRenderQueue, usePresetLibrary
│   └── lib/                     # types.ts, convex.ts
├── convex/
│   ├── schema.ts                # All tables — READ THIS FIRST
│   ├── presets.ts               # Preset CRUD + search
│   ├── savedPresets.ts          # User's customized variants of presets
│   ├── collections.ts           # Folders for organizing presets
│   ├── projects.ts              # Groupings for multi-preset rendering
│   ├── users.ts                 # Profiles + BYOK keys (has getPublicProfile — not wired to UI yet)
│   └── renderJobs.ts            # Render queue
└── presets/
    ├── _template/               # Starter preset
    └── text-title/              # Working preset used in workstation dev
```

Start by reading `convex/schema.ts` end-to-end — it's the clearest map of the domain model.

## 5. The Preset Contract (important concept)

Every preset exports:

```typescript
interface PresetExport {
  component: React.FC<Record<string, unknown>>;  // Remotion composition
  schema: Record<string, SchemaField>;            // Form definition (text, color, number, toggle, select, image)
  meta: PresetMeta;                               // fps, dimensions, name, etc.
}
```

Presets are loaded dynamically from R2 bundles at runtime — they are **never** statically imported into the host app. See `app/src/lib/types.ts` for full type definitions and `presets/text-title/index.tsx` for a working example.

## 6. What Theo wants you to focus on

In priority order:

### P0 — Folder organization: Marketplace vs My Creations
Right now the distinction between "I browse the marketplace" and "I manage my own stuff" is blurry. The `presets` table mixes authored presets, forked presets, and downloaded marketplace presets. The workstation library shows all of them in one bucket.

**Goal:** clear separation with visual badges:
- **Originals** — presets you created from scratch
- **Forks** — presets you forked from the marketplace (show `parentPresetId` + original author)
- **Saved variants** — customized versions of someone else's preset (no code fork, just input values)
- Collections as first-class folders that you can drag/drop presets into from the workstation

See punchlist item #1 for specifics.

### P0 — Remix/Clone flow
Neuform makes remixing feel like a core action. Ours is a tiny outline button hidden in the workstation header. Users in the marketplace have no obvious "clone this to my workspace" affordance.

**Goal:** make "Clone to Workspace" a primary CTA on every marketplace card and preset detail page, with a post-fork toast that offers "Open Fork" as a one-click next step.

See punchlist item #2.

### P1 — Public creator profiles
The `getPublicProfile` query already exists in `convex/users.ts` but there's no route that renders it. Author names on preset cards are plain text, not clickable. There's no way to see "all presets by this creator."

**Goal:** `/creators/[userId]` page showing avatar, bio, portfolio of their presets, downloads/votes. Make every author mention in the UI link to it.

See punchlist item #3.

### P1 — Design polish pass
The app is functional but feels utilitarian compared to Neuform. Stat cards are flat, marketplace category buttons are basic pills, preset thumbnails fall back to plain text when an image is missing. Dark theme is `zinc-950` bg with `amber-500` / `violet-500` accents — we have a palette, we're just not using it with intention.

**Goal:** establish a cohesive design system across Landing / Marketplace / Dashboard / Workstation. Consistent card elevation, hover gradients, color-coded icons, active states with depth.

See punchlist items #4 and #5.

### P2 — Loading & error states
Several flows silently hang or show nothing when data is loading. The sandboxed preset player has no error boundary — a broken preset can freeze the whole workstation.

See punchlist item #6.

## 7. How I want you to work

- **Branches:** `steven/<short-feature-name>`, e.g. `steven/creator-profile-page`.
- **PRs:** open a PR early as draft so I can see direction. Link the ClickUp task in the description.
- **Scope:** one task = one PR. Don't bundle unrelated changes.
- **Commits:** conventional-ish is fine — `feat:`, `fix:`, `refactor:`, `chore:`. Present tense, imperative.
- **Testing:** for any UI change, actually run it in the browser and screenshot the before/after in the PR. Automated tests are nice-to-have but not a blocker — visual verification is mandatory.
- **Questions:** I'd rather you ask early than build the wrong thing. Leave comments on the ClickUp task or ping me directly.

## 8. What I care about in code

- **No premature abstraction.** Three copies of a component is fine. Extract when you see a real pattern, not before.
- **No dead code.** If you replace something, delete the old version — don't leave it commented out or re-exported for "compatibility."
- **No feature flags for things I haven't shipped.** Just change the code.
- **Trust the framework.** Don't add validation for scenarios that can't happen.
- **Read before you modify.** Don't assume you know what a file does from its name.

## 9. References

- **Project guide:** `/CLAUDE.md` at repo root
- **Content map:** `/docs/CONTENT-MAP.md` — full file tree with annotations
- **Plans:** `/docs/plans/` — old phase plans, useful context but may be stale
- **Improvement punch list:** `/docs/IMPROVEMENT-PUNCHLIST.md` — your working doc, tied to ClickUp tasks
- **Remotion docs:** https://www.remotion.dev/docs
- **Convex docs:** https://docs.convex.dev

## 10. First 3 things to do

1. Clone, run `pnpm dev`, sign in, click around every page. Write down everything that feels broken or half-finished — we'll triage what's a bug vs. known WIP.
2. Read `convex/schema.ts`, then `app/src/app/workstation/page.tsx`, then `app/src/app/marketplace/page.tsx`. You'll have a working mental model after those three files.
3. Spend 30 min on https://neuform.ai — specifically the browsing/remixing/profile flows. We want to steal the good ideas.

Then pick up the first P0 task in ClickUp and open a draft PR.

Welcome to the team.
— Theo
