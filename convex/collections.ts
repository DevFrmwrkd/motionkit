import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { canAccessPreset, requireAuthorizedUser } from "./lib/authz";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    return await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id);
    if (!collection) return null;

    await requireAuthorizedUser(ctx, collection.userId);
    return collection;
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
    await requireAuthorizedUser(ctx, args.userId);

    for (const presetId of args.presetIds) {
      const preset = await ctx.db.get(presetId);
      if (!preset) throw new Error("Preset not found");
      if (!canAccessPreset(preset, args.userId)) {
        throw new Error("You can only collect public presets or presets you own");
      }
    }

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
    await requireAuthorizedUser(ctx, collection.userId);

    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    if (!canAccessPreset(preset, collection.userId)) {
      throw new Error("You can only collect public presets or presets you own");
    }

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
    await requireAuthorizedUser(ctx, collection.userId);
    await ctx.db.patch(args.collectionId, {
      presetIds: collection.presetIds.filter((id) => id !== args.presetId),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id);
    if (!collection) throw new Error("Collection not found");

    await requireAuthorizedUser(ctx, collection.userId);
    await ctx.db.delete(args.id);
  },
});
