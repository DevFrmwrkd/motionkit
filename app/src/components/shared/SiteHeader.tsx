"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  LogOut,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { useState } from "react";
import { writeDemoMode } from "@/lib/demo-mode";

const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/create", label: "Create" },
  { href: "/workstation", label: "Workstation" },
  { href: "/dashboard", label: "Dashboard" },
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

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isDemoMode } = useCurrentUser();
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    writeDemoMode(false);
    if (!isDemoMode) {
      await signOut();
    }
    router.push("/");
    router.refresh();
  };
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-zinc-100 transition-colors hover:text-amber-500"
        >
          Motion<span className="text-amber-500">Kit</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Desktop auth section */}
          <div className="hidden md:flex md:items-center md:gap-2">
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none ring-amber-500 focus-visible:ring-2">
                  <Avatar size="default">
                    {(user.avatarUrl ?? user.image) ? (
                      <AvatarImage src={(user.avatarUrl ?? user.image)} alt={user.name ?? ""} />
                    ) : null}
                    <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-zinc-100">
                        {user.name ?? "User"}
                      </p>
                      {user.email && (
                        <p className="text-xs text-zinc-500 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="size-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => void handleSignOut()}
                    variant="destructive"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg px-2.5 h-7 text-[0.8rem] font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-zinc-950 border-zinc-800 p-0">
              <SheetHeader className="border-b border-zinc-800 px-4 py-4">
                <SheetTitle className="text-zinc-100 text-left">
                  Motion<span className="text-amber-500">Kit</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-amber-500/10 text-amber-500"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-zinc-800 p-4">
                {isAuthenticated && user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="default">
                        {(user.avatarUrl ?? user.image) ? (
                          <AvatarImage
                            src={(user.avatarUrl ?? user.image)}
                            alt={user.name ?? ""}
                          />
                        ) : null}
                        <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-200">
                          {user.name ?? "User"}
                        </span>
                        {user.email && (
                          <span className="text-xs text-zinc-500 truncate max-w-[160px]">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <LayoutDashboard className="size-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <Settings className="size-4" />
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          void handleSignOut();
                          setMobileOpen(false);
                        }}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        <LogOut className="size-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center rounded-lg h-8 text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
