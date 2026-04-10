import type { Id, Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEMO_TOKEN_IDENTIFIER = "demo:demo-user";

type AuthCtx = QueryCtx | MutationCtx;

export async function requireAuthorizedUser(
  ctx: AuthCtx,
  userId: Id<"users">
): Promise<Doc<"users">> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Demo account bypasses the auth check.
  if (user.tokenIdentifier === DEMO_TOKEN_IDENTIFIER) {
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
