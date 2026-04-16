export type AiProvider = "gemini" | "claude" | "openrouter";

export function normalizeOptionalString(
  value: string | null | undefined
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveOpenRouterModel(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

/**
 * Shape check for an OpenRouter model id. OpenRouter's catalogue is huge
 * and grows constantly, so a dynamic whitelist is impractical — but every
 * id the aggregator supports is `<vendor>/<model>[:<tag>]` with a small
 * alphabet. Anything that doesn't match is either a typo or a hostile
 * payload (prototype-pollution key, path-traversal attempt). We reject it
 * at the edge instead of letting the upstream API error at generation
 * time with a confusing message.
 *
 * Examples accepted: "openai/gpt-4o", "z-ai/glm-5.1",
 *   "anthropic/claude-3.5-sonnet", "deepseek/deepseek-chat-v3:free".
 * Examples rejected: "gpt-4o" (no vendor), "../../etc", "foo/bar/baz",
 *   "openai/<script>", "".
 */
const OPENROUTER_MODEL_ID_PATTERN =
  /^[a-z0-9][a-z0-9-]{0,63}\/[a-z0-9][a-z0-9-._]{0,63}(:[a-z0-9-._]{1,32})?$/i;

export function isValidOpenRouterModelId(value: string): boolean {
  if (value.length === 0 || value.length > 128) return false;
  return OPENROUTER_MODEL_ID_PATTERN.test(value);
}

/**
 * Validate + normalize in one step. Returns the trimmed value on success,
 * throws on an unrecognized shape. Use at the trust boundary (mutation
 * handlers, HTTP endpoints) — not in read paths, where we want display
 * to be best-effort.
 */
export function validateOpenRouterModelId(value: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error("OpenRouter model id cannot be blank");
  }
  if (!isValidOpenRouterModelId(normalized)) {
    throw new Error(
      `Invalid OpenRouter model id "${normalized}". Expected "<vendor>/<model>" (e.g. "openai/gpt-4o").`
    );
  }
  return normalized;
}
