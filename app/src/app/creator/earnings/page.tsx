"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatCurrency, getCreatorMetrics } from "@/lib/creator-metrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, DollarSign, Download, Loader2, Sparkles, Tag } from "lucide-react";

export default function CreatorEarnings() {
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
        Loading earnings...
      </div>
    );
  }

  const premiumDownloads = metrics.revenueBreakdown.reduce(
    (sum, preset) => sum + (preset.downloads ?? 0),
    0
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Revenue is currently estimated from marketplace pricing and download counts. Payouts are not wired yet.
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Coming in Phase 4–5</h3>
            <p className="text-sm text-muted-foreground">
              This page shows estimated metrics based on your preset pricing and downloads. Real payout infrastructure and payment processing will be implemented in upcoming phases. In the meantime, track your analytics and adjust your preset pricing in the Publish section.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-amber-400 bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800">
              Estimated Gross
            </CardTitle>
            <DollarSign className="size-5 text-zinc-900" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-zinc-950">
              {formatCurrency(metrics.estimatedRevenue)}
            </div>
            <p className="mt-2 text-sm text-zinc-800/80">
              Based on premium preset price × download count.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Premium Downloads
            </CardTitle>
            <Download className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {premiumDownloads.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {metrics.premiumCount} premium preset
              {metrics.premiumCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft Monetization
            </CardTitle>
            <Tag className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.draftCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft presets still need listing settings before they can earn.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div>
            <CardTitle className="text-lg text-foreground">Revenue Breakdown</CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              Estimated gross by premium preset.
            </CardDescription>
          </div>
          <Link href="/creator/upload">
            <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-accent">
              <Sparkles className="mr-2 size-4" />
              Update pricing
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.revenueBreakdown.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No premium listings yet.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Open a preset in the publish screen and add pricing to start estimating revenue.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {metrics.revenueBreakdown.map((preset) => (
                <div
                  key={preset._id}
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-accent md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-foreground">{preset.name}</h3>
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
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Price {formatCurrency(preset.price ?? 0)}</span>
                      <span>{(preset.downloads ?? 0).toLocaleString()} downloads</span>
                      <span>{(preset.viewCount ?? 0).toLocaleString()} views</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-lg font-bold text-green-400">
                      {formatCurrency(preset.revenue)}
                    </div>
                    <Link
                      href={`/creator/upload?id=${preset._id}`}
                      className="mt-1 inline-block text-xs text-amber-500 hover:text-amber-400"
                    >
                      Edit listing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
