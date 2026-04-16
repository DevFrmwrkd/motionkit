"use client";

/**
 * Review queue page. Lists presets in pending-review + rejected +
 * test-rendering buckets, each with an inline approve/reject/archive
 * action bar. Clicking a row drills into the detail view.
 */

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ReviewQueuePage() {
  const queue = useQuery(api.admin.reviewQueue, {});
  const approve = useMutation(api.presetReview.adminApprove);
  const reject = useMutation(api.presetReview.adminReject);
  const archive = useMutation(api.presetReview.adminArchive);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function doApprove(id: Id<"presets">) {
    setBusyId(id);
    try {
      await approve({ presetId: id });
      toast.success("Approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doReject(id: Id<"presets">) {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    setBusyId(id);
    try {
      await reject({ presetId: id, reason });
      toast.success("Rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doArchive(id: Id<"presets">) {
    const reason = prompt("Reason for archive (optional):") ?? undefined;
    setBusyId(id);
    try {
      await archive({ presetId: id, reason });
      toast.success("Archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setBusyId(null);
    }
  }

  if (queue === undefined) {
    return <div className="text-sm text-zinc-500">Loading review queue…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Review queue</h1>
      </header>

      <Section title={`Pending review (${queue.pending.length})`}>
        {queue.pending.length === 0 ? (
          <Empty>No presets waiting on review.</Empty>
        ) : (
          queue.pending.map((preset) => (
            <RowCard
              key={preset._id}
              preset={preset}
              busy={busyId === preset._id}
              onApprove={() => doApprove(preset._id)}
              onReject={() => doReject(preset._id)}
              onArchive={() => doArchive(preset._id)}
            />
          ))
        )}
      </Section>

      <Section title={`Test rendering (${queue.testRendering.length})`}>
        {queue.testRendering.length === 0 ? (
          <Empty>No test renders in flight.</Empty>
        ) : (
          queue.testRendering.map((preset) => (
            <RowCard
              key={preset._id}
              preset={preset}
              busy={busyId === preset._id}
              showActions={false}
              onApprove={() => {}}
              onReject={() => {}}
              onArchive={() => {}}
            />
          ))
        )}
      </Section>

      <Section title={`Rejected (${queue.rejected.length})`}>
        {queue.rejected.length === 0 ? (
          <Empty>No rejected presets.</Empty>
        ) : (
          queue.rejected.map((preset) => (
            <RowCard
              key={preset._id}
              preset={preset}
              busy={busyId === preset._id}
              variant="rejected"
              onApprove={() => {}}
              onReject={() => {}}
              onArchive={() => doArchive(preset._id)}
              showApprove={false}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-zinc-500">{children}</div>;
}

function RowCard({
  preset,
  busy,
  variant,
  onApprove,
  onReject,
  onArchive,
  showActions = true,
  showApprove = true,
}: {
  preset: {
    _id: Id<"presets">;
    name: string;
    category: string;
    author?: string | undefined;
    reviewState?: string | undefined | null;
    rejectedReason?: string | undefined | null;
  };
  busy: boolean;
  variant?: "rejected";
  onApprove: () => void;
  onReject: () => void;
  onArchive: () => void;
  showActions?: boolean;
  showApprove?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border p-3 ${
        variant === "rejected"
          ? "border-red-900/50 bg-red-950/20"
          : "border-zinc-800 bg-zinc-950/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <Link
          href={`/p/${preset._id}`}
          className="truncate font-medium text-zinc-100 hover:text-violet-300"
        >
          {preset.name}
        </Link>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
          <span>{preset.category}</span>
          <span>·</span>
          <span>{preset.author ?? "unknown"}</span>
          {preset.reviewState ? (
            <>
              <span>·</span>
              <Badge variant="outline" className="h-5 text-[10px]">
                {preset.reviewState}
              </Badge>
            </>
          ) : null}
        </div>
        {preset.rejectedReason ? (
          <div className="mt-1 text-xs text-red-300">
            {preset.rejectedReason}
          </div>
        ) : null}
      </div>
      {showActions ? (
        <div className="flex shrink-0 gap-2">
          {showApprove ? (
            <Button
              size="sm"
              onClick={onApprove}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Approve
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={busy || variant === "rejected"}
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onArchive}
            disabled={busy}
          >
            Archive
          </Button>
        </div>
      ) : null}
    </div>
  );
}
