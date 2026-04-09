"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Returns the current user — from OAuth or demo mode.
 * Demo mode uses localStorage flag so it persists across refreshes.
 */
export function useCurrentUser() {
  const { isAuthenticated: oauthAuthenticated, isLoading: authLoading } = useConvexAuth();

  // Try real auth
  const authUser = useQuery(
    api.users.getCurrentUser,
    oauthAuthenticated ? {} : "skip"
  );

  // Always check for demo user (cheap, cached by Convex)
  const demoUser = useQuery(api.users.getDemoUser);

  const isDemoMode =
    typeof window !== "undefined" &&
    localStorage.getItem("motionkit_demo") === "true";

  // Real OAuth user takes priority
  if (oauthAuthenticated && authUser) {
    return { user: authUser, isLoading: false, isAuthenticated: true, isDemoMode: false };
  }

  if (authLoading) {
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
