"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Loader2,
  ArrowRight,
  ExternalLink,
  Lock,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForkButton } from "@/components/preset/ForkButton";
import { InteractivePreview } from "@/components/preset/InteractivePreview";
import { normalizePresetPricing } from "../../../../../shared/presetPricing";

function formatDuration(durationInFrames: number, fps: number) {
  if (!fps || fps <= 0) return `${durationInFrames} frames`;
  const totalSeconds = durationInFrames / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

function formatDate(timestamp?: number | null) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleString();
}

function formatCents(value?: number | null) {
  if (value === undefined || value === null) return "Not set";
  return `$${(value / 100).toFixed(2)}`;
}

export default function PresetDetailsPage({
  params,
}: {
  params: Promise<{ presetId: string }>;
}) {
  const { presetId } = use(params);
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useCurrentUser();
  const presetIdTyped = presetId as Id<"presets">;
  const checkoutCancelled = searchParams.get("checkout") === "cancelled";

  const preset = useQuery(
    api.presets.get,
    userLoading ? "skip" : user ? { id: presetIdTyped, viewerId: user._id as Id<"users"> } : { id: presetIdTyped }
  );
  const reviewStatus = useQuery(api.presetReview.getPresetReviewStatus, {
    presetId: presetIdTyped,
  });
  const checkoutQuote = useQuery(
    api.licenses.priceForCheckout,
    user && preset ? { presetId: preset._id as Id<"presets"> } : "skip"
  );

  if (userLoading || preset === undefined) {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-6xl items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preset details...
        </div>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-4xl items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              <CardTitle>Preset unavailable</CardTitle>
            </div>
            <CardDescription>
              This preset is private, unpublished, archived, or no longer exists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
              Preset ID: <code className="text-zinc-200">{presetId}</code>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/marketplace" className="sm:flex-1">
                <Button className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400">
                  Browse marketplace
                </Button>
              </Link>
              <Link href="/dashboard" className="sm:flex-1">
                <Button variant="outline" className="w-full">
                  Open dashboard
                </Button>
              </Link>
            </div>
            {user?.role === "admin" ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/admin/review" className="sm:flex-1">
                  <Button variant="outline" className="w-full">
                    Review queue
                  </Button>
                </Link>
                <Link href="/admin/broken-renders" className="sm:flex-1">
                  <Button variant="outline" className="w-full">
                    Broken renders
                  </Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = !!user && preset.authorId === user._id;
  const pricing = normalizePresetPricing(preset);
  const needsCheckout = !!user && checkoutQuote?.needsCheckout;
  const shouldPromptSignIn =
    !user &&
    (pricing.priceCents > 0 ||
      pricing.license === "paid-personal" ||
      pricing.license === "paid-commercial");

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] max-w-6xl px-4 py-8">
      <div className="space-y-6">
        {checkoutCancelled ? (
          <Card className="border-amber-900/50 bg-amber-950/20">
            <CardContent className="flex items-start gap-3 py-4">
              <Lock className="mt-0.5 h-4 w-4 text-amber-300" />
              <div className="text-sm text-amber-100">
                Checkout was cancelled. You can reopen the preset, or continue to purchase access later.
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <Card className="overflow-hidden">
            {/* Live interactive preview — real player (not a static
                thumbnail) + schema-driven playground form. Lets the user
                tweak inputs before committing to a Remix. */}
            <InteractivePreview
              preset={{
                _id: preset._id,
                name: preset.name,
                bundleUrl: preset.bundleUrl,
                sourceCode: preset.sourceCode,
                inputSchema: preset.inputSchema,
                fps: preset.fps,
                width: preset.width,
                height: preset.height,
                durationInFrames: preset.durationInFrames,
                category: preset.category,
                thumbnailUrl: preset.thumbnailUrl ?? undefined,
              }}
            />

            <div className="px-5 pt-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-zinc-700 bg-zinc-950/70 text-zinc-100">
                  {preset.category}
                </Badge>
                <Badge variant="outline" className="border-zinc-700 bg-zinc-950/70 text-zinc-100">
                  {preset.status}
                </Badge>
                <Badge variant="outline" className="border-zinc-700 bg-zinc-950/70 text-zinc-100">
                  {preset.isPublic ? "public" : "private"}
                </Badge>
                {reviewStatus?.reviewState ? (
                  <Badge variant="outline" className="border-violet-700 bg-violet-950/40 text-violet-200">
                    {reviewStatus.reviewState}
                  </Badge>
                ) : null}
                {pricing.license ? (
                  <Badge variant="outline" className="border-amber-700 bg-amber-950/30 text-amber-200">
                    {pricing.license}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                    {preset.name}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-300">
                    By{" "}
                    {(() => {
                      const slug =
                        preset.authorId ??
                        (preset.author
                          ? preset.author
                              .trim()
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-+|-+$/g, "")
                          : "");
                      if (slug) {
                        return (
                          <Link
                            href={`/creators/${slug}`}
                            className="font-medium hover:text-amber-400 transition-colors"
                          >
                            {preset.author ?? "Unknown"}
                          </Link>
                        );
                      }
                      return <span>{preset.author ?? "Unknown"}</span>;
                    })()}
                  </p>
                </div>
                <div className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-300">
                  {preset.width}x{preset.height} · {preset.fps} fps
                </div>
              </div>
            </div>

            <CardContent className="space-y-5 py-5">
              <div className="space-y-2">
                <p className="text-sm text-zinc-300">
                  {preset.description ?? "No description provided."}
                </p>
                {preset.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {preset.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-zinc-800 text-zinc-300">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoTile label="Duration" value={formatDuration(preset.durationInFrames, preset.fps)} />
                <InfoTile label="Resolution" value={`${preset.width} × ${preset.height}`} />
                <InfoTile label="Created" value={formatDate(preset._creationTime)} />
                <InfoTile label="Price" value={formatCents(pricing.priceCents)} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <CardTitle>Actions</CardTitle>
                </div>
                <CardDescription>
                  Open in the workstation to preview, or remix for an
                  editable copy in your library.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {needsCheckout ? (
                  <Link href={`/checkout/${preset._id}`} className="block">
                    <Button className="w-full bg-violet-600 hover:bg-violet-500">
                      Continue to checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : null}

                {/* Workstation now falls back to `api.presets.get` for any
                    preset the viewer can access (public or owned), so this
                    link works regardless of ownership — the stage renders
                    the animation immediately. Remix remains available for
                    non-owners who want an editable copy. */}
                <Link
                  href={`/workstation?presetId=${preset._id}`}
                  className="block"
                >
                  <Button className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400">
                    Open in workstation
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                {!isOwner && user ? (
                  <ForkButton
                    presetId={preset._id as Id<"presets">}
                    userId={user._id as Id<"users">}
                    variant="default"
                    size="lg"
                    label="Remix to my library"
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-2 h-10"
                  />
                ) : null}

                {shouldPromptSignIn ? (
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full">
                      Sign in to purchase or save
                    </Button>
                  </Link>
                ) : null}

                {isOwner ? (
                  <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                    You own this preset.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Preset ID" value={preset._id} />
                <Row label="Bundle" value={preset.bundleUrl} mono />
                <Row label="Visibility" value={preset.isPublic ? "Public" : "Private"} />
                <Row label="Review state" value={reviewStatus?.reviewState ?? preset.reviewState ?? "unknown"} />
                <Row label="Last validated" value={formatDate(reviewStatus?.lastValidatedAt ?? preset.lastValidatedAt)} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-zinc-100">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 pb-2 last:border-b-0 last:pb-0">
      <span className="text-zinc-500">{label}</span>
      <span className={mono ? "max-w-[60%] truncate font-mono text-xs text-zinc-200" : "text-right text-zinc-200"}>
        {value}
      </span>
    </div>
  );
}
