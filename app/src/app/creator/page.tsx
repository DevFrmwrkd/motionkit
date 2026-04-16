"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getCreatorMetrics, formatCurrency } from "@/lib/creator-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  TrendingUp,
  DollarSign,
  Eye,
  Film,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";

export default function CreatorOverview() {
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
        Loading creator overview...
      </div>
    );
  }

  const stats = [
    { label: "Total Views", value: metrics.totalViews.toLocaleString(), icon: Eye },
    {
      label: "Downloads",
      value: metrics.totalDownloads.toLocaleString(),
      icon: Download,
    },
    {
      label: "Est. Gross Revenue",
      value: formatCurrency(metrics.estimatedRevenue),
      icon: DollarSign,
    },
    { label: "Published Presets", value: metrics.publishedCount, icon: Film },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Creator Overview
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Track how your presets are performing and move drafts into the marketplace.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/create">
            <Button variant="outline" className="border-border text-foreground hover:bg-accent">
              <Sparkles className="mr-2 size-4" />
              Create Preset
            </Button>
          </Link>
          <Link href="/creator/upload">
            <Button className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400">
              <Upload className="mr-2 size-4" />
              Publish Listing
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <CardTitle className="text-lg text-foreground">Top Performing Presets</CardTitle>
            <Link href="/creator/analytics">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View analytics
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {metrics.topPresets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-zinc-950/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">No creator presets yet.</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Start in Create or Import, then publish the preset from Creator Studio.
                </p>
              </div>
            ) : (
              metrics.topPresets.slice(0, 5).map((preset) => (
                <div
                  key={preset._id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-zinc-950/70 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{preset.name}</h3>
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
                    <p className="mt-1 text-sm text-muted-foreground">{preset.category}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{(preset.viewCount ?? 0).toLocaleString()} views</span>
                      <span>{(preset.downloads ?? 0).toLocaleString()} downloads</span>
                      <span>{(preset.voteScore ?? 0).toLocaleString()} vote score</span>
                    </div>
                  </div>
                  <Link href={`/creator/upload?id=${preset._id}`}>
                    <Button className="bg-muted text-foreground hover:bg-zinc-700">
                      Edit listing
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-lg text-foreground">Catalog Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-2xl border border-border bg-zinc-950/70 p-4">
              <p className="text-sm text-muted-foreground">Draft presets</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{metrics.draftCount}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Drafts are private until you publish them from the listing editor.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-zinc-950/70 p-4">
              <p className="text-sm text-muted-foreground">Premium presets</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{metrics.premiumCount}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Revenue is currently estimated from price x download count.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-zinc-950/70 p-4">
              <p className="text-sm text-muted-foreground">Completed renders</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{metrics.completedRenders}</p>
              <p className="mt-2 flex items-center text-xs text-muted-foreground">
                <TrendingUp className="mr-1 size-3 text-amber-500" />
                {metrics.failedRenders} failed render
                {metrics.failedRenders === 1 ? "" : "s"} captured in history
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
