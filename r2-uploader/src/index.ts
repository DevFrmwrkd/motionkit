/**
 * MotionKit R2 uploader Worker.
 *
 * Receives signed PUT requests from the Convex render action and writes the
 * MP4 directly to the bound R2 bucket. No S3-compatible access keys involved.
 *
 * Auth: HMAC-SHA256 over `${method}\n${path}\n${contentLength}` using a
 * shared secret. Same pattern as the Hetzner render worker.
 *
 * Routes:
 *   PUT  /renders/<jobId>.mp4   — upload MP4
 *   GET  /health                — liveness check
 */

export interface Env {
  RENDERS: R2Bucket;
  UPLOAD_SECRET: string;
}

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, ts: Date.now() });
    }

    if (req.method !== "PUT") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!url.pathname.startsWith("/renders/")) {
      return new Response("Not found", { status: 404 });
    }

    const key = url.pathname.slice(1); // strip leading /
    const contentLength = req.headers.get("content-length") ?? "0";
    const contentType = req.headers.get("content-type") ?? "video/mp4";
    const sigHeader = req.headers.get("x-upload-signature") ?? "";

    if (!sigHeader.startsWith("sha256=")) {
      return new Response("Missing or malformed signature", { status: 401 });
    }

    if (!env.UPLOAD_SECRET) {
      return new Response("Server not configured", { status: 500 });
    }

    const expected = await hmacHex(
      env.UPLOAD_SECRET,
      `PUT\n/${key}\n${contentLength}`,
    );
    const provided = sigHeader.slice("sha256=".length);

    if (!timingSafeEqual(expected, provided)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const body = req.body;
    if (!body) {
      return new Response("Missing body", { status: 400 });
    }

    await env.RENDERS.put(key, body, {
      httpMetadata: { contentType },
    });

    return Response.json({
      ok: true,
      key,
      bytes: Number(contentLength),
    });
  },
};
