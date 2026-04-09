"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { PresetCard } from "@/components/marketplace/PresetCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Motion Graphics <span className="text-amber-500">Marketplace</span>
          </h1>
          <p className="text-zinc-400 mt-2 max-w-xl mx-auto">
            Browse community-created motion graphics presets. Clone, customize,
            and make them your own.
          </p>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setActiveCategory(cat.value);
                setSearchQuery("");
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.value
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : "text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {displayPresets === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : displayPresets.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300">No presets found</h3>
            <p className="text-sm text-zinc-500">Be the first to create one!</p>
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              Create with AI
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayPresets.map((preset) => (
              <PresetCard
                key={preset._id}
                preset={preset}
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
