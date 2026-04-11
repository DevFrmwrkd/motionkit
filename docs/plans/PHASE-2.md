# Plan -- Phase 2: Marketplace, Workstation Upgrade & Real Rendering

> Scope: turn MotionKit from "scaffolded workstation + Phase 1 loop" into a trustworthy marketplace where creators publish, users fork and remix, and every preset has a known-good cloud render.
>
> Audience: the agent picking up after Phase 1. Read `README.md`, `docs/CONTENT-MAP.md`, and `AGENTS.md` (Next.js breaking-change notice) first.

---

## 1. Goals

1. **Preview == Export.** What the Remotion Player shows in the workstation must be bit-identical to what the cloud render produces.
2. **Publishable quality bar.** No preset reaches the marketplace without validated schema, metadata, a test render, and a thumbnail.
3. **Native remixing.** Fork, version, and attribution are first-class -- not a post-hoc feature.
4. **Real monetization path.** Premium licensing, checkout, creator analytics, and payout reporting exist end-to-end, even if gated behind a feature flag at launch.
5. **Marketplace trust.** Moderation tooling, automated test renders, and runtime sandboxing so growth doesn't break the product.

### Non-goals for Phase 2
- Real-time multi-user editing
- Mobile native app
- Self-hosted render tier (deferred to Phase 5)
- AI voice / audio generation

---

## 2. User Stories

### Creators -- publish & iterate
- **As a creator**, I want to publish an AI-generated or imported preset and have it render for real in the cloud, so that preview and export are finally the same product.
- **As a creator**, I want a preset upload wizard that validates schema, metadata, thumbnail, and renderability before publish, so that broken presets never reach the marketplace.
- **As a creator**, I want my preset page to show views, clones, renders, saves, and conversion to purchase, so that I can understand what people actually value.
- **As a creator**, I want premium licensing and checkout for paid presets, so that MotionKit becomes a real monetization channel instead of just a gallery.

### Users -- fork, edit, render
- **As a user**, I want to fork any public preset into my own library with attribution and version history, so that remixing feels native instead of hacked together.
- **As a user**, I want to edit a preset's code or props and know exactly whether the change is saved, previewed only, or publishable, so that the workstation feels trustworthy.
- **As a user**, I want to render multiple variations of the same preset in one batch, so that I can produce campaign assets fast instead of one-by-one.

### Buyers -- evaluate & review
- **As a buyer**, I want every marketplace preset to show "previewable", "renderable", and "commercial-use ready" badges, so that I know what is production-safe before I spend money.
- **As a buyer**, I want to compare forks and versions of a preset, so that I can choose the best variant without opening each one manually.
- **As a buyer**, I want to leave feedback, bug reports, and feature requests on a preset, so that creators can improve popular templates quickly.

### Workstation power users
- **As a video editor**, I want a real timeline with seek, playhead sync, and markers, so that the workstation feels closer to a lightweight motion tool than a form preview.
- **As a marketer**, I want one-click multi-format export for landscape, square, portrait, and story sizes, so that one preset can power a full channel rollout.
- **As a brand team**, we want saved brand kits with logos, colors, fonts, and default copy blocks, so that every preset starts on-brand.

### Platform -- safety, quality, monetization
- **As the platform**, we want a secure preset runtime and signing model, so that community presets can run safely without risking user data or infra abuse.
- **As the platform**, we want internal review tooling for moderation, broken-render detection, and publish approvals, so that marketplace quality scales with growth.
- **As the platform**, we want automated preset test renders on publish, so that every listing has a known-good output before it goes live.
- **As the platform**, we want creator analytics and payout reporting, so that paid marketplace operations are manageable.
- **As the platform**, we want usage-based pricing for rendering and AI generation, so that free exploration and paid production can coexist cleanly.

---

## 3. Workstreams

Ordered by dependency, not by what's most fun.

### WS-1 -- Preset Runtime Hardening (unblocks everything else)
**Why first:** Phase 1 shipped `SandboxedPresetPlayer` + `preset-runtime/` but the sandbox is `new Function(...)` with injected scope. Before community presets run in other users' browsers, the runtime needs a signing model and a capability boundary. This also unblocks "preview == export" because the server render must use the same compile path as the client.

- **Signed bundles.** Every published preset bundle in R2 is signed server-side; the client verifies before compiling. Reject unsigned bundles in production.
- **Capability allowlist.** The sandbox scope is an explicit allowlist (React, Remotion exports, `preset-runtime` helpers). No `fetch`, no `document`, no `window`, no `import()`.
- **Shared compile path.** `code-to-component.ts` is the single source of truth for client preview AND server render. The Modal/Lambda worker imports the same compile function so the two paths cannot drift.
- **Compile-error schema.** A structured error type (phase: `parse|transpile|runtime`, line, column, hint) surfaced in the UI and logged to Convex for moderation.

**Deliverables:** `app/src/lib/preset-runtime/sandbox.ts`, signing helpers in `convex/lib/`, worker import of shared compile path, error schema in `convex/schema.ts`.

### WS-2 -- Publish Pipeline & Upload Wizard
Depends on: WS-1.

- **Upload wizard** (`/creator/upload`, currently stubbed): multi-step flow -- source (AI generation / code paste / file upload / fork), schema editor, metadata (name, description, category, tags, license), thumbnail (auto-generated + manual override), test render, publish review.
- **Schema validator.** Convex mutation that parses the preset's exported `schema` and `meta`, runs the compile path headlessly, and returns a structured report.
- **Automated test render.** On "Publish", enqueue a render of the preset at its default props via the existing `renderJobs` table. Mark the preset as `publishable` only after the test render succeeds and yields a thumbnail + a 3-5s preview MP4.
- **Review state machine.** `draft -> validating -> test-rendering -> pending-review -> approved -> published` (plus `rejected`, `archived`). Convex functions for each transition, audit log table.
- **Creator dashboard.** List of own presets with current state, last test-render status, metrics stub (see WS-5).

**Deliverables:** `app/src/app/creator/upload/*`, `convex/presets.ts` (expand), `convex/actions/validateAndTestRender.ts`, `convex/schema.ts` (add review states + audit log).

### WS-3 -- Fork, Versioning & Attribution
Depends on: WS-2.

- **Fork button** on every public preset page. Clones the bundle into the user's workspace, records `forkedFrom: presetId` + `forkedVersion: n`.
- **Version history.** Each preset has an append-only `versions` subtable: `{ versionNumber, bundleR2Key, createdAt, changelog, testRenderId }`. Users edit a working copy; "Save as version" snapshots it.
- **Attribution chain.** Public preset page shows "Forked from X by Y". Forks inherit the license of the parent unless parent license forbids derivatives.
- **Fork comparison view.** Given two preset IDs (or two versions of the same preset), render both side-by-side in Remotion Players + diff the schemas and metadata. Purely visual diff for code is a stretch goal.

**Deliverables:** `convex/schema.ts` (add `versions` + `forkedFrom`), `app/src/app/preset/[id]/compare/page.tsx`, fork button in marketplace UI, attribution component.

### WS-4 -- Workstation Upgrades (timeline, multi-format, brand kits)
Depends on: WS-1.

- **Real timeline component.** Seek, playhead sync with `@remotion/player`, markers for schema-driven keyframes (e.g. "Title enters at 0.5s"). **Consider buying the Remotion "Timeline" paid template** instead of building from scratch -- see §6.
- **Edit-state model.** Clear UI state: `saved`, `preview-only (unsaved)`, `publishable draft`. The Save button commits to a new version; Publish kicks off WS-2's pipeline.
- **Multi-format export.** On render, user picks 1-N of `{16:9 1920x1080, 1:1 1080x1080, 9:16 1080x1920, 4:5 1080x1350}`. Dispatch one render job per format, grouped under a `projectId` in the `projects` table.
- **Brand kits.** New Convex table `brandKits`: `{ userId, name, logoR2Key, colors[], fonts[], defaultCopy }`. Workstation has a "Apply brand kit" dropdown that merges into current prop values.
- **Batch variations.** Accept an array of prop overrides; queue N renders as one batch. Render queue UI groups by batch.

**Deliverables:** `app/src/components/workstation/Timeline.tsx`, `app/src/components/workstation/BrandKitPicker.tsx`, `convex/brandKits.ts`, multi-format dispatch in `convex/actions/renderWith*.ts`.

### WS-5 -- Marketplace Trust (badges, reviews, analytics)
Depends on: WS-2.

- **Trust badges** on every listing: `Previewable` (compile succeeded), `Renderable` (last test render succeeded in < N seconds), `Commercial-use ready` (license allows commercial AND creator accepted content policy). Badges are computed fields in Convex, not stored strings.
- **Review & feedback thread.** Per-preset comments table with categories: `feedback | bug | feature-request`. Creators can mark resolved. Tie to version history so "bug in v2" can be shown resolved in v3.
- **Creator analytics.** New Convex view: `views, clones (forks), renders, saves, purchaseConversions` per preset per day. Aggregated server-side; dashboard is read-only for MVP.
- **Preset metrics tracking.** Cheap append-only `presetEvents` table, rolled up by a scheduled Convex action.

**Deliverables:** `convex/presetEvents.ts`, `convex/analytics.ts`, `app/src/components/marketplace/TrustBadges.tsx`, creator dashboard page.

### WS-6 -- Monetization (premium, checkout, payouts)
Depends on: WS-2, WS-5.

- **License model.** Each preset has `license: free | commercial-free | paid-personal | paid-commercial` with a price in cents. Enforced server-side on download.
- **Checkout.** Stripe Checkout for paid presets. On successful payment, Convex mutation grants the buyer a license grant in `licenseGrants` table.
- **Creator payouts.** Stripe Connect Express. Creator dashboard shows pending + paid-out earnings. Platform fee percentage configurable.
- **Usage-based pricing for render + AI.** Per-user render seconds and AI-generation token meters. Free tier quotas; paid tier = BYOK or platform-billed.
- **Feature flag.** Entire monetization path lives behind `ENABLE_MONETIZATION=true` so we can ship WS-2..5 first and turn this on once Stripe is set up.

**Deliverables:** `convex/licenses.ts`, `convex/billing.ts`, `app/src/app/checkout/*`, Stripe webhooks in `convex/actions/`, usage meters in `convex/schema.ts`.

### WS-7 -- Admin / Moderation Tooling
Depends on: WS-2.

- **Admin dashboard** at `/admin` (role-gated): pending review queue, flagged presets, broken-render alerts, manual approve/reject with reason, audit log viewer.
- **Broken-render detection.** Scheduled job re-runs a small test render on N presets/day; any failures raise a flag.
- **Moderation actions.** Archive, unlist, force-edit metadata, contact creator.

**Deliverables:** `app/src/app/admin/*`, `convex/admin.ts`, admin role check in `convex/lib/authz.ts` (already exists -- extend).

---

## 4. Schema Additions (Convex)

New or extended tables. Implementation must be additive -- do not drop existing tables.

- `presets` (extend): `reviewState`, `publishableFlags`, `currentVersionId`, `forkedFrom`, `forkedVersion`, `license`, `priceCents`
- `presetVersions` (new): `{ presetId, versionNumber, bundleR2Key, changelog, createdAt, testRenderId }`
- `presetEvents` (new): append-only `{ presetId, userId?, type, createdAt }`
- `presetComments` (new): `{ presetId, userId, category, body, resolvedInVersion? }`
- `brandKits` (new): see WS-4
- `licenseGrants` (new): `{ userId, presetId, grantedAt, stripeChargeId }`
- `usageMeters` (new): `{ userId, period, renderSeconds, aiTokens }`
- `auditLog` (new): `{ actorId, action, targetType, targetId, payload, createdAt }`

Indexes: add `by_review_state`, `by_creator`, `by_preset` as needed. Keep the existing `by_category`/`by_tags` indexes intact.

---

## 5. Success Metrics for Phase 2 Completion

Phase 2 ships when all of the following are true:

1. A non-developer creator can go from AI prompt -> published marketplace preset without leaving the app.
2. Every published preset on marketplace has a verified test render and thumbnail.
3. A buyer can fork a public preset, edit it, save as v2, render in 3 formats, and see it as a draft in their dashboard.
4. Admin can approve / reject / unlist any preset.
5. At least one end-to-end paid purchase happens on staging (Stripe test mode).
6. Sandbox cannot `fetch()`, read `window.localStorage`, or break out of the allowlist (verified by red-team tests).
7. Preview and cloud render produce bit-identical output for the 4 launch presets.

---

## 6. Leverage: steal from the Remotion "Prompt-to-Motion-Graphics" template

The remotion-dev template repo (`remotion-dev/template-prompt-to-motion-graphics-saas`) already solves several subproblems. Adopt the ideas, not the files -- their compiler is weaker than ours, but their generate/edit loop is stronger.

**High value, port directly:**
1. **Follow-up edit mode** (`src/app/api/generate/route.ts` `FollowUpResponseSchema` + `applyEdits`). Structured output decides `edit` (array of `old_string`/`new_string` patches) vs `full` replacement. Massive speedup for iteration in WS-4's workstation edit loop. Port into `convex/aiGeneration.ts`.
2. **Auto-correction loop** (`src/hooks/useAutoCorrection.ts`). Compile error -> auto-reprompt with the exact error + failed edit context, tracks AI-vs-user change source so it won't auto-fix user typos. Directly relevant because WS-1's structured compile errors feed this.
3. **Prompt validation pre-step.** A cheap `generateObject` classifier gates garbage prompts before spending tokens on generation.
4. **Skill deduplication.** Tracks `previouslyUsedSkills` in a conversation so follow-ups don't re-inject skill markdown the LLM has already seen. Wire into `convex/lib/ai_skills/map.ts`.
5. **`sanitize-response.ts` brace-counting extractor.** ~40 lines, more robust than regex for pulling the component body out of LLM output. Drop-in upgrade for `code-to-component.ts` preprocessing.
6. **Streaming metadata event.** Prepend a `{type: "metadata", skills: [...]}` SSE event before the code stream so the UI can show "loading chart skill..." while the model is still thinking.

**Medium value, reference presets for launch content:**
Port as paid/free launch presets -- covers "four diverse launch presets" from the original Phase 2 sketch in one shot:
- **TikTok** -- word-by-word captions (social-media category, huge demand)
- **Audiogram** -- audio-reactive waveforms (podcast category)
- **Code Hike** -- animated code snippets (dev-tools category)
- **Stargazer** -- GitHub stars celebration (viral / demo preset)

**Consider buying:**
- **Timeline** (paid template) for WS-4's timeline component. A copy-pasteable React timeline saves weeks vs. building from scratch.
- **Editor Starter** (paid) only if WS-4 timeline integration reveals more gaps. Otherwise skip.

**Do not port:**
- Their `compiler.ts` (uses `@babel/standalone`, ~2MB, hard-coded imports list) -- our sucrase-based `code-to-component.ts` is already better.
- Their `DynamicComp.tsx` -- uses `getInputProps()` to inline code into a render. Our R2-bundle + shared-compile-path (WS-1) is the right model.
- Their Next.js scaffold -- we have our own.

**Estimated time savings from porting above:** 1.5-2 weeks off WS-4 (edit loop + timeline + launch presets).

---

## 7. Risks & Open Questions

- **Sandbox security is the single biggest risk.** Budget a dedicated red-team pass before WS-6 monetization flips on. A single `fetch()` escape in a community preset while real money is flowing is catastrophic.
- **Preview-vs-render parity.** The shared compile path in WS-1 is the mitigation; verify with pixel-diff tests on the launch presets.
- **Stripe Connect onboarding friction** could stall creator payouts. Consider manual payout workflow for the first N creators.
- **Legal: commercial-use licensing.** Get a lawyer to review the preset license grid before WS-6 ships. "Commercial-use ready" is a claim buyers will hold us to.
- **R2 egress on popular presets.** Currently zero-egress, but bundles loaded by every preview could spike read ops costs. Add edge caching in front of R2 before marketplace hits ~1k DAU.
- **Review moderation throughput.** If AI-generated presets flood the review queue, we need either stricter auto-validation or a paid-review SLA. Not solved in Phase 2 -- flag for Phase 3.

---

## 8. Suggested Work Order

1. **WS-1** Preset runtime hardening (sandbox + shared compile path + signing)
2. **Port template follow-up edit mode + auto-correction + sanitize-response** (parallel to WS-1, lands in `convex/aiGeneration.ts`)
3. **WS-2** Upload wizard + publish pipeline
4. **WS-3** Fork + versioning (unlocks remix UX)
5. **WS-4** Workstation upgrades (buy Timeline template here)
6. **Port 4 launch presets** (TikTok, Audiogram, Code Hike, Stargazer) as soon as WS-2 is live
7. **WS-5** Trust badges + analytics
8. **WS-7** Admin tooling (can start in parallel with WS-5)
9. **WS-6** Monetization (behind feature flag until legal + Stripe ready)
10. **Security red-team pass** before flipping monetization flag

---

## 9. What To Read Before Starting

- `CLAUDE.md` (root) -- project overview and current phase status
- `app/AGENTS.md` -- **Next.js breaking changes notice, must read**
- `docs/plans/00-overview.md` -- original roadmap
- `docs/plans/01-frontend.md`, `02-backend.md`, `03-infrastructure.md` -- architecture decisions to not re-litigate
- `docs/CONTENT-MAP.md` -- what already exists in the repo
- `convex/schema.ts` -- current data model
- `app/src/lib/code-to-component.ts` + `app/src/lib/preset-runtime/` -- the compile path you'll be hardening in WS-1
- `app/src/components/preset/SandboxedPresetPlayer.tsx` -- uncommitted Phase 1 work-in-progress
- GitHub: `remotion-dev/template-prompt-to-motion-graphics-saas` -- the template we're porting edit loop + skills from
