"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SubmitFeedbackDialog } from "@/components/feedback/SubmitFeedbackDialog";
import { FeedbackCard } from "@/components/feedback/FeedbackCard";
import { FeedbackDetailDialog } from "@/components/feedback/FeedbackDetailDialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { getOrCreateClientId } from "@/lib/feedback-client";

type Kind = "bug" | "improvement" | "micro";
type Sort = "top" | "new";

const KIND_FILTERS: { value: Kind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bug", label: "Bugs" },
  { value: "improvement", label: "Ideas" },
  { value: "micro", label: "Micro" },
];

export default function FeedbackPage() {
  const [kindFilter, setKindFilter] = useState<Kind | "all">("all");
  const [sort, setSort] = useState<Sort>("top");
  const [openId, setOpenId] = useState<Id<"feedback"> | null>(null);

  const clientId =
    typeof window !== "undefined" ? getOrCreateClientId() : undefined;

  const rows = useQuery(api.feedback.list, {
    kind: kindFilter === "all" ? undefined : kindFilter,
    sort,
    clientId,
  });

  const counts = useMemo(() => {
    if (!rows) return { all: 0, bug: 0, improvement: 0, micro: 0 };
    return {
      all: rows.length,
      bug: rows.filter((r) => r.kind === "bug").length,
      improvement: rows.filter((r) => r.kind === "improvement").length,
      micro: rows.filter((r) => r.kind === "micro").length,
    };
  }, [rows]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-100">
              <MessageSquare className="size-6 text-amber-500" />
              Feedback
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Report bugs, suggest ideas, vote on what matters. Approved items
              become GitHub issues.
            </p>
          </div>
          <SubmitFeedbackDialog />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-1">
            {KIND_FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? counts.all
                  : counts[f.value as Kind];
              const active = kindFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setKindFilter(f.value)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-amber-500 text-zinc-950"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-1">
            {(["top", "new"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  sort === s
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s === "top" ? "Top" : "New"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {rows === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-zinc-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
            <MessageSquare className="mx-auto mb-3 size-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">No feedback yet.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Be the first to report something.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <FeedbackCard
                key={row._id}
                row={row}
                onOpen={(id) => setOpenId(id)}
              />
            ))}
          </div>
        )}
      </div>

      <FeedbackDetailDialog
        feedbackId={openId}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
