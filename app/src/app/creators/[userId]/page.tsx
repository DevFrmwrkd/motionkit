"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PresetCard } from "@/components/marketplace/PresetCard";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Sparkles,
  ThumbsUp,
  UserCircle,
} from "lucide-react";

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
      <path d="M9.545 15.568V8.432L15.818 12z" fill="black" />
    </svg>
  );
}

export default function CreatorProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { user } = useCurrentUser();
  // The route param is now a "slug" — it can be either a real Convex user
  // id OR an author-name slug (e.g. "claude", "motionkit") for seeded
  // built-in presets that never got a users row. The query handles both.
  const profile = useQuery(api.users.getCreatorBySlug, { slug: userId });
  const castVote = useMutation(api.votes.castVote);
  const presetIds = (profile?.presets ?? []).map((p) => p._id as Id<"presets">);
  const userVotesRaw = useQuery(
    api.votes.getUserVotesForPresets,
    user && presetIds.length > 0 && !profile?.synthetic
      ? { userId: user._id as Id<"users">, presetIds }
      : "skip"
  );

  const handleVote = (presetId: string, value: number) => {
    if (!user) return;
    void castVote({
      userId: user._id as Id<"users">,
      presetId: presetId as Id<"presets">,
      value,
    });
  };

  if (profile === undefined) {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
        <div className="text-center space-y-3">
          <UserCircle className="h-12 w-12 text-zinc-700 mx-auto" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Profile not available
          </h2>
          <p className="text-sm text-zinc-500 max-w-sm">
            This creator hasn&apos;t made their profile public yet, or the
            account doesn&apos;t exist.
          </p>
          <Link
            href="/marketplace"
            className="inline-block text-sm text-amber-500 hover:text-amber-400 mt-2"
          >
            Browse marketplace
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = profile.socialLinks ?? {};
  const hasSocials = Boolean(
    socialLinks.twitter || socialLinks.github || socialLinks.youtube
  );

  return (
    <div className="min-h-[calc(100svh-3.5rem)]">
      {/* Hero section */}
      <div className="relative border-b border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-8">
            {/* Avatar */}
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900 shadow-xl shadow-violet-500/5">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.name ?? "Creator"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-950 to-zinc-900">
                  <span className="text-3xl font-bold text-violet-300/60">
                    {(profile.name ?? "?")[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name + bio */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                {profile.name ?? "Anonymous Creator"}
              </h1>
              {profile.bio && (
                <p className="mt-2 text-sm text-zinc-400 max-w-xl leading-relaxed">
                  {profile.bio}
                </p>
              )}
              {/* Social links + website */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {profile.website
                      .replace(/^https?:\/\//, "")
                      .replace(/\/$/, "")}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {hasSocials && (
                  <div className="flex items-center gap-2">
                    {socialLinks.twitter && (
                      <a
                        href={`https://x.com/${socialLinks.twitter.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-zinc-100 transition-colors"
                        aria-label="Twitter / X"
                      >
                        <TwitterIcon className="h-4 w-4" />
                      </a>
                    )}
                    {socialLinks.github && (
                      <a
                        href={`https://github.com/${socialLinks.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-zinc-100 transition-colors"
                        aria-label="GitHub"
                      >
                        <GitHubIcon className="h-4 w-4" />
                      </a>
                    )}
                    {socialLinks.youtube && (
                      <a
                        href={`https://youtube.com/@${socialLinks.youtube.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-zinc-100 transition-colors"
                        aria-label="YouTube"
                      >
                        <YouTubeIcon className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 shrink-0">
              <StatBlock
                icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                value={profile.presetCount}
                label="Presets"
              />
              <StatBlock
                icon={<Download className="h-4 w-4 text-zinc-400" />}
                value={profile.totalDownloads}
                label="Downloads"
              />
              <StatBlock
                icon={<ThumbsUp className="h-4 w-4 text-violet-400" />}
                value={profile.totalVotes}
                label="Votes"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preset grid */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">
            Published presets
          </h2>
          <Badge
            variant="outline"
            className="border-zinc-800 text-zinc-400"
          >
            {profile.presetCount} preset
            {profile.presetCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        {profile.presets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
            <Sparkles className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              No published presets yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {profile.presets.map((preset) => (
              <PresetCard
                key={preset._id}
                preset={{
                  _id: preset._id,
                  name: preset.name,
                  description: preset.description,
                  category: preset.category,
                  author: profile.name ?? "Unknown",
                  authorId: preset.authorId,
                  downloads: preset.downloads,
                  voteScore: preset.voteScore,
                  viewCount: preset.viewCount,
                  cloneCount: preset.cloneCount,
                  parentPresetId: preset.parentPresetId,
                  thumbnailUrl: preset.thumbnailUrl,
                  // Runtime fields so MarketplacePreview can play the
                  // preset once when the card scrolls into view.
                  sourceCode: preset.sourceCode,
                  inputSchema: preset.inputSchema,
                  fps: preset.fps,
                  width: preset.width,
                  height: preset.height,
                  durationInFrames: preset.durationInFrames,
                }}
                currentUserId={user?._id ?? null}
                currentVote={userVotesRaw ? (userVotesRaw[preset._id as string] ?? 0) : 0}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBlock({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-lg font-semibold text-zinc-100 tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
    </div>
  );
}
