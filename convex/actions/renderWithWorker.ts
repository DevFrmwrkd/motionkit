"use node";

import crypto from "node:crypto";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Dispatches a render to the self-hosted Hetzner render worker.
 *
 * Flow:
 *   1. Mark job as "rendering" in Convex.
 *   2. POST signed request to worker (HMAC-SHA256 body signature).
 *   3. Worker enqueues, renders with @remotion/renderer, writes MP4 to disk,
 *      and returns { outputUrl, sizeBytes, durationMs }.
 *   4. Mark job as "done" with the output URL, OR "failed" with error.
 *
 * The worker enforces max concurrency internally (p-queue). Convex actions
 * have a 10-min timeout, so this synchronous blocking flow is safe for any
 * reasonable composition length (10s videos render in ~20-30s).
 *
 * Required Convex env vars:
 *   RENDER_WORKER_URL    — e.g. https://render.motionkit.dev
 *   RENDER_WORKER_SECRET — shared HMAC secret (set on worker too)
 */
export const dispatchRender = action({
  args: {
    jobId: v.id("renderJobs"),
    bundleUrl: v.string(),
    inputProps: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workerUrl = process.env.RENDER_WORKER_URL;
    const workerSecret = process.env.RENDER_WORKER_SECRET;

    if (!workerUrl || !workerSecret) {
      const error =
        "Render worker not configured. Set RENDER_WORKER_URL and RENDER_WORKER_SECRET in Convex env.";
      await ctx.runMutation(internal.renderJobs.markFailed, {
        jobId: args.jobId,
        error,
      });
      throw new Error(error);
    }

    // Derive composition id from bundleUrl like "local://presets/ClaudeGradientWave".
    const compositionId = args.bundleUrl.split("/").pop();
    if (!compositionId) {
      const error = `Invalid bundleUrl: ${args.bundleUrl}`;
      await ctx.runMutation(internal.renderJobs.markFailed, {
        jobId: args.jobId,
        error,
      });
      throw new Error(error);
    }

    let parsedProps: Record<string, unknown>;
    try {
      parsedProps = JSON.parse(args.inputProps) as Record<string, unknown>;
    } catch {
      const error = "inputProps is not valid JSON";
      await ctx.runMutation(internal.renderJobs.markFailed, {
        jobId: args.jobId,
        error,
      });
      throw new Error(error);
    }

    await ctx.runMutation(internal.renderJobs.updateStatus, {
      jobId: args.jobId,
      status: "rendering",
      progress: 10,
      startedAt: Date.now(),
    });

    const body = JSON.stringify({
      jobId: args.jobId,
      compositionId,
      inputProps: parsedProps,
    });

    const signature = crypto
      .createHmac("sha256", workerSecret)
      .update(body)
      .digest("hex");

    try {
      const res = await fetch(`${workerUrl.replace(/\/$/, "")}/render`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-worker-signature": `sha256=${signature}`,
        },
        body,
      });

      const text = await res.text();
      let payload: {
        ok?: boolean;
        outputUrl?: string;
        sizeBytes?: number;
        durationMs?: number;
        error?: string;
      };
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(
          `Worker returned non-JSON response (${res.status}): ${text.slice(0, 200)}`
        );
      }

      if (!res.ok || !payload.ok || !payload.outputUrl) {
        throw new Error(
          payload.error ?? `Worker responded with status ${res.status}`
        );
      }

      await ctx.runMutation(internal.renderJobs.markDone, {
        jobId: args.jobId,
        outputUrl: payload.outputUrl,
        outputSize: payload.sizeBytes,
        completedAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed";
      await ctx.runMutation(internal.renderJobs.markFailed, {
        jobId: args.jobId,
        error: message,
      });
      throw err;
    }
  },
});
