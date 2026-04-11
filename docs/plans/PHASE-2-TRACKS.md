# Phase 2 -- Parallel Track Split (Claude + GPT)

> Two agents working in parallel on Phase 2. This doc defines **who owns what**, **where the boundaries are**, and **how to avoid merge conflicts**. Both agents read `PHASE-2.md` first, then this doc, then start work.
>
> **Single progress log:** `docs/plans/PHASE-2-PROGRESS.md`. Both agents append to it. See §5.

---

## 1. Split Philosophy

The split is **vertical by concern**, not horizontal by layer -- so each agent owns a full stack slice of their workstreams and rarely has to wait on the other.

- **Claude track = Platform & Pipeline.** Runtime hardening, publish pipeline, admin, monetization backend. Mostly `convex/`, security-critical.
- **GPT track = Creator Experience & AI.** Template ports (AI edit loop), workstation upgrades, launch presets, fork UI, trust badges UI. Mostly `app/`.

The only shared file with real conflict risk is `convex/schema.ts`. **Claude owns it.** GPT files schema change requests in the progress log and Claude applies them in dedicated commits.

---

## 2. Claude Track -- Platform & Pipeline

**Owner:** Claude (this IDE / this agent lineage)

**Mission:** Make the marketplace trustworthy. Every published preset is signed, sandboxed, test-rendered, reviewable, and monetizable. Preview output is bit-identical to cloud render output.

### Workstreams (from PHASE-2.md)
- **WS-1** Preset Runtime Hardening (sandbox, signing, shared compile path, structured compile errors)
- **WS-2** Publish Pipeline (schema validator, automated test render, review state machine)
- **WS-6** Monetization backend (license model, Stripe Checkout, Stripe Connect, usage meters) -- behind feature flag
- **WS-7** Admin / Moderation Tooling (review queue, broken-render detection, audit log)

### Files Claude owns exclusively (write access)
```
convex/schema.ts                              # SINGLE WRITER
convex/lib/sandbox.ts                         # new
convex/lib/signing.ts                         # new
convex/lib/authz.ts                           # extend (admin role)
convex/actions/validateAndTestRender.ts       # new
convex/actions/renderWith*.ts                 # extend for signed bundles
convex/presetReview.ts                        # new (state machine)
convex/presetEvents.ts                        # new (append-only metrics)
convex/analytics.ts                           # new (rollups)
convex/licenses.ts                            # new
convex/billing.ts                             # new
convex/admin.ts                               # new
convex/lib/keyStorage.ts                      # extend (already uncommitted)
app/src/lib/preset-runtime/sandbox.ts         # new (capability allowlist)
app/src/app/admin/**                          # new
app/src/app/checkout/**                       # new
scripts/sign-bundle.mjs                       # new
```

### Files Claude reads but does NOT write
- `app/src/lib/code-to-component.ts` -- GPT is porting the sanitize-response extractor; Claude imports the result in the shared compile path but does not edit.
- `app/src/components/preset/SandboxedPresetPlayer.tsx` -- GPT owns the UI; Claude provides the sandbox helpers it imports.
- `convex/aiGeneration.ts` -- GPT owns (follow-up edit mode port).

### Schema changes Claude will make (heads-up for GPT)
Claude will add these tables/fields in order. GPT should pull before starting work that reads any of them:

1. Extend `presets`: `reviewState`, `publishableFlags`, `currentVersionId`, `forkedFrom`, `forkedVersion`, `license`, `priceCents`, `bundleSignature`
2. New `presetVersions` table
3. New `presetEvents` table
4. New `auditLog` table
5. New `licenseGrants` table (feature-flagged usage)
6. New `usageMeters` table

GPT's tables (`presetComments`, `brandKits`) will be filed as schema requests in the progress log -- Claude applies them in a dedicated "schema sync" commit.

### Don't touch (GPT's exclusive area)
- `convex/aiGeneration.ts`
- `convex/lib/ai_skills/**`
- `app/src/lib/code-to-component.ts`
- `app/src/lib/preset-runtime/` (except the new `sandbox.ts` Claude is adding)
- `app/src/app/workstation/**`
- `app/src/app/creator/upload/**` UI (Claude owns the Convex-side validation, GPT owns the wizard UI)
- `app/src/components/workstation/**`
- `app/src/components/marketplace/**`
- `presets/**` (launch presets are GPT's port)

### Claude's suggested work order
1. **WS-1a:** Shared compile path -- extract pure compile function callable from both client and server worker. Import in `SandboxedPresetPlayer` and render workers.
2. **WS-1b:** Capability-allowlist sandbox scope. Red-team tests (no `fetch`, no `window`, no escape).
3. **WS-1c:** Bundle signing model + R2 signer + client verifier.
4. **WS-1d:** Structured compile-error schema + logging table.
5. **WS-2a:** Schema extensions for review state + versions. Dedicated commit, tag `schema-sync-1`.
6. **WS-2b:** `validateAndTestRender` Convex action: parse schema/meta, headless compile, enqueue test render.
7. **WS-2c:** Review state machine + transitions + audit log.
8. **WS-7:** Admin dashboard pages + moderation actions.
9. **WS-6** (behind `ENABLE_MONETIZATION` flag): license model, Stripe Checkout, Connect, usage meters.

---

## 3. GPT Track -- Creator Experience & AI

**Owner:** GPT (other IDE, Codex/other agent)

**Mission:** Make the workstation feel like a real tool. Port the Remotion template's AI edit loop, build the timeline, land 4 launch presets, ship the fork/remix UX and trust badges.

### Workstreams (from PHASE-2.md)
- **Template ports** (follow-up edit mode, auto-correction, sanitize-response, skill dedup, streaming metadata, frame-image refs) -- from `remotion-dev/template-prompt-to-motion-graphics-saas`
- **WS-3** Fork, Versioning & Attribution (UI side)
- **WS-4** Workstation Upgrades (timeline, multi-format export, brand kits, batch variations)
- **WS-5** Marketplace Trust UI (badges, reviews, analytics dashboards)
- **Launch presets** (TikTok, Audiogram, Code Hike, Stargazer)

### Files GPT owns exclusively (write access)
```
convex/aiGeneration.ts                        # extend: follow-up mode, auto-correction, dedup
convex/lib/ai_skills/**                       # extend: dedup tracking, skill md loader
app/src/lib/code-to-component.ts              # upgrade: brace-count extractor
app/src/lib/preset-runtime/                   # mapHelpers/iconHelpers/styleHelpers
  # (except sandbox.ts which Claude owns)
app/src/components/preset/SandboxedPresetPlayer.tsx
app/src/components/workstation/**
app/src/components/marketplace/**
app/src/components/preset/ForkButton.tsx      # new
app/src/components/preset/VersionHistory.tsx  # new
app/src/components/preset/TrustBadges.tsx     # new
app/src/components/preset/CompareView.tsx     # new
app/src/app/workstation/**
app/src/app/creator/upload/**                 # wizard UI (calls Claude's validator)
app/src/app/preset/[id]/compare/**            # new
app/src/app/creator/dashboard/**              # new (reads Claude's analytics API)
app/src/hooks/useAutoCorrection.ts            # port from template
app/src/hooks/useConversationState.ts         # port from template
app/src/hooks/useRenderQueue.ts               # extend for batch groups
presets/tiktok-captions/**                    # port from Remotion template
presets/audiogram/**                          # port
presets/code-hike/**                          # port
presets/stargazer/**                          # port
```

### Files GPT reads but does NOT write
- `convex/schema.ts` -- **read only.** File schema change requests in the progress log; Claude applies.
- `convex/presets.ts`, `convex/renderJobs.ts` -- GPT reads the query/mutation surface, calls them from the UI. If GPT needs a new query/mutation there, file a request in the progress log and Claude adds it, OR GPT adds it in `convex/creatorDashboard.ts` (a new file GPT owns) to avoid touching Claude's files.
- `app/src/lib/preset-runtime/sandbox.ts` -- Claude's, GPT imports.
- `convex/lib/sandbox.ts`, `convex/lib/signing.ts` -- Claude's, GPT's workstation edit flow consumes them indirectly via the shared compile path.

### Don't touch (Claude's exclusive area)
- `convex/schema.ts` (schema change requests go in the progress log)
- `convex/lib/sandbox.ts`, `convex/lib/signing.ts`, `convex/lib/authz.ts`, `convex/lib/keyStorage.ts`
- `convex/actions/validateAndTestRender.ts`, `convex/actions/renderWith*.ts`
- `convex/presetReview.ts`, `convex/presetEvents.ts`, `convex/analytics.ts`, `convex/licenses.ts`, `convex/billing.ts`, `convex/admin.ts`
- `app/src/app/admin/**`, `app/src/app/checkout/**`

### GPT's suggested work order (can start immediately, no wait on Claude)
1. **Port sanitize-response.ts brace-count extractor** into `app/src/lib/code-to-component.ts`. ~1 hour, pure win.
2. **Port prompt-validation pre-step** into `convex/aiGeneration.ts`. Cheap gate.
3. **Port follow-up edit mode** (`FollowUpResponseSchema` + `applyEdits`) into `convex/aiGeneration.ts`. Biggest AI UX win.
4. **Port `useAutoCorrection` hook** into `app/src/hooks/`. Wires to Claude's structured compile errors once WS-1d lands -- use `{ error: string }` as a stub until then.
5. **Port skill dedup** into `convex/lib/ai_skills/map.ts` (`previouslyUsedSkills` tracking).
6. **Port 4 launch presets** (TikTok, Audiogram, Code Hike, Stargazer) into `presets/`.
7. **WS-4 Timeline** -- decide buy vs. build, integrate with `@remotion/player`.
8. **WS-4 Multi-format export UI** (dispatches via new Convex mutation that Claude adds, or via an existing `renderJobs.create` batch param).
9. **WS-4 Brand kits UI** (reads `brandKits` table -- file schema request first).
10. **WS-3 Fork button + version history UI** (reads `presetVersions` -- wait for Claude's schema-sync-1 tag).
11. **Creator upload wizard UI** (calls Claude's `validateAndTestRender` action -- coordinate via progress log when Claude ships WS-2b).
12. **WS-5 Trust badges + creator dashboard UI** (reads Claude's analytics API -- coordinate when WS-5 backend lands).

---

## 4. Boundaries & Conflict Protocol

### The only shared file: `convex/schema.ts`
Rule: **Claude is the sole writer.** GPT never edits it directly.

When GPT needs a schema change:
1. GPT appends a schema request block to `PHASE-2-PROGRESS.md` (see template in §5)
2. Claude sees it on next sync, applies it in a single commit tagged `schema-sync-N`
3. Claude marks the request as applied in the progress log
4. GPT pulls and resumes

Claude batches schema requests into the same commit when possible to keep history clean.

### Shared test surface
Both agents should run:
```bash
pnpm build              # must stay green
npx convex dev --once   # must stay green
```
before every commit. If one agent breaks the build, they own the fix -- do not push red.

### Naming to avoid collisions
- New Convex functions: prefix with the owning workstream file, not the action verb. `presetReview.approve` not `approvePreset`.
- New React components: group under owner's folder tree. GPT's workstation components never live in `app/src/components/admin/`, and vice versa.
- New Convex tables: document in the schema request BEFORE writing UI that reads them.

### Import direction rule
- `app/` may import from `convex/` generated types (always)
- `convex/` never imports from `app/`
- `presets/` never imports from `app/` or `convex/` -- presets are self-contained bundles

### Commit hygiene
Both agents:
- One workstream per commit when possible
- Commit message format: `[claude|gpt] [WS-N] <one-line summary>`
- Example: `gpt WS-4 add timeline component skeleton`
- Example: `claude WS-2b validateAndTestRender action + schema-sync-1`

### Pull frequency
- Pull before starting a new workstream
- Pull before every commit
- If the progress log shows the other agent touched a file you're about to touch, coordinate in the log first

---

## 5. Unified Progress Log

**File:** `docs/plans/PHASE-2-PROGRESS.md`

Both agents append to this file. It is the single source of truth for "what's done, what's next, what's blocked."

### Structure
```markdown
# Phase 2 -- Progress Log

## Status Summary
<!-- updated at the top of every session by whichever agent is active -->
- Claude: <current workstream> -- <status>
- GPT: <current workstream> -- <status>
- Last schema-sync tag: <tag>
- Blockers: <list or "none">

## Schema Change Requests (GPT -> Claude)
<!-- append-only. Claude marks applied with date + commit hash. -->
### REQ-001  [status: pending]
- Requested by: gpt
- Date: YYYY-MM-DD
- Table: `presetComments`
- Change: new table
- Fields: `{ presetId, userId, category, body, resolvedInVersion }`
- Indexes: `by_preset`
- Reason: WS-5 review threads need it
- Applied: -

## Session Log
<!-- append-only. Newest at bottom. -->
### 2026-04-11 claude WS-1a
- Extracted pure compile function into `convex/lib/compile.ts`
- Imported from `SandboxedPresetPlayer` and `renderWith*.ts`
- Red-team test added: `test/sandbox-escape.test.ts`
- Next: WS-1b capability allowlist

### 2026-04-11 gpt ports
- Ported `sanitize-response.ts` brace-count extractor into `code-to-component.ts`
- Ported prompt-validation pre-step into `aiGeneration.ts`
- Starting follow-up edit mode port next
- Blocker: none

## Completed Workstreams
<!-- move entries here once a workstream is fully done. -->

## Known Issues & Deferred
<!-- things discovered mid-work that don't belong in the current workstream -->
```

### Rules for the progress log
- **Append-only.** Never edit another agent's entries. To correct, add a new entry.
- **Timestamp every entry** with date and owning agent.
- **One session = one entry** per workstream touched.
- **Schema requests get their own section**, numbered `REQ-NNN`.
- **Blockers are surfaced at the top** in the Status Summary so the other agent sees them immediately.
- **Don't summarize -- state facts.** "Added X, broke Y, next is Z" beats "made good progress on things."

---

## 6. Kickoff Checklist

Before either agent writes code:

- [ ] Both agents have read `PHASE-2.md` and `PHASE-2-TRACKS.md`
- [ ] `PHASE-2-PROGRESS.md` exists with the skeleton from §5
- [ ] Both agents know which files they own and which they do NOT touch
- [ ] Git is clean, both on `main`
- [ ] `pnpm build` and `npx convex dev --once` both green
- [ ] First Status Summary written in the progress log

Then:
- Claude starts with **WS-1a** (shared compile path extraction)
- GPT starts with **sanitize-response port** (no dependencies, pure win)

These two workstreams touch zero shared files -- parallel from minute one.
