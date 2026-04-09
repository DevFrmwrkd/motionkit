"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatCurrency, getCreatorMetrics } from "@/lib/creator-metrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Download, Loader2, Sparkles, Tag } from "lucide-react";

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
      <div className="flex items-center justify-center py-24 text-zinc-500">
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Earnings</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Revenue is currently estimated from marketplace pricing and download counts. Payouts are not wired yet.
        </p>
      </div>

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

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Premium Downloads
            </CardTitle>
            <Download className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {premiumDownloads.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Across {metrics.premiumCount} premium preset
              {metrics.premiumCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Draft Monetization
            </CardTitle>
            <Tag className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{metrics.draftCount}</div>
            <p className="mt-1 text-xs text-zinc-500">
              Draft presets still need listing settings before they can earn.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <CardTitle className="text-lg text-zinc-100">Revenue Breakdown</CardTitle>
            <CardDescription className="mt-1 text-zinc-400">
              Estimated gross by premium preset.
            </CardDescription>
          </div>
          <Link href="/creator/upload">
            <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800">
              <Sparkles className="mr-2 size-4" />
              Update pricing
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.revenueBreakdown.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-400">No premium listings yet.</p>
              <p className="mt-2 text-xs text-zinc-600">
                Open a preset in the publish screen and add pricing to start estimating revenue.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {metrics.revenueBreakdown.map((preset) => (
                <div
                  key={preset._id}
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-zinc-800/40 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-zinc-200">{preset.name}</h3>
                      <Badge
                        variant="outline"
                        className={
                          preset.status === "published"
                            ? "border-green-500/30 text-green-400"
                            : "border-zinc-700 text-zinc-400"
                        }
                      >
                        {preset.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
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
