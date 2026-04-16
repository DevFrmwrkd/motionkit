# MotionKit — Improvement Punch List

This is Steven's working punch list. Each item is scoped to be ~1 PR, has concrete file references, and maps to a ClickUp task in *Dev Space → Motion Design Platform*. Items are ordered by priority (P0 → P2).

Inspiration for everything below: https://neuform.ai/




## P2-9 — Small bugs and polish items

Individually too small for P0/P1 but worth burning through in one cleanup PR:

- **Collections delete dialog** — `app/src/app/dashboard/collections/page.tsx` (lines ~110-117, 279-301). `ConfirmDialog` trigger prop is an empty `<Button>` with no visible label. Add `triggerChildren` or a button label.
- **AddToProjectDialog** — `app/src/components/workstation/dialogs/AddToProjectDialog.tsx`. Blocks user if they have no projects. Add inline "Create new project" option.
- **Earnings page** — `app/src/app/creator/earnings/page.tsx`. Either implement a stub ("Coming in Phase 4") or hide the nav link until monetization ships.
- **Build worker script** — `app/scripts/build-worker.sh` already has uncommitted improvements from a prior session. Review and commit if the build still works.

---

## How to use this doc

1. Pick the top unclaimed item.
2. Read the files in "Files to touch" before writing any code.
3. Open a draft PR with your branch + a link to the matching ClickUp task.
4. Post before/after screenshots in the PR for any visual change.
5. Update this doc when you finish — add a ✅ and the PR link next to the item.
6. If you find something new that belongs on this list, add it under the right priority bucket.

## Completed

<!-- Steven: move items here when merged, with PR link -->


## P0-1 — Marketplace vs. "My Creations" separation

PR LINK: https://github.com/DevFrmwrkd/motionkit/pull/1

**Problem.** The `presets` table mixes authored presets (`authorId`), forks (`parentPresetId`), and published marketplace items (`status: "published"`, `isPublic: true`). The workstation `PresetLibrary` (left panel) shows them all in one flat list, and downloaded/forked presets are indistinguishable from originals. Collections exist but are only reachable from `/dashboard/collections` — they are not wired into the library browsing flow in the workstation.

**Files to touch.**
- `convex/schema.ts` — possibly add a `libraryType` enum ("original" | "fork" | "saved-variant") derived from existing fields
- `convex/presets.ts` — add queries that split by origin
- `app/src/components/workstation/PresetLibrary.tsx` — add tabs: **Originals** / **Forks** / **Saved Variants** / **Collections**
- `app/src/components/marketplace/PresetCard.tsx` — add origin badge ("Original", "Forked from @creator")
- `app/src/app/dashboard/collections/page.tsx` — ensure collection CRUD still works after integration
- `convex/collections.ts` — add query to fetch presets grouped by collection

**Acceptance.**
- Workstation library has a clear tab bar separating Originals / Forks / Saved Variants / Collections.
- Collections appear as expandable folders in the library, not just on the dashboard.
- Each preset card shows a small badge indicating its origin.
- Dragging a preset into a collection works (or at minimum: right-click "Move to collection…" menu).

**Reference.** Neuform's left sidebar model — study how they separate "my stuff" from "marketplace browse" without overwhelming the UI.

---

## P0-2 — Remix / Clone flow

PR LINK: https://github.com/DevFrmwrkd/motionkit/pull/2

**Problem.** `ForkButton` exists (`app/src/components/preset/ForkButton.tsx`) but it's a small outline button only visible in the workstation header *after* you've already opened a preset. In the marketplace, there's no prominent "Clone to Workspace" CTA on cards or on the preset detail page. There's no post-fork feedback — user forks, nothing obvious happens, they have to figure out where the fork went.

**Files to touch.**
- `app/src/components/marketplace/PresetCard.tsx` — add primary "Clone to Workspace" button (visible on hover or always, your call)
- `app/src/app/p/[presetId]/page.tsx` (or the marketplace detail view) — prominent CTA in header
- `app/src/components/preset/ForkButton.tsx` — after successful fork, show toast with "Open Fork →" action that navigates to `/workstation?presetId=<newId>`
- `app/src/app/workstation/page.tsx` — when viewing a fork (i.e. `parentPresetId` is set), show a banner: "You're remixing @creator's preset — your changes are saved to your fork. [View original]"

**Acceptance.**
- Every marketplace card has a visible clone CTA.
- Clicking clone → toast with "Open Fork" → lands in workstation with the fork loaded.
- Workstation shows a subtle "remixing" banner when editing a fork.
- Forking is discoverable from anywhere you can see a preset, not just the workstation.

**Reference.** Neuform treats remixing as the primary action, not a hidden advanced feature. Copy that philosophy.

---

## P0-3 — Public creator profile pages

PR LINK: https://github.com/DevFrmwrkd/motionkit/pull/3

**Problem.** `convex/users.ts` already has `getPublicProfile` (lines ~236-274) with `bio`, `website`, `socialLinks`, `isPublicProfile` fields. None of it is rendered anywhere. Author names on preset cards are plain text with no link. There's no page showing "all presets by this creator".

**Files to touch.**
- `app/src/app/creators/[userId]/page.tsx` — **new file**. Fetch `getPublicProfile` + their published presets. Layout: avatar + name + bio on top, tabs for Presets / Stats / Social, grid of preset cards.
- `app/src/components/marketplace/PresetCard.tsx` — make author name/avatar clickable → creator profile
- `app/src/app/p/[presetId]/page.tsx` — link author block to profile
- `app/src/app/settings/page.tsx` — add a "Profile Preview" card showing the public URL, how creator profile will appear to others, and a toggle for `isPublicProfile`
- `convex/users.ts` — extend `getPublicProfile` if needed to return aggregate stats (total downloads, total votes, preset count)

**Acceptance.**
- `/creators/[userId]` renders a polished creator profile.
- Author mentions link to their profile everywhere.
- Settings page shows a live preview of how the user's profile looks to others.
- Creator can opt their profile in/out of public visibility.

**Reference.** Neuform creator profiles (and, for inspiration beyond that, Figma Community profiles / Dribbble profiles).

---

## P0-4 — Marketplace PresetCard redesign

PR LINK: https://github.com/DevFrmwrkd/motionkit/pull/4

**Problem.** `app/src/components/marketplace/PresetCard.tsx` (lines ~70-89) falls back to a plain centered uppercase category label ("INTRO", "TRANSITION") when there's no thumbnail. This is the dominant visual in the marketplace and it looks like a placeholder. Hover states are minimal. No visual hierarchy between free/premium, popular/new.

**Files to touch.**
- `app/src/components/marketplace/PresetCard.tsx`
- Possibly a new `app/src/components/marketplace/CategoryGradient.tsx` helper

**Acceptance.**
- Missing thumbnails get category-specific gradient backgrounds (intro = blue→purple, transition = pink→orange, overlay = teal→amber, etc.) with a subtle geometric overlay or motion icon.
- Hover state: card lifts, gradient animates, subtle amber border or glow.
- Premium presets get a distinct treatment (subtle violet tint or badge).
- Card shows download count and vote count with icons.
- Grid looks good at 3 / 4 / 5 columns (test responsive).

---


## P1-5 — Design system pass (Landing / Marketplace / Dashboard / Workstation)

PR LINK: https://github.com/DevFrmwrkd/motionkit/pull/5

**Problem.** Landing hero uses aggressive amber/orange gradient. Marketplace + dashboard + workstation use flat zinc tones with minimal accent color usage. Category buttons are plain pills. Stat cards on the dashboard are flat with small icons and no color coding. Workstation header is sparse.

**Files to touch.**
- `app/src/app/marketplace/page.tsx` (lines ~129-146) — category buttons need hover gradients + active state depth
- `app/src/app/dashboard/page.tsx` (lines ~105-123) — stat cards need colored icon backgrounds and accent borders
- `app/src/app/workstation/page.tsx` (lines ~550-636) — header polish: panel toggle icons, spacing, badges indicating what's in each panel
- Possibly a `app/src/components/ui/StatCard.tsx` — extract if you end up duplicating

**Acceptance.**
- Consistent card elevation (shadow scale) across all pages.
- Amber-500 used as primary accent, violet-500 as brand accent — use them with intent, not randomly.
- Hover states feel tactile: gradient shift + shadow lift, not just background color change.
- Dashboard stat cards are color-coded and scannable at a glance.
- Before/after screenshots in the PR.

**Constraint.** Do not install a new design system. Use existing Shadcn/UI + Tailwind + the amber/violet/zinc palette.

## P1-6 — Loading + error states

PR LINK: https://github.com/DevFrmwrkd/motionkit/pull/6

**Problem.** Several flows silently hang. Marketplace search shows nothing while loading. Sandboxed preset player has no error boundary — a broken preset can freeze the workstation. Compile error tracking exists in schema but user feedback is generic.

**Files to touch.**
- `app/src/app/marketplace/page.tsx` (lines ~63-68) — show skeleton cards or dimmed overlay when `searchResults === undefined`
- `app/src/components/preset/SandboxedPresetPlayer.tsx` — wrap in try/catch + ErrorBoundary, show compile errors inline
- `app/src/components/workstation/RenderQueue.tsx` — verify all job states (queued/running/error/done) have clear UI
- Any `useQuery` call that powers a primary view should handle `undefined` (loading) and `null` (empty) cases distinctly

**Acceptance.**
- No silent hangs anywhere in the golden path.
- Broken presets show a helpful error card, not a blank screen or frozen player.
- Search results show skeleton shimmer while loading.
- Empty states have helpful copy + a CTA ("No forks yet — browse the marketplace →").

---

---


## P1-7 — Saved Variants drawer in workstation

PR LINK: https://github.com/DevFrmwrkd/motionkit/pull/7

**Problem.** Saved variants (customized versions of a preset's input values, without forking the code) are only accessible via URL params `?savedPresetId=...`. No UI to browse them while working. The `savedPresets` Convex table exists and has the data.

**Files to touch.**
- `app/src/components/workstation/InputControls.tsx` — add a "Variants" dropdown or drawer
- `convex/savedPresets.ts` — query "variants for this preset + this user"
- `app/src/hooks/` — possibly new `useSavedVariants(presetId)` hook

**Acceptance.**
- When viewing a preset in the workstation, a "Variants" control lets you switch between saved variants without reloading.
- "Save as new variant" button captures current form state.
- Variants show their name and last-modified time.

---



## P1-8 — Preset VersionHistory UI

**Problem.** `app/src/components/preset/VersionHistory.tsx` exists but is mostly placeholder. `presetVersions` table exists in schema. No rollback, no diff view.

**Files to touch.**
- `app/src/components/preset/VersionHistory.tsx`
- `convex/presets.ts` — query versions for a preset, add `revertToVersion` mutation
- Workstation header — wire the "history" button to actually open the panel

**Acceptance.**
- Timeline of versions with timestamp + change summary.
- "Revert to this version" button with confirmation dialog.
- Optional: side-by-side diff of schema values between two versions.

---