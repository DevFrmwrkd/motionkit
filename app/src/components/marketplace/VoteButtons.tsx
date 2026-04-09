"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface VoteButtonsProps {
  presetId: string;
  userId: string | null | undefined;
  currentVote: number; // -1, 0, or 1
  voteScore: number;
  onVote: (presetId: string, value: number) => void;
}

export function VoteButtons({
  presetId,
  userId,
  currentVote,
  voteScore,
  onVote,
}: VoteButtonsProps) {
  const handleVote = (e: React.MouseEvent, value: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      toast.info("Sign in to vote");
      return;
    }
    onVote(presetId, value);
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={(e) => handleVote(e, 1)}
        className={`rounded p-0.5 transition-colors ${
          currentVote === 1
            ? "text-amber-500 bg-amber-500/10"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
        }`}
        aria-label="Upvote"
      >
        <ChevronUp className="size-5" />
      </button>
      <span
        className={`text-sm font-semibold tabular-nums ${
          voteScore > 0
            ? "text-amber-500"
            : voteScore < 0
              ? "text-red-400"
              : "text-zinc-400"
        }`}
      >
        {voteScore}
      </span>
      <button
        onClick={(e) => handleVote(e, -1)}
        className={`rounded p-0.5 transition-colors ${
          currentVote === -1
            ? "text-amber-500 bg-amber-500/10"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
        }`}
        aria-label="Downvote"
      >
        <ChevronDown className="size-5" />
      </button>
    </div>
  );
}
