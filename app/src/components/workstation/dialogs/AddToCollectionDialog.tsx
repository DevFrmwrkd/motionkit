"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FolderHeart, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AddToCollectionDialogProps {
  userId: Id<"users">;
  presetId: Id<"presets">;
  triggerClassName?: string;
  onAdded?: (collectionId: Id<"collections">) => void;
}

/**
 * Mirrors AddToProjectDialog but targets `collections`. Kept as a
 * sibling component rather than a generic "add-to-bucket" because
 * collections and projects have different shapes (projects hold
 * ordered preset *entries* with savedPresetId + order; collections
 * hold a flat `presetIds` array).
 *
 * Violet accent signals the different surface per the design-system
 * ground rules: amber for primary action, violet for brand/special
 * (collections are "my stash," not the render pipeline).
 */
export function AddToCollectionDialog({
  userId,
  presetId,
  triggerClassName,
  onAdded,
}: AddToCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const collections = useQuery(api.collections.listByUser, { userId });
  const createCollection = useMutation(api.collections.create);
  const addPreset = useMutation(api.collections.addPreset);

  const hasNoCollections =
    collections !== undefined && collections.length === 0;
  const nextCollectionName = useMemo(
    () => `Collection ${(collections?.length ?? 0) + 1}`,
    [collections]
  );

  useEffect(() => {
    if (hasNoCollections) setShowCreateForm(true);
  }, [hasNoCollections]);

  const reset = () => {
    setShowCreateForm(false);
    setCollectionId(null);
    setCollectionName("");
  };

  const handleAdd = async () => {
    try {
      setIsSaving(true);

      if (showCreateForm || hasNoCollections) {
        const resolvedName = collectionName.trim() || nextCollectionName;
        const newCollectionId = await createCollection({
          name: resolvedName,
          userId,
          presetIds: [presetId],
        });

        toast.success("Collection created", {
          description: `Created "${resolvedName}" and added this preset.`,
        });
        setOpen(false);
        reset();
        onAdded?.(newCollectionId);
      } else if (collectionId) {
        const target = collections?.find((c) => c._id === collectionId);
        const alreadyIn = target?.presetIds.includes(presetId);
        if (alreadyIn) {
          toast.info("Already in this collection", {
            description: `"${target?.name ?? "Collection"}" already contains this preset.`,
          });
        } else {
          await addPreset({
            collectionId: collectionId as Id<"collections">,
            presetId,
          });
          toast.success("Added to collection", {
            description: `Added to "${target?.name ?? "collection"}".`,
          });
        }
        setOpen(false);
        reset();
        onAdded?.(collectionId as Id<"collections">);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add to collection"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCollectionSelect = (value: string | null) => {
    if (!value) return;
    if (value === "__new") {
      setShowCreateForm(true);
      setCollectionId(null);
    } else {
      setCollectionId(value);
      setShowCreateForm(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={
              triggerClassName ??
              "hidden sm:flex border-border text-muted-foreground hover:bg-accent hover:text-foreground bg-card shadow-sm"
            }
          />
        }
      >
        <FolderHeart className="w-4 h-4 mr-2" /> Add to Collection
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Add Preset to Collection</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Group this preset into a themed folder for easy access later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {hasNoCollections && (
            <div className="grid gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <p className="text-sm font-medium text-foreground">
                No collections yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create your first collection and drop this preset into it.
              </p>
            </div>
          )}

          {!hasNoCollections && (
            <div className="grid gap-2">
              <Label
                htmlFor="collection-select"
                className="text-muted-foreground"
              >
                Select Collection
              </Label>
              <Select
                value={collectionId ?? ""}
                onValueChange={handleCollectionSelect}
              >
                <SelectTrigger className="bg-card border-border text-foreground focus:ring-violet-500">
                  <SelectValue placeholder="Choose a collection" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem
                    value="__new"
                    className="text-violet-400 font-medium"
                  >
                    + Create New Collection
                  </SelectItem>
                  {collections?.map((col) => (
                    <SelectItem key={col._id} value={col._id}>
                      {col.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {col.presetIds.length} preset
                        {col.presetIds.length === 1 ? "" : "s"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(showCreateForm || hasNoCollections) && (
            <div className="grid gap-2">
              <Label
                htmlFor="collection-name"
                className="text-muted-foreground"
              >
                Collection Name
              </Label>
              <Input
                id="collection-name"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder={nextCollectionName}
                className="bg-card border-border text-foreground focus-visible:ring-violet-500"
                autoFocus
              />
            </div>
          )}

          {collections === undefined && !hasNoCollections && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading collections...
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleAdd()}
            disabled={isSaving || (showCreateForm && !collectionName.trim())}
            className="bg-violet-500 hover:bg-violet-400 text-zinc-50 font-semibold"
          >
            {showCreateForm || hasNoCollections
              ? "Create & Add"
              : "Add to Collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
