/**
 * Creator & admin analytics rollups (Phase 2 / WS-5).
 *
 * Reads from the `presetEvents` append-only log and produces the summaries
 * the creator dashboard and admin tools consume. Two kinds of queries here:
 *
 *   - `presetSummary` — per-preset counts (views, clones, renders, saves,
 *     purchaseConversions) over a lookback window. Author-gated.
 *   - `creatorOverview` — totals across all presets a creator owns.
 *     Author-gated.
 *   - `adminOverview` — platform-wide event counts for the admin dashboard.
 *
 * These queries walk the event log linearly. At scale this needs a
 * scheduled rollup into a dedicated table; for Phase 2 the naive loop is
 * fine (7-day windows, small per-preset volumes) and the interface is
 * shaped so the rollup can be swapped in without caller changes.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireSignedInUser, requireAdmin } from "./lib/authz";

type EventType = Doc<"presetEvents">["type"];

type Counts = Record<EventType, number>;

function emptyCounts(): Counts {
  return {
    view: 0,
    preview: 0,
    fork: 0,
    "render-queued": 0,
    "render-complete": 0,
    "render-failed": 0,
    save: 0,
    download: 0,
    "purchase-view": 0,
    "purchase-complete": 0,
  };
}

function rollupCounts(events: Doc<"presetEvents">[]): Counts {
  const counts = emptyCounts();
  for (const e of events) {
    counts[e.type] += 1;
  }
  return counts;
}

/**
 * Per-preset rollup. Returns the raw counts plus some handy derived
 * numbers (views per fork, purchase conversion rate).
 */
export const presetSummary = query({
  args: {
    presetId: v.id("presets"),
    sinceMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) return null;
    if (preset.authorId !== caller._id) {
      throw new Error("You can only view analytics for presets you own");
    }

    const since = args.sinceMs ?? 0;
    const events = await ctx.db
      .query("presetEvents")
      .withIndex("by_preset", (q) => q.eq("presetId", args.presetId))
      .collect();
    const inWindow = events.filter((e) => e.createdAt >= since);
    const counts = rollupCounts(inWindow);

    const forkRate = counts.view > 0 ? counts.fork / counts.view : 0;
    const purchaseConversion =
      counts["purchase-view"] > 0
        ? counts["purchase-complete"] / counts["purchase-view"]
        : 0;
    const renderSuccessRate =
      counts["render-queued"] > 0
        ? counts["render-complete"] / counts["render-queued"]
        : 0;

    return {
      presetId: preset._id,
      name: preset.name,
      counts,
      forkRate,
      purchaseConversion,
      renderSuccessRate,
      windowSinceMs: since,
    };
  },
});

/**
 * Creator overview across ALL of the creator's presets.
 */
export const creatorOverview = query({
  args: {
    userId: v.id("users"),
    sinceMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    if (caller._id !== args.userId) {
      throw new Error("You can only view your own creator overview");
    }

    const presets = await ctx.db
      .query("presets")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();

    const since = args.sinceMs ?? 0;
    const totals = emptyCounts();

    const perPresetById = new Map<
      Doc<"presets">["_id"],
      {
        presetId: Doc<"presets">["_id"];
        name: string;
        counts: Counts;
      }
    >();
    for (const preset of presets) {
      perPresetById.set(preset._id, {
        presetId: preset._id,
        name: preset.name,
        counts: emptyCounts(),
      });
    }

    // Use the time-sorted type index to keep the number of queries bounded.
    // We scan each event type once and attribute the events to the creator's
    // presets in-memory instead of issuing one query per preset.
    const creatorPresetIds = new Set(presets.map((preset) => preset._id));
    const eventTypes = Object.keys(totals) as EventType[];
    for (const type of eventTypes) {
      const events = await ctx.db
        .query("presetEvents")
        .withIndex("by_type_time", (q) =>
          q.eq("type", type).gte("createdAt", since)
        )
        .collect();

      for (const event of events) {
        if (!creatorPresetIds.has(event.presetId)) {
          continue;
        }

        const bucket = perPresetById.get(event.presetId);
        if (!bucket) {
          continue;
        }

        bucket.counts[event.type] += 1;
        totals[event.type] += 1;
      }
    }

    return {
      userId: args.userId,
      totals,
      perPreset: presets.map((preset) => perPresetById.get(preset._id)!),
      presetCount: presets.length,
    };
  },
});

/**
 * Admin-only overview. Walks events in the last N days and totals by
 * type. Intentionally coarse for the admin dashboard; per-preset drill-in
 * uses `presetSummary` via the admin route.
 */
export const adminOverview = query({
  args: {
    sinceMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const since = args.sinceMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    const counts = emptyCounts();
    const types = Object.keys(counts) as EventType[];
    for (const type of types) {
      const events = await ctx.db
        .query("presetEvents")
        .withIndex("by_type_time", (q) =>
          q.eq("type", type).gte("createdAt", since)
        )
        .collect();
      counts[type] = events.length;
    }
    const pendingReview = await ctx.db
      .query("presets")
      .withIndex("by_review_state", (q) => q.eq("reviewState", "pending-review"))
      .collect();
    const rejected = await ctx.db
      .query("presets")
      .withIndex("by_review_state", (q) => q.eq("reviewState", "rejected"))
      .collect();
    return {
      sinceMs: since,
      counts,
      pendingReviewCount: pendingReview.length,
      rejectedCount: rejected.length,
    };
  },
});
