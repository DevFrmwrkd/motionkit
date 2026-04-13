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

// Fine-grained review lifecycle. Distinct from the coarse public `status`
// field: review state gates the publish pipeline (draft → validating →
// test-rendering → pending-review → approved → published), while `status`
// is the user-facing state that determines marketplace visibility.
export const reviewStateValidator = v.union(
  v.literal("draft"),
  v.literal("validating"),
  v.literal("test-rendering"),
  v.literal("pending-review"),
  v.literal("approved"),
  v.literal("published"),
  v.literal("rejected"),
  v.literal("archived")
);

export const licenseValidator = v.union(
  v.literal("free"),
  v.literal("commercial-free"),
  v.literal("paid-personal"),
  v.literal("paid-commercial")
);

export const compilePhaseValidator = v.union(
  v.literal("parse-schema"),
  v.literal("parse-meta"),
  v.literal("validate-meta"),
  v.literal("preprocess"),
  v.literal("transpile"),
  v.literal("execute"),
  v.literal("resolve")
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

    // Phase 2 / WS-3 fork metadata. `forkedFrom` + `forkedVersion` record
    // the exact version the fork was based on (parentPresetId only stores
    // the id, not which version was current at clone time).
    forkedFrom: v.optional(v.id("presets")),
    forkedVersion: v.optional(v.number()),
    currentVersionId: v.optional(v.id("presetVersions")),

    // Phase 2 / WS-1 bundle signing. `bundleHash` already exists above;
    // `bundleSignature` is the HMAC over that hash. Clients load the bundle
    // from R2, recompute the hash, and verify the signature via a Convex
    // query before compiling.
    bundleSignature: v.optional(v.string()),

    // Phase 2 / WS-2 review pipeline.
    reviewState: v.optional(reviewStateValidator),
    publishableFlags: v.optional(
      v.object({
        previewable: v.boolean(),
        renderable: v.boolean(),
        commercialUseReady: v.boolean(),
      })
    ),
    lastValidatedAt: v.optional(v.number()),
    lastTestRenderJobId: v.optional(v.id("renderJobs")),
    rejectedReason: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),

    // Phase 2 / WS-6 monetization.
    // `license` + `priceCents` are canonical; `isPremium` + `price` are
    // legacy compatibility fields kept for rows created before the migration.
    license: v.optional(licenseValidator),
    priceCents: v.optional(v.number()),
    isPremium: v.optional(v.boolean()),
    price: v.optional(v.number()),

    status: statusValidator,
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentPresetId"])
    .index("by_root", ["rootPresetId"])
    .index("by_public_status", ["isPublic", "status"])
    .index("by_review_state", ["reviewState"])
    .index("by_forked_from", ["forkedFrom"])
    .searchIndex("search_presets", {
      searchField: "name",
      filterFields: ["category", "status", "isPublic", "reviewState"],
    }),

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // Convex Auth standard fields (populated by OAuth providers)
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(
      v.union(v.literal("user"), v.literal("creator"), v.literal("admin"))
    ),

    // API keys (encrypted)
    modalApiKey: v.optional(v.string()),

    // AI provider keys (user's own keys)
    geminiApiKey: v.optional(v.string()),
    anthropicApiKey: v.optional(v.string()),
    // OpenRouter is a multi-model aggregator. Users pick any model id they
    // want (e.g. "z-ai/glm-5.1", "deepseek/deepseek-chat-v3:free"); we just
    // forward it. Model id is not a secret — stored in plaintext alongside
    // the encrypted key.
    openRouterApiKey: v.optional(v.string()),
    openRouterModel: v.optional(v.string()),

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
    .index("email", ["email"])
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
    style: v.optional(v.string()),
    referenceImageId: v.optional(v.id("_storage")),
    provider: v.union(
      v.literal("gemini"),
      v.literal("claude"),
      v.literal("openrouter"),
    ),

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

  // ─── Phase 2 / WS-2 Publish pipeline ─────────────────────────

  /**
   * Append-only version history for a preset. Each publish bumps
   * `versionNumber` by one and snapshots the bundle location + the
   * changelog. Rollback to an earlier version is a matter of pointing
   * `presets.currentVersionId` at the desired row.
   */
  presetVersions: defineTable({
    presetId: v.id("presets"),
    versionNumber: v.number(),
    bundleR2Key: v.string(),
    bundleHash: v.string(),
    bundleSignature: v.string(),
    sourceCode: v.optional(v.string()),
    inputSchema: v.optional(v.string()),
    metaJson: v.optional(v.string()),
    changelog: v.optional(v.string()),
    testRenderJobId: v.optional(v.id("renderJobs")),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_preset", ["presetId"])
    .index("by_preset_version", ["presetId", "versionNumber"]),

  /**
   * Append-only metric events. Queries roll up to daily/weekly counts via
   * `convex/analytics.ts`. Keep this table narrow — a wide schema here
   * becomes expensive to scan at scale.
   */
  presetEvents: defineTable({
    presetId: v.id("presets"),
    userId: v.optional(v.id("users")),
    type: v.union(
      v.literal("view"),
      v.literal("preview"),
      v.literal("fork"),
      v.literal("render-queued"),
      v.literal("render-complete"),
      v.literal("render-failed"),
      v.literal("save"),
      v.literal("download"),
      v.literal("purchase-view"),
      v.literal("purchase-complete")
    ),
    createdAt: v.number(),
    metadata: v.optional(v.string()),
  })
    .index("by_preset", ["presetId"])
    .index("by_preset_type", ["presetId", "type"])
    .index("by_type_time", ["type", "createdAt"]),

  /**
   * Moderation audit log. Every manual admin action (approve, reject,
   * archive, force-edit) writes one row here. Never mutated; rows are the
   * record of what decision was made, by whom, on what, and when.
   */
  auditLog: defineTable({
    // Optional so system-triggered events (render completion callbacks,
    // scheduled jobs) don't need to invent a fake user id.
    actorId: v.optional(v.id("users")),
    action: v.union(
      v.literal("preset.approve"),
      v.literal("preset.reject"),
      v.literal("preset.unlist"),
      v.literal("preset.archive"),
      v.literal("preset.force-edit"),
      v.literal("preset.contact-creator"),
      v.literal("preset.validate"),
      v.literal("preset.test-render"),
      v.literal("preset.publish"),
      v.literal("preset.unpublish"),
      v.literal("preset.flag"),
      v.literal("user.role-change"),
      v.literal("license.grant"),
      v.literal("license.revoke")
    ),
    targetType: v.union(
      v.literal("preset"),
      v.literal("user"),
      v.literal("presetVersion"),
      v.literal("licenseGrant")
    ),
    targetId: v.string(),
    payload: v.optional(v.string()),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_time", ["createdAt"]),

  /**
   * Structured compile errors. Written by the client sandbox and the
   * server validator whenever a preset fails to parse/transpile/execute.
   * Feeds the admin broken-preset queue and the AI auto-correction loop.
   */
  compileErrors: defineTable({
    presetId: v.optional(v.id("presets")),
    userId: v.optional(v.id("users")),
    generationId: v.optional(v.id("aiGenerations")),
    phase: compilePhaseValidator,
    message: v.string(),
    line: v.optional(v.number()),
    column: v.optional(v.number()),
    hint: v.optional(v.string()),
    sourceHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_preset", ["presetId"])
    .index("by_generation", ["generationId"])
    .index("by_phase", ["phase"])
    .index("by_user_time", ["userId", "createdAt"]),

  // ─── Phase 2 / WS-6 Monetization ─────────────────────────────

  /**
   * A license grant is the record that a specific user has paid for (or
   * otherwise earned) the right to use a specific preset commercially or
   * privately. Feature-flagged: the grant table exists even when
   * monetization is off so downgrades don't lose records.
   */
  licenseGrants: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
    license: licenseValidator,
    priceCents: v.number(),
    stripeChargeId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
    grantedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedReason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_preset", ["userId", "presetId"])
    .index("by_preset", ["presetId"])
    .index("by_stripe_session", ["stripeCheckoutSessionId"]),

  /**
   * Per-user usage meters for renders and AI generations. Rolled up per
   * billing period (YYYY-MM string). One row per (userId, period).
   */
  usageMeters: defineTable({
    userId: v.id("users"),
    period: v.string(), // e.g. "2026-04"
    renderSeconds: v.number(),
    renderCount: v.number(),
    aiTokens: v.number(),
    aiGenerationCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_period", ["userId", "period"])
    .index("by_user", ["userId"]),

  // ─── Phase 2 / GPT-requested tables (applied via schema-sync) ────

  /**
   * Per-user brand kits: logo, colours, fonts, and default copy blocks
   * that the workstation merges into preset defaults via "Apply brand kit".
   * GPT-owned feature (WS-4); Claude applies the schema per single-writer
   * rule in PHASE-2-TRACKS.md §4.
   */
  brandKits: defineTable({
    userId: v.id("users"),
    name: v.string(),
    logoR2Key: v.optional(v.string()),
    colors: v.array(v.string()),
    fonts: v.array(v.string()),
    // Record<string, string> to match REQ-001. Keys are prop names,
    // values are default copy blocks that the workstation merges into
    // the preset's `inputProps` when the brand kit is applied.
    defaultCopy: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  /**
   * Per-preset comment threads with category (feedback | bug | feature-
   * request). Creators can mark resolved and tie the resolution to a
   * version number so "bug in v2" can show "fixed in v3".
   */
  presetComments: defineTable({
    presetId: v.id("presets"),
    userId: v.id("users"),
    category: v.union(
      v.literal("feedback"),
      v.literal("bug"),
      v.literal("feature-request")
    ),
    body: v.string(),
    resolvedInVersion: v.optional(v.number()),
    resolvedByUserId: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_preset", ["presetId"])
    .index("by_user", ["userId"])
    .index("by_preset_category", ["presetId", "category"]),
});
