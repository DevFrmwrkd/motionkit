"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  collections: "Collections",
  history: "Render History",
  creator: "Creator Studio",
  creators: "Creators",
  upload: "Publish",
  analytics: "Analytics",
  earnings: "Earnings",
  create: "Create",
  marketplace: "Marketplace",
  workstation: "Workstation",
  import: "Import",
  settings: "Settings",
  p: "Preset",
  feedback: "Feedback",
};

// Parent segments whose immediate child is a dynamic id we don't want to
// show verbatim in the crumb trail (e.g. /creators/js783kd... → we show
// "Creators" and let the page header carry the creator's actual name).
const HIDE_CHILD_AFTER = new Set(["creators", "p"]);

export function AppBreadcrumb() {
  const pathname = usePathname();
  const allSegments = pathname.split("/").filter(Boolean);

  // Drop the dynamic tail segment after parents like /creators/<id> so
  // raw user ids don't appear in the breadcrumb.
  const segments = allSegments.filter((seg, i) => {
    const parent = allSegments[i - 1];
    return !(parent && HIDE_CHILD_AFTER.has(parent));
  });

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: LABELS[seg] ?? seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  render={<Link href={crumb.href} />}
                >
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
