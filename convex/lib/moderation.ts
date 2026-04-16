/**
 * Shared validation helpers for admin / moderation mutations.
 *
 * `reason` fields (reject / archive / force-unlist / role-change) are free-text
 * strings that land in the audit log and in some cases are shown to the
 * creator. Unbounded strings would bloat the database and give a hostile
 * admin (or a fat-fingered paste) an easy way to write megabytes into the
 * audit table. Cap here so every entry point agrees on the same limit.
 *
 * Kept in sync with the frontend admin review dialog (`MAX_REASON_LENGTH`).
 */
export const MAX_MODERATION_REASON_LENGTH = 1000;

/**
 * Normalize and validate a moderation reason:
 *   - Trim whitespace.
 *   - Reject if empty AND `required` is true.
 *   - Throw if the trimmed length exceeds MAX_MODERATION_REASON_LENGTH.
 *   - Return undefined for absent/blank + optional reasons, otherwise the
 *     normalized string.
 *
 * Call at the start of any admin mutation that accepts a `reason` arg.
 */
export function normalizeReason(
  value: string | undefined,
  opts: { required?: boolean; fieldName?: string } = {}
): string | undefined {
  const name = opts.fieldName ?? "reason";
  if (value === undefined) {
    if (opts.required) throw new Error(`${name} is required`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (opts.required) throw new Error(`${name} is required`);
    return undefined;
  }
  if (trimmed.length > MAX_MODERATION_REASON_LENGTH) {
    throw new Error(
      `${name} must be at most ${MAX_MODERATION_REASON_LENGTH} characters ` +
        `(got ${trimmed.length})`
    );
  }
  return trimmed;
}
