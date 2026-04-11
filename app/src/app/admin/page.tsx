"use client";

/**
 * Admin overview page — the landing screen for /admin.
 *
 * Shows the headline numbers the moderator wants at a glance:
 *   - Review queue depth (pending + test-rendering)
 *   - Rejected count (presets waiting on author action)
 *   - Broken render alerts in the last 7 days
 *   - Event counts in the last 7 days (views, forks, renders)
 *
 * Deeper drill-ins live on the sub-pages in this route group.
 */

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ListChecks, AlertTriangle } from "lucide-react";

export default function AdminOverviewPage() {
  const overview = useQuery(api.analytics.adminOverview, {});
  const queue = useQuery(api.admin.reviewQueue, {});
  const broken = useQuery(api.admin.brokenRenders, {});

  if (overview === undefined || queue === undefined || broken === undefined) {
    return <div className="text-sm text-zinc-500">Loading admin overview…</div>;
  }

  const renderSuccessRate =
    overview.counts["render-queued"] > 0
      ? Math.round(
          (overview.counts["render-complete"] /
            overview.counts["render-queued"]) *
            100
        )
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Moderation overview</h1>
        <p className="text-sm text-zinc-400">
          Everything below is scoped to the last 7 days unless noted.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Pending review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-zinc-50">
              {overview.pendingReviewCount}
            </div>
            <Link
              href="/admin/review"
              className="mt-1 inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
            >
              Open queue <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-zinc-50">
              {overview.rejectedCount}
            </div>
            <CardDescription className="mt-1 text-xs">
              Awaiting author fix
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Broken renders (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-zinc-50">
              {broken.length}
            </div>
            <Link
              href="/admin/broken-renders"
              className="mt-1 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
            >
              Triage <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event counts (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <EventStat label="Views" value={overview.counts.view} />
            <EventStat label="Previews" value={overview.counts.preview} />
            <EventStat label="Forks" value={overview.counts.fork} />
            <EventStat label="Saves" value={overview.counts.save} />
            <EventStat
              label="Renders queued"
              value={overview.counts["render-queued"]}
            />
            <EventStat
              label="Renders done"
              value={overview.counts["render-complete"]}
            />
            <EventStat
              label="Renders failed"
              value={overview.counts["render-failed"]}
            />
            <EventStat
              label="Render success %"
              value={renderSuccessRate !== null ? `${renderSuccessRate}%` : "—"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              Pipeline snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <PipelineRow label="Test rendering" count={queue.testRendering.length} />
            <PipelineRow label="Pending review" count={queue.pending.length} />
            <PipelineRow label="Rejected" count={queue.rejected.length} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Oldest in queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {queue.pending.slice(0, 5).map((p) => (
              <Link
                key={p._id}
                href={`/admin/review/${p._id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-zinc-300 hover:bg-zinc-900"
              >
                <span className="truncate">{p.name}</span>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {p.reviewState}
                </Badge>
              </Link>
            ))}
            {queue.pending.length === 0 ? (
              <div className="text-xs text-zinc-500">Nothing waiting.</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function PipelineRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 pb-1 last:border-b-0 last:pb-0">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono text-zinc-100">{count}</span>
    </div>
  );
}
