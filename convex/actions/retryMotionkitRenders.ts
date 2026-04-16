"use node";

/**
 * Staggered dispatcher for MotionKit preset renders. A burst of 18
 * concurrent Lambda invocations hit AWS's rate limit on the first pass;
 * this action stages retries for only the 9 MotionKit presets with an
 * 8-second gap between each dispatch so every job has room to run.
 *
 * Run: npx convex run actions/retryMotionkitRenders:run
 */

import { makeFunctionReference } from "convex/server";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const MOTIONKIT_NAMES = [
  "Lower Third",
  "Number Counter",
  "Bar Chart",
  "Aurora Background",
  "Particle Field",
  "Kinetic Typography",
  "Glitch Text",
  "Marquee Banner",
  "Shimmer Title",
];

const GAP_MS = 180000;

const dispatchLambdaRenderInternal = makeFunctionReference<
  "action",
  { jobId: Id<"renderJobs"> }
>("actions/renderWithLambda:dispatchRenderInternal");

export const run = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    scheduled: Array<{ name: string; jobId: string; runAfterMs: number }>;
    skipped: Array<{ name: string; reason: string }>;
  }> => {
    const presets = await ctx.runQuery(
      internal.presets.listAllForSeed,
      {}
    );

    const wanted = presets.filter(
      (p) => MOTIONKIT_NAMES.includes(p.name) && p.author === "MotionKit"
    );

    const scheduled: Array<{
      name: string;
      jobId: string;
      runAfterMs: number;
    }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    let slot = 0;
    for (const preset of wanted) {
      // Skip if a successful render already exists.
      const existing = await ctx.runQuery(
        internal.renderJobs.findLatestDoneForPreset,
        { presetId: preset._id as Id<"presets"> }
      );
      if (existing) {
        skipped.push({ name: preset.name, reason: "already-rendered" });
        continue;
      }

      // Build default input props from the schema.
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

      const jobId: Id<"renderJobs"> = await ctx.runMutation(
        internal.presetReview.enqueueTestRenderInternal,
        {
          presetId: preset._id as Id<"presets">,
          userId: preset.authorId as Id<"users">,
          bundleUrl: preset.bundleUrl,
          inputProps: JSON.stringify(defaultProps),
        }
      );

      const runAfterMs = slot * GAP_MS;
      await ctx.scheduler.runAfter(runAfterMs, dispatchLambdaRenderInternal, {
        jobId,
      });

      scheduled.push({ name: preset.name, jobId, runAfterMs });
      slot += 1;
    }

    return { scheduled, skipped };
  },
});
