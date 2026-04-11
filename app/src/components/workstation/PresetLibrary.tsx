"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Library, Layers } from "lucide-react";
import { useMemo, useState } from "react";

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

const CATEGORIES = [
  { value: "all", label: "All" },
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
] as const;

/**
 * Left rail: browse and search presets.
 *
 * - Searchable by name and tags
 * - Category filter chips with live counts
 * - Active preset gets a clear selected state
 * - Empty state provides guidance instead of silence
 */
export function PresetLibrary({
  presets,
  activePresetId,
  onSelectPreset,
}: PresetLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { filtered, categoryCounts } = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = (preset: PresetItem) =>
      !normalizedSearch ||
      preset.name.toLowerCase().includes(normalizedSearch) ||
      preset.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
      preset.description?.toLowerCase().includes(normalizedSearch);

    // Category counts reflect the current search — so users see "Title (3)"
    // only if 3 titles match what they typed.
    const counts: Record<string, number> = { all: 0 };
    for (const preset of presets) {
      if (!matchesSearch(preset)) continue;
      counts.all += 1;
      counts[preset.category] = (counts[preset.category] ?? 0) + 1;
    }

    const filteredList = presets.filter((preset) => {
      if (!matchesSearch(preset)) return false;
      if (activeCategory === "all") return true;
      return preset.category === activeCategory;
    });

    return { filtered: filteredList, categoryCounts: counts };
  }, [presets, search, activeCategory]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="h-11 shrink-0 flex items-center gap-2 px-4 border-b border-border">
        <Library className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Library</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {presets.length} preset{presets.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search presets or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.value] ?? 0;
            const isActive = activeCategory === cat.value;
            const isDisabled = count === 0 && cat.value !== "all";
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                disabled={isDisabled}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/20 text-amber-500"
                    : isDisabled
                      ? "text-muted-foreground/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {cat.label}
                {count > 0 && cat.value !== "all" && (
                  <span className="ml-1 opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
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
                  ? "bg-amber-500/10 border border-amber-500/40 shadow-sm shadow-amber-500/5"
                  : "hover:bg-accent border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {preset.name}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {preset.category}
                </Badge>
              </div>
              {preset.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {preset.description}
                </p>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground">No matches</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search
                  ? "Try a different search or clear filters."
                  : "Nothing in this category yet."}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
