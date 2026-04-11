"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  /** Button element to clone as the trigger (e.g. <Button ...>). */
  trigger: ReactElement;
  /** Trigger content — icon + label. */
  triggerChildren?: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling for the confirm button. */
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

/**
 * Consistent confirm dialog to replace ad-hoc window.confirm() calls.
 *
 * The trigger is rendered through base-ui's `render` prop pattern so the
 * caller's <Button> is reused as the dialog trigger without a wrapping span.
 */
export function ConfirmDialog({
  trigger,
  triggerChildren,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsPending(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerChildren}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={isPending}
            className={
              destructive
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            }
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
