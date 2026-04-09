import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { categoryValidator } from "./lib/validators";

export const create = mutation({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
    category: v.optional(categoryValidator),
    referenceImageId: v.optional(v.id("_storage")),
    provider: v.union(v.literal("gemini"), v.literal("claude")),
    parentGenerationId: v.optional(v.id("aiGenerations")),
  },
  handler: async (ctx, args) => {
    const iterationNumber = args.parentGenerationId
      ? ((await ctx.db.get(args.parentGenerationId))?.iterationNumber ?? 0) + 1
      : 1;

    return await ctx.db.insert("aiGenerations", {
      ...args,
      status: "generating",
      iterationNumber,
    });
  },
});

export const get = query({
  args: { id: v.id("aiGenerations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiGenerations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const markComplete = mutation({
  args: {
    generationId: v.id("aiGenerations"),
    generatedCode: v.string(),
    generatedSchema: v.string(),
    generatedMeta: v.string(),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { generationId, ...updates } = args;
    await ctx.db.patch(generationId, {
      ...updates,
      status: "complete",
    });
  },
});

export const markFailed = mutation({
  args: {
    generationId: v.id("aiGenerations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: "failed",
      error: args.error,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
