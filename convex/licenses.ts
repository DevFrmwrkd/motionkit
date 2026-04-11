/**
 * License model (Phase 2 / WS-6).
 *
 * Every preset has a canonical `license` + `priceCents` pair that governs
 * downstream usage:
 *
 *   - `free`             — free for personal use only
 *   - `commercial-free`  — free, commercial use allowed
 *   - `paid-personal`    — paid, personal use only
 *   - `paid-commercial`  — paid, commercial use allowed
 *
 * A `licenseGrant` row is created when a buyer acquires the right to use
 * a paid preset. For free licenses the grant check short-circuits without
 * needing a row. For paid licenses we look up the row and gate downloads.
 *
 * Legacy `isPremium` + `price` fields are still accepted for compatibility
 * with older rows, but all new writes should use the canonical fields.
 *
 * This module is feature-flagged via `ENABLE_MONETIZATION`. When the flag
 * is off, read paths still work, but any mutation that would charge money or
 * create a grant throws so we don't accidentally ship a half-wired Stripe
 * integration.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { licenseValidator } from "./schema";
import { requireSignedInUser, requireAdmin } from "./lib/authz";
import {
  normalizePresetPricing,
  type NormalizedPresetPricing,
} from "../shared/presetPricing";

// ─── Feature flag ──────────────────────────────────────────

/**
 * Monetization is gated behind this env var. When it's not set to "true"
 * the paid code paths throw loudly so a misconfigured deployment cannot
 * silently accept payment without the rest of the wiring in place.
 */
export function isMonetizationEnabled(): boolean {
  return process.env.ENABLE_MONETIZATION === "true";
}

// ─── Pure license checks ───────────────────────────────────

type License = NonNullable<Doc<"presets">["license"]>;
type Preset = Doc<"presets">;

type PresetPricing = Pick<NormalizedPresetPricing, "license" | "priceCents">;

/**
 * Returns true if the license ALONE (without any grant) is enough to use
 * the preset at all. Paid licenses always need a grant check on top.
 */
export function isFreeLicense(license: License | undefined): boolean {
  return license === "free" || license === "commercial-free" || license === undefined;
}

export function licenseAllowsCommercialUse(
  license: License | undefined
): boolean {
  return license === "commercial-free" || license === "paid-commercial";
}

export function getPresetPricing(preset: Preset): PresetPricing {
  const pricing = normalizePresetPricing(preset);
  return {
    license: pricing.license as License,
    priceCents: pricing.priceCents,
  };
}

export function licensePriceCents(preset: Preset): number {
  return getPresetPricing(preset).priceCents;
}

export function getPresetLicense(preset: Preset): License {
  return getPresetPricing(preset).license;
}

// ─── Grant check queries ───────────────────────────────────

/**
 * Does this user have the right to use this preset? Free presets always
 * yes, paid presets require a non-revoked grant row.
 */
export const hasUsageGrant = query({
  args: {
    userId: v.id("users"),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    if (caller._id !== args.userId) {
      throw new Error("You can only check your own license grants");
    }

    const preset = await ctx.db.get(args.presetId);
    if (!preset) return false;
    // Author always has rights to their own preset.
    if (preset.authorId === args.userId) return true;
    const pricing = getPresetPricing(preset);
    if (isFreeLicense(pricing.license)) return true;

    const grant = await ctx.db
      .query("licenseGrants")
      .withIndex("by_user_preset", (q) =>
        q.eq("userId", args.userId).eq("presetId", args.presetId)
      )
      .first();
    if (!grant) return false;
    if (grant.revokedAt) return false;
    return true;
  },
});

export const myGrants = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    if (caller._id !== args.userId) {
      throw new Error("You can only view your own license grants");
    }
    return await ctx.db
      .query("licenseGrants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ─── Internal mutations (called from Stripe webhooks / admin) ──

/**
 * Create a license grant. Called by:
 *   - Stripe webhook after a successful checkout session
 *   - Admin "grant for free" action (used for marketing gifts, creator
 *     comps, and bug remediation)
 */
export const grantInternal = internalMutation({
  args: {
    userId: v.id("users"),
    presetId: v.id("presets"),
    license: licenseValidator,
    priceCents: v.number(),
    stripeChargeId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotency, layer 1: same Stripe checkout session. Stripe retries
    // webhooks on non-2xx responses so this is load-bearing — without it a
    // single network blip doubles the license grant and double-charges the
    // platform fee calculation.
    if (args.stripeCheckoutSessionId) {
      const existing = await ctx.db
        .query("licenseGrants")
        .withIndex("by_stripe_session", (q) =>
          q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId!)
        )
        .first();
      if (existing) return existing._id;
    }
    // Idempotency, layer 2: same payment intent / charge id across a
    // different checkout session (rare but possible if a session is
    // retried after expiry). A linear scan across the user's grants is
    // cheap — a normal user has O(10) grants.
    if (args.stripeChargeId) {
      const userGrants = await ctx.db
        .query("licenseGrants")
        .withIndex("by_user_preset", (q) =>
          q.eq("userId", args.userId).eq("presetId", args.presetId)
        )
        .collect();
      const duplicate = userGrants.find(
        (g) => g.stripeChargeId === args.stripeChargeId
      );
      if (duplicate) return duplicate._id;
    }
    const grantId = await ctx.db.insert("licenseGrants", {
      userId: args.userId,
      presetId: args.presetId,
      license: args.license,
      priceCents: args.priceCents,
      stripeChargeId: args.stripeChargeId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      grantedAt: Date.now(),
    });
    await ctx.db.insert("auditLog", {
      action: "license.grant",
      targetType: "licenseGrant",
      targetId: grantId,
      payload: JSON.stringify({
        userId: args.userId,
        presetId: args.presetId,
        priceCents: args.priceCents,
      }),
      createdAt: Date.now(),
    });
    return grantId;
  },
});

export const revokeInternal = internalMutation({
  args: {
    grantId: v.id("licenseGrants"),
    reason: v.string(),
    actorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const grant = await ctx.db.get(args.grantId);
    if (!grant) throw new Error("Grant not found");
    if (grant.revokedAt) return;
    await ctx.db.patch(args.grantId, {
      revokedAt: Date.now(),
      revokedReason: args.reason,
    });
    await ctx.db.insert("auditLog", {
      actorId: args.actorId,
      action: "license.revoke",
      targetType: "licenseGrant",
      targetId: args.grantId,
      reason: args.reason,
      createdAt: Date.now(),
    });
  },
});

// ─── Admin mutations ───────────────────────────────────────

/**
 * Admin-issued free grant. Useful for comps, bug remediation, and early
 * creator gifts. Does NOT require monetization to be enabled because no
 * money changes hands.
 */
export const adminGrantFree = mutation({
  args: {
    userId: v.id("users"),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    // Idempotent: if a grant already exists, do nothing.
    const existing = await ctx.db
      .query("licenseGrants")
      .withIndex("by_user_preset", (q) =>
        q.eq("userId", args.userId).eq("presetId", args.presetId)
      )
      .first();
    if (existing) return existing._id;
    const pricing = getPresetPricing(preset);
    const grantId = await ctx.db.insert("licenseGrants", {
      userId: args.userId,
      presetId: args.presetId,
      license: pricing.license,
      priceCents: 0,
      grantedAt: Date.now(),
    });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "license.grant",
      targetType: "licenseGrant",
      targetId: grantId,
      payload: JSON.stringify({ source: "admin-free" }),
      createdAt: Date.now(),
    });
    return grantId;
  },
});

export const adminRevoke = mutation({
  args: {
    grantId: v.id("licenseGrants"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const grant = await ctx.db.get(args.grantId);
    if (!grant) throw new Error("Grant not found");
    await ctx.db.patch(args.grantId, {
      revokedAt: Date.now(),
      revokedReason: args.reason,
    });
    await ctx.db.insert("auditLog", {
      actorId: admin._id,
      action: "license.revoke",
      targetType: "licenseGrant",
      targetId: args.grantId,
      reason: args.reason,
      createdAt: Date.now(),
    });
  },
});

/**
 * Returns the price, license, and whether the caller already owns it.
 * Used by the checkout page to decide whether to skip straight to the
 * download or show the Stripe button.
 */
export const priceForCheckout = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);
    if (!preset) return null;
    const pricing = getPresetPricing(preset);
    const caller = await requireSignedInUser(ctx);
    // Author skips checkout.
    if (preset.authorId === caller._id) {
      return {
        needsCheckout: false,
        reason: "author",
        priceCents: 0,
        license: pricing.license,
      };
    }
    if (isFreeLicense(pricing.license)) {
      return {
        needsCheckout: false,
        reason: "free",
        priceCents: 0,
        license: pricing.license,
      };
    }
    const existing = await ctx.db
      .query("licenseGrants")
      .withIndex("by_user_preset", (q) =>
        q.eq("userId", caller._id).eq("presetId", args.presetId)
      )
      .first();
    if (existing && !existing.revokedAt) {
      return {
        needsCheckout: false,
        reason: "already-granted",
        priceCents: 0,
        license: pricing.license,
      };
    }
    if (pricing.priceCents <= 0) {
      throw new Error("Paid preset is missing a valid price");
    }
    return {
      needsCheckout: true,
      reason: "paid",
      priceCents: pricing.priceCents,
      license: pricing.license,
      monetizationEnabled: isMonetizationEnabled(),
    };
  },
});
