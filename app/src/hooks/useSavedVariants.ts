import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Fetch all saved variants for a specific preset + current user.
 * Returns array of variants with metadata (name, last-modified, props).
 */
export function useSavedVariants(
  presetId: Id<"presets"> | null,
  userId: Id<"users"> | null
) {
  return useQuery(
    api.savedPresets.listByPresetAndUser,
    presetId && userId ? { presetId, userId } : "skip"
  );
}
