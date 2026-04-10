"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthActions } from "@convex-dev/auth/react";
import { writeDemoMode } from "@/lib/demo-mode";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser() {
  const { user, isDemoMode } = useCurrentUser();
  const { signOut } = useAuthActions();
  const { isMobile } = useSidebar();
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      writeDemoMode(false);
      if (!isDemoMode) {
        await signOut();
      }
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  const avatarSrc = (user as { avatarUrl?: string; image?: string }).avatarUrl
    ?? (user as { avatarUrl?: string; image?: string }).image;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-amber-500 data-[popup-open]:bg-sidebar-accent">
            <Avatar className="h-8 w-8 rounded-lg">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt={user.name ?? ""} />
              ) : null}
              <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {user.name ?? "User"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email ?? (isDemoMode ? "Demo Mode" : "")}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                {avatarSrc ? (
                  <AvatarImage src={avatarSrc} alt={user.name ?? ""} />
                ) : null}
                <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name ?? "User"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email ?? ""}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleSignOut()}>
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
