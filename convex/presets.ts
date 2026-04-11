import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { categoryValidator, statusValidator } from "./lib/validators";
import type { Doc } from "./_generated/dataModel";
import { licenseValidator } from "./schema";
import {
  canAccessPreset,
  filterVisiblePresets,
  requireAuthorizedUser,
  requireSignedInUser,
} from "./lib/authz";
import { getPresetPricing } from "./licenses";
import { normalizePresetPricing } from "../shared/presetPricing";

function sortNewestFirst<T extends { _creationTime?: number }>(items: T[]) {
  return items.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
}

function matchesListFilters(
  preset: Doc<"presets">,
  args: {
    category?: NonNullable<Doc<"presets">["category"]>;
    status?: NonNullable<Doc<"presets">["status"]>;
  }
) {
  if (args.category && preset.category !== args.category) {
    return false;
  }

  if (args.status && preset.status !== args.status) {
    return false;
  }

  return true;
}

export const list = query({
  args: {
    category: v.optional(categoryValidator),
    status: v.optional(statusValidator),
    viewerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.viewerId) {
      await requireAuthorizedUser(ctx, args.viewerId);
    }

    if (!args.viewerId) {
      if (args.status && args.status !== "published") {
        return [];
      }

      const presets = args.category && !args.status
        ? await ctx.db
            .query("presets")
            .withIndex("by_category", (q) =>
              q.eq("category", args.category!)
            )
            .collect()
        : await ctx.db
            .query("presets")
            .withIndex("by_public_status", (q) =>
              q.eq("isPublic", true).eq("status", "published")
            )
            .collect();

      return sortNewestFirst(
        presets.filter(
          (preset) =>
            preset.isPublic &&
            preset.status === "published" &&
            matchesListFilters(preset, args)
        )
      );
    }

    const [ownedPresets, publicPresets] = await Promise.all([
      ctx.db
        .query("presets")
        .withIndex("by_author", (q) => q.eq("authorId", args.viewerId!))
        .collect(),
      args.status && args.status !== "published"
        ? Promise.resolve([])
        : ctx.db
            .query("presets")
            .withIndex("by_public_status", (q) =>
              q.eq("isPublic", true).eq("status", "published")
            )
            .collect(),
    ]);

    const visiblePresets = new Map<Doc<"presets">["_id"], Doc<"presets">>();
    for (const preset of ownedPresets) {
      visiblePresets.set(preset._id, preset);
    }
    for (const preset of publicPresets) {
      visiblePresets.set(preset._id, preset);
    }

    return sortNewestFirst(
      [...visiblePresets.values()].filter((preset) =>
        matchesListFilters(preset, args)
      )
    );
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
  args: {
    id: v.id("presets"),
    viewerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.viewerId) {
      await requireAuthorizedUser(ctx, args.viewerId);
    }

    const preset = await ctx.db.get(args.id);
    if (!preset) return null;

    return canAccessPreset(preset, args.viewerId) ? preset : null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: categoryValidator,
    tags: v.array(v.string()),
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
    license: v.optional(licenseValidator),
    priceCents: v.optional(v.number()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    // Author identity is derived from the authenticated session — never
    // from a client-supplied userId. Previously this handler accepted an
    // optional authorId and only enforced auth if it was present, which
    // let unauthenticated callers create public marketplace records with
    // no owner. We now require a real session and stamp the owner here.
    const author = await requireSignedInUser(ctx);

    // If the new preset is tied to an AI generation, make sure the caller
    // actually owns that generation. This prevents a signed-in user from
    // publishing someone else's generated code as their own.
    if (args.generationId) {
      const gen = await ctx.db.get(args.generationId);
      if (!gen) throw new Error("Generation not found");
      if (gen.userId !== author._id) {
        throw new Error("You do not own that generation");
      }
    }
    const monetization = normalizePresetPricing(args);

    return await ctx.db.insert("presets", {
      ...args,
      author: author.name ?? "Anonymous",
      authorId: author._id,
      license: monetization.license,
      priceCents: monetization.priceCents,
      isPremium: monetization.isPremium,
      price: monetization.price,
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

export const generateThumbnailUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Must be signed in — otherwise any visitor could mint upload URLs and
    // burn through storage quota.
    await requireSignedInUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // Require sign-in. Convex storage IDs are high-entropy opaque strings so
    // an attacker still has to guess, but we should not expose a public URL
    // resolver on top of that. Callers that need a public URL for a public
    // preset should go through the preset record's thumbnailUrl field.
    await requireSignedInUser(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Storage object not found");
    return url;
  },
});

export const update = mutation({
  args: {
    id: v.id("presets"),
    // NOTE: userId is intentionally NOT in this arg list. Previously the
    // handler trusted a client-supplied userId and only compared it to
    // preset.authorId, which meant any caller who knew a preset id and its
    // real author id could spoof the userId and pass the check. The caller
    // identity now comes from requireSignedInUser(ctx) only.
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
    license: v.optional(licenseValidator),
    priceCents: v.optional(v.number()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),
    status: v.optional(statusValidator),
    versionLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const { id, ...fields } = args;
    const preset = await ctx.db.get(id);
    if (!preset) {
      throw new Error("Preset not found");
    }
    if (!preset.authorId || preset.authorId !== caller._id) {
      throw new Error("You can only edit presets you own");
    }
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (
        value !== undefined &&
        key !== "license" &&
        key !== "priceCents" &&
        key !== "isPremium" &&
        key !== "price"
      ) {
        updates[key] = value;
      }
    }
    if (
      fields.license !== undefined ||
      fields.priceCents !== undefined ||
      fields.isPremium !== undefined ||
      fields.price !== undefined
    ) {
      const monetization = normalizePresetPricing(fields);
      updates.license = monetization.license;
      updates.priceCents = monetization.priceCents;
      updates.isPremium = monetization.isPremium;
      updates.price = monetization.price;
    }
    await ctx.db.patch(id, updates);
  },
});

export const archive = mutation({
  args: {
    id: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Preset not found");
    if (!preset.authorId || preset.authorId !== caller._id) {
      throw new Error("You can only archive presets you own");
    }
    await ctx.db.patch(args.id, { status: "archived" });
  },
});

export const incrementDownloads = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, args) => {
    // Must be signed in and the preset must be visible to the caller.
    // Unauthenticated metric increments were trivially gameable before.
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Preset not found");
    if (!canAccessPreset(preset, caller._id)) {
      throw new Error("Cannot record a download for a preset you can't access");
    }
    await ctx.db.patch(args.id, {
      downloads: (preset.downloads ?? 0) + 1,
    });
  },
});

export const incrementViewCount = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.id);
    if (!preset) throw new Error("Preset not found");
    if (!canAccessPreset(preset, caller._id)) {
      throw new Error("Cannot record a view for a preset you can't access");
    }
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
        q.search("name", args.query).eq("status", "published").eq("isPublic", true)
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
    await requireAuthorizedUser(ctx, args.userId);

    const source = await ctx.db.get(args.sourcePresetId);
    if (!source) throw new Error("Source preset not found");
    if (!canAccessPreset(source, args.userId)) {
      throw new Error("You can only clone public presets or presets you own");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const rootId = source.rootPresetId ?? args.sourcePresetId;
    const monetization = getPresetPricing(source);

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
      license: monetization.license,
      priceCents: monetization.priceCents,
      isPremium:
        monetization.license === "paid-personal" ||
        monetization.license === "paid-commercial",
      price: monetization.priceCents / 100,
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
  args: {
    presetId: v.id("presets"),
    viewerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.viewerId) {
      await requireAuthorizedUser(ctx, args.viewerId);
    }

    const preset = await ctx.db.get(args.presetId);
    if (!preset) return null;
    if (!canAccessPreset(preset, args.viewerId)) return null;

    const rootId = preset.rootPresetId ?? args.presetId;
    const root = rootId === args.presetId ? preset : await ctx.db.get(rootId);
    if (!root) return null;
    if (!canAccessPreset(root, args.viewerId)) return null;

    // Get all presets in this tree
    const allVersions = await ctx.db
      .query("presets")
      .withIndex("by_root", (q) => q.eq("rootPresetId", rootId))
      .collect();

    // Include the root itself
    return { root, versions: filterVisiblePresets(allVersions, args.viewerId) };
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    const presets = await ctx.db
      .query("presets")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();

    return sortNewestFirst(presets);
  },
});
