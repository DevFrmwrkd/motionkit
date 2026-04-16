"use client";

import { useMemo, useState, useEffect } from "react";
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const projects = useQuery(api.projects.listByUser, { userId });
  const createProject = useMutation(api.projects.create);
  const addPresetEntry = useMutation(api.projects.addPresetEntry);
  const hasNoProjects = projects !== undefined && projects.length === 0;
  const nextProjectName = useMemo(
    () => `Project ${(projects?.length ?? 0) + 1}`,
    [projects]
  );

  // Auto-enable create form when no projects exist
  useEffect(() => {
    if (hasNoProjects) {
      setShowCreateForm(true);
    }
  }, [hasNoProjects]);

  const handleAdd = async () => {
    try {
      setIsSaving(true);

      if (showCreateForm || hasNoProjects) {
        // Create new project and add preset
        const newProjectId = await createProject({
          name: projectName.trim() || nextProjectName,
          userId,
        });

        await addPresetEntry({
          projectId: newProjectId,
          entry: {
            presetId,
            savedPresetId,
            order: 0,
          },
        });

        toast.success("Project created", {
          description: `Created "${projectName.trim() || nextProjectName}" and added this preset.`,
        });
        setOpen(false);
        onAdded?.(newProjectId);
      } else if (projectId) {
        // Add to existing project
        const selectedProject = projects?.find((project) => project._id === projectId);
        
        await addPresetEntry({
          projectId: projectId as Id<"projects">,
          entry: {
            presetId,
            savedPresetId,
            order: selectedProject?.presetEntries.length ?? 0,
          },
        });

        toast.success("Added to project", {
          description: "Appended this preset to your project sequence.",
        });
        setOpen(false);
        onAdded?.(projectId as Id<"projects">);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProjectSelect = (value: string | null) => {
    if (!value) return;
    if (value === "__new") {
      setShowCreateForm(true);
      setProjectId(null);
    } else {
      setProjectId(value);
      setShowCreateForm(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset state when dialog closes
        setShowCreateForm(false);
        setProjectId(null);
        setProjectName("");
      }
    }}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={triggerClassName ?? "hidden sm:flex border-border text-muted-foreground hover:bg-accent hover:text-foreground bg-card shadow-sm"}
          />
        }
      >
        <FolderPlus className="w-4 h-4 mr-2" /> Add to Project
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Add Preset to Project</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add this customized preset to a multi-scene video sequence.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {hasNoProjects && (
            <div className="grid gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium text-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground">
                Create your first project to organize and sequence this preset.
              </p>
            </div>
          )}

          {!hasNoProjects && (
            <div className="grid gap-2">
              <Label htmlFor="project-select" className="text-muted-foreground">Select Project</Label>
              <Select value={projectId ?? ""} onValueChange={handleProjectSelect}>
                <SelectTrigger className="bg-card border-border text-foreground focus:ring-amber-500">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="__new" className="text-amber-500 font-medium">+ Create New Project</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(showCreateForm || hasNoProjects) && (
            <div className="grid gap-2">
              <Label htmlFor="project-name" className="text-muted-foreground">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={nextProjectName}
                className="bg-card border-border text-foreground focus-visible:ring-amber-500"
                autoFocus
              />
            </div>
          )}
          
          {projects === undefined && !hasNoProjects && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading projects...
            </p>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setOpen(false);
              setShowCreateForm(false);
              setProjectId(null);
              setProjectName("");
            }} 
            className="border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => void handleAdd()} 
            disabled={isSaving || (showCreateForm && !projectName.trim())} 
            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
          >
            {showCreateForm ? "Create & Add" : "Add to Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
