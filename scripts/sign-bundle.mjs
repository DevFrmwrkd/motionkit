#!/usr/bin/env node
/**
 * Sign a preset bundle on disk. Mirrors the logic in `convex/lib/signing.ts`
 * so CI pipelines and manual `pnpm preset:upload` flows can compute the
 * same hash + signature the server-side validator would produce.
 *
 * Usage:
 *   node scripts/sign-bundle.mjs path/to/bundle.js
 *   BUNDLE_SIGNING_SECRET=$(openssl rand -hex 32) \
 *     node scripts/sign-bundle.mjs path/to/bundle.js
 *
 * Output (stdout, JSON):
 *   { "path": "...", "bytes": 12345, "hash": "...", "signature": "..." }
 *
 * Exit codes:
 *   0 — success
 *   1 — file not found or unreadable
 *   2 — signing secret missing (in production)
 */

import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEV_FALLBACK_SECRET =
  "dev-fallback-DO-NOT-USE-IN-PRODUCTION-bundle-signing-secret-00000000";

function getSigningSecret() {
  const secret = process.env.BUNDLE_SIGNING_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Error: BUNDLE_SIGNING_SECRET is not set. Refusing to use dev fallback in production."
    );
    process.exit(2);
  }
  console.error(
    "[sign-bundle] Warning: BUNDLE_SIGNING_SECRET not set — using DEV fallback. Do not use in production."
  );
  return DEV_FALLBACK_SECRET;
}

async function main() {
  const [, , pathArg] = process.argv;
  if (!pathArg) {
    console.error("Usage: node scripts/sign-bundle.mjs <path-to-bundle.js>");
    process.exit(1);
  }
  const abs = resolve(pathArg);
  let bytes;
  try {
    bytes = await readFile(abs);
  } catch (err) {
    console.error(
      `Failed to read ${abs}: ${err instanceof Error ? err.message : err}`
    );
    process.exit(1);
  }
  const secret = getSigningSecret();

  const hash = createHash("sha256").update(bytes).digest("hex");
  // The server signs the HEX hash string, not the raw bytes. Match that
  // exactly so signatures produced here verify server-side.
  const signature = createHmac("sha256", secret).update(hash).digest("hex");

  const result = {
    path: abs,
    bytes: bytes.length,
    hash,
    signature,
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
