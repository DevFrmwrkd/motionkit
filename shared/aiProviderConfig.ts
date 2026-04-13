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
