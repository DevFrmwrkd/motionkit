/**
 * Admin / moderation tooling (Phase 2 / WS-7).
 *
 * All functions in this file gate on `requireAdmin`. Non-admins get a
 * loud error — never a silent empty result — so frontend bugs that forget
 * to hide admin affordances fail fast instead of leaking admin-only data.
 *
 * What lives here:
 *   - Review queue queries (pending + rejected + recently-approved)
 *   - Broken-render alerts (presets whose last test render failed recently)
 *   - Moderation mutations: force-unlist, contact-creator stub, role change
 *   - Audit log viewer + filters
 *   - Compile-error dashboard query
 *
 * What doesn't live here:
 *   - State transitions for the review pipeline live in `presetReview.ts`
 *     because they're shared with the creator-side entry points.
 *   - Analytics aggregation lives in `analytics.ts`.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/authz";
import { normalizeReason } from "./lib/moderation";

// ─── Review queue ───────────────────────────────────────────

export const reviewQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [pending, rejected, testRendering] = await Promise.all([
      ctx.db
        .query("presets")
        .withIndex("by_review_state", (q) => q.eq("reviewState", "pending-review"))
        .collect(),
      ctx.db
        .query("presets")
        .withIndex("by_review_state", (q) => q.eq("reviewState", "rejected"))
        .collect(),
      ctx.db
        .query("presets")
        .withIndex("by_review_state", (q) => q.eq("reviewState", "test-rendering"))
        .collect(),
    ]);
    return {
      pending: pending.sort(
        (a, b) => (a.lastValidatedAt ?? 0) - (b.lastValidatedAt ?? 0)
      ),
      rejected: rejected.sort(
        (a, b) => (b.lastValidatedAt ?? 0) - (a.lastValidatedAt ?? 0)
      ),
      testRendering,
    };
  },
});

/**
 * Broken-render detection. Returns presets whose `lastTestRenderJobId`
 * points at a failed render, grouped by failure recency. The admin
 * dashboard uses this to surface presets that were fine at publish time
 * but regressed on re-validation.
 */
export const brokenRenders = query({
  args: {
    sinceMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const since = args.sinceMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    const failedJobs = await ctx.db
      .query("renderJobs")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();
    const recent = failedJobs.filter(
      (j) => (j.completedAt ?? 0) >= since
    );
    const byPreset = new Map<string, { job: typeof recent[number]; count: number }>();
    for (const j of recent) {
      const prev = byPreset.get(j.presetId);
      if (!prev) {
        byPreset.set(j.presetId, { job: j, count: 1 });
      } else {
        byPreset.set(j.presetId, { job: j, count: prev.count + 1 });
      }
    }
    const results = [];
    for (const [presetId, { job, count }] of byPreset.entries()) {
      const preset = await ctx.db.get(job.presetId);
      if (!preset) continue;
      results.push({
        presetId,
        presetName: preset.name,
        authorId: preset.authorId,
        failureCount: count,
        lastError: job.error ?? null,
        lastFailedAt: job.completedAt ?? null,
      });
    }
    return results.sort(
      (a, b) => (b.lastFailedAt ?? 0) - (a.lastFailedAt ?? 0)
    );
  },
});

// ─── Compile error dashboard ────────────────────────────────

export const recentCompileErrors = query({
  args: {
    phase: v.optional(
      v.union(
        v.literal("parse-schema"),
        v.literal("parse-meta"),
        v.literal("validate-meta"),
        v.literal("preprocess"),
        v.literal("transpile"),
        v.literal("execute"),
        v.literal("resolve")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.phase) {
      return await ctx.db
        .query("compileErrors")
        .withIndex("by_phase", (q) => q.eq("phase", args.phase!))
        .order("desc")
        .take(args.limit ?? 50);
    }
    return await ctx.db
      .query("compileErrors")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ─── Audit log viewer ───────────────────────────────────────

export const auditLog = query({
  args: {
    actorId: v.optional(v.id("users")),
    targetType: v.optional(
      v.union(
        v.literal("preset"),
        v.literal("user"),
        v.literal("presetVersion"),
        v.literal("licenseGrant")
      )
    ),
    targetId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 100, 500);
    if (args.actorId) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_actor", (q) => q.eq("actorId", args.actorId))
        .order("desc")
        .take(limit);
    }
    if (args.targetType && args.targetId) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_target", (q) =>
          q.eq("targetType", args.targetType!).eq("targetId", args.targetId!)
        )
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("auditLog")
      .withIndex("by_time")
      .order("desc")
      .take(limit);
  },
});

// ─── Moderation mutations ───────────────────────────────────

/**
 * Force-unlist a preset without going through the full state machine.
 * Used for emergency takedowns (DMCA, policy violations). Leaves a very
 * visible audit entry with the reason so the creator can see why their
 * preset disappeared.
 */
export const forceUnlist = mutation({
  args: {
    presetId: v.id("presets"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    const reason = normalizeReason(args.reason, {
      required: true,
      fieldName: "Unlist reason",
    })!;
    await ctx.db.patch(args.presetId, {
      status: "archived",
      reviewState: "archived",
      isPublic: false,
      rejectedReason: reason,
    });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "preset.unlist",
      targetType: "preset",
      targetId: args.presetId,
      reason,
      createdAt: Date.now(),
    });
  },
});

/**
 * Force-edit a preset's metadata (name, description, category, tags).
 * Source code is deliberately NOT editable here — policy violations in
 * source should be resolved by unlisting, not silently patching code.
 */
export const forceEditMetadata = mutation({
  args: {
    presetId: v.id("presets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    const reason = normalizeReason(args.reason, {
      required: true,
      fieldName: "Force-edit reason",
    })!;
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (Object.keys(updates).length === 0) {
      throw new Error("forceEditMetadata called with no changes");
    }
    await ctx.db.patch(args.presetId, updates);
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "preset.force-edit",
      targetType: "preset",
      targetId: args.presetId,
      payload: JSON.stringify(updates),
      reason,
      createdAt: Date.now(),
    });
  },
});

/**
 * Admin role change. Promotes or demotes a user's role. Audit-logged.
 * Admins cannot demote themselves to avoid locking the platform out of
 * the admin UI by accident.
 */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("user"),
      v.literal("creator"),
      v.literal("admin")
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === args.userId && args.role !== "admin") {
      throw new Error("Admins cannot demote themselves");
    }
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const reason = normalizeReason(args.reason, {
      fieldName: "Role-change reason",
    });

    // Last-admin lockout guard: if this demotion would remove the platform's
    // final admin, refuse. We cap the scan at 10_000 rows — if you have more
    // users than that, add a `by_role` index on users and swap this for
    // `.withIndex("by_role", q => q.eq("role", "admin")).first()` to find
    // the cheapest proof of a second admin. Until then this is a bounded
    // scan that short-circuits as soon as a second admin is found.
    const demoting = user.role === "admin" && args.role !== "admin";
    if (demoting) {
      const SCAN_CAP = 10_000;
      const candidates = await ctx.db.query("users").take(SCAN_CAP);
      const otherAdminFound = candidates.some(
        (u) => u._id !== user._id && u.role === "admin"
      );
      if (!otherAdminFound) {
        throw new Error(
          "Cannot demote the last admin — promote another user first"
        );
      }
    }

    await ctx.db.patch(args.userId, { role: args.role });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "user.role-change",
      targetType: "user",
      targetId: args.userId,
      payload: JSON.stringify({ from: user.role ?? "user", to: args.role }),
      reason,
      createdAt: Date.now(),
    });
  },
});

// ─── Admin user list ────────────────────────────────────────

export const listUsers = query({
  args: {
    role: v.optional(
      v.union(v.literal("user"), v.literal("creator"), v.literal("admin"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(args.limit ?? 200);
    if (args.role) {
      return users.filter((u) => u.role === args.role);
    }
    return users;
  },
});
