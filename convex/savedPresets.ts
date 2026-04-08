import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("savedPresets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("savedPresets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    presetId: v.id("presets"),
    name: v.string(),
    customProps: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("savedPresets", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("savedPresets"),
    name: v.optional(v.string()),
    customProps: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("savedPresets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
