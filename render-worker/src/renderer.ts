import path from "node:path";
import fs from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { config } from "./config.js";

type RenderInput = {
  jobId: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
};

type RenderResult = {
  jobId: string;
  compositionId: string;
  outputPath: string;
  outputUrl: string;
  durationMs: number;
  sizeBytes: number;
};

let bundlePromise: Promise<string> | null = null;

/**
 * Bundles the Remotion project once and reuses the result.
 * The bundle is an on-disk webpack build served over file:// by the renderer.
 */
export async function getBundle(): Promise<string> {
  if (!bundlePromise) {
    const start = Date.now();
    console.log(`[bundler] bundling ${config.remotionEntry}...`);
    bundlePromise = bundle({
      entryPoint: config.remotionEntry,
      webpackOverride: (cfg) => ({
        ...cfg,
        resolve: {
          ...cfg.resolve,
          alias: {
            ...cfg.resolve?.alias,
            // Mirror the Next.js `@/*` alias so preset files using
            // `import type { ... } from "@/lib/types"` resolve correctly.
            "@": path.resolve(config.workerRoot, "../app/src"),
          },
        },
      }),
    }).then((serveUrl) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[bundler] bundle ready in ${elapsed}s → ${serveUrl}`);
      return serveUrl;
    });
  }
  return bundlePromise;
}

/**
 * Renders a single composition to an MP4 file in the output directory.
 * Safe to call concurrently — the render queue guards actual CPU pressure.
 */
export async function renderComposition(input: RenderInput): Promise<RenderResult> {
  const start = Date.now();
  const serveUrl = await getBundle();

  await fs.mkdir(config.outputDir, { recursive: true });
  const outputPath = path.join(config.outputDir, `${input.jobId}.mp4`);

  console.log(`[render ${input.jobId}] selecting composition "${input.compositionId}"`);
  const composition = await selectComposition({
    serveUrl,
    id: input.compositionId,
    inputProps: input.inputProps,
  });

  console.log(
    `[render ${input.jobId}] rendering ${composition.width}x${composition.height} ` +
    `@ ${composition.fps}fps, ${composition.durationInFrames} frames`
  );

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: input.inputProps,
    chromiumOptions: {
      gl: "swangle",
    },
    ...(config.chromiumPath
      ? { browserExecutable: config.chromiumPath }
      : {}),
  });

  const stat = await fs.stat(outputPath);
  const durationMs = Date.now() - start;
  const outputUrl = `${config.publicUrl}/${input.jobId}.mp4`;

  console.log(
    `[render ${input.jobId}] done in ${(durationMs / 1000).toFixed(1)}s ` +
    `(${(stat.size / 1024 / 1024).toFixed(2)} MB) → ${outputUrl}`
  );

  return {
    jobId: input.jobId,
    compositionId: input.compositionId,
    outputPath,
    outputUrl,
    durationMs,
    sizeBytes: stat.size,
  };
}
