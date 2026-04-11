/**
 * Append-only metric events for presets (Phase 2 / WS-5).
 *
 * This file is intentionally thin: insert events cheaply from every call
 * site that wants to log an interaction, and let `convex/analytics.ts` do
 * the expensive rollup work on a schedule. Keeping the write path minimal
 * means front-end callers don't pay for aggregation latency.
 *
 * Event taxonomy (see `presetEvents` table in schema.ts):
 *   - view              — marketplace listing impression
 *   - preview           — workstation preview mounted
 *   - fork              — user forked the preset into their library
 *   - render-queued     — render job created
 *   - render-complete   — render job finished successfully
 *   - render-failed     — render job errored
 *   - save              — saved as a user variation
 *   - download          — raw bundle download
 *   - purchase-view     — checkout page opened
 *   - purchase-complete — successful paid grant
 *
 * Writes are append-only. There are deliberately no mutations that edit
 * or delete events. For deletions driven by GDPR or moderation, roll out
 * a dedicated internal migration rather than touching this file.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  canAccessPreset,
  requireSignedInUser,
  requireAdmin,
} from "./lib/authz";

const eventTypeValidator = v.union(
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
);

/**
 * Log a single preset event. Callable from the client for user-initiated
 * actions (view, preview, fork, save). The caller must be signed in —
 * unauthenticated metric writes were trivially gameable in Phase 1.
 */
export const log = mutation({
  args: {
    presetId: v.id("presets"),
    type: eventTypeValidator,
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    // Only log events for presets the caller can actually see. This
    // prevents attackers from spamming events on draft presets they don't
    // own to poison analytics.
    if (!canAccessPreset(preset, caller._id)) {
      throw new Error("Cannot log events for a preset you can't access");
    }
    await ctx.db.insert("presetEvents", {
      presetId: args.presetId,
      userId: caller._id,
      type: args.type,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal: log an event from a server-side action (render worker, Stripe
 * webhook, etc.). No auth check — callers must have already authorized.
 */
export const logInternal = internalMutation({
  args: {
    presetId: v.id("presets"),
    userId: v.optional(v.id("users")),
    type: eventTypeValidator,
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("presetEvents", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// ─── Queries (read-only) ────────────────────────────────────

/**
 * Recent events for a preset, for the creator dashboard. Author-gated
 * because the raw event stream reveals who interacted with what and when.
 */
export const recentForPreset = query({
  args: {
    presetId: v.id("presets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) return [];
    if (preset.authorId !== caller._id) {
      throw new Error("You can only read events for presets you own");
    }
    return await ctx.db
      .query("presetEvents")
      .withIndex("by_preset", (q) => q.eq("presetId", args.presetId))
      .order("desc")
      .take(Math.min(args.limit ?? 100, 500));
  },
});

export const adminEventsByType = query({
  args: {
    type: eventTypeValidator,
    sinceMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const since = args.sinceMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("presetEvents")
      .withIndex("by_type_time", (q) =>
        q.eq("type", args.type).gte("createdAt", since)
      )
      .collect();
  },
});
