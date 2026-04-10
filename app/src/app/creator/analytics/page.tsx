"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getCreatorMetrics } from "@/lib/creator-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, TrendingUp, GitFork, Loader2 } from "lucide-react";

export default function CreatorAnalytics() {
  const { user, isLoading } = useCurrentUser();
  const presets = useQuery(
    api.presets.listByUser,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );
  const renderJobs = useQuery(
    api.renderJobs.listByUser,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  const metrics = useMemo(
    () => getCreatorMetrics(presets ?? [], renderJobs ?? []),
    [presets, renderJobs]
  );

  if (isLoading || !user || presets === undefined || renderJobs === undefined) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading analytics...
      </div>
    );
  }

  const chartPresets = metrics.topPresets.slice(0, 6);
  const maxViews = Math.max(...chartPresets.map((preset) => preset.viewCount ?? 0), 1);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Real metrics derived from your current preset catalog and render history.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Views</CardTitle>
            <Eye className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalViews.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Downloads</CardTitle>
            <Download className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalDownloads.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Forks</CardTitle>
            <GitFork className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalClones.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Downloads</CardTitle>
            <TrendingUp className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.averageDownloads.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg text-foreground">Top Preset Reach</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {chartPresets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-zinc-950/60 p-8 text-center text-sm text-muted-foreground">
              Publish a preset to start collecting creator analytics.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex h-64 items-end gap-3">
                {chartPresets.map((preset) => {
                  const height = Math.max(
                    16,
                    ((preset.viewCount ?? 0) / maxViews) * 100
                  );

                  return (
                    <div key={preset._id} className="flex flex-1 flex-col items-center gap-3">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-xl border border-amber-500/30 bg-gradient-to-t from-amber-500/30 to-amber-400/10"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="w-full text-center">
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {preset.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {(preset.viewCount ?? 0).toLocaleString()} views
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {chartPresets.map((preset) => (
                  <div
                    key={`${preset._id}-summary`}
                    className="rounded-2xl border border-border bg-zinc-950/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium text-foreground">{preset.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          preset.status === "published"
                            ? "border-green-500/30 text-green-400"
                            : "border-zinc-700 text-muted-foreground"
                        }
                      >
                        {preset.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{(preset.downloads ?? 0).toLocaleString()} downloads</span>
                      <span>{(preset.voteScore ?? 0).toLocaleString()} vote score</span>
                      <span>{(preset.cloneCount ?? 0).toLocaleString()} forks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
