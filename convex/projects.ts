import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { canAccessPreset, requireAuthorizedUser } from "./lib/authz";

const presetEntryValidator = v.object({
  presetId: v.id("presets"),
  savedPresetId: v.optional(v.id("savedPresets")),
  order: v.number(),
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;

    await requireAuthorizedUser(ctx, project.userId);
    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

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

    await requireAuthorizedUser(ctx, project.userId);

    const preset = await ctx.db.get(args.entry.presetId);
    if (!preset) throw new Error("Preset not found");
    if (!canAccessPreset(preset, project.userId)) {
      throw new Error("You can only add public presets or presets you own");
    }

    if (args.entry.savedPresetId) {
      const savedPreset = await ctx.db.get(args.entry.savedPresetId);
      if (!savedPreset || savedPreset.userId !== project.userId) {
        throw new Error("Saved preset not found");
      }
      // A saved variant must belong to the same base preset as the entry —
      // otherwise you could attach a variant of preset B onto an entry whose
      // base is A, which corrupts the entry.
      if (savedPreset.presetId !== args.entry.presetId) {
        throw new Error(
          "Saved variant does not belong to the specified base preset"
        );
      }
    }

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
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    await requireAuthorizedUser(ctx, project.userId);

    for (const entry of args.presetEntries) {
      const preset = await ctx.db.get(entry.presetId);
      if (!preset) throw new Error("Preset not found");
      if (!canAccessPreset(preset, project.userId)) {
        throw new Error("You can only add public presets or presets you own");
      }

      if (entry.savedPresetId) {
        const savedPreset = await ctx.db.get(entry.savedPresetId);
        if (!savedPreset || savedPreset.userId !== project.userId) {
          throw new Error("Saved preset not found");
        }
        if (savedPreset.presetId !== entry.presetId) {
          throw new Error(
            "Saved variant does not belong to the specified base preset"
          );
        }
      }
    }

    await ctx.db.patch(args.projectId, {
      presetEntries: args.presetEntries,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    await requireAuthorizedUser(ctx, project.userId);
    await ctx.db.delete(args.id);
  },
});
