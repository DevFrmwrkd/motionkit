"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Search,
  Library,
  Layers,
  Copy,
  FolderOpen,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

interface PresetItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  tags: string[];
  authorId?: string;
  parentPresetId?: string;
  forkedFrom?: string;
}

interface SavedVariantItem {
  _id: string;
  name: string;
  presetName?: string;
  authorName?: string;
  presetId: string;
}

interface CollectionItem {
  _id: string;
  name: string;
  description?: string;
  presetCount: number;
}

interface PresetLibraryProps {
  presets: PresetItem[];
  savedVariants?: SavedVariantItem[];
  collections?: CollectionItem[];
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
 * Left rail: browse presets organized by library type.
 *
 * Tabs:
 *   - Originals: presets authored by the user
 *   - Forks: presets cloned from marketplace
 *   - Saved Variants: customizations of others' presets
 *   - Collections: user-created folders
 *
 * Each tab supports searching and category filtering.
 */
export function PresetLibrary({
  presets,
  savedVariants = [],
  collections = [],
  activePresetId,
  onSelectPreset,
}: PresetLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [libraryTab, setLibraryTab] = useState<
    "originals" | "forks" | "variants" | "collections"
  >("originals");

  // Validate data on input
  const validPresets = useMemo(() => {
    return (presets ?? []).filter(
      (p) => p && p._id && p.name && p.category
    );
  }, [presets]);

  const validSavedVariants = useMemo(() => {
    return (savedVariants ?? []).filter((v) => v && v._id && v.presetId);
  }, [savedVariants]);

  const validCollections = useMemo(() => {
    return (collections ?? []).filter((c) => c && c._id && c.name);
  }, [collections]);

  // Split presets by type
  const { originals, forks } = useMemo(() => {
    const original = validPresets.filter(
      (p) => !p.parentPresetId && !p.forkedFrom
    );
    const fork = validPresets.filter((p) => p.parentPresetId || p.forkedFrom);
    return { originals: original, forks: fork };
  }, [validPresets]);

  // Filter and count by category
  const getFilteredAndCounted = (items: PresetItem[]) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = (preset: PresetItem) =>
      !normalizedSearch ||
      preset.name.toLowerCase().includes(normalizedSearch) ||
      preset.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
      preset.description?.toLowerCase().includes(normalizedSearch);

    const counts: Record<string, number> = { all: 0 };
    for (const preset of items) {
      if (!matchesSearch(preset)) continue;
      counts.all += 1;
      counts[preset.category] = (counts[preset.category] ?? 0) + 1;
    }

    const filtered = items.filter((preset) => {
      if (!matchesSearch(preset)) return false;
      if (activeCategory === "all") return true;
      return preset.category === activeCategory;
    });

    return { filtered, counts };
  };

  const originalsData = getFilteredAndCounted(originals);
  const forksData = getFilteredAndCounted(forks);
  const variantsFiltered = validSavedVariants.filter((v) => {
    const normalizedSearch = search.trim().toLowerCase();
    return (
      !normalizedSearch ||
      v.name.toLowerCase().includes(normalizedSearch) ||
      v.presetName?.toLowerCase().includes(normalizedSearch)
    );
  });

  const collectionsFiltered = validCollections.filter((c) => {
    const normalizedSearch = search.trim().toLowerCase();
    return (
      !normalizedSearch || c.name.toLowerCase().includes(normalizedSearch)
    );
  });

  const renderCategoryFilters = (counts: Record<string, number>) => (
    <div className="px-2 py-1.5 border-b border-border shrink-0">
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => {
          const count = counts[cat.value] ?? 0;
          const isActive = activeCategory === cat.value;
          const isDisabled = count === 0 && cat.value !== "all";
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              disabled={isDisabled}
              className={`px-2 py-[3px] text-[10px] rounded-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/20 text-amber-500"
                  : isDisabled
                    ? "text-muted-foreground/30"
                    : "text-muted-foreground/70 hover:text-foreground hover:bg-accent"
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
  );

  const renderPresetItem = (preset: PresetItem, isActive: boolean) => {
    const isFork = preset.parentPresetId || preset.forkedFrom;
    const originBadge = isFork ? (
      <Badge variant="secondary" className="text-[9px] shrink-0 gap-0.5">
        <Copy className="w-2.5 h-2.5" />
        Remix
      </Badge>
    ) : null;

    return (
      <button
        key={preset._id}
        onClick={() => onSelectPreset(preset._id)}
        className={`w-full text-left p-3 rounded-lg transition-colors ${
          isActive
            ? "bg-amber-500/10 border border-amber-500/40 shadow-sm shadow-amber-500/5"
            : "hover:bg-accent border border-transparent"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {preset.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {originBadge}
            <Badge variant="outline" className="text-[10px]">
              {preset.category}
            </Badge>
          </div>
        </div>
        {preset.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {preset.description}
          </p>
        )}
      </button>
    );
  };

  const renderEmptyState = (message: string, hint: string) => (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
        <Layers className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-sm text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="h-11 shrink-0 flex items-center gap-2 px-4 border-b border-border">
        <Library className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Library</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {validPresets.length} preset{validPresets.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={libraryTab}
        onValueChange={(v) =>
          setLibraryTab(v as "originals" | "forks" | "variants" | "collections")
        }
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-2 mt-2 shrink-0 bg-card border border-border h-max gap-0 p-[2px]">
          <TabsTrigger value="originals" className="text-[10px] py-[2px] px-1.5">
            Originals
            {originals.length > 0 && (
              <span className="ml-1 text-[8px] text-muted-foreground opacity-70">
                {originals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="forks" className="text-[10px] py-[2px] px-1.5">
            Remixes
            {forks.length > 0 && (
              <span className="ml-1 text-[8px] text-muted-foreground opacity-70">
                {forks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="variants" className="text-[10px] py-[2px] px-1.5">
            Variants
            {validSavedVariants.length > 0 && (
              <span className="ml-1 text-[8px] text-muted-foreground opacity-70">
                {validSavedVariants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="collections" className="text-[10px] py-[2px] px-1.5">
            Collections
            {validCollections.length > 0 && (
              <span className="ml-1 text-[8px] text-muted-foreground opacity-70">
                {validCollections.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Originals Tab */}
        <TabsContent value="originals" className="flex-1 min-h-0 m-0 flex flex-col overflow-hidden">
          <div className="shrink-0 w-full overflow-hidden">
            {renderCategoryFilters(originalsData.counts)}
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {originalsData.filtered.map((preset) =>
                renderPresetItem(preset, activePresetId === preset._id)
              )}
              {originalsData.filtered.length === 0 &&
                renderEmptyState(
                  search ? "No matches" : "No originals yet",
                  search
                    ? "Try a different search."
                    : "Create or import a preset to get started."
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Forks Tab */}
        <TabsContent value="forks" className="flex-1 min-h-0 m-0 flex flex-col overflow-hidden">
          <div className="shrink-0 w-full overflow-hidden">
            {renderCategoryFilters(forksData.counts)}
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {forksData.filtered.map((preset) =>
                renderPresetItem(preset, activePresetId === preset._id)
              )}
              {forksData.filtered.length === 0 &&
                renderEmptyState(
                  search ? "No matches" : "No remixes yet",
                  search
                    ? "Try a different search."
                    : "Remix a preset from the Marketplace to build your own version."
                )}
            </div>
          </ScrollArea>
        </TabsContent>
        {/* Variants Tab */}
        <TabsContent value="variants" className="flex-1 min-h-0 m-0 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {variantsFiltered.map((variant) => (
                <button
                  key={variant._id}
                  onClick={() => onSelectPreset(variant.presetId)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activePresetId === variant.presetId
                      ? "bg-amber-500/10 border border-amber-500/40 shadow-sm shadow-amber-500/5"
                      : "hover:bg-accent border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {variant.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] shrink-0 gap-0.5"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      Variant
                    </Badge>
                  </div>
                  {variant.presetName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      of {variant.presetName} by {variant.authorName}
                    </p>
                  )}
                </button>
              ))}
              {variantsFiltered.length === 0 &&
                renderEmptyState(
                  search ? "No matches" : "No saved variants yet",
                  search
                    ? "Try a different search."
                    : "Customize a preset and save it."
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="flex-1 min-h-0 m-0 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {collectionsFiltered.map((collection) => (
                <div
                  key={collection._id}
                  className="p-3 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {collection.name}
                      </span>
                      {collection.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {collection.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-muted/50"
                      >
                        {collection.presetCount}
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
              {collectionsFiltered.length === 0 &&
                renderEmptyState(
                  search ? "No matches" : "No collections yet",
                  search
                    ? "Try a different search."
                    : "Create a collection to organize presets."
                )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

