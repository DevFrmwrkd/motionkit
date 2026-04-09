"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useState } from "react";

interface PresetItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  tags: string[];
}

interface PresetLibraryProps {
  presets: PresetItem[];
  activePresetId?: string;
  onSelectPreset: (presetId: string) => void;
}

const categories = [
  { value: "all", label: "All" },
  { value: "intro", label: "Intro" },
  { value: "title", label: "Title" },
  { value: "lower-third", label: "Lower Third" },
  { value: "cta", label: "CTA" },
  { value: "transition", label: "Transition" },
  { value: "outro", label: "Outro" },
  { value: "chart", label: "Chart" },
  { value: "map", label: "Map" },
  { value: "social", label: "Social" },
] as const;

/**
 * Left panel: browse and search presets.
 * Filters by category, highlights active preset.
 */
export function PresetLibrary({
  presets,
  activePresetId,
  onSelectPreset,
}: PresetLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = presets.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      activeCategory === "all" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search presets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1 p-3 border-b border-zinc-800">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeCategory === cat.value
                ? "bg-amber-500/20 text-amber-500"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Preset list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.map((preset) => (
            <button
              key={preset._id}
              onClick={() => onSelectPreset(preset._id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                activePresetId === preset._id
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : "hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">
                  {preset.name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {preset.category}
                </Badge>
              </div>
              {preset.description && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                  {preset.description}
                </p>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-zinc-500 py-8">
              No presets found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
