import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { categoryValidator, statusValidator } from "./lib/validators";

export const list = query({
  args: {
    category: v.optional(categoryValidator),
    status: v.optional(statusValidator),
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

export const listMarketplace = query({
  args: {
    category: v.optional(categoryValidator),
    sortBy: v.optional(
      v.union(
        v.literal("popular"),
        v.literal("trending"),
        v.literal("recent"),
        v.literal("highest-rated")
      )
    ),
  },
  handler: async (ctx, args) => {
    let presets;

    if (args.category) {
      presets = await ctx.db
        .query("presets")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
      presets = presets.filter(
        (p) => p.isPublic && p.status === "published"
      );
    } else {
      presets = await ctx.db
        .query("presets")
        .withIndex("by_public_status", (q) =>
          q.eq("isPublic", true).eq("status", "published")
        )
        .collect();
    }

    // Sort based on criteria
    switch (args.sortBy) {
      case "popular":
        presets.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
        break;
      case "trending":
        presets.sort((a, b) => (b.voteScore ?? 0) - (a.voteScore ?? 0));
        break;
      case "highest-rated":
        presets.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "recent":
      default:
        presets.sort(
          (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0)
        );
        break;
    }

    return presets;
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
    category: categoryValidator,
    tags: v.array(v.string()),
    author: v.optional(v.string()),
    authorId: v.optional(v.id("users")),
    bundleUrl: v.string(),
    fps: v.number(),
    width: v.number(),
    height: v.number(),
    durationInFrames: v.number(),
    inputSchema: v.string(),
    sourceCode: v.optional(v.string()),
    generationId: v.optional(v.id("aiGenerations")),
    thumbnailUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("presets", {
      ...args,
      downloads: 0,
      rating: 0,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      viewCount: 0,
      cloneCount: 0,
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
    category: v.optional(categoryValidator),
    tags: v.optional(v.array(v.string())),
    bundleUrl: v.optional(v.string()),
    bundleHash: v.optional(v.string()),
    fps: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    durationInFrames: v.optional(v.number()),
    inputSchema: v.optional(v.string()),
    sourceCode: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    previewVideoUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),
    status: v.optional(statusValidator),
    versionLabel: v.optional(v.string()),
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

export const incrementViewCount = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Preset not found");
    await ctx.db.patch(args.id, {
      viewCount: (preset.viewCount ?? 0) + 1,
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

// ─── Versioning ─────────────────────────────────────────────

export const clonePreset = mutation({
  args: {
    sourcePresetId: v.id("presets"),
    userId: v.id("users"),
    versionLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourcePresetId);
    if (!source) throw new Error("Source preset not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const rootId = source.rootPresetId ?? args.sourcePresetId;

    const newPresetId = await ctx.db.insert("presets", {
      name: `${source.name} (clone)`,
      description: source.description,
      category: source.category,
      tags: [...source.tags],
      author: user.name ?? "Unknown",
      authorId: args.userId,
      bundleUrl: source.bundleUrl,
      bundleHash: source.bundleHash,
      fps: source.fps,
      width: source.width,
      height: source.height,
      durationInFrames: source.durationInFrames,
      inputSchema: source.inputSchema,
      sourceCode: source.sourceCode,
      thumbnailUrl: source.thumbnailUrl,
      isPublic: false,
      downloads: 0,
      rating: 0,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      viewCount: 0,
      cloneCount: 0,
      parentPresetId: args.sourcePresetId,
      rootPresetId: rootId,
      versionLabel: args.versionLabel,
      status: "draft",
    });

    // Increment clone count on source
    await ctx.db.patch(args.sourcePresetId, {
      cloneCount: (source.cloneCount ?? 0) + 1,
    });

    return newPresetId;
  },
});

export const getVersionTree = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);
    if (!preset) return null;

    const rootId = preset.rootPresetId ?? args.presetId;
    const root = rootId === args.presetId ? preset : await ctx.db.get(rootId);
    if (!root) return null;

    // Get all presets in this tree
    const allVersions = await ctx.db
      .query("presets")
      .withIndex("by_root", (q) => q.eq("rootPresetId", rootId))
      .collect();

    // Include the root itself
    return { root, versions: allVersions };
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("presets")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
  },
});
