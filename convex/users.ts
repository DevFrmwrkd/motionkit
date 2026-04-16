import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAuthorizedUser, isDemoModeEnabled } from "./lib/authz";
import { encryptApiKey, decryptApiKey, keyHint } from "./lib/keyStorage";
import {
  normalizeOptionalString,
  resolveOpenRouterModel,
  validateOpenRouterModelId,
} from "../shared/aiProviderConfig";

/**
 * Strips every sensitive key from a user doc and replaces each one with a
 * safe-for-client boolean + masked hint. This is what every client-visible
 * user query should return — never the raw API key material, and never the
 * tokenIdentifier (which, combined with the old public createOrUpdateFromAuth
 * mutation, was an account-takeover primitive).
 */
function toClientUser<T extends Record<string, unknown>>(user: T | null) {
  if (!user) return null;

  const {
    modalApiKey,
    geminiApiKey,
    anthropicApiKey,
    openRouterApiKey,
    tokenIdentifier: _tokenIdentifier,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    // Presence flags — the client can tell whether a key is set without
    // ever seeing the value.
    hasModalApiKey: Boolean(modalApiKey),
    hasGeminiApiKey: Boolean(geminiApiKey),
    hasAnthropicApiKey: Boolean(anthropicApiKey),
    hasOpenRouterApiKey: Boolean(openRouterApiKey),
    // Masked hints for Settings UI ("••••" or "••••ABCD" depending on
    // whether the value was encrypted at rest).
    modalApiKeyHint: keyHint(modalApiKey as string | undefined),
    geminiApiKeyHint: keyHint(geminiApiKey as string | undefined),
    anthropicApiKeyHint: keyHint(anthropicApiKey as string | undefined),
    openRouterApiKeyHint: keyHint(openRouterApiKey as string | undefined),
  };
}

/**
 * Get the currently authenticated user.
 * Convex Auth stores the user doc directly in the users table,
 * so we look it up by the auth user id (which is the user doc _id).
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    // IMPORTANT: never return raw API key fields to the client. The client
    // gets booleans + masked hints so it can render "Key set" state in
    // Settings without the key material ever crossing the network.
    return toClientUser(await ctx.db.get(userId));
  },
});

/**
 * Get or create the shared demo user. This is a public mutation because the
 * unauthenticated login page needs to call it, but it refuses to do any work
 * unless ENABLE_DEMO_MODE is set on the Convex deployment — so production
 * callers get an error instead of an unauthenticated user-row factory.
 */
export const getOrCreateDemoUser = mutation({
  args: {},
  handler: async (ctx) => {
    if (!isDemoModeEnabled()) {
      throw new Error("Demo mode is not enabled on this deployment");
    }
    const demoEmail = "demo@motionkit.dev";
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", demoEmail))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      name: "Demo User",
      email: demoEmail,
      avatarUrl: undefined,
      role: "creator",
      plan: "free",
      renderCredits: 10,
      dailyGenerations: 0,
      tokenIdentifier: "demo:demo-user",
      isPublicProfile: true,
      bio: "Demo account for exploring MotionKit",
    });
  },
});

/**
 * Public query consumed by useCurrentUser when demo mode is on. Returns null
 * if the deployment hasn't opted into demo mode, so it can't be used as an
 * unauthenticated account lookup in production.
 */
export const getDemoUser = query({
  args: {},
  handler: async (ctx) => {
    if (!isDemoModeEnabled()) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "demo@motionkit.dev"))
      .first();
    return toClientUser(user);
  },
});

/**
 * Get a user doc by id. Requires the caller to be signed in — this used to
 * be an anonymous query and is no longer: it's the simplest user lookup we
 * have and doesn't need to be open to the world.
 */
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return null;
    return toClientUser(await ctx.db.get(args.id));
  },
});

/**
 * Internal — called from actions like dispatchGeneration and renderWithLambda.
 * Returns DECRYPTED key material. Must never be exposed as a public query.
 *
 * Decryption happens inside the query because the ENCRYPTION_KEY env var is
 * available in the Convex runtime and Web Crypto is deterministic given the
 * same IV + ciphertext, so queries remain cacheable per-user.
 */
export const getApiKeys = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    return {
      modalApiKey: await decryptApiKey(user.modalApiKey),
      geminiApiKey: await decryptApiKey(user.geminiApiKey),
      anthropicApiKey: await decryptApiKey(user.anthropicApiKey),
      openRouterApiKey: await decryptApiKey(user.openRouterApiKey),
      // Model id is stored in plaintext — not a secret.
      openRouterModel: user.openRouterModel ?? undefined,
    };
  },
});

/**
 * Internal — returns the raw user doc including any stored key ciphertext.
 * Use only for server-side flows that need the full document and will
 * decrypt themselves. Never expose directly.
 */
export const getPrivateById = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Update the caller's BYOK API keys. Each field is one of:
 *   - undefined  → leave existing value alone
 *   - "" (empty) → CLEAR the key (user removed it)
 *   - non-empty  → encrypt with ENCRYPTION_KEY and store as "enc:..."
 *
 * Keys are never echoed back to the client — the mutation has no return
 * value. The client learns the new state via the next getCurrentUser query.
 */
export const updateApiKeys = mutation({
  args: {
    userId: v.id("users"),
    modalApiKey: v.optional(v.string()),
    geminiApiKey: v.optional(v.string()),
    anthropicApiKey: v.optional(v.string()),
    openRouterApiKey: v.optional(v.string()),
    // Model id is plaintext and can be updated independently of the key.
    openRouterModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, openRouterModel, ...keys } = args;
    await requireAuthorizedUser(ctx, userId);

    const updates: Record<string, string | undefined> = {};
    for (const [field, value] of Object.entries(keys)) {
      if (value === undefined) continue;
      const normalizedValue = normalizeOptionalString(value);
      if (!normalizedValue) {
        // Explicit clear.
        updates[field] = undefined;
        continue;
      }
      // All BYOK keys we accept here are secrets — encrypt at rest.
      updates[field] = await encryptApiKey(normalizedValue);
    }
    if (openRouterModel !== undefined) {
      const normalizedModel = normalizeOptionalString(openRouterModel);
      if (!normalizedModel) {
        // Explicit clear.
        updates.openRouterModel = undefined;
      } else {
        // Throws on malformed id — caught by Convex and surfaced to client.
        updates.openRouterModel = validateOpenRouterModelId(normalizedModel);
      }
    }
    await ctx.db.patch(userId, updates);
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;
    await requireAuthorizedUser(ctx, userId);
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(userId, updates);
  },
});

export const getPublicProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    if (user.isPublicProfile !== true) return null;

    const presets = await ctx.db
      .query("presets")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();

    const publishedPresets = presets.filter(
      (p) => p.status === "published" && p.isPublic === true
    );
    const totalDownloads = publishedPresets.reduce(
      (sum, p) => sum + (p.downloads ?? 0),
      0
    );
    const totalVotes = publishedPresets.reduce(
      (sum, p) => sum + (p.voteScore ?? 0),
      0
    );

    return {
      _id: user._id,
      name: user.name,
      avatarUrl: user.avatarUrl ?? user.image,
      bio: user.bio,
      website: user.website,
      socialLinks: user.socialLinks,
      role: user.role,
      presetCount: publishedPresets.length,
      totalDownloads,
      totalVotes,
      presets: publishedPresets,
    };
  },
});

/**
 * One-off internal mutation to seed a user's OpenRouter credentials. This is
 * internal so it can only be invoked via `npx convex run`, never from a
 * client. Looks up the user by email, creates a minimal row if none exists
 * (so the demo account is usable even when ENABLE_DEMO_MODE is false), and
 * patches the encrypted key + plaintext model id.
 *
 * Usage:
 *   npx convex run --prod users:seedOpenRouterCredentials \
 *     '{"email":"demo@motionkit.dev","apiKey":"sk-or-v1-...","model":"z-ai/glm-5.1"}'
 */
// seed-force-rebuild-2026-04-11T15-58
export const seedOpenRouterCredentials = internalMutation({
  args: {
    email: v.string(),
    apiKey: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedApiKey = normalizeOptionalString(args.apiKey);
    const normalizedModel = resolveOpenRouterModel(args.model);

    if (!normalizedApiKey) {
      throw new Error("OpenRouter API key cannot be blank");
    }

    if (!normalizedModel) {
      throw new Error("OpenRouter model id cannot be blank");
    }

    const encrypted = await encryptApiKey(normalizedApiKey);

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        openRouterApiKey: encrypted,
        openRouterModel: normalizedModel,
      });
      return { ok: true, userId: existing._id, created: false };
    }

    const userId = await ctx.db.insert("users", {
      name: args.email.split("@")[0],
      email: args.email,
      avatarUrl: undefined,
      role: "user",
      plan: "free",
      renderCredits: 10,
      dailyGenerations: 0,
      tokenIdentifier: `seed:${args.email}`,
      isPublicProfile: false,
      bio: "Seeded account for OpenRouter testing",
      openRouterApiKey: encrypted,
      openRouterModel: normalizedModel,
    });
    return { ok: true, userId, created: true };
  },
});
