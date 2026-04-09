"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FolderPlus, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AddToProjectDialogProps {
  userId: Id<"users">;
  presetId: Id<"presets">;
  savedPresetId?: Id<"savedPresets">;
  triggerClassName?: string;
  onAdded?: (projectId: Id<"projects">) => void;
}

export function AddToProjectDialog({
  userId,
  presetId,
  savedPresetId,
  triggerClassName,
  onAdded,
}: AddToProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("new");
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const projects = useQuery(api.projects.listByUser, { userId });
  const createProject = useMutation(api.projects.create);
  const addPresetEntry = useMutation(api.projects.addPresetEntry);
  const nextProjectName = useMemo(
    () => `Project ${(projects?.length ?? 0) + 1}`,
    [projects]
  );

  const handleAdd = async () => {
    try {
      setIsSaving(true);

      const selectedProject = projects?.find((project) => project._id === projectId);
      const resolvedProjectId =
        projectId === "new"
          ? await createProject({
              name: projectName.trim() || nextProjectName,
              userId,
            })
          : (projectId as Id<"projects">);

      await addPresetEntry({
        projectId: resolvedProjectId,
        entry: {
          presetId,
          savedPresetId,
          order: projectId === "new" ? 0 : selectedProject?.presetEntries.length ?? 0,
        },
      });

      toast.success("Added to project", {
        description:
          projectId === "new"
            ? `Created "${projectName.trim() || nextProjectName}" and added this preset.`
            : "Appended this preset to your project sequence.",
      });
      setOpen(false);
      onAdded?.(resolvedProjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to project");
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
            className={triggerClassName ?? "hidden sm:flex border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 bg-zinc-900 shadow-sm"}
          />
        }
      >
        <FolderPlus className="w-4 h-4 mr-2" /> Add to Project
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Add Preset to Project</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add this customized preset to a multi-scene video sequence.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-select" className="text-zinc-300">Select Project</Label>
            <Select value={projectId} onValueChange={(v) => v !== null && setProjectId(v)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-amber-500">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectItem value="new" className="text-amber-500 font-medium">+ Create New Project</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects === undefined && (
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading projects...
              </p>
            )}
          </div>
          
          {projectId === "new" && (
            <div className="grid gap-2">
              <Label htmlFor="project-name" className="text-zinc-300">New Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={nextProjectName}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
            Cancel
          </Button>
          <Button onClick={() => void handleAdd()} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
            {projectId === "new" ? "Create & Add" : "Add to Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
