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
import { Film, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProjectsPage() {
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

  return <ProjectsContent userId={user._id as Id<"users">} />;
}

function ProjectsContent({ userId }: { userId: Id<"users"> }) {
  const projects = useQuery(api.projects.listByUser, { userId });
  const createProject = useMutation(api.projects.create);

  const handleCreate = async () => {
    try {
      await createProject({
        name: `Project ${(projects?.length ?? 0) + 1}`,
        userId,
      });
      toast.success("Project created");
    } catch {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        {projects === undefined ? (
          <div className="py-20 text-center text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-zinc-500">No projects yet</p>
            <p className="text-sm text-zinc-600">Create a project to organize your motion graphics</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project._id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Film className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-zinc-200">{project.name}</h3>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {project.presetEntries.length} preset{project.presetEntries.length !== 1 ? "s" : ""}
                  </p>
                  {project.description && (
                    <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{project.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
