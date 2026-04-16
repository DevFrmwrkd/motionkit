import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { canAccessPreset, requireAuthorizedUser } from "./lib/authz";
import type { Id } from "./_generated/dataModel";

/**
 * Phase 2 / WS-2: if the render job that just finished is the "last test
 * render" on its preset, advance the review state machine. Non-test jobs
 * are left alone. Called inline from markDone + markFailed so the pipeline
 * driver doesn't have to poll.
 */
async function advanceReviewStateIfTestRender(
  ctx: MutationCtx,
  jobId: Id<"renderJobs">,
  success: boolean,
  failureReason?: string
): Promise<void> {
  const job = await ctx.db.get(jobId);
  if (!job) return;
  const preset = await ctx.db.get(job.presetId);
  if (!preset) return;
  if (preset.lastTestRenderJobId !== jobId) return;
  if (preset.reviewState !== "test-rendering") return;

  if (success) {
    await ctx.db.patch(preset._id, { reviewState: "pending-review" });
    await ctx.db.insert("auditLog", {
      actorId: preset.authorId,
      action: "preset.test-render",
      targetType: "preset",
      targetId: preset._id,
      payload: JSON.stringify({ result: "success", jobId }),
      createdAt: Date.now(),
    });
  } else {
    await ctx.db.patch(preset._id, {
      reviewState: "rejected",
      rejectedReason: `Test render failed: ${failureReason ?? "unknown"}`,
    });
    await ctx.db.insert("auditLog", {
      actorId: preset.authorId,
      action: "preset.test-render",
      targetType: "preset",
      targetId: preset._id,
      payload: JSON.stringify({
        result: "fail",
        reason: failureReason,
        jobId,
      }),
      createdAt: Date.now(),
    });
  }
}

export const create = mutation({
  args: {
    userId: v.id("users"),
    presetId: v.id("presets"),
    bundleUrl: v.string(),
    inputProps: v.string(),
    renderEngine: v.union(
      v.literal("modal"),
      v.literal("lambda"),
      v.literal("platform")
    ),
  },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    if (!canAccessPreset(preset, args.userId)) {
      throw new Error("You can only render public presets or presets you own");
    }

    return await ctx.db.insert("renderJobs", {
      ...args,
      bundleUrl: preset.bundleUrl,
      status: "queued",
    });
  },
});

/**
 * Internal — used by render actions to load the job record (and its owner)
 * before dispatching to Lambda/worker. The action authorizes the caller
 * against job.userId so render dispatch cannot be triggered by third parties
 * who happen to know a jobId.
 */
export const getInternal = internalQuery({
  args: { jobId: v.id("renderJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * Internal — returns the most recent successful render for a preset,
 * or null. Used by the marketplace-preview seeder to skip presets that
 * already have a preview on file so re-runs are idempotent.
 */
export const findLatestDoneForPreset = internalQuery({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("renderJobs")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .collect();
    let best: { _id: Id<"renderJobs">; outputUrl?: string; completedAt?: number } | null =
      null;
    for (const j of jobs) {
      if (j.presetId !== args.presetId) continue;
      if (!j.outputUrl) continue;
      if (
        !best ||
        (j.completedAt ?? 0) > (best.completedAt ?? 0)
      ) {
        best = j;
      }
    }
    return best;
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    return await ctx.db
      .query("renderJobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const updateStatus = internalMutation({
  args: {
    jobId: v.id("renderJobs"),
    status: v.union(
      v.literal("queued"),
      v.literal("rendering"),
      v.literal("done"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()),
    startedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    await ctx.db.patch(jobId, updates);
  },
});

export const markDone = internalMutation({
  args: {
    jobId: v.id("renderJobs"),
    outputUrl: v.string(),
    outputSize: v.optional(v.number()),
    completedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    await ctx.db.patch(jobId, {
      ...updates,
      status: "done",
    });
    // Advance the review state if this is the test render tied to a preset
    // in the publish pipeline. Safe for every other render — it no-ops
    // when the job isn't the preset's lastTestRenderJobId.
    await advanceReviewStateIfTestRender(ctx, jobId, true);
  },
});

export const markFailed = internalMutation({
  args: {
    jobId: v.id("renderJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
    await advanceReviewStateIfTestRender(ctx, args.jobId, false, args.error);
  },
});
