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
      <Card className="overflow-hidden h-full flex flex-col gap-0 py-0 bg-card border-border/80">
        <div className="aspect-video relative overflow-hidden border-b border-border/60 bg-muted/30">
          <div className="absolute inset-0 animate-pulse bg-muted/60" />
        </div>

        <CardContent className="p-3 flex-1 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 rounded animate-pulse bg-muted shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted/70 rounded animate-pulse w-full" />
              <div className="h-3 bg-muted/70 rounded animate-pulse w-5/6" />
            </div>
          </div>

          <div className="mt-auto pt-2.5 border-t border-border/60 flex items-center justify-between">
            <div className="h-3 bg-muted rounded animate-pulse w-24" />
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-3 bg-muted/70 rounded animate-pulse w-12" />
              <div className="h-3 bg-muted/70 rounded animate-pulse w-12" />
              <div className="h-3 bg-muted/70 rounded animate-pulse w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
