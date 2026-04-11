import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(__dirname, "..");

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  maxConcurrency: Number(process.env.MAX_CONCURRENCY ?? 2),
  secret: req("RENDER_WORKER_SECRET"),
  outputDir: path.resolve(
    workerRoot,
    process.env.OUTPUT_DIR ?? "./output"
  ),
  publicUrl: req("PUBLIC_URL").replace(/\/$/, ""),
  remotionEntry: path.resolve(
    workerRoot,
    process.env.REMOTION_ENTRY ?? "../app/src/remotion/index.ts"
  ),
  chromiumPath: process.env.CHROMIUM_PATH || undefined,
  workerRoot,
};

export type WorkerConfig = typeof config;
