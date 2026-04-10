"use client";

import { useSyncExternalStore } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { readDemoMode, subscribeDemoMode } from "@/lib/demo-mode";

/**
 * Returns the current user — from OAuth or demo mode.
 * Demo mode uses localStorage flag so it persists across refreshes.
 */
export function useCurrentUser() {
  const { isAuthenticated: oauthAuthenticated, isLoading: authLoading } = useConvexAuth();
  const isDemoMode = useSyncExternalStore<boolean | null>(
    subscribeDemoMode,
    readDemoMode,
    () => null
  );

  // Try real auth
  const authUser = useQuery(
    api.users.getCurrentUser,
    oauthAuthenticated ? {} : "skip"
  );

  // Only resolve the demo account when demo mode is enabled.
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
