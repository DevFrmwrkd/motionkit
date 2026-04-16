"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Save, Copy } from "lucide-react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

/**
 * Format a timestamp as relative time (e.g. "2 days ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

interface VariantsDropdownProps {
  variants: Doc<"savedPresets">[] | undefined;
  onSelectVariant: (variant: Doc<"savedPresets">) => void;
  onSaveNewVariant: (name: string) => Promise<void>;
  currentVariantId?: string;
  isLoading?: boolean;
}

export function VariantsDropdown({
  variants = [],
  onSelectVariant,
  onSaveNewVariant,
  currentVariantId,
  isLoading = false,
}: VariantsDropdownProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newVariantName.trim()) {
      toast.error("Variant name is required");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveNewVariant(newVariantName.trim());
      setNewVariantName("");
      setSaveDialogOpen(false);
      toast.success("Variant saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save variant");
    } finally {
      setIsSaving(false);
    }
  };

  const hasVariants = variants && variants.length > 0;
  const currentVariant = variants?.find((v) => v._id === currentVariantId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="text-xs gap-1 h-7 px-2 text-muted-foreground hover:text-foreground inline-flex items-center shrink-0 rounded border border-transparent hover:border-border hover:bg-accent/50 transition-colors">
          <Copy className="w-3 h-3" />
          {currentVariant ? (
            <span className="max-w-[100px] truncate">{currentVariant.name}</span>
          ) : (
            "Variants"
          )}
          {hasVariants && <ChevronDown className="w-3 h-3 opacity-50 ml-auto" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Header */}
          <div className="px-3 py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Your Variants ({variants?.length ?? 0})
          </div>

          {/* Variant list */}
          {hasVariants ? (
            <>
              {variants.map((variant) => (
                <DropdownMenuItem
                  key={variant._id}
                  onClick={() => onSelectVariant(variant)}
                  className={`flex flex-col gap-1 py-2 px-3 cursor-pointer ${
                    currentVariantId === variant._id
                      ? "bg-accent text-foreground"
                      : ""
                  }`}
                >
                  <div className="text-xs font-medium truncate">{variant.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {variant._creationTime && formatRelativeTime(variant._creationTime)}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              No saved variants yet
            </div>
          )}

          {/* Save new variant button */}
          <DropdownMenuItem
            onClick={() => setSaveDialogOpen(true)}
            className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 gap-2 cursor-pointer"
          >
            <Save className="w-3 h-3" />
            <span>Save as New Variant</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save variant dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Save Current State</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new variant from your current customizations. You can switch between variants
              without reloading.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="variant-name" className="text-xs">
                Variant Name
              </Label>
              <Input
                id="variant-name"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                placeholder="e.g. Dark Theme, Mobile Version"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSave();
                  }
                }}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving || !newVariantName.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save Variant
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
