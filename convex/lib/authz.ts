import type { Id, Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

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

  if (user.tokenIdentifier === DEMO_TOKEN_IDENTIFIER) {
    return user;
  }

  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Sign in required");
  }

  if (!user.tokenIdentifier || user.tokenIdentifier !== identity.tokenIdentifier) {
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
