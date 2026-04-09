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
import { Film, Plus, Loader2, ArrowLeft, Trash2, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const projects = useQuery(api.projects.listByUser, { userId });
  const presets = useQuery(api.presets.list, { viewerId: userId });
  const savedPresets = useQuery(api.savedPresets.listByUser, { userId });
  const createProject = useMutation(api.projects.create);
  const removeProject = useMutation(api.projects.remove);
  const activeProjectId = searchParams.get("id");
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const presetsById = useMemo(
    () => new Map((presets ?? []).map((preset) => [preset._id, preset])),
    [presets]
  );
  const savedPresetsById = useMemo(
    () => new Map((savedPresets ?? []).map((preset) => [preset._id, preset])),
    [savedPresets]
  );
  const activeProject = projects?.find((project) => project._id === activeProjectId);

  const handleCreate = async () => {
    const trimmedName = projectName.trim() || `Project ${(projects?.length ?? 0) + 1}`;
    const trimmedDescription = projectDescription.trim();

    try {
      await createProject({
        name: trimmedName,
        userId,
        description: trimmedDescription || undefined,
      });
      toast.success("Project created");
      setProjectName("");
      setProjectDescription("");
      setIsCreating(false);
    } catch {
      toast.error("Failed to create project");
    }
  };

  const handleDelete = async (projectId: string, projectNameToDelete: string) => {
    if (!window.confirm(`Delete "${projectNameToDelete}"? This cannot be undone.`)) {
      return;
    }

    try {
      setIsDeletingId(projectId);
      await removeProject({ id: projectId as Id<"projects"> });
      if (activeProjectId === projectId) {
        router.replace("/dashboard/projects");
      }
      toast.success("Project deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete project");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleOpenProject = (projectId: string) => {
    router.push(`/dashboard/projects?id=${projectId}`);
  };

  const handleBack = () => {
    router.push("/dashboard/projects");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeProject ? (
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
                  <h1 className="text-2xl font-bold truncate">{activeProject.name}</h1>
                  <p className="text-sm text-zinc-500">
                    {activeProject.presetEntries.length} sequence item
                    {activeProject.presetEntries.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => void handleDelete(activeProject._id, activeProject.name)}
                disabled={isDeletingId === activeProject._id}
                className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
              >
                {isDeletingId === activeProject._id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            </div>

            {activeProject.presetEntries.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <p className="text-zinc-500">This project is empty</p>
                <p className="text-sm text-zinc-600">
                  Use the workstation to add presets or saved variants into a sequence.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeProject.presetEntries
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((entry) => {
                    const preset = presetsById.get(entry.presetId);
                    const savedVariant = entry.savedPresetId
                      ? savedPresetsById.get(entry.savedPresetId)
                      : null;

                    return (
                      <Card key={`${entry.presetId}-${entry.order}`} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-500 mb-1">Scene {entry.order + 1}</p>
                            <h3 className="font-semibold text-zinc-200 truncate">
                              {savedVariant?.name ?? preset?.name ?? "Preset unavailable"}
                            </h3>
                            <p className="text-sm text-zinc-500 truncate">
                              {savedVariant ? "Saved variant" : preset?.category ?? "Unknown category"}
                            </p>
                          </div>
                          <Link
                            href={entry.savedPresetId
                              ? `/workstation?savedPresetId=${entry.savedPresetId}`
                              : `/workstation?presetId=${entry.presetId}`}
                          >
                            <Button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
                              Open
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
              <h1 className="text-2xl font-bold">Projects</h1>
              <Button
                onClick={() => setIsCreating((current) => !current)}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" /> New Project
              </Button>
            </div>

            {isCreating && (
              <Card className="mb-6 bg-zinc-900 border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-zinc-100">Create project</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder={`Project ${(projects?.length ?? 0) + 1}`}
                      className="bg-zinc-950 border-zinc-800 text-zinc-100"
                    />
                    <Textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Optional description for the sequence or campaign"
                      className="min-h-[92px] bg-zinc-950 border-zinc-800 text-zinc-100"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        setProjectName("");
                        setProjectDescription("");
                      }}
                      className="border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void handleCreate()}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                    >
                      Create Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <Card
                    key={project._id}
                    className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-900/80 transition-colors"
                    onClick={() => handleOpenProject(project._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Film className="w-5 h-5 text-amber-500 shrink-0" />
                          <h3 className="font-semibold text-zinc-200 truncate">{project.name}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(project._id, project.name);
                          }}
                          disabled={isDeletingId === project._id}
                          className="h-8 w-8 text-zinc-500 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {isDeletingId === project._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
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
          </>
        )}
      </div>
    </div>
  );
}
