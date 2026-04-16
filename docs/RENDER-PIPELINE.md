# MotionKit — Render Pipeline

> Last updated: 2026-04-16
> Covers: the path a render takes from "user clicks Render" (or "publish
> pipeline schedules a test render") to a playable MP4 at a public URL.
> Not covered: preset bundle creation / signing / upload — that's a
> separate pipeline (see Bucket 4 in `MONSTER-TASK-LIST.md`).

## The two backends

MotionKit can render through either of two backends:

1. **Self-hosted render worker** (`render-worker/`) — Fastify service on
   a Hetzner VPS, behind Caddy with TLS, bundles the preset with
   Remotion and writes the MP4 to `/var/www/renders/<jobId>.mp4` served
   as a static file.
2. **Remotion Lambda** — `@remotion/lambda/client` writes to S3; the
   action then fetches from S3 and uploads to R2 via the `r2-uploader`
   Cloudflare Worker.

**Selection:** `validateAndTestRender` (review pipeline) and the client
render button both check `RENDER_WORKER_URL` + `RENDER_WORKER_SECRET`
and prefer the worker when both are set. Lambda is the fallback. There
is no cross-engine retry — a failure on the chosen backend marks the
job failed.

## End-to-end flow (interactive render)

```
┌────────────────────────────────────────────────────────────────────┐
│ Client (app/src/components/workstation/RenderQueue / dialogs)      │
│                                                                    │
│  useMutation(api.renderJobs.create)                                │
│    → { userId, presetId, bundleUrl, inputProps, renderEngine }    │
│                                                                    │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Convex mutation (convex/renderJobs.ts:create)                      │
│  - requireAuthorizedUser(ctx, userId)                             │
│  - canAccessPreset(preset, userId)  (public or owner)             │
│  - insert renderJobs { status: "queued" }                         │
│  - returns jobId                                                  │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Client schedules the dispatch action                               │
│  useAction(api.actions.renderWithWorker.dispatchRender) or        │
│  useAction(api.actions.renderWithLambda.dispatchRender)           │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Action: dispatchRender                                             │
│  - requireAuthUserIdFromAction(ctx)  → authUserId                 │
│  - dispatchWorkerJob(ctx, jobId, authUserId)                      │
│    or dispatchLambdaJob(ctx, jobId, authUserId)                   │
│                                                                    │
│  ⇩ both enter loadAndAuthorizeJob(ctx, jobId, { kind: "user",     │
│    authUserId }) — which verifies job.userId matches and that     │
│    job.status === "queued" (double-dispatch guard).                │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌──────────────────────────┐            ┌──────────────────────────┐
│ Worker path              │            │ Lambda path              │
│                          │            │                          │
│ POST ${WORKER_URL}/render│            │ renderMediaOnLambda()    │
│  with HMAC-SHA256 header │            │  + getRenderProgress()   │
│                          │            │  poll until done/fail    │
│ Worker bundles preset,   │            │                          │
│ runs Remotion, writes    │            │ On done: fetch outputFile│
│ /var/www/renders/<id>.mp4│            │ from S3                  │
│                          │            │                          │
│ Returns {ok, outputUrl,  │            │ copyS3MP4ToR2():         │
│   sizeBytes, durationMs} │            │  HMAC-sign PUT to        │
│                          │            │  ${R2_UPLOAD_URL}/       │
│                          │            │    renders/<id>.mp4      │
│                          │            │                          │
│ outputUrl = Caddy static │            │ outputUrl = ${R2_PUBLIC_ │
│  at ${PUBLIC_URL}/<id>.  │            │  URL}/renders/<id>.mp4   │
│  mp4                     │            │                          │
└──────────┬───────────────┘            └──────────┬───────────────┘
           │                                       │
           └──────────────┬────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│ Convex internalMutation: renderJobs.markDone                       │
│  - patch job { status: "done", outputUrl, outputSize,             │
│                completedAt, expiresAt }                            │
│  - advanceReviewStateIfTestRender(ctx, jobId, true)                │
│    → moves preset from test-rendering to pending-review if the    │
│      job was the preset's lastTestRenderJobId.                    │
└────────────────────────────────────────────────────────────────────┘
```

On any throw, the action catches, calls `renderJobs.markFailed`, and
the same `advanceReviewStateIfTestRender` path runs with `success=false`
— sending a preset to `rejected` on test-render failure.

## End-to-end flow (test render / publish pipeline)

The publish pipeline runs the same dispatch code as interactive renders,
reusing the auth-optional internal path:

```
Creator clicks Publish → app calls validateAndTestRender action
  → compilePreset (shared with client sandbox)
  → signBundleBytes (HMAC-SHA256 over transpiled code)
  → recordValidation + enqueueTestRenderInternal + setReviewStateInternal
      (to "test-rendering")
  → ctx.scheduler.runAfter(0, dispatchWorker/LambdaRenderInternal, { jobId })
      (internalAction → cannot be called from a client by design)
```

The `dispatchRenderInternal` internal actions call the same
`dispatchWorkerJob` / `dispatchLambdaJob` helpers but omit `authUserId`
so `loadAndAuthorizeJob` takes the `{ kind: "internal" }` branch — the
job is trusted because only server code can invoke internal actions.

## Security properties

- **Client-facing dispatch requires auth.** The public `dispatchRender`
  actions call `requireAuthUserIdFromAction` and pass the resulting id
  through to `loadAndAuthorizeJob`, which compares against `job.userId`.
- **Double-dispatch guard.** A manual retry or scheduler replay that
  kicks the action twice throws on the second invocation because the
  job is no longer in `status: "queued"`.
- **Prototype-pollution guard.** `parseJobPayload` strips `__proto__`,
  `constructor`, `prototype` own-properties from `inputProps` before
  handing them to Remotion. Belt-and-braces — JSON.parse itself sets
  these as own props, not on the prototype chain, but downstream
  spreads (`{ ...inputProps }`) can still pollute a target.
- **HMAC-signed hops.** Both Convex → render-worker and Convex →
  r2-uploader are signed with per-service secrets and verified with
  constant-time comparison on the other side.
- **Sandboxed bundle origin.** The bundle URL is resolved through
  `compositionIdFromBundleUrl` and checked against
  `RENDERABLE_COMPOSITION_IDS`; unknown compositions throw before any
  render work starts.
- **`expiresAt` on every job.** Worker renders expire after 7 days,
  Lambda renders after 365 days. R2 side-cleanup is not yet wired; see
  Bucket 3 in `MONSTER-TASK-LIST.md`.

## What can still go wrong (known gaps)

- **R2 cleanup.** `expiresAt` is stored but no cron deletes expired R2
  objects. Storage grows monotonically. Needs a scheduled job that
  sweeps jobs older than their `expiresAt` and calls the Worker with a
  DELETE (endpoint doesn't exist yet — add to `r2-uploader`).
- **Output URL reachability.** `PUBLIC_URL` on the render worker must
  match the Caddy static path exactly, or every render returns a broken
  URL silently. Deploy could add a post-render HEAD check against
  `${PUBLIC_URL}/${jobId}.mp4` before returning 200.
- **Lambda → R2 single point of failure.** If the `r2-uploader` is
  down, `copyS3MP4ToR2` throws, `markFailed` fires, the render is lost.
  No retry, no dead-letter. (Proposed in Bucket 3: retry with backoff,
  then enqueue on a `copy-failed` status for admin review.)
- **No progress streaming on the worker path.** The worker is blocking
  — user sees "queued" then "done". Lambda has intermediate progress
  because it polls. Consider patching progress into `renderJobs`
  periodically from the worker via a signed callback.
- **`dispatchPlatformJob` was removed** as dead code. If a new cross-
  backend entry point is needed later, reinstate it as a thin wrapper
  that reads the env preference and delegates — do not silently let a
  single call path bypass the auth discriminant.

## Env vars by backend

All live on the Convex deployment env (`npx convex env set …`), not
in the app `.env.local`.

**Common:**
- `R2_UPLOAD_URL` — `r2-uploader` Worker URL.
- `R2_UPLOAD_SECRET` — HMAC secret; Convex side signs, Worker side verifies.
- `R2_PUBLIC_URL` — public base for rendered MP4s. Must match the
  public hostname mapped to the R2 bucket.

**Worker backend:**
- `RENDER_WORKER_URL` — public URL of the Fastify worker (via Caddy).
- `RENDER_WORKER_SECRET` — HMAC secret.

**Lambda backend:**
- `REMOTION_AWS_ACCESS_KEY_ID`
- `REMOTION_AWS_SECRET_ACCESS_KEY`
- `REMOTION_AWS_REGION`
- `REMOTION_FUNCTION_NAME`
- `REMOTION_SERVE_URL`

Missing any required var sends the render to `failed` with a loud
error message naming every missing key; the client surfaces this to the
user in the render queue.
