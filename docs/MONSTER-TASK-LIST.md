# MotionKit — Monster Task List & Multi-Agent Orchestration Plan

> Compiled: 2026-04-16 · Revised: 2026-04-16 post-sync
> Author: audit-pass by Claude
> Supersedes (extends, does not replace): `IMPROVEMENT-PUNCHLIST.md`, `DESIGN-REMIX-SPEC.md`, `STEVEN-ONBOARDING.md`, `CONTENT-MAP.md`
> North star (UX/UI): https://neuform.ai — minimal, editorial, "designed" not "scaffolded"
>
> **⚠ Important update (2026-04-16 post-sync).** After the initial compilation,
> local `main` was 35 commits behind origin/main because macOS `._pack-*.idx`
> files were aborting `git fetch`. Once cleaned, the pull landed **all eleven
> Steven feature branches (PRs #1–#9) plus the `devpatch1` Vercel-deploy
> chain (PRs #10–#18)**. Much of the P0/P1 product UX work is now done.
> See the "Post-sync completion matrix" section below before starting work.

---

## Post-sync completion matrix (2026-04-16 post-pull)

After the 35-commit pull, Steven's branches merged cleanly. Status:

| Bucket / punch-list | Status | Evidence |
|---|---|---|
| P0-1 Library origin separation | ✅ merged | PR #1, commit `a07fb3f`, `PresetLibrary.tsx` +433 lines |
| P0-2 Remix / clone flow | ✅ merged | PR #2, commit `add1503`, Clone CTA primary action |
| P0-3 Public creator pages | ✅ merged | PR #3, commit `357a0a5`, new route `app/src/app/creators/[userId]/page.tsx` |
| P0-4 Marketplace PresetCard redesign | ✅ merged | PR #4, commit `be0fa14`, thumbnail fallback rebuilt |
| P1-5 Design system pass | ✅ merged | PR #5, commits `46f3aa9` + `b9f9cb8` + `19c8841` |
| P1-6 Loading + error states | ✅ merged | PR #6, commit `2d19a79`, new `PresetCardSkeleton`, `ErrorBoundary` |
| P1-7 Saved variants drawer | ✅ merged | PR #7, commit `393ad71`, new `VariantsDropdown`, `useSavedVariants` |
| P1-8 Preset version history | ✅ merged | PR #8, commit `53aa516`, new `VersionTimeline` |
| P2-9 Polish bugs | ✅ merged | PR #9, commit `e63ad8a` |
| Vercel deploy chain | ✅ merged | PRs #10–#18, `vercel.json`, relative paths, convex codegen step |
| `docs/neuroform-study.md` | ✅ added | Steven's Neuform study (note: file is spelled "neuroform" — typo) |

**This invalidates Buckets 5, 6, 7, 13 and most of Bucket 8 from the original
plan.** Before starting UX work, open the app and verify the merged state
meets the acceptance criteria in `IMPROVEMENT-PUNCHLIST.md`. The
`docs/neuroform-study.md` file is Steven's answer to the design brief —
read it before touching design work.

## What I landed in this same session (2026-04-16 post-sync)

Inline with producing this list, the following P0/P1 gaps from Part C were fixed
and typecheck-verified (7/7 shared-package tests green, both `convex/` and `app/`
type projects clean):

1. `convex/actions/lib/renderDispatch.ts` — replaced optional-authUserId path
   with an explicit discriminated `DispatchAuth = { kind: "user" } | { kind: "internal" }`
   so a future refactor of the public path cannot silently skip the ownership
   check. Added prototype-pollution stripping to `parseJobPayload`. Removed
   dead `dispatchPlatformJob` helper (no callers).
2. `convex/votes.ts` — 3-second cooldown between vote state transitions on
   the same `(userId, presetId)`. Honest behaviour (vote, reconsider, unvote)
   fits inside the window; +1/-1 burst churn is blocked.
3. `app/src/app/admin/review/page.tsx` — replaced `window.prompt()` for
   reject/archive with an accessible in-app shadcn Dialog + Textarea with
   character counter, required-vs-optional rules, and explicit submit state.
   Reject now blocks on empty reason; archive allows blank.
4. `convex/lib/moderation.ts` — new shared `normalizeReason` helper enforcing
   `MAX_MODERATION_REASON_LENGTH = 1000`. Applied in `admin.ts` (`forceUnlist`,
   `forceEditMetadata`, `setUserRole`) and `presetReview.ts` (`adminApprove`,
   `adminReject`, `adminArchive`). Empty-after-trim is treated as absent.
5. `convex/presetReview.ts` — `pruneCompileErrorsOlderThan` now takes a
   bounded `.take(scanCap)` slice instead of unbounded `.collect()`, so a
   runaway backlog can't OOM the cron.
6. `convex/admin.ts` — `setUserRole` last-admin check now caps the scan at
   10 000 rows and short-circuits on the first second-admin found. Comment
   flags the follow-up (add `by_role` index if the user table outgrows this).
7. `shared/aiProviderConfig.ts` — new `validateOpenRouterModelId` with a
   strict `<vendor>/<model>[:<tag>]` pattern, used in `convex/users.ts`'s
   `updateApiKeys` so a malformed model id is rejected at the mutation
   boundary instead of failing at generation time.
8. Recreated `.env.example` as a documented template (no secrets, no real
   values) listing every env var the code reads, where each one lives (root
   dot-env vs Convex deployment env vs app dot-env), and what happens when
   it's missing. Replaces the version deleted in commit `f27b772`.

## 0 — How to read this document

This is three documents in one:

1. **Situation Report** — the state of the repo on 2026-04-16, things the next human + agent waves must know before touching code (Part A, B, C).
2. **Task Buckets** — thirteen self-contained work streams, each scoped so one agent or one human can own it in parallel without stepping on another (Part D).
3. **UX / UI Direction** — the "make it feel like an app, not an AI demo" brief with concrete, specific moves, tied to Neuform's restrained style (Part E).

Each bucket is written so an agent reading only that bucket + the three sibling docs (`IMPROVEMENT-PUNCHLIST.md`, `DESIGN-REMIX-SPEC.md`, `STEVEN-ONBOARDING.md`) can execute without reading the others. That means there is intentional repetition between buckets — do not "dedupe" it away.

**Global rule for any agent picking up a bucket:**

- `app/AGENTS.md` declares the frontend is built on a version of Next.js with breaking changes from what models were trained on. **Before writing or refactoring Next.js code, read `node_modules/next/dist/docs/`** for the specific API. Treat deprecation warnings as hard blockers.
- Auditing is cheap, code changes are expensive — **prefer small branches per bucket**, not one giant refactor.

---

## Part A — Situation Report: Git + Repo State

### A.1  Local vs Remote Alignment (run this first, it is the blocker)

**Local `main` is behind `origin/main`, and eleven Steven feature branches exist remotely but have never been fetched locally cleanly.**

| Ref | Local | Remote |
|-----|-------|--------|
| `main` | `098a9b2` (Apr 14) | `f27b772` (newer) |
| `backup-main` | — | `098a9b2` |
| `devpatch1` | — | `945d0c2f` |
| `feature/steven-design-system-pass` | — | `19c88414` |
| `feature/steven-loading-error-states` | — | `2d19a791` |
| `feature/steven-marketplace-preset-card-redesign` | — | `be0fa143` |
| `feature/steven-p1-8-preset-version-history` | — | `53aa516b` |
| `feature/steven-polish-bugs` | — | `e63ad8a0` |
| `feature/steven-saved-variants` | — | `393ad719` |
| `steven/build-public-creator-pages` | — | `357a0a5c` |
| `steven/library-origin-separation` | — | `a07fb3fc` |
| `steven/remix-clone-flow` | — | `add1503e` |

There are also at least 18 open PR refs (`refs/pull/1/head`–`refs/pull/18/head`) on the remote — the punch-list items have been in flight.

### A.2  Why fetch is broken

`git fetch` floods with `error: non-monotonic index .git/objects/pack/._pack-073eddf1f7234e1a04c1746db199f5e1b67c8fa8.idx`. The `._pack-*.idx` file is a macOS Finder AppleDouble metadata twin sitting next to the real pack. Git treats it as a broken pack index and aborts mid-fetch, which is why `refs/remotes/origin/main` is stuck at the old `098a9b2` even after a `git fetch` reported the new SHA.

The filesystem volume (external SSD) is HFS+ or a non-APFS filesystem that produces `._` shadow files when macOS writes extended attributes to dot-files. The `.DS_Store` files throughout the tree are another symptom.

**Fix path (proposed, do NOT run without human approval — this is a shared repo):**

1. Back up the repo — `cp -a "Remotion Marketplace" "Remotion Marketplace.pre-cleanup"`.
2. Delete all AppleDouble files: `find .git -name "._*" -delete` (scoped to `.git` first, then the working tree if agreed).
3. Add `COPYFILE_DISABLE=true` to shell rc so future `cp`/`tar` don't regenerate them.
4. `git fsck --full` to confirm pack files are still valid.
5. `git fetch --all --prune` and verify all 11 Steven branches + `backup-main` + `devpatch1` now resolve locally.
6. Consider moving the repo to an APFS volume, or add a filesystem attribute to suppress AppleDouble (`xattr -c -r .git`).
7. Add `.DS_Store` and `._*` globs to `.gitignore` (they are partially there — confirm).

**Do not merge / rebase anything onto `main` until this is clean.** You will otherwise lose track of which of Steven's branches have been integrated.

### A.3  Triage of Steven's branches (from branch names — contents not yet diffable locally)

The names map 1:1 onto items in `IMPROVEMENT-PUNCHLIST.md`:

| Branch | Almost-certainly covers | Status to confirm |
|--------|-------------------------|-------------------|
| `steven/library-origin-separation` | P0-1 (Originals / Forks / Variants / Collections tabs) | Open PR? merged? draft? |
| `steven/remix-clone-flow` | P0-2 (Clone CTA + toast + banner) | |
| `steven/build-public-creator-pages` | P0-3 (`/creators/[userId]`) | |
| `feature/steven-marketplace-preset-card-redesign` | P0-4 (PresetCard with category gradients) | |
| `feature/steven-design-system-pass` | P1-5 (Landing/Marketplace/Dashboard/Workstation polish) | |
| `feature/steven-loading-error-states` | P1-6 (skeletons, error boundaries, sandbox player) | |
| `feature/steven-saved-variants` | P1-7 (Variants drawer in workstation) | |
| `feature/steven-p1-8-preset-version-history` | P1-8 (VersionHistory UI + revert) | |
| `feature/steven-polish-bugs` | P2-9 (collections dialog trigger, AddToProject, earnings stub, build-worker.sh) | |
| `devpatch1` | unknown — suspected ad-hoc patch | Needs inspection |

**First required action after git cleanup: diff each Steven branch against `origin/main` and produce `docs/STEVEN-BRANCH-INVENTORY.md`** listing for each branch: base commit, files changed, tests added, whether it's rebased onto current main, and whether its punch-list item can be ticked off. This is **Bucket 1 / Task 1**.

### A.4  Branches we know only by name

`backup-main` is a safety snapshot at the old `098a9b2`. Do not delete.

---

## Part B — Architecture Reality Map (vs the docs)

**The onboarding docs undersell the codebase by ~60%.** `CONTENT-MAP.md` lists ~12 Convex modules; there are 18 + 4 actions. It says `presets/` is a "minimal template"; there are 6 production-shaped presets in there. It doesn't mention `render-worker`, `r2-uploader`, `shared/`, `scripts/sign-bundle.mjs`, `tests/`, or the `/admin` + `/checkout` route trees. An agent reading only the onboarding docs will build on a wrong mental model.

### B.1  Routes that actually exist (not in CONTENT-MAP)

- `/admin`, `/admin/audit`, `/admin/broken-renders`, `/admin/review`, `/admin/users` — full moderation surface.
- `/checkout/[presetId]`, `/checkout/success` — Stripe checkout pages.
- `/p/[presetId]` — public preset detail.
- `/import` — manual Remotion preset importer (adjacent to `/create`).
- `/creator/analytics`, `/creator/earnings`, `/creator/upload` — scaffolded, not wired.

### B.2  Convex modules that actually exist (not in CONTENT-MAP)

- `admin.ts` — admin-only mutations (role changes, unlist, force-edit).
- `analytics.ts` — `creatorOverview`, `adminOverview` rollups.
- `auth.ts`, `auth.config.ts` — Convex Auth wiring.
- `billing.ts` + `licenses.ts` — Stripe checkout + license grants + usage meters.
- `crons.ts` — at least one scheduled job (compile error pruning).
- `geminiSeed.ts`, `seedPresets.ts` — seed scripts.
- `http.ts` — Stripe webhook endpoint.
- `presetEvents.ts` — event emission (view/preview/fork/render/save/purchase).
- `presetReview.ts` — `draft → validating → test-rendering → pending-review → approved → published` state machine.
- `votes.ts` — upvote/downvote.
- `actions/generatePreset.ts`, `actions/renderWithLambda.ts`, `actions/renderWithWorker.ts`, `actions/validateAndTestRender.ts`, plus `actions/lib/renderDispatch.ts` (the real brain).

### B.3  Schema tables that actually exist (13, not 6)

`presets`, `users`, `collections`, `savedPresets`, `renderJobs`, `projects`, `aiGenerations`, `votes`, `presetVersions`, `presetEvents`, `auditLog`, `compileErrors`, `licenseGrants`, `usageMeters`, `brandKits`, `presetComments` + `authTables`.

Several of these appear wired on the backend but have **no frontend surface yet**: `brandKits`, `presetComments`, most of `presetVersions`, `licenseGrants` usage meters view, `auditLog` read-back.

### B.4  Infrastructure packages (completely missing from CONTENT-MAP)

- `render-worker/` — Fastify + p-queue + Remotion.bundle() self-hosted renderer. Deploys to Hetzner via rsync + systemd + Caddy. HMAC-signed endpoint.
- `r2-uploader/` — Cloudflare Worker that accepts rendered MP4s over HMAC-signed `PUT /renders/<jobId>.mp4`. **Does NOT yet accept preset bundles.**
- `shared/` — tri-imported (app + convex + tests) workspace that is **not actually registered in `pnpm-workspace.yaml`** (see B.7).
- `scripts/sign-bundle.mjs` — local utility to HMAC a preset bundle. **Never called from CI, never called from an upload endpoint, orphaned.**
- `tests/` — 3 Node test-runner files. `pnpm test` glob is broken on macOS.

### B.5  Presets sprawl (two libraries, only one plugged in)

- `app/src/remotion/presets/` — 11 Claude/Gemini presets — **this is what the app actually renders** (listed in `shared/renderableCompositionIds.ts`).
- `presets/` — 6 complete presets (`_template`, `audiogram`, `code-hike`, `stargazer`, `text-title`, `tiktok-captions`) — **NOT in the render registry, NOT bundled, NOT uploaded to R2, effectively dead code** until the preset-bundling pipeline ships.

### B.6  CSS / theme inconsistency (root cause of "feels AI-generated")

`app/src/app/globals.css` defines an `oklch` design-token set that is **white-on-white** (`--card: oklch(1 0 0)`, `--primary: oklch(0.205 0 0)` — near-black). Meanwhile every real component writes `bg-zinc-950`, `text-zinc-100`, `bg-amber-500` as hardcoded Tailwind classes. **Result: shadcn primitives read tokens that are wrong for dark mode, while the rest of the app is dark.** This produces visual glitches (dropdowns with light backgrounds on dark pages, focus rings that disappear) and forces duplicated colour decisions everywhere. See Bucket 5.

### B.7  `pnpm-workspace.yaml` is slightly wrong

- Lists `"presets/*"` — but presets are **not pnpm packages** (they have no `package.json`).
- Does not list `"shared"` — so tri-imports work only because the relative path `../../shared/...` resolves by coincidence, not because the workspace knows the package exists.
- Does not list `"convex"` or `"r2-uploader"`.

### B.8  Environment surface drift

`.env.example` lists R2 and AI provider keys but **does not** list:

- `RENDER_WORKER_URL`, `RENDER_WORKER_SECRET` (required by `renderDispatch.ts`).
- `BUNDLE_SIGNING_SECRET` (used by `scripts/sign-bundle.mjs` and `convex/lib/signing.ts`).
- `UPLOAD_SECRET` (used by `r2-uploader`).
- Stripe keys for checkout + webhook.
- Any Convex Auth OAuth provider client IDs/secrets.

### B.9  What works end-to-end today (realistic)

- Sign-in (with a fix landed in commit `5eda40f`), demo mode, landing, marketplace browse, AI generation (`create` page), workstation preview with live props, save-as-variant, fork to own workspace, render queue record.
- **Mock render** (`actions/renderWithModal.ts` per `CONTENT-MAP.md` — though the current code seems to have pivoted to `renderWithWorker`/`renderWithLambda`; real end-to-end render is conditional on `RENDER_WORKER_URL` being set or Lambda creds being valid).
- Admin review page (with `window.prompt()` — see P0 in Bucket 9).

### B.10  What does not work end-to-end

- Preset publish → bundle upload → R2 → signature verify (the flow is half-implemented; client does not verify the HMAC, only server does — see Bucket 4).
- Render → R2 persistence → expiry cleanup (renders are written but orphaned; no cron deletes them).
- Stripe checkout (code exists; unverified whether webhook signature validation + dual idempotency are working — see Bucket 10).
- Collections as drag-targets in workstation (P0-1, on `steven/library-origin-separation`).
- Remix CTA on marketplace cards (P0-2, on `steven/remix-clone-flow`).
- Creator profile pages (P0-3, on `steven/build-public-creator-pages`).
- Preset-bundle workflow: the `presets/` folder to R2 never happens.

---

## Part C — Consolidated Critical Findings (union of three audit agents)

### C.0  Legend

- **P0**: blocker, data loss, security, or breaks the golden path.
- **P1**: major user-visible defect or architectural gap.
- **P2**: polish / a11y / dev-ex.
- All line numbers are approximate at time of audit; agents must re-read before touching.

### C.1  P0 — Security / data-integrity (FIX FIRST)

| # | File | Issue | Status |
|---|------|-------|--------|
| C.1.1 | `convex/actions/lib/renderDispatch.ts` | ~~`dispatchLambdaJob` skips ownership check if `authUserId` is undefined…~~ **Re-audit: not exploitable.** The public `renderWith{Worker,Lambda}.dispatchRender` always passes `authUserId`; only the Convex `internalAction` companion passes it unset, and Convex's type system forbids clients from invoking `internalAction`s. The optional-arg shape was still a foot-gun for future refactors. | ✅ Hardened (explicit discriminated `DispatchAuth`; dead `dispatchPlatformJob` removed; proto-pollution keys stripped in `parseJobPayload`). |
| C.1.2 | `convex/admin.ts:278–285` | `setUserRole` did `ctx.db.query("users").collect()` to enforce last-admin lockout. DoS vector at scale. | ✅ Bounded to `.take(10_000)` + short-circuit on first second-admin. `by_role` index is a follow-up. |
| C.1.3 | `convex/presetEvents.ts` | ~~Event insertion functions lack ownership validation.~~ **Re-audit: already correct.** Public `log` mutation at line 52 does `requireSignedInUser` + `canAccessPreset` before insert; the comment at lines 62–64 explicitly calls out the poisoning attack vector and blocks it. `logInternal` is `internalMutation` — not client-callable. | ✅ No change needed. |
| C.1.4 | `convex/billing.ts` (webhook handler, ~200–250) | Stripe dual-idempotency needs verification. | Deferred per scope (billing/CI skipped). |
| C.1.5 | `app/src/components/preset/SandboxedPresetPlayer.tsx` | ~~`postMessage` listener does not validate `event.origin`…~~ **Re-audit: already correct.** File comment at lines 124–130 explains why origin is meaningless under `sandbox="allow-scripts"` (null origin) and why `event.source === iframeRef.current.contentWindow` is the stronger check. | ✅ No change needed. |
| C.1.6 | `app/src/app/checkout/[presetId]/page.tsx` | Server must re-fetch `preset.priceCents`. | Deferred per scope (billing). |
| C.1.7 | `app/src/app/admin/review/page.tsx:39,53` | `window.prompt()` for rejection reason. | ✅ Replaced with shadcn Dialog + Textarea + char counter. |
| C.1.8 | `.git/objects/pack/._pack-*.idx` | AppleDouble files abort fetch. | ✅ Cleaned (`find .git -name "._*" -delete`); `._*` already in `.gitignore`. Tree will regenerate `._` files on any git write when the SSD is mounted — see §A.2 follow-up (`COPYFILE_DISABLE=true`, move to APFS). |
| C.1.9 | `package.json` test script | Glob broken. | Deferred per scope (CI). Workaround: `npx tsx --test tests/*.test.ts`. |

### C.2  P0 — Golden-path UX / behaviour

| # | File | Issue |
|---|------|-------|
| C.2.1 | `app/src/app/workstation/page.tsx` | No error boundary around the sandbox player. One broken preset freezes the whole workstation. |
| C.2.2 | `app/src/app/global-error.tsx` | No "Retry" / "Go Home" action. |
| C.2.3 | `app/src/app/dashboard/collections/page.tsx` | Collections feature still reads as placeholder (empty-state shown with no CTA to create). |
| C.2.4 | Render pipeline (`render-worker` output) | `PUBLIC_URL` must exactly match Caddy static path. If misconfigured, every render silently returns a broken `outputUrl`. No health check validates that `${PUBLIC_URL}/<jobId>.mp4` is actually reachable. |
| C.2.5 | `r2-uploader` | If the Worker is down, Lambda renders are lost with no retry. Convex marks the job `failed`. No dead-letter queue. |

### C.3  P1 — Backend gaps

| # | File | Issue | Status |
|---|------|-------|--------|
| C.3.1 | `convex/votes.ts:5–72` | No rate limit on flip. | ✅ 3 s cooldown on `(userId, presetId)` state change. |
| C.3.2 | `convex/actions/generatePreset.ts:53–73` | ~~`injectStyleContract` sanitizes by regex without a style whitelist.~~ **Re-audit: adequate.** The regex `[^a-zA-Z0-9_\-/.]/g` + 64-char slice prevents prompt injection (newlines, quotes, arbitrary text); the downstream `styleHelpers.getStyle()` is the authoritative resolver. A dynamic whitelist would add maintenance burden without meaningful extra safety. Comment at lines 58–63 explains the threat model. | ✅ No change needed. |
| C.3.3 | `convex/presetReview.ts:255–280` | Unbounded `.collect()`. | ✅ `.take(scanCap)` + `Math.min(maxBatch, 10_000)`. Follow-up: add `by_createdAt` index. |
| C.3.4 | `convex/presetReview.ts:154–162` | ~~`setReviewStateInternal` mirrors `reviewState` → `status` only for terminal states.~~ **Re-audit: intentional.** Comment lines 156–158 spells out the design: the public `status` field has three values (draft/published/archived) while `reviewState` has eight. Intermediate states are not meant to show to non-admins. | ✅ No change; design documented. |
| C.3.5 | `convex/crons.ts` | No error-capture on cron failure. | Open |
| C.3.6 | `convex/users.ts:70–97` | `getOrCreateDemoUser` race. | Open (low likelihood at demo scale; fix by adding a `@unique` constraint once Convex supports it). |
| C.3.7 | `convex/actions/lib/renderDispatch.ts` | No cron deletes expired renders from R2. | Open (Bucket 3). |
| C.3.8 | `convex/analytics.ts:140–162` | N-query fan-out in `creatorOverview`. | Open |
| C.3.9 | `convex/users.ts:182–183` | No shape check on `openRouterModel`. | ✅ `validateOpenRouterModelId` in `shared/aiProviderConfig.ts`, enforced in `updateApiKeys`. |
| C.3.10 | `convex/http.ts:36–42` | Stripe webhook timeout. | Deferred (billing). |
| C.3.11 | `convex/admin.ts:189–213` | Unbounded `reason` → audit log bloat. | ✅ `normalizeReason` enforces 1000-char cap across admin + preset-review mutations. |
| C.3.12 | `convex/actions/lib/renderDispatch.ts:111–119` | `parseJobPayload` JSON parse with no prototype-pollution guard. | ✅ Strip `__proto__`, `constructor`, `prototype` own-props after parse. |
| C.3.13 | `convex/presets.ts` (various) | Inconsistent error copy trailing-period. | P3 (cosmetic). Open. |
| C.3.14 | `convex/presetEvents.ts` + `convex/presetReview.ts` | Dead-code audit of internalQuery/internalMutation exports. | Open |

### C.4  P1 — Frontend gaps

| # | File | Issue |
|---|------|-------|
| C.4.1 | `app/src/app/marketplace/page.tsx:149–152` | Uses a single `Loader2` spinner instead of skeleton cards — the punch-list P1-6 deliverable. |
| C.4.2 | `app/src/app/marketplace/page.tsx:129–146` | Category pills are flat `px-3 py-1.5 rounded-full` — no hover depth, no active-state elevation, no result count. |
| C.4.3 | `app/src/app/marketplace/page.tsx` | No pagination or cursor — fetches everything. |
| C.4.4 | `app/src/components/marketplace/PresetCard.tsx` | Missing thumbnail → uppercase category label fallback. Pure placeholder look. P0-4 deliverable. |
| C.4.5 | `app/src/components/preset/SchemaForm.tsx` | No field-level validation error surface. No `<label htmlFor>` pairing. |
| C.4.6 | `app/src/hooks/useCurrentUser.ts` | Demo-mode state in React only; page refresh logs out. |
| C.4.7 | `app/src/hooks/useConversationState.ts` | AI requests lack `AbortController` — navigating away keeps the request live on BYOK keys. |
| C.4.8 | `app/src/lib/convex.tsx` | Connection errors caught but never reported; no Sentry/LogRocket hook. |
| C.4.9 | `app/src/app/p/[presetId]/page.tsx` | Invalid preset id renders a blank page, not a 404. |
| C.4.10 | `app/src/app/settings/page.tsx` | Billing tab is "Coming Soon" placeholder; API key reveal is plaintext with no masked toggle or copy-once reveal. |
| C.4.11 | `app/src/app/creator/earnings/page.tsx` | Scaffolded page visible to every creator in the nav. Either stub it or hide. Punch-list P2-9. |
| C.4.12 | `app/src/app/(auth)/login/page.tsx` | OAuth providers beyond Google are advertised but not implemented. |
| C.4.13 | `app/src/components/workstation/dialogs/AddToProjectDialog.tsx` | Blocks user with no projects — no inline "create new project". Punch-list P2-9. |
| C.4.14 | `app/src/app/dashboard/collections/page.tsx:110–117,279–301` | `ConfirmDialog` trigger is an empty Button with no label. Punch-list P2-9. |
| C.4.15 | `app/src/app/admin/review/page.tsx` | No confirm-before-approve; one-click destructive action. |
| C.4.16 | `app/src/app/globals.css` | Token palette is white-background; app is black-background. Shadcn components render with wrong colours in context. |
| C.4.17 | `app/src/components/shared/SiteHeader.tsx` | Keyboard-unfriendly dropdowns, logo missing aria-label. |
| C.4.18 | `app/src/app/error.tsx` | Generic error copy — no differentiation for 401/404/429/500. |

### C.5  P1 — Infra / build / deploy gaps

| # | File | Issue |
|---|------|-------|
| C.5.1 | `pnpm-workspace.yaml` | `"presets/*"` wrong (presets aren't packages). `"shared"` missing. |
| C.5.2 | `package.json` `preset:build` / `preset:upload` | Scripts declared but not implemented. |
| C.5.3 | `r2-uploader/src/index.ts` | No preset-bundle endpoint; only `/renders/<jobId>.mp4`. Blocks the P2+ publish flow. |
| C.5.4 | `r2-uploader/src/index.ts` | No rate limit, no request-size cap, no signature expiry, no access logs. |
| C.5.5 | `render-worker/deploy/deploy.sh` | No health-check gate; deploy "succeeds" even if Caddy reload failed. No docs for where `.env` lives on the VPS. |
| C.5.6 | `render-worker` ↔ `RENDERABLE_COMPOSITION_IDS` | No automated check that the 13 composition IDs in `shared/` match the Remotion bundle. |
| C.5.7 | No `.github/workflows/*` | No CI for tests, lint, typecheck, or preset-build. |
| C.5.8 | `.env.example` | Missing RENDER_WORKER_*, UPLOAD_SECRET, BUNDLE_SIGNING_SECRET, Stripe keys. |
| C.5.9 | `scripts/sign-bundle.mjs` | Orphan — never called from any pipeline. |
| C.5.10 | Preset signing | Client does not verify HMAC; trusts server response. Defeats part of the tamper-proof design. |

### C.6  P2 — Polish / DX / a11y

Consolidated list — agents should treat as a single backlog within Bucket 8 and Bucket 12:

- Missing `alt` on thumbnails, `aria-label` on icon buttons.
- No focus traps on custom dialogs.
- Duplicate inline loaders — extract a `Skeleton` / `Spinner` primitive.
- Duplicate empty-state text — extract `<EmptyState>` primitive (it exists in `marketplace/page.tsx` use — propagate).
- Inconsistent toast usage (sonner vs custom).
- `docs/CONTENT-MAP.md` drift: out-of-date on presets folder, backend modules, route tree. Fix in Bucket 12.
- `/admin/*` visually unaligned with the rest of the app (utilitarian table look).
- `/creator/analytics` uses mock data.
- `CategoryGradient` helper (mentioned in punch-list) does not exist yet.
- Dead code candidates: `getPresetInternal`, `getPrivateById`, `aws/` folder in render-worker, unused imports in workstation page.

---

## Part D — Task Buckets for Multi-Agent Orchestration

Each bucket is sized so it:

- Can be picked up by one agent (human or Claude subagent) in isolation.
- Produces one reviewable branch, ideally one PR.
- Has a clear "done" line.
- Declares its non-goals so agents don't scope-creep into another bucket.

Suggested concurrency shown in Part F.

---

### BUCKET 1 — Repo Hygiene & Branch Inventory (must complete before anyone else starts)

**Owner archetype:** senior generalist / repo maintainer.

**Premise.** The repo can't safely absorb work while `main` is behind origin and the git pack dir is corrupted by macOS metadata. Eleven Steven branches are unread.

**Scope.**
1. Clean AppleDouble pollution from `.git` (and, with agreement, the working tree).
2. Repair fetch; confirm `git fsck --full` is clean.
3. Pull `origin/main` into local `main` (or rebase `main` onto it if Theo has local changes — **ask first, commit log suggests he may**).
4. For each of the 11 Steven branches + `devpatch1` + `backup-main`, produce `docs/STEVEN-BRANCH-INVENTORY.md` with:
   - branch, base commit, commits ahead of main, files touched, punch-list item it claims, PR status (via `gh pr list`), conflict state after trial rebase, recommendation (merge / rebase / abandon / extract).
5. Tighten `.gitignore` for `.DS_Store`, `._*`, editor caches, local render output.
6. Add a `COPYFILE_DISABLE=true` hint to `README.md` for macOS devs.

**Non-goals.** Do not merge any branch. Do not rebase anything without sign-off. Do not alter force-push history. No code changes outside `.gitignore` / docs.

**Done when.** Inventory doc committed to `main`. All branches fetched. `git fetch` runs silent. First PR reviewer can see what to merge and what to drop.

**Unblocks.** Every other bucket.

---

### BUCKET 2 — Security & Backend Hardening (Convex)

**Owner archetype:** backend engineer with Convex + Node crypto experience.

**Premise.** C.1 and C.3 list real, exploitable issues. None of them are hard individually; together they are the #1 risk.

**Scope (one PR per cluster or a single focused hardening PR).**
1. **Render auth bypass** — `convex/actions/lib/renderDispatch.ts` line ~124: make the ownership check unconditional. Audit every call site of `dispatchLambdaJob` / `dispatchWorkerJob` to ensure auth context flows through.
2. **Vote rate limit** — `convex/votes.ts`: track `lastVoteAt` per user or a sliding window; reject bursts.
3. **Compile-error prune** — add `by_createdAt` index, switch `.collect()` to `.take(batchCap)` after `.gte()`.
4. **Admin last-admin lockout** — add `by_role` index on `users`; scan only admins.
5. **`presetEvents` authorization** — verify authed user matches `userId` or allow only internal mutations; untrusted public paths reject.
6. **`reviewState` ↔ `status` consistency** — `convex/presetReview.ts`: mirror every transition, or remove the public `status` read-path and switch queries to `reviewState`.
7. **Stripe webhook hardening** — `convex/billing.ts` + `convex/http.ts`: confirm `stripe.webhooks.constructEvent` signature verification is in place and `stripeChargeId` uniqueness is enforced. Add 30 s `Promise.race` timeout.
8. **Admin mutations** — cap `reason` at 1000 chars, trim whitespace, strip HTML.
9. **Render expiration cleanup** — add daily cron to delete R2 objects where `expiresAt < now()` and mark the `renderJobs` row accordingly.
10. **`openRouterModel` whitelist** — maintain allow-list or call the OpenRouter `/models` endpoint at update time.
11. **`inputProps` payload** — minimal Zod-style shape validator; reject `__proto__`, `constructor`, prototype-pollution keys.

**Non-goals.** No UI work. No `renderWithModal` rewrite. No new features. No new indexes beyond what these specific fixes need.

**Done when.** All C.1 backend items closed, plus at least C.3.1/3/4/7/10/11. Tests covering each fix (Bucket 11 provides the harness).

---

### BUCKET 3 — Render Pipeline End-to-End (trust + durability)

**Owner archetype:** infra / full-stack engineer comfortable with AWS Lambda, Fastify, HMAC, Caddy.

**Premise.** The render pipeline has three failure modes (worker output URL mismatch, Lambda → R2 single point of failure, no retry, no cleanup). `CONTENT-MAP.md` does not describe it.

**Scope.**
1. Document the actual topology in a new `docs/RENDER-PIPELINE.md` (include the diagram from my infra audit).
2. `render-worker`:
   - Add a post-render HEAD check that `${PUBLIC_URL}/${jobId}.mp4` is reachable before returning 200.
   - Add `/health` + `/ready` endpoints (if not present) and gate deploy.sh on `/health`.
   - Provide an explicit `.env.example` in `render-worker/`.
   - Document `MAX_CONCURRENCY` sizing vs RAM (Chromium OOM).
3. Lambda → R2 path:
   - Wrap `copyS3MP4ToR2()` with retry + exponential backoff (≤3 attempts).
   - On final failure, enqueue to a dead-letter queue / renderJobs status `copy-failed`.
   - Make `r2-uploader` idempotent on re-PUT (no-op if the same hash exists).
4. Add `RENDER_WORKER_URL`, `RENDER_WORKER_SECRET`, `UPLOAD_SECRET`, `BUNDLE_SIGNING_SECRET`, Stripe keys to `.env.example`.
5. Wire a `renderJobs` cleanup cron (renders older than `expiresAt`) that deletes R2 objects and marks the row expired.
6. Surface render progress: `render-worker` streams progress via Convex `patch` every 10%, not only on completion. (Phase 2 item — call it out in a follow-up bucket if scope slips.)

**Non-goals.** Do not redesign the queue. Do not switch away from Caddy / Fastify. No Modal integration.

**Done when.** A render that fails on the R2 step is either retried and succeeds, or lands visible in the admin `/admin/broken-renders` queue with a clear reason. `deploy.sh` aborts on unhealthy worker.

---

### BUCKET 4 — Preset Contract: Build, Sign, Upload, Verify

**Owner archetype:** platform engineer; needs esbuild, HMAC, React.

**Premise.** The preset plugin architecture is the heart of the product and the most half-built system. Right now the `presets/` folder is six complete presets that go nowhere: no bundler, no R2 upload endpoint, no client-side HMAC check, no versioning plumbing on the user-facing side.

**Scope.**
1. Preset bundler: implement `preset:build` script (probably esbuild → single ESM bundle with externals for `react`, `remotion`). Produce `bundle.js`, compute sha256, sign with `BUNDLE_SIGNING_SECRET`.
2. `r2-uploader`: add `PUT /presets/<presetId>/<versionNumber>/bundle.js` endpoint, HMAC-signed, with size cap (e.g., 5 MB) and content-type allowlist.
3. `preset:upload` script: uploads the signed bundle, writes a `presetVersions` row via a Convex action, transitions the preset to `validating` → `test-rendering`.
4. Client-side verification: `app/src/lib/preset-runtime/` fetches the bundle, recomputes sha256 locally, fails loudly if hash mismatches, then sends the signature to a new `convex/presets.verifyBundleSignature` query for HMAC check (client never needs the secret).
5. Unify the two preset sources: either move `app/src/remotion/presets/*` into `presets/*` and have the local dev server read from one place, or explicitly mark `app/src/remotion/presets/*` as "internal demo compositions" and `presets/*` as "user-publishable template space". Update `CONTENT-MAP.md`.
6. Land `presets/_template/` as the official "fork me" starter: include README, `schema.ts`, `meta.ts`, `component.tsx`, tests, and a `pnpm preset:dev` story.

**Non-goals.** Do not ship preset revocation / secret rotation (note as follow-up). Do not implement preset diff-view.

**Done when.** A developer can run `pnpm preset:build presets/text-title && pnpm preset:upload presets/text-title` and see the preset appear in marketplace staging, signature-verified on open.

---

### BUCKET 5 — Design System Pass: Tokens, Cards, Hover, Elevation

**Owner archetype:** designer-engineer. Must have a Neuform tab open the whole time.

**Premise.** The app looks AI-scaffolded because:

- Design tokens in `globals.css` are for a **light theme**, but every component is hardcoded dark.
- Primary amber + violet accents are never used in concert; they compete.
- Card hover states are background-colour flips with no depth or motion.
- Missing thumbnails render as centered uppercase labels on flat pills — the single most "placeholder-y" moment in the product.
- Every page has its own spacing and typography rhythm; no shared container, no shared section header, no shared stat card.

**Scope.**
1. **Tokens.** Rewrite `globals.css` `:root` + `.dark` to produce an actual dark palette that matches the zinc-950/zinc-100/amber-500/violet-500 used in components. Keep token names; change values. Then replace a sample of `bg-zinc-900` / `text-zinc-400` with the semantic token (`bg-card` / `text-muted-foreground`) in a pilot component (`PresetCard`) so shadcn primitives behave consistently.
2. **Elevation scale.** Pick three levels: flat (1 px border, no shadow), raised (subtle shadow + gradient border), floating (hover / modal). Define once, use everywhere.
3. **Hover recipe.** Settle a single tactile hover: 150 ms `translate-y-[-2px]`, shadow step-up, amber-tinted border (`border-amber-500/20`), no background flip. Encode as a Tailwind `group-hover` pattern.
4. **`PresetCard` rebuild (P0-4).**
   - Gradient placeholders per category (`CategoryGradient.tsx`): a two-colour gradient with one geometric mask (single SVG, not a random emoji). Avoid rainbow — keep within amber/violet/teal/rose.
   - Motion icon overlay (e.g., a small play / spark glyph) at 15% opacity bottom-right.
   - Persistent meta row: author + avatar, download count, vote score, a small license chip.
   - **Remove** the uppercase category label fallback.
   - Keep the card monospace-free; use Inter throughout.
5. **Stat cards.** Extract `components/ui/StatCard.tsx` with colour-coded icon chip (bg-amber-500/10, text-amber-500) — use in dashboard, creator, admin.
6. **Landing** — soften the amber → orange gradient in the hero; Neuform-style single-tone hero with one sharp heading. Remove the "AI-Powered Motion Graphics For Everyone." copy (reads like a pitch deck) and let the product demo carry the hero. Replace with one short editorial line.

**Non-goals.** Do not install a new design system. Do not introduce a third accent. Do not rewrite every page — just the tokens, the primitives, and the pilots.

**Done when.** The dev team can describe the look without saying "dark zinc with amber". Before/after screenshots in the PR. A new `docs/DESIGN-SYSTEM.md` documents the three elevation levels, the hover recipe, and the card anatomy. Shadcn dropdowns/dialogs render correctly on dark pages without hand-tweaked colours.

**Reference for the feel.** Neuform's specific moves to steal: restrained type scale, generous vertical rhythm, cards that feel like paper (not glass), muted palette with one hot accent only where action is required, no emoji, no "AI-generated" gradients that span the full colour wheel.

---

### BUCKET 6 — Library Structure + Remix Flow (P0-1 and P0-2)

**Owner archetype:** full-stack.

**Premise.** `steven/library-origin-separation` and `steven/remix-clone-flow` already exist. Bucket 1 tells us whether to land them, rebase, or continue. If the diffs are small enough, rebase and merge. If not, the punch-list is already written — re-derive.

**Scope.**
1. Four-tab library in `PresetLibrary`: Originals / Forks / Saved Variants / Collections. Drive from existing fields (`authorId`, `parentPresetId`, `savedPresets` table, `collections` array).
2. Origin badges on every `PresetCard` (works with the Bucket 5 card redesign).
3. Clone CTA: primary action on every marketplace card and the `/p/[presetId]` hero. Instant clone, toast with "Open Fork →". No confirmation dialog.
4. Workstation banner when viewing a fork: "Remixing @creator's preset — view original".
5. Collections: drag-to-folder OR right-click menu at minimum; expand as tree in library.
6. `convex/presets.ts`: `listMyOriginals`, `listMyForks`, `listMyCollections` (or a single `listMyLibrary({ tab })`).

**Non-goals.** Do not build the public creator profile — that's Bucket 7.

**Done when.** I can browse the marketplace, clone in one click, land in workstation with an unambiguous remix banner, save the customized props as a variant, and find all three in different tabs of "My Library".

---

### BUCKET 7 — Creator Profiles + Marketplace Polish (P0-3)

**Owner archetype:** full-stack with product-UI sensibility.

**Premise.** `getPublicProfile` exists; no route renders it.

**Scope.**
1. `app/src/app/creators/[userId]/page.tsx` — avatar + display name + bio + social links + stats (presets, downloads, votes) + tabbed list (Presets / Collections / future Followers).
2. Make every author mention in the app link to the profile.
3. Settings page: "Public profile preview" panel with a `Toggle` for `isPublicProfile` and a live preview card.
4. `convex/users.ts`: extend `getPublicProfile` with aggregate stats.
5. Empty state: "This creator hasn't published any presets yet" with CTA to browse marketplace.
6. Crawler: add `/creators/[userId]` to the public sitemap; OG tags for social share.

**Non-goals.** No follower graph, no DMs.

**Done when.** Every author mention is a clickable profile, and an unauthenticated user can share a profile URL that renders server-side.

---

### BUCKET 8 — Loading / Error / Empty / A11y Pass (P1-6 + a11y backlog)

**Owner archetype:** frontend engineer with a strong a11y reflex.

**Scope.**
1. Every primary `useQuery` gets: loading skeleton, empty state, error state. Start with marketplace grid, workstation preset library, dashboard stat row, `/p/[presetId]`, admin review queue.
2. `SandboxedPresetPlayer`: wrap in an `ErrorBoundary`; show a branded error card with the compile error; offer "Retry" + "Report".
3. Validate `event.origin` on the sandbox postMessage listener (security fix that lands in this bucket because it's adjacent).
4. Replace `window.prompt()` in admin review with a proper `<Dialog>` + `<Textarea>` + character count.
5. `global-error.tsx`: add "Try again" + "Go home" buttons.
6. a11y: labels on form fields, `alt` on thumbnails, `aria-label` on icon-only buttons, focus traps on dialogs, keyboard open/close on menus.
7. Extract `<Skeleton>`, `<EmptyState>`, `<ErrorState>` primitives — use them everywhere. No more one-off inline loaders.
8. Add `AbortController` to AI generation in `useConversationState`.

**Non-goals.** No visual redesign (Bucket 5). No new routes.

**Done when.** Running with the Convex dev server paused does not produce a single silent hang anywhere in the app. Axe DevTools reports zero critical issues on the top 6 routes.

---

### BUCKET 9 — Admin & Moderation Surface

**Owner archetype:** full-stack.

**Premise.** `/admin/*` exists but is utilitarian. Some of it is P0 (C.1.7 window.prompt). Some is feature-complete but invisible.

**Scope.**
1. Replace `window.prompt()` in `/admin/review/page.tsx` — confirmation dialog with reason textarea (covered in Bucket 8).
2. Add a confirm-before-approve step with a summary of publishable flags.
3. Wire `/admin/broken-renders` with the dead-letter data from Bucket 3.
4. `/admin/audit` needs a filterable table (actor, action, target, time). Use the `auditLog` table.
5. `/admin/users` role changes: after Bucket 2 adds `by_role`, ensure the page shows the admin count so the last-admin lockout is visible.
6. Admin nav: visually distinguish from user nav (e.g., violet header stripe) so admins are never confused which mode they're in.

**Non-goals.** No machine-learning moderation. No bulk actions bigger than 50 rows.

**Done when.** An admin can review, reject (with a reason that makes it to the creator), approve, audit, and see broken renders in one coherent surface.

---

### BUCKET 10 — Billing, Licensing, Monetization

**Owner archetype:** backend + Stripe fluent.

**Premise.** `billing.ts`, `licenses.ts`, `licenseGrants`, `usageMeters`, `/checkout/*` exist. Webhook handler exists. Integration correctness is unverified.

**Scope.**
1. Verify `stripe.webhooks.constructEvent` with raw body + signature in `http.ts`. (Bucket 2 starts this; this bucket finishes.)
2. End-to-end manual test on Stripe test mode: view → checkout → pay → webhook → grant in `licenseGrants`. Document in `docs/BILLING.md`.
3. Dual idempotency: on `checkout.session.completed`, guard with `stripeCheckoutSessionId`; on `charge.succeeded`, guard with `stripeChargeId`. Two independent inserts should not be possible.
4. Server-side price re-fetch in the checkout action (fix C.1.6).
5. Usage meters: nightly cron rollup; surface on creator `/creator/earnings`.
6. Settings page "Billing" stub — either implement plan switching (Stripe Customer Portal link) or hide the tab entirely until ready (Theo's preference per `DESIGN-REMIX-SPEC.md` §97).
7. License chip on `PresetCard` + `/p/[presetId]` — free / commercial-free / paid-personal / paid-commercial — uses `shared/presetPricing.ts`.

**Non-goals.** No creator payouts. No tax handling. No multi-currency.

**Done when.** A test Stripe purchase writes an auditable, idempotent license grant, and the creator sees the revenue in `/creator/earnings`.

---

### BUCKET 11 — Tests, CI/CD, DevOps

**Owner archetype:** DevEx / platform.

**Scope.**
1. Fix `pnpm test` glob. `tsx --test tests/*.test.ts` works; or switch to `vitest` if the team prefers.
2. Add `.github/workflows/ci.yml`: lint → typecheck → test on every PR.
3. Add `.github/workflows/preview.yml` for Vercel / Cloudflare Pages previews per PR.
4. Add Convex typecheck step (it's easy to break types between app and `_generated`).
5. Fix `pnpm-workspace.yaml`: add `"shared"`, remove `"presets/*"` unless the Bucket 4 work converts presets into packages.
6. Commit `convex/_generated/` if not already (Convex-generated API types) to prevent drift between contributors.
7. Introduce a lightweight test harness for Convex functions (Convex's test framework) covering: render auth, vote rate limit, compile-error prune, admin role change.
8. Add Playwright smoke test for the golden path: login → pick preset → type text → render queued → see queue row.
9. Pre-commit hooks via `simple-git-hooks` or `husky` — lint-staged.
10. Dependabot / Renovate config.

**Non-goals.** No full coverage target. No e2e on every feature.

**Done when.** Every PR runs CI; a red CI blocks merge; the golden path is smoke-tested nightly.

---

### BUCKET 12 — Documentation Reconciliation

**Owner archetype:** tech writer or senior engineer doing a sweep.

**Scope.**
1. Rewrite `docs/CONTENT-MAP.md` to match reality (18 Convex modules, 13 tables, full route tree, infra packages, `presets/` status).
2. Create `docs/RENDER-PIPELINE.md` (Bucket 3 output).
3. Create `docs/PRESET-PIPELINE.md` (Bucket 4 output).
4. Create `docs/DESIGN-SYSTEM.md` (Bucket 5 output).
5. Create `docs/BILLING.md` (Bucket 10 output).
6. Create `docs/DEPLOY.md` consolidating render-worker bootstrap, r2-uploader deploy, app deploy.
7. Retire / annotate `docs/plans/0X-*.md` as "historical planning" with a deprecation banner.
8. Re-read `STEVEN-ONBOARDING.md` and cross-check every file reference — many sections cite files that have evolved (e.g., `app/src/app/workstation/page.tsx` line numbers).
9. Add a prominent block to `app/AGENTS.md` restating the Next.js 16 warning so no agent ever skips it.
10. Add a `README.md` section on the macOS AppleDouble trap and the `COPYFILE_DISABLE` workaround.

**Non-goals.** Not a style-guide pass.

**Done when.** A new agent or human can clone the repo and reach a correct mental model by reading `README.md` + `CLAUDE.md` + this monster list + one pipeline doc of their choice.

---

### BUCKET 13 — Workstation UX Depth (P1-7, P1-8, and neighbours)

**Owner archetype:** frontend product engineer.

**Premise.** `steven/feature-*-saved-variants` and `feature/steven-p1-8-preset-version-history` cover pieces; they need to land together for a coherent workstation experience.

**Scope.**
1. **Variants drawer.** Right panel addition: "Variants" dropdown or slide-in drawer listing saved variants for the current preset + current user, with "Save current as variant" CTA and last-modified timestamp.
2. **Version history.** Header button opens a side panel with a vertical timeline: version N, timestamp, change summary, "Revert" button. Revert is a confirmation dialog; it creates a new version that matches the selected one (no destructive in-place rewrite).
3. **Header polish.** Per `IMPROVEMENT-PUNCHLIST.md` P1-5 lines 550-636 references, add: panel-toggle icons that show a "closed" state, a compact breadcrumb (`@creator → Preset Name`), keyboard shortcut hints (press `?` to show).
4. **Render queue.** Jobs in error state show a one-line actionable message + a "Re-queue" button.

**Non-goals.** No diff view between versions (can be a P2 follow-up).

**Done when.** A user can pick a preset, branch off a variant, iterate three versions, revert to v2, render, and see everything in one coherent panel system.

---

## Part E — UX / UI Direction: "Make it feel like an app, not an AI demo"

This is not a visual redesign RFP. It's a tight brief for the small set of moves that convert the app's feel from "scaffolded template" to "somebody designed this." Steven's `DESIGN-REMIX-SPEC.md` already nails the structural goals; this section is about the visual and interaction moves underneath them. **Everything here is implementable inside the existing shadcn + Tailwind + Inter/Geist stack — no new dependencies, no third accent colour.**

### E.1  Why it feels AI right now — the specific tells

1. **Gradient-heavy hero.** `bg-gradient-to-r from-amber-400 to-orange-500` on the landing page's headline is the #1 "AI demo" tell. It's the default Tailwind sunset gradient. Neuform's hero has no gradient at all — just high-contrast type, aggressive whitespace, and a single demo element. **Kill the gradient on the headline.** Keep the radial glow background if you want warmth; remove it from the word "Motion Graphics".
2. **Sparkles, Wand2, and Zap icons clustered in the hero.** Three "magic" icons in one viewport is a signature of generated UI. **Pick one** (a subtle mark, not a clip-art burst). Save Sparkles for the AI-Generate primary button.
3. **"AI-Powered Motion Graphics For Everyone."** — pitch-deck copy. Neuform's homepage leads with a short editorial sentence that describes what you *do*, not what the product *is*. Try a first-person or imperative sentence. Keep it under ten words. Let the demo carry the rest.
4. **Uppercase category labels as thumbnail fallback.** Centered "INTRO" in Helvetica on a flat pill is the other big tell. Replace with **category gradients + a small, calm motion glyph** (one per category, not per card).
5. **Two hardcoded accent colours (amber + violet) with no rule for when to use which.** It feels random. **Rule of thumb:** amber for action (button, active tab, hover border). Violet for identity moments (premium, brand, author chip). Muted zinc everywhere else. That's it.
6. **Same-level card stacking.** Every card has the same border, the same shadow, the same radius. The eye has no hierarchy. Introduce a **three-tier elevation scale** (flat / raised / floating) and use it to distinguish context from action.
7. **Radial spinner as the universal loading state.** Neuform's feel comes partly from zero-spinner loading — skeletons with subtle shimmer, not a `Loader2`. Remove `Loader2` from primary views.
8. **No empty-state personality.** "No presets yet" is on brand for a library; "No forks yet — browse the marketplace →" is on brand for a product. Every empty state needs a next action.
9. **Shadcn dropdowns rendering on white.** The `globals.css` vs Tailwind colour mismatch. This is a 10-minute fix and it immediately stops feeling AI (see Bucket 5 step 1).
10. **No motion hierarchy.** Everything animates the same amount or not at all. Neuform animates **one** thing per interaction — the card lifts, the border breathes, the shadow deepens. Not all three.

### E.2  Neuform's restraint, translated to concrete moves

Neuform's personality:

- **Off-white / soft beige or deep warm near-black,** never pure black. Ours is `bg-zinc-950` — already close, but consider `#0A0B0D` (slightly warmer) or a 2% noise overlay to avoid the "oled dead pixel" look.
- **One hot colour, used sparingly.** On Neuform it's their signature tone (a warm coral). Ours is amber — stop putting amber on backgrounds, put it only where the user acts.
- **Heavy, confident type.** Extrabold + tight tracking for headlines; regular weight for everything else. Ours already uses Inter extrabold on the landing; extend the discipline to marketplace / dashboard section headers.
- **Generous line-height on body.** `leading-relaxed` everywhere, not `leading-tight`.
- **Frames that breathe.** Card padding on Neuform is larger than you'd expect — 24–28 px — and the grid gap is also large. Ours uses `gap-5` (20 px) and interior padding of `p-4` (16 px). Bump to `gap-6 p-6` on the marketplace grid.
- **Active state with depth.** Ours does `bg-amber-500/20 text-amber-500 border-amber-500/30`. Good start. Add a 1 px inset top-shadow to suggest pressed-in ("this is the current tab"), and a matching 1 px outside shadow at bottom when hovering inactive.
- **Almost no icons in chrome.** Neuform's nav is text-only. Our `SiteHeader` is text-only too — keep it. But the inside of the app is over-iconed (`/create`, workstation, admin). Drop one icon per row and you'll feel the difference.
- **Photography / video over illustration.** Neuform uses actual screenshots of generated assets as thumbnails. Ours falls back to text because no thumbnails exist. Bucket 4 (preset build pipeline) unblocks auto-generated preview thumbnails from a 1 s render. **That is the single biggest "looks like a real app" unlock.**

### E.3  The "minimal" move (what you liked from Neuform)

"Minimal" on Neuform is not "empty." It's:

- **A lot of negative space around a small number of dense objects.** Apply this to the workstation header (right now it's busy); clear it to just breadcrumb + history + render, nothing else.
- **Text that earns its place.** Remove helper text that restates the obvious ("Choose a preset to get started"). Trust the user.
- **One colour, not a palette.** In the main content area, try rendering with *only* zinc + amber for a day. The violet can live in settings/billing badges.
- **Consistent rhythm.** Every section header is `text-sm font-medium text-muted-foreground uppercase tracking-wide` with `mb-3`. Every card inside follows the same padding and radius. A user's eye should be able to predict the next section's look.

### E.4  Thumbnail strategy (the fastest "it looks real" win)

Three tiers:

1. **Auto-rendered preview** — once Bucket 4 ships, a 1 s render frame with default props becomes the card thumbnail. This alone makes the marketplace feel real.
2. **Category gradient** — for presets that haven't rendered yet. Two-colour, one geometric SVG mask (rings, diagonal, dots, not a random shape). One mask per category.
3. **Author-supplied still** — optional override on creator upload; if uploaded, wins.

Under no circumstance should a card ever render with centered uppercase text in the thumbnail slot.

### E.5  Motion (micro-interaction) guidelines

- **Default easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (the Material "standard" curve). Set once in tailwind config as `ease-standard`.
- **Default duration:** 150 ms for hover, 200 ms for tab switch, 300 ms for modal enter, 400 ms for route transition. Anything over 400 ms feels laggy in a workstation.
- **Reduced motion:** respect `prefers-reduced-motion`. Kill all transitions to `duration-0` in that case.
- **One thing moves per interaction.** On card hover: the border and shadow. Not the text. Not the thumbnail. Not the badge. Restraint is the whole point.

### E.6  Copy (tone of voice)

Our copy is friendly-corporate. Neuform is terse-confident. Two passes:

1. **Imperative over declarative.** Not "Describe what you want and AI creates...", but "Describe it. Render it. Ship it." Rhythm matters.
2. **No emoji. No exclamation points. No "magic" / "powered by".** These are AI-demo tells.

### E.7  Quick-win list (one engineer, one afternoon)

If the team wants a single-afternoon move that lifts the feel before the real design pass, do these in order. They are strictly additive and do not conflict with any of Steven's branches:

1. Fix `globals.css` token values so `--card`, `--popover`, `--muted`, `--border` are dark. (~20 min.)
2. Remove the gradient on "Motion Graphics" in the landing headline. (~2 min.)
3. Remove two of the three hero icons. (~5 min.)
4. Replace the uppercase-label thumbnail fallback with a stock `CategoryGradient` component (even without the SVG mask yet). (~30 min.)
5. Swap `Loader2` for shadcn `Skeleton` on marketplace + dashboard + workstation library. (~45 min.)
6. Bump grid `gap-5` → `gap-6` and card padding to `p-6` on marketplace. (~5 min.)
7. Ship a single `<EmptyState>` primitive with `title`, `description`, `action` props; replace the three existing inline usages. (~45 min.)

Zero one of these is "AI-looking" anymore.

---

## Part F — Agent Orchestration Plan

### F.1  Dependency graph

```
Bucket 1 (Repo hygiene) ──┬──► every other bucket
                          │
                          └──► Bucket 12 (Docs) can start in parallel after Bucket 1

Bucket 2 (Backend security) ─── independent, run in parallel
Bucket 3 (Render pipeline) ──── independent, run in parallel
Bucket 4 (Preset pipeline) ──── independent, run in parallel
Bucket 5 (Design system) ─┬──► Bucket 6 (Library tabs)
                          ├──► Bucket 7 (Creator profiles)
                          └──► Bucket 13 (Workstation depth)
Bucket 8 (Loading/error) ── can start mid-Bucket 5
Bucket 9 (Admin) ─────────── after Bucket 2 lands
Bucket 10 (Billing) ──────── after Bucket 2 lands
Bucket 11 (CI/CD) ────────── independent, run in parallel with everything
Bucket 12 (Docs) ─────────── continuous — updates as other buckets land
```

### F.2  Recommended parallel waves

**Wave 0 (blocker, 1 agent):** Bucket 1.

**Wave 1 (parallel, 4 agents):** Bucket 2, Bucket 3, Bucket 4, Bucket 5. These four are the foundations — backend safe, render reliable, preset plumbing real, design system coherent.

**Wave 2 (parallel, 3 agents):** Bucket 6, Bucket 7, Bucket 13. Product-UI work that benefits from the Wave 1 design system.

**Wave 3 (parallel, 3 agents):** Bucket 8, Bucket 9, Bucket 10. Polish + admin + billing.

**Continuous (1 agent each, background):** Bucket 11, Bucket 12.

### F.3  Agent briefing template

When you spin up an agent for a bucket, paste it this:

```
You are picking up BUCKET <N>: <NAME> from docs/MONSTER-TASK-LIST.md in
the MotionKit repo.

Prerequisite reading (in this order):
1. docs/MONSTER-TASK-LIST.md sections: Part A, Part B, BUCKET <N>, Part E
   if UI, Part F.
2. app/AGENTS.md — Next.js version warning, read the real Next docs in
   node_modules/next/dist/docs/ before writing.
3. docs/STEVEN-ONBOARDING.md and docs/IMPROVEMENT-PUNCHLIST.md — overlap
   with your bucket. Defer to existing branches where possible.
4. docs/STEVEN-BRANCH-INVENTORY.md (produced by Bucket 1) to avoid
   reinventing work in flight.

Constraints:
- Create a branch named `bucket-<N>/<short-name>`.
- One reviewable PR per bucket. No scope creep into other buckets.
- Respect the "Non-goals" section of your bucket.
- Before any code change, read the files you plan to touch — line
  numbers in this doc may drift.
- Ping for review when the "Done when" criteria are met.
- Do not mark tasks done prematurely.
```

### F.4  Handoff points to Theo / human reviewer

The following are **human-decision gates**, not agent decisions:

- Bucket 1: whether to rebase/merge each Steven branch.
- Bucket 2: whether to introduce a dedicated `adminActions` log table.
- Bucket 4: whether `app/src/remotion/presets/*` folds into `presets/*`.
- Bucket 5: token palette values (take a screenshot, get sign-off, then commit).
- Bucket 7: whether creator profiles should be on a subdomain for SEO.
- Bucket 10: whether to keep the "Billing — Coming Soon" tab visible at all.

---

## Appendix — What I did NOT touch

To be explicit: I made zero code changes. I read files, diffed branches by name, and ran `git status` / `git fetch --dry-run` / `git ls-remote`. No mutations to `main`, no pulls, no rebases, no file edits outside this new `MONSTER-TASK-LIST.md`.

Three prior Steven docs remain authoritative for scope on their matching buckets:

- `IMPROVEMENT-PUNCHLIST.md` for Buckets 6, 7, 8, 13.
- `DESIGN-REMIX-SPEC.md` for Buckets 5, 6, 7.
- `STEVEN-ONBOARDING.md` for first-time orientation.

Where this monster list conflicts with those, **those three win on scope**; this list wins on priority ordering, infra coverage, and backend findings they don't cover.

— end of document —
