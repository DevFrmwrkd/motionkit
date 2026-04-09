"use client";

import { useState } from "react";
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
import { FolderPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function AddToProjectDialog() {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("new");
  const [projectName, setProjectName] = useState("My New Project");

  const handleAdd = () => {
    // Phase 1: Mock
    console.log("Adding to project:", projectId, projectName);
    toast.success("Added to Project", {
      description: projectId === "new" ? `Created "${projectName}" and added sequence.` : "Appended to your sequence.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="hidden sm:flex border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 bg-zinc-900 shadow-sm" />}>
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
                <SelectItem value="yt">Product Demo V1</SelectItem>
                <SelectItem value="client">Gaming Highlight</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {projectId === "new" && (
            <div className="grid gap-2">
              <Label htmlFor="project-name" className="text-zinc-300">New Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
            Cancel
          </Button>
          <Button onClick={handleAdd} className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
            {projectId === "new" ? "Create & Add" : "Add to Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
