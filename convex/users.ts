import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the currently authenticated user.
 * Uses the auth identity to look up the user document.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    return user;
  },
});

/**
 * Get or create a demo user for testing without OAuth.
 */
export const getOrCreateDemoUser = mutation({
  args: {},
  handler: async (ctx) => {
    const demoEmail = "demo@motionkit.dev";
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", demoEmail))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      name: "Demo User",
      email: demoEmail,
      avatarUrl: undefined,
      role: "creator",
      plan: "free",
      renderCredits: 10,
      dailyGenerations: 0,
      tokenIdentifier: "demo:demo-user",
      isPublicProfile: true,
      bio: "Demo account for exploring MotionKit",
    });
  },
});

/**
 * Get a user by their demo token (for session persistence).
 */
export const getDemoUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo@motionkit.dev"))
      .first();
  },
});

export const getOrCreate = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      ...args,
      role: "user",
      plan: "free",
      renderCredits: 0,
    });
  },
});

export const createOrUpdateFromAuth = mutation({
  args: {
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        email: args.email ?? existing.email,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      tokenIdentifier: args.tokenIdentifier,
      role: "user",
      plan: "free",
      renderCredits: 0,
      dailyGenerations: 0,
    });
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getApiKeys = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    return {
      modalApiKey: user.modalApiKey ?? null,
      awsAccessKeyId: user.awsAccessKeyId ?? null,
      awsSecretAccessKey: user.awsSecretAccessKey ?? null,
      awsRegion: user.awsRegion ?? null,
    };
  },
});

export const updateApiKeys = mutation({
  args: {
    userId: v.id("users"),
    modalApiKey: v.optional(v.string()),
    awsAccessKeyId: v.optional(v.string()),
    awsSecretAccessKey: v.optional(v.string()),
    awsRegion: v.optional(v.string()),
    geminiApiKey: v.optional(v.string()),
    anthropicApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...keys } = args;
    const updates: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(keys)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(userId, updates);
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    socialLinks: v.optional(
      v.object({
        twitter: v.optional(v.string()),
        github: v.optional(v.string()),
        youtube: v.optional(v.string()),
      })
    ),
    isPublicProfile: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(userId, updates);
  },
});

export const getPublicProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const presets = await ctx.db
      .query("presets")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();

    const publishedPresets = presets.filter((p) => p.status === "published");
    const totalDownloads = publishedPresets.reduce(
      (sum, p) => sum + (p.downloads ?? 0),
      0
    );
    const totalVotes = publishedPresets.reduce(
      (sum, p) => sum + (p.voteScore ?? 0),
      0
    );

    return {
      _id: user._id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      website: user.website,
      socialLinks: user.socialLinks,
      role: user.role,
      presetCount: publishedPresets.length,
      totalDownloads,
      totalVotes,
      presets: publishedPresets,
    };
  },
});
