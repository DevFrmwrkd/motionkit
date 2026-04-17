"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Loader2, ArrowUp } from "lucide-react";
import { getOrCreateClientId } from "@/lib/feedback-client";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function FeedbackDetailDialog({
  feedbackId,
  onClose,
}: {
  feedbackId: Id<"feedback"> | null;
  onClose: () => void;
}) {
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const { user } = useCurrentUser();

  const clientId =
    typeof window !== "undefined" ? getOrCreateClientId() : undefined;
  const row = useQuery(
    api.feedback.get,
    feedbackId ? { id: feedbackId, clientId } : "skip"
  );
  const comments = useQuery(
    api.feedback.listComments,
    feedbackId ? { feedbackId } : "skip"
  );
  const addComment = useMutation(api.feedback.comment);
  const vote = useMutation(api.feedback.vote);
  const setStatus = useMutation(api.feedback.setStatus);

  const isAdmin = user?.role === "admin";

  const handleComment = async () => {
    if (!feedbackId || commentBody.trim().length < 1) return;
    setPosting(true);
    try {
      await addComment({
        feedbackId,
        body: commentBody.trim(),
        clientId: getOrCreateClientId(),
      });
      setCommentBody("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={feedbackId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {row?.title ?? "Loading…"}
          </DialogTitle>
        </DialogHeader>

        {!row ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Badge className="bg-zinc-800 text-zinc-300 border-0">
                {row.kind}
              </Badge>
              <Badge className="bg-zinc-800 text-zinc-300 border-0">
                {row.status}
              </Badge>
              <span>· {row.authorLabel ?? "Anonymous"}</span>
              {row.pagePath && <code className="text-zinc-600">{row.pagePath}</code>}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void vote({
                    feedbackId: row._id,
                    clientId: getOrCreateClientId(),
                  })
                }
                className={`ml-auto h-7 gap-1 ${
                  row.hasVoted
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                <ArrowUp className="size-3" />
                {row.upvotes}
              </Button>
            </div>

            {row.body && (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                {row.body}
              </p>
            )}

            {row.screenshotUrl && (
              <div className="relative h-80 w-full overflow-hidden rounded-md border border-zinc-800">
                <Image
                  src={row.screenshotUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            )}

            {isAdmin && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-400">
                  Admin: change status
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "new",
                      "triaged",
                      "approved",
                      "in-progress",
                      "shipped",
                      "wontfix",
                    ] as const
                  ).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void setStatus({ feedbackId: row._id, status: s })
                      }
                      disabled={row.status === s}
                      className="h-7 border-zinc-800 text-xs"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="border-t border-zinc-800 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-zinc-200">
                Comments ({row.commentCount})
              </h4>
              <div className="space-y-3">
                {comments?.map((c) => (
                  <div
                    key={c._id}
                    className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="font-medium text-zinc-400">
                        {c.authorLabel ?? "Anonymous"}
                      </span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                      {c.body}
                    </p>
                  </div>
                ))}
                {comments?.length === 0 && (
                  <p className="text-xs text-zinc-500">No comments yet.</p>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <Textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                  className="bg-zinc-900 border-zinc-800 min-h-[80px]"
                />
                <Button
                  onClick={() => void handleComment()}
                  disabled={posting || commentBody.trim().length < 1}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                >
                  {posting ? (
                    <Loader2 className="size-3 mr-2 animate-spin" />
                  ) : null}
                  Post
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
