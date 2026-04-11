import type { Id, Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEMO_TOKEN_IDENTIFIER = "demo:demo-user";

/**
 * Demo mode is a global bypass for the typical auth checks so the public
 * /workstation can be explored without sign-in. It MUST be explicitly enabled
 * via env var — otherwise any visitor to production would be able to act as
 * the shared demo user on any mutation that takes its userId.
 */
export function isDemoModeEnabled(): boolean {
  return process.env.ENABLE_DEMO_MODE === "true";
}

export const DEMO_TOKEN_IDENTIFIER_PUBLIC = DEMO_TOKEN_IDENTIFIER;

type AuthCtx = QueryCtx | MutationCtx;

/**
 * Returns the authenticated user's document, or throws if no one is signed in.
 * Use for server handlers that need to know "who is calling" independent of
 * any userId arg the client might send (storage upload helpers, etc.).
 */
export async function requireSignedInUser(
  ctx: AuthCtx
): Promise<Doc<"users">> {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) {
    throw new Error("Sign in required");
  }
  const user = await ctx.db.get(authUserId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

/**
 * Action-context version: actions don't have ctx.db, so they can't load the
 * user doc directly. This returns just the auth user id — callers use it to
 * authorize against a record they load via ctx.runQuery.
 *
 * Pattern inside an action:
 *   const authUserId = await requireAuthUserIdFromAction(ctx);
 *   const record = await ctx.runQuery(internal.x.getInternal, { id: args.id });
 *   if (!record || record.userId !== authUserId) throw new Error("...");
 */
export async function requireAuthUserIdFromAction(
  ctx: ActionCtx
): Promise<Id<"users">> {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) {
    throw new Error("Sign in required");
  }
  return authUserId;
}

export async function requireAuthorizedUser(
  ctx: AuthCtx,
  userId: Id<"users">
): Promise<Doc<"users">> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Demo account bypasses the auth check, but ONLY when demo mode is explicitly
  // enabled via env. Otherwise anyone who learns the demo user id could forge
  // "authorized" calls as that account.
  if (user.tokenIdentifier === DEMO_TOKEN_IDENTIFIER && isDemoModeEnabled()) {
    return user;
  }

  // Convex Auth: the authenticated user's _id IS the auth id.
  const authUserId = await getAuthUserId(ctx);

  if (!authUserId) {
    throw new Error("Sign in required");
  }

  if (authUserId !== userId) {
    throw new Error("You do not have access to this resource");
  }

  return user;
}

export function canAccessPreset(
  preset: Doc<"presets">,
  viewerId?: Id<"users"> | null
) {
  return (
    (preset.isPublic && preset.status === "published") ||
    (!!viewerId && preset.authorId === viewerId)
  );
}

export function filterVisiblePresets(
  presets: Doc<"presets">[],
  viewerId?: Id<"users"> | null
) {
  return presets.filter((preset) => canAccessPreset(preset, viewerId));
}

// ─── Admin / moderation helpers (Phase 2 / WS-7) ──────────────

/**
 * True if the user has the admin role. Admin is the only role with access
 * to the review queue, force-edit, and audit log viewer. Creators and
 * users get 403 on any admin endpoint.
 */
export function isAdmin(user: Doc<"users"> | null | undefined): boolean {
  return !!user && user.role === "admin";
}

export function isCreator(user: Doc<"users"> | null | undefined): boolean {
  return !!user && (user.role === "creator" || user.role === "admin");
}

/**
 * Query/mutation version: throw if the caller is not an admin. Use inside
 * admin mutations and queries. Returns the admin user doc on success.
 */
export async function requireAdmin(ctx: AuthCtx): Promise<Doc<"users">> {
  const user = await requireSignedInUser(ctx);
  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }
  return user;
}

/**
 * Action version: throw if the caller is not an admin. Loads the user doc
 * via ctx.runQuery because actions don't have ctx.db.
 */
export async function requireAdminFromAction(
  ctx: ActionCtx,
  getUserById: (id: Id<"users">) => Promise<Doc<"users"> | null>
): Promise<Doc<"users">> {
  const authUserId = await requireAuthUserIdFromAction(ctx);
  const user = await getUserById(authUserId);
  if (!user) throw new Error("User not found");
  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }
  return user;
}
