import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  presets: defineTable({
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
    authorId: v.optional(v.id("users")),

    bundleUrl: v.string(),
    bundleHash: v.optional(v.string()),

    fps: v.number(),
    width: v.number(),
    height: v.number(),
    durationInFrames: v.number(),

    inputSchema: v.string(),

    thumbnailUrl: v.optional(v.string()),
    previewVideoUrl: v.optional(v.string()),

    isPublic: v.boolean(),
    downloads: v.optional(v.number()),
    rating: v.optional(v.number()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),

    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_author", ["authorId"])
    .searchIndex("search_presets", {
      searchField: "name",
      filterFields: ["category", "status", "isPublic"],
    }),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(
      v.literal("user"),
      v.literal("creator"),
      v.literal("admin")
    ),

    modalApiKey: v.optional(v.string()),
    awsAccessKeyId: v.optional(v.string()),
    awsSecretAccessKey: v.optional(v.string()),
    awsRegion: v.optional(v.string()),

    externalId: v.optional(v.string()),
    plan: v.optional(
      v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))
    ),
    renderCredits: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_externalId", ["externalId"]),

  collections: defineTable({
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
    presetIds: v.array(v.id("presets")),
  }).index("by_user", ["userId"]),

  savedPresets: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
    name: v.string(),
    customProps: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_preset", ["presetId"]),

  renderJobs: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
    bundleUrl: v.string(),
    inputProps: v.string(),

    status: v.union(
      v.literal("queued"),
      v.literal("rendering"),
      v.literal("done"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()),
    error: v.optional(v.string()),

    outputUrl: v.optional(v.string()),
    outputSize: v.optional(v.number()),

    renderEngine: v.union(
      v.literal("modal"),
      v.literal("lambda"),
      v.literal("platform")
    ),

    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  projects: defineTable({
    name: v.string(),
    userId: v.id("users"),
    description: v.optional(v.string()),
    presetEntries: v.array(
      v.object({
        presetId: v.id("presets"),
        savedPresetId: v.optional(v.id("savedPresets")),
        order: v.number(),
      })
    ),
  }).index("by_user", ["userId"]),
});
