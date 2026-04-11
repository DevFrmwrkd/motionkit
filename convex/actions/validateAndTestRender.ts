"use node";

/**
 * validateAndTestRender (Phase 2 / WS-2b).
 *
 * The entrypoint a creator (or the upload wizard on their behalf) calls to
 * move a preset from `draft` to `test-rendering`. It is the only place in
 * the codebase that can set the `publishableFlags` on a preset — everywhere
 * else just reads them.
 *
 * Responsibilities:
 *   1. Load the draft preset and verify the caller owns it.
 *   2. Run the SHARED compile path from `convex/lib/compile.ts` against the
 *      preset's source code + schema JSON + meta JSON. Same function the
 *      client sandbox uses, so a green validation here proves the client
 *      can mount the preset without surprises.
 *   3. If compile fails: log a structured compileErrors row, transition to
 *      `rejected`, return the structured error to the caller.
 *   4. If compile succeeds: compute bundleHash + bundleSignature, stamp
 *      them on the preset row, record publishable flags, enqueue a test
 *      render job, transition to `test-rendering`, return the job id.
 *
 * This action does NOT wait for the test render to complete. A separate
 * internal mutation (`onTestRenderFinished`) wires the render completion
 * callback to advance the review state to `pending-review` (success) or
 * `rejected` (failure). That callback is invoked by
 * `convex/renderJobs.markDone` and `markFailed` once the render workers
 * report back — see the extension at the bottom of this file.
 */

import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  compilePreset,
  type CompileError,
} from "../lib/compile";
import { signBundleBytes } from "../lib/signing";
import { requireAuthUserIdFromAction } from "../lib/authz";

const dispatchWorkerRenderInternal = makeFunctionReference<
  "action",
  { jobId: Id<"renderJobs"> }
>("actions/renderWithWorker:dispatchRenderInternal");

const dispatchLambdaRenderInternal = makeFunctionReference<
  "action",
  { jobId: Id<"renderJobs"> }
>("actions/renderWithLambda:dispatchRenderInternal");

export const validateAndTestRender = action({
  args: {
    presetId: v.id("presets"),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    | { ok: true; renderJobId: string; publishableFlags: { previewable: boolean; renderable: boolean; commercialUseReady: boolean } }
    | { ok: false; error: CompileError }
  > => {
    const authUserId = await requireAuthUserIdFromAction(ctx);
    const preset = await ctx.runQuery(
      internal.presetReview.getPresetInternal,
      { presetId: args.presetId }
    );
    if (!preset) throw new Error("Preset not found");
    if (preset.authorId !== authUserId) {
      throw new Error("Only the preset author can trigger validation");
    }
    if (!preset.sourceCode || preset.sourceCode.trim().length === 0) {
      throw new Error("Preset has no source code to validate");
    }

    // Move from whatever state we're in (draft or validating) into
    // validating. If we're already past validating, the caller needs to
    // return to draft first — surfaced as a loud error.
    if (preset.reviewState === "test-rendering" || preset.reviewState === "pending-review") {
      throw new Error(
        `Cannot re-validate: preset is currently ${preset.reviewState}. ` +
          `Return to draft first.`
      );
    }
    if (preset.reviewState !== "validating") {
      await ctx.runMutation(internal.presetReview.setReviewStateInternal, {
        presetId: args.presetId,
        to: "validating",
        actorId: authUserId,
      });
    }

    // Compile. Bit-identical to what the client sandbox does.
    const metaJson = JSON.stringify({
      name: preset.name,
      description: preset.description,
      category: preset.category,
      fps: preset.fps,
      width: preset.width,
      height: preset.height,
      durationInFrames: preset.durationInFrames,
    });
    const result = compilePreset(preset.sourceCode, preset.inputSchema, metaJson);

    if (!result.ok) {
      // Log the structured error so it shows up in the admin compile-error
      // dashboard and the AI auto-correction loop.
      await ctx.runMutation(
        internal.presetReview.recordCompileErrorInternal,
        {
          presetId: args.presetId,
          userId: authUserId,
          // compilePreset only emits the pre-execution phases; this stays
          // a narrow union. Execute/resolve errors come from the client
          // sandbox path and are logged there.
          phase: result.error.phase,
          message: result.error.message,
          line: result.error.line,
          column: result.error.column,
          hint: result.error.hint,
        }
      );
      // Move to rejected with the compile error as the reason.
      await ctx.runMutation(internal.presetReview.setReviewStateInternal, {
        presetId: args.presetId,
        to: "rejected",
        actorId: authUserId,
        reason: `Compile failed at ${result.error.phase}: ${result.error.message}`,
      });
      return { ok: false, error: result.error };
    }

    // Sign the bundle. We sign the TRANSPILED output rather than the raw
    // source so the signature attests to the actual bytes the renderer will
    // execute. Source-level whitespace changes that don't affect the
    // transpiled output won't break the signature — intentional; the
    // signature is integrity, not provenance.
    const { hash: bundleHash, signature: bundleSignature } =
      await signBundleBytes(result.transpiledCode);

    // For MVP, only check previewable + renderable. commercialUseReady is
    // set true iff the preset's license field is commercial OR explicitly
    // flagged by the author. WS-6 will tighten this.
    const license = preset.license ?? "free";
    const publishableFlags = {
      previewable: true,
      renderable: true,
      commercialUseReady:
        license === "commercial-free" || license === "paid-commercial",
    };

    // Enqueue the test render job. We use the existing renderJobs table
    // with a marker in inputProps so the render-completion callback knows
    // to advance review state.
    const defaultProps: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(result.schema)) {
      defaultProps[key] = (field as { default: unknown }).default;
    }
    const renderJobId = await ctx.runMutation(
      internal.presetReview.enqueueTestRenderInternal,
      {
        presetId: args.presetId,
        userId: authUserId,
        bundleUrl: preset.bundleUrl,
        inputProps: JSON.stringify(defaultProps),
      }
    );

    await ctx.runMutation(internal.presetReview.recordValidationInternal, {
      presetId: args.presetId,
      publishableFlags,
      bundleHash,
      bundleSignature,
      lastTestRenderJobId: renderJobId,
    });

    await ctx.runMutation(internal.presetReview.setReviewStateInternal, {
      presetId: args.presetId,
      to: "test-rendering",
      actorId: authUserId,
      payload: JSON.stringify({ renderJobId }),
    });

    // Queue the platform-owned test render immediately through the same
    // worker/Lambda actions interactive renders use. This replaces the
    // nonexistent background processor that previously left review jobs
    // stuck in `queued` forever.
    const hasWorker =
      Boolean(process.env.RENDER_WORKER_URL) &&
      Boolean(process.env.RENDER_WORKER_SECRET);
    if (hasWorker) {
      await ctx.scheduler.runAfter(
        0,
        dispatchWorkerRenderInternal,
        { jobId: renderJobId }
      );
    } else {
      await ctx.scheduler.runAfter(
        0,
        dispatchLambdaRenderInternal,
        { jobId: renderJobId }
      );
    }

    return { ok: true, renderJobId, publishableFlags };
  },
});

// NOTE: the `onTestRenderFinished` logic that advances review state after
// a test render completes lives inside `renderJobs.ts` as
// `advanceReviewStateIfTestRender`, called inline from `markDone` /
// `markFailed`. It cannot live in this file because "use node" files
// cannot export internalMutations.
