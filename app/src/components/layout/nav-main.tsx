"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Sparkles,
  Store,
  Play,
  Settings,
  Code2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: { title: string; url: string }[];
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "",
    items: [
      { title: "Marketplace", url: "/marketplace", icon: Store },
      {
        title: "Workstation",
        url: "/workstation",
        icon: Play,
        items: [
          { title: "All Saved", url: "/workstation" },
          { title: "Projects", url: "/dashboard/projects" },
          { title: "Collections", url: "/dashboard/collections" },
          { title: "Render History", url: "/dashboard/history" },
        ],
      },
      { title: "Create", url: "/create", icon: Sparkles },
      { title: "Import", url: "/import", icon: Code2 },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <SidebarGroup key={group.label || "main"}>
          {group.label ? (
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          ) : null}
          <SidebarMenu>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.url || pathname.startsWith(item.url + "/");

              if (!item.items) {
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return <NavCollapsible key={item.url} item={item} pathname={pathname} />;
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

function NavCollapsible({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const isGroupActive = pathname.startsWith(item.url);
  const [isOpen, setIsOpen] = React.useState(isGroupActive);

  // Keep it open if we navigate into this section's path
  React.useEffect(() => {
    if (pathname.startsWith(item.url)) {
      setIsOpen(true);
    }
  }, [pathname, item.url]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isGroupActive}
            />
          }
        >
          <Icon className="size-4" />
          <span>{item.title}</span>
          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((sub) => {
              const isSubActive = pathname === sub.url;
              return (
                <SidebarMenuSubItem key={sub.url}>
                  <SidebarMenuSubButton
                    render={<Link href={sub.url} />}
                    isActive={isSubActive}
                  >
                    <span>{sub.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
