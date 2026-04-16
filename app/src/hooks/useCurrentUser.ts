"use client";

import { useSyncExternalStore } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { readDemoMode, subscribeDemoMode } from "@/lib/demo-mode";

// Must match the server-side check in convex/lib/authz.ts. When this is
// false, the hook refuses to treat a locally-set demo flag as authenticated,
// so users can't get routed into UI that will fail on every guarded write.
const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

/**
 * Returns the current user — from OAuth or demo mode.
 * Demo mode uses localStorage flag so it persists across refreshes, but is
 * only honored when NEXT_PUBLIC_ENABLE_DEMO_MODE === "true".
 */
export function useCurrentUser() {
  const { isAuthenticated: oauthAuthenticated, isLoading: authLoading } = useConvexAuth();
  const rawDemoMode = useSyncExternalStore<boolean | null>(
    subscribeDemoMode,
    readDemoMode,
    () => null
  );
  // A local flag alone is not enough — the deployment must also opt into
  // demo mode, otherwise we ignore the flag completely.
  const isDemoMode = DEMO_MODE_ENABLED ? rawDemoMode : false;

  // Try real auth
  const authUser = useQuery(
    api.users.getCurrentUser,
    oauthAuthenticated ? {} : "skip"
  );

  // Only resolve the demo account when demo mode is enabled AND the local
  // flag is set.
  const demoUser = useQuery(api.users.getDemoUser, isDemoMode ? {} : "skip");

  // Real OAuth user takes priority
  if (oauthAuthenticated) {
    if (authUser === undefined) {
      return { user: null, isLoading: true, isAuthenticated: false, isDemoMode: false };
    }

    if (authUser) {
      return { user: authUser, isLoading: false, isAuthenticated: true, isDemoMode: false };
    }
  }

  if (authLoading) {
    return { user: null, isLoading: true, isAuthenticated: false, isDemoMode: false };
  }

  if (isDemoMode === null) {
    return { user: null, isLoading: true, isAuthenticated: false, isDemoMode: false };
  }

  // Demo mode
  if (isDemoMode && demoUser) {
    return { user: demoUser, isLoading: false, isAuthenticated: true, isDemoMode: true };
  }
  if (isDemoMode && demoUser === undefined) {
    return { user: null, isLoading: true, isAuthenticated: false, isDemoMode: true };
  }

  return { user: null, isLoading: false, isAuthenticated: false, isDemoMode: false };
}
