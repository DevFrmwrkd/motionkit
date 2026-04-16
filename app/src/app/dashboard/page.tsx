"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Film,
  Folder,
  Download,
  Clock,
  Sparkles,
  LayoutGrid,
  Wrench,
  Plus,
  ArrowUpRight,
  Store,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const userId = user?._id as Id<"users"> | undefined;

  const myPresets = useQuery(
    api.presets.listByUser,
    userId ? { userId } : "skip"
  );
  const savedPresets = useQuery(
    api.savedPresets.listByUser,
    userId ? { userId } : "skip"
  );
  const collections = useQuery(
    api.collections.listByUser,
    userId ? { userId } : "skip"
  );
  const renderJobs = useQuery(
    api.renderJobs.listByUser,
    userId ? { userId } : "skip"
  );
  const allPresets = useQuery(
    api.presets.list,
    userId ? { viewerId: userId } : "skip"
  );

  const totalDownloads = useMemo(
    () => (myPresets ?? []).reduce((sum, p) => sum + (p.downloads ?? 0), 0),
    [myPresets]
  );
  const presetNameById = useMemo(
    () =>
      new Map((allPresets ?? []).map((preset) => [preset._id, preset.name])),
    [allPresets]
  );

  const stats = [
    {
      label: "My Presets",
      value: myPresets?.length ?? 0,
      icon: Film,
      description: "Total created presets",
      color: "amber" as const,
    },
    {
      label: "Saved Variants",
      value: savedPresets?.length ?? 0,
      icon: Folder,
      description: "Customized variations",
      color: "violet" as const,
    },
    {
      label: "Total Downloads",
      value: totalDownloads,
      icon: Download,
      description: "Across all presets",
      color: "emerald" as const,
    },
    {
      label: "Collections",
      value: collections?.length ?? 0,
      icon: LayoutGrid,
      description: "Organized groups",
      color: "cyan" as const,
    },
  ];

  const statColors = {
    amber: {
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
      ring: "ring-amber-500/20 hover:ring-amber-500/50",
      shadow: "shadow-amber-500/5 hover:shadow-amber-500/20",
      value: "text-amber-400",
    },
    violet: {
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-400",
      ring: "ring-violet-500/20 hover:ring-violet-500/50",
      shadow: "shadow-violet-500/5 hover:shadow-violet-500/20",
      value: "text-violet-400",
    },
    emerald: {
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-400",
      ring: "ring-emerald-500/20 hover:ring-emerald-500/50",
      shadow: "shadow-emerald-500/5 hover:shadow-emerald-500/20",
      value: "text-emerald-400",
    },
    cyan: {
      iconBg: "bg-cyan-500/10",
      iconText: "text-cyan-400",
      ring: "ring-cyan-500/20 hover:ring-cyan-500/50",
      shadow: "shadow-cyan-500/5 hover:shadow-cyan-500/20",
      value: "text-cyan-400",
    },
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your presets, renders, and activity at a glance.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = statColors[stat.color];
          return (
            <Card
              key={stat.label}
              className={[
                "transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl bg-zinc-950/50 backdrop-blur-sm relative z-0 hover:z-10",
                colors.ring,
                colors.shadow,
              ].join(" ")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-zinc-400 font-medium">{stat.label}</CardDescription>
                <div className={`flex size-8 items-center justify-center rounded-lg ${colors.iconBg}`}>
                  <Icon className={`size-4 ${colors.iconText}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold tabular-nums ${colors.value}`}>{stat.value}</div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/create">
          <Card className="transition-all duration-300 cursor-pointer border-zinc-800 hover:border-amber-500/30 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-amber-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Sparkles className="size-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Create with AI</p>
                <p className="text-xs text-zinc-500">
                  Generate motion graphics
                </p>
              </div>
              <ArrowUpRight className="size-4 text-zinc-600" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/marketplace">
          <Card className="transition-all duration-300 cursor-pointer border-zinc-800 hover:border-violet-500/30 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-violet-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Store className="size-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Browse Marketplace</p>
                <p className="text-xs text-zinc-500">
                  Discover community presets
                </p>
              </div>
              <ArrowUpRight className="size-4 text-zinc-600" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/workstation">
          <Card className="transition-all duration-300 cursor-pointer border-zinc-800 hover:border-teal-500/30 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-teal-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-teal-500/10">
                <Wrench className="size-4 text-teal-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Open Workstation</p>
                <p className="text-xs text-zinc-500">
                  Edit and render presets
                </p>
              </div>
              <ArrowUpRight className="size-4 text-zinc-600" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Presets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              My Presets
            </CardTitle>
            <Link href="/create">
              <Button variant="ghost" size="sm" className="text-xs">
                <Plus className="size-3 mr-1" /> New
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {myPresets === undefined ? (
              <InlineLoader />
            ) : myPresets.length === 0 ? (
              <EmptyState
                icon={Film}
                title="No presets yet"
                description="Generate your first preset with AI or import existing Remotion code."
                action={
                  <Link href="/create">
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Create preset
                    </Button>
                  </Link>
                }
                compact
              />
            ) : (
              myPresets.slice(0, 6).map((preset) => (
                <Link
                  key={preset._id}
                  href={`/workstation?presetId=${preset._id}`}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <Film className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.category}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      preset.status === "published"
                        ? "text-green-400 border-green-500/30"
                        : ""
                    }
                  >
                    {preset.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Saved Variants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Saved Variants
            </CardTitle>
            <Link href="/workstation">
              <Button variant="ghost" size="sm" className="text-xs">
                Open Workstation
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {savedPresets === undefined ? (
              <InlineLoader />
            ) : savedPresets.length === 0 ? (
              <EmptyState
                icon={Folder}
                title="No saved variants"
                description="Tweak any preset in the workstation, then save it as a reusable variant."
                compact
              />
            ) : (
              savedPresets.slice(0, 6).map((item) => (
                <Link
                  key={item._id}
                  href={`/workstation?savedPresetId=${item._id}`}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Folder className="size-4 text-violet-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {presetNameById.get(item.presetId) ?? "Original preset"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Variant</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Renders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Renders
          </CardTitle>
          <Link href="/dashboard/history">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderJobs === undefined ? (
            <InlineLoader />
          ) : renderJobs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No renders yet"
              description="Hit Render on any preset in the workstation to queue your first job."
              compact
            />
          ) : (
            renderJobs.slice(0, 5).map((job) => (
              <div
                key={job._id}
                className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {presetNameById.get(job.presetId) ?? job.bundleUrl}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.startedAt
                        ? new Date(job.startedAt).toLocaleDateString()
                        : "Queued"}
                    </p>
                  </div>
                </div>
                <RenderStatusBadge
                  status={job.status}
                  progress={job.progress}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InlineLoader() {
  return (
    <div className="py-6 flex items-center justify-center text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
}

function RenderStatusBadge({
  status,
  progress,
}: {
  status: string;
  progress?: number;
}) {
  const styles: Record<string, string> = {
    queued: "text-yellow-400 border-yellow-500/30",
    rendering: "text-blue-400 border-blue-500/30",
    done: "text-green-400 border-green-500/30",
    failed: "text-red-400 border-red-500/30",
  };

  return (
    <Badge
      variant="outline"
      className={styles[status] ?? ""}
    >
      {status === "rendering" && progress ? `${progress}%` : status}
    </Badge>
  );
}
