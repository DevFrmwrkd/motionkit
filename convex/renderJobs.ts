import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { canAccessPreset, requireAuthorizedUser } from "./lib/authz";

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
  },
});
