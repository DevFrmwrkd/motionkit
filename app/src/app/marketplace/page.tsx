"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PresetCard } from "@/components/marketplace/PresetCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MarketplaceSearchOverlay } from "@/components/marketplace/MarketplaceSearchOverlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PresetCardSkeleton } from "@/components/marketplace/PresetCardSkeleton";
import { cn } from "@/lib/utils";

const CATEGORIES = [
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

type SortOption = "popular" | "trending" | "recent" | "highest-rated";

export default function MarketplacePage() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("trending");

  const categoryArg =
    activeCategory === "all"
      ? undefined
      : (activeCategory as
          | "intro"
          | "title"
          | "lower-third"
          | "cta"
          | "transition"
          | "outro"
          | "full"
          | "chart"
          | "map"
          | "social");

  const presets = useQuery(api.presets.listMarketplace, {
    category: categoryArg,
    sortBy,
  });

  const searchResults = useQuery(
    api.presets.search,
    searchQuery.trim().length >= 2 ? { query: searchQuery.trim() } : "skip"
  );

  const displayPresets = searchQuery.trim().length >= 2 ? searchResults : presets;

  const presetIds = (displayPresets ?? []).map((p) => p._id as Id<"presets">);
  const userVotes = useQuery(
    api.votes.getUserVotesForPresets,
    user && presetIds.length > 0
      ? { userId: user._id as Id<"users">, presetIds }
      : "skip"
  );

  // Latest successful-render URL per visible preset — powers the
  // Pinterest-style always-playing video previews on each card. One
  // batched query for the whole grid.
  const previewUrls = useQuery(
    api.presets.getLatestPreviewsForPresets,
    presetIds.length > 0 ? { presetIds } : "skip"
  );

  const castVote = useMutation(api.votes.castVote);

  const handleVote = useCallback(
    (presetId: string, value: number) => {
      if (!user) return;
      void castVote({
        userId: user._id as Id<"users">,
        presetId: presetId as Id<"presets">,
        value,
      });
    },
    [user, castVote]
  );

  const resultCount = displayPresets?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Sticky header — page title + toolbar. Minimal, app-like. */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Browse community-created motion graphics. Clone, customize, remix.
              </p>
            </div>
            <Link href="/create">
              <Button size="sm" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Create preset
              </Button>
            </Link>
          </div>

          {/* Toolbar row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-xl flex">
              <MarketplaceSearchOverlay
                value={searchQuery}
                onChange={setSearchQuery}
                resultCount={
                  searchQuery.trim().length >= 2
                    ? (searchResults?.length ?? undefined)
                    : undefined
                }
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger size="sm" className="w-[160px] gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="popular">Most popular</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="highest-rated">Highest rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category tabs row — shadcn-style segmented pills */}
          <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    setActiveCategory(cat.value);
                    setSearchQuery("");
                  }}
                  className={cn(
                    "inline-flex items-center h-8 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 py-6 flex flex-col gap-4">
        {/* Result meta */}
        {displayPresets !== undefined && displayPresets.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            {resultCount} {resultCount === 1 ? "preset" : "presets"}
            {searchQuery.trim().length >= 2 ? (
              <> · matching <span className="text-foreground">&ldquo;{searchQuery.trim()}&rdquo;</span></>
            ) : activeCategory !== "all" ? (
              <> · in <span className="text-foreground">{CATEGORIES.find((c) => c.value === activeCategory)?.label}</span></>
            ) : null}
          </div>
        ) : null}

        {displayPresets === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <PresetCardSkeleton key={i} />
            ))}
          </div>
        ) : displayPresets.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={searchQuery ? "No matches" : "No presets yet"}
            description={
              searchQuery
                ? "Try a different search or clear the filters."
                : "Be the first to publish a preset to the marketplace."
            }
            action={
              <Link href="/create">
                <Button className="gap-1.5">
                  <Sparkles className="w-4 h-4" /> Create with AI
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {displayPresets.map((preset) => (
              <PresetCard
                key={preset._id}
                preset={{
                  ...preset,
                  previewVideoUrl:
                    preset.previewVideoUrl ??
                    previewUrls?.[preset._id as string],
                }}
                currentUserId={user?._id ?? null}
                currentVote={userVotes ? (userVotes[preset._id as string] ?? 0) : 0}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
