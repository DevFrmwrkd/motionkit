"use client";

import { useEffect, useState } from "react";

/**
 * Returns a stable opaque identifier for an anonymous visitor, persisted in
 * localStorage. Used as the rate-limit key for the Straico free-tier
 * generation flow (convex/aiGenerationStraico.ts).
 *
 * Not authentication — trivially defeatable by clearing storage. The Convex
 * action validates the shape (8–128 chars, [A-Za-z0-9_\-:.]) and imposes
 * a daily cap per id.
 */
const STORAGE_KEY = "motionkit.guestId";

function generateGuestId(): string {
  // Prefer crypto.randomUUID when available; fall back to a random-enough
  // string for the (rare) environment that doesn't expose it. Prefix lets
  // us tell the two generators apart in the quota table if we ever need to.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `g-${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `g-${Date.now().toString(36)}-${rand}`;
}

export function useGuestId(): string | null {
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored || stored.length < 8) {
        stored = generateGuestId();
        localStorage.setItem(STORAGE_KEY, stored);
      }
      setGuestId(stored);
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to a
      // session-only id so generation still works on this page load.
      setGuestId(generateGuestId());
    }
  }, []);

  return guestId;
}
