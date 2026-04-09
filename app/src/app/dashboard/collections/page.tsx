"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Folder, Plus, Loader2, ArrowLeft, Trash2, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function CollectionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return <CollectionsContent userId={user._id as Id<"users">} />;
}

function CollectionsContent({ userId }: { userId: Id<"users"> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collections = useQuery(api.collections.listByUser, { userId });
  const presets = useQuery(api.presets.list, { viewerId: userId });
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

  const handleDelete = async (collectionId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setIsDeletingId(collectionId);
      await removeCollection({ id: collectionId as Id<"collections"> });
      if (activeCollectionId === collectionId) {
        router.replace("/dashboard/collections");
      }
      toast.success("Collection deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete collection");
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeCollection ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold truncate">{activeCollection.name}</h1>
                  <p className="text-sm text-zinc-500">
                    {activeCollection.presetIds.length} preset
                    {activeCollection.presetIds.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => void handleDelete(activeCollection._id, activeCollection.name)}
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
            </div>

            {activeCollection.presetIds.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <p className="text-zinc-500">This collection is empty</p>
                <p className="text-sm text-zinc-600">
                  Add presets elsewhere in the app, then use collections to group them.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCollection.presetIds.map((presetId) => {
                  const preset = presetsById.get(presetId);

                  if (!preset) {
                    return (
                      <Card key={presetId} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <p className="text-sm text-zinc-500">Preset unavailable</p>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card key={preset._id} className="bg-zinc-900 border-zinc-800">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Folder className="w-5 h-5 text-violet-400" />
                          <div className="min-w-0">
                            <h3 className="font-semibold text-zinc-200 truncate">{preset.name}</h3>
                            <p className="text-xs text-zinc-500 truncate">{preset.category}</p>
                          </div>
                        </div>
                        {preset.description && (
                          <p className="text-sm text-zinc-500 line-clamp-2">{preset.description}</p>
                        )}
                        <Link href={`/workstation?presetId=${preset._id}`}>
                          <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
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
              <h1 className="text-2xl font-bold">Collections</h1>
              <Button
                onClick={() => setIsCreating((current) => !current)}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" /> New Collection
              </Button>
            </div>

            {isCreating && (
              <Card className="mb-6 bg-zinc-900 border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-semibold text-zinc-100">Create collection</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
                    <Input
                      value={collectionName}
                      onChange={(e) => setCollectionName(e.target.value)}
                      placeholder={`Collection ${(collections?.length ?? 0) + 1}`}
                      className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    />
                    <Textarea
                      value={collectionDescription}
                      onChange={(e) => setCollectionDescription(e.target.value)}
                      placeholder="Optional description for this grouping"
                      className="min-h-[92px] bg-zinc-950 border-zinc-800 text-zinc-100"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        setCollectionName("");
                        setCollectionDescription("");
                      }}
                      className="border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void handleCreate()}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                    >
                      Create Collection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {collections === undefined ? (
              <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" /></div>
            ) : collections.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <p className="text-zinc-500">No collections yet</p>
                <p className="text-sm text-zinc-600">Create collections to organize your saved presets</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map((col) => (
                  <Card
                    key={col._id}
                    className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-900/80 transition-colors"
                    onClick={() => handleOpenCollection(col._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Folder className="w-5 h-5 text-violet-400 shrink-0" />
                          <h3 className="font-semibold text-zinc-200 truncate">{col.name}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(col._id, col.name);
                          }}
                          disabled={isDeletingId === col._id}
                          className="h-8 w-8 text-zinc-500 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {isDeletingId === col._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-zinc-500">
                        {col.presetIds.length} preset{col.presetIds.length !== 1 ? "s" : ""}
                      </p>
                      {col.description && (
                        <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{col.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
