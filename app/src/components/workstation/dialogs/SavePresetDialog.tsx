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
import { Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SavePresetDialogProps {
  presetName: string;
}

export function SavePresetDialog({ presetName }: SavePresetDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`My ${presetName}`);

  const handleSave = () => {
    // Phase 1: Mock save
    console.log("Saving preset:", name);
    toast.success("Preset Saved", {
      description: `"${name}" has been saved to your collections.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="hidden sm:flex border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 bg-zinc-900 shadow-sm" />}>
          <Save className="w-4 h-4 mr-2" /> Save Preset
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Save Custom Preset</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Save your customized properties to use later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-zinc-300">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="folder" className="text-zinc-300">Folder</Label>
            <Select defaultValue="none">
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-amber-500">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectItem value="none">No Folder (Root)</SelectItem>
                <SelectItem value="yt">YouTube Intros</SelectItem>
                <SelectItem value="client">Client A Promos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
