import { internalMutation } from "./_generated/server";

/**
 * One-shot backfill: ensure a platform user exists and stamp its id onto every
 * preset that was seeded without an authorId. Required so the marketplace
 * preview seeder (which passes preset.authorId into enqueueTestRenderInternal)
 * doesn't trip the argument validator on Claude/Gemini/MotionKit seed rows.
 *
 * Run: npx convex run platformUser:ensureAndBackfill
 */
export const ensureAndBackfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    const PLATFORM_EMAIL = "platform@motionkit.internal";

    // Find or create the platform user. Using email as the identity key keeps
    // re-runs idempotent.
    let platform = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), PLATFORM_EMAIL))
      .first();

    if (!platform) {
      const id = await ctx.db.insert("users", {
        email: PLATFORM_EMAIL,
        name: "MotionKit",
      });
      platform = await ctx.db.get(id);
    }

    if (!platform) {
      throw new Error("Failed to create platform user");
    }

    const presets = await ctx.db.query("presets").collect();
    const toPatch = presets.filter((p) => !p.authorId);

    for (const preset of toPatch) {
      await ctx.db.patch(preset._id, { authorId: platform._id });
    }

    return {
      platformUserId: platform._id,
      patched: toPatch.length,
      alreadyOwned: presets.length - toPatch.length,
    };
  },
});
