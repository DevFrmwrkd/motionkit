import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const castVote = mutation({
  args: {
    userId: v.id("users"),
    presetId: v.id("presets"),
    value: v.number(), // +1 or -1
  },
  handler: async (ctx, args) => {
    if (args.value !== 1 && args.value !== -1) {
      throw new Error("Vote value must be +1 or -1");
    }

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_user_preset", (q) =>
        q.eq("userId", args.userId).eq("presetId", args.presetId)
      )
      .first();

    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");

    let upDelta = 0;
    let downDelta = 0;

    if (existing) {
      if (existing.value === args.value) {
        // Same vote again → remove vote
        await ctx.db.delete(existing._id);
        if (args.value === 1) upDelta = -1;
        else downDelta = -1;
      } else {
        // Flip vote
        await ctx.db.patch(existing._id, {
          value: args.value,
          createdAt: Date.now(),
        });
        if (args.value === 1) {
          upDelta = 1;
          downDelta = -1;
        } else {
          upDelta = -1;
          downDelta = 1;
        }
      }
    } else {
      // New vote
      await ctx.db.insert("votes", {
        userId: args.userId,
        presetId: args.presetId,
        value: args.value,
        createdAt: Date.now(),
      });
      if (args.value === 1) upDelta = 1;
      else downDelta = 1;
    }

    const newUpvotes = (preset.upvotes ?? 0) + upDelta;
    const newDownvotes = (preset.downvotes ?? 0) + downDelta;

    await ctx.db.patch(args.presetId, {
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      voteScore: newUpvotes - newDownvotes,
    });
  },
});

export const getUserVote = query({
  args: {
    userId: v.id("users"),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_user_preset", (q) =>
        q.eq("userId", args.userId).eq("presetId", args.presetId)
      )
      .first();
    return vote?.value ?? 0;
  },
});

export const getUserVotesForPresets = query({
  args: {
    userId: v.id("users"),
    presetIds: v.array(v.id("presets")),
  },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};
    for (const presetId of args.presetIds) {
      const vote = await ctx.db
        .query("votes")
        .withIndex("by_user_preset", (q) =>
          q.eq("userId", args.userId).eq("presetId", presetId)
        )
        .first();
      result[presetId] = vote?.value ?? 0;
    }
    return result;
  },
});
