import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { canAccessPreset, requireAuthorizedUser } from "./lib/authz";

function sortNewestFirst<T extends { _creationTime?: number }>(items: T[]) {
  return items.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
}

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    const savedPresets = await ctx.db
      .query("savedPresets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return sortNewestFirst(savedPresets);
  },
});

export const get = query({
  args: { id: v.id("savedPresets") },
  handler: async (ctx, args) => {
    const savedPreset = await ctx.db.get(args.id);
    if (!savedPreset) return null;

    await requireAuthorizedUser(ctx, savedPreset.userId);
    return savedPreset;
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
    await requireAuthorizedUser(ctx, args.userId);

    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    if (!canAccessPreset(preset, args.userId)) {
      throw new Error("You can only save public presets or presets you own");
    }

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
    const savedPreset = await ctx.db.get(args.id);
    if (!savedPreset) throw new Error("Saved preset not found");

    await requireAuthorizedUser(ctx, savedPreset.userId);

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
    const savedPreset = await ctx.db.get(args.id);
    if (!savedPreset) throw new Error("Saved preset not found");

    await requireAuthorizedUser(ctx, savedPreset.userId);
    await ctx.db.delete(args.id);
  },
});
