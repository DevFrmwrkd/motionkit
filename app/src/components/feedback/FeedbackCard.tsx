"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  Bug,
  Sparkles,
  MessageSquare,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { getOrCreateClientId } from "@/lib/feedback-client";
import { toast } from "sonner";

type Kind = "bug" | "improvement" | "micro";
type Status =
  | "new"
  | "triaged"
  | "approved"
  | "in-progress"
  | "shipped"
  | "wontfix";

export type FeedbackRow = {
  _id: Id<"feedback">;
  kind: Kind;
  title: string;
  body: string;
  status: Status;
  upvotes: number;
  commentCount: number;
  screenshotUrl: string | null;
  hasVoted: boolean;
  authorLabel?: string;
  pagePath?: string;
  createdAt: number;
  githubIssueUrl?: string;
  githubIssueNumber?: number;
};

const KIND_META: Record<
  Kind,
  { label: string; Icon: typeof Bug; color: string }
> = {
  bug: { label: "Bug", Icon: Bug, color: "text-red-400 bg-red-500/10" },
  improvement: {
    label: "Idea",
    Icon: Sparkles,
    color: "text-violet-400 bg-violet-500/10",
  },
  micro: {
    label: "Micro",
    Icon: MessageSquare,
    color: "text-zinc-300 bg-zinc-800",
  },
};

const STATUS_META: Record<Status, { label: string; color: string }> = {
  new: { label: "New", color: "text-zinc-400 bg-zinc-800" },
  triaged: { label: "Triaged", color: "text-blue-400 bg-blue-500/10" },
  approved: { label: "Approved", color: "text-amber-400 bg-amber-500/10" },
  "in-progress": {
    label: "In progress",
    color: "text-violet-400 bg-violet-500/10",
  },
  shipped: { label: "Shipped", color: "text-emerald-400 bg-emerald-500/10" },
  wontfix: { label: "Won't fix", color: "text-zinc-500 bg-zinc-800" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function FeedbackCard({
  row,
  onOpen,
}: {
  row: FeedbackRow;
  onOpen?: (id: Id<"feedback">) => void;
}) {
  const kindMeta = KIND_META[row.kind];
  const statusMeta = STATUS_META[row.status];
  const vote = useMutation(api.feedback.vote);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await vote({ feedbackId: row._id, clientId: getOrCreateClientId() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Vote failed";
      toast.error(msg);
    }
  };

  return (
    <div
      onClick={() => onOpen?.(row._id)}
      className="group flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer"
    >
      {/* Vote column */}
      <div className="flex flex-col items-center shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => void handleVote(e)}
          className={`h-12 w-12 flex-col gap-0 p-0 ${
            row.hasVoted
              ? "border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          <ArrowUp className="size-4" />
          <span className="text-xs font-semibold">{row.upvotes}</span>
        </Button>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${kindMeta.color} border-0 gap-1`}>
            <kindMeta.Icon className="size-3" />
            {kindMeta.label}
          </Badge>
          <Badge className={`${statusMeta.color} border-0`}>
            {statusMeta.label}
          </Badge>
          {row.githubIssueUrl && (
            <a
              href={row.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
            >
              #{row.githubIssueNumber}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        <h3 className="mt-2 text-sm font-semibold text-zinc-100 line-clamp-2">
          {row.title}
        </h3>

        {row.body && (
          <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{row.body}</p>
        )}

        {row.screenshotUrl && (
          <div className="relative mt-2 h-28 w-full max-w-xs overflow-hidden rounded-md border border-zinc-800">
            <Image
              src={row.screenshotUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
          <span>{row.authorLabel ?? "Anonymous"}</span>
          <span>·</span>
          <span>{timeAgo(row.createdAt)}</span>
          {row.pagePath && (
            <>
              <span>·</span>
              <code className="text-zinc-600">{row.pagePath}</code>
            </>
          )}
          <span className="ml-auto inline-flex items-center gap-1">
            <MessageCircle className="size-3" />
            {row.commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}
