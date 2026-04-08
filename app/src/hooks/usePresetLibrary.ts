"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Category =
  | "intro"
  | "title"
  | "lower-third"
  | "cta"
  | "transition"
  | "outro"
  | "full";

/**
 * Fetches presets from Convex with optional category filter.
 * Returns reactive data that updates when presets change.
 */
export function usePresetLibrary(category?: Category) {
  const presets = useQuery(api.presets.list, {
    category,
    status: "published",
  });

  return {
    presets: presets ?? [],
    isLoading: presets === undefined,
  };
}
