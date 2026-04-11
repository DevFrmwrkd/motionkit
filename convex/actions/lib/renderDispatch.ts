"use node";

import crypto from "node:crypto";
import {
  getRenderProgress,
  renderMediaOnLambda,
} from "@remotion/lambda/client";
import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  compositionIdFromBundleUrl,
  isRenderableComposition,
} from "../../lib/renderableCompositions";
import { RENDERABLE_COMPOSITION_IDS } from "../../../shared/renderableCompositionIds";

async function loadAndAuthorizeJob(
  ctx: ActionCtx,
  jobId: Id<"renderJobs">,
  authUserId?: Id<"users">
): Promise<Doc<"renderJobs">> {
  const job = await ctx.runQuery(internal.renderJobs.getInternal, { jobId });
  if (!job) throw new Error("Render job not found");
  if (authUserId && job.userId !== authUserId) {
    throw new Error("You do not have access to this render job");
  }
  // Guard against double-dispatch. A manual retry or a scheduler replay can
  // kick this action off twice for the same job — without this check both
  // runs would launch a Lambda render (double-billing + duplicate output).
  // Only "queued" jobs are allowed to start; anything else means some other
  // invocation has already taken ownership.
  if (job.status !== "queued") {
    throw new Error(
      `Render job ${jobId} is already in status "${job.status}" and cannot be dispatched again`
    );
  }
  return job;
}

async function markFailed(
  ctx: ActionCtx,
  jobId: Id<"renderJobs">,
  error: string
) {
  await ctx.runMutation(internal.renderJobs.markFailed, {
    jobId,
    error,
  });
}

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

function parseJobPayload(job: Doc<"renderJobs">) {
  const compositionId = compositionIdFromBundleUrl(job.bundleUrl);
  if (!compositionId) {
    throw new Error(`Invalid bundleUrl: ${job.bundleUrl}`);
  }
  if (!isRenderableComposition(compositionId)) {
    throw new Error(
      `This preset cannot be rendered yet. Its source code exists but is not ` +
        `part of the deployed Remotion bundle. Rendering only supports the built-in ` +
        `presets: ${RENDERABLE_COMPOSITION_IDS.join(", ")}. ` +
        `(Dynamic source-code rendering is on the roadmap.)`
    );
  }

  let parsedProps: Record<string, unknown>;
  try {
    parsedProps = JSON.parse(job.inputProps) as Record<string, unknown>;
  } catch {
    throw new Error("inputProps is not valid JSON");
  }

  return { compositionId, parsedProps };
}

export async function dispatchLambdaJob(
  ctx: ActionCtx,
  jobId: Id<"renderJobs">,
  authUserId?: Id<"users">
): Promise<void> {
  const job = await loadAndAuthorizeJob(ctx, jobId, authUserId);

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
    await markFailed(ctx, jobId, error);
    throw new Error(error);
  }

  process.env.REMOTION_AWS_ACCESS_KEY_ID = accessKeyId;
  process.env.REMOTION_AWS_SECRET_ACCESS_KEY = secretAccessKey;

  let payload: { compositionId: string; parsedProps: Record<string, unknown> };
  try {
    payload = parseJobPayload(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render failed";
    await markFailed(ctx, jobId, message);
    throw error;
  }

  await ctx.runMutation(internal.renderJobs.updateStatus, {
    jobId,
    status: "rendering",
    progress: 5,
    startedAt: Date.now(),
  });

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: region as Parameters<typeof renderMediaOnLambda>[0]["region"],
      functionName,
      serveUrl,
      composition: payload.compositionId,
      inputProps: payload.parsedProps,
      codec: "h264",
      imageFormat: "jpeg",
      privacy: "public",
      downloadBehavior: { type: "play-in-browser" },
      maxRetries: 1,
    });

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
        throw new Error(progress.errors[0]?.message ?? "Lambda render failed");
      }

      if (progress.done) {
        const s3Url = progress.outputFile ?? "";
        if (!s3Url) {
          throw new Error("Lambda reported done but no outputFile present");
        }

        await ctx.runMutation(internal.renderJobs.updateStatus, {
          jobId,
          status: "rendering",
          progress: 95,
        });

        const r2 = await copyS3MP4ToR2(
          s3Url,
          jobId,
          r2UploadUrl,
          r2UploadSecret,
          r2PublicUrl,
        );

        await ctx.runMutation(internal.renderJobs.markDone, {
          jobId,
          outputUrl: r2.url,
          outputSize: r2.bytes,
          completedAt: Date.now(),
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });
        return;
      }

      const pct = Math.max(10, Math.round(progress.overallProgress * 100));
      if (pct !== lastProgress) {
        lastProgress = pct;
        await ctx.runMutation(internal.renderJobs.updateStatus, {
          jobId,
          status: "rendering",
          progress: pct,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error("Lambda render timed out after 8 minutes");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render failed";
    await markFailed(ctx, jobId, message);
    throw error;
  }
}

export async function dispatchWorkerJob(
  ctx: ActionCtx,
  jobId: Id<"renderJobs">,
  authUserId?: Id<"users">
): Promise<void> {
  const job = await loadAndAuthorizeJob(ctx, jobId, authUserId);

  const workerUrl = process.env.RENDER_WORKER_URL;
  const workerSecret = process.env.RENDER_WORKER_SECRET;

  if (!workerUrl || !workerSecret) {
    const error =
      "Render worker not configured. Set RENDER_WORKER_URL and RENDER_WORKER_SECRET in Convex env.";
    await markFailed(ctx, jobId, error);
    throw new Error(error);
  }

  let payload: { compositionId: string; parsedProps: Record<string, unknown> };
  try {
    payload = parseJobPayload(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render failed";
    await markFailed(ctx, jobId, message);
    throw error;
  }

  await ctx.runMutation(internal.renderJobs.updateStatus, {
    jobId,
    status: "rendering",
    progress: 10,
    startedAt: Date.now(),
  });

  const body = JSON.stringify({
    jobId,
    compositionId: payload.compositionId,
    inputProps: payload.parsedProps,
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
    let parsed: {
      ok?: boolean;
      outputUrl?: string;
      sizeBytes?: number;
      durationMs?: number;
      error?: string;
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        `Worker returned non-JSON response (${res.status}): ${text.slice(0, 200)}`
      );
    }

    if (!res.ok || !parsed.ok || !parsed.outputUrl) {
      throw new Error(parsed.error ?? `Worker responded with status ${res.status}`);
    }

    await ctx.runMutation(internal.renderJobs.markDone, {
      jobId,
      outputUrl: parsed.outputUrl,
      outputSize: parsed.sizeBytes,
      completedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render failed";
    await markFailed(ctx, jobId, message);
    throw error;
  }
}

export async function dispatchPlatformJob(
  ctx: ActionCtx,
  jobId: Id<"renderJobs">
): Promise<"worker" | "lambda"> {
  const hasWorker =
    Boolean(process.env.RENDER_WORKER_URL) &&
    Boolean(process.env.RENDER_WORKER_SECRET);
  if (hasWorker) {
    await dispatchWorkerJob(ctx, jobId);
    return "worker";
  }

  await dispatchLambdaJob(ctx, jobId);
  return "lambda";
}
