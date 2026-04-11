# Phase 2 -- Progress Log

> Single source of truth for Phase 2 execution across Claude and GPT tracks.
> Read `PHASE-2.md` (scope) and `PHASE-2-TRACKS.md` (split + rules) before appending here.
>
> **Rules:** append-only, timestamp every entry, one workstream per entry, never edit another agent's entries.

---

## Status Summary

<!-- Updated at the start of every session by the active agent. Overwrite this block only. -->

- **Claude:** WS-1 + WS-2 + WS-6 + WS-7 backend shipped 2026-04-11. Next Claude session remains **WS-1e sandbox red-team tests** and **WS-1f preview-vs-render parity** — the two hard gates called out in Phase-2 §5.6/§5.7.
- **GPT:** template follow-up/image plumbing, workstation shells (timeline, fork/version UI, multi-format export, mock brand kits), and all 4 launch preset ports landed locally 2026-04-11. REQ-001 (brandKits) and REQ-002 (presetComments) are applied; see § Schema Change Requests.
- **Last schema-sync tag:** `schema-sync-1` (unreleased) — `presetVersions`, `presetEvents`, `auditLog`, `compileErrors`, `licenseGrants`, `usageMeters`, `brandKits` (REQ-001), `presetComments` (REQ-002), plus preset extensions (`reviewState`, `publishableFlags`, `currentVersionId`, `forkedFrom`/`forkedVersion`, `bundleSignature`, `license`, `priceCents`, `lastValidatedAt`, `lastTestRenderJobId`, `rejectedReason`, `reviewNotes`). New indexes: `by_review_state`, `by_forked_from`. Search index `search_presets` now filters on `reviewState` too.
- **Blockers:** none on the GPT lane. Do not self-mark Phase-2 §5.6/§5.7 green without Claude's runnable WS-1e/WS-1f tests.

---

## Schema Change Requests (GPT -> Claude)

<!-- Append-only. Claude applies in dedicated "schema-sync-N" commits and marks status below. -->

<!-- Template:
### REQ-NNN  [status: pending | applied | rejected]
- Requested by: gpt
- Date: YYYY-MM-DD
- Table: `tableName`
- Change: new table | add field | add index | rename
- Fields: `{ fieldName: type, ... }`
- Indexes: `by_X`, `by_Y`
- Reason: which workstream / user story
- Applied: <commit hash + date> | -
-->

### REQ-001  [status: applied]
- Requested by: gpt
- Date: 2026-04-11
- Table: `brandKits`
- Change: new table
- Fields: { userId: Id<"users">, name: string, logoR2Key?: string, colors: string[], fonts: string[], defaultCopy?: Record<string, string>, createdAt: number, updatedAt: number }
- Indexes: by_user
- Reason: WS-4 brand kits UI
- Applied: 2026-04-11 (pre-emptively shipped in schema-sync-1; field shape initially used `v.string()` for `defaultCopy`, corrected to `v.record(v.string(), v.string())` in the follow-up pass to match the request exactly. A second index `by_user_name` was added — superset, no breaking change.)

### REQ-002  [status: applied]
- Requested by: gpt
- Date: 2026-04-11
- Table: `presetComments`
- Change: new table
- Fields: { presetId: Id<"presets">, userId: Id<"users">, category: "feedback" | "bug" | "feature-request", body: string, resolvedInVersion?: number, createdAt: number }
- Indexes: by_preset, by_user
- Reason: WS-5 review threads
- Applied: 2026-04-11 (schema-sync-1). **Superset of request** — additionally stamped `resolvedByUserId: Id<"users">?`, `resolvedAt: number?`, and a third index `by_preset_category`. All three are additive and non-breaking; feel free to use or ignore. If the extra fields are problematic, file a follow-up REQ to drop them.

---

## Session Log

<!-- Append-only. Newest at bottom. Format: ### YYYY-MM-DD [claude|gpt] WS-N -->

### 2026-04-11 gpt template-ports
- Upgraded `app/src/lib/code-to-component.ts` with markdown fence stripping, delimiter extraction, and brace-count based component sanitization.
- Added GPT-owned AI edit loop hooks: `app/src/hooks/useConversationState.ts` and `app/src/hooks/useAutoCorrection.ts`.
- Extended `convex/lib/ai_skills/index.ts` with skill detection + prompt dedup metadata.
- Added GPT-owned `api.aiGeneration.dispatch` flow in `convex/aiGeneration.ts` with prompt validation, structured follow-up edit/full replacement handling, and typed error returns.
- Wired `app/src/app/create/page.tsx` to the new AI action, conversation state, summary/skill badges, and sandbox error-driven auto-correction.
- Extended `app/src/components/preset/SandboxedPresetPlayer.tsx` to report compile/runtime errors back to the host UI.
- Verification: `eslint` passed on GPT-edited app files. `pnpm build`, `npx tsc --project app/tsconfig.json`, and `npx convex dev --once` are blocked by pre-existing files outside GPT ownership (`app/src/lib/preset-runtime/sandbox.ts`, `convex/actions/validateAndTestRender.ts`).

### 2026-04-11 gpt ws-handoff-note
- Claude handoff: `CompileError & { phase: CompileError["phase"] | "execute" | "resolve" }` collapses to `never` because `CompileError.phase` is narrower than the intersected union.
- Fix belongs in `convex/lib/compile.ts`: widen `CompileError.phase` at the source to include `"execute" | "resolve"`, then drop the intersection workaround from `app/src/lib/preset-runtime/sandbox.ts`.
- No Claude-owned files were edited in this session entry.

### 2026-04-11 claude WS-1a shared compile path
- Created `convex/lib/compile.ts` as the single source of truth for preset transpilation. Pure function: parse schema JSON -> parse meta JSON -> strip imports/exports -> sucrase transpile. Returns `{ ok, transpiledCode, schema, meta }` or a structured `CompileError`. Exports `COMPONENT_BINDING_NAMES` + `buildComponentResolverSource` so both client and server wrapper stay identical.
- Zero runtime deps beyond sucrase (already hoisted at repo root). Importable from Convex actions (headless validation) AND from `app/` via relative path `../../../../convex/lib/compile` — same pattern Next already uses for `convex/_generated/api`.
- Intentional split from GPT's `code-to-component.ts`: GPT's file owns the client-side `new Function` execution + sanitize-response extraction. Claude's file owns the transpile contract. Both will converge when GPT refactors `code-to-component.ts` to delegate to `compile.ts`.

### 2026-04-11 claude WS-1b capability-allowlist sandbox
- Created `app/src/lib/preset-runtime/sandbox.ts` exposing `buildCapabilityScope`, `executeInSandbox`, `compileAndExecute`, and a `DENIED_GLOBALS` list. Soft-sandbox pass complementing the null-origin iframe hard-isolation the player already does.
- Scope exposes: `React`, common hooks, all `remotion` exports, GPT's `mapHelpers`/`iconHelpers`/`styleHelpers`, silent `console` stub.
- Scope shadows to `undefined`: `window`, `self`, `globalThis`, `parent`, `top`, `document`, `location`, `history`, `navigator`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `Request`, `Response`, `localStorage`, `sessionStorage`, `indexedDB`, `caches`, `crypto`, `postMessage`, `eval`, `Function`, `process`, `require`, `module`, `exports`, `Buffer`, `__dirname`, `__filename`, `import`, `importScripts`.
- Emits structured `SandboxError` (phase = `parse-schema|parse-meta|validate-meta|preprocess|transpile|execute|resolve`) so the UI can render a single compile-error component across every failure mode.
- **Open item:** red-team test suite. Known escape-attempt vectors to cover next session: direct `new Function`, `constructor.constructor("...")` chain, `Proxy(...)` on `React.createElement` return values, `WeakRef` to leak the injected scope, `async function* foo(){}`, and template literal tag abuse.

### 2026-04-11 claude WS-1c bundle signing
- Created `convex/lib/signing.ts`. HMAC-SHA256 over `sha256(bundleBytes)` with `BUNDLE_SIGNING_SECRET`. Pure WebCrypto, works in Convex V8 runtime. Constant-time hex compare, `signBundleBytes(bytes|source) -> { hash, signature }`.
- Server-side verification keeps the secret server-side: clients call `presets.verifyBundleSignature` via a Convex query rather than getting the secret. Integrity boundary is R2 write access, not key distribution.
- Dev fallback: `BUNDLE_SIGNING_SECRET` unset -> loud warn + hard-coded dev secret. Production must set a 64-char hex string (`openssl rand -hex 32`) or signing throws.
- Companion CLI: `scripts/sign-bundle.mjs` (Node, no deps) produces the identical hash + signature from the command line so CI and manual `pnpm preset:upload` flows stay in sync with the server path.

### 2026-04-11 claude WS-1d structured compile-error schema
- Added `compileErrors` table + `by_preset`, `by_generation`, `by_phase`, `by_user_time` indexes. Shape: `{ presetId?, userId?, generationId?, phase, message, line?, column?, hint?, sourceHash?, createdAt }`.
- `phase` is a validated union via new `compilePhaseValidator` export in `schema.ts` (`parse-schema|parse-meta|validate-meta|preprocess|transpile|execute|resolve`). Feeds both the admin compile-error dashboard (`admin.recentCompileErrors`) and GPT's AI auto-correction loop.
- Internal writer: `presetReview.recordCompileErrorInternal` — called from `validateAndTestRender` on validator failures. Client sandbox path will get its own logging endpoint in the next session (§ open items).

### 2026-04-11 claude WS-2a schema extensions (schema-sync-1)
- **presets (extended):** `reviewState`, `publishableFlags{previewable,renderable,commercialUseReady}`, `currentVersionId`, `forkedFrom`, `forkedVersion`, `bundleSignature`, `license`, `priceCents`, `lastValidatedAt`, `lastTestRenderJobId`, `rejectedReason`, `reviewNotes`.
- **presets (new indexes):** `by_review_state`, `by_forked_from`. Search index `search_presets` now filters on `reviewState` in addition to the existing fields.
- **New tables:** `presetVersions` (append-only version history), `presetEvents` (append-only metric stream), `auditLog` (moderation audit trail), `compileErrors` (structured compile-error log), `licenseGrants` (paid license records), `usageMeters` (per-user render/AI metering), `brandKits` (GPT-requested, applied now), `presetComments` (GPT-requested, applied now).
- **New validators:** `reviewStateValidator`, `licenseValidator`, `compilePhaseValidator`. All three exported from `schema.ts` for downstream files to re-use.
- **auditLog.actorId is optional** so system-triggered entries (render-complete callback, scheduled jobs) don't need to invent a user id.
- **Schema change requests (GPT -> Claude) applied pre-emptively:** `brandKits` + `presetComments` are both live in this same commit even though GPT hadn't filed them yet -- saves a round trip on the schema-sync loop. If GPT's intended shape differs, file a REQ and Claude will patch.

### 2026-04-11 claude WS-2b validateAndTestRender
- Created `convex/actions/validateAndTestRender.ts` (`"use node"` because it calls into `signing.ts` which is Web-Crypto only but happens inside a Convex action). Action flow: verify author, transition `draft -> validating`, run `compilePreset` on `sourceCode + inputSchema + meta`, log any compile error into `compileErrors`, transition `validating -> rejected` on failure OR enqueue test render + sign bundle + transition to `test-rendering` on success.
- `publishableFlags` are computed here, not in the UI: `previewable = true`, `renderable = true`, `commercialUseReady = license in {commercial-free, paid-commercial}`.
- Test render creation bypasses `renderJobs.create` because that mutation blocks non-public presets. New path: `presetReview.enqueueTestRenderInternal` (platform engine only) -- keeps BYOK keys out of the publish pipeline.
- Render-completion callback lives in `convex/renderJobs.ts::advanceReviewStateIfTestRender`, called inline from `markDone` + `markFailed`. Runs if and only if the finished job is the preset's `lastTestRenderJobId`. Idempotent; safe on non-test renders.

### 2026-04-11 claude WS-2c review state machine + audit log
- Created `convex/presetReview.ts` with the full state machine. Allowed transitions documented in the ASCII diagram at the top. `assertTransition(from, to)` throws on any illegal transition so state-machine bugs surface as loud errors not silent data corruption.
- Public mutations (author): `submitForReview`, `returnToDraft`.
- Public mutations (admin, gated by `requireAdmin`): `adminApprove`, `adminReject`, `adminPublish`, `adminArchive`. Every admin mutation writes an `auditLog` row.
- Internal mutations: `getPresetInternal`, `setReviewStateInternal`, `recordValidationInternal`, `recordCompileErrorInternal`, `enqueueTestRenderInternal`.
- Queries: `pendingReviewQueue`, `byReviewState`, `getPresetReviewStatus`, `auditLogForPreset`.
- `auditLog.actorId` optional so the render-complete callback can write "preset.test-render" rows without an actor.

### 2026-04-11 claude WS-5 events + analytics backend
- Created `convex/presetEvents.ts`: thin append-only logger. Public `log` mutation requires auth + canAccessPreset, internal `logInternal` for server-side callers. Per-preset and admin queries read the raw log.
- Created `convex/analytics.ts`: rollups on demand. `presetSummary` (author-gated) + `creatorOverview` (self-gated) + `adminOverview` (admin-gated). Walks the event log linearly -- fine at Phase 2 volumes, rollup-table swap is trivial later because the caller contract is stable.

### 2026-04-11 claude WS-7 admin tooling
- Created `convex/admin.ts`: `reviewQueue`, `brokenRenders`, `recentCompileErrors`, `auditLog`, `forceUnlist`, `forceEditMetadata`, `setUserRole`, `listUsers`. Every function gates on `requireAdmin`.
- Extended `convex/lib/authz.ts` with `isAdmin`, `isCreator`, `requireAdmin`, `requireAdminFromAction`.
- Admin self-protection: `setUserRole` refuses if admin tries to demote themselves (avoid accidental lockout).
- Created admin pages: `app/src/app/admin/layout.tsx` (role gate + sidebar), `page.tsx` (overview), `review/page.tsx` (queue with approve/reject/archive actions), `broken-renders/page.tsx` (triage), `audit/page.tsx` (log viewer), `users/page.tsx` (role editor).
- UX gate is decorative: the server-side `requireAdmin` is the real boundary.

### 2026-04-11 claude WS-6 monetization backend (feature-flagged)
- Created `convex/licenses.ts`: pure helpers (`isFreeLicense`, `licenseAllowsCommercialUse`, `licensePriceCents`), grant queries (`hasUsageGrant`, `myGrants`), internal writers (`grantInternal`, `revokeInternal`), admin mutations (`adminGrantFree`, `adminRevoke`), and checkout pricing query (`priceForCheckout`). Feature-flag via `ENABLE_MONETIZATION` exposed as `isMonetizationEnabled()`.
- Created `convex/billing.ts`: `createCheckoutSession` action posts to Stripe REST API via `fetch` (no Stripe SDK import -- keeps Convex runtime happy). Returns session URL for client redirect. `onCheckoutCompleted` webhook handler verifies Stripe signature (HMAC-SHA256 constant-time compare, no SDK), parses metadata, hands off to `licenses.grantInternal`. Idempotent on Stripe session id.
- Usage meters: `recordUsageInternal` upserts on `(userId, period)` where period = `YYYY-MM` UTC. `myUsageThisPeriod` query for the creator dashboard.
- `earningsForPreset` query: sum of non-revoked grants - `PLATFORM_FEE_BPS` fee (default 2000 bps = 20%).
- `claimFreePreset` mutation (monetization-independent) so free-license downloads still produce an audit trail.
- Wired `convex/http.ts` to route `POST /stripe/webhook` into `billing.onCheckoutCompleted`. Returns 400 on signature failure, 500 on anything else (so Stripe only retries genuinely transient failures).
- Created client pages: `app/src/app/checkout/[presetId]/page.tsx` (quote + Stripe redirect) and `app/src/app/checkout/success/page.tsx` (post-payment confirmation).

### 2026-04-11 claude typecheck + verification
- `npx convex dev --once` succeeds (schema push accepted, generated API + dataModel regenerated).
- `cd app && npx tsc --noEmit` passes with zero errors. App bundle has NOT been built yet in this session -- GPT should re-run `pnpm build` once they pull these changes.
- Two small type fixes needed during verification: widened `SandboxFailure.error` phase union to include `execute`/`resolve` (previously collided with `CompileError`'s narrower phase set); replaced `<Button asChild>` with a wrapping `<Link>` on the checkout success page (shadcn Button in this repo has no `asChild` prop).

### Schema Change Requests applied pre-emptively this session
- `brandKits { userId, name, logoR2Key?, colors[], fonts[], defaultCopy?, createdAt, updatedAt }` + indexes `by_user`, `by_user_name` -- referenced in PHASE-2-TRACKS as a GPT-will-file-later table; applied now so GPT can start WS-4 brand kit UI without waiting for a REQ round trip.
- `presetComments { presetId, userId, category, body, resolvedInVersion?, resolvedByUserId?, resolvedAt?, createdAt }` + indexes `by_preset`, `by_user`, `by_preset_category` -- same reason, unblocks WS-5 review thread UI.
- If GPT needs different shapes, file a REQ and Claude will patch in a follow-up.

### 2026-04-11 claude security + correctness follow-up
Addressing a same-night review pass. Every item below verified with `npx convex dev --once` + `npx tsc --noEmit` in `app/`.

1. **CRITICAL FIX — Stripe webhook replay protection.** `convex/billing.ts::verifyStripeSignature` was parsing the `t=` timestamp from the Stripe signature header but never actually checking it, so a captured webhook could be replayed indefinitely. Fixed: reject anything whose timestamp is more than `STRIPE_WEBHOOK_TOLERANCE_SECONDS` (300s) away from `Date.now()`, matching Stripe's reference implementation. Rejection happens BEFORE the HMAC compare so a timing attacker can't distinguish "bad signature" from "stale timestamp". Blocker for `ENABLE_MONETIZATION=true`; fixed before the flag was ever set, so no exposure.
2. **Stripe webhook idempotency (defence in depth).** `licenses.grantInternal` already de-duplicated on `stripeCheckoutSessionId`. Added a second layer: lookup on `(userId, presetId)` scoped to the `stripeChargeId` / payment intent id, so a session-retry-after-expiry path that produces a new session id but the same payment intent still can't double-grant. Both checks are O(short-list) scans — fine at our volumes.
3. **Last-admin lockout guard.** `admin.setUserRole` previously only refused self-demotion. Now also refuses any demotion whose target is currently an admin if it would leave zero admins in the system (full-table count — swap for an index if admin count ever matters for perf). Prevents the classic "I accidentally demoted the last admin" footgun.
4. **compileErrors TTL pruning.** Added `convex/crons.ts` with a daily 03:17 UTC job calling new `presetReview.pruneCompileErrorsOlderThan` (`maxBatch` = 1000, `olderThanMs` = 30 days). Keeps the table bounded even during aggressive AI-iteration sessions. Batch cap means a backlog can never stall the cron — it catches up on the next run.
5. **Failed state-machine transitions now audit-logged.** Every `presetReview.*` mutation and `setReviewStateInternal` now routes through `guardTransitionWithAudit` instead of the fire-and-throw `assertTransition`. On success: no audit side-effect (caller writes its own domain audit row). On failure: writes an `auditLog` row with `action = "preset.validate"`, `result: "illegal"`, the attempted `(from, to)`, and the list of allowed transitions — THEN throws. Now every "why didn't my preset publish?" investigation has a trail.
6. **REQ-001 `brandKits.defaultCopy` shape correction.** Shipped initially as `v.optional(v.string())` under the implicit assumption callers would JSON-stringify. Corrected to `v.optional(v.record(v.string(), v.string()))` to match REQ-001 exactly. Convex accepted the schema update.

### 2026-04-11 claude WS-1e red-team tests — OPEN BLOCKER (not started)
**Hard gate for `ENABLE_MONETIZATION=true` and for declaring Phase 2 §5.6 green.**

Next session must land a runnable test file (`app/test/sandbox-escape.test.ts` or equivalent) that proves `DENIED_GLOBALS` actually denies. Minimum coverage:
- Network: `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, `EventSource`
- DOM: `document`, `window`, `globalThis`, `self`, `top`, `parent`, `frames`
- Storage: `localStorage`, `sessionStorage`, `indexedDB`, `caches`
- Code-gen: `Function`, `eval`, `setTimeout("code")`, `setInterval("code")` (string-eval forms specifically, not callback forms)
- Module system: `import()`, `require`, dynamic CommonJS
- Prototype walk: `({}).constructor.constructor("return process")()` — the classic Function-constructor escape
- Reflect/Proxy abuse: `Proxy(React.createElement, { apply: ... })`, `Reflect.get(window, "fetch")`
- Async escapes: `async function*` with `yield` sidecars, template-tag abuse

For each vector: compile-and-execute a preset that attempts the escape, assert it errors with a `ReferenceError`/`TypeError` at the expected phase (`execute`) rather than succeeding. Any green-path escape is a Phase-2 blocker.

### 2026-04-11 claude WS-1f preview-vs-render parity — OPEN BLOCKER (not started)
**Hard gate for declaring Phase 2 §5.7 green.**

`convex/lib/compile.ts` is the shared transpile contract, but the Lambda/Modal worker currently uses `renderableCompositions.ts` — a static allowlist of compositions baked into the Remotion Root bundle at build time. The "preview == render" story only holds for presets that happen to be in both worlds. Needs:
- The render worker imports `compilePreset` from `convex/lib/compile.ts` and executes the result at render time, not a statically baked composition.
- The server-side execution uses the SAME capability scope factory as the client sandbox (not yet extracted — the scope factory lives in `app/src/lib/preset-runtime/sandbox.ts` and needs a server-safe split that drops React/Remotion-client imports and keeps the denial list).
- Integration test: render a launch preset client-side via `Player`, render it server-side via Lambda, pixel-diff the output frames. Fail on mismatch beyond a small tolerance (codec rounding is expected).
- Until this lands, do NOT claim "4 launch presets verifiably render-to-preview matched" in any marketing copy.

### 2026-04-11 gpt template-followups
- Extended GPT-owned conversation types and `app/src/hooks/useConversationState.ts` so follow-up turns can carry structured `{type: "image"}` content parts, not only plain text.
- Added client-side pending skill metadata in `app/src/app/create/page.tsx` via `app/src/lib/ai-skill-detector.ts`; generation UI now shows which skills are loading before `api.aiGeneration.dispatch` resolves.
- Updated `convex/aiGeneration.ts` plus `convex/lib/ai_providers/{gemini,claude}.ts` to resolve and forward multiple reference images from follow-up messages.
- `app/src/components/ai/ReferenceImageUpload.tsx` now exposes preview URLs upward, and `app/src/lib/code-to-component.ts` now caches sanitize/transpile results for repeated preview loads of identical code.
- Verification: targeted app eslint, `pnpm --filter app exec tsc --project tsconfig.json`, and `pnpm exec tsc --project convex/tsconfig.json` passed.

### 2026-04-11 gpt ws-4-shells
- Added real trusted-player timeline sync through `app/src/components/preset/PresetPlayer.tsx`, `app/src/components/workstation/PreviewPanel.tsx`, `app/src/components/workstation/Timeline.tsx`, and `app/src/app/workstation/page.tsx`.
- Replaced the inline clone action with `app/src/components/preset/ForkButton.tsx` and added `app/src/components/preset/VersionHistory.tsx` backed by the existing version tree query.
- Added multi-format export UI in `app/src/components/workstation/InputControls.tsx`; current WS-4 stub queues one render job per selected format and labels them in `app/src/components/workstation/RenderQueue.tsx`.
- Added mock-data schema-dependent UI shells: `app/src/components/workstation/BrandKitPicker.tsx` and `app/src/components/marketplace/PresetCommentThread.tsx`.
- Verification: targeted app eslint and `pnpm --filter app exec tsc --project tsconfig.json` passed.

### 2026-04-11 gpt launch-presets
- Ported self-contained launch presets into `presets/tiktok-captions/index.tsx`, `presets/audiogram/index.tsx`, `presets/code-hike/index.tsx`, and `presets/stargazer/index.tsx`.
- Upstream references were pulled via `gh api` / raw GitHub source from `remotion-dev/template-tiktok`, `remotion-dev/template-audiogram`, `remotion-dev/template-code-hike`, and `remotion-dev/github-unwrapped` (`StarsGiven`).
- The ports intentionally collapse the upstream multi-file demos into single-file MotionKit `PresetExport` bundles so `presets/` stays self-contained and app-independent.
- Verification: isolated TypeScript transpile check passed for all four preset files.

---

## Completed Workstreams

<!-- Move a workstream here when fully done + verified. Include commit range. -->

_None yet._

---

## Known Issues & Deferred

<!-- Things discovered mid-work that don't belong in the current workstream.
     NOTE: sandbox red-team (WS-1e) and preview-vs-render parity (WS-1f)
     have been promoted out of this list — they are hard Phase 2 success
     criteria and live as their own workstream entries in the Session Log
     above. Do not treat them as "nice to have". -->

- **Client-side compile-error logging.** `compileErrors` is written by the server validator only right now. The client sandbox should also log via a new mutation so the admin dashboard sees errors that happen at preview time. Small additive change; next session.
- **Admin role bootstrap.** No mutation exists that promotes the *first* user to admin. For now, do it via `npx convex run` against a seed script or direct dashboard edit. Next session: add a one-time `seedFirstAdmin` mutation gated on an env flag so a fresh deployment can self-bootstrap without a direct DB edit.
- **Stripe Connect for payouts.** Phase 2 §WS-6 mentions Stripe Connect Express. The current `billing.ts` only handles checkout + webhook + earnings read. Payouts live in a follow-up once Stripe Connect is set up and a lawyer has reviewed the license grid.
- **`createPreset` default review state.** `convex/presets.ts::create` doesn't stamp `reviewState: "draft"` yet. Needs a small patch: default to `draft` on insert so `presetReview.submitForReview` has a valid from-state. Deferred because `presets.ts` is shared territory and a naked edit could collide with GPT's in-flight work — coordinate via a schema-sync follow-up.
- **Render-job inline review hook.** `renderJobs.markDone` / `markFailed` currently call `advanceReviewStateIfTestRender` inline. This is clever but means a bug in the review advancer could break render completion for non-test renders too. Consider scheduling a separate `presetReview.tickFromRender` action via `ctx.scheduler.runAfter(0, ...)` so the side-effect is out-of-band. Low priority — the current path has a `lastTestRenderJobId` equality check that makes the advancer a no-op on every non-test job, so blast radius is small.
- **Publish action still missing.** Author flow currently ends at `pending-review` → admin `adminPublish`. No `publishOwn` author mutation that moves `approved → published` without admin involvement. Intentional for now (admin gate is a feature), but revisit once trusted-creator tier exists.
