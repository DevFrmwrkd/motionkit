"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const collections = useQuery(api.collections.listByUser, { userId });
  const createCollection = useMutation(api.collections.create);

  const handleCreate = async () => {
    try {
      await createCollection({
        name: `Collection ${(collections?.length ?? 0) + 1}`,
        userId,
        presetIds: [],
      });
      toast.success("Collection created");
    } catch {
      toast.error("Failed to create collection");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Collections</h1>
          <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
            <Plus className="w-4 h-4 mr-2" /> New Collection
          </Button>
        </div>

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
              <Card key={col._id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Folder className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold text-zinc-200">{col.name}</h3>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {col.presetIds.length} preset{col.presetIds.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
