"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Folder,
  Film,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect } from "react";

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "My Projects", icon: Film, exact: false },
  { href: "/dashboard/collections", label: "Collections", icon: Folder, exact: false },
  { href: "/dashboard/history", label: "Render History", icon: History, exact: false },
] as const;

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useCurrentUser();
  const { signOut } = useAuthActions();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-zinc-100 hover:text-amber-500 transition-colors"
          >
            Motion<span className="text-amber-500">Kit</span>
          </Link>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Avatar size="default">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name ?? ""} />
                ) : null}
                <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {user.name ?? "User"}
                </p>
                {user.email && (
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {sidebarLinks.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}

          <div className="mt-8 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Account
          </div>
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-amber-500/10 text-amber-500"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Settings className="size-4" />
            Settings
          </Link>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/50">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur sticky top-0 z-10 shrink-0">
          <h2 className="text-sm font-medium text-zinc-400">Dashboard</h2>
          <Link href="/workstation">
            <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold h-8 px-4 text-sm rounded-lg transition-colors">
              Open Workstation
            </Button>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
