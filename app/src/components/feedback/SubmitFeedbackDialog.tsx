"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { usePathname } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bug, Sparkles, MessageSquare, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateClientId } from "@/lib/feedback-client";

type Kind = "bug" | "improvement" | "micro";

export function SubmitFeedbackDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  const generateUploadUrl = useMutation(api.feedback.generateUploadUrl);
  const createFeedback = useMutation(api.feedback.create);

  const reset = () => {
    setKind("bug");
    setTitle("");
    setBody("");
    setFile(null);
  };

  const handleSubmit = async () => {
    if (title.trim().length < 3) {
      toast.error("Title too short (min 3 chars)");
      return;
    }
    setSubmitting(true);
    try {
      let screenshotId: Id<"_storage"> | undefined;
      if (file) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error("Upload failed");
        const json = (await res.json()) as { storageId: Id<"_storage"> };
        screenshotId = json.storageId;
      }

      await createFeedback({
        kind,
        title: title.trim(),
        body: body.trim(),
        screenshotId,
        pagePath: pathname ?? undefined,
        clientId: getOrCreateClientId(),
      });

      toast.success("Feedback submitted — thanks!");
      reset();
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Base UI Dialog doesn't have a Radix-style `asChild` on its Trigger,
  // so wire the opener up by hand: render the caller-supplied trigger
  // (or the default Button) outside the Dialog and flip `open` manually
  // on click. The Dialog is still controlled via open/onOpenChange, so
  // close-on-backdrop and close-on-Esc keep working.
  const triggerEl = trigger ?? (
    <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
      + New Feedback
    </Button>
  );

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {triggerEl}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Share feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Kind selector */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { k: "bug" as const, label: "Bug", Icon: Bug },
                { k: "improvement" as const, label: "Idea", Icon: Sparkles },
                { k: "micro" as const, label: "Micro", Icon: MessageSquare },
              ]
            ).map(({ k, label, Icon }) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex flex-col items-center gap-1 rounded-md border px-3 py-3 text-xs font-medium transition-colors ${
                  kind === k
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary…"
              maxLength={140}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Details (optional)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Steps to reproduce, expected vs actual, extra context…"
              maxLength={5000}
              className="bg-zinc-900 border-zinc-800 min-h-[120px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Screenshot (optional)
            </Label>
            {file ? (
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
                <span className="text-xs text-zinc-300 truncate">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 bg-zinc-900/50 px-3 py-4 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-300">
                <Upload className="size-4" />
                Click to upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {pathname && (
            <p className="text-[11px] text-zinc-500">
              Will be attached to: <code className="text-zinc-400">{pathname}</code>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || title.trim().length < 3}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            >
              {submitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : null}
              Submit
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
