import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// ─── Shared Validators ───────────────────────────────────────

export const categoryValidator = v.union(
  v.literal("intro"),
  v.literal("title"),
  v.literal("lower-third"),
  v.literal("cta"),
  v.literal("transition"),
  v.literal("outro"),
  v.literal("full"),
  v.literal("chart"),
  v.literal("map"),
  v.literal("social")
);

export const statusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
);

// ─── Schema ──────────────────────────────────────────────────

export default defineSchema({
  ...authTables,

  presets: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: categoryValidator,
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
    sourceCode: v.optional(v.string()),
    generationId: v.optional(v.id("aiGenerations")),

    thumbnailUrl: v.optional(v.string()),
    previewVideoUrl: v.optional(v.string()),

    isPublic: v.boolean(),
    downloads: v.optional(v.number()),
    rating: v.optional(v.number()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),

    // Voting
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
    voteScore: v.optional(v.number()),
    viewCount: v.optional(v.number()),

    // Versioning
    parentPresetId: v.optional(v.id("presets")),
    rootPresetId: v.optional(v.id("presets")),
    versionLabel: v.optional(v.string()),
    cloneCount: v.optional(v.number()),

    status: statusValidator,
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentPresetId"])
    .index("by_root", ["rootPresetId"])
    .index("by_public_status", ["isPublic", "status"])
    .searchIndex("search_presets", {
      searchField: "name",
      filterFields: ["category", "status", "isPublic"],
    }),

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("user"), v.literal("creator"), v.literal("admin"))
    ),

    // API keys (encrypted)
    modalApiKey: v.optional(v.string()),
    awsAccessKeyId: v.optional(v.string()),
    awsSecretAccessKey: v.optional(v.string()),
    awsRegion: v.optional(v.string()),

    // AI provider keys (user's own keys)
    geminiApiKey: v.optional(v.string()),
    anthropicApiKey: v.optional(v.string()),

    // Auth
    tokenIdentifier: v.optional(v.string()),

    // Profile
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

    // Billing
    plan: v.optional(
      v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))
    ),
    renderCredits: v.optional(v.number()),

    // AI quota
    dailyGenerations: v.optional(v.number()),
    lastGenerationDate: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

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

  // ─── AI Generation ──────────────────────────────────────────

  aiGenerations: defineTable({
    userId: v.id("users"),
    prompt: v.string(),
    category: v.optional(categoryValidator),
    referenceImageId: v.optional(v.id("_storage")),
    provider: v.union(v.literal("gemini"), v.literal("claude")),

    status: v.union(
      v.literal("generating"),
      v.literal("complete"),
      v.literal("failed")
    ),

    generatedCode: v.optional(v.string()),
    generatedSchema: v.optional(v.string()),
    generatedMeta: v.optional(v.string()),
    error: v.optional(v.string()),

    parentGenerationId: v.optional(v.id("aiGenerations")),
    iterationNumber: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ─── Voting ─────────────────────────────────────────────────

  votes: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
    value: v.number(), // +1 or -1
    createdAt: v.number(),
  })
    .index("by_user_preset", ["userId", "presetId"])
    .index("by_preset", ["presetId"]),
});
