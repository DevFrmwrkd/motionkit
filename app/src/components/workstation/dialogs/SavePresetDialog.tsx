"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface SavePresetDialogProps {
  userId: Id<"users">;
  presetId: Id<"presets">;
  presetName: string;
  customProps: Record<string, unknown>;
  triggerClassName?: string;
  onSaved?: (savedPresetId: Id<"savedPresets">) => void;
}

export function SavePresetDialog({
  userId,
  presetId,
  presetName,
  customProps,
  triggerClassName,
  onSaved,
}: SavePresetDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`My ${presetName}`);
  const [isSaving, setIsSaving] = useState(false);
  const createSavedPreset = useMutation(api.savedPresets.create);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Please enter a name");
      return;
    }

    try {
      setIsSaving(true);
      const savedPresetId = await createSavedPreset({
        userId,
        presetId,
        name: trimmedName,
        customProps: JSON.stringify(customProps),
      });
      toast.success("Saved to your library", {
        description: `"${trimmedName}" is now available in your saved items.`,
      });
      setOpen(false);
      onSaved?.(savedPresetId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={triggerClassName ?? "hidden sm:flex border-border text-muted-foreground hover:bg-accent hover:text-foreground bg-card shadow-sm"}
          />
        }
      >
        <Save className="w-4 h-4 mr-2" /> Save Preset
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Save Variant</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Save your current settings for this preset so you can reuse them later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Variant name"
              className="bg-card border-border text-foreground focus-visible:ring-amber-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-border text-muted-foreground hover:bg-accent hover:text-foreground">
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
