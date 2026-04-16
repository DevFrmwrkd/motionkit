"use client";

import { Card, CardContent } from "@/components/ui/card";

/**
 * PresetCardSkeleton — renders a skeleton loading state that mimics
 * PresetCard dimensions. Uses Tailwind's animate-pulse for shimmer effect.
 * Grid-aware so it integrates seamlessly with PresetCard in search/list views.
 */
export function PresetCardSkeleton() {
  return (
    <div className="block h-full">
      <Card className="overflow-hidden h-full flex flex-col bg-zinc-950 border-zinc-800/60">
        {/* Thumbnail skeleton (aspect-video) */}
        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-zinc-900/40 via-zinc-950 to-zinc-950">
          <div className="absolute inset-0 animate-pulse bg-zinc-800/40" />
        </div>

        <CardContent className="p-3.5 flex-1 flex flex-col gap-2.5">
          {/* Vote button + title/description skeleton */}
          <div className="flex items-start gap-2.5">
            {/* Vote button skeleton */}
            <div className="h-7 w-7 rounded animate-pulse bg-zinc-800/50 shrink-0" />

            {/* Title + description skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-zinc-800/50 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-zinc-800/40 rounded animate-pulse w-full" />
              <div className="h-3 bg-zinc-800/40 rounded animate-pulse w-5/6" />
            </div>
          </div>

          {/* Footer skeleton */}
          <div className="mt-auto pt-2.5 border-t border-zinc-800/60 flex items-center justify-between">
            <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-24" />
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-3 bg-zinc-800/40 rounded animate-pulse w-12" />
              <div className="h-3 bg-zinc-800/40 rounded animate-pulse w-12" />
              <div className="h-3 bg-zinc-800/40 rounded animate-pulse w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
