"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Upload, BarChart3, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const NAV_ITEMS = [
  { href: "/creator", label: "Overview", icon: LayoutDashboard },
  { href: "/creator/upload", label: "Publish", icon: Upload },
  { href: "/creator/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/creator/earnings", label: "Earnings", icon: DollarSign },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isDemoMode } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading creator studio...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <aside className="hidden w-72 shrink-0 border-r border-zinc-800 bg-zinc-950/95 lg:flex lg:flex-col">
        <div className="border-b border-zinc-800 p-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-zinc-100 transition-colors hover:text-amber-500"
          >
            Motion<span className="text-amber-500">Kit</span>
            <span className="ml-2 text-xs uppercase tracking-[0.3em] text-amber-500/60">
              Creator
            </span>
          </Link>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-sm font-medium text-zinc-200">{user.name ?? "Creator"}</p>
            <p className="mt-1 text-xs text-zinc-500">{user.email ?? "MotionKit workspace"}</p>
            {isDemoMode && (
              <Badge className="mt-3 border-amber-500/30 bg-amber-500/10 text-amber-400">
                Demo mode
              </Badge>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/creator" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950/60">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/85 px-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">Creator Studio</p>
            <p className="text-sm text-zinc-300">Manage listings, analytics, and revenue signals</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100">
                User Dashboard
              </Button>
            </Link>
            <Link href="/creator/upload">
              <Button className="h-9 rounded-lg bg-amber-500 px-4 font-semibold text-zinc-950 hover:bg-amber-400">
                <Upload className="mr-2 size-4" />
                Publish
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
