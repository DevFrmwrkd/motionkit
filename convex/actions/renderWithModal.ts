"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Mock render action — simulates a render pipeline with progress updates.
 *
 * In production this will:
 * 1. Decrypt user's Modal API key
 * 2. POST to Modal with bundleUrl + inputProps
 * 3. Poll for progress / receive webhook
 * 4. Upload output to R2
 *
 * For now it simulates the flow so frontend can wire up end-to-end.
 */
export const dispatchRender = action({
  args: {
    jobId: v.id("renderJobs"),
    bundleUrl: v.string(),
    inputProps: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Mark job as rendering
    await ctx.runMutation(internal.renderJobs.updateStatus, {
      jobId: args.jobId,
      status: "rendering",
      startedAt: Date.now(),
    });

    // 2. Simulate render progress (5 steps over ~5 seconds)
    const steps = [10, 30, 55, 80, 100];
    for (const progress of steps) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await ctx.runMutation(internal.renderJobs.updateStatus, {
        jobId: args.jobId,
        status: "rendering",
        progress,
      });
    }

    // 3. Mark as done with a placeholder output URL
    const mockOutputUrl = `https://motionkit-assets.r2.dev/renders/mock/${args.jobId}.mp4`;
    await ctx.runMutation(internal.renderJobs.markDone, {
      jobId: args.jobId,
      outputUrl: mockOutputUrl,
      outputSize: 2_400_000, // ~2.4 MB mock
      completedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  },
});

/**
 * Placeholder for real Modal integration.
 * Uncomment and implement when Modal API key flow is ready.
 *
 * export const dispatchRenderReal = action({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const keys = await ctx.runQuery(internal.users.getApiKeys, { userId: args.userId });
 *     if (!keys.modalApiKey) throw new Error("No Modal API key configured");
 *
 *     const decryptedKey = await decrypt(keys.modalApiKey, process.env.ENCRYPTION_KEY!);
 *
 *     // POST to Modal API
 *     // Poll for progress
 *     // Upload to R2
 *     // Mark done
 *   },
 * });
 */
