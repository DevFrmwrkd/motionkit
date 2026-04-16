"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "./app-sidebar";
import { AppBreadcrumb } from "./app-breadcrumb";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Routes that render with NO chrome at all (no sidebar, no header). The
// landing page, login, and signup are intentionally bare because they
// own their own layout.
const BARE_ROUTES = ["/", "/login", "/signup"];

// Routes that are reachable without a session but still render inside
// the app shell (sidebar + top bar). Visitors see navigation and can
// browse without being forced to /login first — auth is only required
// when they hit a write path (remix, publish, render, save).
//
// /create is public because guests get the Straico free-tier flow
// (convex/aiGenerationStraico.ts) with a 5/day cap. Save & publish on
// that page still require sign-in and are gated at the button level.
const PUBLIC_SHELL_PREFIXES = ["/marketplace", "/p/", "/create"];

function isBareRoute(pathname: string) {
  return BARE_ROUTES.includes(pathname);
}

function isPublicShellRoute(pathname: string) {
  return PUBLIC_SHELL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

// The preset sandbox used to live at /sandbox/preset as a Next.js route,
// but Next's bundler kept dragging ws/node:https into every page handler,
// crashing the worker. It's now served as a plain static file from
// /public/sandbox/preset.html (see SandboxedPresetPlayer) and never reaches
// AppShell at all — so no bare-route exemption is needed here.

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isBareRoute(pathname)) {
    return <>{children}</>;
  }

  if (isPublicShellRoute(pathname)) {
    return <PublicShell>{children}</PublicShell>;
  }

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}

/**
 * Shell used for publicly browsable routes (Marketplace, public preset
 * detail pages). Renders the same sidebar + header chrome as the
 * authenticated shell but skips the /login redirect, so signed-out
 * visitors can browse before they sign up.
 */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <AppBreadcrumb />
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <AppBreadcrumb />
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
