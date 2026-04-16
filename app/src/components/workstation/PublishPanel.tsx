"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Globe, Lock, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type Category = NonNullable<Doc<"presets">["category"]>;

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "intro", label: "Intro" },
  { value: "title", label: "Title" },
  { value: "lower-third", label: "Lower Third" },
  { value: "cta", label: "CTA" },
  { value: "transition", label: "Transition" },
  { value: "outro", label: "Outro" },
  { value: "full", label: "Full" },
  { value: "chart", label: "Chart" },
  { value: "map", label: "Map" },
  { value: "social", label: "Social" },
];

interface PublishPanelProps {
  preset: Doc<"presets"> | null;
  isOwner: boolean;
}

/**
 * Publish tab — edit a preset's marketplace metadata and toggle its
 * visibility. Status flips to "published" when the owner hits Publish;
 * "unpublish" flips it back to draft while keeping the preset in the
 * workstation.
 */
export function PublishPanel({ preset, isOwner }: PublishPanelProps) {
  const updatePreset = useMutation(api.presets.update);
  const [isSaving, setIsSaving] = useState(false);

  // Local form state hydrated from the preset. We never write through on
  // every keystroke — each field commits when the user hits Save.
  const [name, setName] = useState(preset?.name ?? "");
  const [description, setDescription] = useState(preset?.description ?? "");
  const [category, setCategory] = useState<Category>(
    (preset?.category ?? "title") as Category
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(preset?.tags ?? []);
  const [isPublic, setIsPublic] = useState(Boolean(preset?.isPublic));

  // Reset when the preset switches.
  const [lastPresetId, setLastPresetId] = useState(preset?._id);
  if (preset && lastPresetId !== preset._id) {
    setLastPresetId(preset._id);
    setName(preset.name);
    setDescription(preset.description ?? "");
    setCategory(preset.category as Category);
    setTags(preset.tags ?? []);
    setIsPublic(Boolean(preset.isPublic));
    setTagInput("");
  }

  if (!preset) {
    return (
      <EmptyState
        title="Nothing to publish"
        body="Pick a preset from your library first."
      />
    );
  }

  if (!isOwner) {
    return (
      <EmptyState
        title="Not your preset"
        body="You can only publish presets you own. Remix this one to publish your own version."
      />
    );
  }

  const isPublished = preset.status === "published";

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t) || tags.length >= 8) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreset({
        id: preset._id as Id<"presets">,
        name: name.trim() || preset.name,
        description: description.trim(),
        category,
        tags,
        isPublic,
      });
      toast.success("Preset details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    setIsSaving(true);
    try {
      await updatePreset({
        id: preset._id as Id<"presets">,
        status: isPublished ? "draft" : "published",
        isPublic: isPublished ? false : true,
      });
      toast.success(
        isPublished ? "Unpublished — back to draft" : "Published to Marketplace"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                isPublished
                  ? "border-emerald-500/40 text-emerald-400"
                  : "border-border text-muted-foreground"
              }
            >
              {isPublished ? (
                <Globe className="w-3 h-3 mr-1" />
              ) : (
                <Lock className="w-3 h-3 mr-1" />
              )}
              {isPublished ? "Published" : "Draft"}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="publish-name" className="text-[11px]">
              Name
            </Label>
            <Input
              id="publish-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="publish-desc" className="text-[11px]">
              Description
            </Label>
            <Textarea
              id="publish-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs min-h-[72px] resize-none"
              placeholder="One sentence on what this preset does and when to use it."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Tags ({tags.length}/8)</Label>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="text-[10px] gap-1"
                >
                  {t}
                  <button
                    onClick={() => removeTag(t)}
                    className="hover:text-red-400"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag..."
                className="text-xs h-7"
                disabled={tags.length >= 8}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 8}
                className="h-7 text-[11px]"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div className="space-y-0.5">
              <Label htmlFor="publish-public" className="text-[11px]">
                Public
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Visible on the Marketplace when published.
              </p>
            </div>
            <Switch
              id="publish-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border shrink-0 space-y-2">
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : null}
          Save details
        </Button>
        <Button
          onClick={() => void handlePublishToggle()}
          disabled={isSaving}
          size="sm"
          className={
            isPublished
              ? "w-full"
              : "w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          }
          variant={isPublished ? "outline" : "default"}
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {isPublished ? "Unpublish" : "Publish to Marketplace"}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-3">
        <Upload className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-[240px]">{body}</p>
    </div>
  );
}
