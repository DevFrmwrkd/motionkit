"use node";

import crypto from "node:crypto";
import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda/client";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Fetches the rendered MP4 from S3 and uploads it to R2 via the
 * motionkit-r2-uploader Worker. Returns the public R2 URL.
 *
 * The Worker authenticates uploads with HMAC-SHA256 over
 * `${method}\n${path}\n${contentLength}` using R2_UPLOAD_SECRET.
 */
async function copyS3MP4ToR2(
  s3Url: string,
  jobId: string,
  uploadUrl: string,
  uploadSecret: string,
  publicBaseUrl: string,
): Promise<{ url: string; bytes: number }> {
  const fetchRes = await fetch(s3Url);
  if (!fetchRes.ok) {
    throw new Error(
      `Failed to fetch rendered MP4 from S3 (${fetchRes.status}): ${s3Url}`,
    );
  }
  const buffer = Buffer.from(await fetchRes.arrayBuffer());
  const bytes = buffer.byteLength;
  const key = `renders/${jobId}.mp4`;
  const path = `/${key}`;

  const signature = crypto
    .createHmac("sha256", uploadSecret)
    .update(`PUT\n${path}\n${bytes}`)
    .digest("hex");

  const putRes = await fetch(`${uploadUrl.replace(/\/$/, "")}${path}`, {
    method: "PUT",
    headers: {
      "content-type": "video/mp4",
      "content-length": String(bytes),
      "x-upload-signature": `sha256=${signature}`,
    },
    body: buffer,
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(
      `R2 uploader rejected upload (${putRes.status}): ${text.slice(0, 200)}`,
    );
  }

  return {
    url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
    bytes,
  };
}

/**
 * Dispatches a render to Remotion Lambda (AWS).
 *
 * Flow:
 *   1. Mark job as "rendering" in Convex.
 *   2. Kick off renderMediaOnLambda — Remotion fans out across many lambda
 *      invocations internally (one per chunk).
 *   3. Poll getRenderProgress until done or failed.
 *   4. Mark job done with the S3 output URL.
 *
 * Required Convex env vars:
 *   REMOTION_AWS_ACCESS_KEY_ID     — IAM user with the Remotion user policy
 *   REMOTION_AWS_SECRET_ACCESS_KEY
 *   REMOTION_AWS_REGION            — e.g. eu-central-1
 *   REMOTION_FUNCTION_NAME         — e.g. remotion-render-4-0-447-mem3008mb-disk2048mb-240sec
 *   REMOTION_SERVE_URL             — https://…s3…/sites/motionkit/index.html
 */
export const dispatchRender = action({
  args: {
    jobId: v.id("renderJobs"),
    bundleUrl: v.string(),
    inputProps: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
    const region = process.env.REMOTION_AWS_REGION;
    const functionName = process.env.REMOTION_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;
    const r2UploadUrl = process.env.R2_UPLOAD_URL;
    const r2UploadSecret = process.env.R2_UPLOAD_SECRET;
    const r2PublicUrl = process.env.R2_PUBLIC_URL;

    if (
      !accessKeyId ||
      !secretAccessKey ||
      !region ||
      !functionName ||
      !serveUrl ||
      !r2UploadUrl ||
      !r2UploadSecret ||
      !r2PublicUrl
    ) {
      const error =
        "Render pipeline not configured. Set REMOTION_AWS_*, REMOTION_FUNCTION_NAME, REMOTION_SERVE_URL, R2_UPLOAD_URL, R2_UPLOAD_SECRET, R2_PUBLIC_URL in Convex env.";
      await ctx.runMutation(internal.renderJobs.markFailed, {
        jobId: args.jobId,
        error,
      });
      throw new Error(error);
    }

    // Remotion client reads creds from process.env.REMOTION_AWS_*.
    // They're already there — just making it explicit they must match.
    process.env.REMOTION_AWS_ACCESS_KEY_ID = accessKeyId;
    process.env.REMOTION_AWS_SECRET_ACCESS_KEY = secretAccessKey;

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
      progress: 5,
      startedAt: Date.now(),
    });

    try {
      const { renderId, bucketName } = await renderMediaOnLambda({
        region: region as Parameters<typeof renderMediaOnLambda>[0]["region"],
        functionName,
        serveUrl,
        composition: compositionId,
        inputProps: parsedProps,
        codec: "h264",
        imageFormat: "jpeg",
        privacy: "public",
        downloadBehavior: { type: "play-in-browser" },
        maxRetries: 1,
      });

      // Poll progress. Remotion typically finishes a 10s clip in <30s.
      // Convex actions time out at 10 minutes; we cap at 8.
      const deadline = Date.now() + 8 * 60 * 1000;
      let lastProgress = 5;
      while (Date.now() < deadline) {
        const progress = await getRenderProgress({
          renderId,
          bucketName,
          functionName,
          region: region as Parameters<typeof getRenderProgress>[0]["region"],
        });

        if (progress.fatalErrorEncountered) {
          throw new Error(
            progress.errors[0]?.message ?? "Lambda render failed"
          );
        }

        if (progress.done) {
          const s3Url = progress.outputFile ?? "";
          if (!s3Url) {
            throw new Error("Lambda reported done but no outputFile present");
          }

          await ctx.runMutation(internal.renderJobs.updateStatus, {
            jobId: args.jobId,
            status: "rendering",
            progress: 95,
          });

          // Copy MP4 to R2 so we serve from zero-egress storage and the
          // Lambda S3 7-day TTL doesn't take it down.
          const r2 = await copyS3MP4ToR2(
            s3Url,
            args.jobId,
            r2UploadUrl,
            r2UploadSecret,
            r2PublicUrl,
          );

          await ctx.runMutation(internal.renderJobs.markDone, {
            jobId: args.jobId,
            outputUrl: r2.url,
            outputSize: r2.bytes,
            completedAt: Date.now(),
            // Long expiry — R2 storage is essentially free at our scale.
            // The S3 copy will expire in 7 days via lifecycle rule.
            expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          });
          return;
        }

        const pct = Math.max(10, Math.round(progress.overallProgress * 100));
        if (pct !== lastProgress) {
          lastProgress = pct;
          await ctx.runMutation(internal.renderJobs.updateStatus, {
            jobId: args.jobId,
            status: "rendering",
            progress: pct,
          });
        }

        await new Promise((r) => setTimeout(r, 1500));
      }

      throw new Error("Lambda render timed out after 8 minutes");
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
