import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

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

/**
 * Internal-only: returns the raw (still-encrypted) API key fields.
 * The render action decrypts these using convex/lib/encryption.ts.
 */
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
