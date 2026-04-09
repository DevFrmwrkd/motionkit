"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Download, GitFork, Eye } from "lucide-react";
import { VoteButtons } from "./VoteButtons";

const CATEGORY_COLORS: Record<string, string> = {
  intro: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  title: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "lower-third": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  cta: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  transition: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  outro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  full: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  chart: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  map: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  social: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  intro: "from-blue-950 to-zinc-950",
  title: "from-violet-950 to-zinc-950",
  "lower-third": "from-teal-950 to-zinc-950",
  cta: "from-orange-950 to-zinc-950",
  transition: "from-pink-950 to-zinc-950",
  outro: "from-indigo-950 to-zinc-950",
  full: "from-amber-950 to-zinc-950",
  chart: "from-emerald-950 to-zinc-950",
  map: "from-cyan-950 to-zinc-950",
  social: "from-rose-950 to-zinc-950",
};

interface PresetCardProps {
  preset: {
    _id: string;
    name: string;
    description?: string;
    category: string;
    author?: string;
    downloads?: number;
    voteScore?: number;
    viewCount?: number;
    cloneCount?: number;
    parentPresetId?: string;
    thumbnailUrl?: string;
  };
  currentUserId?: string | null;
  currentVote: number;
  onVote: (presetId: string, value: number) => void;
}

export function PresetCard({
  preset,
  currentUserId,
  currentVote,
  onVote,
}: PresetCardProps) {
  const categoryColor =
    CATEGORY_COLORS[preset.category] ??
    "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  const gradient =
    CATEGORY_GRADIENTS[preset.category] ?? "from-zinc-900 to-zinc-950";

  return (
    <Link href={`/workstation?presetId=${preset._id}`}>
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-amber-500/40 transition-all duration-200 group cursor-pointer h-full flex flex-col hover:scale-[1.01]">
        {/* Thumbnail area */}
        <div className="aspect-video relative overflow-hidden border-b border-zinc-800">
          {preset.thumbnailUrl ? (
            <img
              src={preset.thumbnailUrl}
              alt={preset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
            >
              <span className="text-zinc-700 text-5xl font-bold uppercase opacity-20 transform -rotate-12 select-none group-hover:scale-110 transition-transform">
                {preset.category}
              </span>
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 shadow-lg">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
          </div>
          {/* Category badge */}
          <Badge
            className={`absolute top-3 right-3 text-xs backdrop-blur-sm border ${categoryColor}`}
          >
            {preset.category}
          </Badge>
          {/* Version badge */}
          {preset.parentPresetId && (
            <Badge className="absolute top-3 left-3 text-xs bg-zinc-950/80 text-zinc-300 border-zinc-700 backdrop-blur-sm">
              <GitFork className="size-3 mr-1" />
              Fork
            </Badge>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            {/* Vote buttons */}
            <VoteButtons
              presetId={preset._id}
              userId={currentUserId}
              currentVote={currentVote}
              voteScore={preset.voteScore ?? 0}
              onVote={onVote}
            />

            {/* Title + description */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                {preset.name}
              </h3>
              {preset.description && (
                <p className="text-sm text-zinc-500 line-clamp-2 mt-0.5">
                  {preset.description}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>
              By{" "}
              <span className="text-zinc-300 font-medium">
                {preset.author ?? "Unknown"}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Download className="size-3" />
                {(preset.downloads ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="size-3" />
                {(preset.cloneCount ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {(preset.viewCount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
