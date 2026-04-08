import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
    presetIds: v.array(v.id("presets")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("collections", args);
  },
});

export const addPreset = mutation({
  args: {
    collectionId: v.id("collections"),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.collectionId);
    if (!collection) throw new Error("Collection not found");
    if (collection.presetIds.includes(args.presetId)) return;
    await ctx.db.patch(args.collectionId, {
      presetIds: [...collection.presetIds, args.presetId],
    });
  },
});

export const removePreset = mutation({
  args: {
    collectionId: v.id("collections"),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.collectionId);
    if (!collection) throw new Error("Collection not found");
    await ctx.db.patch(args.collectionId, {
      presetIds: collection.presetIds.filter((id) => id !== args.presetId),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
