/**
 * Stripe billing (Phase 2 / WS-6).
 *
 * This module is the server boundary with Stripe:
 *   - `createCheckoutSession` creates a Checkout Session for a paid preset
 *   - `onCheckoutComplete` is the HTTP webhook handler that Stripe calls
 *     when a session succeeds; it verifies the signature and hands off to
 *     `licenses.grantInternal` to create the row.
 *   - `recordUsage` logs render seconds + AI tokens to the `usageMeters`
 *     table for usage-based pricing. Called from render actions and the
 *     AI generation path.
 *
 * The whole module refuses to run anything that touches real money unless
 * `ENABLE_MONETIZATION=true` and `STRIPE_SECRET_KEY` are both present. The
 * query/read surface is always callable — the write surface is gated.
 *
 * No Stripe SDK import at the top level. We call the Stripe REST API with
 * `fetch` so this file stays compatible with both the Convex V8 runtime
 * (for queries/mutations) and the Node action runtime (for the webhook).
 */

import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { licenseValidator } from "./schema";
import { requireSignedInUser, requireAuthUserIdFromAction } from "./lib/authz";
import { getPresetPricing, isMonetizationEnabled } from "./licenses";

// ─── Stripe HTTP helpers ───────────────────────────────────

function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY not configured on the Convex deployment. " +
        "Set it before enabling monetization."
    );
  }
  return key;
}

function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured.");
  }
  return secret;
}

function getAppUrl(): string {
  const url = process.env.SITE_URL ?? process.env.APP_URL;
  if (!url) {
    throw new Error(
      "SITE_URL is not configured on the Convex deployment. " +
        "Set it to the production app URL before calling billing actions."
    );
  }
  return url.replace(/\/$/, "");
}

/**
 * Call the Stripe REST API. We use form-encoded POST bodies instead of
 * the SDK to keep the Convex runtime happy about third-party deps.
 */
async function stripeFetch(
  path: string,
  body: Record<string, string>
): Promise<Record<string, unknown>> {
  const key = getStripeKey();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `Stripe returned non-JSON (${res.status}): ${text.slice(0, 200)}`
    );
  }
  if (!res.ok) {
    const err = (parsed as { error?: { message?: string } }).error;
    throw new Error(err?.message ?? `Stripe ${path} failed (${res.status})`);
  }
  return parsed as Record<string, unknown>;
}

// ─── createCheckoutSession action ──────────────────────────

/**
 * Create a Stripe Checkout Session for a paid preset. Returns the URL the
 * client should redirect to. Charges the buyer in their local currency
 * via `price_data.currency = "usd"` — configurable in Stripe dashboard
 * later without a code change.
 */
export const createCheckoutSession = action({
  args: {
    presetId: v.id("presets"),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    if (!isMonetizationEnabled()) {
      throw new Error(
        "Monetization is disabled. Set ENABLE_MONETIZATION=true to accept payments."
      );
    }
    const authUserId = await requireAuthUserIdFromAction(ctx);
    const preset = await ctx.runQuery(
      internal.presetReview.getPresetInternal,
      { presetId: args.presetId }
    );
    if (!preset) throw new Error("Preset not found");
    const pricing = getPresetPricing(preset);
    if (preset.authorId === authUserId) {
      throw new Error("You already own this preset");
    }
    const price = pricing.priceCents;
    if (pricing.license !== "free" && price <= 0) {
      throw new Error("Paid preset is missing a valid price");
    }
    if (price <= 0) {
      throw new Error("Preset is free — no checkout required");
    }

    const appUrl = getAppUrl();
    const session = await stripeFetch("/checkout/sessions", {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(price),
      "line_items[0][price_data][product_data][name]": preset.name,
      "line_items[0][price_data][product_data][description]":
        preset.description ?? "MotionKit preset",
      "line_items[0][quantity]": "1",
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/p/${args.presetId}?checkout=cancelled`,
      "metadata[presetId]": args.presetId,
      "metadata[userId]": authUserId,
      "metadata[license]": pricing.license,
    });

    const url = session["url"];
    if (typeof url !== "string") {
      throw new Error("Stripe did not return a checkout URL");
    }
    return { url };
  },
});

// ─── Webhook: Checkout session completed ───────────────────

/**
 * HTTP webhook handler. Stripe POSTs to `/stripe/webhook` (wired via
 * convex/http.ts — creator adds the route pointing here). This action:
 *   1. Verifies the Stripe signature using STRIPE_WEBHOOK_SECRET
 *   2. Parses the `checkout.session.completed` payload
 *   3. Calls `licenses.grantInternal` to create the grant
 *
 * The signature check uses HMAC-SHA256 with the webhook secret and is
 * constant-time compared to prevent timing attacks.
 */
export const onCheckoutCompleted = action({
  args: {
    rawBody: v.string(),
    stripeSignatureHeader: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    if (!isMonetizationEnabled()) {
      return { ok: true };
    }
    const secret = getStripeWebhookSecret();
    const verified = await verifyStripeSignature(
      args.rawBody,
      args.stripeSignatureHeader,
      secret
    );
    if (!verified) {
      throw new Error("Stripe signature verification failed");
    }
    type StripeEvent = {
      type?: string;
      data?: {
        object?: {
          id?: string;
          payment_intent?: string;
          metadata?: Record<string, string>;
          amount_total?: number;
        };
      };
    };
    const event = JSON.parse(args.rawBody) as StripeEvent;
    if (event.type !== "checkout.session.completed") {
      return { ok: true };
    }
    const obj = event.data?.object ?? {};
    const presetId = obj.metadata?.presetId;
    const userId = obj.metadata?.userId;
    const license = (obj.metadata?.license ?? "paid-personal") as
      NonNullable<Doc<"presets">["license"]>;
    const priceCents = obj.amount_total ?? 0;
    if (!presetId || !userId) {
      throw new Error("Checkout session missing presetId/userId metadata");
    }
    await ctx.runMutation(internal.licenses.grantInternal, {
      userId: userId as Doc<"users">["_id"],
      presetId: presetId as Doc<"presets">["_id"],
      license,
      priceCents,
      stripeChargeId: obj.payment_intent,
      stripeCheckoutSessionId: obj.id,
    });
    return { ok: true };
  },
});

/**
 * Stripe signature header format: `t=TIMESTAMP,v1=SIG,v1=ALT_SIG…`
 * We compute HMAC-SHA256 over `TIMESTAMP.RAW_BODY` with the webhook
 * secret, then constant-time compare against every `v1=` signature on
 * the header.
 *
 * Replay protection: reject anything whose `t=` timestamp is more than
 * `STRIPE_WEBHOOK_TOLERANCE_SECONDS` (default 300s = 5 minutes) away
 * from the current server clock. Matches Stripe's own reference
 * implementation — anything older is a captured payload being replayed.
 */
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string
): Promise<boolean> {
  const parts = header.split(",").map((p) => p.trim());
  let timestamp = "";
  const sigs: string[] = [];
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq);
    const v = p.slice(eq + 1);
    if (k === "t") timestamp = v;
    else if (k === "v1") sigs.push(v);
  }
  if (!timestamp || sigs.length === 0) return false;

  // Replay window check. A valid payload whose timestamp is outside the
  // tolerance window is treated as hostile — reject without even running
  // the HMAC so a timing attacker can't distinguish "bad signature" from
  // "stale timestamp".
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsNum) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const bytes = new Uint8Array(sigBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
  }
  return sigs.some((s) => constantTimeEqualHex(s, hex));
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Usage meters ──────────────────────────────────────────

/**
 * Record render seconds / AI tokens for the billing period. Upserts on
 * (userId, period). Period is the YYYY-MM string for "this month" at
 * call time.
 */
export const recordUsageInternal = internalMutation({
  args: {
    userId: v.id("users"),
    renderSeconds: v.optional(v.number()),
    renderCount: v.optional(v.number()),
    aiTokens: v.optional(v.number()),
    aiGenerationCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const existing = await ctx.db
      .query("usageMeters")
      .withIndex("by_user_period", (q) =>
        q.eq("userId", args.userId).eq("period", period)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        renderSeconds:
          (existing.renderSeconds ?? 0) + (args.renderSeconds ?? 0),
        renderCount: (existing.renderCount ?? 0) + (args.renderCount ?? 0),
        aiTokens: (existing.aiTokens ?? 0) + (args.aiTokens ?? 0),
        aiGenerationCount:
          (existing.aiGenerationCount ?? 0) + (args.aiGenerationCount ?? 0),
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("usageMeters", {
      userId: args.userId,
      period,
      renderSeconds: args.renderSeconds ?? 0,
      renderCount: args.renderCount ?? 0,
      aiTokens: args.aiTokens ?? 0,
      aiGenerationCount: args.aiGenerationCount ?? 0,
      updatedAt: Date.now(),
    });
  },
});

export const myUsageThisPeriod = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    if (caller._id !== args.userId) {
      throw new Error("You can only view your own usage meters");
    }
    const now = new Date();
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const row = await ctx.db
      .query("usageMeters")
      .withIndex("by_user_period", (q) =>
        q.eq("userId", args.userId).eq("period", period)
      )
      .first();
    if (!row) {
      return {
        period,
        renderSeconds: 0,
        renderCount: 0,
        aiTokens: 0,
        aiGenerationCount: 0,
      };
    }
    return row;
  },
});

/**
 * Author-side: amount the creator has earned on a preset. Sum of non-
 * revoked grants' priceCents minus a configurable platform fee. For the
 * MVP we show gross revenue here; payouts with Stripe Connect land later.
 */
export const earningsForPreset = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) return null;
    if (preset.authorId !== caller._id) {
      throw new Error("You can only view earnings for presets you own");
    }
    const grants = await ctx.db
      .query("licenseGrants")
      .withIndex("by_preset", (q) => q.eq("presetId", args.presetId))
      .collect();
    const active = grants.filter((g) => !g.revokedAt);
    const grossCents = active.reduce((acc, g) => acc + g.priceCents, 0);
    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS ?? 2000);
    const feeCents = Math.round((grossCents * platformFeeBps) / 10_000);
    const netCents = grossCents - feeCents;
    return {
      grantCount: active.length,
      grossCents,
      feeCents,
      netCents,
      platformFeeBps,
    };
  },
});

// ─── Free grant path (monetization-independent) ────────────

/**
 * User-initiated "claim free preset" mutation. Free presets don't need
 * Stripe and don't need ENABLE_MONETIZATION — the grant row is still
 * useful as an audit trail of who downloaded what.
 */
export const claimFreePreset = mutation({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const caller = await requireSignedInUser(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    const license = preset.license ?? "free";
    if (license !== "free" && license !== "commercial-free") {
      throw new Error("This preset is not free — use checkout instead");
    }
    const existing = await ctx.db
      .query("licenseGrants")
      .withIndex("by_user_preset", (q) =>
        q.eq("userId", caller._id).eq("presetId", args.presetId)
      )
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("licenseGrants", {
      userId: caller._id,
      presetId: args.presetId,
      license,
      priceCents: 0,
      grantedAt: Date.now(),
    });
  },
});

// Re-export for parallel imports.
export { licenseValidator };
