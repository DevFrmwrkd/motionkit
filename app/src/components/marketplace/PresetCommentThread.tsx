"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentCategory = "feedback" | "bug" | "feature-request";

interface MockComment {
  id: string;
  author: string;
  body: string;
  category: CommentCategory;
  createdAtLabel: string;
  resolvedInVersion?: string;
}

const MOCK_COMMENTS: MockComment[] = [
  {
    id: "comment-1",
    author: "A. Rivera",
    body: "Caption safe area looks tight on portrait exports. Would love a preset-level note for mobile margins.",
    category: "feedback",
    createdAtLabel: "2h ago",
  },
  {
    id: "comment-2",
    author: "M. Chen",
    body: "Bug on v2: accent line overlaps the title when the headline wraps to three lines.",
    category: "bug",
    createdAtLabel: "Yesterday",
    resolvedInVersion: "v3",
  },
];

const CATEGORY_LABELS: Record<CommentCategory, string> = {
  feedback: "Feedback",
  bug: "Bug",
  "feature-request": "Feature Request",
};

export function PresetCommentThread() {
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Comments</h3>
          <p className="text-[11px] text-muted-foreground">
            Mock thread shell for `presetComments` while schema-sync is pending.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {MOCK_COMMENTS.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-foreground">
                {comment.author}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {CATEGORY_LABELS[comment.category]}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {comment.createdAtLabel}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {comment.body}
            </p>
            {comment.resolvedInVersion ? (
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                Resolved in {comment.resolvedInVersion}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Leave feedback, report a bug, or request a feature..."
          className="min-h-24 text-sm"
        />
        <Button type="button" variant="outline" className="w-full" disabled={!draft.trim()}>
          Add Mock Comment
        </Button>
      </div>
    </div>
  );
}
