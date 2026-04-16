"use node";

/**
 * One-shot action that kicks off a render for every published marketplace
 * preset that (a) points at a local Remotion composition we can actually
 * render and (b) doesn't already have a successful render on file.
 *
 * The marketplace cards pull their preview video from the latest
 * successful `renderJobs.outputUrl` for each preset — see
 * `presets.getLatestPreviewsForPresets`. This action seeds that pool for
 * presets that have never been rendered. AI-generated presets
 * (bundleUrl: ai://generated/...) are skipped because their composition
 * isn't in the deployed Remotion bundle; those remain on the sandbox
 * fallback until a dynamic render pipeline ships.
 *
 * Invoke from the CLI:
 *   npx convex run seedMarketplacePreviews:run
 *
 * Re-runnable: already-rendered presets are skipped.
 */

import { makeFunctionReference } from "convex/server";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  compositionIdFromBundleUrl,
  isRenderableComposition,
} from "../lib/renderableCompositions";

const dispatchWorkerRenderInternal = makeFunctionReference<
  "action",
  { jobId: Id<"renderJobs"> }
>("actions/renderWithWorker:dispatchRenderInternal");

const dispatchLambdaRenderInternal = makeFunctionReference<
  "action",
  { jobId: Id<"renderJobs"> }
>("actions/renderWithLambda:dispatchRenderInternal");

export const run = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    scheduled: Array<{ presetId: string; name: string; jobId: string }>;
    skipped: Array<{ presetId: string; name: string; reason: string }>;
  }> => {
    const presets = await ctx.runQuery(
      internal.presets.listAllForSeed,
      {}
    );

    const hasWorker =
      Boolean(process.env.RENDER_WORKER_URL) &&
      Boolean(process.env.RENDER_WORKER_SECRET);

    const scheduled: Array<{ presetId: string; name: string; jobId: string }> =
      [];
    const skipped: Array<{ presetId: string; name: string; reason: string }> =
      [];

    for (const preset of presets) {
      // Only published public presets feed the marketplace.
      if (!preset.isPublic || preset.status !== "published") {
        skipped.push({
          presetId: preset._id,
          name: preset.name,
          reason: "not-published",
        });
        continue;
      }

      // Only renderable compositions — skip AI-generated presets whose
      // source code isn't in the Remotion bundle.
      const compositionId = compositionIdFromBundleUrl(preset.bundleUrl);
      if (!compositionId || !isRenderableComposition(compositionId)) {
        skipped.push({
          presetId: preset._id,
          name: preset.name,
          reason: `non-renderable bundleUrl: ${preset.bundleUrl}`,
        });
        continue;
      }

      // If a successful render already exists, leave it alone — cheaper
      // than re-rendering and lets re-runs be idempotent.
      const existing = await ctx.runQuery(
        internal.renderJobs.findLatestDoneForPreset,
        { presetId: preset._id as Id<"presets"> }
      );
      if (existing) {
        skipped.push({
          presetId: preset._id,
          name: preset.name,
          reason: "already-rendered",
        });
        continue;
      }

      // Build default input props from the schema so the preview looks
      // like what the creator intended, not an empty frame.
      let defaultProps: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(preset.inputSchema) as Record<
          string,
          { default?: unknown }
        >;
        for (const [key, field] of Object.entries(parsed)) {
          if (field && typeof field === "object" && "default" in field) {
            defaultProps[key] = field.default;
          }
        }
      } catch {
        defaultProps = {};
      }

      const jobId = await ctx.runMutation(
        internal.presetReview.enqueueTestRenderInternal,
        {
          presetId: preset._id as Id<"presets">,
          userId: preset.authorId as Id<"users">,
          bundleUrl: preset.bundleUrl,
          inputProps: JSON.stringify(defaultProps),
        }
      );

      // Schedule the render. Internal-mode dispatcher doesn't need an
      // auth user id — the job is platform-owned.
      if (hasWorker) {
        await ctx.scheduler.runAfter(0, dispatchWorkerRenderInternal, {
          jobId,
        });
      } else {
        await ctx.scheduler.runAfter(0, dispatchLambdaRenderInternal, {
          jobId,
        });
      }

      scheduled.push({ presetId: preset._id, name: preset.name, jobId });
    }

    return { scheduled, skipped };
  },
});
