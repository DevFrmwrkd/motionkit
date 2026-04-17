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
import {
  Film,
  Plus,
  Loader2,
  ArrowLeft,
  Trash2,
  FolderPlus,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { BrandKitEditor } from "@/components/project/BrandKitEditor";
import { GlassCreateForm } from "@/components/shared/GlassCreateForm";
import { MarketplacePreview } from "@/components/marketplace/MarketplacePreview";
import { CategoryOverlay } from "@/components/shared/CategoryOverlay";

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const userId = user?._id as Id<"users"> | undefined;

  const projects = useQuery(api.projects.listByUser, userId ? { userId } : "skip");
  const presets = useQuery(api.presets.list, userId ? { viewerId: userId } : "skip");
  const savedPresets = useQuery(api.savedPresets.listByUser, userId ? { userId } : "skip");
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
    if (!userId) return;
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

  const handleDelete = async (projectId: string) => {
    try {
      setIsDeletingId(projectId);
      await removeProject({ id: projectId as Id<"projects"> });
      if (activeProjectId === projectId) {
        router.replace("/dashboard/projects");
      }
      toast.success("Project deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete project");
      throw error;
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
    <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
      {activeProject ? (
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
                <h1 className="text-2xl font-bold truncate">{activeProject.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {activeProject.presetEntries.length} sequence item
                  {activeProject.presetEntries.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  disabled={isDeletingId === activeProject._id}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                />
              }
              triggerChildren={
                <>
                  {isDeletingId === activeProject._id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </>
              }
              title={`Delete "${activeProject.name}"?`}
              description="This permanently removes the project and its sequence. This cannot be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={() => handleDelete(activeProject._id)}
            />
          </div>

          <BrandKitEditor
            projectId={activeProject._id as Id<"projects">}
            initial={activeProject.brandKit ?? undefined}
          />

          {activeProject.presetEntries.length === 0 ? (
            <EmptyState
              icon={Film}
              title="This project is empty"
              description="Open any preset in the workstation, then use “Add to project” to queue it up as a scene."
              action={
                <Link href="/workstation">
                  <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
                    <Play className="w-4 h-4 mr-2" /> Open workstation
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {activeProject.presetEntries
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((entry) => {
                  const preset = presetsById.get(entry.presetId);
                  const savedVariant = entry.savedPresetId
                    ? savedPresetsById.get(entry.savedPresetId)
                    : null;

                  const canPlay = Boolean(
                    preset?.sourceCode && preset?.inputSchema
                  );
                  const category = preset?.category ?? "full";

                  return (
                    <Card
                      key={`${entry.presetId}-${entry.order}`}
                      className="bg-card border-border hover:border-border/70 transition-colors overflow-hidden"
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="shrink-0 w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono text-xs">
                            {entry.order + 1}
                          </div>

                          {/* Animated preview — matches marketplace card
                              behavior: loops while in viewport, overlay
                              fallback otherwise. */}
                          <div className="relative shrink-0 w-[132px] h-[74px] rounded-md overflow-hidden border border-border bg-zinc-950">
                            {canPlay && preset ? (
                              <MarketplacePreview
                                sourceCode={preset.sourceCode}
                                inputSchema={preset.inputSchema}
                                name={preset.name}
                                description={preset.description}
                                category={category}
                                fps={preset.fps ?? 30}
                                width={preset.width ?? 1920}
                                height={preset.height ?? 1080}
                                durationInFrames={
                                  preset.durationInFrames ?? 90
                                }
                                overlay={
                                  <CategoryOverlay
                                    category={category}
                                    compact
                                  />
                                }
                              />
                            ) : (
                              <CategoryOverlay category={category} compact />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {savedVariant?.name ??
                                preset?.name ??
                                "Preset unavailable"}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {savedVariant
                                ? "Saved variant"
                                : (preset?.category ?? "Unknown category")}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={
                            entry.savedPresetId
                              ? `/workstation?savedPresetId=${entry.savedPresetId}&projectId=${activeProject._id}`
                              : `/workstation?presetId=${entry.presetId}&projectId=${activeProject._id}`
                          }
                        >
                          <Button
                            variant="outline"
                            className="border-border hover:bg-accent"
                          >
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
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Group presets into multi-scene video sequences.
              </p>
            </div>
            <Button
              onClick={() => setIsCreating((current) => !current)}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </div>

          <GlassCreateForm
            open={isCreating}
            icon={FolderPlus}
            accent="amber"
            title="Create project"
            nameValue={projectName}
            onNameChange={setProjectName}
            namePlaceholder={`Project ${(projects?.length ?? 0) + 1}`}
            descriptionValue={projectDescription}
            onDescriptionChange={setProjectDescription}
            descriptionPlaceholder="Optional description for the sequence or campaign"
            submitLabel="Create Project"
            onSubmit={() => void handleCreate()}
            onCancel={() => {
              setIsCreating(false);
              setProjectName("");
              setProjectDescription("");
            }}
          />

          {projects === undefined ? (
            <div className="py-20 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderPlus}
              title="No projects yet"
              description="Projects help you organize presets into multi-scene video sequences. Create one to get started."
              action={
                <Button
                  onClick={() => setIsCreating(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create your first project
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card
                  key={project._id}
                  className="bg-card border-border cursor-pointer hover:border-border/70 hover:bg-accent/30 transition-colors group"
                  onClick={() => handleOpenProject(project._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="font-semibold text-foreground truncate">
                          {project.name}
                        </h3>
                      </div>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isDeletingId === project._id}
                            onClick={(event) => event.stopPropagation()}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-300 hover:bg-red-500/10"
                          />
                        }
                        triggerChildren={
                          isDeletingId === project._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )
                        }
                        title={`Delete "${project.name}"?`}
                        description="This permanently removes the project and its sequence. This cannot be undone."
                        confirmLabel="Delete"
                        destructive
                        onConfirm={() => handleDelete(project._id)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {project.presetEntries.length} preset
                      {project.presetEntries.length !== 1 ? "s" : ""}
                    </p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                        {project.description}
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

