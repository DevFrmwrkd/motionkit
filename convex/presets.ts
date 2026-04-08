import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("intro"),
        v.literal("title"),
        v.literal("lower-third"),
        v.literal("cta"),
        v.literal("transition"),
        v.literal("outro"),
        v.literal("full")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("presets")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }
    if (args.status) {
      return await ctx.db
        .query("presets")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("presets").collect();
  },
});

export const get = query({
  args: { id: v.id("presets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("intro"),
      v.literal("title"),
      v.literal("lower-third"),
      v.literal("cta"),
      v.literal("transition"),
      v.literal("outro"),
      v.literal("full")
    ),
    tags: v.array(v.string()),
    author: v.optional(v.string()),
    bundleUrl: v.string(),
    fps: v.number(),
    width: v.number(),
    height: v.number(),
    durationInFrames: v.number(),
    inputSchema: v.string(),
    thumbnailUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("presets", {
      ...args,
      downloads: 0,
      rating: 0,
    });
  },
});

export const getByBundleUrl = query({
  args: { bundleUrl: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("presets").collect();
    return all.find((p) => p.bundleUrl === args.bundleUrl) ?? null;
  },
});

export const update = mutation({
  args: {
    id: v.id("presets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("intro"),
        v.literal("title"),
        v.literal("lower-third"),
        v.literal("cta"),
        v.literal("transition"),
        v.literal("outro"),
        v.literal("full")
      )
    ),
    tags: v.optional(v.array(v.string())),
    bundleUrl: v.optional(v.string()),
    bundleHash: v.optional(v.string()),
    fps: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    durationInFrames: v.optional(v.number()),
    inputSchema: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    previewVideoUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(id, updates);
  },
});

export const archive = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "archived" });
  },
});

export const incrementDownloads = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Preset not found");
    await ctx.db.patch(args.id, {
      downloads: (preset.downloads ?? 0) + 1,
    });
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("presets")
      .withSearchIndex("search_presets", (q) =>
        q.search("name", args.query).eq("status", "published")
      )
      .collect();
  },
});
