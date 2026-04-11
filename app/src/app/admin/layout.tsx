"use client";

/**
 * Admin section layout. Gates every child route on the `admin` role by
 * checking `useCurrentUser()`. Server-side enforcement still happens in
 * every Convex handler via `requireAdmin`; this is a UX guard so non-admin
 * users don't see a flicker of the admin chrome before being kicked out.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ShieldAlert, ListChecks, AlertTriangle, FileSearch, Users } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: ShieldAlert },
  { href: "/admin/review", label: "Review queue", icon: ListChecks },
  { href: "/admin/broken-renders", label: "Broken renders", icon: AlertTriangle },
  { href: "/admin/audit", label: "Audit log", icon: FileSearch },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-6 text-red-200">
          <h1 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="h-5 w-5" />
            Admin access required
          </h1>
          <p className="text-sm opacity-80">
            This section is limited to users with the <code>admin</code> role.
            If you believe this is a mistake, contact the platform owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Moderation
        </h2>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
