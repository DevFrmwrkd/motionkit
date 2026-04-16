"use client";

/**
 * Review queue page. Lists presets in pending-review + rejected +
 * test-rendering buckets, each with an inline approve/reject/archive
 * action bar. Clicking a row drills into the detail view.
 *
 * Reject / archive prompt the admin for a reason through an accessible
 * in-app dialog (no `window.prompt` — breaks the dark theme, no
 * character limit, not mobile-friendly, not copy-editable).
 */

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Matches the server-side cap on `reason` — see
 * MAX_MODERATION_REASON_LENGTH in `convex/lib/moderation.ts`. Kept in sync
 * manually; a longer string will be rejected by the mutation.
 */
const MAX_REASON_LENGTH = 1000;

type ReasonDialogAction = "reject" | "archive";

interface ReasonDialogState {
  action: ReasonDialogAction;
  presetId: Id<"presets">;
  presetName: string;
}

export default function ReviewQueuePage() {
  const queue = useQuery(api.admin.reviewQueue, {});
  const approve = useMutation(api.presetReview.adminApprove);
  const reject = useMutation(api.presetReview.adminReject);
  const archive = useMutation(api.presetReview.adminArchive);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonDialog, setReasonDialog] = useState<ReasonDialogState | null>(
    null
  );
  const [reasonDraft, setReasonDraft] = useState("");
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

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

  function openReasonDialog(
    action: ReasonDialogAction,
    presetId: Id<"presets">,
    presetName: string
  ) {
    setReasonDialog({ action, presetId, presetName });
    setReasonDraft("");
  }

  async function submitReasonDialog() {
    if (!reasonDialog) return;
    const trimmed = reasonDraft.trim();
    if (reasonDialog.action === "reject" && trimmed.length === 0) {
      toast.error("Rejection requires a reason");
      return;
    }

    setReasonSubmitting(true);
    setBusyId(reasonDialog.presetId);
    try {
      if (reasonDialog.action === "reject") {
        await reject({ presetId: reasonDialog.presetId, reason: trimmed });
        toast.success("Rejected");
      } else {
        // Archive reason is optional — send undefined when blank so the
        // server doesn't store an empty string.
        await archive({
          presetId: reasonDialog.presetId,
          reason: trimmed.length > 0 ? trimmed : undefined,
        });
        toast.success("Archived");
      }
      setReasonDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setReasonSubmitting(false);
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
              onReject={() =>
                openReasonDialog("reject", preset._id, preset.name)
              }
              onArchive={() =>
                openReasonDialog("archive", preset._id, preset.name)
              }
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
              onArchive={() =>
                openReasonDialog("archive", preset._id, preset.name)
              }
              showApprove={false}
            />
          ))
        )}
      </Section>

      <Dialog
        open={reasonDialog !== null}
        onOpenChange={(open) => {
          if (!open && !reasonSubmitting) {
            setReasonDialog(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonDialog?.action === "reject" ? "Reject preset" : "Archive preset"}
            </DialogTitle>
            <DialogDescription>
              {reasonDialog?.action === "reject"
                ? "The creator will see this reason. Be specific — vague rejections cause re-submissions."
                : "Optional note to accompany the archive action. Shown in the audit log."}
              {reasonDialog ? (
                <>
                  {" "}
                  <span className="text-zinc-300">{reasonDialog.presetName}</span>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="moderation-reason">
              {reasonDialog?.action === "reject" ? "Reason" : "Note"}
            </Label>
            <Textarea
              id="moderation-reason"
              autoFocus
              value={reasonDraft}
              onChange={(e) =>
                setReasonDraft(e.target.value.slice(0, MAX_REASON_LENGTH))
              }
              placeholder={
                reasonDialog?.action === "reject"
                  ? "e.g. Preset fails to render text longer than 60 characters; please add an overflow guard."
                  : "Optional. e.g. Archived per creator request 2026-04-12."
              }
              rows={5}
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>
                {reasonDialog?.action === "reject"
                  ? "Required"
                  : "Optional"}
              </span>
              <span>
                {reasonDraft.length} / {MAX_REASON_LENGTH}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReasonDialog(null)}
              disabled={reasonSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReasonDialog}
              disabled={
                reasonSubmitting ||
                (reasonDialog?.action === "reject" &&
                  reasonDraft.trim().length === 0)
              }
              className={
                reasonDialog?.action === "reject"
                  ? "bg-red-600 hover:bg-red-500"
                  : undefined
              }
            >
              {reasonSubmitting
                ? "Working…"
                : reasonDialog?.action === "reject"
                  ? "Reject preset"
                  : "Archive preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
