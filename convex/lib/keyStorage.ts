/**
 * Wrapper around convex/lib/encryption.ts that:
 *  1. Adds an "enc:" prefix to encrypted values so we can tell ciphertext
 *     from legacy plaintext without guessing.
 *  2. Falls back gracefully when ENCRYPTION_KEY is not configured — writes
 *     go through plaintext in dev (with a visible warning) rather than
 *     silently dropping the key. Production deployments MUST set it.
 *  3. Provides a stable "last 4 chars" hint so the UI can show
 *     "••••AIza1234" without ever exposing the whole key to the client.
 */

import { encrypt, decrypt } from "./encryption";

const ENC_PREFIX = "enc:";

function getEncryptionKey(): string | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;
  if (key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  return key;
}

/**
 * Encrypt a plaintext API key before storing. Throws in production if no
 * ENCRYPTION_KEY is configured so we never silently ship plaintext secrets
 * to the database.
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  const key = getEncryptionKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY is not configured — refusing to store API keys in plaintext. " +
          "Set ENCRYPTION_KEY to a 64-char hex string on the Convex deployment."
      );
    }
    // Dev fallback: store plaintext but warn loudly. The read path detects
    // the missing prefix and returns the raw value unchanged.
    // eslint-disable-next-line no-console
    console.warn(
      "[keyStorage] ENCRYPTION_KEY not set — storing BYOK key in plaintext. " +
        "This is ONLY acceptable in local development."
    );
    return plaintext;
  }
  const encrypted = await encrypt(plaintext, key);
  return ENC_PREFIX + encrypted;
}

/**
 * Decrypt a stored API key. Handles three cases:
 *   - "enc:iv:ct:tag" → decrypt with ENCRYPTION_KEY
 *   - legacy plaintext (no prefix) → return as-is for backwards compat
 *   - null/empty → return null
 */
export async function decryptApiKey(stored: string | undefined | null): Promise<string | null> {
  if (!stored) return null;
  if (!stored.startsWith(ENC_PREFIX)) {
    // Legacy plaintext value — still usable but should be re-encrypted on
    // the next save. We don't rotate automatically because reads happen
    // inside a query context where writes aren't allowed.
    return stored;
  }
  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "Stored key is encrypted but ENCRYPTION_KEY is not configured on this deployment."
    );
  }
  return await decrypt(stored.slice(ENC_PREFIX.length), key);
}

/**
 * Produce a safe-for-client hint from a stored key without decrypting it.
 * For encrypted values we can't derive a meaningful suffix, so we return
 * a fixed mask. For legacy plaintext we return the last 4 chars.
 *
 * The UI uses this to render "•••• •••• 1234" style affordances.
 */
export function keyHint(stored: string | undefined | null): string | null {
  if (!stored) return null;
  if (stored.startsWith(ENC_PREFIX)) {
    // Can't cheaply reveal last-4 without decrypting; leave as a generic mask.
    return "••••";
  }
  const tail = stored.slice(-4);
  return tail ? `••••${tail}` : "••••";
}
