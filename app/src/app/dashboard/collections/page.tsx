"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Plus, Loader2, ArrowLeft, Trash2, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { GlassCreateForm } from "@/components/shared/GlassCreateForm";

export default function CollectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const userId = user?._id as Id<"users"> | undefined;

  const collections = useQuery(api.collections.listByUser, userId ? { userId } : "skip");
  const presets = useQuery(api.presets.list, userId ? { viewerId: userId } : "skip");
  const createCollection = useMutation(api.collections.create);
  const removeCollection = useMutation(api.collections.remove);
  const activeCollectionId = searchParams.get("id");
  const [isCreating, setIsCreating] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const presetsById = useMemo(
    () => new Map((presets ?? []).map((preset) => [preset._id, preset])),
    [presets]
  );
  const activeCollection = collections?.find(
    (collection) => collection._id === activeCollectionId
  );

  const handleCreate = async () => {
    if (!userId) return;
    const trimmedName =
      collectionName.trim() || `Collection ${(collections?.length ?? 0) + 1}`;
    const trimmedDescription = collectionDescription.trim();

    try {
      await createCollection({
        name: trimmedName,
        userId,
        description: trimmedDescription || undefined,
        presetIds: [],
      });
      toast.success("Collection created");
      setCollectionName("");
      setCollectionDescription("");
      setIsCreating(false);
    } catch {
      toast.error("Failed to create collection");
    }
  };

  const handleDelete = async (collectionId: string) => {
    try {
      setIsDeletingId(collectionId);
      await removeCollection({ id: collectionId as Id<"collections"> });
      if (activeCollectionId === collectionId) {
        router.replace("/dashboard/collections");
      }
      toast.success("Collection deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete collection");
      throw error;
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleOpenCollection = (collectionId: string) => {
    router.push(`/dashboard/collections?id=${collectionId}`);
  };

  const handleBack = () => {
    router.push("/dashboard/collections");
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
      {activeCollection ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-border text-muted-foreground hover:bg-accent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold truncate">{activeCollection.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {activeCollection.presetIds.length} preset
                  {activeCollection.presetIds.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  disabled={isDeletingId === activeCollection._id}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                >
                  {isDeletingId === activeCollection._id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              }
              title={`Delete "${activeCollection.name}"?`}
              description="This removes the collection but preserves the presets inside it. This cannot be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={() => handleDelete(activeCollection._id)}
            />
          </div>

          {activeCollection.presetIds.length === 0 ? (
            <EmptyState
              icon={Folder}
              title="This collection is empty"
              description="Use the marketplace or your library to add presets to this collection."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeCollection.presetIds.map((presetId) => {
                const preset = presetsById.get(presetId);

                if (!preset) {
                  return (
                    <Card key={presetId} className="bg-card border-border">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Preset unavailable</p>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card key={preset._id} className="bg-card border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5 text-violet-400" />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{preset.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{preset.category}</p>
                        </div>
                      </div>
                      {preset.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{preset.description}</p>
                      )}
                      <Link href={`/workstation?presetId=${preset._id}`}>
                        <Button className="w-full bg-muted hover:bg-zinc-700 text-foreground">
                          Open in Workstation
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Collections</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Group related presets into themed folders.
              </p>
            </div>
            <Button
              onClick={() => setIsCreating((current) => !current)}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" /> New Collection
            </Button>
          </div>

          <GlassCreateForm
            open={isCreating}
            icon={FolderPlus}
            accent="violet"
            title="Create collection"
            nameValue={collectionName}
            onNameChange={setCollectionName}
            namePlaceholder={`Collection ${(collections?.length ?? 0) + 1}`}
            descriptionValue={collectionDescription}
            onDescriptionChange={setCollectionDescription}
            descriptionPlaceholder="Optional description for this grouping"
            submitLabel="Create Collection"
            onSubmit={() => void handleCreate()}
            onCancel={() => {
              setIsCreating(false);
              setCollectionName("");
              setCollectionDescription("");
            }}
          />

          {collections === undefined ? (
            <div className="py-20 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <EmptyState
              icon={FolderPlus}
              title="No collections yet"
              description="Collections are handy folders for grouping presets you use together — per project, per client, per vibe."
              action={
                <Button
                  onClick={() => setIsCreating(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create your first collection
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col) => (
                <Card
                  key={col._id}
                  className="bg-card border-border cursor-pointer hover:border-border/70 hover:bg-accent/30 transition-colors group"
                  onClick={() => handleOpenCollection(col._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4 text-violet-400" />
                        </div>
                        <h3 className="font-semibold text-foreground truncate">
                          {col.name}
                        </h3>
                      </div>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeletingId === col._id}
                            onClick={(event) => event.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-300 hover:bg-red-500/10"
                          >
                            {isDeletingId === col._id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-1" />
                            )}
                            Delete
                          </Button>
                        }
                        title={`Delete "${col.name}"?`}
                        description="This removes the collection but preserves the presets inside it. This cannot be undone."
                        confirmLabel="Delete"
                        destructive
                        onConfirm={() => handleDelete(col._id)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {col.presetIds.length} preset
                      {col.presetIds.length !== 1 ? "s" : ""}
                    </p>
                    {col.description && (
                      <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                        {col.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

