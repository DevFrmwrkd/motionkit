/**
 * AES-256-GCM encryption for BYOK API keys stored in Convex.
 *
 * The ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes).
 * Format: iv:ciphertext:authTag (all base64)
 *
 * NOTE: Uses Web Crypto API (available in Convex runtime).
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const TAG_LENGTH = 128; // 128-bit auth tag

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getKey(encryptionKeyHex: string): Promise<CryptoKey> {
  const raw = hexToBuffer(encryptionKeyHex);
  return crypto.subtle.importKey("raw", raw, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt a plaintext string. Returns "iv:ciphertext:tag" (base64 segments).
 */
export async function encrypt(
  plaintext: string,
  encryptionKeyHex: string
): Promise<string> {
  const key = await getKey(encryptionKeyHex);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded
  );

  // AES-GCM appends the auth tag to the ciphertext
  const cipherBytes = new Uint8Array(cipherBuffer);
  const tagStart = cipherBytes.byteLength - TAG_LENGTH / 8;
  const ciphertext = cipherBytes.slice(0, tagStart);
  const tag = cipherBytes.slice(tagStart);

  return [
    bufferToBase64(iv.buffer),
    bufferToBase64(ciphertext.buffer),
    bufferToBase64(tag.buffer),
  ].join(":");
}

/**
 * Decrypt an "iv:ciphertext:tag" string back to plaintext.
 */
export async function decrypt(
  encrypted: string,
  encryptionKeyHex: string
): Promise<string> {
  const [ivB64, cipherB64, tagB64] = encrypted.split(":");
  const key = await getKey(encryptionKeyHex);

  const iv = new Uint8Array(base64ToBuffer(ivB64));
  const ciphertext = new Uint8Array(base64ToBuffer(cipherB64));
  const tag = new Uint8Array(base64ToBuffer(tagB64));

  // Reconstruct combined buffer (ciphertext + tag) for WebCrypto
  const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.byteLength);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    combined.buffer
  );

  return new TextDecoder().decode(decrypted);
}
