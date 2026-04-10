import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { enqueueRender, getQueueStats } from "./queue.js";
import { getBundle } from "./renderer.js";

const app = Fastify({
  logger: {
    level: "info",
    transport: { target: "pino-pretty" },
  },
  bodyLimit: 1024 * 1024, // 1 MB — render payloads are tiny
});

await app.register(cors, { origin: true });

// ─── HMAC auth middleware ─────────────────────────────────────────────────
// Convex action signs the request body with sha256(RENDER_WORKER_SECRET).
// Header format: `X-Worker-Signature: sha256=<hex>`
app.addHook("preHandler", async (req, reply) => {
  if (req.url === "/health" || req.url.startsWith("/renders/")) return;

  const sig = req.headers["x-worker-signature"];
  if (!sig || typeof sig !== "string" || !sig.startsWith("sha256=")) {
    reply.code(401).send({ error: "missing signature" });
    return reply;
  }

  const provided = sig.slice("sha256=".length);
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  const expected = crypto
    .createHmac("sha256", config.secret)
    .update(body)
    .digest("hex");

  // timingSafeEqual requires equal-length buffers
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    reply.code(401).send({ error: "invalid signature" });
    return reply;
  }
});

// ─── Routes ────────────────────────────────────────────────────────────────

app.get("/health", async () => {
  return {
    status: "ok",
    bundleReady: Boolean(process.env.BUNDLE_READY),
    queue: getQueueStats(),
    version: "0.1.0",
  };
});

app.post<{
  Body: {
    jobId: string;
    compositionId: string;
    inputProps: Record<string, unknown>;
  };
}>("/render", async (req, reply) => {
  const { jobId, compositionId, inputProps } = req.body ?? ({} as never);

  if (!jobId || typeof jobId !== "string") {
    return reply.code(400).send({ error: "jobId required" });
  }
  if (!compositionId || typeof compositionId !== "string") {
    return reply.code(400).send({ error: "compositionId required" });
  }
  if (!inputProps || typeof inputProps !== "object") {
    return reply.code(400).send({ error: "inputProps required" });
  }

  app.log.info(
    { jobId, compositionId, queue: getQueueStats() },
    "render request received"
  );

  try {
    const result = await enqueueRender({ jobId, compositionId, inputProps });
    return {
      ok: true,
      jobId: result.jobId,
      outputUrl: result.outputUrl,
      sizeBytes: result.sizeBytes,
      durationMs: result.durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    app.log.error({ jobId, err: message }, "render failed");
    return reply.code(500).send({ ok: false, jobId, error: message });
  }
});

// ─── Static file serving for rendered MP4s ────────────────────────────────
// In production, Caddy handles this with better caching + HTTPS.
// This route is a dev-friendly fallback so local smoke tests work.
app.get<{ Params: { file: string } }>("/renders/:file", async (req, reply) => {
  const file = req.params.file;
  if (!/^[\w.-]+\.mp4$/.test(file)) {
    return reply.code(400).send({ error: "invalid filename" });
  }
  const filePath = path.join(config.outputDir, file);
  if (!fs.existsSync(filePath)) {
    return reply.code(404).send({ error: "not found" });
  }
  const stream = fs.createReadStream(filePath);
  reply.header("content-type", "video/mp4");
  return reply.send(stream);
});

// ─── Boot ─────────────────────────────────────────────────────────────────

async function start() {
  // Warm the bundle eagerly so the first render is fast.
  void getBundle()
    .then(() => {
      process.env.BUNDLE_READY = "1";
      app.log.info("Remotion bundle warm");
    })
    .catch((err) => app.log.error(err, "failed to warm bundle"));

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      { port: config.port, concurrency: config.maxConcurrency, outputDir: config.outputDir },
      "render worker listening"
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
