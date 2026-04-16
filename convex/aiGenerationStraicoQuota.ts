/**
 * Quota mutations for the Straico free-tier generation flow.
 *
 * These live in a SEPARATE file from convex/aiGenerationStraico.ts (which
 * has "use node" at the top for the fetch-based HTTP provider) because
 * Convex doesn't allow mutations inside Node-runtime files.
 *
 * Daily limit is 5 successful generations per identity per UTC day.
 *   - Logged-in users: counter on users.dailyGenerations + users.lastGenerationDate
 *   - Anonymous users: separate guestStraicoQuota table keyed by client UUID
 *
 * Refund mutations are called by the dispatch action when generation fails,
 * so the user only loses a daily slot on a SUCCESSFUL completion.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const DAILY_LIMIT = 5;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateClientId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    throw new Error("guestId must be 8–128 characters long");
  }
  if (!/^[a-zA-Z0-9_\-:.]+$/.test(trimmed)) {
    throw new Error("guestId contains invalid characters");
  }
  return trimmed;
}

// ───────────────────── Auth-user quota ───────────────────────────────────

export const consumeUserQuota = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const today = todayKey();
    const sameDay = user.lastGenerationDate === today;
    const currentCount = sameDay ? user.dailyGenerations ?? 0 : 0;

    if (currentCount >= DAILY_LIMIT) {
      return {
        ok: false as const,
        used: currentCount,
        limit: DAILY_LIMIT,
        remaining: 0,
      };
    }

    const nextCount = currentCount + 1;
    await ctx.db.patch(args.userId, {
      dailyGenerations: nextCount,
      lastGenerationDate: today,
    });

    return {
      ok: true as const,
      used: nextCount,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - nextCount,
    };
  },
});

export const refundUserQuota = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    if (user.lastGenerationDate !== todayKey()) return;
    const current = user.dailyGenerations ?? 0;
    if (current <= 0) return;
    await ctx.db.patch(args.userId, { dailyGenerations: current - 1 });
  },
});

// ───────────────────── Guest quota ───────────────────────────────────────

export const consumeGuestQuota = internalMutation({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const clientId = validateClientId(args.clientId);
    const today = todayKey();

    const existing = await ctx.db
      .query("guestStraicoQuota")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .first();

    if (existing && existing.date === today) {
      if (existing.count >= DAILY_LIMIT) {
        return {
          ok: false as const,
          used: existing.count,
          limit: DAILY_LIMIT,
          remaining: 0,
        };
      }
      const nextCount = existing.count + 1;
      await ctx.db.patch(existing._id, {
        count: nextCount,
        updatedAt: Date.now(),
      });
      return {
        ok: true as const,
        used: nextCount,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - nextCount,
      };
    }

    // Different-day row → reset in place. Missing row → insert.
    if (existing) {
      await ctx.db.patch(existing._id, {
        date: today,
        count: 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("guestStraicoQuota", {
        clientId,
        date: today,
        count: 1,
        updatedAt: Date.now(),
      });
    }

    return {
      ok: true as const,
      used: 1,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - 1,
    };
  },
});

export const refundGuestQuota = internalMutation({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const clientId = validateClientId(args.clientId);
    const today = todayKey();
    const existing = await ctx.db
      .query("guestStraicoQuota")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .first();
    if (!existing || existing.date !== today || existing.count <= 0) return;
    await ctx.db.patch(existing._id, {
      count: existing.count - 1,
      updatedAt: Date.now(),
    });
  },
});
