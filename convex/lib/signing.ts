/**
 * Bundle signing (WS-1c).
 *
 * Marketplace presets live as JavaScript bundles in Cloudflare R2. A bundle
 * in R2 can in principle be tampered with between upload and download — by
 * a compromised R2 key, a misconfigured bucket, or a malicious CDN edge.
 * We need a verifiable "this is the bytes the publisher intended" stamp.
 *
 * The model implemented here:
 *   1. On publish, the server computes SHA-256 of the bundle bytes, then
 *      HMACs that hash with `BUNDLE_SIGNING_SECRET`. Both values are stored
 *      on the preset record (`bundleHash` + `bundleSignature`).
 *   2. On load, the client fetches the bundle from R2 AND the preset record
 *      from Convex. It recomputes the SHA-256 of the downloaded bytes and
 *      compares it to `bundleHash`. If they mismatch, the bundle is refused.
 *   3. For the HMAC signature (tamper-evidence on the Convex record itself),
 *      clients do NOT verify directly — they ask the server via the
 *      `verifyBundleSignature` query. This keeps the secret server-side.
 *
 * Why HMAC instead of ECDSA:
 *   - HMAC with a single server-held secret is strictly simpler, has no key
 *     distribution problem, and runs in ~microseconds in the Convex V8
 *     runtime. We do not need the public-verifiability property of an
 *     asymmetric scheme because the verify call is a server-side query.
 *   - Upgrade path: this module exposes `sign`/`verify` as async functions
 *     so the implementation can swap to WebCrypto ECDSA without touching
 *     callers.
 *
 * Dev fallback:
 *   If `BUNDLE_SIGNING_SECRET` is not set, the module uses a hard-coded
 *   deterministic dev secret and logs a loud warning. Production must set
 *   a 64-char hex secret — the same generator as ENCRYPTION_KEY works:
 *     openssl rand -hex 32
 */

const DEV_FALLBACK_SECRET =
  "dev-fallback-DO-NOT-USE-IN-PRODUCTION-bundle-signing-secret-00000000";

function getSigningSecret(): string {
  const secret = process.env.BUNDLE_SIGNING_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "BUNDLE_SIGNING_SECRET is not configured. " +
          "Set it to a 64-char hex string on the Convex deployment " +
          "before publishing any signed bundles."
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[signing] BUNDLE_SIGNING_SECRET not set — using DEV fallback. " +
        "Do not use this in production."
    );
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("hex string must have even length");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Constant-time hex string comparison. Plain `===` on secrets leaks length
 * and per-byte mismatch position via timing, so we compare byte-by-byte
 * and XOR the results.
 */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * SHA-256 of arbitrary bytes. Returns lowercase hex.
 */
export async function sha256Hex(input: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(hash);
}

/**
 * Convenience overload: hash a UTF-8 string.
 */
export async function sha256HexString(s: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(s));
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = getSigningSecret();
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign a bundle hash (hex string). Returns a lowercase hex HMAC-SHA256.
 * Pass the hex hash directly rather than the raw bundle — the caller
 * already has the hash, and passing it explicitly keeps the signing
 * surface small.
 */
export async function signBundleHash(bundleHashHex: string): Promise<string> {
  const key = await getHmacKey();
  const data = new TextEncoder().encode(bundleHashHex);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, data.buffer as ArrayBuffer);
  return bufferToHex(sigBuffer);
}

/**
 * Verify an HMAC signature against its hash. Constant-time compare so a
 * timing attacker cannot probe the signature byte-by-byte.
 */
export async function verifyBundleHash(
  bundleHashHex: string,
  signatureHex: string
): Promise<boolean> {
  if (!/^[0-9a-f]+$/i.test(signatureHex)) return false;
  if (!/^[0-9a-f]+$/i.test(bundleHashHex)) return false;
  const expected = await signBundleHash(bundleHashHex);
  return constantTimeEqualHex(expected, signatureHex);
}

/**
 * Verify signature via WebCrypto's built-in `verify` primitive. Equivalent
 * to `verifyBundleHash` but kept for callers that have the raw signature
 * bytes already decoded. Not currently used but exported for tests.
 */
export async function verifyBundleHashRaw(
  bundleHashHex: string,
  signatureHex: string
): Promise<boolean> {
  try {
    const key = await getHmacKey();
    const sigBytes = hexToBytes(signatureHex);
    const data = new TextEncoder().encode(bundleHashHex);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      data.buffer as ArrayBuffer
    );
  } catch {
    return false;
  }
}

/**
 * One-shot: compute hash + signature for a bundle's raw bytes (or source
 * string). Returns both so callers can store them on the preset record.
 */
export async function signBundleBytes(
  bundleBytesOrSource: ArrayBuffer | Uint8Array | string
): Promise<{ hash: string; signature: string }> {
  const hash =
    typeof bundleBytesOrSource === "string"
      ? await sha256HexString(bundleBytesOrSource)
      : await sha256Hex(bundleBytesOrSource);
  const signature = await signBundleHash(hash);
  return { hash, signature };
}

/**
 * Re-sign a bundle hash we already have on record. Useful for migrations
 * that change the signing secret: old signatures are rotated by calling
 * this with the OLD_SIGNING_SECRET loaded, verifying, then calling again
 * with the new secret to re-issue.
 */
export async function resignBundleHash(bundleHashHex: string): Promise<string> {
  return signBundleHash(bundleHashHex);
}
