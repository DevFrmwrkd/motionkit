"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Download, GitFork, Eye, Crown } from "lucide-react";
import { VoteButtons } from "./VoteButtons";
import { ForkButton } from "@/components/preset/ForkButton";
import type { Id } from "@convex/_generated/dataModel";

// ── Category visual maps ────────────────────────────────────────────

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

/** Two-stop gradient for rich no-thumbnail backgrounds. */
const CATEGORY_GRADIENTS: Record<string, string> = {
  intro: "from-zinc-900/40 via-zinc-950 to-zinc-950",
  title: "from-zinc-900/40 via-zinc-950 to-zinc-950",
  "lower-third": "from-teal-900/70 via-emerald-950 to-zinc-950",
  cta: "from-orange-900/70 via-amber-950 to-zinc-950",
  transition: "from-pink-900/70 via-rose-950 to-zinc-950",
  outro: "from-indigo-900/70 via-blue-950 to-zinc-950",
  full: "from-amber-900/70 via-yellow-950 to-zinc-950",
  chart: "from-emerald-900/70 via-green-950 to-zinc-950",
  map: "from-cyan-900/70 via-sky-950 to-zinc-950",
  social: "from-rose-900/70 via-pink-950 to-zinc-950",
};

/** Category-specific icon SVGs for geometric overlays. */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  intro: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <polygon points="35,20 75,50 35,80" fill="currentColor" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  title: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <text x="50" y="58" textAnchor="middle" fontSize="40" fontWeight="bold" fill="currentColor">Aa</text>
      <line x1="20" y1="75" x2="80" y2="75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  "lower-third": (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="10" y="60" width="80" height="20" rx="4" fill="currentColor" />
      <line x1="15" y1="67" x2="55" y2="67" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <line x1="15" y1="73" x2="40" y2="73" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    </svg>
  ),
  cta: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="20" y="35" width="60" height="30" rx="15" fill="currentColor" />
      <line x1="40" y1="50" x2="55" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <polygon points="55,44 65,50 55,56" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  transition: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="10" y="25" width="35" height="50" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="55" y="25" width="35" height="50" rx="3" fill="currentColor" opacity="0.3" />
      <path d="M45,50 L55,44 L55,56 Z" fill="currentColor" />
    </svg>
  ),
  outro: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="42" y="40" width="16" height="20" rx="2" fill="currentColor" />
    </svg>
  ),
  full: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="15" y="20" width="70" height="60" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="15" y1="35" x2="85" y2="35" stroke="currentColor" strokeWidth="1" />
      <rect x="20" y="40" width="25" height="15" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="50" y="40" width="30" height="15" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <rect x="20" y="55" width="12" height="25" rx="2" fill="currentColor" />
      <rect x="37" y="35" width="12" height="45" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="54" y="45" width="12" height="35" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="71" y="25" width="12" height="55" rx="2" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <path d="M50,20 C50,20 75,45 75,58 C75,72 63,80 50,80 C37,80 25,72 25,58 C25,45 50,20 50,20Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="50" cy="55" r="8" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  social: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md text-white">
      <circle cx="35" cy="40" r="12" fill="currentColor" opacity="0.5" />
      <circle cx="65" cy="40" r="12" fill="currentColor" opacity="0.3" />
      <circle cx="50" cy="65" r="12" fill="currentColor" opacity="0.4" />
      <line x1="35" y1="40" x2="65" y2="40" stroke="currentColor" strokeWidth="1" />
      <line x1="35" y1="40" x2="50" y2="65" stroke="currentColor" strokeWidth="1" />
      <line x1="65" y1="40" x2="50" y2="65" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
};

// ── Component ───────────────────────────────────────────────────────

interface PresetCardProps {
  preset: {
    _id: string;
    name: string;
    description?: string;
    category: string;
    author?: string;
    authorId?: string;
    downloads?: number;
    voteScore?: number;
    viewCount?: number;
    cloneCount?: number;
    parentPresetId?: string;
    thumbnailUrl?: string;
    isPremium?: boolean;
    priceCents?: number;
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
  const router = useRouter();

  const categoryColor =
    CATEGORY_COLORS[preset.category] ??
    "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  const gradient =
    CATEGORY_GRADIENTS[preset.category] ?? "from-zinc-900 via-zinc-950 to-zinc-950";
  const geoIcon =
    CATEGORY_ICONS[preset.category] ?? CATEGORY_ICONS["full"];
  const isPremium =
    preset.isPremium || (preset.priceCents !== undefined && preset.priceCents > 0);

  return (
    <div 
      onClick={() => router.push(`/workstation?presetId=${preset._id}`)}
      className="block h-full cursor-pointer group"
    >
      <Card
        className={[
          "overflow-hidden transition-all duration-300 h-full flex flex-col",
          "bg-zinc-950 border-zinc-800/60",
          // Tactile hover: lift + glow + border shift
          "hover:translate-y-[-3px] hover:shadow-lg hover:shadow-amber-500/5",
          "hover:border-amber-500/30",
          // Premium cards: subtle violet ring
          isPremium ? "ring-1 ring-violet-500/20 hover:ring-violet-500/40" : "",
        ].join(" ")}
      >
        {/* Thumbnail area (always showing geometric gradients as requested) */}
        <div className="aspect-video relative overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-all duration-500 group-hover:brightness-125`}
          >
            {/* Geometric category icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="w-[70%] h-[70%] max-w-[200px] max-h-[200px] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                {geoIcon}
              </div>
            </div>
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>

          {/* Hover overlay — play preview + remix CTA */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 backdrop-blur-sm">
            <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 transition-transform duration-200 group-hover:scale-100 scale-90">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
            <ForkButton
              presetId={preset._id as Id<"presets">}
              userId={(currentUserId as Id<"users"> | null) ?? null}
              variant="default"
              size="sm"
              label="Remix"
              stopPropagation
              className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 gap-1.5 transition-transform duration-200 group-hover:scale-100 scale-90"
            />
          </div>

          {/* Badges — top row */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none">
            <div className="flex gap-1.5 flex-wrap">
              <Badge
                className={`text-[10px] backdrop-blur-md border ${categoryColor} pointer-events-auto`}
              >
                {preset.category}
              </Badge>
              {preset.parentPresetId && (
                <Badge className="text-[10px] bg-zinc-950/70 text-zinc-300 border-zinc-700/50 backdrop-blur-md pointer-events-auto">
                  <GitFork className="size-2.5 mr-1" />
                  Fork
                </Badge>
              )}
              {isPremium && (
                <Badge className="text-[10px] bg-violet-950/70 text-violet-300 border-violet-700/50 backdrop-blur-md pointer-events-auto">
                  <Crown className="size-2.5 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-3.5 flex-1 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
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
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors duration-200 truncate leading-snug">
                {preset.name}
              </h3>
              {preset.description && (
                <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">
                  {preset.description}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="truncate mr-2">
              {preset.authorId ? (
                <Link
                  href={`/creators/${preset.authorId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  {preset.author ?? "Unknown"}
                </Link>
              ) : (
                <span className="font-medium text-zinc-400">
                  {preset.author ?? "Unknown"}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
              <span className="flex items-center gap-1">
                <Download className="size-3 text-zinc-600" />
                {(preset.downloads ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="size-3 text-zinc-600" />
                {(preset.cloneCount ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="size-3 text-zinc-600" />
                {(preset.viewCount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
