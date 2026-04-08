import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const presetEntryValidator = v.object({
  presetId: v.id("presets"),
  savedPresetId: v.optional(v.id("savedPresets")),
  order: v.number(),
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      ...args,
      presetEntries: [],
    });
  },
});

export const addPresetEntry = mutation({
  args: {
    projectId: v.id("projects"),
    entry: presetEntryValidator,
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await ctx.db.patch(args.projectId, {
      presetEntries: [...project.presetEntries, args.entry],
    });
  },
});

export const updatePresetEntries = mutation({
  args: {
    projectId: v.id("projects"),
    presetEntries: v.array(presetEntryValidator),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      presetEntries: args.presetEntries,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
